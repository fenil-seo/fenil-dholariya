/* =================================================================
   RENDER - turns content JSON (seed or Neon-backed API) into DOM.
   Used for the initial static fallback AND to hydrate sections live
   when the admin panel has edited content in Postgres.
   ================================================================= */
window.Render = (() => {
  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return ""; }
  }

  const ICONS = {
    /* ── Core SEO ── */
    audit:       '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6M11 8v6"/>',
    content:     '<path d="M4 6h16M4 12h16M4 18h10"/>',
    local:       '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    funnel:      '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>',
    keyword:     '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    backlink:    '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>',
    ranking:     '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    /* ── AI & research ── */
    ai:          '<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
    research:    '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    chatbot:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    automation:  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    /* ── Strategy & analytics ── */
    strategy:    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    analytics:   '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    trend:       '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    report:      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
    dashboard:   '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    data:        '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    pie:         '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    /* ── Paid & performance ── */
    sem:         '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
    cro:         '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    campaign:    '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
    ab:          '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>',
    remarketing: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    affiliate:   '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    /* ── Digital channels ── */
    email:       '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    social:      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    video:       '<path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    mobile:      '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    push:        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    influencer:  '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    /* ── Brand, commerce & PR ── */
    brand:       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    ecommerce:   '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    pr:          '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    /* ── Web & tech ── */
    web:         '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
    vibecoding:  '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/><path d="M19 3l.75 1.75L21.5 5.5l-1.75.75L19 8l-.75-1.75L16.5 5.5l1.75-.75L19 3z"/>',
    ux:          '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
    speed:       '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    /* ── More marketing & data ── */
    seo:         '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    digital:     '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    datavis:     '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 13v-3M12 13V7M17 13v-5"/>',
  };

  function renderStats(stats, el) {
    if (!el || !stats?.length) return;
    el.innerHTML = stats.map((s, i) => `
      <div class="stat glass reveal is-in" data-delay="${i % 5}">
        <div class="stat__num" data-count="${esc(s.value)}" data-suffix="${esc(s.suffix || "")}">${esc(s.value)}<span class="unit">${esc(s.suffix || "")}</span></div>
        <div class="stat__label">${esc(s.label)}</div>
        ${s.trend ? `<div class="stat__trend">${esc(s.trend)}</div>` : ""}
      </div>`).join("");
  }

  function renderServices(services, el) {
    if (!el || !services?.length) return;
    el.innerHTML = services.map((s, i) => `
      <div class="service reveal is-in" data-cursor>
        <div class="service__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${ICONS[s.icon] || ICONS.audit}</svg></div>
        <div>
          <div class="service__num">${String(i + 1).padStart(2, "0")}</div>
          <h3 class="service__title">${esc(s.title)}</h3>
          <p class="service__desc">${esc(s.desc)}</p>
        </div>
        <svg class="service__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </div>`).join("");
  }

  function renderProcess(steps, el) {
    if (!el || !steps?.length) return;
    el.innerHTML = steps.map((p, i) => `
      <div class="process__step glass reveal is-in" data-delay="${i}">
        <div class="process__index">STEP ${String(i + 1).padStart(2, "0")}</div>
        <h3>${esc(p.title)}</h3>
        <p class="text-muted">${esc(p.desc)}</p>
        <div class="process__bar"></div>
      </div>`).join("");
  }

  function renderProjects(projects, el, { full = false } = {}) {
    if (!el || !projects?.length) return;
    if (full) {
      el.innerHTML = projects.map((p) => {
        const media = p.image_url
          ? `<div class="case__media case__media--img"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></div>`
          : `<div class="case__media viz" data-viz="${esc(p.viz || "network")}" data-accent="${esc(p.accent || "violet")}"></div>`;
        const link = p.slug
          ? `<a class="case__readmore" href="/work/${esc(p.slug)}">Read case study →</a>`
          : "";
        return `
        <article class="case reveal is-in">
          ${media}
          <div>
            <span class="tag">${esc(p.category)}</span>
            <div class="case__client">CLIENT - ${esc(p.client || "")}</div>
            <h2 class="case__title">${esc(p.title)}</h2>
            <p class="case__desc text-soft">${esc(p.desc)}</p>
            <div class="case__metrics">
              ${(p.metrics || []).map((m) => `<div class="case__metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join("")}
            </div>
            ${link}
          </div>
        </article>`;
      }).join("");
    } else {
      el.innerHTML = projects.map((p, i) => {
        const media = p.image_url
          ? `<div class="project__media project__media--img"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"><span class="project__tag">${esc(p.category)}</span></div>`
          : `<div class="project__media viz" data-viz="${esc(p.viz || "network")}" data-accent="${esc(p.accent || "violet")}"><span class="project__tag">${esc(p.category)}</span></div>`;
        return `
        <article class="project reveal is-in" data-delay="${i % 5}" data-cursor>
          ${media}
          <div class="project__body">
            <h3 class="project__title">${esc(p.title)}</h3>
            <p class="project__desc">${esc(p.desc)}</p>
            <div class="project__metrics">
              ${(p.metrics || []).slice(0, 3).map((m) => `<div class="project__metric"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join("")}
            </div>
          </div>
        </article>`;
      }).join("");
    }
  }

  function postCard(p, delay) {
    const media = p.image_url
      ? `<div class="post-card__media post-card__media--img"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></div>`
      : `<div class="post-card__media viz" data-viz="${esc(p.viz || "network")}" data-accent="${esc(p.accent || "violet")}"></div>`;
    return `
      <a class="post-card reveal is-in" ${delay ? `data-delay="${delay}"` : ""} href="/post/${esc(p.slug)}" data-category="${esc(p.category)}" data-cursor>
        ${media}
        <div class="post-card__body">
          <div class="post-card__meta"><span class="post-card__cat">${esc(p.category)}</span><span>·</span><span>${esc(fmtDate(p.date))}</span><span>·</span><span>${esc(p.reading_time || 5)} min</span></div>
          <h3 class="post-card__title">${esc(p.title)}</h3>
          <p class="post-card__excerpt">${esc(p.excerpt)}</p>
          <div class="post-card__foot"><span>Read article</span><span>→</span></div>
        </div>
      </a>`;
  }

  function renderPosts(posts, el) {
    if (!el || !posts?.length) return;
    el.innerHTML = posts.map((p, i) => postCard(p, i % 5)).join("");
  }

  function renderTestimonials(items, el) {
    if (!el || !items?.length) return;
    el.innerHTML = items.map((t, i) => `
      <div class="quote glass reveal is-in" data-delay="${i % 5}">
        <div class="quote__mark">"</div>
        <p class="quote__text" style="font-size:1.15rem">${esc(t.quote)}</p>
        <div class="quote__by">
          <div class="quote__avatar">${esc(t.initials || "")}</div>
          <div><div class="quote__name">${esc(t.name)}</div><div class="quote__role">${esc(t.role)}</div></div>
        </div>
      </div>`).join("");
  }

  function renderSkills(skills, el) {
    if (!el || !skills?.length) return;
    el.innerHTML = skills.map((s) => `<span class="chip reveal is-in">${esc(s)}</span>`).join("");
  }

  function renderTimeline(items, el) {
    if (!el || !items?.length) return;
    el.innerHTML = items.map((t) => `
      <div class="tl-item reveal is-in">
        <div class="tl-rail"><div class="tl-dot"></div></div>
        <div><div class="tl-role">${esc(t.role)} · ${esc(t.org)}</div><div class="tl-meta">${esc(t.period)}</div></div>
      </div>`).join("");
  }

  return {
    esc, fmtDate,
    renderStats, renderServices, renderProcess, renderProjects, renderPosts, postCard,
    renderTestimonials, renderSkills, renderTimeline,
  };
})();

/* ---------- Hydration: swap seed content for live DB content ---------- */
(function hydrate() {
  if (!window.API) return;

  window.API.getContent().then(({ ok, data }) => {
    if (!ok || !data) return; // DB not connected yet - static seed content stands.

    const R = window.Render;
    if (data.stats) R.renderStats(data.stats, document.getElementById("statsGrid"));
    if (data.services) R.renderServices(data.services, document.getElementById("servicesList"));
    if (data.process) R.renderProcess(data.process, document.querySelector(".process"));
    if (data.projects) {
      R.renderProjects(data.projects.filter((p) => p.featured !== false), document.getElementById("workGrid"));
      R.renderProjects(data.projects, document.getElementById("caseList"), { full: true });
    }
    if (data.posts) R.renderPosts(data.posts, document.getElementById("postsGrid"));
    if (data.testimonials) R.renderTestimonials(data.testimonials, document.getElementById("testimonials"));
    if (data.skills) R.renderSkills(data.skills, document.getElementById("skillsList"));
    if (data.timeline) R.renderTimeline(data.timeline, document.getElementById("timeline"));

    if (data.profile) {
      const p = data.profile;
      document.querySelectorAll("[data-bind='email']").forEach((n) => (n.textContent = p.email));
      document.querySelectorAll("[data-bind='phone']").forEach((n) => (n.textContent = p.phone));

      const badge = document.getElementById("availabilityBadge");
      const badgeText = document.getElementById("availabilityText");
      if (badge && badgeText && p.availableText) {
        badgeText.textContent = p.availableText;
        badge.classList.toggle("is-unavailable", p.available === false);
      }
    }

    const schemaRefresh = { home: "refreshHome", work: "refreshWork", blog: "refreshBlog" }[document.body.dataset.page];
    if (schemaRefresh && window.Schema) window.Schema[schemaRefresh](data);

    window.dispatchEvent(new CustomEvent("content:hydrated"));
  }).catch(() => { /* offline or DB not configured - seed content already rendered */ });
})();
