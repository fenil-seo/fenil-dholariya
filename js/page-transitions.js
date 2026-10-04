/* Register before the first rendering opportunity of an incoming document. */
(() => {
  'use strict';
  function motionOff() {
    if (window.SiteMotion) return window.SiteMotion.isReduced();
    let disabled = false;
    try { disabled = sessionStorage.getItem('fd-inner-motion') === 'off'; } catch {}
    return disabled || matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(navigator.connection?.saveData);
  }
  ['pageswap', 'pagereveal'].forEach(type => window.addEventListener(type, event => {
    const transition = event.viewTransition;
    if (!transition) return;
    // Skips and the outgoing document's destruction can reject readiness.
    transition.ready.catch(() => {});
    if (motionOff()) transition.skipTransition();
  }));
})();
