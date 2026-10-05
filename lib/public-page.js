import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import sanitizeHtml from '../.generated/sanitize.cjs';
import { SITE_URL, contentUrl, esc, isoDate, json } from './search.js';
import { summaries } from './public-content.js';
import { applySiteSettings } from './site-settings.js';
import { projectListing } from './project-listing.js';
import { PROJECT_SETTINGS_FIELDS } from '../js/project-editor-config.js';

const templates = new Map();
async function template(name) {
  // A UTF-8 BOM passed as a string makes parse5 move the document head into
  // the body. It also creates a visible blank line above the fixed navigation.
  const read = () => readFile(join(process.cwd(), `${name}.html`), 'utf8').then(html => html.replace(/^\uFEFF/, ''));
  // Local previews must see template edits in the same process. Production
  // deployments have immutable templates, so their warm instances can cache.
  if (process.env.NODE_ENV !== 'production') return read();
  if (!templates.has(name)) templates.set(name, read());
  return templates.get(name);
}
const postImages = { 'ai-seo-workflow-that-moves-rankings': 'article-ai-seo', 'local-seo-2026-map-pack': 'article-local-seo', 'technical-seo-audit-checklist': 'article-technical-seo', 'content-that-converts': 'article-content' };
const projectImages = { 'd2c-silver-jewellery': 'case-d2c-jewellery', 'local-construction-gmb': 'case-local-construction', 'b2b-saas-pipeline': 'case-b2b-saas', 'ayurvedic-technical-seo': 'case-ayurveda' };
export function assetUrl(value) {
  let path = String(value || '').trim().replace(/\\/g, '/').replace(/^(?:\.\.\/|\.\/)+/, '');
  if (/^assets\//i.test(path)) path = '/' + path;
  if (!/^(?:\/(?!\/)|https?:\/\/)/i.test(path)) return '';
  try {
    const url = new URL(path, SITE_URL);
    if (/\/assets\/gallery\//i.test(decodeURIComponent(url.pathname))) return '';
    return url.href.replace(new RegExp(`^${SITE_URL.replace(/\./g, '\\.')}(?=/)`), '');
  } catch { return ''; }
}
export function mediaUrl(item, kind = 'post') {
  if (kind === 'work') return assetUrl(item.image_url) || (projectImages[item.slug] ? `/assets/media/${projectImages[item.slug]}.webp` : '');
  return assetUrl(item.blog_image_url) || assetUrl(item.image_url) || (kind === 'post' && postImages[item.slug] ? `/assets/media/${postImages[item.slug]}.webp` : '');
}
export function cleanBody(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class', 'id'], img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'], a: ['href', 'title', 'rel'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: { img: (tagName, attrs) => ({ tagName, attribs: { ...attrs, src: assetUrl(attrs.src), loading: 'lazy', decoding: 'async' } }) },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
  });
}
const fmtDate = value => isoDate(value) ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
const author = { '@type': 'Person', '@id': `${SITE_URL}/#person`, name: 'Fenil Dholariya', url: `${SITE_URL}/about` };
const mediaClass = item => `media--${String(item.slug || '').replace(/[^a-z0-9-]/g, '-')}`;
const projectAlt = project => project.image_alt || `${assetUrl(project.image_url) ? 'Project' : 'Editorial context'} image representing ${project.category || project.title}`;
const projectCaption = project => assetUrl(project.image_url) ? 'Project image' : 'Editorial context photo · Not client photography';
function cover(item, extra = '') {
  return `<div class="editorial-cover ${extra}" aria-hidden="true"><span class="editorial-cover__number">FIELD NOTE</span><span class="editorial-cover__topic">${esc(item.category || 'Insight')}</span><strong>${esc(item.category || 'Organic growth')}</strong><i></i></div>`;
}
function postCard(post) {
  const image = mediaUrl(post);
  return `<a class="post-card reveal is-in" href="${contentUrl('post', post)}" data-category="${esc(post.category)}">
    ${image ? `<div class="post-card__media post-card__media--img editorial-media ${mediaClass(post)}"><img src="${esc(image)}" alt="Editorial image for ${esc(post.title)}" width="1200" height="675" loading="lazy" decoding="async"><span class="media-context-label">Editorial context photo</span></div>` : cover(post, 'post-card__media')}
    <div class="post-card__body"><div class="post-card__meta"><span class="post-card__cat">${esc(post.category)}</span><span>·</span><time datetime="${esc(isoDate(post.date))}">${esc(fmtDate(post.date))}</time><span>·</span><span>${esc(post.reading_time || 5)} min</span></div>
    <h3 class="post-card__title">${esc(post.title)}</h3><p class="post-card__excerpt">${esc(post.excerpt)}</p><div class="post-card__foot"><span>Read article</span><span aria-hidden="true">↗</span></div></div></a>`;
}
function setJson($, id, value) {
  if (!$(`#${id}`).length) $('head').append(`<script type="application/ld+json" id="${id}"></script>`);
  $(`#${id}`).text(json(value));
}
function meta($, attr, name, value) {
  const selector = `meta[${attr}="${name}"]`;
  if (!$(selector).length) $('head').append(`<meta ${attr}="${name}">`);
  $(selector).attr('content', value);
}
function metadata($, { title, description, url, image, type = 'website', ogTitle = title, ogDescription = description, ogImage = image }) {
  $('title').text(title);
  $('link[rel="canonical"]').attr('href', url);
  meta($, 'name', 'description', description);
  meta($, 'name', 'robots', 'index, follow, max-image-preview:large');
  for (const [key, value] of Object.entries({ title: ogTitle, description: ogDescription, url, type, image: ogImage || `${SITE_URL}/assets/og.png` })) meta($, 'property', `og:${key}`, value);
  for (const [key, value] of Object.entries({ title: ogTitle, description: ogDescription, image: ogImage || `${SITE_URL}/assets/og.png`, card: 'summary_large_image' })) meta($, 'name', `twitter:${key}`, value);
}
function breadcrumb($, items) {
  setJson($, 'ldJsonBreadcrumb', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Home', url: `${SITE_URL}/` }, ...items].map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })) });
}
function postSchema(post, bodyText) {
  const image = mediaUrl(post);
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': contentUrl('post', post), url: contentUrl('post', post), mainEntityOfPage: contentUrl('post', post),
    headline: post.title, description: post.excerpt, author, publisher: author, inLanguage: 'en', articleSection: post.category,
    datePublished: isoDate(post.date), dateModified: isoDate(post.updated_at), image: image ? new URL(image, SITE_URL).href : undefined,
    wordCount: bodyText?.trim().split(/\s+/).filter(Boolean).length || undefined,
  };
}
function renderPost($, post, data) {
  $('#postCategory').text(post.category || 'Article');
  $('#postTitle').text(post.title);
  $('#postExcerpt').text(post.excerpt || '');
  $('#postMeta').html(`<time datetime="${esc(isoDate(post.date))}">${esc(fmtDate(post.date))}</time><span>·</span><span>${esc(post.reading_time || 5)} min read</span>`);
  const image = mediaUrl(post);
  $('#postHeroWrap').html(image ? `<div class="post-hero-img post-hero-img--editorial editorial-media ${mediaClass(post)}"><img src="${esc(image)}" alt="Editorial image for ${esc(post.title)}" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async"><span class="media-context-label">Editorial context photo</span></div>` : cover(post, 'article-cover'));
  $('#postBody').html(cleanBody(post.body) || `<p>${esc(post.excerpt)}</p>`);
  const headings = [];
  $('#postBody h2').each((i, heading) => {
    const id = `article-section-${i + 1}`;
    $(heading).attr('id', id);
    headings.push(`<a href="#${id}">${esc($(heading).text())}</a>`);
  });
  $('#articleToc').html(headings.join(''));
  $('#articleContents').attr('hidden', headings.length ? null : '');
  $('#relatedPosts').html(data.posts.filter(p => p.slug !== post.slug).slice(0, 3).map(postCard).join(''));
  const title = post.meta_title?.trim() || `${post.title} - Fenil Dholariya`;
  const description = post.meta_description?.trim() || post.excerpt || '';
  const socialImage = assetUrl(post.og_image_url) || image;
  metadata($, { title, description, url: contentUrl('post', post), type: 'article',
    ogTitle: post.og_title?.trim() || title, ogDescription: post.og_description?.trim() || description,
    ogImage: socialImage && new URL(socialImage, SITE_URL).href });
  meta($, 'property', 'og:image:alt', post.og_title?.trim() || post.title);
  meta($, 'name', 'twitter:image:alt', post.og_title?.trim() || post.title);
  meta($, 'name', 'author', author.name);
  if (isoDate(post.date)) meta($, 'property', 'article:published_time', isoDate(post.date));
  if (isoDate(post.updated_at)) meta($, 'property', 'article:modified_time', isoDate(post.updated_at));
  breadcrumb($, [{ name: 'Insights', url: `${SITE_URL}/blog` }, { name: post.title, url: contentUrl('post', post) }]);
  setJson($, 'ldJson', postSchema(post, $('#postBody').text()));
  if (post.schema_markup) setJson($, 'ldJsonCustom', post.schema_markup);
}
function renderBlog($, data) {
  const posts = [...data.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  const post = posts[0];
  if (post) {
    const href = contentUrl('post', post), image = mediaUrl(post);
    $('#journalFeature').html(`<a class="journal-feature__image" href="${href}" tabindex="-1" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="" width="1200" height="675" fetchpriority="high">` : cover(post)}<span>THE LATEST PERSPECTIVE <span aria-hidden="true">↗</span></span></a><div class="journal-feature__story"><div class="journal-feature__label"><span>Featured read</span><span>${esc(post.category)}</span></div><h2><a href="${href}">${esc(post.title)}</a></h2><p>${esc(post.excerpt)}</p><div class="journal-feature__bottom"><span>${esc(fmtDate(post.date))} · ${esc(post.reading_time || 5)} min read</span><a href="${href}" aria-label="Read ${esc(post.title)}">Read the story <span aria-hidden="true">↗</span></a></div></div>`);
  } else $('#journalFeature').attr('hidden', '');
  $('#postsGrid').html(posts.map(postCard).join(''));
  $('#articleCount').text(`${posts.length} ${posts.length === 1 ? 'article' : 'articles'}`);
  $('#emptyState').attr('hidden', posts.length ? '' : null);
  setJson($, 'ldJsonBlog', { '@context': 'https://schema.org', '@type': 'Blog', '@id': `${SITE_URL}/blog#blog`, name: 'Insights - Fenil Dholariya', url: `${SITE_URL}/blog`, author, blogPost: posts.map(p => postSchema(p)) });
}
function projectCard(project) {
  const image = mediaUrl(project, 'work');
  return `<a class="project reveal is-in" href="${contentUrl('work', project)}">${image ? `<div class="project__media project__media--img editorial-media ${mediaClass(project)}"><img src="${esc(image)}" alt="${esc(projectAlt(project))}" width="1600" height="1067" loading="lazy" decoding="async"><span class="media-context-label">${esc(projectCaption(project))}</span></div>` : cover(project, 'project__media')}<div class="project__body"><span class="tag">${esc(project.category)}</span><h3 class="project__title">${esc(project.title)}</h3><p class="project__desc">${esc(project.desc)}</p><div class="project__metrics">${(project.metrics || []).slice(0, 3).map(m => `<div class="project__metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div></div></a>`;
}
function renderWork($, data, settings) {
  $('#workCount').text(`${data.projects.length} ${data.projects.length === 1 ? 'case study' : 'case studies'}`);
  const linkLabel = settings?.['collection.linkLabel'] ?? 'View case study';
  $('#caseList').html(data.projects.map((project, i) => {
    const { category, title, description } = projectListing(project);
    const href = contentUrl('work', project), image = mediaUrl(project, 'work'), metric = project.metrics?.[0];
    return `<article class="work-project" data-work-category="${esc(category)}"><a class="work-project__image" href="${href}" tabindex="-1" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="${esc(project.image_alt || '')}" width="1600" height="1067" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">` : cover(project)}<span aria-hidden="true">↗</span></a><div class="work-project__meta"><span>${esc(project.category)}</span><span>${String(i + 1).padStart(2, '0')}</span></div><h2><a href="${href}">${esc(title)}</a></h2><p>${esc(description)}</p><div class="work-project__outcome">${metric ? `<p><strong>${esc(metric.value)}</strong><span>${esc(metric.label)}</span></p>` : ''}<a class="text-link" href="${href}" aria-label="${esc(linkLabel)}: ${esc(title)}">${esc(linkLabel)} <span aria-hidden="true">↗</span></a></div></article>`;
  }).join(''));
  setJson($, 'ldJsonCollection', { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Case Studies - Fenil Dholariya', url: `${SITE_URL}/work`, mainEntity: { '@type': 'ItemList', itemListElement: data.projects.map((project, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'CreativeWork', '@id': contentUrl('work', project), url: contentUrl('work', project), name: project.title, description: project.desc, creator: author } })) } });
}
function renderProject($, project, data) {
  const settings = project.page_settings || {};
  const label = (key,fallback) => settings[key] ?? fallback;
  $('#projectCategory').text(project.category || 'Case Study');
  $('#projectClient').text(project.client ? `${label('hero.clientLabel','Client')} · ${project.client}` : '');
  $('#projectTitle').text(project.title);
  $('#projectDesc').text(project.desc || '');
  const image = mediaUrl(project, 'work');
  $('#projectHeroWrap').html(image ? `<div class="post-hero-img post-hero-img--editorial editorial-media ${mediaClass(project)}"><img src="${esc(image)}" alt="${esc(projectAlt(project))}" width="1600" height="1067" loading="eager" fetchpriority="high" decoding="async"><span class="media-context-label">${esc(projectCaption(project))}</span></div>` : cover(project, 'article-cover'));
  if (Object.hasOwn(settings,'cover.caption')) $('#projectHeroWrap .media-context-label').text(settings['cover.caption']);
  const video = assetUrl(settings['video.url']);
  if (video && /\.(mp4|webm)(?:[?#]|$)/i.test(video)) {
    const poster = assetUrl(settings['video.poster']);
    $('#projectHeroWrap').append(`<figure class="project-film"><video controls playsinline preload="metadata" style="width:100%;border-radius:12px" src="${esc(video)}"${poster ? ` poster="${esc(poster)}"` : ''} aria-label="${esc(settings['video.caption'] || 'Case study video')}"></video>${settings['video.caption'] ? `<figcaption>${esc(settings['video.caption'])}</figcaption>` : ''}</figure>`);
  }
  const metrics = project.metrics || [];
  if (metrics.length) $('#projectMetricsSection').css('display', '');
  $('#projectMetrics').html(metrics.map(m => `<div class="project-metric-item"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join(''));
  const glance = [[label('glance.client','Client'), project.client], [label('glance.industry','Industry'), project.category], [label('glance.timeline','Timeline'), project.period]].filter(([, value]) => value);
  const services = String(project.services || '').split(',').map(s => s.trim()).filter(Boolean);
  const parts = [`<div class="cs-glance reveal is-in">${glance.map(([key, value]) => `<div class="cs-glance__item"><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join('')}${services.length ? `<div class="cs-glance__item cs-glance__item--tags"><span>${esc(label('glance.services','Services'))}</span><div class="cs-tags">${services.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>` : ''}</div>`];
  [[label('challenge.heading','The Challenge'), project.challenge], [label('approach.heading','The Approach'), project.approach], [label('results.heading','The Results'), project.results_text]].filter(([, html]) => html).forEach(([heading, html], i) => parts.push(`<div class="cs-section reveal is-in"><span class="eyebrow">${String(i + 1).padStart(2, '0')}</span><h2>${esc(heading)}</h2><div class="prose">${cleanBody(html)}</div></div>`));
  if (project.takeaway) parts.push(`<div class="cs-takeaway reveal is-in"><span class="eyebrow">${esc(label('takeaway.heading','Key takeaway'))}</span><p>${esc(project.takeaway)}</p></div>`);
  if (project.testimonial) parts.push(`<div class="cs-quote glass reveal is-in"><div class="quote__mark">"</div><p>${esc(project.testimonial)}</p>${project.testimonial_author ? `<div class="cs-quote__by">- ${esc(project.testimonial_author)}</div>` : ''}</div>`);
  $('#caseStudySections').html(parts.join('')).css('display', '');
  $('#projectBody').html(cleanBody(project.body));
  $('#projectBodySection').css('display', '');
  $('#relatedProjects').html(data.projects.filter(p => p.slug !== project.slug).slice(0, 3).map(projectCard).join(''));
  const title = settings['seo.title']?.trim() || `${project.title} - Fenil Dholariya`;
  const description = settings['seo.description']?.trim() || project.desc || '';
  const socialImage = assetUrl(settings['seo.ogImage']) || image;
  metadata($, { title, description, url: settings['seo.canonical'] || contentUrl('work',project), image: image && new URL(image, SITE_URL).href,
    ogTitle:settings['seo.ogTitle']?.trim() || title, ogDescription:settings['seo.ogDescription']?.trim() || description, ogImage:socialImage && new URL(socialImage,SITE_URL).href });
  meta($,'name','robots',settings['seo.robots'] || 'index, follow, max-image-preview:large');
  if (settings['seo.keywords']) meta($,'name','keywords',settings['seo.keywords']);
  for (const field of PROJECT_SETTINGS_FIELDS.filter(f=>f.selector && Object.hasOwn(settings,f.key))) {
    const target = $(field.selector), value = settings[field.key];
    if (field.mode==='href') target.attr('href',value);
    else if (field.mode==='markup') target.html(cleanBody(value));
    else if (field.mode==='linkText') {
      target.contents().filter((_,node)=>node.type==='text').remove();target.prepend(esc(value)+' ');
    } else target.text(value);
  }
  breadcrumb($, [{ name: 'Work', url: `${SITE_URL}/work` }, { name: project.title, url: contentUrl('work', project) }]);
  setJson($, 'ldJson', { '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': contentUrl('work', project), url: contentUrl('work', project), name: project.title, description: project.desc, creator: author, inLanguage: 'en', dateModified: isoDate(project.updated_at), image: image && new URL(image, SITE_URL).href });
  if (project.schema_markup) setJson($, 'ldJsonCustom', project.schema_markup);
}

export async function renderPublicPage(kind, slug, data, settings = {}) {
  const isPost = kind === 'post', isProject = kind === 'project';
  if (!['post', 'project', 'blog', 'work'].includes(kind)) return renderError(404);
  const item = isPost ? data.posts.find(p => p.slug === slug) : isProject ? data.projects.find(p => p.slug === slug) : null;
  if ((isPost || isProject) && !item) return renderError(404);
  const $ = load(await template(kind));
  $('body').attr('data-server-rendered', kind);
  if (isPost) renderPost($, item, data);
  else if (isProject) renderProject($, item, data);
  else if (kind === 'work') {
    renderWork($, data, settings.work);
    applySiteSettings($, 'work', settings.work);
    const count = data.projects.length, status = $('#workCount');
    status.text(count ? `${count} ${status.attr(count === 1 ? 'data-count-singular' : 'data-count-plural') || (count === 1 ? 'case study' : 'case studies')}` : status.attr('data-count-empty') || 'No case studies in this category.');
    const collection = JSON.parse($('#ldJsonCollection').text());
    collection.name = $('title').text();
    collection.description = $('meta[name="description"]').attr('content');
    collection.url = $('link[rel="canonical"]').attr('href');
    setJson($, 'ldJsonCollection', collection);
  }
  else renderBlog($, data);
  applySiteSettings($, 'footer', settings.footer);
  // The public snapshot contains only published summaries. It replaces the
  // bundled demonstration catalogue before any page scripts initialize.
  $('head').append(`<script id="publicContent" type="application/json">${json(summaries(data))}</script>`);
  return { status: 200, html: $.html(), robots:$('meta[name="robots"]').attr('content') || 'index, follow' };
}
export async function renderError(status) {
  const $ = load(await template('404'));
  $('link[rel="canonical"], meta[property="og:url"]').remove();
  meta($, 'name', 'robots', status === 404 ? 'noindex, follow' : 'noindex');
  if (status === 503) {
    $('title').text('Temporarily unavailable - Fenil Dholariya');
    $('h1').text('Please try again shortly.');
    $('main p').first().text('The content is temporarily unavailable. Please refresh in a moment.');
  }
  return { status, html: $.html() };
}
