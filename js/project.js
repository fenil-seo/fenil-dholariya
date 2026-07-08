/* =================================================================
   PROJECT PAGE - resolves the slug from the URL path (/work/<slug>),
   renders the case study from seed data immediately, then refreshes
   from the live API in case content has changed.
   ================================================================= */
(() => {
  "use strict";

  function getSlug() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "work" && parts[1]) return decodeURIComponent(parts[1]);
    const qs = new URLSearchParams(window.location.search).get("slug");
    return qs ? decodeURIComponent(qs) : null;
  }

  function findSeedProject(slug) {
    return (window.SITE_DATA?.projects || []).find((p) => p.slug === slug) || null;
  }

  function renderProject(project) {
    const R = window.Render;

    const catEl = document.getElementById("projectCategory");
    catEl.textContent = project.category || "Case Study";

    const clientEl = document.getElementById("projectClient");
    clientEl.textContent = project.client ? `Client · ${project.client}` : "";

    document.getElementById("projectTitle").textContent = project.title;
    document.getElementById("projectDesc").textContent = project.desc || "";

    // Hero: image or viz animation
    const heroWrap = document.getElementById("projectHeroWrap");
    if (project.image_url) {
      heroWrap.innerHTML = `<div class="post-hero-img reveal" data-delay="2"><img src="${R.esc(project.image_url)}" alt="${R.esc(project.title)}" loading="eager"></div>`;
    } else {
      heroWrap.innerHTML = `<div class="article-cover viz reveal" data-delay="2" data-viz="${R.esc(project.viz || "network")}" data-accent="${R.esc(project.accent || "violet")}"></div>`;
    }

    // Metrics bar
    const metrics = project.metrics || [];
    const metricsSection = document.getElementById("projectMetricsSection");
    const metricsEl = document.getElementById("projectMetrics");
    if (metrics.length) {
      metricsEl.innerHTML = metrics.map((m) =>
        `<div class="project-metric-item"><b>${R.esc(m.value)}</b><span>${R.esc(m.label)}</span></div>`
      ).join("");
      metricsSection.style.display = "";
    }

    // Body prose
    const bodySection = document.getElementById("projectBodySection");
    const bodyEl = document.getElementById("projectBody");
    if (project.body) {
      bodyEl.innerHTML = project.body;
      bodySection.style.display = "";
    }

    // Page meta
    document.title = `${project.title} - Fenil Dholariya`;
    setMeta("metaDesc", "content", project.desc || "");
    setMeta("ogTitle", "content", project.title);
    setMeta("ogDesc", "content", project.desc || "");
    setMeta("twitterTitle", "content", project.title);
    setMeta("twitterDesc", "content", project.desc || "");
    if (project.image_url) {
      const abs = project.image_url.startsWith("http") ? project.image_url : `https://fenil-dholariya.vercel.app${project.image_url}`;
      setMeta("ogImage", "content", abs);
      setMeta("twitterImage", "content", abs);
    }
    const canonical = document.getElementById("metaCanonical");
    if (canonical) canonical.href = `https://fenil-dholariya.vercel.app/work/${project.slug}`;

    const S = window.Schema;
    if (S) {
      S.setScript("ldJsonBreadcrumb", S.breadcrumbNode([
        { name: "Home", url: `${S.SITE_URL}/` },
        { name: "Work", url: `${S.SITE_URL}/work` },
        { name: project.title, url: `${S.SITE_URL}/work/${project.slug}` },
      ]));
      S.setScript("ldJsonCustom", project.schema_markup || null);
    }

    renderRelated(project.slug);
    window.refreshAnimations?.();
  }

  function renderRelated(currentSlug) {
    const all = window.SITE_DATA?.projects || [];
    const related = all.filter((p) => p.slug !== currentSlug).slice(0, 3);
    const el = document.getElementById("relatedProjects");
    if (el && related.length) {
      window.Render.renderProjects(related, el);
    }
  }

  function setMeta(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  function showNotFound() {
    document.getElementById("projectTitle").textContent = "Case study not found.";
    document.getElementById("projectDesc").textContent = "This project may have been moved or unpublished.";
    document.getElementById("projectHeroWrap").style.display = "none";
    const body = document.getElementById("projectBodySection");
    body.style.display = "";
    document.getElementById("projectBody").innerHTML =
      `<p><a class="text-link" href="/work">Browse all case studies →</a></p>`;
    window.refreshAnimations?.();
  }

  const slug = getSlug();
  if (!slug) { showNotFound(); return; }

  const seedProject = findSeedProject(slug);
  if (seedProject) renderProject(seedProject);

  if (window.API) {
    window.API.getProject(slug).then(({ ok, data }) => {
      if (ok && data?.project) renderProject(data.project);
      else if (!seedProject) showNotFound();
    }).catch(() => { if (!seedProject) showNotFound(); });
  } else if (!seedProject) {
    showNotFound();
  }
})();
