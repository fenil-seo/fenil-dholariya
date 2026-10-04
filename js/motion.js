/* Shared motion preference and progressive smooth scrolling. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let disabled = false;
  try { disabled = sessionStorage.getItem('fd-inner-motion') === 'off'; } catch {}
  const isReduced = () => reduced.matches || disabled || Boolean(connection?.saveData);
  window.SiteMotion = { isReduced };
  const buttons = [...document.querySelectorAll('[data-motion-toggle]')];
  const sync = () => {
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
    window.dispatchEvent(new CustomEvent('motion:change', { detail: { reduced: isReduced() } }));
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    disabled = !disabled;
    try { sessionStorage.setItem('fd-inner-motion', disabled ? 'off' : 'on'); } catch {}
    sync();
  }));
  reduced.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  sync();
})();

(() => {
  'use strict';
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOff = () => window.SiteMotion.isReduced();
  let engine = null;
  let suspended = false;

  function syncScroll() {
    const enabled = !motionOff() && finePointer.matches && typeof window.Lenis === 'function';
    if (!enabled || suspended) {
      engine?.destroy();
      engine = null;
      return;
    }
    if (!engine) {
      engine = new window.Lenis({
        autoRaf: true,
        lerp: .105,
        smoothWheel: true,
        syncTouch: false,
        anchors: false,
        stopInertiaOnNavigate: true,
        prevent: node => node.matches?.('.nav__menu, .lightbox, textarea, pre, [data-lenis-prevent]'),
      });
    }
    const locked = document.documentElement.classList.contains('is-loading') ||
      document.body.matches('.nav-open, .modal-open') || document.hidden;
    if (locked && !engine.isStopped) engine.stop();
    else if (!locked && engine.isStopped) engine.start();
  }

  function scrollTo(target, options = {}) {
    const { offset = 0, onComplete, immediate = false } = options;
    const top = typeof target === 'number' ? target + offset : target.getBoundingClientRect().top + window.scrollY + offset;
    if (engine && !engine.isStopped) {
      // Resolve to a position once: Lenis also applies CSS offsets to element targets.
      engine.scrollTo(top, { immediate, duration: .9, easing: t => 1 - Math.pow(1 - t, 4), onComplete });
      return;
    }
    window.scrollTo({ top, behavior: motionOff() || immediate ? 'instant' : 'smooth' });
    // Focus without moving the viewport or interrupting the native scroll.
    onComplete?.();
  }
  function scrollToElement(target, options = {}) {
    window.SiteNavigation?.reveal();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    scrollTo(target, { offset: -(margin + padding), ...options });
  }
  window.SiteScroll = { scrollTo, scrollToElement, get enabled() { return Boolean(engine); } };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    if (target.matches('details')) target.open = true;
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    scrollToElement(target, { onComplete: () => {
      const temporary = !target.hasAttribute('tabindex') && !target.matches('a,button,input,select,textarea,summary');
      if (temporary) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (temporary) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }});
  });

  const observer = new MutationObserver(syncScroll);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('motion:change', syncScroll);
  finePointer.addEventListener('change', syncScroll);
  document.addEventListener('visibilitychange', syncScroll);
  window.addEventListener('pagehide', () => { suspended = true; syncScroll(); });
  window.addEventListener('pageshow', () => { suspended = false; syncScroll(); });
  window.addEventListener('content:hydrated', () => engine?.resize());
  syncScroll();
})();
