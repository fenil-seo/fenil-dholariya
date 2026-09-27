(function () {
    function esc(s) {
      return String(s || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function safeMediaUrl(value) {
      return String(value || "").trim().replace(/^(?:\.\/)?assets\//, "/assets/")
        .replace(/AI(?:%20| )Searches(\d*)\.webp/gi, function (_, number) { return "ai-searches-" + (number || "1") + ".webp"; })
        .replace(/Lead(?:%20| )generation(?:%20| )bsuiness(?:(?:%20| )(\d+))?\.webp/gi, function (_, number) { return "lead-generation-business-" + (number || "1") + ".webp"; });
    }

    // Preserve the complete supplied collection when live content contains fewer items.
    var LOCAL_GALLERY = Array.from(document.querySelectorAll("#galleryRoot > section")).map(function (section, index) {
      return {
        key: ["d2c-revenue", "lead-gen", "ai-search", "search-console"][index],
        anchor: section.id,
        label: section.querySelector("h2").textContent.trim(),
        eyebrow: section.querySelector(".eyebrow").textContent.trim(),
        description: section.querySelector(".lead").textContent.trim(),
        items: Array.from(section.querySelectorAll(".gallery-item")).map(function (figure) {
          var img = figure.querySelector("img");
          return { image_url: img.getAttribute("src"), alt: img.alt, caption: figure.querySelector("figcaption").textContent.trim(), highlight: figure.classList.contains("gallery-item--highlight") };
        })
      };
    });
    var activeFilter = "all";
    var labels = { "gallery-reports": "D2C reports", "gallery-local": "Lead generation", "gallery-ai": "AI search", "gallery-search": "Search & Analytics" };
    var filters = document.getElementById("galleryFilters");
    var categorySelect = document.getElementById("galleryCategory");
    var toolbar = document.querySelector(".evidence-toolbar");
    // Account for wrapped filter rows and the document's existing scroll padding.
    function syncAnchorOffset() {
      if (!toolbar) return;
      var navOffset = parseFloat(getComputedStyle(toolbar).top) || 0;
      var documentOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      var offset = Math.max(0, navOffset + toolbar.getBoundingClientRect().height + 24 - documentOffset);
      document.body.style.setProperty("--gallery-anchor-offset", offset + "px");
    }
    syncAnchorOffset();
    if (toolbar && "ResizeObserver" in window) new ResizeObserver(syncAnchorOffset).observe(toolbar);
    window.addEventListener("resize", syncAnchorOffset, { passive: true });

    function applyFilter() {
      var total = 0;
      document.querySelectorAll("#galleryRoot > section").forEach(function (section) {
        section.hidden = activeFilter !== "all" && section.id !== activeFilter;
        if (!section.hidden) total += section.querySelectorAll(".gallery-item").length;
      });
      filters.querySelectorAll("button").forEach(function (button) {
        var active = button.dataset.galleryFilter === activeFilter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      document.getElementById("galleryCount").textContent = total + " captures";
      if (categorySelect) categorySelect.value = activeFilter;
      window.refreshAnimations?.();
    }

    function syncFilters() {
      var sections = Array.from(document.querySelectorAll("#galleryRoot > section"));
      var options = [{ id: "all", label: "All captures", count: sections.reduce(function (n,s) { return n + s.querySelectorAll(".gallery-item").length; },0) }]
        .concat(sections.map(function (section) { return { id:section.id, label:labels[section.id] || section.querySelector("h2").textContent, count:section.querySelectorAll(".gallery-item").length }; }));
      filters.innerHTML = options.map(function (option) { return '<button type="button" class="filter-chip" data-gallery-filter="'+esc(option.id)+'" aria-pressed="false">'+esc(option.label)+' <span>'+option.count+'</span></button>'; }).join("");
      if (categorySelect) categorySelect.innerHTML = options.map(function (option) { return '<option value="'+esc(option.id)+'">'+esc(option.label)+'</option>'; }).join("");
      applyFilter();
    }
    function selectCategory(id) {
      activeFilter = id;
      // Keep the selected evidence visible when filtering shortens a long page.
      history.replaceState(null,"",activeFilter === "all" ? location.pathname : "#"+activeFilter);
      applyFilter();
      syncAnchorOffset();
      var section = activeFilter === "all" ? document.querySelector("#galleryRoot > section") : document.getElementById(activeFilter);
      section?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    filters.addEventListener("click",function (event) {
      var button = event.target.closest("[data-gallery-filter]");
      if (!button) return;
      selectCategory(button.dataset.galleryFilter);
    });
    categorySelect?.addEventListener("change", function () { selectCategory(categorySelect.value); });
    window.addEventListener("hashchange",function () {
      var id = location.hash.slice(1);
      if (document.getElementById(id)?.parentElement?.id === "galleryRoot") {
        activeFilter = id; applyFilter();
        document.getElementById(id).scrollIntoView({block:"start"});
      }
    });
    if (LOCAL_GALLERY.some(function (s) {return "#"+s.anchor === location.hash;})) activeFilter = location.hash.slice(1);

    function includeRequiredEvidence(sections) {
      var combined = LOCAL_GALLERY.map(function (section) { return Object.assign({}, section, { items: section.items.slice() }); });
      var known = new Set(combined.flatMap(function (section) { return section.items.map(function (item) { return safeMediaUrl(item.image_url); }); }));
      sections.forEach(function (section) {
        var additions = (section.items || []).filter(function (item) {
          var url = safeMediaUrl(item.image_url);
          if (!url || known.has(url)) return false;
          known.add(url);
          return true;
        });
        if (!additions.length) return;
        var target = combined.find(function (local) { return local.key === section.key; });
        if (target) target.items = target.items.concat(additions);
        else combined.push(Object.assign({}, section, { items: additions }));
      });
      return combined;
    }

    function renderGallery(sections) {
      var root = document.getElementById("galleryRoot");
      if (!sections || !sections.length) {
        enhanceGallery();
        return;
      }
      var expanded = new Set(Array.from(root.querySelectorAll(".gallery-grid.is-expanded")).map(function (grid) { return grid.closest("section").id; }));
      var html = "";
      includeRequiredEvidence(sections).forEach(function (sec) {
        var collapsible = sec.items.length > 4 ? " gallery-grid--collapsible" : "";
        if (expanded.has(sec.anchor || sec.key || "")) collapsible += " is-expanded";
        html += '<section class="container" id="' + esc(sec.anchor || sec.key || "") + '" style="padding-bottom:clamp(4rem,8vw,7rem)">';
        html += '<div class="section-head">';
        if (sec.eyebrow) html += '<span class="eyebrow reveal">' + esc(sec.eyebrow) + '</span>';
        html += '<h2 class="reveal" data-delay="1">' + esc(sec.label) + '</h2>';
        if (sec.description) html += '<p class="lead reveal" data-delay="2" style="margin-top:0.8rem">' + esc(sec.description) + '</p>';
        html += '</div>';
        html += '<div class="gallery-grid' + collapsible + '">';
        sec.items.forEach(function (item, i) {
          var hi = item.highlight ? " gallery-item--highlight" : "";
          var delay = i > 0 && i < 3 ? ' data-delay="' + i + '"' : "";
          html += '<figure class="gallery-item' + hi + ' reveal" data-cursor' + delay + '>';
          html += '<img src="' + esc(safeMediaUrl(item.image_url)) + '" alt="' + esc(item.alt) + '" loading="lazy" />';
          html += '<figcaption>';
          if (item.badge) html += '<span class="gallery-badge">' + esc(item.badge) + '</span> ';
          html += esc(item.caption);
          html += '</figcaption></figure>';
        });
        html += '</div></section>';
      });
      root.innerHTML = html;
      enhanceGallery();
    }

    function enhanceGallery() {
      if (window.refreshAnimations) window.refreshAnimations();
      if (window.initGalleryCollapse) window.initGalleryCollapse();
      if (window.bindLightboxItems) window.bindLightboxItems();
      syncFilters();
    }

    enhanceGallery();
    var galleryController = typeof AbortController === "function" ? new AbortController() : null;
    var galleryTimeout = setTimeout(function () { if (galleryController) galleryController.abort(); }, 2500);
    fetch("/api/gallery", galleryController ? { signal: galleryController.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("Gallery unavailable"); return r.json(); })
      .then(function (d) { renderGallery(d.sections || []); })
      .catch(enhanceGallery)
      .finally(function () { clearTimeout(galleryTimeout); });
  })();
