/* =================================================================
   ADMIN DASHBOARD - login, tabs, and generic CRUD forms for every
   content resource. Talks only to /api/admin (cookie-authenticated);
   never touches js/data.js seed content.
   ================================================================= */
(() => {
  "use strict";

  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- Image URLs: accept GitHub links and auto-convert them ----------
     The site's images live in the GitHub repo (fenil-seo/fenil-dholariya) and
     Vercel serves every committed file at the same path. So:
     - github.com/<this repo>/blob/<branch>/assets/x.jpg  →  /assets/x.jpg
     - github.com/<other repo>/blob/...                   →  raw.githubusercontent.com/...
     - /assets/... paths and direct https:// image URLs pass through untouched. */
  const SITE_REPO = "fenil-seo/fenil-dholariya";

  function normalizeImageUrl(raw) {
    let url = String(raw || "").trim();
    if (!url) return "";
    const gh = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+?)(?:[?#].*)?$/);
    if (gh) {
      const [, user, repo, branch, path] = gh;
      if (`${user}/${repo}`.toLowerCase() === SITE_REPO) return `/${path}`;
      return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
    }
    const rawGh = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/(.+)$/);
    if (rawGh && `${rawGh[1]}/${rawGh[2]}`.toLowerCase() === SITE_REPO) return `/${rawGh[3]}`;
    return url;
  }

  /* Live preview + auto-convert for every image field (delegated, so it works
     in forms rendered at any time) */
  document.addEventListener("input", (e) => {
    const inp = e.target;
    if (inp.matches?.(".icon-picker__filter")) {
      const q = inp.value.trim().toLowerCase();
      inp.closest(".field").querySelectorAll(".icon-picker__btn").forEach((b) => {
        b.style.display = !q || b.dataset.label.includes(q) || b.dataset.icon.includes(q) ? "" : "none";
      });
      return;
    }
    if (!inp.matches?.("[data-img-input]")) return;
    const normalized = normalizeImageUrl(inp.value);
    if (normalized !== inp.value) inp.value = normalized;
    const field = inp.closest(".field");
    const wrap = field.querySelector(".img-prev");
    const img = field.querySelector(".img-prev__img");
    const value = inp.value.trim();
    if (!value) { wrap.style.display = "none"; return; }
    wrap.style.display = "block";
    field.querySelector(".img-prev__ok").style.display = "none";
    field.querySelector(".img-prev__err").style.display = "none";
    img.src = value;
  });

  /* Icon picker selection (delegated) */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".icon-picker__btn");
    if (!btn) return;
    e.preventDefault();
    const field = btn.closest(".field");
    const hidden = field.querySelector("input[type='hidden'][data-field]");
    if (hidden) hidden.value = btn.dataset.icon;
    field.querySelectorAll(".icon-picker__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
  });

  /* Icon library — keys match ICONS in js/render.js (what the public site draws) */
  const ICON_LIB = {
    /* Core SEO */
    seo:         ["SEO", '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'],
    audit:       ["SEO Audit", '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6M11 8v6"/>'],
    keyword:     ["Keywords", '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>'],
    backlink:    ["Backlinks", '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>'],
    ranking:     ["Rankings", '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>'],
    content:     ["Content", '<path d="M4 6h16M4 12h16M4 18h10"/>'],
    local:       ["Local SEO", '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'],
    funnel:      ["Funnel", '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>'],
    /* AI & research */
    ai:          ["AI", '<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>'],
    research:    ["Research", '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'],
    chatbot:     ["Chatbot", '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>'],
    automation:  ["Automation", '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'],
    /* Strategy, analytics & data visualization */
    strategy:    ["Strategy", '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'],
    analytics:   ["Analytics", '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'],
    trend:       ["Trends", '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>'],
    report:      ["Reports", '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>'],
    dashboard:   ["Dashboard", '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'],
    datavis:     ["Data Visualization", '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 13v-3M12 13V7M17 13v-5"/>'],
    data:        ["Database", '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'],
    pie:         ["Pie Chart", '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>'],
    /* Paid & performance */
    sem:         ["SEM / Google Ads", '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>'],
    campaign:    ["Campaigns", '<path d="M3 11l19-9-9 19-2-8-8-2z"/>'],
    cro:         ["CRO", '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'],
    ab:          ["A/B Testing", '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>'],
    remarketing: ["Remarketing", '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'],
    affiliate:   ["Affiliate", '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'],
    /* Digital marketing channels */
    digital:     ["Digital Marketing", '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'],
    email:       ["Email Marketing", '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'],
    social:      ["Social Media", '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>'],
    video:       ["Video", '<path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/>'],
    mobile:      ["Mobile", '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'],
    push:        ["Push / Alerts", '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'],
    influencer:  ["Influencer", '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'],
    /* Brand, commerce & PR */
    brand:       ["Brand", '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'],
    ecommerce:   ["E-commerce", '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>'],
    pr:          ["PR / Outreach", '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
    /* Web & tech */
    web:         ["Web Development", '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>'],
    vibecoding:  ["Vibe Coding", '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/><path d="M19 3l.75 1.75L21.5 5.5l-1.75.75L19 8l-.75-1.75L16.5 5.5l1.75-.75L19 3z"/>'],
    ux:          ["UI/UX Design", '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>'],
    speed:       ["Site Speed", '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'],
  };

  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const loginForm = document.getElementById("loginForm");
  const loginPassword = document.getElementById("loginPassword");
  const loginStatus = document.getElementById("loginStatus");
  const loginSubmit = document.getElementById("loginSubmit");
  const logoutBtn = document.getElementById("logoutBtn");
  const dbBanner = document.getElementById("dbBanner");
  const dbBannerText = document.getElementById("dbBannerText");
  const setupBtn = document.getElementById("setupBtn");
  const tabs = Array.from(document.querySelectorAll(".admin__tab"));
  const panels = Array.from(document.querySelectorAll(".admin__panel"));
  const loaded = new Set();

  function showLogin() {
    loginView.style.display = "";
    dashboardView.style.display = "none";
  }

  function showDashboard() {
    loginView.style.display = "none";
    dashboardView.style.display = "";
    loadTab(activeTabName());
  }

  function activeTabName() {
    return document.querySelector(".admin__tab.is-active")?.dataset.tab || "profile";
  }

  function noteDbStatus(ok, data) {
    if (ok) { dbBanner.style.display = "none"; return false; }
    if (data?.error && /database not connected/i.test(data.error)) {
      dbBannerText.textContent = data.error;
      dbBanner.style.display = "flex";
      return true;
    }
    return false;
  }

  async function loadTab(name, force) {
    if (loaded.has(name) && !force) return;
    loaded.add(name);
    const panel = document.getElementById(`panel-${name}`);
    panel.innerHTML = `<div class="admin-spinner">Loading…</div>`;
    try {
      await RESOURCES[name].render(panel);
    } catch (err) {
      panel.innerHTML = `<p class="admin-empty">Something went wrong: ${esc(err.message || String(err))}</p>`;
    }
  }

  /* ---------- Auth wiring ---------- */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Signing in…";
    loginStatus.className = "form-status";
    const { ok, data } = await window.API.login(loginPassword.value);
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Sign in";
    if (ok) {
      loginPassword.value = "";
      showDashboard();
    } else {
      loginStatus.textContent = data?.error || "Sign in failed. Please try again.";
      loginStatus.className = "form-status is-err";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await window.API.logout();
    loaded.clear();
    showLogin();
  });

  setupBtn.addEventListener("click", async () => {
    setupBtn.disabled = true;
    setupBtn.textContent = "Setting up…";
    const { ok, data } = await window.API.seed();
    setupBtn.disabled = false;
    setupBtn.textContent = "Initialize database";
    if (ok) {
      dbBanner.style.display = "none";
      loaded.clear();
      loadTab(activeTabName(), true);
    } else {
      alert(data?.error || "Setup failed.");
    }
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      panels.forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("is-active");
      loadTab(tab.dataset.tab);
    });
  });

  /* ---------- Field rendering helpers ---------- */
  function parseMetrics(text) {
    return String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, label] = line.split("|").map((s) => (s || "").trim());
        return { value: value || "", label: label || "" };
      });
  }

  function metricsToText(metrics) {
    return (metrics || []).map((m) => `${m.value} | ${m.label}`).join("\n");
  }

  function fieldValue(f, item) {
    if (item && item[f.key] !== undefined) return item[f.key];
    return f.default !== undefined ? f.default : f.type === "checkbox" ? false : f.type === "json" ? null : "";
  }

  function fieldHtml(f, item) {
    const value = fieldValue(f, item);
    if (f.type === "checkbox") {
      return `<label class="admin-checkbox" style="grid-column:1/-1"><input type="checkbox" data-field="${esc(f.key)}" ${value ? "checked" : ""}/><span>${esc(f.label)}</span></label>`;
    }
    if (f.type === "select") {
      const opts = f.options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("");
      return `<div class="field"><label>${esc(f.label)}</label><select class="select" data-field="${esc(f.key)}">${opts}</select></div>`;
    }
    if (f.type === "json") {
      const text = value == null ? "" : JSON.stringify(value, null, 2);
      const wide = f.wide ? ' style="grid-column:1/-1"' : "";
      return `<div class="field"${wide}><label>${esc(f.label)}</label><textarea class="textarea" data-field="${esc(f.key)}" style="font-family:var(--font-mono);font-size:0.85rem" rows="8" placeholder="${esc(f.placeholder || "")}">${esc(text)}</textarea>${f.hint ? `<p class="admin-form__hint">${esc(f.hint)}</p>` : ""}</div>`;
    }
    if (f.type === "textarea" || f.type === "metrics") {
      const text = f.type === "metrics" ? metricsToText(value) : value;
      const wide = f.wide ? ' style="grid-column:1/-1"' : "";
      return `<div class="field"${wide}><label>${esc(f.label)}</label><textarea class="textarea" data-field="${esc(f.key)}" placeholder="${esc(f.placeholder || "")}">${esc(text)}</textarea>${f.hint ? `<p class="admin-form__hint">${esc(f.hint)}</p>` : ""}</div>`;
    }
    if (f.type === "richtext") {
      const html = String(value || "");
      const wide = f.wide ? ' style="grid-column:1/-1"' : "";
      return `<div class="field"${wide}><label>${esc(f.label)}</label><div class="rte-wrap" data-rte-key="${esc(f.key)}" data-initial="${esc(html)}"></div>${f.hint ? `<p class="admin-form__hint">${esc(f.hint)}</p>` : ""}</div>`;
    }
    if (f.type === "image") {
      const wide = f.wide ? ' style="grid-column:1/-1"' : "";
      const hasSrc = Boolean(value);
      return `<div class="field"${wide}>
        <label>${esc(f.label)}</label>
        <input class="input" type="text" data-field="${esc(f.key)}" data-img-input value="${esc(value)}" placeholder="${esc(f.placeholder || "/assets/gallery/my-image.webp or GitHub link")}" />
        <div class="img-prev" style="margin-top:8px;${hasSrc ? '' : 'display:none'}">
          <img class="img-prev__img" src="${esc(value)}" alt="preview"
            style="max-height:160px;width:auto;border-radius:8px;object-fit:cover;border:1px solid var(--line-strong);display:block"
            onload="this.closest('.img-prev').querySelector('.img-prev__ok').style.display='block';this.closest('.img-prev').querySelector('.img-prev__err').style.display='none'"
            onerror="this.closest('.img-prev').querySelector('.img-prev__ok').style.display='none';this.closest('.img-prev').querySelector('.img-prev__err').style.display='block'">
          <p class="img-prev__ok admin-form__hint" style="color:#48bb78;display:none">✓ Image loads — it will show on the site</p>
          <p class="img-prev__err admin-form__hint" style="color:#f56565;display:none">✗ This link can't load as an image yet. If you just uploaded it to GitHub, the site redeploys in ~1 minute — wait and re-paste. Otherwise check the path/URL.</p>
        </div>
        ${f.hint ? `<p class="admin-form__hint">${esc(f.hint)}</p>` : ""}
        <p class="admin-form__hint">Tip: upload the image to GitHub (assets/gallery folder), open it, copy the browser URL and paste it here — it converts to the right path automatically.</p>
      </div>`;
    }
    if (f.type === "icon") {
      const current = value || "audit";
      return `<div class="field" style="grid-column:1/-1">
        <label>${esc(f.label)}</label>
        <input type="hidden" data-field="${esc(f.key)}" value="${esc(current)}">
        <input class="input icon-picker__filter" type="text" placeholder="Search icons… e.g. seo, coding, data" style="margin-bottom:8px">
        <div class="icon-picker">
          ${Object.entries(ICON_LIB).map(([key, [label, svg]]) => `
            <button type="button" class="icon-picker__btn${key === current ? " is-active" : ""}" data-icon="${esc(key)}" data-label="${esc(label.toLowerCase())}" title="${esc(label)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${svg}</svg>
              <span>${esc(label)}</span>
            </button>`).join("")}
        </div>
      </div>`;
    }
    return `<div class="field"><label>${esc(f.label)}</label><input class="input" type="${f.type || "text"}" data-field="${esc(f.key)}" value="${esc(value)}" placeholder="${esc(f.placeholder || "")}" /></div>`;
  }

  function readForm(container, fields) {
    const data = {};
    fields.forEach((f) => {
      if (f.type === "richtext") {
        const wrapper = container.querySelector(`.rte-wrap[data-rte-key="${f.key}"]`);
        data[f.key] = wrapper && typeof wrapper.getValue === "function" ? wrapper.getValue() : "";
        return;
      }
      const el = container.querySelector(`[data-field="${f.key}"]`);
      if (!el) return;
      if (f.type === "checkbox") data[f.key] = el.checked;
      else if (f.type === "metrics") data[f.key] = parseMetrics(el.value);
      else if (f.type === "number") data[f.key] = el.value === "" ? 0 : Number(el.value);
      else if (f.type === "json") {
        const raw = el.value.trim();
        if (!raw) { data[f.key] = null; return; }
        try {
          data[f.key] = JSON.parse(raw);
        } catch (err) {
          throw new Error(`${f.label}: invalid JSON - ${err.message}`);
        }
      } else data[f.key] = el.value;
    });
    return data;
  }

  /* ---------- Rich text editor ---------- */
  function createRichEditor(wrapper) {
    const initial = wrapper.dataset.initial || "";
    wrapper.innerHTML = `
      <div class="rte-toolbar">
        <select class="rte-block">
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code block</option>
        </select>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-cmd="bold" title="Bold"><strong>B</strong></button>
        <button type="button" class="rte-btn" data-cmd="italic" title="Italic"><em>I</em></button>
        <button type="button" class="rte-btn" data-cmd="underline" title="Underline"><u>U</u></button>
        <button type="button" class="rte-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Bullet list">&#8226; List</button>
        <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Numbered list">1. List</button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-cmd="justifyLeft" title="Align left">⯇</button>
        <button type="button" class="rte-btn" data-cmd="justifyCenter" title="Align center">⯀</button>
        <button type="button" class="rte-btn" data-cmd="justifyRight" title="Align right">⯈</button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-cmd="createLink" title="Insert link">Link</button>
        <button type="button" class="rte-btn" data-cmd="unlink" title="Remove link">Unlink</button>
        <button type="button" class="rte-btn" data-action="image" title="Insert image">Image</button>
        <button type="button" class="rte-btn" data-cmd="insertHorizontalRule" title="Horizontal rule">HR</button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-cmd="undo" title="Undo">↶</button>
        <button type="button" class="rte-btn" data-cmd="redo" title="Redo">↷</button>
        <button type="button" class="rte-btn" data-cmd="removeFormat" title="Clear formatting">Clear</button>
        <span class="rte-sep"></span>
        <button type="button" class="rte-btn" data-action="source" title="Toggle HTML source">HTML</button>
      </div>
      <div class="rte-editor" contenteditable="true" data-placeholder="Write your content here…"></div>
      <textarea class="textarea rte-source" style="display:none;border:none;border-top:1px solid var(--line);border-radius:0;min-height:200px;resize:vertical;font-family:var(--font-mono);font-size:0.82rem"></textarea>
    `;

    const editor = wrapper.querySelector(".rte-editor");
    const source = wrapper.querySelector(".rte-source");
    const blockSel = wrapper.querySelector(".rte-block");

    editor.innerHTML = initial;

    function updateActive() {
      wrapper.querySelectorAll(".rte-btn[data-cmd]").forEach((btn) => {
        try { btn.classList.toggle("is-active", document.queryCommandState(btn.dataset.cmd)); } catch {}
      });
      try {
        const block = document.queryCommandValue("formatBlock").toLowerCase().replace(/^<|>$/g, "") || "p";
        if (blockSel.querySelector(`option[value="${block}"]`)) blockSel.value = block;
      } catch {}
    }

    wrapper.querySelector(".rte-toolbar").addEventListener("mousedown", (e) => {
      const btn = e.target.closest("[data-cmd]");
      if (btn) {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        if (cmd === "createLink") {
          const url = prompt("Enter URL (include https://):");
          if (url) document.execCommand("createLink", false, url);
        } else {
          document.execCommand(cmd, false, null);
        }
        editor.focus();
        updateActive();
        return;
      }
      if (e.target.closest("[data-action='image']")) {
        e.preventDefault();
        const url = prompt("Paste the image link (GitHub link, /assets/gallery/… path, or direct https:// image URL):");
        if (url) {
          const clean = normalizeImageUrl(url);
          editor.focus();
          document.execCommand("insertHTML", false, `<img src="${esc(clean)}" alt="" style="max-width:100%;height:auto;border-radius:12px">`);
        }
        return;
      }
      if (e.target.closest("[data-action='source']")) {
        e.preventDefault();
        const srcBtn = wrapper.querySelector("[data-action='source']");
        if (editor.style.display === "none") {
          editor.innerHTML = source.value;
          source.style.display = "none";
          editor.style.display = "";
          srcBtn.classList.remove("is-active");
        } else {
          source.value = editor.innerHTML;
          editor.style.display = "none";
          source.style.display = "";
          srcBtn.classList.add("is-active");
        }
      }
    });

    blockSel.addEventListener("change", (e) => {
      const val = e.target.value;
      document.execCommand("formatBlock", false, `<${val}>`);
      editor.focus();
    });

    editor.addEventListener("keyup", updateActive);
    editor.addEventListener("mouseup", updateActive);
    editor.addEventListener("focus", updateActive);

    wrapper.getValue = () => editor.style.display === "none" ? source.value : editor.innerHTML;
    wrapper.setValue = (html) => { editor.innerHTML = html || ""; if (source.style.display !== "none") source.value = html || ""; };
  }

  function postInitFields(container, fields) {
    if (!container) return;
    fields.forEach((f) => {
      if (f.type !== "richtext") return;
      const wrapper = container.querySelector(`.rte-wrap[data-rte-key="${f.key}"]`);
      if (wrapper) createRichEditor(wrapper);
    });
  }

  /* ---------- Generic list-resource CRUD (stats, services, process, projects, posts, testimonials, skills, timeline) ---------- */
  function listResource({ resource, title, hint, fields, summary }) {
    return {
      async render(panel) {
        const { ok, data } = await window.API.admin(resource, "list");
        if (noteDbStatus(ok, data)) {
          panel.innerHTML = `<p class="admin-empty">Connect the database to manage ${esc(title.toLowerCase())}.</p>`;
          return;
        }
        if (!ok) {
          panel.innerHTML = `<p class="admin-empty">${esc(data?.error || "Failed to load.")}</p>`;
          return;
        }

        panel.innerHTML = `
          <div class="admin__panel-head">
            <div><h2>${esc(title)}</h2>${hint ? `<p>${esc(hint)}</p>` : ""}</div>
            <button class="btn btn--primary btn--sm" data-action="add">+ Add</button>
          </div>
          <div id="list-${resource}"></div>
        `;

        const listEl = panel.querySelector(`#list-${resource}`);
        const items = data.items || [];
        if (items.length) items.forEach((item) => listEl.appendChild(buildCard(item)));
        else listEl.innerHTML = `<p class="admin-empty">Nothing here yet - click + Add.</p>`;

        panel.querySelector('[data-action="add"]').addEventListener("click", () => {
          if (listEl.querySelector(".admin-empty")) listEl.innerHTML = "";
          const card = buildCard(null);
          listEl.prepend(card);
          card.classList.add("is-open");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        function buildCard(item) {
          const isNew = !item;
          const card = document.createElement("div");
          card.className = "admin-card";
          const s = isNew ? { title: "New item", sub: "" } : summary(item);
          card.innerHTML = `
            <div class="admin-card__row" data-action="toggle">
              <div>
                <div class="admin-card__title">${esc(s.title)}</div>
                ${s.sub ? `<div class="admin-card__sub">${esc(s.sub)}</div>` : ""}
              </div>
              <div class="admin-card__actions">
                ${!isNew ? `<button class="btn btn--danger btn--sm" data-action="delete">Delete</button>` : ""}
                <svg class="admin-card__chevron" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div class="admin-card__body">
              <div class="admin-form__grid">${fields.map((f) => fieldHtml(f, item)).join("")}</div>
              <div class="admin-form__actions">
                <button class="btn btn--primary btn--sm" data-action="save">Save</button>
                ${isNew ? `<button class="btn btn--ghost btn--sm" data-action="cancel">Cancel</button>` : ""}
              </div>
              <p class="form-status" data-role="status"></p>
            </div>
          `;
          postInitFields(card.querySelector(".admin-card__body"), fields);
          if (isNew) card.classList.add("is-open");

          card.querySelector('[data-action="toggle"]').addEventListener("click", () => card.classList.toggle("is-open"));

          const deleteBtn = card.querySelector('[data-action="delete"]');
          if (deleteBtn) {
            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              if (!confirm("Delete this item? This can't be undone.")) return;
              const { ok, data } = await window.API.admin(resource, "delete", { id: item.id });
              if (ok) {
                card.remove();
                if (!listEl.children.length) listEl.innerHTML = `<p class="admin-empty">Nothing here yet - click + Add.</p>`;
              } else alert(data?.error || "Delete failed.");
            });
          }

          const cancelBtn = card.querySelector('[data-action="cancel"]');
          if (cancelBtn) {
            cancelBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              card.remove();
              if (!listEl.children.length) listEl.innerHTML = `<p class="admin-empty">Nothing here yet - click + Add.</p>`;
            });
          }

          card.querySelector('[data-action="save"]').addEventListener("click", async (e) => {
            e.stopPropagation();
            const body = card.querySelector(".admin-card__body");
            const statusEl = card.querySelector('[data-role="status"]');
            let formData;
            try {
              formData = readForm(body, fields);
            } catch (err) {
              statusEl.className = "form-status is-err";
              statusEl.textContent = err.message || "Invalid input.";
              return;
            }
            const saveBtn = card.querySelector('[data-action="save"]');
            saveBtn.disabled = true;
            const { ok, data } = await window.API.admin(resource, isNew ? "create" : "update", { id: item?.id, data: formData });
            saveBtn.disabled = false;
            if (ok) {
              const fresh = buildCard(data.item);
              fresh.classList.add("is-open");
              card.replaceWith(fresh);
            } else {
              statusEl.className = "form-status is-err";
              statusEl.textContent = data?.error || "Save failed.";
            }
          });

          return card;
        }
      },
    };
  }

  /* ---------- Profile (singleton) ---------- */
  const PROFILE_FIELDS = [
    { key: "name", label: "Name" },
    { key: "role", label: "Role / title" },
    { key: "tagline", label: "Tagline" },
    { key: "intro", label: "Intro", type: "textarea", wide: true },
    { key: "location", label: "Location" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "whatsapp", label: "WhatsApp number (digits only)", placeholder: "916354646935" },
    { key: "instagram", label: "Instagram URL" },
    { key: "linkedin", label: "LinkedIn URL" },
    { key: "available_text", label: "Availability badge text" },
    { key: "available", label: "Currently available for new projects", type: "checkbox", default: true },
    {
      key: "schema_markup",
      label: "Custom schema markup (JSON-LD)",
      type: "json",
      wide: true,
      hint: "Optional. Paste any schema.org JSON-LD object (or array of objects) - it's added to the home page alongside the built-in Person/WebSite/Service markup. Leave blank to skip.",
    },
  ];

  const profileResource = {
    async render(panel) {
      const { ok, data } = await window.API.admin("profile", "get");
      if (noteDbStatus(ok, data)) {
        panel.innerHTML = `<p class="admin-empty">Connect the database to edit your profile.</p>`;
        return;
      }
      if (!ok) {
        panel.innerHTML = `<p class="admin-empty">${esc(data?.error || "Failed to load.")}</p>`;
        return;
      }
      const item = data.item;
      panel.innerHTML = `
        <div class="admin__panel-head"><div><h2>Profile</h2><p>Your public contact details and bio, shown across the site.</p></div></div>
        <div class="admin-card is-open">
          <div class="admin-card__body" style="display:block;border-top:none;padding-top:0">
            <div class="admin-form__grid">${PROFILE_FIELDS.map((f) => fieldHtml(f, item)).join("")}</div>
            <div class="admin-form__actions"><button class="btn btn--primary btn--sm" id="profileSave">Save profile</button></div>
            <p class="form-status" id="profileStatus"></p>
          </div>
        </div>
      `;
      panel.querySelector("#profileSave").addEventListener("click", async () => {
        const body = panel.querySelector(".admin-card__body");
        const statusEl = panel.querySelector("#profileStatus");
        let formData;
        try {
          formData = readForm(body, PROFILE_FIELDS);
        } catch (err) {
          statusEl.className = "form-status is-err";
          statusEl.textContent = err.message || "Invalid input.";
          return;
        }
        const btn = panel.querySelector("#profileSave");
        btn.disabled = true;
        const { ok, data } = await window.API.admin("profile", "update", { data: formData });
        btn.disabled = false;
        statusEl.className = ok ? "form-status is-ok" : "form-status is-err";
        statusEl.textContent = ok ? "Saved." : data?.error || "Save failed.";
      });
    },
  };

  /* ---------- Leads (read, triage, delete - created by the public contact form) ---------- */
  const leadsResource = {
    async render(panel) {
      const { ok, data } = await window.API.admin("leads", "list");
      if (noteDbStatus(ok, data)) {
        panel.innerHTML = `<p class="admin-empty">Connect the database to view leads. Until then, submissions are only logged on the server.</p>`;
        return;
      }
      if (!ok) {
        panel.innerHTML = `<p class="admin-empty">${esc(data?.error || "Failed to load.")}</p>`;
        return;
      }
      const items = data.items || [];
      panel.innerHTML = `
        <div class="admin__panel-head"><div><h2>Leads</h2><p>Messages submitted through the contact form.</p></div></div>
        <div id="list-leads"></div>
      `;
      const listEl = panel.querySelector("#list-leads");
      if (!items.length) {
        listEl.innerHTML = `<p class="admin-empty">No leads yet.</p>`;
        return;
      }
      items.forEach((lead) => listEl.appendChild(buildLeadCard(lead, listEl)));
    },
  };

  function buildLeadCard(lead, listEl) {
    const card = document.createElement("div");
    card.className = `admin-card lead-card is-status-${lead.status || "new"}`;
    const when = new Date(lead.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    card.innerHTML = `
      <div class="admin-card__row" data-action="toggle">
        <div>
          <div class="admin-card__title">${esc(lead.name)} ${lead.company ? `· ${esc(lead.company)}` : ""}</div>
          <div class="lead-card__meta"><span>${esc(lead.email)}</span><span>·</span><span>${esc(when)}</span></div>
        </div>
        <div class="admin-card__actions">
          <select class="select" data-action="status" style="width:auto;padding:0.4em 0.8em" onclick="event.stopPropagation()">
            ${["new", "contacted", "closed"].map((s) => `<option value="${s}" ${s === (lead.status || "new") ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button class="btn btn--danger btn--sm" data-action="delete">Delete</button>
          <svg class="admin-card__chevron" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      <div class="admin-card__body"><div class="lead-card__message">${esc(lead.message)}</div></div>
    `;
    card.querySelector('[data-action="toggle"]').addEventListener("click", () => card.classList.toggle("is-open"));
    card.querySelector('[data-action="status"]').addEventListener("change", async (e) => {
      const status = e.target.value;
      const { ok } = await window.API.admin("leads", "update", { id: lead.id, data: { status } });
      if (ok) {
        card.className = `admin-card lead-card is-status-${status}`;
      }
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this lead?")) return;
      const { ok } = await window.API.admin("leads", "delete", { id: lead.id });
      if (ok) {
        card.remove();
        if (!listEl.children.length) listEl.innerHTML = `<p class="admin-empty">No leads yet.</p>`;
      }
    });
    return card;
  }

  /* ---------- Gallery (custom renderer — section-by-section, image upload, pin) ---------- */
  const galleryResource = {
    async render(panel) {
      let sections = [];
      let items = [];
      let view = "gallery"; // "gallery" | "sections"

      async function loadAll() {
        const [sr, ir] = await Promise.all([
          window.API.admin("gallery-sections", "list"),
          window.API.admin("gallery", "list"),
        ]);
        if (noteDbStatus(sr.ok, sr.data)) {
          panel.innerHTML = `<p class="admin-empty">Connect the database to manage gallery.</p>`;
          return false;
        }
        if (!sr.ok) { panel.innerHTML = `<p class="admin-empty">${esc(sr.data?.error || "Failed to load sections.")}</p>`; return false; }
        if (!ir.ok) { panel.innerHTML = `<p class="admin-empty">${esc(ir.data?.error || "Failed to load images.")}</p>`; return false; }
        sections = sr.data.items || [];
        items = ir.data.items || [];
        return true;
      }

      function buildItemForm(item, defaultSection) {
        const secKey = defaultSection || item?.section || (sections[0]?.key || "");
        const sectionOpts = sections.map((s) =>
          `<option value="${esc(s.key)}" ${s.key === secKey ? "selected" : ""}>${esc(s.label || s.key)}</option>`
        ).join("");

        const div = document.createElement("div");
        div.innerHTML = `
          <div class="admin-form__grid">
            <div class="field" style="grid-column:1/-1">
              <label>Section</label>
              <select class="select" data-field="section">${sectionOpts}</select>
            </div>
            ${fieldHtml({ key: "image_url", label: "Image", type: "image", wide: true }, item || {})}
            <div class="field">
              <label>Alt text</label>
              <input class="input" type="text" data-field="alt" value="${esc(item?.alt || "")}" placeholder="Looker Studio SEO Report March 2026 showing ₹26K revenue">
            </div>
            <div class="field">
              <label>Badge label</label>
              <input class="input" type="text" data-field="badge" value="${esc(item?.badge || "")}" placeholder="Mar 2026">
            </div>
            <div class="field" style="grid-column:1/-1">
              <label>Caption text</label>
              <input class="input" type="text" data-field="caption" value="${esc(item?.caption || "")}" placeholder="Revenue ₹26.48K · Clicks 315 · Purchases 13">
            </div>
            <label class="admin-checkbox" style="grid-column:1/-1">
              <input type="checkbox" data-field="highlight" ${item?.highlight ? "checked" : ""}>
              <span>Highlighted card style (Looker Studio / AI reports)</span>
            </label>
          </div>`;
        return div;
      }

      function readItemForm(container) {
        return {
          section:   container.querySelector('[data-field="section"]')?.value || "",
          image_url: container.querySelector('[data-field="image_url"]')?.value || "",
          alt:       container.querySelector('[data-field="alt"]')?.value || "",
          badge:     container.querySelector('[data-field="badge"]')?.value || "",
          caption:   container.querySelector('[data-field="caption"]')?.value || "",
          highlight: container.querySelector('[data-field="highlight"]')?.checked || false,
        };
      }

      /* ---- Gallery view (section by section) ---- */
      function renderGalleryView() {
        const bySection = {};
        for (const item of items) {
          (bySection[item.section] || (bySection[item.section] = [])).push(item);
        }

        let html = `
          <div class="admin__panel-head">
            <div><h2>Gallery</h2><p>Screenshots on the /gallery page, organised by section. Newest images appear first.</p></div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <button class="btn btn--ghost btn--sm" data-action="manage-sections">Manage Sections</button>
              <button class="btn btn--primary btn--sm" data-action="add-image">+ Add Image</button>
            </div>
          </div>
          <div id="gal-add-form" style="display:none"></div>`;

        if (!sections.length) {
          html += `<p class="admin-empty">No sections yet — click <strong>Manage Sections</strong> to create one first.</p>`;
        } else {
          const knownKeys = new Set(sections.map((s) => s.key));
          for (const sec of sections) {
            const secItems = bySection[sec.key] || [];
            html += `<div class="gallery-sec" data-section="${esc(sec.key)}">
              <div class="gallery-sec__head">
                <span class="gallery-sec__name">${esc(sec.label || sec.key)}</span>
                <span class="gallery-sec__key">${esc(sec.key)}</span>
                <span class="gallery-sec__count">${secItems.length} image${secItems.length !== 1 ? "s" : ""}</span>
              </div>
              <div class="gallery-sec__items" id="sec-${esc(sec.key)}">
                ${secItems.length ? secItems.map(buildItemCardHtml).join("") : `<p class="gallery-sec__empty">No images yet.</p>`}
              </div>
            </div>`;
          }
          const orphans = items.filter((i) => !knownKeys.has(i.section));
          if (orphans.length) {
            html += `<div class="gallery-sec"><div class="gallery-sec__head"><span class="gallery-sec__name">Other</span><span class="gallery-sec__count">${orphans.length}</span></div>
              <div class="gallery-sec__items">${orphans.map(buildItemCardHtml).join("")}</div></div>`;
          }
        }

        panel.innerHTML = html;

        panel.querySelector('[data-action="manage-sections"]')?.addEventListener("click", () => {
          view = "sections"; renderSectionsView();
        });
        panel.querySelector('[data-action="add-image"]')?.addEventListener("click", () => showAddForm(null));
        wireItemCards(panel);
      }

      function buildItemCardHtml(item) {
        const pinned = item.pinned;
        const thumb = item.image_url
          ? `<img class="gallery-item-thumb" src="${esc(item.image_url)}" alt="" loading="lazy">`
          : `<div class="gallery-item-thumb" style="background:var(--surface-2)"></div>`;
        return `<div class="gallery-item-card${pinned ? " is-pinned" : ""}" data-id="${item.id}">
          ${thumb}
          <div class="gallery-item-meta">
            ${item.badge ? `<div class="gallery-item-badge">${esc(item.badge)}</div>` : ""}
            <div class="gallery-item-caption">${esc(item.caption || "—")}</div>
          </div>
          <div class="gallery-item-actions">
            <button class="btn btn--sm ${pinned ? "btn--primary" : "btn--ghost"}" data-action="pin" title="${pinned ? "Unpin" : "Pin to top"}" style="padding:.35em .6em;font-size:.9rem">${pinned ? "📌" : "📍"}</button>
            <button class="btn btn--ghost btn--sm" data-action="edit">Edit</button>
            <button class="btn btn--danger btn--sm" data-action="delete">Del</button>
          </div>
          <div class="gallery-item-form"></div>
        </div>`;
      }

      function wireItemCards(root) {
        root.querySelectorAll(".gallery-item-card").forEach((card) => {
          const itemId = Number(card.dataset.id);
          const item = items.find((i) => i.id === itemId);
          if (!item) return;

          card.querySelector('[data-action="pin"]')?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            btn.disabled = true;
            const { ok } = await window.API.admin("gallery", "update", { id: itemId, data: { pinned: !item.pinned } });
            btn.disabled = false;
            if (ok) { if (await loadAll()) renderGalleryView(); }
          });

          card.querySelector('[data-action="edit"]')?.addEventListener("click", (e) => {
            e.stopPropagation();
            const formEl = card.querySelector(".gallery-item-form");
            if (card.classList.contains("is-editing")) {
              card.classList.remove("is-editing"); formEl.innerHTML = ""; return;
            }
            card.classList.add("is-editing");
            const form = buildItemForm(item);
            const actions = document.createElement("div");
            actions.className = "admin-form__actions";
            actions.innerHTML = `<button class="btn btn--primary btn--sm" data-action="save">Save</button>
              <button class="btn btn--ghost btn--sm" data-action="cancel">Cancel</button>
              <p class="form-status"></p>`;
            formEl.append(form, actions);

            actions.querySelector('[data-action="cancel"]').addEventListener("click", () => {
              card.classList.remove("is-editing"); formEl.innerHTML = "";
            });
            actions.querySelector('[data-action="save"]').addEventListener("click", async () => {
              const btn = actions.querySelector('[data-action="save"]');
              const status = actions.querySelector(".form-status");
              const fd = readItemForm(formEl);
              if (!fd.image_url) { status.className = "form-status is-err"; status.textContent = "Please upload an image."; return; }
              btn.disabled = true; btn.textContent = "Saving…";
              const { ok, data } = await window.API.admin("gallery", "update", { id: itemId, data: fd });
              btn.disabled = false; btn.textContent = "Save";
              if (ok) {
                Object.assign(item, data.item);
                card.classList.remove("is-editing"); formEl.innerHTML = "";
                const tmp = document.createElement("div");
                tmp.innerHTML = buildItemCardHtml(item);
                const fresh = tmp.firstElementChild;
                card.replaceWith(fresh);
                wireItemCards(fresh.parentElement);
              } else { status.className = "form-status is-err"; status.textContent = data?.error || "Save failed."; }
            });
          });

          card.querySelector('[data-action="delete"]')?.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!confirm("Delete this image permanently?")) return;
            const { ok } = await window.API.admin("gallery", "delete", { id: itemId });
            if (ok) {
              items = items.filter((i) => i.id !== itemId);
              const secItems = card.closest(".gallery-sec__items");
              card.remove();
              if (secItems && !secItems.querySelector(".gallery-item-card")) {
                secItems.innerHTML = `<p class="gallery-sec__empty">No images yet.</p>`;
              }
              const sec = card.closest(".gallery-sec");
              const cnt = sec?.querySelectorAll(".gallery-item-card").length || 0;
              const cntEl = sec?.querySelector(".gallery-sec__count");
              if (cntEl) cntEl.textContent = `${cnt} image${cnt !== 1 ? "s" : ""}`;
            }
          });
        });
      }

      function showAddForm(defaultSection) {
        const wrap = panel.querySelector("#gal-add-form");
        if (!wrap) return;
        wrap.style.display = "";
        const card = document.createElement("div");
        card.className = "admin-card is-open";
        card.innerHTML = `<div class="admin-card__row"><div class="admin-card__title">New Image</div></div>
          <div class="admin-card__body" style="display:block;border-top:none;padding-top:0"></div>`;
        const body = card.querySelector(".admin-card__body");
        const form = buildItemForm(null, defaultSection);
        const actions = document.createElement("div");
        actions.className = "admin-form__actions";
        actions.innerHTML = `<button class="btn btn--primary btn--sm" data-action="save">Save image</button>
          <button class="btn btn--ghost btn--sm" data-action="cancel">Cancel</button>
          <p class="form-status"></p>`;
        body.append(form, actions);
        wrap.innerHTML = ""; wrap.append(card);
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });

        actions.querySelector('[data-action="cancel"]').addEventListener("click", () => {
          wrap.style.display = "none"; wrap.innerHTML = "";
        });
        actions.querySelector('[data-action="save"]').addEventListener("click", async () => {
          const btn = actions.querySelector('[data-action="save"]');
          const status = actions.querySelector(".form-status");
          const fd = readItemForm(body);
          if (!fd.image_url) { status.className = "form-status is-err"; status.textContent = "Please upload an image first."; return; }
          btn.disabled = true; btn.textContent = "Saving…";
          const { ok, data } = await window.API.admin("gallery", "create", { data: fd });
          btn.disabled = false; btn.textContent = "Save image";
          if (ok) {
            items.unshift(data.item);
            wrap.style.display = "none"; wrap.innerHTML = "";
            const secKey = data.item.section;
            const secEl = panel.querySelector(`#sec-${secKey}`);
            if (secEl) {
              secEl.querySelector(".gallery-sec__empty")?.remove();
              const tmp = document.createElement("div"); tmp.innerHTML = buildItemCardHtml(data.item);
              secEl.prepend(tmp.firstElementChild);
              wireItemCards(secEl);
              const cnt = secEl.querySelectorAll(".gallery-item-card").length;
              const cntEl = panel.querySelector(`[data-section="${secKey}"] .gallery-sec__count`);
              if (cntEl) cntEl.textContent = `${cnt} image${cnt !== 1 ? "s" : ""}`;
            }
          } else { status.className = "form-status is-err"; status.textContent = data?.error || "Save failed."; }
        });
      }

      /* ---- Sections management view ---- */
      function renderSectionsView() {
        let html = `
          <div class="admin__panel-head">
            <div><h2>Manage Sections</h2><p>Define the sections that group screenshots on the /gallery page.</p></div>
            <div style="display:flex;gap:.5rem">
              <button class="btn btn--ghost btn--sm" data-action="back">← Gallery</button>
              <button class="btn btn--primary btn--sm" data-action="add-section">+ Add Section</button>
            </div>
          </div>
          <div id="sec-add-form" style="display:none"></div>
          <div id="sec-list">`;
        html += sections.length
          ? sections.map(buildSectionCardHtml).join("")
          : `<p class="admin-empty">No sections yet — click + Add Section.</p>`;
        html += `</div>`;
        panel.innerHTML = html;

        panel.querySelector('[data-action="back"]')?.addEventListener("click", () => { view = "gallery"; renderGalleryView(); });
        panel.querySelector('[data-action="add-section"]')?.addEventListener("click", showAddSectionForm);
        wireSectionCards(panel);
      }

      function buildSectionCardHtml(sec) {
        return `<div class="admin-card" data-sec-id="${sec.id}">
          <div class="admin-card__row" data-action="toggle">
            <div>
              <div class="admin-card__title">${esc(sec.label || sec.key)}</div>
              <div class="admin-card__sub">key: ${esc(sec.key)} · position: ${esc(String(sec.position ?? 99))}</div>
            </div>
            <div class="admin-card__actions">
              <button class="btn btn--danger btn--sm" data-action="delete-section">Delete</button>
              <svg class="admin-card__chevron" width="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div class="admin-card__body">
            <div class="admin-form__grid">
              <div class="field"><label>Heading (label)</label><input class="input" data-field="label" value="${esc(sec.label || "")}"></div>
              <div class="field"><label>Eyebrow text</label><input class="input" data-field="eyebrow" value="${esc(sec.eyebrow || "")}"></div>
              <div class="field" style="grid-column:1/-1"><label>Description</label><input class="input" data-field="description" value="${esc(sec.description || "")}"></div>
              <div class="field"><label>Position (1 = first)</label><input class="input" type="number" data-field="position" value="${esc(String(sec.position ?? 99))}"></div>
            </div>
            <div class="admin-form__actions">
              <button class="btn btn--primary btn--sm" data-action="save-section">Save</button>
              <p class="form-status"></p>
            </div>
          </div>
        </div>`;
      }

      function wireSectionCards(root) {
        root.querySelectorAll(".admin-card[data-sec-id]").forEach((card) => {
          const secId = Number(card.dataset.secId);
          const sec = sections.find((s) => s.id === secId);
          if (!sec) return;

          card.querySelector('[data-action="toggle"]')?.addEventListener("click", () => card.classList.toggle("is-open"));

          card.querySelector('[data-action="save-section"]')?.addEventListener("click", async () => {
            const btn = card.querySelector('[data-action="save-section"]');
            const status = card.querySelector(".form-status");
            const fd = {
              label:       card.querySelector('[data-field="label"]')?.value || "",
              eyebrow:     card.querySelector('[data-field="eyebrow"]')?.value || "",
              description: card.querySelector('[data-field="description"]')?.value || "",
              position:    Number(card.querySelector('[data-field="position"]')?.value) || 99,
            };
            btn.disabled = true;
            const { ok, data } = await window.API.admin("gallery-sections", "update", { id: secId, data: fd });
            btn.disabled = false;
            if (ok) {
              Object.assign(sec, data.item);
              status.className = "form-status is-ok"; status.textContent = "Saved.";
              card.querySelector(".admin-card__title").textContent = sec.label || sec.key;
              card.querySelector(".admin-card__sub").textContent = `key: ${sec.key} · position: ${sec.position}`;
            } else { status.className = "form-status is-err"; status.textContent = data?.error || "Save failed."; }
          });

          card.querySelector('[data-action="delete-section"]')?.addEventListener("click", async (e) => {
            e.stopPropagation();
            const inUse = items.filter((i) => i.section === sec.key).length;
            if (inUse) { alert(`This section has ${inUse} image(s). Delete or reassign them first.`); return; }
            if (!confirm(`Delete section "${sec.label || sec.key}"?`)) return;
            const { ok } = await window.API.admin("gallery-sections", "delete", { id: secId });
            if (ok) {
              sections = sections.filter((s) => s.id !== secId);
              card.remove();
              const list = panel.querySelector("#sec-list");
              if (list && !list.querySelector(".admin-card")) list.innerHTML = `<p class="admin-empty">No sections yet — click + Add Section.</p>`;
            }
          });
        });
      }

      function showAddSectionForm() {
        const wrap = panel.querySelector("#sec-add-form");
        if (!wrap) return;
        wrap.style.display = "";
        wrap.innerHTML = `<div class="admin-card is-open" style="margin-bottom:1rem">
          <div class="admin-card__row"><div class="admin-card__title">New Section</div></div>
          <div class="admin-card__body" style="display:block;border-top:none;padding-top:0">
            <div class="admin-form__grid">
              <div class="field"><label>Section key (letters, numbers, hyphens)</label><input class="input" id="ns-key" placeholder="my-section"></div>
              <div class="field"><label>Heading (label)</label><input class="input" id="ns-label" placeholder="My Section Title"></div>
              <div class="field"><label>Eyebrow text</label><input class="input" id="ns-eyebrow" placeholder="Category · subcategory"></div>
              <div class="field" style="grid-column:1/-1"><label>Description</label><input class="input" id="ns-desc" placeholder="One sentence describing this section."></div>
              <div class="field"><label>Position (1 = first)</label><input class="input" type="number" id="ns-pos" value="99"></div>
            </div>
            <div class="admin-form__actions">
              <button class="btn btn--primary btn--sm" id="ns-save">Create section</button>
              <button class="btn btn--ghost btn--sm" id="ns-cancel">Cancel</button>
              <p class="form-status" id="ns-status"></p>
            </div>
          </div>
        </div>`;

        panel.querySelector("#ns-cancel").addEventListener("click", () => { wrap.style.display = "none"; wrap.innerHTML = ""; });
        panel.querySelector("#ns-save").addEventListener("click", async () => {
          const btn = panel.querySelector("#ns-save");
          const status = panel.querySelector("#ns-status");
          const rawKey = (panel.querySelector("#ns-key")?.value || "").trim();
          const fd = {
            key:         rawKey.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            label:       panel.querySelector("#ns-label")?.value || "",
            eyebrow:     panel.querySelector("#ns-eyebrow")?.value || "",
            description: panel.querySelector("#ns-desc")?.value || "",
            position:    Number(panel.querySelector("#ns-pos")?.value) || 99,
          };
          if (!fd.key) { status.className = "form-status is-err"; status.textContent = "Section key is required."; return; }
          btn.disabled = true;
          const { ok, data } = await window.API.admin("gallery-sections", "create", { data: fd });
          btn.disabled = false;
          if (ok) {
            sections.push(data.item);
            wrap.style.display = "none"; wrap.innerHTML = "";
            const list = panel.querySelector("#sec-list");
            if (list) {
              list.querySelector(".admin-empty")?.remove();
              list.insertAdjacentHTML("beforeend", buildSectionCardHtml(data.item));
              wireSectionCards(list);
            }
          } else { status.className = "form-status is-err"; status.textContent = data?.error || "Create failed."; }
        });
      }

      /* ---- Boot ---- */
      if (await loadAll()) renderGalleryView();
    },
  };

  /* ---------- Resource registry ---------- */
  const VIZ_OPTIONS = ["network", "bars", "orbit", "wave"];
  const ACCENT_OPTIONS = ["violet", "cyan"];

  const RESOURCES = {
    profile: profileResource,
    leads: leadsResource,
    gallery: galleryResource,

    stats: listResource({
      resource: "stats",
      title: "Stats",
      hint: "The animated counters shown on the home page.",
      fields: [
        { key: "value", label: "Value", placeholder: "60" },
        { key: "suffix", label: "Suffix", placeholder: "%" },
        { key: "label", label: "Label", placeholder: "Avg. organic traffic lift" },
        { key: "trend", label: "Trend note", placeholder: "across client accounts" },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: `${i.value}${i.suffix || ""} - ${i.label}`, sub: i.trend }),
    }),

    services: listResource({
      resource: "services",
      title: "Services",
      hint: "What you offer - shown on the home page.",
      fields: [
        { key: "icon", label: "Icon — click to choose", type: "icon" },
        { key: "title", label: "Title" },
        { key: "description", label: "Description", type: "textarea", wide: true },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: i.title, sub: i.description }),
    }),

    process: listResource({
      resource: "process",
      title: "Process",
      hint: "Your step-by-step engagement process.",
      fields: [
        { key: "title", label: "Title" },
        { key: "description", label: "Description", type: "textarea", wide: true },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: i.title, sub: i.description }),
    }),

    projects: listResource({
      resource: "projects",
      title: "Projects / Case Studies",
      hint: "Each project is a full case study page at /work/<slug>. Fill in the Challenge → Approach → Results sections for a professional case study layout.",
      fields: [
        { key: "title", label: "Title" },
        { key: "slug", label: "URL slug", placeholder: "(auto from title if left blank)" },
        { key: "category", label: "Industry / category", placeholder: "D2C / E-commerce" },
        { key: "client", label: "Client", placeholder: "Silver jewellery brand" },
        { key: "period", label: "Timeline", placeholder: "Jan 2026 – Jun 2026" },
        { key: "services", label: "Services provided", placeholder: "SEO, Content, CRO", hint: "Comma-separated. Shown as tags in the case study overview." },
        { key: "desc", label: "Short summary", type: "textarea", wide: true, hint: "1–2 sentences. Shown on project cards and under the case study title." },
        { key: "image_url", label: "Cover image (16:9)", type: "image", wide: true, hint: "Shown on the /work cards and at the top of the case study. Leave blank to show the animated visual." },
        { key: "viz", label: "Fallback animation (if no image)", type: "select", options: VIZ_OPTIONS },
        { key: "accent", label: "Accent color", type: "select", options: ACCENT_OPTIONS },
        { key: "metrics", label: "Headline metrics", type: "metrics", wide: true, placeholder: "2.1x | Organic sales", hint: "One per line, as: value | label. Shown in the metrics bar under the hero." },
        { key: "challenge", label: "01 · The Challenge", type: "richtext", wide: true, hint: "Where the client was stuck — the problem you were hired to solve." },
        { key: "approach", label: "02 · The Approach", type: "richtext", wide: true, hint: "What you actually did, step by step. Use headings and lists freely." },
        { key: "results_text", label: "03 · The Results", type: "richtext", wide: true, hint: "The outcome, with numbers. You can insert screenshots with the Image button." },
        { key: "takeaway", label: "Key takeaway", type: "textarea", wide: true, hint: "1–2 sentences. Shown as a highlighted card at the end of the case study." },
        { key: "testimonial", label: "Client testimonial (optional)", type: "textarea", wide: true },
        { key: "testimonial_author", label: "Testimonial author", placeholder: "Founder, D2C jewellery brand" },
        { key: "body", label: "Extra content (optional)", type: "richtext", wide: true, hint: "Shown after the structured sections. Case studies written before the structured fields still live here — you can move that content into the sections above." },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
        { key: "featured", label: "Show in home page highlights", type: "checkbox", default: true },
        {
          key: "schema_markup",
          label: "Custom schema markup (JSON-LD)",
          type: "json",
          wide: true,
          hint: "Optional. Paste any schema.org JSON-LD object (or array) - e.g. a Review or Product node for this case study. Leave blank to skip.",
        },
      ],
      summary: (i) => ({ title: i.title, sub: `${i.category || ""} · /work/${i.slug}` }),
    }),

    posts: listResource({
      resource: "posts",
      title: "Blog",
      hint: "Articles shown on /blog and at /post/<slug>.",
      fields: [
        { key: "title", label: "Title" },
        { key: "slug", label: "URL slug", placeholder: "(auto from title if left blank)" },
        { key: "category", label: "Category", placeholder: "AI & SEO" },
        { key: "excerpt", label: "Excerpt", type: "textarea", wide: true },
        { key: "image_url", label: "Card thumbnail (blog listing page)", type: "image", wide: true, hint: "Shown as the card image on /blog." },
        { key: "blog_image_url", label: "Post hero image (inside the blog post)", type: "image", wide: true, hint: "Large image at the top of the post. Leave blank to reuse the card thumbnail." },
        { key: "body", label: "Article body", type: "richtext", wide: true },
        { key: "viz", label: "Fallback animation (if no image)", type: "select", options: VIZ_OPTIONS },
        { key: "accent", label: "Accent color", type: "select", options: ACCENT_OPTIONS },
        { key: "reading_time", label: "Reading time (min)", type: "number", default: 5 },
        { key: "date", label: "Publish date", type: "date" },
        { key: "published", label: "Published", type: "checkbox", default: true },
        {
          key: "schema_markup",
          label: "Custom schema markup (JSON-LD)",
          type: "json",
          wide: true,
          placeholder: '{\n  "@context": "https://schema.org",\n  "@type": "HowTo",\n  "name": "…"\n}',
          hint: "Optional. Paste any schema.org JSON-LD object - e.g. HowTo, FAQPage or Review - for this specific article. Added alongside the built-in BlogPosting markup. Leave blank to skip.",
        },
      ],
      summary: (i) => ({ title: i.title, sub: `${i.category || ""} · /post/${i.slug}${i.published === false ? " · Draft" : ""}` }),
    }),

    testimonials: listResource({
      resource: "testimonials",
      title: "Testimonials",
      hint: "Client quotes shown on the home page.",
      fields: [
        { key: "quote", label: "Quote", type: "textarea", wide: true },
        { key: "name", label: "Name", placeholder: "Founder" },
        { key: "role", label: "Role / company", placeholder: "D2C Silver Jewellery Brand" },
        { key: "initials", label: "Initials", placeholder: "DS" },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: i.name, sub: i.quote }),
    }),

    skills: listResource({
      resource: "skills",
      title: "Skills",
      hint: "The skill chips shown in the About section.",
      fields: [
        { key: "name", label: "Skill", placeholder: "Technical SEO" },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: i.name }),
    }),

    timeline: listResource({
      resource: "timeline",
      title: "Timeline",
      hint: "Your career timeline shown in the About section.",
      fields: [
        { key: "role", label: "Role" },
        { key: "org", label: "Organization" },
        { key: "period", label: "Period", placeholder: "Sep 2025 - Present" },
        { key: "sort_order", label: "Order", type: "number", default: 0 },
      ],
      summary: (i) => ({ title: i.role, sub: `${i.org || ""} · ${i.period || ""}` }),
    }),
  };

  /* ---------- Boot ---------- */
  (async function init() {
    const { ok, data } = await window.API.checkAuth();
    if (ok && data?.authenticated) showDashboard();
    else showLogin();
  })();
})();
