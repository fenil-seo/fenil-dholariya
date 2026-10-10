export const LEAD_SERVICES = {
  'technical-seo': ['SEO & audits', 'SEO & technical audits', 'Technical SEO', 'SEO'],
  'content-strategy': ['Content strategy'],
  'local-seo': ['Local SEO', 'Local search'],
  conversion: ['Lead generation & CRO', 'Lead generation', 'CRO'],
  'ai-workflows': ['AI workflows'],
  'market-research': ['Market research'],
  'paid-search': ['Paid search / SEM', 'Paid search', 'SEM'],
  'web-development': ['Web development'],
};
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed', 'spam'];
export const LEAD_PRIORITIES = ['normal', 'high'];
export const LEAD_COLUMNS = `id, name, email, company, message, project_brief, services, website, market,
  budget, currency, timeline, timezone, source_path, status, priority, notes,
  follow_up_at, created_at, updated_at`;

export class LeadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function text(value, field, limit, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new LeadError(`${field} must be text.`);
  const clean = value.trim();
  if (required && !clean) throw new LeadError(`${field} is required.`);
  if (clean.length > limit) throw new LeadError(`${field} must be ${limit} characters or fewer.`);
  if (clean.includes('\0')) throw new LeadError(`${field} contains an invalid character.`);
  return clean;
}

function websiteUrl(value) {
  const raw = text(value, 'Website', 2000);
  if (!raw) return '';
  if (/\s|^\//.test(raw) || /[\\\u0000-\u001f]/.test(raw)) throw new LeadError('Enter a valid HTTP or HTTPS website.');
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new LeadError('Enter a valid HTTP or HTTPS website.'); }
}

function serviceIds(values, strict = true) {
  if (values == null) return [];
  if (!Array.isArray(values) || values.length > 8) {
    if (!strict) return [];
    throw new LeadError('Services must be a list of up to 8 selected services.');
  }
  const ids = [];
  for (const value of values) {
    const match = typeof value === 'string' && Object.keys(LEAD_SERVICES).find(id =>
      id === value.toLowerCase() || LEAD_SERVICES[id].some(label => label.toLowerCase() === value.toLowerCase().trim()));
    if (!match) {
      if (strict) throw new LeadError('Choose a service from the available options.');
      continue;
    }
    if (!ids.includes(match)) ids.push(match);
  }
  return ids;
}

// Older clients prepend labelled planning fields to the message. Parse only
// that known envelope, so a line inside someone's brief never becomes metadata.
export function parseLegacyLeadMessage(message) {
  const original = typeof message === 'string' ? message : '';
  const clean = original.replace(/\r\n/g, '\n');
  const marker = /(?:^|\n)Project brief:\n/.exec(clean);
  if (!marker) return { project_brief: original };
  const header = clean.slice(0, marker.index);
  const result = { project_brief: clean.slice(marker.index + marker[0].length) };
  const fields = {
    Services: 'services', Website: 'website', 'Target market': 'market',
    'Total project budget': 'budget', 'Preferred start': 'timeline',
    'Location / time zone': 'timezone',
  };
  const lines = header.split('\n').filter(Boolean);
  if (lines.some(line => !Object.keys(fields).some(label => line.startsWith(`${label}: `)))) return { project_brief: original };
  for (const line of lines) {
    const split = line.indexOf(': ');
    const field = fields[line.slice(0, split)];
    const value = line.slice(split + 2).trim();
    result[field] = field === 'services' ? serviceIds(value.split(/,\s*/), false) : value;
  }
  if (result.budget) {
    const currency = /^(INR|USD|GBP|EUR|AUD|CAD|Other)\s+(.+)$/i.exec(result.budget);
    if (currency) { result.currency = currency[1].toUpperCase() === 'OTHER' ? 'Other' : currency[1].toUpperCase(); result.budget = currency[2]; }
  }
  return result;
}

export function normalizeLead(row) {
  const legacy = row.project_brief == null ? parseLegacyLeadMessage(row.message) : { project_brief: row.project_brief };
  let savedServices = row.services;
  if (typeof savedServices === 'string') { try { savedServices = JSON.parse(savedServices); } catch { savedServices = []; } }
  const services = serviceIds(savedServices, false);
  const result = {
    ...row, message: row.message || '', project_brief: legacy.project_brief,
    services: services.length ? services : legacy.services || [],
    status: LEAD_STATUSES.includes(row.status) ? row.status : 'new',
    priority: LEAD_PRIORITIES.includes(row.priority) ? row.priority : 'normal',
    notes: row.notes || '', follow_up_at: row.follow_up_at || null,
    updated_at: row.updated_at || null,
  };
  for (const field of ['company', 'website', 'market', 'budget', 'currency', 'timeline', 'timezone', 'source_path']) {
    result[field] = row[field] || legacy[field] || '';
  }
  return result;
}

export function validateLeadSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LeadError('Please complete the contact form.');
  const name = text(input.name, 'Name', 200, true);
  const email = text(input.email, 'Email', 254, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new LeadError('Enter a valid email address.');
  const message = text(input.message, 'Project brief', 6000, true);
  const structured = ['services', 'website', 'market', 'budget', 'currency', 'timeline', 'timezone', 'source_path'].some(field => Object.hasOwn(input, field));
  const legacy = structured ? { project_brief: message } : parseLegacyLeadMessage(message);
  const result = {
    name, email, message, project_brief: legacy.project_brief, company: text(input.company, 'Company', 200),
    services: serviceIds(input.services ?? legacy.services),
    website: websiteUrl(input.website ?? legacy.website),
  };
  for (const [field, limit] of Object.entries({ market: 300, budget: 150, timeline: 150, timezone: 150 })) {
    result[field] = text(input[field] ?? legacy[field], field[0].toUpperCase() + field.slice(1), limit);
  }
  result.currency = text(input.currency ?? legacy.currency, 'Currency', 16);
  if (result.currency) {
    if (/^[a-z]{3}$/i.test(result.currency)) result.currency = result.currency.toUpperCase();
    else if (result.currency.toLowerCase() === 'other') result.currency = 'Other';
    else throw new LeadError('Currency must be a three-letter currency code or Other.');
  }
  result.source_path = text(input.source_path, 'Source page', 1000) || '/contact';
  if (!/^\/(?!\/)[^\s#]*$/.test(result.source_path) || /[\u0000-\u001f\\]/.test(result.source_path)) {
    throw new LeadError('Source page must be a local website path.');
  }
  return result;
}

export async function insertLead(sql, lead) {
  const fields = ['name', 'email', 'company', 'message', 'services', 'website', 'market', 'budget', 'currency', 'timeline', 'timezone', 'source_path', 'project_brief'];
  const placeholders = fields.map((field, index) => `$${index + 1}${field === 'services' ? '::jsonb' : ''}`);
  const rows = await sql(`INSERT INTO leads (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    fields.map(field => field === 'services' ? JSON.stringify(lead[field]) : lead[field]));
  if (!rows[0]?.id) throw new Error('Lead storage did not confirm the insert.');
  return rows[0].id;
}

function integer(value, field, fallback, maximum) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'number' && typeof value !== 'string') throw new LeadError(`${field} must be a whole number.`);
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum) throw new LeadError(`${field} must be between 1 and ${maximum}.`);
  return result;
}

export function validateLeadList(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LeadError('Invalid lead filters.');
  const filters = {
    page: integer(input.page, 'Page', 1, 1000000),
    page_size: integer(input.page_size, 'Page size', 25, 100),
    q: text(input.q, 'Search', 200),
    status: text(input.status, 'Status', 20), priority: text(input.priority, 'Priority', 20),
    service: text(input.service, 'Service', 40), follow_up: text(input.follow_up, 'Follow-up', 20),
    sort: text(input.sort, 'Sort', 20) || 'newest',
  };
  for (const [field, values] of Object.entries({ status: [...LEAD_STATUSES, 'active'], priority: LEAD_PRIORITIES,
    service: Object.keys(LEAD_SERVICES), follow_up: ['overdue', 'due', 'upcoming'], sort: ['newest', 'oldest', 'follow_up'] })) {
    if (filters[field] && !values.includes(filters[field])) throw new LeadError(`Choose a valid ${field.replace('_', '-')} filter.`);
  }
  return filters;
}

function leadWhere(filters) {
  const clauses = [], params = [];
  const parameter = value => { params.push(value); return `$${params.length}`; };
  for (const field of ['status', 'priority']) if (filters[field]) {
    if (field === 'status' && filters.status === 'active') clauses.push(`COALESCE(status, 'new') IN ('new', 'contacted', 'qualified')`);
    else clauses.push(`COALESCE(${field}, '${field === 'status' ? 'new' : 'normal'}') = ${parameter(filters[field])}`);
  }
  if (filters.q) {
    const search = parameter(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
    clauses.push(`concat_ws(' ', name, email, company, message, website, market, budget, currency, timeline, timezone, notes, services::text) ILIKE ${search} ESCAPE E'\\\\'`);
  }
  if (filters.service) {
    const id = parameter(filters.service);
    const aliases = [filters.service, ...LEAD_SERVICES[filters.service]].map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const legacy = parameter(`(^|\n)Services:[ \t]*([^\n]*,[ \t]*)?(${aliases})[ \t]*(,|\n|$)`);
    clauses.push(`(COALESCE(services, '[]'::jsonb) ? ${id} OR
      (project_brief IS NULL AND COALESCE(services, '[]'::jsonb) = '[]'::jsonb AND
       split_part(replace(COALESCE(message, ''), chr(13), ''), E'\\nProject brief:\\n', 1) ~* ${legacy}))`);
  }
  if (filters.follow_up) {
    clauses.push(`COALESCE(status, 'new') IN ('new', 'contacted', 'qualified')`);
    if (filters.follow_up === 'overdue') clauses.push('follow_up_at < now()');
    if (filters.follow_up === 'due') clauses.push(`follow_up_at >= now() AND follow_up_at <= now() + interval '24 hours'`);
    if (filters.follow_up === 'upcoming') clauses.push(`follow_up_at > now() + interval '24 hours'`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export async function listLeads(sql, filters) {
  const { where, params } = leadWhere(filters);
  const [countRows, statsRows] = await Promise.all([
    sql(`SELECT count(*)::int AS total FROM leads ${where}`, params),
    sql(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE COALESCE(status, 'new') = 'new')::int AS new,
      count(*) FILTER (WHERE COALESCE(status, 'new') IN ('new', 'contacted', 'qualified'))::int AS active,
      count(*) FILTER (WHERE COALESCE(status, 'new') IN ('new', 'contacted', 'qualified') AND follow_up_at < now())::int AS overdue
      FROM leads`),
  ]);
  const total = Number(countRows[0]?.total || 0);
  const page = Math.min(filters.page, Math.max(1, Math.ceil(total / filters.page_size)));
  const order = filters.sort === 'oldest' ? 'created_at ASC, id ASC' : filters.sort === 'follow_up'
    ? 'follow_up_at ASC NULLS LAST, created_at DESC, id DESC' : 'created_at DESC, id DESC';
  const rows = await sql(`SELECT ${LEAD_COLUMNS} FROM leads ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.page_size, (page - 1) * filters.page_size]);
  const stats = Object.fromEntries(['total', 'new', 'active', 'overdue'].map(key => [key, Number(statsRows[0]?.[key] || 0)]));
  return { items: rows.map(normalizeLead), total, page, page_size: filters.page_size, stats, storage: 'database' };
}

export function validateLeadId(id) {
  const value = integer(id, 'Lead ID', undefined, 2147483647);
  if (!value) throw new LeadError('Missing lead ID.');
  return value;
}

export function validateLeadUpdate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new LeadError('Provide the lead fields to update.');
  const result = {};
  for (const [field, values] of Object.entries({ status: LEAD_STATUSES, priority: LEAD_PRIORITIES })) {
    if (data[field] !== undefined) {
      if (!values.includes(data[field])) throw new LeadError(`Choose a valid ${field}.`);
      result[field] = data[field];
    }
  }
  if (data.notes !== undefined) result.notes = text(data.notes, 'Internal notes', 10000);
  if (data.follow_up_at !== undefined) {
    if (data.follow_up_at === null || data.follow_up_at === '') result.follow_up_at = null;
    else {
      if (typeof data.follow_up_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(data.follow_up_at) || !Number.isFinite(Date.parse(data.follow_up_at))) {
        throw new LeadError('Follow-up must be a valid date and time including its time zone.');
      }
      const [year, month, day] = data.follow_up_at.slice(0, 10).split('-').map(Number);
      if (year < 1 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
        throw new LeadError('Follow-up must be a real calendar date.');
      }
      result.follow_up_at = new Date(data.follow_up_at).toISOString();
    }
  }
  if (!Object.keys(result).length) throw new LeadError('No lead fields provided.');
  return result;
}

export async function updateLead(sql, id, values) {
  const fields = Object.keys(values);
  const params = fields.map(field => values[field]);
  params.push(id);
  const rows = await sql(`UPDATE leads SET ${fields.map((field, index) => `${field}=$${index + 1}`).join(', ')}, updated_at=now()
    WHERE id=$${params.length} RETURNING ${LEAD_COLUMNS}`, params);
  if (!rows[0]) throw new LeadError('This lead no longer exists. Reload the inbox.', 404);
  return normalizeLead(rows[0]);
}

export async function deleteLead(sql, id) {
  const rows = await sql('DELETE FROM leads WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw new LeadError('This lead no longer exists. Reload the inbox.', 404);
}
