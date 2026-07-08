/* =================================================================
   API CLIENT - thin fetch wrapper around the Neon-backed endpoints.
   Every call fails soft (returns null) so the static seed content in
   data.js always remains a working fallback if the DB isn't connected.
   ================================================================= */
window.API = (() => {
  const TIMEOUT = 6000;

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const res = await fetch(path, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      });
      clearTimeout(timer);
      if (!res.ok) return { ok: false, status: res.status, data: await safeJson(res) };
      return { ok: true, status: res.status, data: await safeJson(res) };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, status: 0, error: err };
    }
  }

  async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
  }

  return {
    // Public reads
    getContent: () => request("/api/content"),
    getPost: (slug) => request(`/api/posts?slug=${encodeURIComponent(slug)}`),
    getPosts: () => request("/api/posts"),
    getProject: (slug) => request(`/api/projects?slug=${encodeURIComponent(slug)}`),
    getProjects: () => request("/api/projects"),

    // Public write
    sendLead: (payload) => request("/api/leads", { method: "POST", body: JSON.stringify(payload) }),

    // Auth
    login: (password) => request("/api/auth", { method: "POST", body: JSON.stringify({ action: "login", password }) }),
    logout: () => request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }),
    checkAuth: () => request("/api/auth?action=check"),

    // Admin CRUD (cookie-authenticated)
    admin: (resource, action, payload) =>
      request("/api/admin", { method: "POST", body: JSON.stringify({ resource, action, ...payload }) }),

    seed: () => request("/api/seed", { method: "POST" }),
  };
})();
