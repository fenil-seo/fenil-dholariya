/* Shared motion preference and progressive CSS 3D enhancement. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  let disabled = false;
  try { disabled = sessionStorage.getItem('fd-inner-motion') === 'off'; } catch {}
  const isReduced = () => reduced.matches || disabled || Boolean(connection?.saveData);
  window.SiteMotion = { isReduced };
  const buttons = [...document.querySelectorAll('[data-motion-toggle]')];
  const scenes = [...document.querySelectorAll('.signal-orbit')];
  const visible = new Set();
  const surfaces = '.home-hero__portrait-frame, .service-intro__visual, .studio-hero__visual, .evidence-preview, .journal-feature__image, .post-card__media, .work-project__image, .gallery-item';
  let active = null;
  let bounds = null;
  let frame = 0;
  let point = null;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      active.classList.remove('is-tilting');
      ['--tilt-x', '--tilt-y', '--light-x', '--light-y'].forEach(key => active.style.removeProperty(key));
    }
    active = null;
    bounds = null;
  };
  const updateScenes = () => scenes.forEach(scene => scene.classList.toggle('is-playing', visible.has(scene) && !isReduced() && !document.hidden));
  const sync = () => {
    reset();
    document.body.classList.toggle('depth-motion-off', isReduced());
    buttons.forEach(button => {
      button.hidden = false;
      button.disabled = reduced.matches || Boolean(connection?.saveData);
      button.setAttribute('aria-pressed', String(isReduced()));
      button.textContent = reduced.matches ? 'Reduced motion' : connection?.saveData ? 'Data saver on' : disabled ? 'Motion off' : 'Motion on';
      button.setAttribute('aria-label', button.disabled ? 'Motion reduced by your device' : disabled ? 'Motion off. Enable page motion' : 'Motion on. Reduce page motion');
    });
    if (isReduced()) {
      document.getAnimations().forEach(animation => {
        if (animation.effect?.getTiming().iterations !== Infinity) { try { animation.finish(); } catch {} }
      });
    }
    updateScenes();
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    disabled = !disabled;
    try { sessionStorage.setItem('fd-inner-motion', disabled ? 'off' : 'on'); } catch {}
    sync();
  }));
  reduced.addEventListener('change', sync);
  pointer.addEventListener('change', reset);
  connection?.addEventListener('change', sync);
  document.addEventListener('visibilitychange', () => { reset(); updateScenes(); });
  document.documentElement.classList.add('spatial-ready');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      updateScenes();
    }, { threshold: .1 });
    scenes.forEach(scene => observer.observe(scene));
  }
  document.addEventListener('pointermove', event => {
    if (isReduced() || !pointer.matches || event.pointerType !== 'mouse') return;
    const surface = event.target.closest(surfaces);
    if (!surface) { if (active) reset(); return; }
    if (surface !== active) {
      reset();
      active = surface;
      bounds = surface.getBoundingClientRect();
      surface.classList.add('spatial-media', 'is-tilting');
    }
    point = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || !bounds?.width || !bounds?.height) return;
      const x = Math.max(0, Math.min(1, (point.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));
      active.style.setProperty('--tilt-x', `${((.5 - y) * 5).toFixed(2)}deg`);
      active.style.setProperty('--tilt-y', `${((x - .5) * 5).toFixed(2)}deg`);
      active.style.setProperty('--light-x', `${x * 100}%`);
      active.style.setProperty('--light-y', `${y * 100}%`);
    });
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) reset(); });
  window.addEventListener('scroll', reset, { passive: true });
  window.addEventListener('resize', reset, { passive: true });
  sync();
})();
