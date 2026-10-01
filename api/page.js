import { loadPublicContent } from '../lib/public-content.js';
import { renderPublicPage, renderError } from '../lib/public-page.js';
import { getSql, isDbConfigured } from '../lib/db.js';
import { loadSiteSettings } from '../lib/site-settings.js';

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  const kind = typeof req.query?.kind === 'string' ? req.query.kind : '';
  const slug = typeof req.query?.slug === 'string' ? req.query.slug : '';
  let page;
  try {
    const settings = isDbConfigured() ? await loadSiteSettings(getSql()) : {};
    page = ['post', 'project', 'blog', 'work'].includes(kind) && (!slug || /^[a-z0-9-]{1,200}$/.test(slug))
      ? await renderPublicPage(kind, slug, await loadPublicContent(), settings) : await renderError(404);
  } catch (error) {
    console.error('Public page unavailable', error.name);
    page = await renderError(503);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Fresh publication state on every request; never cache an unpublished page.
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', page.status === 200 ? 'index, follow, max-image-preview:large' : 'noindex');
  if (page.status === 503) res.setHeader('Retry-After', '60');
  return res.status(page.status).send(req.method === 'HEAD' ? '' : page.html);
}
