/* The journal uses the actual published catalogue for features and filters. */
(() => {
  "use strict";
  const grid = document.getElementById("postsGrid");
  if (!grid) return;
  const R = window.Render;
  const search = document.getElementById("articleSearch");
  const filters = document.getElementById("filterBar");
  const feature = document.getElementById("journalFeature");
  let posts = [];
  let category = "all";

  function renderResults() {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = posts.filter(post => (category === "all" || post.category === category) &&
      `${post.title} ${post.excerpt} ${post.category}`.toLocaleLowerCase().includes(query));
    R.renderPosts(matches, grid);
    if (!matches.length) grid.innerHTML = "";
    document.getElementById("emptyState").hidden = matches.length > 0;
    document.getElementById("articleCount").textContent = `${matches.length} ${matches.length === 1 ? "article" : "articles"}`;
    feature.hidden = category !== "all" || Boolean(query) || !posts.length;
    filters.querySelectorAll("button").forEach(button => {
      const active = button.dataset.filter === category;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
    window.refreshAnimations?.();
  }

  function hydrate(data) {
    posts = [...(data?.posts || [])].filter(post => post.slug)
      .sort((a,b) => new Date(b.date) - new Date(a.date));
    const categories = [...new Set(posts.map(post => post.category).filter(Boolean))];
    if (!categories.includes(category)) category = "all";
    filters.innerHTML = [{label:"All articles",value:"all"}, ...categories.map(value=>({label:value,value}))]
      .map(({label,value})=>`<button type="button" class="filter-chip" data-filter="${R.esc(value)}" aria-pressed="false">${R.esc(label)}</button>`).join("");
    const post = posts[0];
    if (post) {
      const href = `/post/${encodeURIComponent(post.slug)}`;
      const image = R.postMediaUrl(post);
      feature.innerHTML = `<a class="journal-feature__image" href="${href}" tabindex="-1" aria-hidden="true">${image ? `<img src="${R.esc(image)}" alt="" width="1200" height="675" fetchpriority="high">` : R.editorialCover(post)}<span>THE LATEST PERSPECTIVE <span aria-hidden="true">↗</span></span></a>
        <div class="journal-feature__story"><div class="journal-feature__label"><span>Featured read</span><span>${R.esc(post.category)}</span></div><h2><a href="${href}">${R.esc(post.title)}</a></h2><p>${R.esc(post.excerpt)}</p><div class="journal-feature__bottom"><span>${R.esc(R.fmtDate(post.date))} · ${R.esc(post.reading_time || 5)} min read</span><a href="${href}" aria-label="Read ${R.esc(post.title)}">Read the story <span aria-hidden="true">↗</span></a></div></div>`;
    }
    renderResults();
  }
  filters.addEventListener("click",event=>{
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    category = button.dataset.filter;
    renderResults();
  });
  search.addEventListener("input",renderResults);
  document.getElementById("clearArticleSearch").addEventListener("click",()=>{
    search.value = ""; category = "all"; renderResults(); search.focus();
  });
  window.addEventListener("content:hydrated",event=>hydrate(event.detail));
  hydrate(window.SITE_DATA);
})();
