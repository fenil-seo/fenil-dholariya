/* Public interaction layer */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SAVE_DATA = Boolean(navigator.connection && navigator.connection.saveData);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  if (!REDUCED) document.documentElement.classList.add("motion-ready");

  function runIntro() {
    const intro = document.getElementById("loader");
    if (!intro) return;
    if (intro.dataset.introBooted === "1") return;

    let seen = false;
    try {
      seen = sessionStorage.getItem("fd-intro-v3") === "seen";
      if (!seen) sessionStorage.setItem("fd-intro-v3", "seen");
    } catch {
      seen = false;
    }

    if (seen) {
      intro.remove();
      return;
    }

    document.documentElement.classList.add("is-loading");
    let complete = false;
    let exitTimer = 0;
    let removeTimer = 0;

    const unlock = () => {
      document.documentElement.classList.remove("is-loading");
      intro.classList.add("is-done");
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      removeTimer = window.setTimeout(() => intro.remove(), REDUCED ? 20 : 260);
    };

    const finish = (skipMotion = false) => {
      if (complete || !intro.isConnected) return;
      complete = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);

      const mark = $(".brand-intro__mark", intro);
      const target = $(".nav .brand__mark img");
      if (!skipMotion && !REDUCED && mark && target) {
        const from = mark.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const x = to.left + (to.width / 2) - (from.left + (from.width / 2));
        const y = to.top + (to.height / 2) - (from.top + (from.height / 2));
        const scale = Math.max(0.08, to.width / from.width);
        intro.style.setProperty("--intro-x", `${x}px`);
        intro.style.setProperty("--intro-y", `${y}px`);
        intro.style.setProperty("--intro-scale", String(scale));
        intro.classList.add("is-compressing");
        window.setTimeout(unlock, 250);
      } else {
        unlock();
      }
    };

    function skip(event) {
      if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      finish(true);
    }

    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip);
    exitTimer = window.setTimeout(() => finish(false), REDUCED ? 80 : 960);
    window.setTimeout(() => finish(true), 1550);
  }

  function createSkipLink() {
    const main = $("main");
    if (!main || $(".skip-link")) return;
    if (!main.id) main.id = "mainContent";
    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = `#${main.id}`;
    link.textContent = "Skip to content";
    document.body.prepend(link);
  }

  function bindNavigation() {
    const nav = document.getElementById("nav");
    const toggle = document.getElementById("navToggle");
    if (!nav) return;
    const menu = $(".nav__menu", nav);

    const updateScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    const normalizedPath = window.location.pathname.replace(/\/$/, "") || "/";
    $$(".nav__link", nav).forEach((link) => {
      const path = new URL(link.href, window.location.origin).pathname.replace(/\/$/, "") || "/";
      const current = path === normalizedPath || (path === "/work" && normalizedPath.startsWith("/work/")) || (path === "/blog" && normalizedPath.startsWith("/post/"));
      link.classList.toggle("is-active", current);
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (!toggle || !menu) return;
    if (!menu.id) menu.id = "primaryMenu";
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");
    if (!toggle.getAttribute("aria-label")) toggle.setAttribute("aria-label", "Open menu");

    const main = $("main");
    const footer = $(".footer");

    const close = (returnFocus = true) => {
      menu.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      if (main) main.inert = false;
      if (footer) footer.inert = false;
      if (returnFocus) toggle.focus();
    };

    const open = () => {
      menu.classList.add("is-open");
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      if (main) main.inert = true;
      if (footer) footer.inert = true;
      window.setTimeout(() => $("a[href]", menu)?.focus(), 40);
    };

    toggle.addEventListener("click", () => {
      if (menu.classList.contains("is-open")) close(false);
      else open();
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) close(false);
    });

    window.addEventListener("keydown", (event) => {
      if (!menu.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [toggle, ...$$('a[href], button:not([disabled])', menu)].filter((node) => node.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    const wide = window.matchMedia("(min-width: 1081px)");
    const closeOnWide = (event) => { if (event.matches && menu.classList.contains("is-open")) close(false); };
    if (wide.addEventListener) wide.addEventListener("change", closeOnWide);
    else wide.addListener(closeOnWide);
  }

  function bindScrollTools() {
    const progress = document.getElementById("scrollProgress");
    const top = document.getElementById("backToTop");
    let queued = false;
    const update = () => {
      const root = document.documentElement;
      const available = root.scrollHeight - root.clientHeight;
      if (progress) progress.style.transform = `scaleX(${available > 0 ? root.scrollTop / available : 0})`;
      if (top) top.classList.toggle("is-visible", window.scrollY > 650);
      queued = false;
    };
    window.addEventListener("scroll", () => {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    top?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
    update();
  }

  function bindReveals(root = document) {
    const items = $$(".reveal:not([data-reveal-bound]), .reveal-line:not([data-reveal-bound])", root);
    if (!items.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach((item) => {
        item.dataset.revealBound = "1";
        item.classList.add("is-in");
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    items.forEach((item) => {
      item.dataset.revealBound = "1";
      observer.observe(item);
    });
  }

  function bindLazyMedia(root = document) {
    $$("img[loading='lazy']:not([data-lazy-bound])", root).forEach((image) => {
      image.dataset.lazyBound = "1";
      const ready = () => image.classList.add("is-loaded");
      if (image.complete) ready();
      else {
        image.addEventListener("load", ready, { once: true });
        image.addEventListener("error", ready, { once: true });
      }
    });
  }

  function bindCounters(root = document) {
    $$("[data-count]:not([data-count-bound])", root).forEach((item) => {
      item.dataset.countBound = "1";
      const target = Number(item.dataset.count || 0);
      const suffix = item.dataset.suffix || "";
      const finalValue = `${target}${suffix ? `<span class="unit">${suffix}</span>` : ""}`;
      if (REDUCED || !("IntersectionObserver" in window)) {
        item.innerHTML = finalValue;
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 850;
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          item.innerHTML = `${Math.round(target * eased)}${suffix ? `<span class="unit">${suffix}</span>` : ""}`;
          if (progress < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }, { threshold: 0.5 });
      observer.observe(item);
    });
  }

  function bindVideoControls(root = document) {
    $$('[data-video-toggle]:not([data-video-bound])', root).forEach((button) => {
      button.dataset.videoBound = "1";
      const frame = button.closest(".method-section__visual") || button.parentElement;
      const video = $("video", frame);
      if (!video) return;
      video.autoplay = false;
      video.pause();
      if (SAVE_DATA) video.preload = "none";
      button.textContent = "Play";
      button.setAttribute("aria-label", "Play context video");

      const sync = () => {
        const paused = video.paused;
        button.textContent = paused ? "Play" : "Pause";
        button.setAttribute("aria-label", paused ? "Play context video" : "Pause context video");
      };

      button.addEventListener("click", async () => {
        if (!video.paused) {
          video.pause();
          sync();
          return;
        }
        try {
          await video.play();
        } catch {
          button.textContent = "Unavailable";
          button.setAttribute("aria-label", "Context video unavailable");
          return;
        }
        sync();
      });
      video.addEventListener("play", sync);
      video.addEventListener("pause", sync);
      video.addEventListener("ended", sync);
    });
  }

  function bindContactForm() {
    const form = document.getElementById("contactForm");
    if (!form || form.dataset.formBound) return;
    form.dataset.formBound = "1";
    const button = document.getElementById("cfSubmit");
    const status = document.getElementById("formStatus");
    const selectedFocus = {
      "organic-revenue": "Organic growth",
      "local-demand": "Local discovery",
      "ai-content": "Better content systems"
    }[new URLSearchParams(window.location.search).get("interest")];
    if (selectedFocus) {
      const guide = document.querySelector(".form-guide");
      if (guide) guide.textContent = `Your focus: ${selectedFocus}. The four fields below are required.`;
    }
    let started = false;

    form.addEventListener("focusin", () => {
      if (started) return;
      started = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "portfolio_form_start", form_name: "growth_diagnosis" });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const businessModel = form.elements.business_model?.value || "";
      const budget = form.elements.budget?.value || "";
      const timeline = form.elements.timeline?.value || "";
      const context = [
        selectedFocus && `Engagement focus: ${selectedFocus}`,
        businessModel && `Business model: ${businessModel}`,
        budget && `Investment range: ${budget}`,
        timeline && `Preferred timing: ${timeline}`
      ].filter(Boolean).join("\n");
      const payload = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        company: form.elements.company.value.trim(),
        message: `${context}\n\nGrowth problem:\n${form.elements.message.value.trim()}`.trim()
      };

      const original = button?.innerHTML || "Send your enquiry";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
      }
      if (status) {
        status.textContent = "";
        status.className = "form-status";
      }

      let ok = false;
      try {
        if (window.API?.sendLead) ({ ok } = await window.API.sendLead(payload));
      } catch {
        ok = false;
      }

      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
      if (ok) {
        if (status) {
          status.textContent = "Thank you. Fenil will reply after reviewing the fit.";
          status.className = "form-status is-success";
        }
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "portfolio_qualified_lead", business_model: businessModel || "not_provided", budget_range: budget || "not_provided", timeline: timeline || "not_provided" });
        form.reset();
      } else if (status) {
        status.innerHTML = 'The form could not send. Please email <a href="mailto:fenil.seo@gmail.com">fenil.seo@gmail.com</a>.';
        status.className = "form-status is-error";
      }
      status?.focus({ preventScroll: true });
    });
  }

  function bindTracking() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest?.("[data-track], a[href='/contact'], a[href^='/work/']");
      if (!target) return;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "portfolio_cta_click", action: target.dataset.track || target.getAttribute("href") || "unknown", page: document.body.dataset.page || "unknown" });
    });
  }

  function bindBlogFilter() {
    const bar = document.getElementById("filterBar");
    if (!bar || bar.dataset.filterBound) return;
    bar.dataset.filterBound = "1";
    const apply = (value) => {
      const grid = document.getElementById("postsGrid");
      if (!grid) return;
      let visible = 0;
      $$(".post-card", grid).forEach((card) => {
        const show = value === "all" || card.dataset.category === value;
        card.hidden = !show;
        if (show) visible += 1;
      });
      grid.classList.toggle("is-filtered", value !== "all");
      const empty = document.getElementById("emptyState");
      if (empty) empty.style.display = visible ? "none" : "block";
    };
    bar.addEventListener("click", (event) => {
      const button = event.target.closest(".filter-chip");
      if (!button) return;
      $$(".filter-chip", bar).forEach((item) => item.classList.toggle("is-active", item === button));
      apply(button.dataset.filter || "all");
    });
    window.addEventListener("content:hydrated", () => apply($(".filter-chip.is-active", bar)?.dataset.filter || "all"));
  }

  function bindLightbox() {
    const box = document.getElementById("lightbox");
    if (!box || box.dataset.lightboxBound) return;
    box.dataset.lightboxBound = "1";
    const image = document.getElementById("lightboxImg");
    const closeButton = $(".lightbox__close", box);
    let returnFocus = null;

    const close = () => {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      returnFocus?.focus?.();
      returnFocus = null;
    };

    const open = (trigger) => {
      if (!image) return;
      returnFocus = trigger;
      image.src = trigger.currentSrc || trigger.src;
      image.alt = trigger.alt || "Anonymized evidence image";
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      closeButton?.focus();
    };

    window.bindLightboxItems = () => {
      $$(".gallery-item img:not([data-lightbox-bound])").forEach((trigger) => {
        trigger.dataset.lightboxBound = "1";
        trigger.tabIndex = 0;
        trigger.setAttribute("role", "button");
        trigger.setAttribute("aria-label", `Open larger image: ${trigger.alt || "evidence"}`);
        trigger.addEventListener("click", () => open(trigger));
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open(trigger);
          }
        });
      });
    };

    box.addEventListener("click", (event) => {
      if (event.target === box || event.target.closest(".lightbox__close")) close();
    });
    window.addEventListener("keydown", (event) => {
      if (!box.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "Tab" && closeButton) {
        event.preventDefault();
        closeButton.focus();
      }
    });
    window.bindLightboxItems();
  }

  window.initGalleryCollapse = () => {
    $$(".gallery-grid--collapsible:not([data-collapse-bound])").forEach((grid) => {
      grid.dataset.collapseBound = "1";
      const total = $$(".gallery-item", grid).length;
      const visible = 6;
      if (total <= visible) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-toggle";
      button.setAttribute("aria-expanded", "false");
      button.textContent = `Show ${total - visible} more screenshots`;
      grid.after(button);
      button.addEventListener("click", () => {
        const expanded = grid.classList.toggle("is-expanded");
        button.setAttribute("aria-expanded", String(expanded));
        button.textContent = expanded ? "Show fewer screenshots" : `Show ${total - visible} more screenshots`;
        if (!expanded) grid.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      });
    });
  };

  function bindAll(root = document) {
    bindReveals(root);
    bindLazyMedia(root);
    bindCounters(root);
    bindVideoControls(root);
    window.bindLightboxItems?.();
    window.initGalleryCollapse();
  }

  runIntro();
  createSkipLink();
  bindNavigation();
  bindScrollTools();
  bindContactForm();
  bindTracking();
  bindBlogFilter();
  bindLightbox();
  bindAll(document);
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  window.addEventListener("content:hydrated", () => bindAll(document));
  window.refreshAnimations = () => bindAll(document);
})();
