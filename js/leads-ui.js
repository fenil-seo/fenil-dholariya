const STATUSES = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', closed: 'Closed', spam: 'Spam' };
const SERVICES = {
  'technical-seo': 'SEO & audits', 'content-strategy': 'Content strategy', 'local-seo': 'Local SEO',
  conversion: 'Lead generation & CRO', 'ai-workflows': 'AI workflows', 'market-research': 'Market research',
  'paid-search': 'Paid search / SEM', 'web-development': 'Web development',
};
const ACTIVE = ['new', 'contacted', 'qualified'];
const DEFAULT_FILTERS = { q: '', status: '', priority: '', service: '', follow_up: '', sort: 'newest', page: 1, page_size: 25 };
const ICONS = {
  inbox: '<path d="M4 4h16l2 12v4H2v-4L4 4Z"/><path d="M2 16h6l2 3h4l2-3h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13 2M4.9 16a8 8 0 0 0 13 2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.inbox}</svg>`;

export function safeLeadWebsite(value) {
  try {
    if (typeof value !== 'string') return '';
    value = value.trim();
    if (!value || /\s|^\/|[\\\u0000-\u001f]/.test(value) || /^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return '';
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function leadCsv(items) {
  const columns = ['id', 'name', 'email', 'company', 'services', 'website', 'market', 'budget', 'currency', 'timeline', 'timezone', 'project_brief', 'status', 'priority', 'follow_up_at', 'notes', 'source_path', 'created_at', 'updated_at'];
  const cell = value => {
    let text = String(value ?? '');
    // Spreadsheet programs interpret leading formula characters even in quoted cells.
    if (/^[\s\uFEFF\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [columns.map(cell).join(','), ...items.map(item => columns.map(key => cell(
    key === 'services' ? (item.services || []).map(id => SERVICES[id] || id).join('; ') :
      key === 'project_brief' ? item.project_brief ?? item.message : item[key]
  )).join(','))].join('\r\n');
}

function localDateTime(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '';
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function mountLeadsInbox({ panel, api, noteDbStatus, esc }) {
  panel.__leadsAbort?.abort();
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  panel.__leadsAbort = lifecycle;
  let filters = { ...DEFAULT_FILTERS };
  let items = [], total = 0, selected = null, dirty = false, saving = false, loading = false, exporting = false;
  let sequence = 0, searchTimer, lastLoaded = null, draftBefore = '';
  const number = value => Number(value || 0).toLocaleString();
  const date = (value, short = false) => {
    const parsed = new Date(value);
    return value && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-GB', short ? { day: 'numeric', month: 'short' } : { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';
  };
  const overdue = item => ACTIVE.includes(item.status) && item.follow_up_at && new Date(item.follow_up_at).getTime() < Date.now();
  const options = (values, current = '', first = '') => `${first ? `<option value="">${esc(first)}</option>` : ''}${Object.entries(values).map(([value, label]) => `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`).join('')}`;
  const badge = item => `<span class="leads-badge leads-badge--${esc(STATUSES[item.status] ? item.status : 'new')}">${esc(STATUSES[item.status] || 'New')}</span>`;
  panel.innerHTML = `
    <div class="leads-workspace">
      <header class="leads-heading">
        <div><p class="site-eyebrow">Enquiries & follow-ups</p><h1>Contact leads<span class="leads-heading__dot"></span></h1><p>Every conversation starts here. Turn project briefs into clear next steps.</p></div>
        <a class="leads-button" href="/contact" target="_blank" rel="noopener">View contact form ${icon('arrow')}</a>
      </header>
      <div class="leads-stats" aria-label="Enquiry overview">
        ${[['total', 'All enquiries', 'Your complete inbox', 'inbox'], ['new', 'New enquiries', 'Ready for a first reply', 'mail'], ['active', 'Active conversations', 'New, contacted or qualified', 'check'], ['overdue', 'Overdue follow-ups', 'Active leads needing attention', 'clock']].map(([key, label, hint, glyph]) => `<button type="button" class="leads-stat" data-stat="${key}" aria-pressed="false"><span class="leads-stat__top">${label}${icon(glyph)}</span><strong data-count="${key}">...</strong><span class="leads-stat__hint">${hint}</span></button>`).join('')}
      </div>
      <section class="leads-inbox" aria-label="Enquiry inbox">
        <div class="leads-toolbar">
          <label class="leads-search">${icon('search')}<span class="leads-sr-only">Search enquiries</span><input type="search" name="q" maxlength="200" placeholder="Search name, email, company or brief" autocomplete="off" data-filter="q"></label>
          <div class="leads-toolbar__actions"><button type="button" class="leads-button" data-action="refresh">${icon('refresh')} Refresh</button><button type="button" class="leads-button" data-action="export" disabled>${icon('download')} Export CSV</button></div>
        </div>
        <div class="leads-filters">
          <label>Status<select data-filter="status">${options({ ...STATUSES, active: 'All active' }, '', 'All statuses')}</select></label>
          <label>Service<select data-filter="service">${options(SERVICES, '', 'All services')}</select></label>
          <label>Priority<select data-filter="priority">${options({ normal: 'Normal', high: 'High' }, '', 'All priorities')}</select></label>
          <label>Follow-up<select data-filter="follow_up">${options({ overdue: 'Overdue', due: 'Next 24 hours', upcoming: 'Upcoming' }, '', 'Any follow-up')}</select></label>
          <label>Sort by<select data-filter="sort">${options({ newest: 'Newest first', oldest: 'Oldest first', follow_up: 'Follow-up date' }, 'newest')}</select></label>
          <button type="button" class="leads-clear" data-action="clear" hidden>Clear filters</button>
        </div>
        <p class="leads-feedback" data-feedback role="status" aria-live="polite"></p>
        <div class="leads-layout">
          <div class="leads-list-pane">
            <div class="leads-list-title"><h2>Inbox <span data-total></span></h2><span class="leads-sync" data-sync>Connecting...</span></div>
            <div data-list aria-busy="true"></div>
            <footer class="leads-pagination" data-pagination></footer>
          </div>
          <section class="leads-detail" data-detail aria-label="Enquiry details"></section>
        </div>
      </section>
      <p class="leads-footnote">Only visible to administrators. Times use your device time zone.</p>
    </div>`;
  const root = panel.querySelector('.leads-workspace');
  const list = root.querySelector('[data-list]');
  const detail = root.querySelector('[data-detail]');
  const feedback = root.querySelector('[data-feedback]');
  const exportButton = root.querySelector('[data-action="export"]');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  root.querySelector('.leads-footnote').textContent = `Only visible to administrators. Times shown in ${timezone || 'your device time zone'}.`;

  function notify(message = '', error = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', error);
  }
  function canLeave() {
    if (saving) { notify('Please wait for the current save to finish.'); return false; }
    if (!dirty) return true;
    if (!window.confirm('Discard unsaved changes to this enquiry?')) return false;
    renderDetail();
    return true;
  }
  panel.__leadsCanLeave = canLeave;
  window.addEventListener('beforeunload', event => {
    if (dirty || saving) { event.preventDefault(); event.returnValue = ''; }
  }, { signal });
  signal.addEventListener('abort', () => { clearTimeout(searchTimer); delete panel.__leadsCanLeave; });

  async function request(action, payload) {
    try {
      const result = await api.admin('leads', action, payload);
      if (result?.ok && (action === 'list' && !Array.isArray(result.data?.items) || action === 'delete' && result.data?.ok !== true)) {
        return { ok: false, data: { error: 'The server returned an incomplete response. Please try again.' } };
      }
      return result || { ok: false };
    }
    catch { return { ok: false, data: { error: 'Connection interrupted. Please try again.' } }; }
  }
  function responseError(result, fallback) {
    return result.status === 401 ? 'Your session has expired. Sign out and sign in again to continue.' : result.data?.error || fallback;
  }
  function syncFilters() {
    root.querySelectorAll('[data-filter]').forEach(input => { input.value = filters[input.dataset.filter]; });
    root.querySelector('[data-action="clear"]').hidden = !['q', 'status', 'priority', 'service', 'follow_up'].some(key => filters[key]) && filters.sort === 'newest';
    root.querySelectorAll('[data-stat]').forEach(button => {
      const active = button.dataset.stat === 'new' ? filters.status === 'new' : button.dataset.stat === 'active' ? filters.status === 'active' : button.dataset.stat === 'overdue' ? filters.follow_up === 'overdue' : !filters.status && !filters.follow_up;
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function renderList() {
    root.querySelector('[data-total]').textContent = loading && !lastLoaded ? '' : number(total);
    exportButton.disabled = !total || loading || exporting;
    if (!items.length) {
      const filtered = ['q', 'status', 'priority', 'service', 'follow_up'].some(key => filters[key]);
      list.innerHTML = `<div class="leads-empty">${icon('inbox')}<h3>${filtered ? 'No matching enquiries' : 'Your next conversation starts here'}</h3><p>${filtered ? 'Try another search or clear your filters.' : 'Requests sent through your contact form will appear here with the full project brief.'}</p>${filtered ? '<button type="button" class="leads-button" data-action="clear">Clear filters</button>' : '<a class="leads-button" href="/contact" target="_blank" rel="noopener">View contact form</a>'}</div>`;
    } else {
      list.innerHTML = `<div class="leads-list-head" aria-hidden="true"><span>Contact / request</span><span>Status / received</span></div><ul class="leads-list">${items.map(item => {
        const services = (item.services || []).map(id => SERVICES[id] || id);
        const brief = (item.project_brief ?? item.message ?? '').replace(/\s+/g, ' ');
        const initials = String(item.name || '?').trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('');
        return `<li><button type="button" class="leads-row${selected?.id === item.id ? ' is-selected' : ''}" data-lead-id="${esc(item.id)}" aria-pressed="${selected?.id === item.id}" aria-label="Open enquiry from ${esc(item.name)}">
          <span class="leads-avatar" aria-hidden="true">${esc(initials)}</span>
          <span class="leads-row__contact"><strong>${esc(item.name)}${item.priority === 'high' ? '<span class="leads-priority" aria-label="High priority">High</span>' : ''}</strong><span class="leads-row__company">${esc(item.company || item.email)}</span><span class="leads-row__service">${esc(services.join(' / ') || 'General enquiry')}</span><span class="leads-row__brief">${esc(brief)}</span>${overdue(item) ? '<span class="leads-overdue">Follow-up overdue</span>' : item.follow_up_at && ACTIVE.includes(item.status) ? `<span class="leads-row__followup">Follow-up ${esc(date(item.follow_up_at, true))}</span>` : ''}</span>
          <span class="leads-row__state">${badge(item)}<time datetime="${esc(item.created_at)}" title="${esc(date(item.created_at))}">${esc(date(item.created_at, true))}</time>${icon('arrow')}</span>
        </button></li>`;
      }).join('')}</ul>`;
    }
    const pages = Math.max(1, Math.ceil(total / filters.page_size));
    root.querySelector('[data-pagination]').innerHTML = `<span>${total ? `${number((filters.page - 1) * filters.page_size + 1)} to ${number(Math.min(filters.page * filters.page_size, total))} of ${number(total)}` : '0 enquiries'}</span><div><button type="button" class="leads-page" data-action="previous" aria-label="Previous page"${filters.page <= 1 || loading ? ' disabled' : ''}>‹</button><span>${filters.page} / ${pages}</span><button type="button" class="leads-page" data-action="next" aria-label="Next page"${filters.page >= pages || loading ? ' disabled' : ''}>›</button></div>`;
  }
  function draft() {
    const form = detail.querySelector('form');
    if (!form) return {};
    return { status: form.elements.status.value, priority: form.elements.priority.value, notes: form.elements.notes.value, follow_up_at: form.elements.follow_up_at.value };
  }
  function markDirty() {
    dirty = JSON.stringify(draft()) !== draftBefore;
    detail.querySelector('[data-action="save"]').disabled = !dirty || saving;
    detail.querySelector('[data-action="discard"]').disabled = !dirty || saving;
    detail.querySelector('[data-draft]').textContent = dirty ? 'Unsaved changes' : 'All changes saved';
  }
  function renderDetail(focus = false) {
    dirty = false;
    if (!selected) {
      detail.innerHTML = `<div class="leads-detail-placeholder">${icon('mail')}<h2>A brief, a person, a next step.</h2><p>Select an enquiry to read the request and plan your follow-up.</p></div>`;
      return;
    }
    const item = selected;
    const website = item.website && safeLeadWebsite(item.website);
    const meta = [
      ['Company', item.company], ['Website', item.website, website], ['Target market', item.market],
      ['Project budget', [item.currency, item.budget].filter(Boolean).join(' ')], ['Preferred start', item.timeline],
      ['Location / time zone', item.timezone],
    ];
    detail.innerHTML = `
      <header class="leads-detail__header"><div><span class="leads-detail__ref">ENQUIRY #${esc(item.id)}</span><h2 tabindex="-1" data-detail-title>${esc(item.name)}</h2><a class="leads-email" href="mailto:${esc(encodeURIComponent(item.email))}">${esc(item.email)}</a></div>${badge(item)}</header>
      <p class="leads-received">Received ${esc(date(item.created_at))}</p>
      <div class="leads-detail__body">
        <div class="leads-services">${(item.services || []).length ? item.services.map(id => `<span>${esc(SERVICES[id] || id)}</span>`).join('') : '<span>General enquiry</span>'}</div>
        <section class="leads-brief"><h3>Project brief</h3><p>${esc(item.project_brief ?? item.message ?? '')}</p></section>
        <dl class="leads-metadata">${meta.map(([label, value, href]) => `<div><dt>${label}</dt><dd>${value ? href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(value)} ${icon('arrow')}</a>` : esc(value) : '<span class="leads-not-shared">Not shared</span>'}</dd></div>`).join('')}</dl>
        <a class="leads-button leads-button--reply" href="mailto:${esc(encodeURIComponent(item.email))}?subject=${esc(encodeURIComponent('Re: Your project enquiry'))}">${icon('mail')} Reply by email ${icon('arrow')}</a><p class="leads-help">Opens your email app. Update the status after you reply.</p>
        <form class="leads-tracking" aria-label="Manage enquiry">
          <div class="leads-section-heading"><h3>Next steps</h3><span data-draft>All changes saved</span></div>
          <div class="leads-tracking__grid"><label>Status<select name="status">${options(STATUSES, item.status || 'new')}</select></label><label>Priority<select name="priority">${options({ normal: 'Normal', high: 'High' }, item.priority || 'normal')}</select></label></div>
          <label class="leads-field">Follow-up date & time<input name="follow_up_at" type="datetime-local" value="${esc(localDateTime(item.follow_up_at))}" aria-describedby="lead-followup-help"></label>
          <p class="leads-help" id="lead-followup-help">${esc(timezone)}. Clear the date to remove the reminder.</p>
          <label class="leads-field">Private notes<textarea name="notes" rows="4" maxlength="10000" placeholder="Add context, discussion points or your next action...">${esc(item.notes || '')}</textarea></label>
          <p class="leads-help">Internal notes are never shown on the public website.</p>
          <p class="leads-save-feedback" data-save-feedback role="status" aria-live="polite"></p>
          <div class="leads-savebar"><button class="leads-button leads-button--primary" type="submit" data-action="save" disabled>${icon('check')} Save changes</button><button class="leads-button" type="button" data-action="discard" disabled>Discard</button></div>
        </form>
        <footer class="leads-detail__footer"><span>${item.updated_at ? `Last updated ${esc(date(item.updated_at))}` : `Source: ${esc(item.source_path || '/contact')}`}</span><button type="button" class="leads-delete" data-action="delete">Delete enquiry</button></footer>
      </div>`;
    draftBefore = JSON.stringify(draft());
    if (focus) {
      detail.querySelector('[data-detail-title]').focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 1100px)').matches) detail.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }
  async function load({ preserveDetail = true } = {}) {
    clearTimeout(searchTimer);
    const current = ++sequence;
    loading = true;
    list.setAttribute('aria-busy', 'true');
    root.querySelector('[data-action="refresh"]').disabled = true;
    exportButton.disabled = true;
    root.querySelector('[data-sync]').textContent = 'Updating...';
    if (!lastLoaded) list.innerHTML = '<div class="leads-loading">Loading your enquiries...</div>';
    const result = await request('list', { data: { ...filters } });
    if (signal.aborted || current !== sequence) return;
    loading = false;
    list.setAttribute('aria-busy', 'false');
    root.querySelector('[data-action="refresh"]').disabled = false;
    if (!result.ok) {
      noteDbStatus?.(result.ok, result.data);
      root.querySelector('[data-sync]').textContent = 'Could not update';
      notify(responseError(result, 'Could not load enquiries. Your saved requests have not been removed.'), true);
      if (!lastLoaded) {
        list.innerHTML = `<div class="leads-empty">${icon('inbox')}<h3>Inbox unavailable</h3><p>${esc(responseError(result, 'Check your connection and try again.'))}</p><button type="button" class="leads-button" data-action="refresh">Try again</button></div>`;
        renderDetail();
      }
      return;
    }
    noteDbStatus?.(true, result.data);
    items = result.data.items || [];
    total = Number(result.data.total ?? items.length);
    filters.page = Number(result.data.page || filters.page);
    lastLoaded = new Date();
    root.querySelector('[data-sync]').textContent = `Updated ${lastLoaded.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    root.querySelectorAll('[data-count]').forEach(counter => { counter.textContent = number(result.data.stats?.[counter.dataset.count]); });
    if (!selected && items.length) { selected = items[0]; renderDetail(); }
    else if (!preserveDetail && !dirty) { selected = items.find(item => item.id === selected?.id) || null; renderDetail(); }
    renderList();
    syncFilters();
  }
  async function save() {
    if (!selected || saving || !dirty) return;
    const form = detail.querySelector('form');
    if (!form.reportValidity()) return;
    const values = draft();
    values.follow_up_at = values.follow_up_at ? new Date(values.follow_up_at).toISOString() : null;
    const id = selected.id;
    const saveFeedback = detail.querySelector('[data-save-feedback]');
    saving = true;
    form.querySelectorAll('button,input,textarea,select').forEach(input => { input.disabled = true; });
    saveFeedback.textContent = 'Saving changes...';
    saveFeedback.classList.remove('is-error');
    const result = await request('update', { id, data: values });
    if (signal.aborted) return;
    saving = false;
    if (!result.ok || !result.data?.item) {
      form.querySelectorAll('button,input,textarea,select').forEach(input => { input.disabled = false; });
      saveFeedback.textContent = responseError(result, 'Changes could not be saved. Your draft is still here.');
      saveFeedback.classList.add('is-error');
      markDirty();
      return;
    }
    selected = result.data.item;
    renderDetail();
    detail.querySelector('[data-save-feedback]').textContent = 'Changes saved.';
    detail.querySelector('[data-detail-title]').focus({ preventScroll: true });
    notify('Enquiry updated.');
    await load();
  }
  async function exportCsv() {
    if (exporting || loading || !total) return;
    const query = { ...filters, page: 1, page_size: 100 };
    const rows = [], seen = new Set();
    exporting = true;
    exportButton.disabled = true;
    notify('Preparing CSV for all matching enquiries...');
    try {
      let page = 1, pages = 1;
      do {
        const result = await request('list', { data: { ...query, page } });
        if (signal.aborted) return;
        if (!result.ok) throw new Error(responseError(result, 'Export failed. Please try again.'));
        pages = Math.ceil(Number(result.data.total || 0) / 100);
        for (const item of result.data.items || []) if (!seen.has(item.id)) { rows.push(item); seen.add(item.id); }
        page++;
      } while (page <= pages);
      const url = URL.createObjectURL(new Blob([leadCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `contact-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`Exported ${number(rows.length)} matching enquiries.`);
    } catch (error) { notify(error.message, true); }
    finally { exporting = false; if (!signal.aborted) exportButton.disabled = !total || loading; }
  }
  async function remove() {
    if (!selected || saving) return;
    if (!window.confirm(`Permanently delete the enquiry from ${selected.name}? The project brief and private notes will be removed.`)) return;
    const id = selected.id;
    saving = true;
    const button = detail.querySelector('[data-action="delete"]');
    button.disabled = true;
    const result = await request('delete', { id });
    if (signal.aborted) return;
    saving = false;
    if (!result.ok) { button.disabled = false; notify(responseError(result, 'Could not delete this enquiry.'), true); return; }
    selected = null;
    dirty = false;
    if (items.length === 1 && filters.page > 1) filters.page--;
    renderDetail();
    notify('Enquiry deleted.');
    await load();
  }
  function applyFilter(input) {
    if (!canLeave()) { syncFilters(); return; }
    dirty = false;
    selected = null;
    filters[input.dataset.filter] = input.value.trim();
    filters.page = 1;
    notify(); renderDetail(); syncFilters(); load();
  }
  root.addEventListener('input', event => {
    if (event.target.matches('[data-filter="q"]')) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFilter(event.target), 320);
    } else if (event.target.closest('.leads-tracking')) markDirty();
  }, { signal });
  root.addEventListener('change', event => {
    if (event.target.matches('select[data-filter]')) applyFilter(event.target);
    else if (event.target.closest('.leads-tracking')) markDirty();
  }, { signal });
  root.addEventListener('submit', event => { event.preventDefault(); save(); }, { signal });
  root.addEventListener('click', async event => {
    const row = event.target.closest('[data-lead-id]');
    if (row) {
      if (loading || !canLeave()) return;
      selected = items.find(item => String(item.id) === row.dataset.leadId);
      renderDetail(true); renderList(); notify(); return;
    }
    const stat = event.target.closest('[data-stat]');
    if (stat) {
      if (!canLeave()) return;
      filters = { ...DEFAULT_FILTERS, status: ['new', 'active'].includes(stat.dataset.stat) ? stat.dataset.stat : '', follow_up: stat.dataset.stat === 'overdue' ? 'overdue' : '' };
      selected = null; renderDetail(); syncFilters(); notify(); await load(); return;
    }
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'export') { await exportCsv(); return; }
    if (action === 'save') return; // Form submit handles this action.
    if (action === 'discard') { renderDetail(); notify('Unsaved changes discarded.'); return; }
    if (action === 'delete') { await remove(); return; }
    if (!canLeave()) return;
    if (action === 'refresh') { dirty = false; notify(); await load({ preserveDetail: false }); return; }
    if (action === 'clear') filters = { ...DEFAULT_FILTERS };
    if (action === 'previous') filters.page = Math.max(1, filters.page - 1);
    if (action === 'next') filters.page++;
    selected = null; renderDetail(); syncFilters(); notify(); await load();
  }, { signal });
  renderDetail(); syncFilters();
  await load();
}
