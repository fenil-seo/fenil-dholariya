export const SITE_URL = 'https://fenil-dholariya.vercel.app';
export const STATIC_PATHS = ['/', '/services', '/work', '/gallery', '/about', '/blog', '/contact'];
export const SITEMAP_PATH = '/sitemap-pages.xml';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function isoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
export const contentUrl = (kind, item) => `${SITE_URL}/${kind}/${encodeURIComponent(item.slug)}`;
export function publicUrls(data) {
  return [...STATIC_PATHS.map(path => SITE_URL + path), ...data.posts.filter(p => p.published !== false).map(p => contentUrl('post', p)), ...data.projects.map(p => contentUrl('work', p))];
}
export function buildSitemap(data, excludedPaths = []) {
  // lastmod is optional. Keep discovery independent of CMS date values;
  // publication and modification dates remain available in article metadata.
  const excluded = new Set(excludedPaths.map(path => SITE_URL + path));
  const urls = [...new Set(publicUrls(data))].filter(url => !excluded.has(url));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${esc(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function buildLlmMap(data) {
  const label = text => String(text || '').replace(/[\r\n\[\]]/g, ' ');
  return `# Fenil Dholariya

> Organic growth and SEO strategist based in Surat, India, working with clients worldwide.

Fenil works with D2C brands, local-service businesses and B2B teams. His services cover technical SEO, content strategy, local SEO, conversion and lead generation, AI workflows, market research, paid search and website development.

## Main pages

- [Home](${SITE_URL}/): positioning and selected work.
- [About](${SITE_URL}/about): author background and career.
- [Services](${SITE_URL}/services): eight capabilities and engagement process.
- [Work](${SITE_URL}/work): case studies.
- [Gallery](${SITE_URL}/gallery): anonymized performance evidence with context.
- [Insights](${SITE_URL}/blog): the published article catalogue.
- [Contact](${SITE_URL}/contact): discuss a project.

## Published articles

${data.posts.filter(p => p.published !== false).map(p => `- [${label(p.title)}](${contentUrl('post', p)}): ${label(p.excerpt)}`).join('\n')}

## Case studies

${data.projects.map(p => `- [${label(p.title)}](${contentUrl('work', p)}): ${label(p.desc)}`).join('\n')}

## Context

The linked HTML pages are the primary sources and contain the full text, authorship and available dates. Case-study outcomes are specific to those engagements, not promises for other businesses. This file is a navigation aid, not a ranking directive.
`;
}
