import { getSql, isDbConfigured } from "../lib/db.js";
import { isAuthenticated } from "../lib/auth.js";
import { ensureLeadsSchema } from '../lib/lead-migration.js';
import { LeadError, insertLead, listLeads, validateLeadList, validateLeadSubmission } from '../lib/leads.js';

export function createLeadsHandler(dependencies = {}) {
  const configured = dependencies.isDbConfigured || isDbConfigured;
  const client = dependencies.getSql || getSql;
  const authenticated = dependencies.isAuthenticated || isAuthenticated;
  const migrate = dependencies.migrate || ensureLeadsSchema;
  const logger = dependencies.logger || console;
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!['POST', 'GET'].includes(req.method)) {
      res.setHeader('Allow', 'POST, GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'GET') {
      let authorized = false;
      try { authorized = authenticated(req); } catch { /* Invalid cookies are unauthenticated. */ }
      if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      // Validate before acquiring the client. Never silently truncate a brief.
      const validated = req.method === 'POST' ? validateLeadSubmission(req.body) : validateLeadList(req.query || {});
      if (!configured()) return res.status(503).json({ error: req.method === 'POST'
        ? 'Could not save your message right now. Please email fenil.seo@gmail.com directly.'
        : 'Database not connected. Contact leads are unavailable.' });
      const sql = client();
      await migrate(sql);
      if (req.method === 'POST') {
        await insertLead(sql, validated);
        return res.status(200).json({ ok: true, stored: true });
      }
      const result = await listLeads(sql, validated);
      return res.status(200).json({ ...result, leads: result.items });
    } catch (err) {
      if (err instanceof LeadError) return res.status(err.status).json({ error: err.message });
      logger.error('Contact lead storage failed', { operation: req.method, code: err.code || 'storage_error' });
      return res.status(500).json({ error: req.method === 'POST'
        ? 'Could not save your message right now. Please email fenil.seo@gmail.com directly.'
        : 'Could not load contact leads. Please try again.' });
    }
  };
}

export default createLeadsHandler();
