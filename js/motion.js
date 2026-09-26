/* Shared preference for the site's existing page transitions. */
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
