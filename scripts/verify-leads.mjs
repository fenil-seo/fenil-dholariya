import assert from 'node:assert/strict';
import { createLeadsHandler } from '../api/leads.js';
import adminHandler, { handleLeads } from '../api/admin.js';
import { createSessionCookie } from '../lib/auth.js';
import { ensureLeadsSchema, LEAD_SCHEMA_SQL } from '../lib/lead-migration.js';
import { normalizeLead, parseLegacyLeadMessage, validateLeadSubmission, validateLeadUpdate } from '../lib/leads.js';
import { leadCsv, safeLeadWebsite } from '../js/leads-ui.js';

const response = () => ({
  headers: {}, status(code) { this.code = code; return this; },
  setHeader(key, value) { this.headers[key] = value; }, json(body) { this.body = body; return this; },
});
const now = Date.now();
const active = row => ['new', 'contacted', 'qualified'].includes(row.status || 'new');
const stored = new Map();
const queries = [];
let nextId = 1;

// A strict, isolated SQL adapter exercises the real API's bindings and writes.
// It never loads credentials or calls Neon. Unexpected SQL fails the test.
const fixtureSql = async (query, params = []) => {
  queries.push({ query, params });
  if (/^(CREATE|ALTER)/.test(query)) {
    assert.ok(!/\b(posts|projects|profile)\b/.test(query), 'Lead migration must be independent of public content');
    return [];
  }
  if (query.startsWith('INSERT INTO leads')) {
    const fields = /INSERT INTO leads \(([^)]+)\)/.exec(query)[1].split(', ');
    assert.equal(fields.length, params.length);
    assert.match(query, /\$5::jsonb/);
    assert.match(query, /RETURNING id$/);
    const item = { id: nextId++, status: 'new', priority: 'normal', notes: '', follow_up_at: null,
      created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() };
    fields.forEach((field, index) => { item[field] = field === 'services' ? JSON.parse(params[index]) : params[index]; });
    stored.set(item.id, item);
    return [{ id: item.id }];
  }
  if (query.startsWith('UPDATE leads')) {
    assert.match(query, /updated_at=now\(\)/);
    assert.match(query, new RegExp(`WHERE id=\\$${params.length} RETURNING`));
    const row = stored.get(params.at(-1));
    if (!row) return [];
    for (const [, field, position] of query.matchAll(/(status|priority|notes|follow_up_at)=\$(\d+)/g)) row[field] = params[Number(position) - 1];
    row.updated_at = new Date(now + 1000).toISOString();
    return [{ ...row }];
  }
  if (query.startsWith('DELETE FROM leads')) {
    assert.equal(query, 'DELETE FROM leads WHERE id=$1 RETURNING id');
    if (!stored.has(params[0])) return [];
    stored.delete(params[0]);
    return [{ id: params[0] }];
  }
  if (!query.startsWith('SELECT')) throw new Error('Unexpected SQL operation');
  if (query.includes('AS active')) {
    assert.equal(params.length, 0, 'Dashboard stats must be global');
    const rows = [...stored.values()];
    return [{ total: rows.length, new: rows.filter(row => (row.status || 'new') === 'new').length,
      active: rows.filter(active).length, overdue: rows.filter(row => active(row) && row.follow_up_at && Date.parse(row.follow_up_at) < now).length }];
  }
  let rows = [...stored.values()];
  for (const field of ['status', 'priority']) {
    const condition = new RegExp(`COALESCE\\(${field}, '[^']+'\\) = \\$(\\d+)`).exec(query);
    if (condition) rows = rows.filter(row => (row[field] || (field === 'status' ? 'new' : 'normal')) === params[Number(condition[1]) - 1]);
  }
  const search = /ILIKE \$(\d+)/.exec(query);
  if (search) {
    assert.match(query, /ESCAPE E'\\\\'/);
    const needle = params[Number(search[1]) - 1].slice(1, -1).replace(/\\([\\%_])/g, '$1').toLowerCase();
    rows = rows.filter(row => Object.values(row).join(' ').toLowerCase().includes(needle));
  }
  const service = /'\[\]'::jsonb\) \? \$(\d+)/.exec(query);
  if (service) {
    const id = params[Number(service[1]) - 1];
    const pattern = params[Number(/~\* \$(\d+)/.exec(query)[1]) - 1];
    rows = rows.filter(row => (row.services || []).includes(id) ||
      (row.project_brief == null && !(row.services || []).length && new RegExp(pattern, 'i').test((row.message || '').replace(/\r/g, '').split('\nProject brief:\n')[0])));
  }
  if (query.includes("IN ('new', 'contacted', 'qualified')")) rows = rows.filter(active);
  if (query.includes('follow_up_at < now()')) rows = rows.filter(row => row.follow_up_at && Date.parse(row.follow_up_at) < now);
  if (query.includes('follow_up_at >= now()')) rows = rows.filter(row => row.follow_up_at && Date.parse(row.follow_up_at) >= now && Date.parse(row.follow_up_at) <= now + 86400000);
  if (query.includes("follow_up_at > now() + interval '24 hours'")) rows = rows.filter(row => row.follow_up_at && Date.parse(row.follow_up_at) > now + 86400000);
  if (query.startsWith('SELECT count(*)')) return [{ total: rows.length }];
  assert.match(query, /ORDER BY .* LIMIT \$\d+ OFFSET \$\d+/);
  const limit = params.at(-2), offset = params.at(-1);
  assert.equal(typeof limit, 'number'); assert.equal(typeof offset, 'number');
  if (query.includes('ORDER BY follow_up_at')) rows.sort((a, b) => (a.follow_up_at ? Date.parse(a.follow_up_at) : Infinity) - (b.follow_up_at ? Date.parse(b.follow_up_at) : Infinity));
  else rows.sort((a, b) => query.includes('created_at ASC') ? a.id - b.id : b.id - a.id);
  return rows.slice(offset, offset + limit).map(row => ({ ...row }));
};
const silentLogger = { error() {} };
const handler = createLeadsHandler({ getSql: () => fixtureSql, isDbConfigured: () => true, isAuthenticated: req => req.authorized === true, logger: silentLogger });
const publicRequest = async (body, customHandler = handler, options = {}) => {
  const res = response();
  await customHandler({ method: 'POST', headers: {}, body, ...options }, res);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  return res;
};
const admin = async (action, id = null, data = {}) => {
  const res = response();
  await handleLeads(fixtureSql, action, id, data, res);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  return res;
};

const submission = { name: '  Ada Business  ', email: 'ada@example.com', company: 'Growth Studio',
  message: 'Improve qualified enquiries. Keep my original project brief.', services: ['technical-seo', 'conversion'],
  website: 'example.com/path', market: 'UK and India', budget: '10,000 to 15,000', currency: 'gbp',
  timeline: 'In 1 to 3 months', timezone: 'London, UK', source_path: '/contact' };
const saved = await publicRequest(submission);
assert.equal(saved.code, 200); assert.deepEqual(saved.body, { ok: true, stored: true });
const persisted = stored.get(1);
assert.equal(persisted.name, 'Ada Business'); assert.equal(persisted.message, submission.message);
assert.equal(persisted.project_brief, submission.message);
assert.deepEqual(persisted.services, submission.services); assert.equal(persisted.website, 'https://example.com/path');
for (const field of ['market', 'budget', 'timeline', 'timezone', 'source_path']) assert.equal(persisted[field], submission[field]);
assert.equal(persisted.currency, 'GBP');

const legacyMessage = 'Services: Local SEO, Content strategy\nWebsite: old.example.com\nTarget market: France\nTotal project budget: EUR 5000\nPreferred start: Flexible\nLocation / time zone: Paris\n\nProject brief:\nBring more local customers.\nServices: This line belongs to my brief.';
const legacy = await publicRequest({ name: 'Old client', email: 'old@example.com', message: legacyMessage });
assert.equal(legacy.code, 200); assert.equal(stored.get(2).message, legacyMessage);
assert.deepEqual(stored.get(2).services, ['local-seo', 'content-strategy']);
assert.equal(stored.get(2).currency, 'EUR'); assert.equal(stored.get(2).budget, '5000');
stored.set(3, { id: 3, name: 'Historical contact', email: 'history@example.com', message: legacyMessage, status: 'contacted', created_at: new Date(now - 10000).toISOString() });
nextId = 4;
const normalized = normalizeLead(stored.get(3));
assert.equal(normalized.message, legacyMessage);
assert.equal(normalized.project_brief, 'Bring more local customers.\nServices: This line belongs to my brief.');
assert.deepEqual(normalized.services, ['local-seo', 'content-strategy']);
assert.equal(normalized.updated_at, null, 'Historical last-update times are unknown until a real edit');
assert.deepEqual(parseLegacyLeadMessage('My introduction\nProject brief:\nordinary prose'), { project_brief: 'My introduction\nProject brief:\nordinary prose' });
for (const message of ['Project brief:\nThis label is intentional.', 'Services: Local SEO\n\nProject brief:\nThese labels are part of my message.']) {
  const brief = validateLeadSubmission({ ...submission, message, services: [] });
  const item = normalizeLead({ ...brief, id: 100 });
  assert.equal(item.message, message); assert.equal(item.project_brief, message);
  assert.deepEqual(item.services, [], 'A new plain brief must not be reinterpreted as legacy metadata');
  stored.set(100, { ...brief, id: 100, status: 'new', created_at: new Date(now).toISOString() });
  const filtered = await admin('list', null, { service: 'local-seo' });
  assert.ok(!filtered.body.items.some(item => item.id === 100), 'Legacy service filters must not reinterpret new plain briefs');
  stored.delete(100);
}
assert.equal(validateLeadSubmission({ name: 'Legacy', email: 'legacy@example.com', message: 'Project brief:\nHistorical envelope.' }).project_brief, 'Historical envelope.');

const invalidSubmissions = [
  { name: '' }, { email: 'broken' }, { name: { object: true } }, { message: ' '.repeat(10) },
  { message: 'a'.repeat(6001) }, { company: 'a'.repeat(201) }, { services: ['unknown'] }, { services: 'technical-seo' },
  { website: 'javascript:alert(1)' }, { website: 'https://user:password@example.com' }, { website: '//example.com' },
  { website: '/contact' }, { website: 'https://example.com\\private' },
  { budget: {} }, { currency: 'USD dollars' }, { source_path: 'https://external.example/contact' }, { source_path: '/contact\nfoo' },
];
for (const invalid of invalidSubmissions) {
  const before = queries.length;
  assert.equal((await publicRequest({ ...submission, ...invalid })).code, 400);
  assert.equal(queries.length, before, 'Invalid requests must not access storage');
}
assert.throws(() => validateLeadSubmission([]), /contact form/);

const followUp = new Date(now - 3600000).toISOString();
const triaged = await admin('update', 1, { status: 'qualified', priority: 'high', notes: 'Reply with an audit scope.', follow_up_at: followUp });
assert.equal(triaged.code, 200); assert.equal(triaged.body.item.status, 'qualified');
assert.equal(triaged.body.item.notes, 'Reply with an audit scope.'); assert.equal(triaged.body.item.follow_up_at, followUp);
const legacyUpdate = await admin('update', 1, { status: 'contacted' });
assert.equal(legacyUpdate.body.item.priority, 'high'); assert.equal(legacyUpdate.body.item.notes, 'Reply with an audit scope.');
assert.equal(legacyUpdate.body.item.message, submission.message);

const list = await admin('list', null, { page_size: 1, page: 2, sort: 'oldest' });
assert.equal(list.code, 200); assert.equal(list.body.total, 3); assert.equal(list.body.page, 2);
assert.equal(list.body.items.length, 1); assert.equal(list.body.items[0].id, 2);
assert.deepEqual(list.body.stats, { total: 3, new: 1, active: 3, overdue: 1 });
assert.equal(list.body.storage, 'database');
assert.equal((await admin('list', null, { status: 'contacted', priority: 'high' })).body.total, 1);
assert.equal((await admin('list', null, { service: 'local-seo' })).body.total, 2, 'Service filtering must include old rows');
assert.equal((await admin('list', null, { service: 'technical-seo' })).body.total, 1, 'Local SEO must not match generic SEO aliases');
const search = await admin('list', null, { q: 'France' });
assert.equal(search.body.total, 2); assert.equal(search.body.stats.total, 3, 'Filters must not change global stats');
assert.equal((await admin('list', null, { follow_up: 'overdue' })).body.items[0].id, 1);
assert.equal((await admin('list', null, { page: 999 })).body.page, 1, 'Out-of-range page must clamp to the last page');
const literal = "x%_\\' OR 1=1";
assert.equal((await admin('list', null, { q: literal })).body.total, 0);
assert.ok(queries.filter(item => item.params.some(value => typeof value === 'string' && value.includes('OR 1=1'))).every(item => !item.query.includes('OR 1=1')), 'Search text must only enter SQL as a parameter');

await admin('update', 2, { follow_up_at: new Date(now + 3600000).toISOString() });
await admin('update', 3, { follow_up_at: new Date(now + 172800000).toISOString() });
assert.equal((await admin('list', null, { follow_up: 'due' })).body.items[0].id, 2);
assert.equal((await admin('list', null, { follow_up: 'upcoming' })).body.items[0].id, 3);
assert.deepEqual((await admin('list', null, { sort: 'follow_up' })).body.items.map(item => item.id), [1, 2, 3]);
await admin('update', 1, { follow_up_at: null });
assert.equal((await admin('list', null, { sort: 'follow_up' })).body.items.at(-1).id, 1);
await admin('update', 3, { status: 'spam' });
assert.equal((await admin('list', null, { follow_up: 'upcoming' })).body.total, 0, 'Closed/spam leads do not require follow-up');
assert.equal((await admin('list')).body.stats.active, 2);
assert.equal((await admin('list', null, { status: 'active' })).body.total, 2);
assert.equal((await admin('update', 1, { status: 'active' })).code, 400, 'Active is a list filter, not a saved status');

for (const invalid of [{ status: 'unknown' }, { priority: 'urgent' }, { notes: 'x'.repeat(10001) },
  { follow_up_at: '2026-10-10T11:00' }, { follow_up_at: '2026-02-30T11:00:00Z' }, { name: 'Cannot overwrite contact' }]) {
  const before = queries.length;
  assert.equal((await admin('update', 1, invalid)).code, 400);
  assert.equal(queries.length, before);
}
assert.equal(validateLeadUpdate({ follow_up_at: '2026-10-10T11:00:00+05:30' }).follow_up_at, '2026-10-10T05:30:00.000Z');
for (const invalid of [{ status: 'unknown' }, { page_size: 101 }, { page: -1 }, { service: 'unknown' }, { sort: 'random' }]) {
  assert.equal((await admin('list', null, invalid)).code, 400);
}
assert.equal((await admin('update', 99, { status: 'closed' })).code, 404);
assert.equal((await admin('delete', 99)).code, 404);
assert.equal((await admin('delete', '1 OR 1=1')).code, 400);
assert.equal((await admin('delete', null)).code, 400);
assert.equal((await admin('delete', 3)).code, 200); assert.ok(!stored.has(3));
assert.equal((await admin('delete', 3)).code, 404);

const noDatabase = createLeadsHandler({ isDbConfigured: () => false, isAuthenticated: () => true });
assert.equal((await publicRequest(submission, noDatabase)).code, 503);
assert.equal((await publicRequest(null, noDatabase, { method: 'GET', query: {} })).code, 503);
assert.equal((await publicRequest(null, handler, { method: 'GET', query: {} })).code, 401);
const authenticatedRead = await publicRequest(null, handler, { method: 'GET', authorized: true, query: { page_size: 1 } });
assert.equal(authenticatedRead.code, 200); assert.equal(authenticatedRead.body.leads.length, 1);
assert.equal((await publicRequest(null, handler, { method: 'PATCH' })).code, 405);
const failedInsert = createLeadsHandler({ isDbConfigured: () => true, getSql: () => async () => [], migrate: async () => {}, logger: silentLogger });
const failed = await publicRequest(submission, failedInsert);
assert.equal(failed.code, 500); assert.ok(!failed.body.ok && !failed.body.stored, 'Unconfirmed inserts must not report success');
let migrationCalls = 0;
const retrySql = async () => { migrationCalls++; if (migrationCalls === 1) throw new Error('Temporary database failure'); return []; };
await assert.rejects(ensureLeadsSchema(retrySql), /Temporary/);
await ensureLeadsSchema(retrySql);
assert.equal(migrationCalls, LEAD_SCHEMA_SQL.length + 1, 'Failed migrations must retry');
await ensureLeadsSchema(retrySql);
assert.equal(migrationCalls, LEAD_SCHEMA_SQL.length + 1, 'Warm instances must reuse successful migrations');
const schemaQueries = queries.filter(item => /^(CREATE|ALTER)/.test(item.query));
assert.equal(schemaQueries.length, LEAD_SCHEMA_SQL.length, 'The public and admin paths share one schema cache');

// Verify actual route authorization and missing-DB behavior without a client.
const previousSecret = process.env.AUTH_SECRET, previousDatabase = process.env.DATABASE_URL;
try {
  process.env.AUTH_SECRET = 'isolated-contact-lead-test-secret';
  delete process.env.DATABASE_URL;
  for (const cookie of ['', 'fd_admin_session=%broken']) {
    const res = response();
    await adminHandler({ method: 'POST', headers: { cookie }, body: { resource: 'leads', action: 'list' } }, res);
    assert.equal(res.code, 401); assert.equal(res.headers['Cache-Control'], 'no-store');
  }
  const cookie = createSessionCookie({ headers: {} }).split(';')[0];
  const res = response();
  await adminHandler({ method: 'POST', headers: { cookie }, body: { resource: 'leads', action: 'list' } }, res);
  assert.equal(res.code, 503);
} finally {
  if (previousSecret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previousSecret;
  if (previousDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousDatabase;
}

assert.equal(safeLeadWebsite('example.com/path'), 'https://example.com/path');
assert.equal(safeLeadWebsite('  https://example.com/path  '), 'https://example.com/path');
for (const unsafe of ['javascript:alert(1)', 'data:text/html,abc', 'mailto:test@example.com', 'blob:https://example.com/object',
  '//example.com', '/contact', 'https://user:password@example.com', 'https://example.com\\private', 'https://exa mple.com', 'https://example.com\0private']) {
  assert.equal(safeLeadWebsite(unsafe), '', 'Unsafe or relative website links must not be clickable');
}
assert.equal(safeLeadWebsite({}), '');
const csvCells = csv => [...csv.matchAll(/"((?:[^"]|"")*)"/g)].map(match => match[1].replace(/""/g, '"'));
const csvColumns = csvCells(leadCsv([]));
assert.equal(csvColumns.length, 19);
assert.ok(leadCsv([]).startsWith('\uFEFF'), 'CSV must retain international text encoding');
for (const input of ['=HYPERLINK("https://example.com")', '+SUM(1,1)', '-2+3', '@SUM(1,1)', ' \t=1+1', '\0=1+1', '\uFEFF  =1+1', '\n=1+1']) {
  const cells = csvCells(leadCsv([{ name: input }]));
  assert.equal(cells[csvColumns.length + csvColumns.indexOf('name')], `'${input}`, 'CSV formulas must be neutralized even behind leading controls');
}
const originalBrief = 'A "quoted" brief, with commas.\nKeep the second line. Привет.';
const csvRoundTrip = csvCells(leadCsv([{ id: 1, name: 'Plain name', services: ['local-seo', 'conversion'], project_brief: originalBrief, message: 'Other value' }]));
assert.equal(csvRoundTrip[csvColumns.length + csvColumns.indexOf('project_brief')], originalBrief);
assert.equal(csvRoundTrip[csvColumns.length + csvColumns.indexOf('services')], 'Local SEO; Lead generation & CRO');
assert.equal(csvRoundTrip[csvColumns.length + csvColumns.indexOf('name')], 'Plain name');
assert.equal(csvCells(leadCsv([{ message: 'Historical brief' }]))[csvColumns.length + csvColumns.indexOf('project_brief')], 'Historical brief');

console.log('PASS: contact persistence, structured and legacy lead fields, safe validation, authenticated no-store routes, triage, follow-up, filters, pagination, SQL bindings, real 404s, retry-safe schema migration and safe website/CSV utilities.');
