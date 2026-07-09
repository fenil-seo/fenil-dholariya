/* =================================================================
   POST PAGE - resolves the slug from the URL, renders the article
   instantly from seed data when available, then refreshes from the
   live API in case an admin has edited it.
   ================================================================= */
(() => {
  "use strict";

  function getSlug() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "post" && parts[1]) return decodeURIComponent(parts[1]);
    const qs = new URLSearchParams(window.location.search).get("slug");
    return qs ? decodeURIComponent(qs) : null;
  }

  function findSeedPost(slug) {
    return (window.SITE_DATA?.posts || []).find((p) => p.slug === slug) || null;
  }

  function renderPost(post) {
    const R = window.Render;
    document.getElementById("postCategory").textContent = post.category || "Article";
    document.getElementById("postTitle").textContent = post.title;
    document.getElementById("postMeta").innerHTML =
      `<span>${R.esc(R.fmtDate(post.date))}</span><span>·</span><span>${R.esc(post.reading_time || 5)} min read</span>`;

    const heroWrap = document.getElementById("postHeroWrap");
    if (post.image_url) {
      // No reveal class — image animates in via CSS keyframe so it's never stuck invisible
      heroWrap.innerHTML = `<div class="post-hero-img"><img src="${R.esc(post.image_url)}" alt="${R.esc(post.title)}" loading="eager"></div>`;
    } else {
      heroWrap.innerHTML = `<div class="article-cover viz reveal" data-delay="2" data-viz="${R.esc(post.viz || "network")}" data-accent="${R.esc(post.accent || "violet")}"></div>`;
    }

    document.getElementById("postBody").innerHTML = post.body || `<p>${R.esc(post.excerpt || "")}</p>`;

    document.title = `${post.title} - Fenil Dholariya`;
    setMeta("metaDesc", "content", post.excerpt || "");
    setMeta("ogTitle2", "content", post.title);
    setMeta("ogDesc", "content", post.excerpt || "");
    setMeta("twitterTitle", "content", post.title);
    setMeta("twitterDesc", "content", post.excerpt || "");
    const canonical = document.getElementById("metaCanonical");
    if (canonical) canonical.href = `https://fenil-dholariya.vercel.app/post/${post.slug}`;

    const S = window.Schema;
    if (S) {
      S.setScript("ldJson", S.blogPostingNode(post));
      S.setScript(
        "ldJsonBreadcrumb",
        S.breadcrumbNode([
          { name: "Home", url: `${S.SITE_URL}/` },
          { name: "Blog", url: `${S.SITE_URL}/blog` },
          { name: post.title, url: `${S.SITE_URL}/post/${post.slug}` },
        ])
      );
      S.setScript("ldJsonCustom", post.schema_markup || null);
    }

    renderRelated(post.slug);
    window.refreshAnimations?.();
  }

  function renderRelated(currentSlug) {
    const all = window.SITE_DATA?.posts || [];
    const related = all.filter((p) => p.slug !== currentSlug).slice(0, 3);
    const el = document.getElementById("relatedPosts");
    if (el && related.length) el.innerHTML = related.map((p, i) => window.Render.postCard(p, i)).join("");
  }

  function setMeta(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  function showNotFound() {
    document.getElementById("postCategory").textContent = "Not found";
    document.getElementById("postTitle").textContent = "This article doesn't exist (yet).";
    document.getElementById("postBody").innerHTML =
      `<p>It may have been moved or unpublished. <a class="text-link" href="/blog">Browse the blog →</a></p>`;
    document.getElementById("postHeroWrap").style.display = "none";
    window.refreshAnimations?.();
  }

  const slug = getSlug();
  if (!slug) { showNotFound(); return; }

  const seedPost = findSeedPost(slug);
  if (seedPost) renderPost(seedPost);

  if (window.API) {
    window.API.getPost(slug).then(({ ok, data }) => {
      if (ok && data?.post) renderPost(data.post);
      else if (!seedPost) showNotFound();
    }).catch(() => { if (!seedPost) showNotFound(); });
  } else if (!seedPost) {
    showNotFound();
  }
})();
