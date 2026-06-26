import crypto from "crypto";

const COOKIE_NAME = "fd_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function isHttps(req) {
  return req.headers["x-forwarded-proto"] === "https";
}

function buildCookie(name, value, req, maxAge) {
  const secure = isHttps(req) ? "; Secure" : "";
  const age = maxAge != null ? `; Max-Age=${maxAge}` : "";
  return `${name}=${value}; HttpOnly${secure}; SameSite=Strict; Path=/${age}`;
}

export function createSessionCookie(req) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = `${expires}.${sign(String(expires))}`;
  return buildCookie(COOKIE_NAME, token, req, MAX_AGE_SECONDS);
}

export function clearSessionCookie(req) {
  return buildCookie(COOKIE_NAME, "", req, 0);
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;
  const expiresStr = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!expiresStr || !sig) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  let expected;
  try {
    expected = sign(expiresStr);
  } catch {
    return false;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}
