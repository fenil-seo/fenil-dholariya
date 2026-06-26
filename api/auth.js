import { createSessionCookie, clearSessionCookie, isAuthenticated } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (req.query.action === "check") {
      return res.status(200).json({ authenticated: isAuthenticated(req) });
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  if (req.method === "POST") {
    const { action, password } = req.body || {};

    if (action === "login") {
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected) return res.status(500).json({ error: "Admin password is not configured on the server." });
      if (typeof password !== "string" || password !== expected) {
        return res.status(401).json({ error: "Incorrect password." });
      }
      res.setHeader("Set-Cookie", createSessionCookie(req));
      return res.status(200).json({ ok: true });
    }

    if (action === "logout") {
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
