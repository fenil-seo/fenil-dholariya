import { SITE_URL, STATIC_PATHS } from './search.js';
import { INDEXNOW_KEY } from './indexnow-key.js';

export function changedPaths(resource, previous, item) {
  if (!['posts', 'projects'].includes(resource)) return [];
  const prefix = resource === 'posts' ? '/post/' : '/work/';
  const visible = row => row?.slug && (resource === 'projects' || row.published === true);
  const paths = [previous, item].filter(visible).map(row => prefix + encodeURIComponent(row.slug));
  return paths.length ? [...new Set([resource === 'posts' ? '/blog' : '/work', ...paths])] : [];
}

export async function submitIndexNow(paths, { fetcher = fetch } = {}) {
  const urls = [...new Set(paths.map(path => new URL(path, SITE_URL)).filter(url =>
    url.origin === SITE_URL && !url.search && !url.hash &&
    (STATIC_PATHS.includes(url.pathname) || /^\/(post|work)\/[a-z0-9-]+$/.test(url.pathname))
  ).map(url => url.href))];
  if (!urls.length) return { skipped: true };
  const response = await fetcher('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/indexnow-key.txt`, urlList: urls }),
    signal: AbortSignal.timeout(5000),
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow HTTP ${response.status}`);
  return { status: response.status, count: urls.length };
}

export async function notifyPublication(resource, previous, item) {
  if (process.env.VERCEL_ENV !== 'production') return;
  try { await submitIndexNow(changedPaths(resource, previous, item)); }
  catch (error) { console.warn('Content saved; IndexNow notification failed:', error.message); }
}
