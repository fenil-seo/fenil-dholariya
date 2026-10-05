import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { SITE_FIELDS, SEO_FIELDS, getEditorFields, siteNoIndexPaths, editorDefaults, applySiteSettings, validateSiteSettings } from '../lib/site-settings.js';
import { handleSiteEditor } from '../api/admin.js';
import { buildSitemap, SITE_URL } from '../lib/search.js';
import { renderPublicPage } from '../lib/public-page.js';
import { renderSitePage } from '../api/site.js';
import { normalizeSiteDraft, parseSitePayload, siteDraftIsDirty } from '../js/site-editor-ui.js';

const defaults = {};
for (const page of ['home','services','footer']) {
  defaults[page] = await editorDefaults(page);
  assert.equal(Object.keys(defaults[page]).length, getEditorFields(page).length);
  const template = load(await readFile(page === 'services' ? 'services.html' : 'index.html', 'utf8'));
  for (const field of SITE_FIELDS[page]) {
    assert.ok(defaults[page][field.key] !== undefined, field.key);
    assert.equal(template(field.selector).length, 1, `${page}: ${field.key}`);
  }
}
const editorFields = [...SITE_FIELDS.home, ...SEO_FIELDS];
const editorDraft = normalizeSiteDraft(defaults.home, editorFields);
assert.equal(editorDraft['hero.title'], defaults.home['hero.title']);
assert.equal(typeof editorDraft['seo.schema'], 'string');
assert.equal(siteDraftIsDirty(editorDraft, { ...editorDraft }), false);
assert.equal(siteDraftIsDirty({ ...editorDraft, 'seo.title':'New title' }, editorDraft), true);
assert.deepEqual(parseSitePayload(editorDraft)['seo.schema'], defaults.home['seo.schema']);
assert.throws(() => parseSitePayload({ 'seo.schema':'{broken' }), /invalid JSON/);
assert.throws(() => parseSitePayload({ 'seo.schema':'[1]' }), /JSON object or an array/);
const mediaIndex = JSON.parse(await readFile('.generated/public/assets/media-index.json', 'utf8'));
assert.ok(mediaIndex.some(item => item.type === 'image' && item.path.startsWith('/assets/')));
assert.ok(mediaIndex.some(item => item.type === 'video' && item.path.startsWith('/assets/')));
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
const services = validateSiteSettings('services', {
  ...defaults.services,
  'hero.title':'Service <em>expertise.</em>',
  'hero.image':'/assets/fenil.jpg',
  'service.technical-seo.title':'Technical search consultancy',
  'service.technical-seo.body':'A tailored technical assessment.',
  'service.technical-seo.scope.1':'Audit crawl access',
  'service.technical-seo.link':'Plan the assessment',
  'service.technical-seo.url':'/contact?interest=assessment',
  'goal.search.title':'An edited search recommendation.',
  'goal.search.serviceUrl':'/services#content-strategy',
  'goal.conversion.title':'An edited conversion recommendation.',
  'goal.conversion.serviceUrl':'/services#web-development',
  'finder.capacity.title':'A clearer workflow.',
  'delivery.step.2.point.1':'One clear owner.',
  'engagements.option.2.deliverable':'A defined delivery plan.',
  'faq.2.answer':'Pricing depends on the agreed scope.',
  'seo.title':'Edited services title',
  'seo.canonical':'https://example.com/services',
  'seo.robots':'noindex, follow',
  'seo.ogTitle':'Edited services social title',
  'seo.schema':{ '@context':'https://schema.org', '@type':'Service', name:'Technical assessment' },
});
assert.throws(() => validateSiteSettings('services', { 'hero.image':'javascript:alert(1)' }), /safe URL/);
assert.throws(() => validateSiteSettings('services', { 'goal.search.serviceUrl':'javascript:alert(1)' }), /safe URL/);
assert.throws(() => validateSiteSettings('services', { 'seo.canonical':'/services' }), /https/);
assert.throws(() => validateSiteSettings('services', { 'seo.robotsTxt':'User-agent: *' }), /Unknown content field/);
const savedServices = response();
await handleSiteEditor(sql, 'services', 'update', services, savedServices);
assert.equal(savedServices.code, 200);
const loadedServices = response();
await handleSiteEditor(sql, 'services', 'get', null, loadedServices);
assert.equal(loadedServices.body.item['goal.conversion.title'], services['goal.conversion.title']);
assert.equal(loadedServices.body.item['faq.2.answer'], services['faq.2.answer']);
assert.equal(loadedServices.body.fields.length, SITE_FIELDS.services.length + 9);
assert.equal(stored.get('home')['hero.title'], home['hero.title'], 'Services settings must not replace Home settings');
const renderedServices = await renderSitePage('services', { services:stored.get('services'), footer:{ 'brand.tagline':'Shared footer on Services.' } });
const servicePage = load(renderedServices.html);
assert.equal(renderedServices.robots, 'noindex, follow');
assert.equal(servicePage('#services-title').html(), 'Service <em>expertise.</em>');
assert.equal(servicePage('.service-intro__visual img').attr('src'), '/assets/fenil.jpg');
assert.equal(servicePage('#technical-seo .capability__title').text(), services['service.technical-seo.title']);
assert.equal(servicePage('#technical-seo .text-link').attr('href'), services['service.technical-seo.url']);
assert.equal(servicePage('#technical-seo .text-link svg').length, 1);
assert.equal(servicePage('[data-goal-title]').text(), services['goal.search.title']);
assert.equal(servicePage('[data-goal-service]').attr('href'), services['goal.search.serviceUrl']);
assert.equal(servicePage('[data-goal="conversion"]').attr('data-goal-config-title'), services['goal.conversion.title']);
assert.equal(servicePage('#finder-capacity h3').text(), services['finder.capacity.title']);
assert.equal(servicePage('.journey-chapter:nth-child(2) li:first-child').text(), services['delivery.step.2.point.1']);
assert.equal(servicePage('.engagement-options article:nth-child(2) .engagement-options__deliverable').text(), services['engagements.option.2.deliverable']);
assert.equal(servicePage('.service-questions details:nth-child(2) p').text(), services['faq.2.answer']);
assert.equal(servicePage('.capability-section .section-note a').length, 1, 'Supporting note link must remain intact');
assert.equal(servicePage('title').text(), services['seo.title']);
assert.equal(servicePage('link[rel="canonical"]').attr('href'), services['seo.canonical']);
assert.equal(servicePage('meta[name="robots"]').attr('content'), services['seo.robots']);
assert.equal(servicePage('meta[name="twitter:title"]').attr('content'), services['seo.ogTitle']);
assert.deepEqual(JSON.parse(servicePage('#ldJsonEditor').text()), services['seo.schema']);
assert.equal(JSON.parse(servicePage('#ldJsonServices').text()).hasOfferCatalog.itemListElement[0].itemOffered.name, services['service.technical-seo.title']);
assert.equal(servicePage('.footer__tag').text(), 'Shared footer on Services.');
assert.deepEqual(siteNoIndexPaths({ services }), ['/services']);
assert.deepEqual(siteNoIndexPaths({ home, services }), ['/', '/services']);
assert.ok(!buildSitemap({ posts:[], projects:[] }, siteNoIndexPaths({ services })).includes('<loc>' + SITE_URL + '/services</loc>'));
assert.ok(buildSitemap({ posts:[], projects:[] }, siteNoIndexPaths({ services })).includes('<loc>' + SITE_URL + '/</loc>'));
const unedited = load((await renderSitePage('services')).html);
const original = load(await readFile('services.html','utf8'));
assert.equal(unedited('main').html(), original('main').html(), 'Default Services content and design must be preserved');
console.log(`Verified ${SITE_FIELDS.home.length} home fields, ${SITE_FIELDS.services.length} services fields, ${SITE_FIELDS.footer.length} footer fields, SEO rendering, input validation, and admin persistence.`);
