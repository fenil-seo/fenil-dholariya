import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { SITE_URL, SITEMAP_PATH } from '../lib/search.js';
const base = process.argv[2] || SITE_URL;
const sitemapResponse = await fetch(base + SITEMAP_PATH);
assert.equal(sitemapResponse.status, 200);
const xml = load(await sitemapResponse.text(), { xmlMode: true });
const urls = xml('loc').map((_, el) => xml(el).text()).get();
assert.equal(new Set(urls).size, urls.length);
assert.equal(xml('lastmod').length, 0, 'Discovery sitemap must not contain date fields');
const report = [];
for (const url of urls) {
  const path = new URL(url).pathname;
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok(!(response.headers.get('x-robots-tag') || '').includes('noindex'), path + ' response blocks indexing');
  const html = await response.text(), $ = load(html);
  assert.equal($('link[rel="canonical"]').attr('href'), url, path + ' canonical');
  assert.equal($('h1').length, 1, path + ' heading count');
  assert.ok(!$('meta[name="robots"]').attr('content')?.includes('noindex'));
  assert.ok($('title').text().includes('Fenil Dholariya'));
  $('script[type="application/ld+json"]').each((_, el) => JSON.parse($(el).text()));
  const detail = path.startsWith('/post/') ? '#postBody' : path.startsWith('/work/') ? '#caseStudySections' : null;
  if (detail) assert.ok($(detail).text().length > 100, path + ' has no readable content');
  const hero = $('#postHeroWrap img, #projectHeroWrap img').attr('src');
  if (hero) assert.equal((await fetch(new URL(hero, base), { method: 'HEAD' })).status, 200, path + ' image');
  report.push({ path, status: response.status, title: $('title').text(), contentCharacters: detail ? $(detail).text().length : undefined });
}
for (const path of ['/post/search-audit-missing', '/work/search-audit-missing', '/post', '/project']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 404, path + ' must not be a soft 404');
}
const articlePath = new URL(urls.find(url => url.includes('/post/'))).pathname;
for (const agent of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'Claude-SearchBot']) {
  const response = await fetch(base + articlePath, { headers: { 'User-Agent': agent } });
  assert.equal(response.status, 200);
  assert.ok(load(await response.text())('#postBody').text().length > 100);
}
assert.equal((await fetch(base + '/admin')).headers.get('x-robots-tag'), 'noindex, nofollow');
console.log(JSON.stringify(report, null, 2));
console.log(`PASS: ${urls.length} canonical pages, server content, schema, hero images, 4 real 404s and 4 simulated crawler user agents. These requests do not prove access from actual crawler IPs, indexing or rankings.`);
