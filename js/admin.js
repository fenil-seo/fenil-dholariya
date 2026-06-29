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
    return `<div class="field"><label>${esc(f.label)}</label><input class="input" type="${f.type || "text"}" data-field="${esc(f.key)}" value="${esc(value)}" placeholder="${esc(f.placeholder || "")}" /></div>`;
  }

  function readForm(container, fields) {
    const data = {};
    fields.forEach((f) => {
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

  /* ---------- Resource registry ---------- */
  const VIZ_OPTIONS = ["network", "bars", "orbit", "wave"];
  const ACCENT_OPTIONS = ["violet", "cyan"];

  const RESOURCES = {
    profile: profileResource,
    leads: leadsResource,

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
        { key: "icon", label: "Icon", type: "select", options: ["audit", "content", "local", "funnel", "ai", "research"] },
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
      title: "Projects",
      hint: "Case studies shown on the home page and /work.",
      fields: [
        { key: "title", label: "Title" },
        { key: "slug", label: "URL slug", placeholder: "(auto from title if left blank)" },
        { key: "category", label: "Category", placeholder: "D2C / E-commerce" },
        { key: "client", label: "Client", placeholder: "Silver jewellery brand" },
        { key: "desc", label: "Description", type: "textarea", wide: true },
        { key: "viz", label: "Visual", type: "select", options: VIZ_OPTIONS },
        { key: "accent", label: "Accent color", type: "select", options: ACCENT_OPTIONS },
        { key: "metrics", label: "Metrics", type: "metrics", wide: true, placeholder: "2.1x | Organic sales", hint: "One per line, as: value | label" },
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
        { key: "body", label: "Body (HTML)", type: "textarea", wide: true, hint: "Tags like <p>, <h2>, <em>, <strong>, <a> are allowed.", placeholder: "<p>Article content…</p>" },
        { key: "viz", label: "Visual", type: "select", options: VIZ_OPTIONS },
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
