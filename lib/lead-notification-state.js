import { LEAD_COLUMNS, LeadError, normalizeLead } from './leads.js';
import { sendLeadNotification } from './lead-notifications.js';

// Persist machine codes only. Provider errors may contain credentials or the
// visitor's details, so raw SMTP errors never enter the database or response.
export function normalizeNotificationResult(result) {
  const status = ['sent', 'failed', 'not_configured', 'disabled'].includes(result?.status) ? result.status : 'failed';
  const error_code = status === 'sent' ? null :
    typeof result?.error_code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(result.error_code) ? result.error_code : 'notification_failed';
  return { status, error_code };
}

export async function attemptLeadNotification(lead, notify = sendLeadNotification) {
  try { return normalizeNotificationResult(await notify(lead)); }
  catch { return { status: 'failed', error_code: 'notification_failed' }; }
}

export async function recordLeadNotification(sql, id, result, expectedAttempt = null) {
  const notification = normalizeNotificationResult(result);
  const rows = await sql(`UPDATE leads SET email_notification_status=$2,
    email_notification_sent_at=CASE WHEN $2='sent' THEN now() ELSE email_notification_sent_at END,
    email_notification_attempted_at=COALESCE(email_notification_attempted_at, now()),
    email_notification_error=$3
    WHERE id=$1 AND email_notification_status='pending'
      AND ($4::timestamptz IS NULL OR email_notification_attempted_at=$4::timestamptz)
    RETURNING ${LEAD_COLUMNS}`, [id, notification.status, notification.error_code || '', expectedAttempt]);
  return rows[0] ? normalizeLead(rows[0]) : null;
}

export async function persistLeadNotification(sql, id, result, dependencies = {}) {
  const record = dependencies.recordNotification || recordLeadNotification;
  const milliseconds = Math.min(1500, Math.max(1, Number(dependencies.timeoutMs) || 1500));
  let timer;
  try {
    // The query may continue after this deadline. Promise.race observes its
    // rejection even then, while a slow secondary write cannot hold up a form.
    const pending = Promise.resolve().then(() => dependencies.expectedAttempt == null
      ? record(sql, id, result)
      : record(sql, id, result, dependencies.expectedAttempt));
    return await Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(null), milliseconds); })]);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function deliverLeadNotification(sql, id, dependencies = {}) {
  // Claim the attempt in one statement. This prevents concurrent browser tabs
  // from emailing twice and allows recovery if an earlier process terminated.
  // Neon parses timestamps into Date objects, so keep the claim at millisecond
  // precision for the comparison made when recording this exact attempt.
  const rows = await sql(`UPDATE leads SET email_notification_status='pending',
    email_notification_attempted_at=date_trunc('milliseconds', now()), email_notification_error=''
    WHERE id=$1 AND (
      COALESCE(email_notification_status, 'not_sent') IN ('not_sent', 'failed', 'not_configured', 'disabled')
      OR (email_notification_status='pending' AND
        (email_notification_attempted_at IS NULL OR email_notification_attempted_at < now() - interval '2 minutes'))
      OR ($2::boolean AND email_notification_status='sent')
    ) RETURNING ${LEAD_COLUMNS}`, [id, dependencies.confirmResend === true]);
  if (!rows[0]) {
    const existing = await sql('SELECT id, email_notification_status FROM leads WHERE id=$1', [id]);
    if (!existing[0]) throw new LeadError('This lead no longer exists. Reload the inbox.', 404);
    if (existing[0].email_notification_status === 'sent') {
      throw new LeadError('This notification was already sent. Confirm before sending another copy.', 409);
    }
    throw new LeadError('A notification is already being attempted. Wait two minutes before trying again.', 409);
  }
  const claimed = normalizeLead(rows[0]);
  const notification = await attemptLeadNotification(claimed, dependencies.notify);
  const item = await persistLeadNotification(sql, id, notification, {
    recordNotification: dependencies.recordNotification,
    expectedAttempt: claimed.email_notification_attempted_at,
    timeoutMs: dependencies.recordTimeoutMs,
  });
  if (item) return { item, notification };
  return { item: claimed, notification: { ...notification, recorded: false } };
}
