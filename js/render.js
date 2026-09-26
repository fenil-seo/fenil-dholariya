/* Content renderers for static fallback and database hydration */
window.Render = (() => {
  "use strict";

  function esc(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(value) {
    try {
      return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  }

  const ICONS = {
    audit: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6M11 8v6"/>',
    content: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    local: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    funnel: '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>',
    ai: '<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
    research: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    strategy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    analytics: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    sem: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
    web: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
    seo: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
  };

  const PROJECT_MEDIA = {
    "d2c-silver-jewellery": "/assets/media/case-d2c-jewellery.webp",
    "local-construction-gmb": "/assets/media/case-local-construction.webp",
    "b2b-saas-pipeline": "/assets/media/case-b2b-saas.webp",
    "ayurvedic-technical-seo": "/assets/media/case-ayurveda.webp"
  };

  const POST_MEDIA = {
    "ai-seo-workflow-that-moves-rankings": "/assets/media/article-ai-seo.webp",
    "local-seo-2026-map-pack": "/assets/media/article-local-seo.webp",
    "technical-seo-audit-checklist": "/assets/media/article-technical-seo.webp",
    "content-that-converts": "/assets/media/article-content.webp"
  };

  const POST_COVER_COPY = {
    "ai-seo-workflow-that-moves-rankings": ["01", "Human systems / AI speed"],
    "local-seo-2026-map-pack": ["02", "Three positions / one decision"],
    "technical-seo-audit-checklist": ["03", "Find the ranking ceiling"],
    "content-that-converts": ["04", "Intent before volume"]
  };

  function normalizeAssetUrl(value) {
    let url = String(value || "").trim().replace(/\\/g, "/")
      .replace(/AI(?:%20| )Searches(\d*)\.webp/gi, (_, number) => `ai-searches-${number || "1"}.webp`)
      .replace(/Lead(?:%20| )generation(?:%20| )bsuiness(?:(?:%20| )(\d+))?\.webp/gi, (_, number) => `lead-generation-business-${number || "1"}.webp`);
    // CMS uploads are site assets, never relative to /post/:slug or /work/:slug.
    url = url.replace(/^(?:\.\.\/|\.\/)+/, "");
    if (/^assets\//i.test(url)) url = `/${url}`;
    if (!/^(?:\/(?!\/)|https?:\/\/)/i.test(url)) return "";
    try { return new URL(url, "https://fenil-dholariya.vercel.app").href.replace(/^https:\/\/fenil-dholariya\.vercel\.app(?=\/)/, ""); }
    catch { return ""; }
  }

  function isGalleryAsset(value) {
    let normalized = String(value || "").replace(/\\/g, "/");
    try { normalized = decodeURIComponent(normalized); } catch {}
    return /(?:^|\/)assets\/gallery\//i.test(normalized);
  }

  function mediaClass(slug) {
    const safeSlug = String(slug || "editorial").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    return `media--${safeSlug || "editorial"}`;
  }

  function projectMediaUrl(project) {
    const approved = PROJECT_MEDIA[project?.slug];
    if (approved) return approved;
    const candidate = normalizeAssetUrl(project?.image_url || "");
    return isGalleryAsset(candidate) ? "" : candidate;
  }

  function postMediaUrl(post) {
    const candidates = [post?.blog_image_url, post?.image_url]
      .map(normalizeAssetUrl)
      .filter((url) => url && !isGalleryAsset(url));
    return candidates[0] || POST_MEDIA[post?.slug] || "";
  }

  function stripGalleryImages(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    template.content.querySelectorAll("img").forEach((image) => {
      if (isGalleryAsset(image.getAttribute("src"))) image.remove();
    });
    return template.innerHTML;
  }

  function editorialCover(post, extraClass = "") {
    const copy = POST_COVER_COPY[post?.slug] || ["FIELD NOTE", post?.category || "Organic growth"];
    return `<div class="editorial-cover ${esc(extraClass)}" aria-hidden="true">
      <span class="editorial-cover__number">${esc(copy[0])}</span>
      <span class="editorial-cover__topic">${esc(post?.category || "Insight")}</span>
      <strong>${esc(copy[1])}</strong>
      <i></i>
    </div>`;
  }

  function renderStats(stats, target) {
    if (!target || !stats?.length) return;
    target.innerHTML = stats.map((item, index) => `
      <div class="stat reveal is-in" data-delay="${index % 4}">
        <div class="stat__num" data-count="${esc(item.value)}" data-suffix="${esc(item.suffix || "")}">${esc(item.value)}<span class="unit">${esc(item.suffix || "")}</span></div>
        <div class="stat__label">${esc(item.label)}</div>
        ${item.trend ? `<div class="stat__trend">${esc(item.trend)}</div>` : ""}
      </div>`).join("");
  }

  function renderServices(services, target) {
    if (!target || !services?.length) return;
    target.innerHTML = services.map((item, index) => `
      <article class="service reveal is-in">
        <div class="service__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${ICONS[item.icon] || ICONS.audit}</svg></div>
        <div>
          <div class="service__num">${String(index + 1).padStart(2, "0")}</div>
          <h3 class="service__title">${esc(item.title)}</h3>
          <p class="service__desc">${esc(item.desc)}</p>
        </div>
      </article>`).join("");
  }

  function renderProcess(steps, target) {
    if (!target || !steps?.length) return;
    target.innerHTML = steps.map((item, index) => `
      <article class="process__step reveal is-in" data-delay="${index}">
        <div class="process__index">STEP ${String(index + 1).padStart(2, "0")}</div>
        <h3>${esc(item.title)}</h3>
        <p class="text-muted">${esc(item.desc)}</p>
        <div class="process__bar"></div>
      </article>`).join("");
  }

  function projectEvidence(project, className) {
    const image = projectMediaUrl(project);
    if (image) {
      return `<div class="${className} ${className}--img editorial-media ${mediaClass(project.slug)}"><img src="${esc(image)}" alt="Editorial context image representing ${esc(project.category || project.title)}" width="1600" height="1067" loading="lazy" decoding="async"><span class="media-context-label">Editorial context photo · Not client photography</span></div>`;
    }
    return editorialCover({ slug: project.slug, category: project.category }, className);
  }

  function renderProjects(projects, target, options = {}) {
    if (!target || !projects?.length) return;
    if (options.full) {
      const indexCopy = {
        "d2c-silver-jewellery": ["commerce", "D2C silver jewellery", "Product-page architecture and search-led content for a jewellery brand."],
        "local-construction-gmb": ["local", "Construction & fencing", "Google Business Profile, review processes and location pages for a local contractor."],
        "b2b-saas-pipeline": ["b2b", "B2B software", "Search intent, editorial planning and nurture journeys connected to the buying process."],
        "ayurvedic-technical-seo": ["commerce", "Ayurvedic commerce", "Crawl, indexation and performance improvements to strengthen an existing website."]
      };
      target.innerHTML = projects.filter(project => project.slug).map((project, index) => {
        const [category, title, description] = indexCopy[project.slug] || ["other", project.title, project.desc];
        const metric = project.metrics?.[0];
        const image = projectMediaUrl(project);
        const href = `/work/${encodeURIComponent(project.slug)}`;
        return `<article class="work-project" data-work-category="${esc(category)}">
          <a class="work-project__image" href="${href}" tabindex="-1" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="" width="1600" height="1067" loading="${index < 2 ? "eager" : "lazy"}" decoding="async">` : editorialCover(project)}<span aria-hidden="true">↗</span></a>
          <div class="work-project__meta"><span>${esc(project.category)}</span><span>${String(index + 1).padStart(2, "0")}</span></div>
          <h2><a href="${href}">${esc(title)}</a></h2><p>${esc(description)}</p>
          <div class="work-project__outcome">${metric ? `<p><strong>${esc(metric.value)}</strong><span>${esc(metric.label)}</span></p>` : ""}<a class="text-link" href="${href}" aria-label="Read ${esc(title)} case study">View case study <span aria-hidden="true">↗</span></a></div>
        </article>`;
      }).join("");
      return;
    }

    target.innerHTML = projects.map((project, index) => `
      <a class="project reveal is-in" data-delay="${index % 4}" href="/work/${esc(project.slug)}">
        ${projectEvidence(project, "project__media")}
        <div class="project__body">
          <span class="tag">${esc(project.category)}</span>
          <h3 class="project__title">${esc(project.title)}</h3>
          <p class="project__desc">${esc(project.desc)}</p>
          <div class="project__metrics">${(project.metrics || []).slice(0, 3).map((metric) => `<div class="project__metric"><b>${esc(metric.value)}</b><span>${esc(metric.label)}</span></div>`).join("")}</div>
        </div>
      </a>`).join("");
  }

  function postCard(post, delay = 0) {
    const image = postMediaUrl(post);
    const media = image
      ? `<div class="post-card__media post-card__media--img editorial-media ${mediaClass(post.slug)}"><img src="${esc(image)}" alt="Editorial image for ${esc(post.title)}" width="1200" height="800" loading="lazy" decoding="async"><span class="media-context-label">Editorial context photo</span></div>`
      : editorialCover(post, "post-card__media");
    return `<a class="post-card reveal is-in" data-delay="${delay}" href="/post/${esc(post.slug)}" data-category="${esc(post.category)}">
      ${media}
      <div class="post-card__body">
        <div class="post-card__meta"><span class="post-card__cat">${esc(post.category)}</span><span>·</span><span>${esc(fmtDate(post.date))}</span><span>·</span><span>${esc(post.reading_time || 5)} min</span></div>
        <h3 class="post-card__title">${esc(post.title)}</h3>
        <p class="post-card__excerpt">${esc(post.excerpt)}</p>
        <div class="post-card__foot"><span>Read article</span><span aria-hidden="true">↗</span></div>
      </div>
    </a>`;
  }

  function renderPosts(posts, target) {
    if (!target || !posts?.length) return;
    target.innerHTML = posts.map((post, index) => postCard(post, index % 4)).join("");
  }

  function renderTestimonials(items, target) {
    if (!target || !items?.length) return;
    target.innerHTML = items.slice(0, 3).map((item, index) => `
      <article class="quote reveal is-in" data-delay="${index}">
        <div class="quote__mark" aria-hidden="true">“</div>
        <p class="quote__text">${esc(item.quote)}</p>
        <div class="quote__by"><div class="quote__avatar">${esc(item.initials || "FD")}</div><div><div class="quote__name">${esc(item.name || "Anonymized client")}</div><div class="quote__role">${esc(item.role || "Client")}</div></div></div>
      </article>`).join("");
  }

  function renderSkills(skills, target) {
    if (!target || !skills?.length) return;
    target.innerHTML = skills.map((item) => `<span class="chip reveal is-in">${esc(item)}</span>`).join("");
  }

  function renderTimeline(items, target) {
    if (!target || !items?.length) return;
    target.innerHTML = items.map((item) => `
      <div class="tl-item reveal is-in">
        <div class="tl-rail"><div class="tl-dot"></div></div>
        <div><div class="tl-role">${esc(item.role)} · ${esc(item.org)}</div><div class="tl-meta">${esc(item.period)}</div></div>
      </div>`).join("");
  }

  return {
    esc,
    fmtDate,
    renderStats,
    renderServices,
    renderProcess,
    renderProjects,
    renderPosts,
    postCard,
    renderTestimonials,
    renderSkills,
    renderTimeline,
    projectMediaUrl,
    postMediaUrl,
    stripGalleryImages,
    mediaClass,
    normalizeAssetUrl,
    editorialCover
  };
})();

(() => {
  "use strict";
  if (!window.API?.getContent) return;

  window.API.getContent().then(({ ok, data }) => {
    if (!ok || !data) return;
    const R = window.Render;
    const target = (selector) => document.querySelector(selector);
    const canHydrate = (element) => Boolean(element && !element.hasAttribute("data-static"));

    const stats = target("#statsGrid");
    const services = target("#servicesList");
    const process = target(".process");
    const work = target("#workGrid");
    const cases = target("#caseList");
    const posts = target("#postsGrid");
    const testimonials = target("#testimonials");
    const skills = target("#skillsList");
    const timeline = target("#timeline");

    if (data.stats && canHydrate(stats)) R.renderStats(data.stats, stats);
    if (data.services && canHydrate(services)) R.renderServices(data.services, services);
    if (data.process && canHydrate(process)) R.renderProcess(data.process, process);
    if (data.projects && canHydrate(work)) R.renderProjects(data.projects.filter((item) => item.featured !== false), work);
    if (data.projects && canHydrate(cases)) R.renderProjects(data.projects, cases, { full: true });
    if (data.posts && canHydrate(posts)) R.renderPosts(data.posts, posts);
    if (data.testimonials && canHydrate(testimonials)) R.renderTestimonials(data.testimonials, testimonials);
    if (data.skills && canHydrate(skills)) R.renderSkills(data.skills, skills);
    if (data.timeline && canHydrate(timeline)) R.renderTimeline(data.timeline, timeline);

    if (data.profile) {
      document.querySelectorAll("[data-bind='email']").forEach((node) => { node.textContent = data.profile.email || node.textContent; });
      document.querySelectorAll("[data-bind='phone']").forEach((node) => { node.textContent = data.profile.phone || node.textContent; });
    }

    const refreshName = { home: "refreshHome", work: "refreshWork", blog: "refreshBlog" }[document.body.dataset.page];
    if (refreshName && window.Schema?.[refreshName]) window.Schema[refreshName](data);
    window.SITE_DATA = { ...window.SITE_DATA, ...data };
    window.dispatchEvent(new CustomEvent("content:hydrated", { detail: data }));
  }).catch(() => {
    /* Static content remains available when the API is offline. */
  });
})();
