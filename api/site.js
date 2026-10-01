import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import { getSql, isDbConfigured } from '../lib/db.js';
import { applySiteSettings, loadSiteSettings } from '../lib/site-settings.js';

const templates = { home:'index.html', about:'about.html', services:'services.html', gallery:'gallery.html', contact:'contact.html' };

export default async function handler(req, res) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  const kind = typeof req.query?.kind === 'string' ? req.query.kind : '';
  if (!templates[kind]) return res.status(404).send('Not found');
  try {
    const $ = load(await readFile(join(process.cwd(), templates[kind]), 'utf8'));
    if (isDbConfigured()) {
      const settings = await loadSiteSettings(getSql());
      if (kind === 'home') applySiteSettings($, 'home', settings.home);
      applySiteSettings($, 'footer', settings.footer);
    }
    const robots = kind === 'home' ? $('meta[name="robots"]').attr('content') : 'index, follow, max-image-preview:large';
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('X-Robots-Tag', robots || 'index, follow');
    return res.status(200).send(req.method === 'HEAD' ? '' : $.html());
  } catch (error) {
    console.error('Site page unavailable', error.name);
    res.setHeader('X-Robots-Tag','noindex');
    res.setHeader('Retry-After','60');
    return res.status(503).send('Temporarily unavailable');
  }
}
