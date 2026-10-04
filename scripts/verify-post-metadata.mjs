import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { load } from 'cheerio';
import { POST_METADATA_FIELDS, validatePostMetadata } from '../lib/post-metadata.js';
import { renderPublicPage } from '../lib/public-page.js';
import { handlePosts } from '../api/admin.js';
import { SEED } from '../lib/seed-data.js';
import { SITE_URL, buildLlmMap } from '../lib/search.js';

const post = { ...SEED.posts[0], meta_title: 'Search title', meta_description: 'Search description', og_title: 'Social title', og_description: 'Social description', og_image_url: 'assets/blog images/post-3.webp' };
const rendered = await renderPublicPage('post', post.slug, { posts: [post], projects: [] });
const $ = load(rendered.html);
assert.equal($('head title').text(), post.meta_title);
assert.equal($('head meta[name="description"]').attr('content'), post.meta_description);
for (const prefix of ['og', 'twitter']) {
  const attribute = prefix === 'og' ? 'property' : 'name';
  for (const [key, value] of Object.entries({ title: post.og_title, description: post.og_description, image: SITE_URL + '/assets/blog%20images/post-3.webp' })) {
    assert.equal($(`head meta[${attribute}="${prefix}:${key}"]`).attr('content'), value);
  }
}
assert.equal($('#postTitle').text(), post.title, 'Social and search titles must not replace the visible article title');
assert.equal(JSON.parse($('#ldJson').text()).headline, post.title);
const cleared = { ...post, ...Object.fromEntries(POST_METADATA_FIELDS.map(key => [key, ''])) };
const fallback = load((await renderPublicPage('post', post.slug, { posts: [cleared], projects: [] })).html);
assert.equal(fallback('title').text(), `${post.title} - Fenil Dholariya`);
assert.equal(fallback('meta[property="og:description"]').attr('content'), post.excerpt);
assert.equal(fallback('meta[property="og:image"]').attr('content'), new URL(fallback('#postHeroWrap img').attr('src'), SITE_URL).href);
assert.ok(!buildLlmMap({ posts: [{ ...post, published: false }], projects: [] }).includes('/post/'));
assert.throws(() => validatePostMetadata({ og_image_url: 'javascript:alert(1)' }), /OG image/);
assert.throws(() => validatePostMetadata({ og_image_url: '//external.test/image.png' }), /OG image/);
assert.throws(() => validatePostMetadata({ og_image_url: '/assets/gallery/private.png' }), /public image/);
assert.throws(() => validatePostMetadata({ og_title: 'a'.repeat(201) }), /200/);
assert.throws(() => validatePostMetadata({ og_description: [] }), /text/);
assert.deepEqual(validatePostMetadata({ og_title: '  Social title  ', og_image_url: '' }), { og_title: 'Social title', og_image_url: '' });
const client = { window: {}, URL };
vm.runInNewContext(await readFile('js/render.js', 'utf8'), client);
assert.equal(new URL(client.window.Render.postSocialImageUrl(post), SITE_URL).href, $('meta[property="og:image"]').attr('content'));

// Exercise the actual CMS SQL parameter path without changing production rows.
const stored = new Map();
const sql = async (query, params = []) => {
  if (query.startsWith('SELECT')) return [...stored.values()];
  if (query.startsWith('INSERT INTO posts') || query.startsWith('UPDATE posts')) {
    assert.match(query, /og_title/);
    const id = query.startsWith('INSERT') ? stored.size + 1 : params.at(-1);
    if (query.startsWith('UPDATE')) assert.match(query, /WHERE id = \$19/);
    const item = { ...(stored.get(id) || {}), id, slug: params[0], title: params[1] };
    POST_METADATA_FIELDS.forEach((key, i) => { if (params[13 + i] !== null) item[key] = params[13 + i]; });
    stored.set(id, item);
    return [item];
  }
  throw new Error('Unexpected SQL operation');
};
const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const create = response();
await handlePosts(sql, 'create', null, post, create, async () => {});
assert.equal(create.code, 200);
const update = response();
await handlePosts(sql, 'update', 1, { ...post, og_title: 'Updated social title' }, update, async () => {});
assert.equal(update.body.item.og_title, 'Updated social title');
const legacy = response();
await handlePosts(sql, 'update', 1, { title: post.title }, legacy, async () => {});
assert.equal(legacy.body.item.og_title, 'Updated social title', 'Older clients must not erase saved metadata');
const clear = response();
await handlePosts(sql, 'update', 1, cleared, clear, async () => {});
assert.equal(clear.body.item.og_title, '', 'Explicitly clearing a field restores its fallback');
const invalid = response();
await handlePosts(sql, 'create', null, { ...post, og_image_url: 'data:image/png;base64,abc' }, invalid, async () => {});
assert.equal(invalid.code, 400);
console.log('PASS: editable blog SEO and social metadata, server/client parity, safe images, fallbacks, CMS create/update/clear and legacy-client preservation.');
