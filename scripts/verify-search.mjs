import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import vm from 'node:vm';
import { SEED } from '../lib/seed-data.js';
import { loadPublicContent } from '../lib/public-content.js';
import { renderPublicPage, cleanBody, mediaUrl } from '../lib/public-page.js';
import { SITE_URL, buildSitemap, isoDate } from '../lib/search.js';
import { changedPaths, submitIndexNow } from '../lib/indexnow.js';
import { INDEXNOW_KEY } from '../lib/indexnow-key.js';
import pageHandler from '../api/page.js';

const data = { posts: SEED.posts, projects: SEED.projects };
const sandbox = { window: {}, URL };
vm.runInNewContext(await readFile('js/render.js', 'utf8'), sandbox);
for (const [kind, items] of [['post', data.posts], ['project', data.projects]]) {
  for (const item of items) {
    const result = await renderPublicPage(kind, item.slug, data);
    assert.equal(result.status, 200);
    const $ = load(result.html);
    const prefix = kind === 'post' ? 'post' : 'work';
    const url = `${SITE_URL}/${prefix}/${item.slug}`;
    assert.equal($('h1').text(), item.title);
    assert.equal($('link[rel="canonical"]').attr('href'), url);
    assert.equal($('meta[property="og:url"]').attr('content'), url);
    assert.ok($(`#${kind === 'post' ? 'postBody' : 'caseStudySections'}`).text().length > 100);
    assert.equal(mediaUrl(item, prefix), kind === 'post' ? sandbox.window.Render.postMediaUrl(item) : sandbox.window.Render.projectMediaUrl(item));
    assert.ok($(`#${kind === 'post' ? 'postHeroWrap' : 'projectHeroWrap'} img`).attr('src'));
    $('script[type="application/ld+json"]').each((_, script) => JSON.parse($(script).text()));
    const schema = JSON.parse($('#ldJson').text());
    assert.equal(schema['@id'], url);
    if (kind === 'post') {
      assert.match(schema.datePublished, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(schema.author.name, 'Fenil Dholariya');
      assert.equal(schema.dateModified, undefined);
      $('#articleToc a').each((_, a) => assert.equal($($(a).attr('href')).length, 1));
    }
    const snapshot = JSON.parse($('#publicContent').text());
    assert.ok(snapshot.posts.every(p => !p.body && !p.schema_markup));
  }
}
const blog = load((await renderPublicPage('blog', '', data)).html);
assert.equal(blog('#postsGrid .post-card').length, data.posts.length);
const work = load((await renderPublicPage('work', '', data)).html);
assert.equal(work('#caseList .work-project').length, data.projects.length);
assert.equal(JSON.parse(work('#ldJsonCollection').text()).mainEntity.itemListElement.length, data.projects.length);
for (const post of data.posts) assert.ok(blog(`a[href="${SITE_URL}/post/${post.slug}"]`).length);
assert.equal((await renderPublicPage('post', 'not-a-published-post', data)).status, 404);
assert.equal((await renderPublicPage('project', 'not-a-project', data)).status, 404);
const empty = load((await renderPublicPage('blog', '', { posts: [], projects: [] })).html);
assert.equal(empty('#postsGrid .post-card').length, 0);
assert.equal(empty('#emptyState').attr('hidden'), undefined);

const hostile = { ...data.posts[0], title: '</script><script>alert(1)</script>', excerpt: '<img src=x onerror=alert(1)>', body: '<h2>Readable heading</h2><p>Useful text.</p><script>alert(1)</script><img src="javascript:alert(1)"><img src="/assets/gallery/private.webp"><a href="javascript:alert(1)">link</a>' };
const safe = load((await renderPublicPage('post', hostile.slug, { posts: [hostile], projects: [] })).html);
assert.equal(safe('#postBody script, #postBody img, #postBody a[href]').length, 0);
assert.equal(safe('h1').text(), hostile.title);
assert.ok(!safe('#publicContent').text().includes('</script>'));
assert.equal(JSON.parse(safe('#publicContent').text()).posts[0].title, hostile.title);
assert.ok(!cleanBody('<img src="/assets/x.webp" onerror="alert(1)">').includes('onerror'));

const queries = [];
assert.deepEqual(await loadPublicContent({ configured: true, migrate: async () => {}, sql: async query => { queries.push(query); return []; } }), { posts: [], projects: [] });
assert.ok(queries.find(q => q.includes('FROM posts WHERE published = true')));
await assert.rejects(loadPublicContent({ configured: true, migrate: async () => {}, sql: async () => { throw new Error('Database unavailable'); } }), /Database unavailable/);
const xml = buildSitemap({ posts: [{ ...data.posts[0], date: 'Thu Jul 09 2026 00:00:00 GMT+0000 (Coordinated Universal Time)', updated_at: '2026-09-27T05:00:00Z' }], projects: [] });
assert.ok(xml.includes('<lastmod>2026-09-27T05:00:00.000Z</lastmod>'));
assert.ok(!xml.includes('GMT'));
assert.equal(isoDate('bad date'), undefined);
assert.ok(!buildSitemap(data).includes('<lastmod>'), 'Do not invent modification dates');

assert.deepEqual(changedPaths('posts', { slug: 'old', published: true }, { slug: 'new', published: true }), ['/blog', '/post/old', '/post/new']);
assert.deepEqual(changedPaths('posts', { slug: 'old', published: true }, { slug: 'old', published: false }), ['/blog', '/post/old']);
assert.deepEqual(changedPaths('posts', null, { slug: 'draft', published: false }), []);
assert.deepEqual(changedPaths('projects', { slug: 'deleted' }, null), ['/work', '/work/deleted']);
let payload;
const submitted = await submitIndexNow(['/', '/post/real-post', '/admin', '/api/posts', 'https://external.test/', '/blog?preview=1', '/'], { fetcher: async (url, options) => {
  assert.equal(url, 'https://api.indexnow.org/indexnow'); payload = JSON.parse(options.body); return { status: 202 };
} });
assert.equal(submitted.count, 2);
assert.deepEqual(payload.urlList, [SITE_URL + '/', SITE_URL + '/post/real-post']);
assert.equal((await readFile('indexnow-key.txt', 'utf8')).trim(), INDEXNOW_KEY);
await assert.rejects(submitIndexNow(['/blog'], { fetcher: async () => ({ status: 429 }) }), /429/);

// Exercise the real HTTP handler with the local seed catalogue, without DB access.
const prior = process.env.DATABASE_URL;
delete process.env.DATABASE_URL;
try {
  for (const [method, query, status] of [['GET', { kind: 'post', slug: data.posts[0].slug }, 200], ['GET', { kind: 'post', slug: 'missing' }, 404], ['HEAD', { kind: 'post', slug: data.posts[0].slug }, 200], ['POST', {}, 405]]) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, send(v) { this.body = v; return this; } };
    await pageHandler({ method, query }, res);
    assert.equal(res.code, status);
    if (method === 'HEAD') assert.equal(res.body, '');
    if (status === 404) assert.equal(res.headers['X-Robots-Tag'], 'noindex');
  }
} finally { if (prior !== undefined) process.env.DATABASE_URL = prior; }
console.log('PASS: complete server HTML, canonicals, published catalogues, images, schema, TOC, sanitization, real 404/HEAD responses, database failures, accurate sitemap dates and IndexNow publication rules. No live content writes.');
