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
    audit: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6M11 8v6"/>',
    content: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    local: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    funnel: '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>',
    ai: '<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
    research: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
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
