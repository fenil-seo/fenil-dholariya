import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { SITE_FIELDS, editorDefaults, applySiteSettings, validateSiteSettings } from '../lib/site-settings.js';
import { handleSiteEditor } from '../api/admin.js';
import { buildSitemap, SITE_URL } from '../lib/search.js';
import { renderPublicPage } from '../lib/public-page.js';

const defaults = {};
for (const page of ['home','footer']) {
  defaults[page] = await editorDefaults(page);
  assert.equal(Object.keys(defaults[page]).length, SITE_FIELDS[page].length + (page === 'home' ? 10 : 0));
  const template = load(await readFile('index.html', 'utf8'));
  for (const field of SITE_FIELDS[page]) {
    assert.ok(defaults[page][field.key] !== undefined, field.key);
    assert.equal(template(field.selector).length, 1, `${page}: ${field.key}`);
  }
}
for (const template of ['index','about','services','gallery','contact','blog','work','post','project']) {
  const page = load(await readFile(`${template}.html`, 'utf8'));
  for (const field of SITE_FIELDS.footer) {
    assert.equal(page(field.selector).length, 1, `${template}: ${field.key}`);
  }
}

const $ = load(await readFile('index.html', 'utf8'));
const home = validateSiteSettings('home', {
  'hero.title':'A <span>different headline.</span>',
  'hero.image':'/assets/portrait.webp',
  'method.videoMp4':'https://example.com/film.mp4',
  'seo.title':'Edited home title',
  'seo.description':'Edited description',
  'seo.keywords':'organic growth',
  'seo.canonical':'https://fenil-dholariya.vercel.app/',
  'seo.robots':'noindex, follow',
  'seo.ogTitle':'Edited social title',
  'seo.ogDescription':'Edited social description',
  'seo.ogImage':'/assets/og.png',
  'seo.schema':{ '@context':'https://schema.org', '@type':'WebPage', name:'Edited' },
  'seo.robotsTxt':'User-agent: *\nAllow: /\n',
});
applySiteSettings($, 'home', home);
applySiteSettings($, 'footer', validateSiteSettings('footer', {
  'invite.title':'Get in <em>touch.</em>',
  'brand.tagline':'Edited on every page.',
  'contact.1.url':'mailto:hello@example.com',
}));
assert.equal($('#home-title').html(), 'A <span>different headline.</span>');
assert.equal($('.home-hero__portrait img').attr('src'), '/assets/portrait.webp');
assert.equal($('meta[name="robots"]').attr('content'), 'noindex, follow');
assert.equal($('meta[name="keywords"]').attr('content'), 'organic growth');
assert.equal($('meta[property="og:title"]').attr('content'), 'Edited social title');
assert.equal($('.footer__tag').text(), 'Edited on every page.');
assert.ok($('#ldJsonEditor').text().includes('WebPage'));
assert.throws(() => validateSiteSettings('footer', { 'brand.logo':'javascript:alert(1)' }), /safe URL/);
assert.throws(() => validateSiteSettings('home', { 'seo.canonical':'/relative' }), /https/);
assert.throws(() => validateSiteSettings('home', { 'seo.schema':42 }), /JSON object/);
const stored = new Map();
const sql = async (query, params = []) => {
  if (query.startsWith('CREATE TABLE')) return [];
  if (query.startsWith('SELECT key, content')) return [...stored].map(([key, content]) => ({ key, content }));
  if (query.startsWith('INSERT INTO site_settings')) {
    const content = JSON.parse(params[1]);
    stored.set(params[0], content);
    return [{ content }];
  }
  throw new Error(`Unexpected SQL: ${query}`);
};
const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const saved = response();
await handleSiteEditor(sql, 'home', 'update', home, saved);
assert.equal(saved.code, 200);
const loaded = response();
await handleSiteEditor(sql, 'home', 'get', null, loaded);
assert.equal(loaded.body.item['seo.title'], 'Edited home title');
assert.equal(loaded.body.item['hero.title'], 'A <span>different headline.</span>');
assert.equal(loaded.body.fields.length, SITE_FIELDS.home.length + 10);
const dynamicFooter = load((await renderPublicPage('blog', '', { posts:[], projects:[] }, { footer:{ 'brand.tagline':'Edited across routes.' } })).html);
assert.equal(dynamicFooter('.footer__tag').text(), 'Edited across routes.');
assert.ok(!buildSitemap({ posts:[], projects:[] }, ['/']).includes(`<loc>${SITE_URL}/</loc>`));
console.log(`Verified ${SITE_FIELDS.home.length} home fields, ${SITE_FIELDS.footer.length} footer fields, SEO rendering, input validation, and admin persistence.`);
