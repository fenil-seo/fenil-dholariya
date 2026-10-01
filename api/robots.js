import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSql, isDbConfigured } from '../lib/db.js';
import { loadSiteSettings } from '../lib/site-settings.js';

export default async function handler(req, res) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  let body = await readFile(join(process.cwd(), 'robots.txt'), 'utf8');
  if (isDbConfigured()) {
    try {
      const settings = await loadSiteSettings(getSql());
      if (settings.home?.['seo.robotsTxt'] !== undefined) body = settings.home['seo.robotsTxt'];
    } catch (error) {
      console.error('robots.txt settings unavailable', error.name);
      res.setHeader('Retry-After','60');
      return res.status(503).send('Temporarily unavailable');
    }
  }
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control','no-store');
  return res.status(200).send(req.method === 'HEAD' ? '' : body);
}
