import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { sendLeadNotification, LEAD_NOTIFICATION_EMAIL } from '../lib/lead-notifications.js';

// No DNS, network socket or email provider is used. Exercise the real getSocket
// hook, rather than a transport mock which never asks for the TLS connection.
const env = { GMAIL_APP_PASSWORD: 'test only app password' };
const lead = { id: 42, name: 'Website visitor', email: 'visitor@example.com', project_brief: 'A saved project brief.', services: ['local-seo'] };
const nativeSetTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;
const activeTimers = new Set();
globalThis.setTimeout = (callback, milliseconds, ...args) => {
  const timer = nativeSetTimeout(() => { activeTimers.delete(timer); callback(...args); }, milliseconds);
  activeTimers.add(timer);
  return timer;
};
globalThis.clearTimeout = timer => { activeTimers.delete(timer); return nativeClearTimeout(timer); };

class TlsFixture extends EventEmitter {
  destroyed = false;
  destroy() {
    if (this.destroyed) return this;
    this.destroyed = true;
    queueMicrotask(() => this.emit('close'));
    return this;
  }
  setTimeout(milliseconds) { this.idleTimeout = milliseconds; return this; }
}

async function scenario({ event = 'secureConnect', outcome = 'sent', timeoutMs = 100, throwsOnClose = false } = {}) {
  let socket, smtpOptions, socketOptions, callbackCount = 0, closeCalls = 0;
  const result = await sendLeadNotification(lead, {
    env, timeoutMs,
    connectTls(options) {
      socketOptions = options;
      socket = new TlsFixture();
      if (event === 'secureConnect') queueMicrotask(() => socket.emit('secureConnect'));
      if (event === 'error') queueMicrotask(() => socket.emit('error', Object.assign(new Error('PRIVATE_PROVIDER_DETAIL'), { code: 'ESOCKET' })));
      if (event === 'close') queueMicrotask(() => socket.emit('close'));
      return socket;
    },
    createTransport(options) {
      smtpOptions = options;
      return {
        close() { closeCalls++; if (throwsOnClose) throw new Error('PRIVATE_CLOSE_DETAIL'); },
        sendMail() {
          return new Promise((resolve, reject) => {
            options.getSocket({}, (error, connection) => {
              callbackCount++;
              if (error) return reject(error);
              assert.equal(connection.secured, true);
              assert.equal(connection.connection, socket);
              if (outcome === 'sent') resolve({ accepted: [LEAD_NOTIFICATION_EMAIL], messageId: 'UNTRUSTED_PROVIDER_ID' });
              if (outcome === 'auth') reject(Object.assign(new Error('APP_PASSWORD_AND_PRIVATE_PROVIDER_DETAIL'), { code: 'EAUTH' }));
              if (outcome === 'rejected') resolve({ accepted: [], rejected: [LEAD_NOTIFICATION_EMAIL] });
              if (outcome === 'message_id_only') resolve({ messageId: 'Generated before acceptance' });
              // 'hang' intentionally never settles. The real deadline must
              // destroy the owned socket and resolve a sanitized failure.
            });
          });
        },
      };
    },
  });
  await Promise.resolve();
  assert.equal(socket.destroyed, true, 'The owned TLS socket must be destroyed on every outcome');
  assert.equal(closeCalls, 1, 'Close the SMTP transport exactly once');
  assert.equal(callbackCount, 1, 'The getSocket callback must settle exactly once');
  assert.equal(activeTimers.size, 0, 'No notification deadline may remain after completion');
  assert.equal(socketOptions.host, 'smtp.gmail.com'); assert.equal(socketOptions.port, 465);
  assert.equal(socketOptions.servername, 'smtp.gmail.com'); assert.equal(socketOptions.minVersion, 'TLSv1.2');
  assert.equal(socketOptions.rejectUnauthorized, true);
  assert.equal(smtpOptions.secure, true); assert.equal(smtpOptions.logger, false);
  for (const field of ['connectionTimeout', 'greetingTimeout', 'socketTimeout', 'dnsTimeout']) {
    assert.ok(smtpOptions[field] > 0 && smtpOptions[field] <= Math.min(timeoutMs, 6500));
  }
  assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
  assert.ok(!JSON.stringify(result).includes('APP_PASSWORD'));
  assert.ok(!JSON.stringify(result).includes('UNTRUSTED_PROVIDER_ID'));
  return result;
}

try {
  const success = await scenario();
  assert.equal(success.status, 'sent'); assert.equal(success.error_code, null);
  assert.match(success.message_id, /^<lead-[a-f\d-]+@fenil-dholariya\.vercel\.app>$/);
  assert.deepEqual(await scenario({ outcome: 'auth' }), { status: 'failed', error_code: 'smtp_auth_failed' });
  assert.deepEqual(await scenario({ outcome: 'rejected' }), { status: 'failed', error_code: 'smtp_rejected' });
  assert.deepEqual(await scenario({ outcome: 'message_id_only' }), { status: 'failed', error_code: 'smtp_rejected' });
  assert.equal((await scenario({ event: 'error' })).status, 'failed');
  assert.equal((await scenario({ event: 'close' })).status, 'failed');
  assert.equal((await scenario({ throwsOnClose: true })).status, 'sent', 'Cleanup failure cannot erase an SMTP acknowledgment');
  const started = Date.now();
  assert.deepEqual(await scenario({ event: 'none', timeoutMs: 20 }), { status: 'failed', error_code: 'smtp_timeout' });
  assert.ok(Date.now() - started < 500, 'The handshake deadline must complete promptly');
  assert.deepEqual(await scenario({ outcome: 'hang', timeoutMs: 20 }), { status: 'failed', error_code: 'smtp_timeout' });
  const malformedSettings = new Proxy({}, { get() { throw new Error('PRIVATE_SETTING_DETAIL'); } });
  assert.deepEqual(await sendLeadNotification(lead, { env: malformedSettings }), { status: 'not_configured', error_code: 'gmail_app_password_missing' });
  assert.equal(activeTimers.size, 0);
} finally {
  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
  for (const timer of activeTimers) nativeClearTimeout(timer);
}

console.log('PASS: Gmail TLS hook, verified certificate settings, secure connection handoff, accepted-recipient acknowledgment, socket cancellation, sanitized errors and deadline cleanup without SMTP.');
