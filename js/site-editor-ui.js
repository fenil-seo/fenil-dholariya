const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const editorPages = {
  home:{ title:'Home page', path:'/', resource:'home', description:'Edit each section and the search appearance of your home page.' },
  services:{ title:'Services page', path:'/services', resource:'services-page', description:'Edit your service details, recommendations, engagement models and search appearance.' },
  work:{ title:'Work page', path:'/work', resource:'work', description:'Edit your case study collection, project reasoning, evidence links and search appearance.' },
  footer:{ title:'Footer', path:'/', resource:'footer', description:'Edit the footer shared by your public pages.' },
};

const sectionDescriptions = {
  Hero: 'The first screen: positioning, calls to action, portrait and featured outcome.',
  'Working principles': 'Three short principles that explain how you work.',
  'Featured case': 'The highlighted case study, its image, result and link.',
  'Method and video': 'Your process, supporting copy and background film.',
  'Services section': 'The service index and its links to detailed pages.',
  'Selected work': 'The two case cards shown on the home page.',
  'Gallery invitation': 'The invitation and routes into the evidence gallery.',
  'Audience fit': 'The two lists that help visitors decide if the work fits.',
  'Closing invitation': 'The final call to action before the footer.',
  'Invitation and identity': 'The footer invitation, logo, identity and location.',
  'Services and navigation': 'Service links and the main footer navigation.',
  'Contact and bottom bar': 'Contact links, copyright and signature.',
  'Services hero': 'The opening headline, supporting copy, photography and links.',
  'Page navigation': 'The links that guide visitors through the Services page.',
  'Goal explorer': 'The goal selector, its introduction and supporting labels.',
  'Goal: Search visibility': 'The recommendation, steps and links shown for the search goal.',
  'Goal: Better enquiries': 'The recommendation, steps and links shown for the conversion goal.',
  'Goal: AI workflows': 'The recommendation, steps and links shown for the AI workflow goal.',
  'Service introduction': 'The introduction above the eight detailed service cards.',
  'Situation finder': 'The business situations visitors can explore before making an enquiry.',
  'Situation: Visibility': 'The recommendation shown when customers cannot find the business.',
  'Situation: Conversion': 'The recommendation shown when visits are not becoming enquiries.',
  'Situation: Team capacity': 'The recommendation shown when the team needs a repeatable process.',
  'Delivery journey': 'The delivery framework, its three stages and supporting points.',
  'Engagement models': 'The three ways to work together and their deliverables.',
  'Frequently asked questions': 'The questions and answers about scope, pricing, time zones and results.',
  'Work hero': 'The opening headline, supporting copy and calls to action.',
  'Hero imagery': 'The three images, overlay labels and caption in the opening composition.',
  'Case study collection': 'Filter labels, card links, count messages and the collection disclosure. Edit individual cards through Manage case studies.',
  'Project reasoning': 'The introduction and choices for the project decision panels.',
  'E-commerce reasoning': 'The question, response and review shown for e-commerce projects.',
  'Local services reasoning': 'The question, response and review shown for local service projects.',
  'B2B reasoning': 'The question, response and review shown for B2B and SaaS projects.',
  'Evidence invitation': 'The explanation that introduces the supporting evidence.',
  'Evidence links': 'The three destinations, labels and descriptions linking to project evidence.',
};
const advice = {
  'hero.kicker': { target:80, hint:'A short line above the headline.' },
  'hero.title': { target:120, hint:'Use <span> or <em> for the highlighted phrase, and <br> for a line break.' },
  'hero.lede': { target:320, hint:'One clear paragraph explaining whom you help and how.' },
  'seo.title': { target:60, hint:'Aim for a specific title around 50 to 60 characters. Search engines may rewrite it.' },
  'seo.description': { target:160, hint:'Write a useful invitation around 150 to 160 characters. Search engines may choose another snippet.' },
  'seo.keywords': { hint:'Optional. Major search engines generally ignore meta keywords.' },
  'seo.canonical': { hint:'Use the preferred absolute HTTPS URL for this page.' },
  'seo.robots': { hint:'Choose whether this page may be indexed and whether its links may be followed.' },
  'seo.ogTitle': { target:60, hint:'The title shown when someone shares this page.' },
  'seo.ogDescription': { target:160, hint:'Keep this short enough for a social card.' },
  'seo.ogImage': { hint:'Choose a published image. A wide JPG or PNG works best for social sharing.' },
  'seo.robotsTxt': { hint:'Sitewide crawler access. If a page is disallowed here, crawlers cannot read its meta robots tag.' },
};
const schemaTemplates = {
  Organization: canonical => ({ '@context':'https://schema.org', '@type':'Organization', name:'Fenil Dholariya', url:canonical || '' }),
  WebSite: canonical => ({ '@context':'https://schema.org', '@type':'WebSite', name:'Fenil Dholariya', url:canonical || '' }),
  Person: canonical => ({ '@context':'https://schema.org', '@type':'Person', name:'Fenil Dholariya', url:canonical || '' }),
  Service: canonical => ({ '@context':'https://schema.org', '@type':'Service', name:'', url:canonical || '', provider:{ '@type':'Person', name:'Fenil Dholariya' } }),
  CollectionPage: canonical => ({ '@context':'https://schema.org', '@type':'CollectionPage', name:'', url:canonical || '' }),
  BreadcrumbList: () => ({ '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[] }),
  FAQPage: () => ({ '@context':'https://schema.org', '@type':'FAQPage', mainEntity:[] }),
  'Empty block': () => ({ '@context':'https://schema.org', '@type':'' }),
};

export function normalizeSiteDraft(item, fields) {
  const draft = {};
  for (const field of fields) {
    const value = item?.[field.key];
    draft[field.key] = field.mode === 'json' ? value == null ? '' : JSON.stringify(value, null, 2) : String(value ?? '');
  }
  return draft;
}
export function siteDraftIsDirty(draft, saved) {
  return Object.keys(draft).some(key => draft[key] !== saved[key]);
}
export function parseSitePayload(draft) {
  const payload = { ...draft };
  if (Object.hasOwn(payload, 'seo.schema')) {
    const raw = payload['seo.schema'].trim();
    if (!raw) payload['seo.schema'] = null;
    else {
      try { payload['seo.schema'] = JSON.parse(raw); }
      catch (error) { throw new Error(`Schema markup contains invalid JSON: ${error.message}`); }
      const schema = payload['seo.schema'];
      if (!schema || typeof schema !== 'object' || Array.isArray(schema) && !schema.every(node => node && typeof node === 'object' && !Array.isArray(node))) {
        throw new Error('Schema markup must be one JSON object or an array of objects.');
      }
    }
  }
  return payload;
}

function safeMedia(value) {
  const raw = String(value || '').trim();
  if (/^\/(?!\/)/.test(raw) || /^https:\/\//i.test(raw)) return raw;
  return '';
}
function labelFor(field) {
  if (field.key === 'seo.robots') return 'Robots';
  return field.label;
}
function mediaField(field) { return field.attr === 'src' || field.attr === 'poster' || field.key === 'seo.ogImage'; }
function videoField(field) { return /video(?:Webm|Mp4)$/.test(field.key); }
function multilineField(field, value) {
  return field.mode === 'markup' || field.multiline || field.mode === 'json' || /(?:body|description|intro|lede|note|tagline|caption)$/i.test(field.key) || String(value).length > 115;
}
function fieldMarkup(field, value, scope) {
  const id = `site-field-${scope}-${field.key.replace(/[^a-z0-9-]/gi, '-')}`;
  const info = advice[field.key] || {};
  const hint = info.hint || (field.mode === 'markup' ? 'Use plain text with optional <br>, <span>, <em> or <strong> tags.' : '');
  const counter = info.target ? `<span class="site-field__counter" data-counter="${escapeHtml(field.key)}">${String(value).length} / ${info.target}</span>` : '';
  const wide = field.group === 'SEO' || info.target || field.mode === 'json' || field.multiline || field.mode === 'markup' || multilineField(field, value) || mediaField(field);
  const label = `<div class="site-field__label-row"><label for="${id}">${escapeHtml(labelFor(field))}</label>${counter}</div>`;
  if (mediaField(field)) {
    const url = safeMedia(value);
    const preview = url ? videoField(field)
      ? `<video src="${escapeHtml(url)}" preload="metadata" muted playsinline></video>`
      : `<img src="${escapeHtml(url)}" alt="Selected media preview" loading="lazy">`
      : `<span class="site-media__empty">No media selected</span>`;
    return `<div class="site-field site-field--wide site-field--media">${label}
      <div class="site-media"><div class="site-media__thumb" data-media-preview="${escapeHtml(field.key)}">${preview}</div><div class="site-media__details"><strong>${url ? 'Selected media' : 'Choose an image or video'}</strong><p>Use an asset already published on the site or paste a secure URL.</p><button class="site-button site-button--orange" type="button" data-open-media="${escapeHtml(field.key)}">Choose ${videoField(field) ? 'video' : 'image'}</button></div></div>
      <input class="site-input" id="${id}" data-site-key="${escapeHtml(field.key)}" type="text" value="${escapeHtml(value)}" placeholder="/assets/media/file.webp or https://..." autocomplete="off">
      ${hint ? `<p class="site-field__hint">${escapeHtml(hint)}</p>` : ''}</div>`;
  }
  if (field.options) {
    return `<div class="site-field${wide ? ' site-field--wide' : ''}">${label}<select class="site-input site-select" id="${id}" data-site-key="${escapeHtml(field.key)}">${field.options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>${hint ? `<p class="site-field__hint">${escapeHtml(hint)}</p>` : ''}</div>`;
  }
  const control = multilineField(field, value)
    ? `<textarea class="site-input site-textarea${field.mode === 'json' ? ' site-textarea--code' : ''}" id="${id}" data-site-key="${escapeHtml(field.key)}" rows="${field.mode === 'json' ? 10 : field.key === 'seo.robotsTxt' ? 8 : 3}" spellcheck="${field.mode === 'json' ? 'false' : 'true'}">${escapeHtml(value)}</textarea>`
    : `<input class="site-input" id="${id}" data-site-key="${escapeHtml(field.key)}" type="text" value="${escapeHtml(value)}" autocomplete="off">`;
  return `<div class="site-field${wide ? ' site-field--wide' : ''}">${label}${control}${hint ? `<p class="site-field__hint">${escapeHtml(hint)}</p>` : ''}</div>`;
}
function previewHost(draft) {
  try { return new URL(draft['seo.canonical']).host || location.host; }
  catch { return location.host; }
}
function searchCard(draft, compact = false) {
  return `<div class="site-search-card${compact ? ' site-search-card--mobile' : ''}"><div class="site-search-card__source"><span class="site-search-card__favicon">F</span><span><strong>Fenil Dholariya</strong><small data-preview-host>${escapeHtml(previewHost(draft))}</small></span></div><div class="site-search-card__title" data-preview-title>${escapeHtml(draft['seo.title'] || 'Untitled page')}</div><p data-preview-description>${escapeHtml(draft['seo.description'] || 'No description. A search engine may choose text from the page instead.')}</p></div>`;
}
function socialCard(draft) {
  const image = safeMedia(draft['seo.ogImage']);
  return `<div class="site-social-card"><div class="site-social-card__image"><img data-og-image src="${escapeHtml(image || '')}" alt="Social preview" ${image ? '' : 'hidden'}><span data-og-placeholder ${image ? 'hidden' : ''}>No image selected</span></div><div class="site-social-card__body"><span data-social-host>${escapeHtml(previewHost(draft).toUpperCase())}</span><strong data-og-title>${escapeHtml(draft['seo.ogTitle'] || draft['seo.title'] || 'Untitled page')}</strong><p data-og-description>${escapeHtml(draft['seo.ogDescription'] || draft['seo.description'] || 'No description')}</p></div></div>`;
}

export async function mountSiteEditor({ page, panel, api, noteDbStatus }) {
  const info = editorPages[page];
  if (!info) throw new Error('Unknown page editor.');
  panel.__siteEditorAbort?.abort();
  const controller = new AbortController();
  panel.__siteEditorAbort = controller;
  const { ok, data } = await api.admin(info.resource, 'get');
  if (noteDbStatus(ok, data)) {
    panel.innerHTML = `<div class="site-editor-empty"><h2>Connect the database to edit this page</h2><p>Page changes are stored in Neon. Use Initialize database above once the connection is configured.</p></div>`;
    return;
  }
  if (!ok) {
    panel.innerHTML = `<div class="site-editor-empty"><h2>Could not load the editor</h2><p>${escapeHtml(data?.error || 'Please try again.')}</p><button class="site-button" type="button" data-retry-editor>Retry</button></div>`;
    panel.querySelector('[data-retry-editor]')?.addEventListener('click', () => mountSiteEditor({ page, panel, api, noteDbStatus }), { once:true });
    return;
  }

  const fields = data.fields || [];
  const contentFields = fields.filter(field => field.group !== 'SEO');
  const seoFields = fields.filter(field => field.group === 'SEO');
  const hasSeo = seoFields.length > 0;
  const groups = [...new Set(contentFields.map(field => field.group))];
  const initial = normalizeSiteDraft(data.item || {}, fields);
  const state = {
    draft: { ...initial }, saved: { ...initial },
    group: groups[0], view: hasSeo && (location.hash === `#${page}/seo` || page === 'home' && location.hash === '#seo') ? 'seo' : 'content',
    mode:'edit', device:'desktop', saving:false, message:'', media:null, mediaKey:'', mediaQuery:'',
    openSeo:new Set(['search','social']),
  };
  panel.__siteEditorState = state;

  const dirty = () => siteDraftIsDirty(state.draft, state.saved);
  const formFields = () => contentFields.filter(field => field.group === state.group);

  function toolbar() {
    return `<div class="site-editor-toolbar"><div class="site-editor-toolbar__left">${state.view === 'content'
      ? `<div class="site-segmented"><button type="button" class="${state.mode === 'edit' ? 'is-active' : ''}" data-site-mode="edit">Content</button><button type="button" class="${state.mode === 'preview' ? 'is-active' : ''}" data-site-mode="preview">Preview</button></div>`
      : '<strong>Search &amp; sharing</strong>'}</div><div class="site-editor-toolbar__actions"><span class="site-save-state${dirty() ? ' is-dirty' : ''}" data-save-state aria-live="polite">${state.message ? escapeHtml(state.message) : dirty() ? 'Unsaved changes' : 'All changes saved'}</span><button class="site-button site-button--quiet" type="button" data-site-action="discard" ${dirty() && !state.saving ? '' : 'disabled'}>Discard changes</button><button class="site-button site-button--save" type="button" data-site-action="save" ${dirty() && !state.saving ? '' : 'disabled'}>${state.saving ? 'Saving...' : 'Save changes'} <kbd>Ctrl+S</kbd></button></div></div>`;
  }
  function contentBody() {
    if (state.mode === 'preview') {
      return `<div class="site-live-preview"><div class="site-live-preview__bar"><span>Draft preview</span><div class="site-segmented"><button type="button" class="${state.device === 'desktop' ? 'is-active' : ''}" data-site-device="desktop">Desktop</button><button type="button" class="${state.device === 'mobile' ? 'is-active' : ''}" data-site-device="mobile">Mobile</button></div></div><p>Preview includes your unsaved content. Links are disabled here.</p><div class="site-live-preview__viewport"><iframe title="${info.title} draft preview" src="${info.path}" loading="lazy"></iframe></div></div>`;
    }
    const items = formFields();
    const description = sectionDescriptions[state.group] || (page === 'services' ? 'Edit this service name, introduction, detailed scope and enquiry link.' : 'Edit the content used in this part of the site.');
    return `<div class="site-editor-card__body"><div class="site-editor-section-head"><span class="site-editor-section-head__number">Section ${groups.indexOf(state.group) + 1} of ${groups.length}</span><h2>${escapeHtml(state.group)}</h2><p>${escapeHtml(description)}</p>${page === 'work' && state.group === 'Case study collection' ? '<button class="site-button" type="button" data-site-action="manage-projects">Manage case studies</button>' : ''}</div><div class="site-fields-grid">${items.map(field => fieldMarkup(field, state.draft[field.key], page)).join('')}</div></div>`;
  }
  function seoBody() {
    const searchFields = seoFields.filter(field => ['seo.title','seo.description','seo.keywords','seo.canonical','seo.robots'].includes(field.key));
    const socialFields = seoFields.filter(field => ['seo.ogTitle','seo.ogDescription','seo.ogImage'].includes(field.key));
    const schemaField = seoFields.find(field => field.key === 'seo.schema');
    const robotsField = seoFields.find(field => field.key === 'seo.robotsTxt');
    return `<div class="site-editor-seo"><div class="site-editor-seo__intro"><p class="site-eyebrow">Search appearance</p><h2>Preview what people see before they click.</h2><p>Search and social platforms may shorten or rewrite previews, but these fields give them a clear source.</p></div>
      <div class="site-snippet-grid"><div><span class="site-preview-label">Desktop · 600px</span>${searchCard(state.draft)}</div><div><span class="site-preview-label">Mobile · 336px</span>${searchCard(state.draft, true)}</div></div>
      <details class="site-seo-block" data-seo-section="search" ${state.openSeo.has('search') ? 'open' : ''}><summary><strong>Search engine</strong><span>Title, snippet and crawler instructions</span></summary><div class="site-fields-grid">${searchFields.map(field => fieldMarkup(field, state.draft[field.key], page)).join('')}</div></details>
      <details class="site-seo-block" data-seo-section="social" ${state.openSeo.has('social') ? 'open' : ''}><summary><strong>Social sharing</strong><span>The card shown by social apps and messaging tools</span></summary><div class="site-fields-grid">${socialFields.map(field => fieldMarkup(field, state.draft[field.key], page)).join('')}<div class="site-field site-field--wide"><span class="site-field__label-row"><strong>Sharing preview</strong></span>${socialCard(state.draft)}<p class="site-field__hint" data-social-note>${state.draft['seo.ogImage'] ? 'Preview uses the selected image.' : 'No sharing image is selected. The site will use its built-in image.'}</p></div></div></details>
      <details class="site-seo-block" data-seo-section="schema" ${state.openSeo.has('schema') ? 'open' : ''}><summary><strong>Schema markup</strong><span>Optional JSON-LD for this page</span></summary><div class="site-schema-start"><p>Start with a template, then fill in only facts you can verify. The built-in page schema remains in place.</p><div>${Object.keys(schemaTemplates).map(name => `<button class="site-button site-button--quiet" type="button" data-schema-template="${escapeHtml(name)}">+ ${escapeHtml(name)}</button>`).join('')}</div></div><div class="site-fields-grid">${schemaField ? fieldMarkup(schemaField, state.draft[schemaField.key], page) : ''}</div><div class="site-schema-actions"><button class="site-button site-button--quiet" type="button" data-site-action="format-schema">Format JSON</button><span data-schema-status></span></div></details>
      <details class="site-seo-block" data-seo-section="robots" ${state.openSeo.has('robots') ? 'open' : ''}><summary><strong>robots.txt</strong><span>Sitewide crawler access</span></summary>${robotsField ? `<div class="site-fields-grid">${fieldMarkup(robotsField, state.draft[robotsField.key], page)}</div>` : '<div class="site-schema-start"><p>The sitewide robots.txt file is shared by every page and is managed in Home SEO. Use the Robots field above to control indexing for this page.</p><a class="site-button" href="/admin#home/seo" target="_blank" rel="noopener">Open Home SEO</a></div>'}</details></div>`;
  }
  function mediaDialog() {
    return `<dialog class="site-media-dialog"><div class="site-media-dialog__head"><div><strong>Choose published media</strong><p>Files already deployed in this site's assets folder.</p></div><button type="button" class="site-media-dialog__close" data-site-action="close-media" aria-label="Close media picker">×</button></div><label class="site-media-dialog__search">Search assets<input class="site-input" type="search" data-media-search placeholder="Search by filename or folder"></label><div class="site-media-dialog__list" data-media-list><p>Loading media...</p></div><div class="site-media-dialog__foot">For a new file, publish it to the site's assets folder or use a hosted HTTPS URL.</div></dialog>`;
  }
  function draw() {
    panel.querySelectorAll('[data-seo-section]').forEach(section => {
      if (section.open) state.openSeo.add(section.dataset.seoSection);
      else state.openSeo.delete(section.dataset.seoSection);
    });
    const title = info.title;
    panel.innerHTML = `<div class="site-editor-page"><div class="site-editor-heading"><p class="site-eyebrow">${page === 'footer' ? 'Shared resource' : 'Website'}</p><h1>${title}</h1><p>${info.description}</p></div>
      <div class="site-editor-views" role="tablist" aria-label="${title} editor views"><button role="tab" aria-selected="${state.view === 'content'}" class="${state.view === 'content' ? 'is-active' : ''}" data-site-view="content">Content</button>${hasSeo ? `<button role="tab" aria-selected="${state.view === 'seo'}" class="${state.view === 'seo' ? 'is-active' : ''}" data-site-view="seo">SEO</button>` : ''}</div>${page === 'work' ? '<button class="site-button" type="button" data-site-action="manage-projects">Manage case studies</button>' : ''}
      <div class="site-editor-layout${state.view === 'seo' ? ' site-editor-layout--seo' : ''}">${state.view === 'content' ? `<aside class="site-editor-sections"><div class="site-editor-sections__head"><strong>Sections</strong><span>${groups.length}</span></div><nav aria-label="Page sections">${groups.map((group, index) => `<button type="button" class="site-editor-section${group === state.group ? ' is-active' : ''}" data-site-group="${escapeHtml(group)}"><span class="site-editor-section__number">${String(index + 1).padStart(2,'0')}</span><span><strong>${escapeHtml(group)}</strong><small>Section ${index + 1}</small></span></button>`).join('')}</nav></aside>` : '<div class="site-editor-spacer" aria-hidden="true"></div>'}
        <div class="site-editor-card">${toolbar()}${state.view === 'seo' ? seoBody() : contentBody()}</div></div>${mediaDialog()}</div>`;
    refreshPreview();
  }
  function updateControls() {
    const isDirty = dirty();
    const save = panel.querySelector('[data-site-action="save"]');
    const discard = panel.querySelector('[data-site-action="discard"]');
    if (save) { save.disabled = !isDirty || state.saving; save.innerHTML = state.saving ? 'Saving...' : 'Save changes <kbd>Ctrl+S</kbd>'; }
    if (discard) discard.disabled = !isDirty || state.saving;
    const status = panel.querySelector('[data-save-state]');
    if (status) { status.textContent = state.message || (isDirty ? 'Unsaved changes' : 'All changes saved'); status.classList.toggle('is-dirty', isDirty); }
  }
  function updateSeoPreviews() {
    panel.querySelectorAll('[data-preview-host]').forEach(node => { node.textContent = previewHost(state.draft); });
    const socialHost = panel.querySelector('[data-social-host]');
    if (socialHost) socialHost.textContent = previewHost(state.draft).toUpperCase();
    panel.querySelectorAll('[data-preview-title]').forEach(node => { node.textContent = state.draft['seo.title'] || 'Untitled page'; });
    panel.querySelectorAll('[data-preview-description]').forEach(node => { node.textContent = state.draft['seo.description'] || 'No description. A search engine may choose text from the page instead.'; });
    const ogTitle = panel.querySelector('[data-og-title]');
    const ogDescription = panel.querySelector('[data-og-description]');
    const ogImage = panel.querySelector('[data-og-image]');
    const ogPlaceholder = panel.querySelector('[data-og-placeholder]');
    const media = safeMedia(state.draft['seo.ogImage']);
    if (ogTitle) ogTitle.textContent = state.draft['seo.ogTitle'] || state.draft['seo.title'] || 'Untitled page';
    if (ogDescription) ogDescription.textContent = state.draft['seo.ogDescription'] || state.draft['seo.description'] || 'No description';
    if (ogImage) { ogImage.src = media; ogImage.hidden = !media; }
    if (ogPlaceholder) ogPlaceholder.hidden = Boolean(media);
    const note = panel.querySelector('[data-social-note]');
    if (note) note.textContent = media ? 'Preview uses the selected image.' : 'No sharing image is selected. The site will use its built-in image.';
  }
  function updateFieldPreview(key) {
    const thumb = [...panel.querySelectorAll('[data-media-preview]')].find(node => node.dataset.mediaPreview === key);
    if (!thumb) return;
    const url = safeMedia(state.draft[key]);
    thumb.innerHTML = url ? /video(?:Webm|Mp4)$/.test(key)
      ? `<video src="${escapeHtml(url)}" preload="metadata" muted playsinline></video>`
      : `<img src="${escapeHtml(url)}" alt="Selected media preview" loading="lazy">`
      : '<span class="site-media__empty">No media selected</span>';
  }
  function applyDraftToFrame(frame) {
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    const changedVideos = new Set();
    for (const field of contentFields) {
      const el = doc.querySelector(field.selector);
      if (!el) continue;
      const value = state.draft[field.key];
      if (field.mode === 'attr') {
        if (['src','poster','href'].includes(field.attr) && !safeMedia(value) && !/^(?:mailto:|tel:|#[a-z\d_-]+)$/i.test(value)) continue;
        if (field.attr === 'src' && el.getAttribute('src') !== value && el.closest('video')) changedVideos.add(el.closest('video'));
        el.setAttribute(field.attr, value);
      } else if (field.mode === 'markup') {
        const parsed = new DOMParser().parseFromString(value, 'text/html');
        const allowed = new Set(['BR','SPAN','EM','STRONG']);
        const transfer = (node, parent) => {
          if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(doc.createTextNode(node.textContent)); return; }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const child = allowed.has(node.nodeName) ? doc.createElement(node.nodeName.toLowerCase()) : parent;
          if (child !== parent) parent.appendChild(child);
          node.childNodes.forEach(next => transfer(next, child));
        };
        const fragment = doc.createDocumentFragment();
        parsed.body.childNodes.forEach(node => transfer(node, fragment));
        el.replaceChildren(fragment);
      } else if (field.mode === 'textNode' || field.mode === 'lastTextNode') {
        const nodes = [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
        const node = field.mode === 'lastTextNode' ? nodes.at(-1) : nodes[0];
        if (node) node.textContent = field.mode === 'lastTextNode' ? ` ${value}` : `${value} `;
      } else el.textContent = value;
    }
    changedVideos.forEach(video => video.load());
    frame.contentWindow.dispatchEvent(new frame.contentWindow.CustomEvent('site:preview-updated'));
    if (!doc.documentElement.dataset.draftPreviewBound) {
      doc.addEventListener('click', event => { if (event.target.closest('a, button, form')) event.preventDefault(); }, true);
      doc.documentElement.dataset.draftPreviewBound = 'true';
    }
    if (page === 'footer') doc.querySelector('footer')?.scrollIntoView();
    if (page === 'services' || page === 'work') {
      const field = formFields()[0];
      const goal = field?.key.match(/^goal\.(search|conversion|workflow)\./)?.[1];
      if (goal) doc.querySelector(`[data-goal="${goal}"]`)?.click();
      const target = field && doc.querySelector(field.selector);
      const situation = target?.closest('.experience-panel');
      if (situation) doc.querySelector(`[data-panel="${situation.id}"]`)?.click();
      const card = target?.closest('.capability');
      if (card) card.open = true;
      (card || target?.closest('section') || target)?.scrollIntoView({ block:'start', behavior:'instant' });
    }
  }
  function refreshPreview() {
    const frame = panel.querySelector('.site-live-preview iframe');
    if (!frame) return;
    const width = state.device === 'mobile' ? 390 : 1100;
    const viewport = frame.closest('.site-live-preview__viewport');
    const scale = Math.min(1, viewport.clientWidth / width);
    frame.style.width = `${width}px`;
    frame.style.transform = `scale(${scale})`;
    viewport.style.height = `${850 * scale}px`;
    if (!frame.dataset.previewListening) {
      frame.addEventListener('load', () => applyDraftToFrame(frame));
      frame.dataset.previewListening = 'true';
    }
    if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow?.location.pathname === info.path) applyDraftToFrame(frame);
  }
  async function save() {
    if (!dirty() || state.saving) return;
    const submitted = { ...state.draft };
    let payload;
    try { payload = parseSitePayload(submitted); }
    catch (error) { state.message = error.message; state.view = 'seo'; draw(); const field = panel.querySelector('[data-site-key="seo.schema"]'); if (field) { field.closest('details').open = true; field.focus(); } return; }
    state.saving = true; state.message = ''; updateControls();
    let result;
    try { result = await api.admin(info.resource, 'update', { data:payload }); }
    catch (error) { result = { ok:false, data:{ error:error.message || 'Save failed. Try again.' } }; }
    state.saving = false;
    if (result.ok) { state.saved = submitted; state.message = dirty() ? '' : 'Saved just now'; }
    else state.message = result.data?.error || 'Save failed. Try again.';
    updateControls();
  }
  async function openMedia(key) {
    state.mediaKey = key;
    state.mediaQuery = '';
    const dialog = panel.querySelector('.site-media-dialog');
    dialog.querySelector('[data-media-search]').value = '';
    dialog.showModal();
    if (!state.media) {
      try {
        const response = await fetch(`/assets/media-index.json?refresh=${Date.now()}`, { cache:'no-store' });
        if (!response.ok) throw new Error('Media library is unavailable.');
        const items = await response.json();
        if (!Array.isArray(items)) throw new Error('Media library is unavailable.');
        state.media = items;
      } catch { panel.querySelector('[data-media-list]').innerHTML = '<p>Media library is unavailable. You can paste a published asset path or HTTPS URL in the field.</p>'; return; }
    }
    renderMediaList();
  }
  function renderMediaList() {
    const list = panel.querySelector('[data-media-list]');
    if (!list || !state.media) return;
    const video = /video(?:Webm|Mp4)$/.test(state.mediaKey);
    const extension = state.mediaKey.endsWith('Webm') ? '.webm' : '.mp4';
    const query = state.mediaQuery.trim().toLowerCase();
    const matches = state.media.filter(item => item.type === (video ? 'video' : 'image') && (!video || item.path.toLowerCase().endsWith(extension)) && (state.mediaKey !== 'seo.ogImage' || !item.path.toLowerCase().endsWith('.svg')) && (!query || item.path.toLowerCase().includes(query))).slice(0, 96);
    list.innerHTML = matches.length ? matches.map(item => `<button type="button" class="site-media-option" data-media-choice="${escapeHtml(item.path)}">${video ? '<span class="site-media-option__video">Video</span>' : `<img src="${escapeHtml(item.path)}" alt="" loading="lazy">`}<span title="${escapeHtml(item.path)}">${escapeHtml(item.name)}</span></button>`).join('') : '<p>No matching assets. Try a shorter search or paste a URL directly.</p>';
  }

  panel.addEventListener('input', event => {
    const input = event.target.closest('[data-site-key]');
    if (input) {
      state.draft[input.dataset.siteKey] = input.value;
      state.message = '';
      updateControls();
      const counter = [...panel.querySelectorAll('[data-counter]')].find(node => node.dataset.counter === input.dataset.siteKey);
      if (counter) counter.textContent = `${input.value.length} / ${advice[input.dataset.siteKey]?.target || 0}`;
      updateSeoPreviews();
      updateFieldPreview(input.dataset.siteKey);
      return;
    }
    if (event.target.matches('[data-media-search]')) { state.mediaQuery = event.target.value; renderMediaList(); }
  }, { signal:controller.signal });
  panel.addEventListener('change', event => {
    const select = event.target.closest('select[data-site-key]');
    if (select) { state.draft[select.dataset.siteKey] = select.value; state.message = ''; updateControls(); }
  }, { signal:controller.signal });
  panel.addEventListener('click', async event => {
    const view = event.target.closest('[data-site-view]');
    if (view) { state.view = view.dataset.siteView; state.message = ''; history.replaceState(null, '', `#${page}/${state.view}`); draw(); return; }
    const group = event.target.closest('[data-site-group]');
    if (group) { state.group = group.dataset.siteGroup; state.mode = 'edit'; draw(); return; }
    const mode = event.target.closest('[data-site-mode]');
    if (mode) { state.mode = mode.dataset.siteMode; draw(); return; }
    const device = event.target.closest('[data-site-device]');
    if (device) { state.device = device.dataset.siteDevice; draw(); return; }
    const opener = event.target.closest('[data-open-media]');
    if (opener) { await openMedia(opener.dataset.openMedia); return; }
    const choice = event.target.closest('[data-media-choice]');
    if (choice) { state.draft[state.mediaKey] = choice.dataset.mediaChoice; state.message = ''; panel.querySelector('.site-media-dialog')?.close(); draw(); return; }
    const template = event.target.closest('[data-schema-template]');
    if (template) {
      const block = schemaTemplates[template.dataset.schemaTemplate]?.(state.draft['seo.canonical']);
      if (!block) return;
      let current;
      try { current = state.draft['seo.schema'].trim() ? JSON.parse(state.draft['seo.schema']) : null; }
      catch { state.message = 'Format or fix the current JSON before adding a block.'; updateControls(); return; }
      const next = current == null ? block : Array.isArray(current) ? [...current, block] : [current, block];
      state.draft['seo.schema'] = JSON.stringify(next, null, 2);
      state.message = ''; draw(); panel.querySelector('[data-site-key="seo.schema"]')?.focus(); return;
    }
    const action = event.target.closest('[data-site-action]')?.dataset.siteAction;
    if (action === 'manage-projects') { panel.dispatchEvent(new CustomEvent('site:open-page', { bubbles:true, detail:{ page:'projects' } })); return; }
    if (action === 'save') { await save(); return; }
    if (action === 'discard') { state.draft = { ...state.saved }; state.message = 'Changes discarded'; draw(); return; }
    if (action === 'close-media') { panel.querySelector('.site-media-dialog')?.close(); return; }
    if (action === 'format-schema') {
      try { const value = JSON.parse(state.draft['seo.schema']); state.draft['seo.schema'] = JSON.stringify(value, null, 2); state.message = 'JSON formatted'; draw(); }
      catch (error) { const status = panel.querySelector('[data-schema-status]'); if (status) status.textContent = `Invalid JSON: ${error.message}`; }
    }
  }, { signal:controller.signal });
  const keydown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && panel.classList.contains('is-active')) {
      event.preventDefault(); save();
    }
  };
  document.addEventListener('keydown', keydown, { signal:controller.signal });
  window.addEventListener('resize', refreshPreview, { signal:controller.signal });
  window.addEventListener('beforeunload', event => {
    if (dirty()) { event.preventDefault(); event.returnValue = ''; }
  }, { signal:controller.signal });
  draw();
}
