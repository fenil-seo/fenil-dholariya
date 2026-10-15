import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createLeadsHandler } from '../api/leads.js';
import { notificationSettings, sendLeadNotification } from '../lib/lead-notifications.js';

// Every mail transport and SQL client below is injected. This script never
// reads a credential file, opens an SMTP socket, or connects to a database.
const recipient = 'fenil.seo@gmail.com';
const secret = 'abcdefghijklmnop';
const env = { GMAIL_APP_PASSWORD: secret };
const checks = [];
async function check(name, run) {
  await run(); checks.push(name);
}
const lead = {
  id: 417, name: 'Maya Business', email: 'maya@example.test', company: 'Example Growth Studio',
  message: 'Keep this original brief intact.\nSecond line: <b>qualified demand</b> & careful measurement.\nUnicode: ₹ • 日本語.',
  project_brief: 'Keep this original brief intact.\nSecond line: <b>qualified demand</b> & careful measurement.\nUnicode: ₹ • 日本語.',
  services: ['technical-seo', 'ai-workflows'], website: 'https://example.test/growth', market: 'India and United Kingdom',
  budget: '1,000,000 to 1,500,000', currency: 'INR', timeline: 'In 1 to 3 months', timezone: 'London / Europe',
  source_path: '/contact?interest=technical-seo', created_at: '2026-10-15T06:30:00.000Z', notes: 'PRIVATE_ADMIN_NOTES_MUST_NOT_BE_EMAILED',
};
const string = value => JSON.stringify(value);
const address = value => typeof value === 'object' && value ? value.address : String(value || '').match(/<?([^\s<>]+@[^\s<>]+)>?$/)?.[1];
const sent = { status: 'sent', error_code: null, message_id: '<fixture-message@example.test>' };
function mailFixture({ result = { accepted: [recipient], messageId: sent.message_id }, error = null } = {}) {
  const fixture = { options: null, mail: null, calls: 0, closes: 0 };
  fixture.createTransport = options => {
    fixture.options = options;
    return { async sendMail(mail) { fixture.calls++; fixture.mail = mail; if (error) throw error; return result; }, close() { fixture.closes++; } };
  };
  return fixture;
}
function safeResult(result) {
  assert.ok(result && typeof result === 'object');
  assert.ok(!string(result).includes(secret), 'Results never expose the Gmail app password.');
  assert.ok(!string(result).includes('SENSITIVE_PROVIDER_ERROR'), 'Results never expose raw provider errors.');
}

await check('configuration exposes only fixed recipient and safe readiness metadata', async () => {
  const empty = notificationSettings({});
  assert.equal(empty.configured, false); assert.equal(empty.enabled, false); assert.equal(empty.recipient, recipient);
  assert.deepEqual(empty.missing, ['GMAIL_APP_PASSWORD']);
  const ready = notificationSettings({ ...env, LEAD_NOTIFICATION_TO: 'outsider@example.test', GMAIL_USER: 'outsider@example.test' });
  assert.equal(ready.configured, true); assert.equal(ready.enabled, true); assert.equal(ready.recipient, recipient); assert.deepEqual(ready.missing, []);
  for (const settings of [empty, ready]) assert.ok(!string(settings).includes(secret), 'Settings must never return an app password.');
  for (const disabled of ['false', ' FALSE ', false]) {
    const settings = notificationSettings({ ...env, LEAD_EMAIL_NOTIFICATIONS_ENABLED: disabled });
    assert.equal(settings.configured, true); assert.equal(settings.enabled, false);
  }
});
await check('missing or disabled delivery never constructs an SMTP transport', async () => {
  const createTransport = () => { throw new Error('A disabled notification must not construct a transport.'); };
  const missing = await sendLeadNotification(lead, { env: {}, createTransport });
  assert.equal(missing.status, 'not_configured'); assert.equal(missing.error_code, 'gmail_app_password_missing'); safeResult(missing);
  const disabled = await sendLeadNotification(lead, { env: { ...env, LEAD_EMAIL_NOTIFICATIONS_ENABLED: 'false' }, createTransport });
  assert.equal(disabled.status, 'disabled'); assert.equal(disabled.error_code, 'notifications_disabled'); safeResult(disabled);
});
await check('Gmail transport is fixed, encrypted, bounded, and never delivers to a visitor', async () => {
  const fixture = mailFixture();
  const result = await sendLeadNotification({ ...lead, to: 'outsider@example.test', recipient: 'outsider@example.test' }, { env, createTransport: fixture.createTransport });
  assert.equal(result.status, 'sent'); assert.equal(result.error_code, null); safeResult(result);
  assert.equal(fixture.calls, 1); assert.equal(fixture.options.host, 'smtp.gmail.com'); assert.equal(fixture.options.port, 465); assert.equal(fixture.options.secure, true);
  assert.equal(fixture.options.auth.user, recipient); assert.equal(fixture.options.auth.pass, secret);
  assert.equal(fixture.options.tls.rejectUnauthorized, true); assert.equal(fixture.options.tls.minVersion, 'TLSv1.2');
  for (const field of ['connectionTimeout', 'greetingTimeout', 'socketTimeout', 'dnsTimeout']) assert.ok(fixture.options[field] > 0 && fixture.options[field] <= 6500);
  assert.equal(address(fixture.mail.from), recipient); assert.equal(address(fixture.mail.to), recipient);
  assert.deepEqual(fixture.mail.envelope, { from: recipient, to: [recipient] });
  assert.equal(address(fixture.mail.replyTo), lead.email); assert.ok(!fixture.mail.cc); assert.ok(!fixture.mail.bcc);
  assert.ok(fixture.closes >= 1, 'The SMTP transport is closed after delivery.');
});
await check('the alert contains the full original request and planning fields without private notes', async () => {
  const fixture = mailFixture(); await sendLeadNotification(lead, { env, createTransport: fixture.createTransport });
  assert.equal(typeof fixture.mail.text, 'string'); assert.ok(fixture.mail.text.includes(lead.project_brief));
  for (const field of ['name', 'email', 'company', 'website', 'market', 'budget', 'currency', 'timeline', 'timezone', 'source_path']) assert.ok(fixture.mail.text.includes(lead[field]), `Email includes ${field}.`);
  assert.match(fixture.mail.text, /SEO/); assert.match(fixture.mail.text, /AI workflows/);
  assert.ok(!fixture.mail.text.includes(lead.notes)); assert.ok(!fixture.mail.text.includes(secret));
});
await check('hostile header and HTML content cannot add recipients or executable markup', async () => {
  const fixture = mailFixture();
  const hostile = { ...lead, name: 'Name\r\nBcc: outsider@example.test', company: '<img src=x onerror="alert(1)">', email: 'visitor@example.test\r\nBcc: outsider@example.test', message: '<script>alert(1)</script>\nKeep the complete untrusted brief.', project_brief: '<script>alert(1)</script>\nKeep the complete untrusted brief.' };
  const result = await sendLeadNotification(hostile, { env, createTransport: fixture.createTransport }); safeResult(result);
  if (fixture.mail) {
    assert.equal(address(fixture.mail.from), recipient); assert.equal(address(fixture.mail.to), recipient);
    for (const field of ['subject', 'replyTo', 'from', 'to']) {
      const header = typeof fixture.mail[field] === 'string' ? fixture.mail[field] : Object.values(fixture.mail[field] || {}).join('');
      assert.ok(!/[\r\n]/.test(header), `${field} must not contain a raw header break.`);
    }
    assert.ok(!fixture.mail.cc && !fixture.mail.bcc);
    if (fixture.mail.html) { assert.ok(!/<script|<img|onerror=/i.test(fixture.mail.html)); }
    else assert.ok(fixture.mail.text.includes(hostile.project_brief), 'Plain text preserves the brief without interpreting HTML.');
  } else assert.equal(result.status, 'failed', 'Invalid hostile addresses may be rejected safely.');
});
await check('SMTP authentication and runtime errors return safe failure codes', async () => {
  for (const [code, expected] of [['EAUTH', 'smtp_auth_failed'], ['ECONNECTION', 'smtp_unavailable']]) {
    const error = Object.assign(new Error(`SENSITIVE_PROVIDER_ERROR ${secret}`), { code }); const fixture = mailFixture({ error });
    const result = await sendLeadNotification(lead, { env, createTransport: fixture.createTransport });
    assert.equal(result.status, 'failed'); assert.equal(result.error_code, expected); safeResult(result); assert.ok(fixture.closes >= 1);
  }
  const result = await sendLeadNotification(lead, { env, createTransport() { throw new Error(`SENSITIVE_PROVIDER_ERROR ${secret}`); } });
  assert.equal(result.status, 'failed'); safeResult(result);
});
await check('missing acknowledgments and rejected recipient lists cannot report a sent alert', async () => {
  for (const result of [{}, { accepted: [], messageId: 'unconfirmed-id' }, { accepted: ['outsider@example.test'], messageId: 'wrong-recipient-id' }]) {
    const fixture = mailFixture({ result }); const notification = await sendLeadNotification(lead, { env, createTransport: fixture.createTransport });
    assert.equal(notification.status, 'failed'); assert.equal(notification.error_code, 'smtp_rejected'); safeResult(notification);
  }
  const fixture = mailFixture({ result: { accepted: [recipient], messageId: `SENSITIVE_PROVIDER_ERROR ${secret}` } });
  const notification = await sendLeadNotification(lead, { env, createTransport: fixture.createTransport });
  assert.equal(notification.status, 'sent'); safeResult(notification); assert.match(notification.message_id, /^<lead-[a-f0-9-]+@fenil-dholariya\.vercel\.app>$/);
});
await check('a stalled SMTP send reaches a hard deadline and closes its transport', async () => {
  let closes = 0;
  const started = performance.now();
  const result = await sendLeadNotification(lead, { env, timeoutMs: 10, createTransport() { return { sendMail: () => new Promise(() => {}), close() { closes++; } }; } });
  assert.equal(result.status, 'failed'); assert.equal(result.error_code, 'smtp_timeout'); safeResult(result);
  assert.ok(performance.now() - started < 1500, 'The fixture deadline prevents an unbounded send.'); assert.ok(closes >= 1);
});
await check('late SMTP rejection after timeout is contained', async () => {
  const unhandled = [];
  const onUnhandled = reason => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    const result = await sendLeadNotification(lead, { env, timeoutMs: 2, createTransport() { return { sendMail: () => new Promise((_, reject) => setTimeout(() => reject(new Error('SENSITIVE_PROVIDER_ERROR late rejection')), 20)), close() {} }; } });
    assert.equal(result.error_code, 'smtp_timeout');
    await new Promise(resolve => setTimeout(resolve, 35)); assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', onUnhandled); }
});
await check('the hard deadline destroys the owned TLS connection as well as closing SMTP', async () => {
  const socket = new EventEmitter(); let destroyed = 0, closed = 0, tlsOptions;
  socket.destroy = () => { destroyed++; socket.emit('close'); }; socket.setTimeout = () => socket;
  const result = await sendLeadNotification(lead, { env, timeoutMs: 10,
    connectTls(options) { tlsOptions = options; queueMicrotask(() => socket.emit('secureConnect')); return socket; },
    createTransport(options) { return {
      sendMail: () => new Promise((_, reject) => options.getSocket({}, (error, connection) => { if (error) reject(error); else { assert.equal(connection.connection, socket); assert.equal(connection.secured, true); } })),
      close() { closed++; },
    }; },
  });
  assert.equal(result.error_code, 'smtp_timeout'); assert.equal(destroyed, 1); assert.equal(closed, 1);
  assert.deepEqual(tlsOptions, { host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com', minVersion: 'TLSv1.2', rejectUnauthorized: true });
});

const response = events => ({
  code: null, body: null, headers: {}, setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; }, json(body) { events.push('response'); this.body = body; return this; },
});
function apiFixture(options = {}) {
  const events = [], logs = [], notifications = [], records = [], inserted = {};
  const sql = async (query, params) => {
    assert.match(query, /^INSERT INTO leads/); events.push('insert');
    const fields = /INSERT INTO leads \(([^)]+)\)/.exec(query)[1].split(', ');
    inserted.attempt = params[fields.indexOf('email_notification_attempted_at')];
    if (options.insertError) throw new Error('SENSITIVE_PROVIDER_ERROR database insertion failed');
    if (options.insertResult) return options.insertResult;
    if (options.insertBarrier) await options.insertBarrier;
    events.push('confirmed'); return [{ id: 417 }];
  };
  const handler = createLeadsHandler({
    isDbConfigured: () => options.configured !== false, getSql: () => sql, migrate: async () => { events.push('migration'); if (options.migrationError) throw new Error('Fixture migration failed'); },
    notify: async item => { events.push('notify'); notifications.push(item); if (options.notifyError) throw new Error(`SENSITIVE_PROVIDER_ERROR ${secret}`); return options.notificationResult || sent; },
    recordNotification: async (client, id, result, expectedAttempt) => { events.push('record'); assert.equal(client, sql); records.push({ id, result, expectedAttempt }); if (options.recordError) throw new Error(`SENSITIVE_PROVIDER_ERROR ${secret}`); if (options.recordNever) return new Promise(() => {}); },
    recordTimeoutMs: options.recordTimeoutMs,
    logger: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
  });
  return { events, logs, notifications, records, inserted, handler, res: response(events) };
}
const request = fixture => fixture.handler({ method: 'POST', headers: {}, body: lead }, fixture.res);
function storedReceipt(fixture) {
  assert.equal(fixture.res.code, 200); assert.deepEqual(fixture.res.body, { ok: true, stored: true });
  assert.ok(!string(fixture.res.body).includes(secret)); assert.equal(fixture.res.headers['Cache-Control'], 'no-store');
}
await check('the public API confirms database storage before attempting an alert', async () => {
  let release;
  const insertBarrier = new Promise(resolve => { release = resolve; });
  const fixture = apiFixture({ insertBarrier }); const pending = request(fixture);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.events, ['migration', 'insert']); assert.equal(fixture.notifications.length, 0); assert.equal(fixture.res.body, null);
  release(); await pending; storedReceipt(fixture);
  assert.deepEqual(fixture.events, ['migration', 'insert', 'confirmed', 'notify', 'record', 'response']);
  assert.equal(fixture.notifications[0].id, 417); assert.equal(fixture.notifications[0].message, lead.message);
  assert.equal(fixture.records[0].id, 417); assert.equal(fixture.records[0].result.status, 'sent');
  assert.ok(fixture.inserted.attempt); assert.equal(fixture.records[0].expectedAttempt, fixture.inserted.attempt, 'The public record is guarded by the same timestamp atomically inserted with the lead.');
});
await check('failed, disabled and unconfigured alerts preserve confirmed public receipts', async () => {
  for (const status of ['failed', 'disabled', 'not_configured']) {
    const fixture = apiFixture({ notificationResult: { status, error_code: status === 'failed' ? 'smtp_auth_failed' : null } });
    await request(fixture); storedReceipt(fixture); assert.equal(fixture.records[0].result.status, status);
  }
});
await check('unexpected send and notification-status failures never turn a saved request into an error', async () => {
  for (const options of [{ notifyError: true }, { recordError: true }, { notifyError: true, recordError: true }]) {
    const fixture = apiFixture(options); await request(fixture); storedReceipt(fixture);
    assert.ok(fixture.events.indexOf('confirmed') < fixture.events.indexOf('notify'));
    assert.ok(!string(fixture.logs).includes(secret), 'Error logs must not expose SMTP app passwords.');
    assert.ok(!string(fixture.logs).includes('SENSITIVE_PROVIDER_ERROR'), 'Error logs must not echo raw transport errors.');
  }
});
await check('unavailable, failed or unconfirmed storage never attempts email delivery', async () => {
  for (const options of [{ configured: false }, { insertError: true }, { insertResult: [] }, { migrationError: true }]) {
    const fixture = apiFixture(options); await request(fixture);
    assert.ok(fixture.res.code >= 500); assert.notEqual(fixture.res.body?.stored, true);
    assert.equal(fixture.notifications.length, 0); assert.equal(fixture.records.length, 0);
  }
});
await check('a stalled notification-status write cannot hold the confirmed form receipt indefinitely', async () => {
  const fixture = apiFixture({ recordNever: true, recordTimeoutMs: 10 });
  const started = performance.now(); await request(fixture); storedReceipt(fixture);
  assert.ok(performance.now() - started < 1500, 'Notification bookkeeping has its own bounded wait.');
  assert.equal(fixture.notifications.length, 1); assert.equal(fixture.records.length, 1);
});

console.log(`Verified ${checks.length} Gmail alert safety and storage guarantees with injected SMTP and database fixtures.`);
