import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import { PROJECT_SETTINGS_FIELDS } from '../js/project-editor-config.js';
import { validateProjectListing } from './project-listing.js';

export async function projectSettingsFields() {
  const $ = load((await readFile(join(process.cwd(),'project.html'),'utf8')).replace(/^\uFEFF/,''));
  return PROJECT_SETTINGS_FIELDS.map(field => ({...field, default:field.selector ? field.mode==='href' ? $(field.selector).attr('href') || '' : field.mode==='markup' ? $(field.selector).html() || '' : field.mode==='linkText' ? $(field.selector).clone().children().remove().end().text().trim() : $(field.selector).text() : field.default ?? ''}));
}
function safeUrl(value, absolute = false) {
  if (!value) return true;
  if (!absolute && /^\/(?!\/)/.test(value)) {
    try { const url = new URL(value,'https://fenil-dholariya.vercel.app'); return !url.username && !url.password && !/\/assets\/gallery\//i.test(decodeURIComponent(url.pathname)); } catch { return false; }
  }
  try { const url = new URL(value);return url.protocol==='https:' && !url.username && !url.password && !/\/assets\/gallery\//i.test(decodeURIComponent(url.pathname)); } catch { return false; }
}
export function validateProjectSettings(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Case study settings must be an object.');
  const result = {};
  for (const field of PROJECT_SETTINGS_FIELDS) {
    if (!Object.hasOwn(input,field.key)) continue;
    const value = input[field.key];
    if (typeof value!=='string' || value.length>5000) throw new Error(`${field.label} must be text of 5000 characters or fewer.`);
    const urlField = field.type==='image' || field.type==='video' || field.mode==='href' || field.key==='seo.canonical';
    if (urlField && !safeUrl(value.trim(),field.key==='seo.canonical')) throw new Error(`${field.label} must be a site path or valid HTTPS URL${field.key==='seo.canonical' ? ' (absolute)' : ''}.`);
    if (field.options && value && !field.options.includes(value)) throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
    if (field.type==='video' && value && !/\.(mp4|webm)(?:[?#]|$)/i.test(value)) throw new Error('Video must link directly to an MP4 or WebM file.');
    result[field.key] = urlField ? value.trim() : value;
  }
  return result;
}
export function validateProjectContent(data = {}) {
  const listing = validateProjectListing(data);
  if (typeof data.title!=='string' || !data.title.trim()) throw new Error('Case study title is required.');
  for (const key of ['title','slug','category','client','desc','description','image_url','body','period','services','challenge','approach','results_text','takeaway','testimonial','testimonial_author']) {
    if (data[key]!==undefined && (typeof data[key]!=='string' || data[key].length>(['body','challenge','approach','results_text'].includes(key)?100000:5000))) throw new Error(`${key} is too long or invalid.`);
  }
  if (data.image_url && !safeUrl(data.image_url.trim())) throw new Error('Cover image must use a site path or valid HTTPS URL.');
  if (data.metrics!==undefined && (!Array.isArray(data.metrics) || data.metrics.length>12 || !data.metrics.every(m=>m && typeof m.value==='string' && typeof m.label==='string' && m.value.length<=200 && m.label.length<=300))) throw new Error('Use up to 12 metrics with a value and label.');
  if (data.sort_order!==undefined && (!Number.isInteger(Number(data.sort_order)) || Math.abs(Number(data.sort_order))>100000)) throw new Error('Collection order must be a whole number between -100000 and 100000.');
  if (data.schema_markup!=null && (typeof data.schema_markup!=='object' || Array.isArray(data.schema_markup) && !data.schema_markup.every(n=>n && typeof n==='object' && !Array.isArray(n)) || JSON.stringify(data.schema_markup).length>50000)) throw new Error('Schema must be a JSON object or array of objects, up to 50000 characters.');
  return {listing, settings:data.page_settings===undefined ? undefined : validateProjectSettings(data.page_settings)};
}
export function projectNoIndexPaths(projects) {
  return projects.filter(p=>/^noindex\b/i.test(p.page_settings?.['seo.robots'] || '')).map(p=>`/work/${p.slug}`);
}
