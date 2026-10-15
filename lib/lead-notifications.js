import { randomUUID } from 'node:crypto';
import { connect as tlsConnect } from 'node:tls';
import { createTransport as nodemailerCreateTransport } from 'nodemailer';
import { LEAD_SERVICES } from './leads.js';

export const LEAD_NOTIFICATION_EMAIL = 'fenil.seo@gmail.com';
export const LEAD_NOTIFICATION_ADMIN_URL = 'https://fenil-dholariya.vercel.app/admin#leads';
const SMTP_HOST = 'smtp.gmail.com';
const DEADLINE_MS = 6500;

function configuration(env) {
  try {
    const value = env?.GMAIL_APP_PASSWORD;
    const password = typeof value === 'string' ? value.replace(/\s/g, '') : '';
    const flag = env?.LEAD_EMAIL_NOTIFICATIONS_ENABLED;
    return {
      password: password && password.length <= 256 && !/[\u0000-\u001f\u007f]/.test(password) ? password : '',
      disabled: flag === false || typeof flag === 'string' && flag.trim().toLowerCase() === 'false',
    };
  } catch { return { password: '', disabled: false }; }
}

export function notificationSettings(env = process.env) {
  const { password, disabled } = configuration(env);
  return {
    configured: Boolean(password), enabled: Boolean(password) && !disabled,
    recipient: LEAD_NOTIFICATION_EMAIL, missing: password ? [] : ['GMAIL_APP_PASSWORD'],
  };
}

// Exported and injectable so verification can exercise the message without SMTP.
export const createTransport = options => nodemailerCreateTransport(options);

function oneLine(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim() : '';
}

function replyAddress(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\u0000-\u0020\u007f<>,;:"()[\]\\]/.test(value)) return '';
  return /^[^@]+@[^@]+\.[^@]+$/.test(value) ? value : '';
}

function notificationMail(lead) {
  if (!lead || typeof lead !== 'object' || Array.isArray(lead)) return null;
  const id = oneLine(lead.id), name = oneLine(lead.name), email = oneLine(lead.email);
  const brief = typeof lead.project_brief === 'string' ? lead.project_brief : lead.message;
  if (!id || !name || typeof brief !== 'string' || !brief.trim()) return null;
  const services = Array.isArray(lead.services) ? lead.services.map(id => LEAD_SERVICES[id]?.[0]).filter(Boolean) : [];
  const fields = [
    ['Lead ID', id], ['Name', name], ['Email', email], ['Company', oneLine(lead.company)],
    ['Services', services.join(', ') || 'General enquiry'], ['Website', oneLine(lead.website)],
    ['Target market', oneLine(lead.market)], ['Budget', [oneLine(lead.currency), oneLine(lead.budget)].filter(Boolean).join(' ')],
    ['Preferred start', oneLine(lead.timeline)], ['Location / time zone', oneLine(lead.timezone)],
    ['Source page', oneLine(lead.source_path) || '/contact'], ['Received', oneLine(lead.created_at)],
  ];
  const replyTo = replyAddress(lead.email);
  return {
    from: LEAD_NOTIFICATION_EMAIL, to: LEAD_NOTIFICATION_EMAIL,
    envelope: { from: LEAD_NOTIFICATION_EMAIL, to: [LEAD_NOTIFICATION_EMAIL] },
    ...(replyTo ? { replyTo } : {}),
    subject: id === 'test' ? 'Test: website contact lead notification' : `New website enquiry #${id.slice(0, 40)}: ${name.slice(0, 120)}`,
    messageId: `<lead-${randomUUID()}@fenil-dholariya.vercel.app>`,
    text: `${id === 'test' ? 'TEST NOTIFICATION. This is not a customer enquiry.\n\n' : 'A contact request has been saved to your website.\n\n'}${fields.map(([label, value]) => `${label}: ${value || 'Not shared'}`).join('\n')}\n\nProject brief:\n${brief}\n\nReview in your private admin panel:\n${LEAD_NOTIFICATION_ADMIN_URL}\n`,
    disableFileAccess: true, disableUrlAccess: true,
  };
}

function failureCode(error) {
  try {
    if (error?.code === 'ETIMEDOUT') return 'smtp_timeout';
    if (['EAUTH', 'ENOAUTH', 'EOAUTH2'].includes(error?.code)) return 'smtp_auth_failed';
    if (error?.code === 'EENVELOPE') return 'smtp_rejected';
  } catch { /* Provider errors are never exposed. */ }
  return 'smtp_unavailable';
}

/** Call only after the lead has been committed. This module never logs secrets,
 * returns provider error text, or throws an error into the contact-form response.
 */
export async function sendLeadNotification(lead, options = {}) {
  let transport, timer, closed = false;
  const sockets = new Set();
  const close = () => {
    if (closed) return;
    closed = true;
    for (const socket of sockets) { try { socket.destroy(); } catch { /* Always continue cleanup. */ } }
    sockets.clear();
    try {
      // Plain SMTP transport's close is a no-op. Destroying our owned TLS
      // socket above also cancels a busy send, unlike closing an SMTP pool.
      const result = transport?.close?.();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch { /* Cleanup must not change the saved lead's outcome. */ }
  };
  try {
    options = options && typeof options === 'object' ? options : {};
    const env = options.env === undefined ? process.env : options.env;
    const { password, disabled } = configuration(env);
    if (disabled) return { status: 'disabled', error_code: 'notifications_disabled' };
    if (!password) return { status: 'not_configured', error_code: 'gmail_app_password_missing' };
    const mail = notificationMail(lead);
    if (!mail) return { status: 'failed', error_code: 'invalid_lead' };
    const factory = options.createTransport || createTransport;
    const connectTls = options.connectTls || tlsConnect;
    const requested = options.timeoutMs;
    const timeoutMs = typeof requested === 'number' && Number.isFinite(requested) ? Math.max(1, Math.min(DEADLINE_MS, requested)) : DEADLINE_MS;
    let expired = false;
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => {
        expired = true;
        close();
        resolve({ status: 'failed', error_code: 'smtp_timeout' });
      }, timeoutMs);
    });
    transport = factory({
      host: SMTP_HOST, port: 465, secure: true,
      auth: { user: LEAD_NOTIFICATION_EMAIL, pass: password },
      tls: { servername: SMTP_HOST, minVersion: 'TLSv1.2', rejectUnauthorized: true },
      connectionTimeout: Math.min(3000, timeoutMs), greetingTimeout: Math.min(2000, timeoutMs),
      socketTimeout: Math.min(3000, timeoutMs), dnsTimeout: Math.min(1500, timeoutMs),
      logger: false, debug: false, transactionLog: false,
      disableFileAccess: true, disableUrlAccess: true,
      getSocket(_smtpOptions, callback) {
        let settled = false, socket;
        const finish = (error, connection) => {
          if (settled) return;
          settled = true;
          if (error) { try { socket?.destroy(); } catch { /* Cleanup only. */ } }
          callback(error, connection);
        };
        if (closed) return finish(Object.assign(new Error('Cancelled'), { code: 'ETIMEDOUT' }));
        try {
          socket = connectTls({ host: SMTP_HOST, port: 465, servername: SMTP_HOST,
            minVersion: 'TLSv1.2', rejectUnauthorized: true });
          sockets.add(socket);
          socket.once('error', error => finish(error));
          socket.once('close', () => {
            sockets.delete(socket);
            finish(Object.assign(new Error('Connection closed'), { code: closed ? 'ETIMEDOUT' : 'ECONNECTION' }));
          });
          socket.setTimeout(Math.min(3000, timeoutMs));
          socket.once('timeout', () => finish(Object.assign(new Error('Connection timed out'), { code: 'ETIMEDOUT' })));
          socket.once('secureConnect', () => {
            if (closed) return finish(Object.assign(new Error('Cancelled'), { code: 'ETIMEDOUT' }));
            finish(null, { connection: socket, secured: true });
          });
        } catch (error) { finish(error); }
      },
    });
    if (!transport || typeof transport.sendMail !== 'function') return { status: 'failed', error_code: 'smtp_unavailable' };
    const sending = Promise.resolve().then(() => transport.sendMail(mail)).then(info => {
      if (expired) return { status: 'failed', error_code: 'smtp_timeout' };
      const acknowledged = Array.isArray(info?.accepted) &&
        info.accepted.some(address => typeof address === 'string' && address.toLowerCase() === LEAD_NOTIFICATION_EMAIL);
      return acknowledged
        ? { status: 'sent', error_code: null, message_id: mail.messageId }
        : { status: 'failed', error_code: 'smtp_rejected' };
    }, error => ({ status: 'failed', error_code: expired ? 'smtp_timeout' : failureCode(error) }));
    return await Promise.race([sending, deadline]);
  } catch { return { status: 'failed', error_code: 'notification_failed' }; }
  finally { clearTimeout(timer); close(); }
}
