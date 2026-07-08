import { getSql, isDbConfigured } from "../lib/db.js";
import { isAuthenticated } from "../lib/auth.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, company, message } = req.body || {};
    if (!name || !email || !message || !isValidEmail(email)) {
      return res.status(400).json({ error: "Please fill in your name, a valid email, and a message." });
    }

    if (!isDbConfigured()) {
      console.error("Lead dropped - DATABASE_URL not set:", { name, email });
      return res.status(503).json({ error: "Could not save your message right now. Please email fenil.seo@gmail.com directly." });
    }

    try {
      const sql = getSql();
      await sql(
        `INSERT INTO leads (name, email, company, message) VALUES ($1, $2, $3, $4)`,
        [String(name).slice(0, 200), String(email).slice(0, 200), String(company || "").slice(0, 200), String(message).slice(0, 4000)]
      );
      return res.status(200).json({ ok: true, stored: true });
    } catch (err) {
      console.error("lead insert error", err);
      return res.status(500).json({ error: "Could not save your message right now. Please email fenil.seo@gmail.com directly." });
    }
  }

  if (req.method === "GET") {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Unauthorized" });
    if (!isDbConfigured()) return res.status(200).json({ leads: [] });
    try {
      const sql = getSql();
      const rows = await sql(`SELECT id, name, email, company, message, status, created_at FROM leads ORDER BY created_at DESC LIMIT 300`);
      return res.status(200).json({ leads: rows });
    } catch (err) {
      console.error("leads list error", err);
      return res.status(500).json({ error: "Could not load leads." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
