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
    document.body.classList.remove("article-not-found");
    document.getElementById("postCategory").textContent = post.category || "Article";
    document.getElementById("postTitle").textContent = post.title;
    document.getElementById("postExcerpt").textContent = post.excerpt || "";
    document.getElementById("postMeta").innerHTML =
      `<span>${R.esc(R.fmtDate(post.date))}</span><span>·</span><span>${R.esc(post.reading_time || 5)} min read</span>`;

    const heroWrap = document.getElementById("postHeroWrap");
    const vizFallback = () => {
      heroWrap.innerHTML = R.editorialCover(post, "article-cover");
      window.refreshAnimations?.();
    };
    function tryHeroUrl(url) {
      if (!url) { vizFallback(); return; }
      heroWrap.innerHTML = `<div class="post-hero-img post-hero-img--editorial editorial-media ${R.mediaClass(post.slug)}"><img src="${R.esc(url)}" alt="Editorial image for ${R.esc(post.title)}" width="1600" height="900" loading="eager" fetchpriority="high" decoding="async"><span class="media-context-label">Editorial context photo</span></div>`;
      heroWrap.querySelector("img").addEventListener("error", () => {
        console.warn("[post] hero image failed, using the editorial cover:", url);
        vizFallback();
      });
    }
    const heroImage = R.postMediaUrl(post);
    if (heroImage) {
      tryHeroUrl(heroImage);
    } else {
      heroWrap.innerHTML = R.editorialCover(post, "article-cover reveal");
    }

    document.getElementById("postBody").innerHTML = post.body ? R.stripGalleryImages(post.body) : `<p>${R.esc(post.excerpt || "")}</p>`;
    const headings = [...document.querySelectorAll("#postBody h2")];
    headings.forEach((heading, index) => { heading.id = `article-section-${index + 1}`; });
    document.getElementById("articleToc").innerHTML = headings.map(heading =>
      `<a href="#${heading.id}">${R.esc(heading.textContent)}</a>`).join("");
    document.getElementById("articleContents").hidden = !headings.length;

    document.title = `${post.title} - Fenil Dholariya`;
    setMeta("metaDesc", "content", post.excerpt || "");
    setMeta("ogTitle2", "content", post.title);
    setMeta("ogDesc", "content", post.excerpt || "");
    setMeta("twitterTitle", "content", post.title);
    setMeta("twitterDesc", "content", post.excerpt || "");
    const socialImage = new URL(heroImage || "/assets/og.png", "https://fenil-dholariya.vercel.app").href;
    setMeta("ogImage", "content", socialImage);
    setMeta("twitterImage", "content", socialImage);
    setMeta("ogUrl", "content", `https://fenil-dholariya.vercel.app/post/${post.slug}`);
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
    if (el) {
      el.innerHTML = related.map((p, i) => window.Render.postCard(p, i)).join("");
      // Rebind cards and lazy images replaced by the live catalogue refresh.
      window.refreshAnimations?.();
    }
  }

  function setMeta(id, attr, value) {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  }

  function showNotFound() {
    document.body.classList.add("article-not-found");
    document.getElementById("postCategory").textContent = "Not found";
    document.getElementById("postTitle").textContent = "This article doesn't exist (yet).";
    document.getElementById("postBody").innerHTML =
      `<p>It may have been moved or unpublished. <a class="text-link" href="/blog">Browse the blog →</a></p>`;
    document.getElementById("postHeroWrap").style.display = "none";
    window.refreshAnimations?.();
  }

  const slug = getSlug();
  if (!slug) { showNotFound(); return; }

  document.getElementById("copyArticleLink")?.addEventListener("click", async () => {
    const status = document.getElementById("shareStatus");
    try {
      await navigator.clipboard.writeText(document.getElementById("metaCanonical").href);
      status.textContent = "Link copied.";
    } catch {
      status.textContent = "Copy the address from your browser to share this article.";
    }
  });
  window.addEventListener("content:hydrated", () => renderRelated(slug));

  // The server has already rendered the current published article and metadata.
  if (document.body.dataset.serverRendered === "post") {
    const hero = document.querySelector('#postHeroWrap img');
    const fallback = () => {
      document.getElementById('postHeroWrap').innerHTML = window.Render.editorialCover(findSeedPost(slug) || { slug }, 'article-cover');
    };
    if (hero) {
      hero.addEventListener('error', fallback, { once: true });
      if (hero.complete && !hero.naturalWidth) fallback();
    }
    return;
  }

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
