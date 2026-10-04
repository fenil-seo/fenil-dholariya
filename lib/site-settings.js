import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import sanitizeHtml from '../.generated/sanitize.cjs';
import { SITE_URL, json } from './search.js';

// A field points to an existing element in the approved page template. The
// editor changes content and media without giving stored data control of HTML.
const fields = { home: [], footer: [] };
function add(page, group, entries) {
  for (const [key, label, selector, mode = 'text', attr = ''] of entries) {
    fields[page].push({ key, label, group, selector, mode, attr });
  }
}
add('home', 'Hero', [
  ['hero.kicker','Eyebrow','.home-hero__copy .kicker'],
  ['hero.title','Headline','.home-hero__title','markup'],
  ['hero.lede','Introduction','.home-hero__lede'],
  ['hero.primary','Primary button label','.home-hero__actions a:first-child'],
  ['hero.primaryUrl','Primary button link','.home-hero__actions a:first-child','attr','href'],
  ['hero.secondary','Secondary button label','.home-hero__actions a:nth-child(2)','textNode'],
  ['hero.secondaryUrl','Secondary button link','.home-hero__actions a:nth-child(2)','attr','href'],
  ['hero.meta1','Credential 1','.home-hero__meta span:nth-child(1)'],
  ['hero.meta2','Credential 2','.home-hero__meta span:nth-child(2)'],
  ['hero.meta3','Credential 3','.home-hero__meta span:nth-child(3)'],
  ['hero.image','Portrait image','.home-hero__portrait img','attr','src'],
  ['hero.imageAlt','Portrait alt text','.home-hero__portrait img','attr','alt'],
  ['hero.caption','Portrait caption','.home-hero__portrait figcaption'],
  ['hero.resultLabel','Outcome label','.home-hero__result span'],
  ['hero.resultValue','Outcome value','.home-hero__result strong'],
  ['hero.resultUnit','Outcome unit','.home-hero__result b'],
  ['hero.resultNote','Outcome note','.home-hero__result small'],
  ['hero.scroll','Scroll link label','.home-hero__scroll','textNode'],
]);
add('home', 'Working principles', [
  ...[1,2,3].flatMap(i => [
    [`principle.${i}.title`,`Principle ${i} title`,`.authority-strip__grid > div:nth-child(${i}) strong`],
    [`principle.${i}.body`,`Principle ${i} description`,`.authority-strip__grid > div:nth-child(${i}) p`],
  ]),
]);
add('home', 'Featured case', [
  ['case.eyebrow','Eyebrow','#featured-case .section-label'],
  ['case.title','Heading','#featured-case-title'],
  ['case.intro','Introduction','#featured-case .section-intro'],
  ['case.image','Case image','.feature-case__media img','attr','src'],
  ['case.imageAlt','Case image alt text','.feature-case__media img','attr','alt'],
  ['case.imageLink','Case image link','.feature-case__media','attr','href'],
  ['case.photoLabel','Photo label','.feature-case__media .media-shell__label'],
  ['case.name','Case name','.feature-case__story h3'],
  ['case.index','Case index label','.feature-case__index'],
  ['case.body','Case description','.feature-case__story > p'],
  ...[1,2,3].flatMap(i => [
    [`case.metric.${i}.value`,`Metric ${i} value`,`.feature-case__story .metric-list > div:nth-child(${i}) dt`],
    [`case.metric.${i}.label`,`Metric ${i} label`,`.feature-case__story .metric-list > div:nth-child(${i}) dd`],
  ]),
  ['case.link','Case link label','.feature-case__story .text-link','textNode'],
  ['case.linkUrl','Case link URL','.feature-case__story .text-link','attr','href'],
  ['case.note','Case footnote','.feature-case__story small'],
]);
add('home', 'Method and video', [
  ['method.eyebrow','Eyebrow','.method-section__intro .section-label'],
  ['method.title','Heading','#method-title','markup'],
  ['method.intro','Introduction','.method-section__intro .section-intro'],
  ['method.link','Services link label','.method-section__intro .text-link','textNode'],
  ['method.linkUrl','Services link URL','.method-section__intro .text-link','attr','href'],
  ['method.videoWebm','WebM video URL','.method-section video source[type="video/webm"]','attr','src'],
  ['method.videoMp4','MP4 video URL','.method-section video source[type="video/mp4"]','attr','src'],
  ['method.videoPoster','Video poster','.method-section video','attr','poster'],
  ['method.videoAlt','Video accessible label','.method-section video','attr','aria-label'],
  ['method.videoCaption','Video caption','.method-section__visual-note'],
  ...[1,2,3].flatMap(i => [
    [`method.step.${i}.title`,`Step ${i} title`,`.method-steps li:nth-child(${i}) h3`],
    [`method.step.${i}.body`,`Step ${i} description`,`.method-steps li:nth-child(${i}) p`],
  ]),
]);
add('home', 'Services section', [
  ['services.eyebrow','Eyebrow','.home-services .section-label'],
  ['services.title','Heading','#engagement-title','markup'],
  ['services.intro','Introduction','.home-services .section-intro'],
  ['services.link','Services link label','.home-services .section-head .text-link','textNode'],
  ['services.linkUrl','Services link URL','.home-services .section-head .text-link','attr','href'],
  ...[1,2,3,4,5,6,7,8].flatMap(i => [
    [`services.item.${i}.title`,`Service ${i} name`,`.home-service-index a:nth-child(${i}) h3`],
    [`services.item.${i}.url`,`Service ${i} link`,`.home-service-index a:nth-child(${i})`,'attr','href'],
  ]),
]);
add('home', 'Selected work', [
  ['work.eyebrow','Eyebrow','.proof-room .section-label'],
  ['work.title','Heading','#proof-room-title','markup'],
  ['work.link','All work link label','.proof-room .section-head .text-link','textNode'],
  ['work.linkUrl','All work link URL','.proof-room .section-head .text-link','attr','href'],
  ...[1,2].flatMap(i => [
    [`work.card.${i}.image`,`Card ${i} image`,`.proof-grid .proof-card:nth-child(${i}) img`,'attr','src'],
    [`work.card.${i}.imageAlt`,`Card ${i} image alt`,`.proof-grid .proof-card:nth-child(${i}) img`,'attr','alt'],
    [`work.card.${i}.photoLabel`,`Card ${i} photo label`,`.proof-grid .proof-card:nth-child(${i}) .media-context-label`],
    [`work.card.${i}.label`,`Card ${i} label`,`.proof-grid .proof-card:nth-child(${i}) .proof-card__body span`],
    [`work.card.${i}.title`,`Card ${i} title`,`.proof-grid .proof-card:nth-child(${i}) h3`],
    [`work.card.${i}.body`,`Card ${i} description`,`.proof-grid .proof-card:nth-child(${i}) p`],
    [`work.card.${i}.url`,`Card ${i} link`,`.proof-grid .proof-card:nth-child(${i})`,'attr','href'],
  ]),
]);
add('home', 'Gallery invitation', [
  ['gallery.eyebrow','Eyebrow','.gallery-invitation .eyebrow'],
  ['gallery.title','Heading','#home-gallery-title','markup'],
  ['gallery.intro','Introduction','.gallery-invitation .lead'],
  ...[1,2].flatMap(i => [
    [`gallery.link.${i}.label`,`Gallery link ${i} label`,`.gallery-invitation__links > a:nth-child(${i}) > span:first-child`],
    [`gallery.link.${i}.body`,`Gallery link ${i} description`,`.gallery-invitation__links > a:nth-child(${i}) > span:nth-child(2)`,'textNode'],
    [`gallery.link.${i}.url`,`Gallery link ${i} URL`,`.gallery-invitation__links > a:nth-child(${i})`,'attr','href'],
  ]),
  ['gallery.all','All gallery link label','.gallery-invitation__links > a:nth-child(3)','textNode'],
  ['gallery.allUrl','All gallery link URL','.gallery-invitation__links > a:nth-child(3)','attr','href'],
]);
add('home', 'Audience fit', [
  ['fit.eyebrow','Fit eyebrow','.fit-section .section-label'],
  ['fit.title','Fit heading','#fit-title','markup'],
  ...[1,2].flatMap(i => [
    [`fit.list.${i}.title`,`List ${i} title`,`.fit-section__lists > div:nth-child(${i}) h3`],
    ...[1,2,3,4].map(j => [`fit.list.${i}.item.${j}`,`List ${i} item ${j}`,`.fit-section__lists > div:nth-child(${i}) li:nth-child(${j})`]),
  ]),
]);
add('home', 'Closing invitation', [
  ['closing.eyebrow','Closing eyebrow','.closing-cta .section-label'],
  ['closing.title','Closing heading','#closing-title','markup'],
  ['closing.body','Closing description','.closing-cta__action p'],
  ['closing.button','Closing button label','.closing-cta__action .btn','textNode'],
  ['closing.url','Closing button URL','.closing-cta__action .btn','attr','href'],
]);
add('footer', 'Invitation and identity', [
  ['invite.eyebrow','Eyebrow','.footer-invitation .eyebrow'],
  ['invite.title','Heading','.footer-invitation h2','markup'],
  ['invite.body','Description','.footer-invitation__action p'],
  ['invite.button','Button label','.footer-invitation__action .btn','textNode'],
  ['invite.url','Button URL','.footer-invitation__action .btn','attr','href'],
  ['brand.logo','Footer logo','.footer__identity .brand img','attr','src'],
  ['brand.name','Brand name','.footer__identity .brand > span:last-child'],
  ['brand.tagline','Tagline','.footer__tag'],
  ['brand.location','Location','.footer-location','textNode'],
]);
add('footer', 'Services and navigation', [
  ['services.title','Services column title','.footer__col[aria-label="Footer services"] h2'],
  ['navigation.title','Navigation column title','.footer__col[aria-label="Footer navigation"] h2'],
  ...[1,2,3,4,5].flatMap(i => [
    [`services.${i}.label`,`Service link ${i} label`,`.footer__col[aria-label="Footer services"] a:nth-of-type(${i})`,'textNode'],
    [`services.${i}.url`,`Service link ${i} URL`,`.footer__col[aria-label="Footer services"] a:nth-of-type(${i})`,'attr','href'],
    [`navigation.${i}.label`,`Navigation link ${i} label`,`.footer__col[aria-label="Footer navigation"] a:nth-of-type(${i})`,'textNode'],
    [`navigation.${i}.url`,`Navigation link ${i} URL`,`.footer__col[aria-label="Footer navigation"] a:nth-of-type(${i})`,'attr','href'],
  ]),
]);
add('footer', 'Contact and bottom bar', [
  ['contact.title','Contact column title','.footer__col[aria-label="Get in touch"] h2'],
  ...[1,2,3].flatMap(i => [
    [`contact.${i}.label`,`Contact link ${i} label`,`.footer__col[aria-label="Get in touch"] a:nth-of-type(${i}) span:first-of-type`],
    [`contact.${i}.url`,`Contact link ${i} URL`,`.footer__col[aria-label="Get in touch"] a:nth-of-type(${i})`,'attr','href'],
  ]),
  ['bottom.copyrightName','Copyright name','.footer__bottom > span:first-child','lastTextNode'],
  ['bottom.motto','Bottom line','.footer__bottom > span:nth-child(2)'],
  ['bottom.backToTop','Back to top label','.footer__bottom > a','textNode'],
  ['bottom.signature','Large signature','.footer-signature'],
]);
export const SITE_FIELDS = fields;
export const SEO_FIELDS = [
  { key:'seo.title', label:'Meta title', group:'SEO', mode:'seo' },
  { key:'seo.description', label:'Meta description', group:'SEO', mode:'seo', multiline:true },
  { key:'seo.keywords', label:'Meta keywords', group:'SEO', mode:'seo' },
  { key:'seo.canonical', label:'Canonical URL', group:'SEO', mode:'seo' },
  { key:'seo.robots', label:'Page robots directive', group:'SEO', mode:'seo', options:['index, follow, max-image-preview:large','noindex, follow','noindex, nofollow','index, nofollow'] },
  { key:'seo.ogTitle', label:'Open Graph title', group:'SEO', mode:'seo' },
  { key:'seo.ogDescription', label:'Open Graph description', group:'SEO', mode:'seo', multiline:true },
  { key:'seo.ogImage', label:'Open Graph image URL', group:'SEO', mode:'seo' },
  { key:'seo.schema', label:'Additional schema (JSON-LD)', group:'SEO', mode:'json', multiline:true },
  { key:'seo.robotsTxt', label:'robots.txt, sitewide', group:'SEO', mode:'seo', multiline:true },
];

function firstTextNode($, el) { return el.contents().toArray().find(node => node.type === 'text'); }
function lastTextNode($, el) { return el.contents().toArray().filter(node => node.type === 'text').at(-1); }
function readField($, field) {
  const el = $(field.selector).first();
  if (!el.length) throw new Error(`Missing site editor selector: ${field.key}`);
  if (field.mode === 'attr') return el.attr(field.attr) || '';
  if (field.mode === 'markup') return el.html() || '';
  if (field.mode === 'textNode') return (firstTextNode($, el)?.data || '').trim();
  if (field.mode === 'lastTextNode') return (lastTextNode($, el)?.data || '').trim();
  return el.text().trim();
}
const seoRead = ($) => ({
  'seo.title': $('title').text(),
  'seo.description': $('meta[name="description"]').attr('content') || '',
  'seo.keywords': $('meta[name="keywords"]').attr('content') || '',
  'seo.canonical': $('link[rel="canonical"]').attr('href') || '',
  'seo.robots': $('meta[name="robots"]').attr('content') || 'index, follow',
  'seo.ogTitle': $('meta[property="og:title"]').attr('content') || '',
  'seo.ogDescription': $('meta[property="og:description"]').attr('content') || '',
  'seo.ogImage': $('meta[property="og:image"]').attr('content') || '',
  'seo.schema': null,
});
export async function editorDefaults(page) {
  const $ = load(await readFile(join(process.cwd(), 'index.html'), 'utf8'));
  const values = Object.fromEntries(SITE_FIELDS[page].map(field => [field.key, readField($, field)]));
  if (page === 'home') {
    Object.assign(values, seoRead($));
    values['seo.robotsTxt'] = await readFile(join(process.cwd(), 'robots.txt'), 'utf8');
  }
  return values;
}
let siteTableReady;
export async function loadSiteSettings(sql) {
  if (!sql) return {};
  if (!siteTableReady) {
    siteTableReady = sql(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, content JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
      .catch(error => { siteTableReady = null; throw error; });
  }
  await siteTableReady;
  const rows = await sql(`SELECT key, content FROM site_settings WHERE key IN ('home','footer')`);
  return Object.fromEntries(rows.map(row => [row.key, row.content || {}]));
}
const safeUrl = (value, media = false) => {
  const url = String(value || '').trim();
  if (!url) return true;
  if (/^\/(?!\/)/.test(url) || /^#[a-z\d_-]+$/i.test(url)) return true;
  try { return (media ? ['https:'] : ['https:','mailto:','tel:']).includes(new URL(url).protocol); } catch { return false; }
};
export function validateSiteSettings(page, input) {
  if (!['home','footer'].includes(page) || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid page content.');
  const allowed = [...SITE_FIELDS[page], ...(page === 'home' ? SEO_FIELDS : [])];
  const known = new Set(allowed.map(f => f.key));
  if (Object.keys(input).some(key => !known.has(key))) throw new Error('Unknown content field.');
  const output = {};
  for (const field of allowed) {
    if (!(field.key in input)) continue;
    const value = input[field.key];
    if (field.mode === 'json') {
      if (value !== null && (typeof value !== 'object' || Array.isArray(value) && !value.every(v => v && typeof v === 'object'))) throw new Error('Schema must be a JSON object or an array of objects.');
      if (JSON.stringify(value).length > 30000) throw new Error('Schema is too large.');
      output[field.key] = value;
      continue;
    }
    if (typeof value !== 'string' || value.length > (field.key === 'seo.robotsTxt' ? 8000 : field.multiline ? 5000 : 1200)) throw new Error(`${field.label} is too long or invalid.`);
    if ((field.attr === 'href' || field.attr === 'src' || field.attr === 'poster' || ['seo.canonical','seo.ogImage'].includes(field.key)) && !safeUrl(value, field.attr === 'src' || field.attr === 'poster' || field.key === 'seo.ogImage')) throw new Error(`${field.label} must be a safe URL.`);
    if (field.key === 'seo.canonical' && !/^https:\/\//.test(value)) throw new Error('Canonical URL must start with https://.');
    if (field.key === 'seo.robots' && !field.options.includes(value)) throw new Error('Choose a valid page robots directive.');
    output[field.key] = value;
  }
  return output;
}
function applyField($, field, value) {
  const el = $(field.selector).first();
  if (!el.length) return;
  if (field.mode === 'attr') el.attr(field.attr, value);
  else if (field.mode === 'markup') el.html(sanitizeHtml(value, { allowedTags:['br','span','em','strong'], allowedAttributes:{} }));
  else if (field.mode === 'textNode') {
    const node = firstTextNode($, el);
    if (node) node.data = value + ' ';
    else el.prepend(value + ' ');
  } else if (field.mode === 'lastTextNode') {
    const node = lastTextNode($, el);
    if (node) node.data = ' ' + value;
    else el.append(' ' + value);
  } else el.text(value);
}
function meta($, selector, attr, value) {
  let el = $(selector).first();
  if (!el.length) {
    const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    if (match) $('head').append(`<meta ${match[1]}="${match[2]}">`);
    el = $(selector).first();
  }
  el.attr(attr, value);
}
export function applySiteSettings($, page, settings = {}) {
  settings ||= {};
  for (const field of SITE_FIELDS[page]) if (Object.hasOwn(settings, field.key)) applyField($, field, settings[field.key]);
  if (page !== 'home') return;
  const value = key => settings[`seo.${key}`];
  if (value('title') !== undefined) $('title').text(value('title'));
  if (value('description') !== undefined) meta($, 'meta[name="description"]', 'content', value('description'));
  if (value('keywords') !== undefined) meta($, 'meta[name="keywords"]', 'content', value('keywords'));
  if (value('canonical') !== undefined) { meta($, 'link[rel="canonical"]', 'href', value('canonical')); meta($, 'meta[property="og:url"]', 'content', value('canonical')); }
  if (value('robots') !== undefined) meta($, 'meta[name="robots"]', 'content', value('robots'));
  for (const [key, name] of [['ogTitle','title'],['ogDescription','description'],['ogImage','image']]) {
    if (value(key) !== undefined) {
      const val = key === 'ogImage' ? new URL(value(key), SITE_URL).href : value(key);
      meta($, `meta[property="og:${name}"]`, 'content', val);
      meta($, `meta[name="twitter:${name}"]`, 'content', val);
    }
  }
  if (value('schema')) {
    const schema = value('schema');
    if (!$('#ldJsonEditor').length) $('head').append('<script type="application/ld+json" id="ldJsonEditor"></script>');
    $('#ldJsonEditor').text(json(schema));
  }
}
