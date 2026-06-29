/* =================================================================
   MAIN — page interactions. Vanilla JS, no dependencies.
   Everything here is rebindable (bind* functions skip already-bound
   nodes) so it works both on first paint and after the hydration
   layer (render.js) swaps in live content from the database.
   ================================================================= */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Loader ---------- */
  (function loader() {
    const el = document.getElementById("loader");
    if (!el) return;
    const countEl = document.getElementById("loaderCount");
    const barEl = document.getElementById("loaderBar");
    document.documentElement.style.overflow = "hidden";

    let pct = 0;
    let done = false;
    const paint = (p) => {
      if (countEl) countEl.textContent = Math.round(p);
      if (barEl) barEl.style.width = p + "%";
    };

    const tick = () => {
      if (done) return;
      pct += (90 - pct) * 0.06 + 0.2;
      if (pct > 90) pct = 90;
      paint(pct);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const finish = () => {
      if (done) return;
      done = true;
      const grow = () => {
        pct += (100 - pct) * 0.2 + 1.5;
        if (pct >= 100) pct = 100;
        paint(pct);
        if (pct < 100) requestAnimationFrame(grow);
        else {
          setTimeout(() => {
            el.classList.add("is-done");
            document.documentElement.style.overflow = "";
            setTimeout(() => el.remove(), 700);
          }, 120);
        }
      };
      grow();
    };

    const ready = Promise.all([
      document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
      new Promise((res) => {
        if (document.readyState === "complete") res();
        else window.addEventListener("load", res, { once: true });
      }),
    ]);
    Promise.race([ready, new Promise((res) => setTimeout(res, 1600))]).then(finish);
    setTimeout(finish, 3200); // safety net
  })();

  /* ---------- Scroll progress ---------- */
  (function scrollProgress() {
    const bar = document.getElementById("scrollProgress");
    if (!bar) return;
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ---------- Custom cursor ---------- */
  (function cursor() {
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    if (!dot || !ring || !FINE_POINTER) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    let active = false;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!active) { active = true; dot.style.opacity = 1; ring.style.opacity = 1; }
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest && e.target.closest("[data-cursor]")) ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest && e.target.closest("[data-cursor]")) ring.classList.remove("is-hover");
    });
  })();

  /* ---------- Nav ---------- */
  (function nav() {
    const navEl = document.getElementById("nav");
    const toggle = document.getElementById("navToggle");
    if (!navEl) return;

    const onScroll = () => navEl.classList.toggle("is-scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle) {
      toggle.addEventListener("click", () => {
        const open = navEl.classList.toggle("is-open");
        document.documentElement.style.overflow = open ? "hidden" : "";
      });
      navEl.querySelectorAll(".nav__link, .nav__cta").forEach((link) => {
        link.addEventListener("click", () => {
          navEl.classList.remove("is-open");
          document.documentElement.style.overflow = "";
        });
      });
    }
  })();

  /* ---------- Reveal-on-scroll (rebindable) ---------- */
  function bindReveals(root) {
    const els = root.querySelectorAll(".reveal:not([data-bound]), .reveal-line:not([data-bound])");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || REDUCED) {
      els.forEach((e) => { e.classList.add("is-in"); e.dataset.bound = "1"; });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => { e.dataset.bound = "1"; io.observe(e); });
  }

  /* ---------- Animated counters (rebindable) ---------- */
  function bindCounters(root) {
    const els = root.querySelectorAll("[data-count]:not([data-bound-count])");
    if (!els.length) return;
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      if (REDUCED || !("IntersectionObserver" in window)) {
        el.innerHTML = target + (suffix ? `<span class="unit">${suffix}</span>` : "");
        return;
      }
      const dur = 1300;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.innerHTML = Math.round(target * eased) + (suffix ? `<span class="unit">${suffix}</span>` : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window) || REDUCED) {
      els.forEach((e) => { e.dataset.boundCount = "1"; animate(e); });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { io.unobserve(en.target); animate(en.target); }
      });
    }, { threshold: 0.4 });
    els.forEach((e) => { e.dataset.boundCount = "1"; io.observe(e); });
  }

  /* ---------- Generative visuals (canvas, no stock imagery needed) ---------- */
  const Viz = (() => {
    const BLUE = [13, 96, 254];
    const STEEL = [184, 191, 209];
    const registry = [];
    let started = false;

    function color(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }

    function resize(inst) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = inst.container.getBoundingClientRect();
      inst.w = Math.max(1, Math.round(rect.width));
      inst.h = Math.max(1, Math.round(rect.height));
      inst.canvas.width = inst.w * dpr;
      inst.canvas.height = inst.h * dpr;
      inst.canvas.style.width = inst.w + "px";
      inst.canvas.style.height = inst.h + "px";
      inst.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (inst.type === "network" && !inst.nodes) {
        inst.nodes = Array.from({ length: 16 }, () => ({
          x: Math.random() * inst.w, y: Math.random() * inst.h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        }));
      }
    }

    function draw(inst, t) {
      const { ctx, w, h, accent } = inst;
      ctx.clearRect(0, 0, w, h);
      if (inst.type === "network") {
        const nodes = inst.nodes;
        nodes.forEach((n) => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        });
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.min(w, h) * 0.32;
            if (dist < maxDist) {
              ctx.strokeStyle = color(accent, (1 - dist / maxDist) * 0.35);
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
            }
          }
        }
        nodes.forEach((n) => {
          ctx.fillStyle = color(accent, 0.85);
          ctx.beginPath(); ctx.arc(n.x, n.y, 2.4, 0, Math.PI * 2); ctx.fill();
        });
      } else if (inst.type === "bars") {
        const n = 7, gap = w * 0.04, bw = (w - gap * (n + 1)) / n;
        const top = [];
        for (let i = 0; i < n; i++) {
          const base = 0.25 + (i / n) * 0.45;
          const wave = Math.sin(t * 0.02 + i * 0.9) * 0.08;
          const ratio = Math.min(0.92, Math.max(0.1, base + wave));
          const bh = h * ratio;
          const x = gap + i * (bw + gap), y = h - bh;
          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, color(accent, 0.9));
          grad.addColorStop(1, color(accent, 0.08));
          ctx.fillStyle = grad;
          const r = Math.min(8, bw / 2);
          roundRect(ctx, x, y, bw, bh, r);
          ctx.fill();
          top.push([x + bw / 2, y]);
        }
        ctx.strokeStyle = color(accent, 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y - 6) : ctx.lineTo(x, y - 6)));
        ctx.stroke();
      } else if (inst.type === "orbit") {
        const cx = w / 2, cy = h / 2, maxR = Math.min(w, h) * 0.42;
        ctx.fillStyle = color(accent, 0.9);
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
        [0.45, 0.7, 1].forEach((f, i) => {
          const r = maxR * f;
          ctx.strokeStyle = color(accent, 0.18);
          ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          const speed = 0.012 + i * 0.006;
          const angle = t * speed + i * 2.1;
          const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r * 0.92;
          ctx.fillStyle = color(accent, 0.95);
          ctx.beginPath(); ctx.arc(px, py, 3.4, 0, Math.PI * 2); ctx.fill();
        });
      } else if (inst.type === "wave") {
        [0.5, 0.8].forEach((amp, i) => {
          ctx.strokeStyle = color(accent, i === 0 ? 0.75 : 0.32);
          ctx.lineWidth = i === 0 ? 2 : 1.4;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            const trend = h * 0.62 - (x / w) * h * 0.22;
            const y = trend + Math.sin(x * 0.025 + t * 0.03 + i * 1.6) * (h * 0.08 * amp);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop() {
      registry.forEach((inst) => { if (inst.visible) draw(inst, inst.t++); });
      requestAnimationFrame(loop);
    }

    function init(root) {
      root.querySelectorAll(".viz[data-viz]:not([data-viz-bound])").forEach((container) => {
        container.dataset.vizBound = "1";
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        container.appendChild(canvas);
        const accent = container.dataset.accent === "cyan" ? STEEL : BLUE;
        const inst = { container, canvas, ctx: canvas.getContext("2d"), type: container.dataset.viz || "network", accent, t: Math.floor(Math.random() * 200), visible: true };
        resize(inst);
        draw(inst, inst.t);
        if (!REDUCED) {
          new ResizeObserver(() => resize(inst)).observe(container);
          new IntersectionObserver(([entry]) => { inst.visible = entry.isIntersecting; }, { threshold: 0.05 }).observe(container);
          registry.push(inst);
        }
      });
      if (!started && !REDUCED) { started = true; requestAnimationFrame(loop); }
    }

    return { init };
  })();

  /* ---------- Contact form ---------- */
  (function contactForm() {
    const form = document.getElementById("contactForm");
    if (!form || !window.API) return;
    const btn = document.getElementById("cfSubmit");
    const status = document.getElementById("formStatus");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        message: form.message.value.trim(),
      };
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "Sending…";
      status.className = "form-status";

      const { ok } = await window.API.sendLead(payload);

      btn.disabled = false;
      btn.innerHTML = original;
      if (ok) {
        status.textContent = "Thanks — I'll reply within one business day.";
        status.className = "form-status is-ok";
        form.reset();
      } else {
        status.textContent = "Couldn't send right now — please email fenil.seo@gmail.com directly.";
        status.className = "form-status is-err";
      }
    });
  })();

  /* ---------- Blog category filter ---------- */
  (function blogFilter() {
    const bar = document.getElementById("filterBar");
    if (!bar) return;
    const apply = (filter) => {
      const grid = document.getElementById("postsGrid");
      const empty = document.getElementById("emptyState");
      if (!grid) return;
      let visible = 0;
      grid.querySelectorAll(".post-card").forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      if (empty) empty.style.display = visible === 0 ? "block" : "none";
    };
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      bar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      apply(btn.dataset.filter);
    });
    window.addEventListener("content:hydrated", () => {
      const active = bar.querySelector(".filter-chip.is-active");
      apply(active ? active.dataset.filter : "all");
    });
  })();

  /* ---------- Footer year ---------- */
  (function footerYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  })();

  /* ---------- Bind everything, and rebind after hydration ---------- */
  function bindAll(root) {
    bindReveals(root);
    bindCounters(root);
    Viz.init(root);
  }
  bindAll(document);
  window.addEventListener("content:hydrated", () => bindAll(document));
  window.refreshAnimations = () => bindAll(document);
})();
