import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import { getSql, isDbConfigured } from '../lib/db.js';
import { SITE_FIELDS, applySiteSettings, loadSiteSettings } from '../lib/site-settings.js';

const templates = { home:'index.html', about:'about.html', services:'services.html', gallery:'gallery.html', contact:'contact.html' };

export async function renderSitePage(kind, settings = {}) {
  if (!templates[kind]) throw new Error('Unknown site page');
  const $ = load((await readFile(join(process.cwd(), templates[kind]), 'utf8')).replace(/^\uFEFF/, ''));
  if (Object.hasOwn(SITE_FIELDS, kind)) applySiteSettings($, kind, settings[kind]);
  applySiteSettings($, 'footer', settings.footer);
  return { html:$.html(), robots:$('meta[name="robots"]').attr('content') || 'index, follow' };
}

export default async function handler(req, res) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  const kind = typeof req.query?.kind === 'string' ? req.query.kind : '';
  if (!templates[kind]) return res.status(404).send('Not found');
  try {
    const settings = isDbConfigured() ? await loadSiteSettings(getSql()) : {};
    const { html, robots } = await renderSitePage(kind, settings);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('X-Robots-Tag', robots || 'index, follow');
    return res.status(200).send(req.method === 'HEAD' ? '' : html);
  } catch (error) {
    console.error('Site page unavailable', error.name);
    res.setHeader('X-Robots-Tag','noindex');
    res.setHeader('Retry-After','60');
    return res.status(503).send('Temporarily unavailable');
  }
}
