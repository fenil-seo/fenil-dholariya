/* Progressive optical and spatial effects. All content works without this layer. */
(() => {
  'use strict';
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOff = () => window.SiteMotion?.isReduced() ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const surfaces = '.nav__inner, .capability, .work-project, .post-card, .proof-card, .gallery-item, .experience-choice, .evidence-stack a, .home-hero__result, .service-stage-card, .work-stage__front, .goal-starter__choice, .goal-starter__result, .about-career > li, .about-principles__list li, .home-service-index a, .footer-invitation';
  const seen = new WeakSet();
  const running = new Set();
  const visibleMedia = new Set();
  const sceneRoot = document.querySelector('.home-hero, .about-world, .hero-band, .work-heading, .journal-heading, .evidence-intro, .contact-stage, .project-hero, .reader-hero');
  let scene = null;
  const enter = (element, delay = 0) => {
    if (!element || motionOff() || !element.animate) return;
    const animation = element.animate([
      { opacity: 0, transform: 'translateY(24px) scale(.98)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 850, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    running.add(animation);
    animation.addEventListener('finish', () => { running.delete(animation); animation.cancel(); }, { once: true });
    animation.addEventListener('cancel', () => running.delete(animation), { once: true });
  };
  const entrances = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entrances.unobserve(entry.target);
      enter(entry.target, Math.min([...entry.target.parentElement.children].indexOf(entry.target), 3) * 85);
    });
  }, { threshold: .08 }) : null;

  let spatialFrame = 0;
  const updateSpatial = () => {
    spatialFrame = 0;
    if (motionOff() || !finePointer.matches) return;
    visibleMedia.forEach(media => {
      const rect = media.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight));
      media.style.setProperty('--media-drift', `${(progress * -10).toFixed(2)}px`);
    });
    if (scene) {
      const bounds = sceneRoot.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < innerHeight) scene.style.setProperty('--scene-drift', `${Math.max(-18, bounds.top * .025).toFixed(2)}px`);
    }
  };
  const scheduleSpatial = () => {
    if (!spatialFrame) spatialFrame = requestAnimationFrame(updateSpatial);
  };
  const mediaObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visibleMedia.add(entry.target) : visibleMedia.delete(entry.target));
    scheduleSpatial();
  }, { rootMargin: '80px' }) : null;
  window.addEventListener('scroll', scheduleSpatial, { passive: true });
  window.addEventListener('resize', scheduleSpatial, { passive: true });

  function enhance() {
    document.querySelectorAll(surfaces).forEach(surface => surface.setAttribute('data-glass-surface', ''));
    document.querySelectorAll('.authority-strip__grid > div, .capability, .work-project, .evidence-reading__grid > div, .gallery-invitation__layout > div, .article-contents, .about-section__heading, .about-career > li, .about-principles__list li, .about-principles__photo, .home-service-index a, .goal-starter, .footer-invitation, .section-head').forEach(element => {
      if (seen.has(element) || element.matches('.reveal') || element.closest('.reveal')) return;
      if (element.matches('.section-head') && element.querySelector('.reveal,[data-enter]')) return;
      seen.add(element);
      entrances?.observe(element);
    });
    document.querySelectorAll('.feature-case__media img, .about-portrait img, .service-intro__visual img, .studio-hero__visual img, .journal-feature__image img, .work-project__image img').forEach(media => {
      if (media.hasAttribute('data-spatial-media')) return;
      media.setAttribute('data-spatial-media', '');
      mediaObserver?.observe(media);
    });
    document.querySelectorAll('.work-stage__front').forEach(element => element.setAttribute('data-depth-response',''));
  }
  enhance();
  if (sceneRoot) {
    sceneRoot.classList.add('has-motion-scene');
    scene = document.createElement('div');
    scene.className = 'motion-scene';
    scene.setAttribute('aria-hidden','true');
    scene.innerHTML = '<span class="motion-scene__light"></span><span class="motion-scene__arc"></span><span class="motion-scene__arc"></span><span class="motion-scene__arc"></span>';
    sceneRoot.prepend(scene);
    enter(scene, 120);
  }
  window.addEventListener('content:hydrated', enhance);
  // Introduce the person, then the supporting photograph, without hiding
  // content in CSS or making the introduction depend on JavaScript.
  const aboutCopy = document.querySelector('.about-hero__copy');
  if (aboutCopy) {
    [...aboutCopy.children, document.querySelector('.about-profile')].forEach((element, index) => {
      if (!element || motionOff() || !element.animate) return;
      const animation = element.animate([
        { opacity:0, transform:'translateY(18px)' },
        { opacity:1, transform:'translateY(0)' },
      ], { duration:800, delay:index * 65, easing:'cubic-bezier(.16,1,.3,1)', fill:'both' });
      running.add(animation);
      animation.addEventListener('finish', () => { running.delete(animation); animation.cancel(); }, { once:true });
      animation.addEventListener('cancel', () => running.delete(animation), { once:true });
    });
  }
  window.addEventListener('collection:change', event => {
    event.detail.root?.querySelectorAll('.work-project:not([hidden]), .post-card:not([hidden])').forEach((card, index) => enter(card, Math.min(index, 3) * 65));
  });
  const hero = document.querySelector('.home-hero');
  if (hero && 'IntersectionObserver' in window) new IntersectionObserver(entries => {
    hero.classList.toggle('is-out-of-view', !entries[0].isIntersecting);
  }).observe(hero);
  const heading = document.querySelector('.journal-heading__row, .work-heading__row, .evidence-intro__copy, .not-found > div');
  if (heading && !motionOff() && !heading.querySelector('.reveal')) {
    heading.classList.add('liquid-enter');
    heading.addEventListener('animationend', () => heading.classList.remove('liquid-enter'), { once: true });
  }

  let active = null;
  let pointerFrame = 0;
  let x = 0;
  let y = 0;
  let magnetic = null;
  const portrait = document.querySelector('.home-hero__portrait-frame');
  const clearPointer = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    active?.style.removeProperty('--glass-x');
    active?.style.removeProperty('--glass-y');
    active?.style.removeProperty('--depth-axis-x');
    active?.style.removeProperty('--depth-axis-y');
    active?.style.removeProperty('--depth-angle');
    magnetic?.style.removeProperty('--magnet-x');
    magnetic?.style.removeProperty('--magnet-y');
    magnetic = null;
    active = null;
    portrait?.style.removeProperty('--portrait-angle');
  };
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || motionOff() || event.pointerType === 'touch') return;
    const surface = event.target.closest?.('[data-glass-surface]');
    if (surface !== active) { clearPointer(); active = surface; }
    const button = event.target.closest?.('.btn:not(.btn--nav):not([type=submit])');
    if (button !== magnetic) {
      magnetic?.style.removeProperty('--magnet-x');
      magnetic?.style.removeProperty('--magnet-y');
      magnetic = button;
    }
    x = event.clientX;
    y = event.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (active) {
        const rect = active.getBoundingClientRect();
        active.style.setProperty('--glass-x', `${x - rect.left}px`);
        active.style.setProperty('--glass-y', `${y - rect.top}px`);
        if (active.hasAttribute('data-depth-response')) {
          const dx = Math.max(-1,Math.min(1,(x-rect.left)/rect.width*2-1));
          const dy = Math.max(-1,Math.min(1,(y-rect.top)/rect.height*2-1));
          active.style.setProperty('--depth-axis-x',String(-dy));
          active.style.setProperty('--depth-axis-y',String(dx));
          active.style.setProperty('--depth-angle',`${(Math.hypot(dx,dy)*1.4).toFixed(2)}deg`);
        }
      }
      if (magnetic) {
        const rect = magnetic.getBoundingClientRect();
        magnetic.style.setProperty('--magnet-x',`${Math.max(-3,Math.min(3,(x-rect.left-rect.width/2)*.04)).toFixed(2)}px`);
        magnetic.style.setProperty('--magnet-y',`${Math.max(-2,Math.min(2,(y-rect.top-rect.height/2)*.08)).toFixed(2)}px`);
      }
      if (scene && scrollY < innerHeight) {
        scene.style.setProperty('--scene-x',`${((x/innerWidth-.5)*8).toFixed(2)}px`);
        scene.style.setProperty('--scene-y',`${((y/innerHeight-.5)*8).toFixed(2)}px`);
      }
      if (portrait && scrollY < innerHeight) portrait.style.setProperty('--portrait-angle', `${((x / innerWidth - .5) * 2).toFixed(2)}deg`);
    });
  }, { passive: true });
  document.addEventListener('pointerleave', clearPointer);
  document.addEventListener('focusin', clearPointer);
  window.addEventListener('blur', clearPointer);
  document.addEventListener('pointerdown', event => {
    if (motionOff() || event.button !== 0) return;
    const control = event.target.closest?.('.btn, .filter-chip, .experience-choice, .goal-starter__choice, .nav__link');
    if (!control || !control.animate) return;
    const bounds = control.getBoundingClientRect();
    const light = document.createElement('span');
    light.className = 'press-light';
    light.setAttribute('aria-hidden', 'true');
    light.style.left = `${event.clientX - bounds.left}px`;
    light.style.top = `${event.clientY - bounds.top}px`;
    control.append(light);
    const animation = light.animate([{ transform: 'translate(-50%,-50%) scale(.15)', opacity: .7 }, { transform: 'translate(-50%,-50%) scale(2)', opacity: 0 }], { duration: 550, easing: 'ease-out' });
    animation.addEventListener('finish', () => light.remove(), { once: true });
    animation.addEventListener('cancel', () => light.remove(), { once: true });
  });
  const accordions = new WeakMap();
  document.addEventListener('click', event => {
    const summary = event.target.closest?.('.capability > summary');
    if (!summary || event.defaultPrevented || motionOff() || !summary.parentElement.animate) return;
    const details = summary.parentElement;
    const previous = accordions.get(details);
    const opening = previous ? !previous.opening : !details.open;
    const from = details.getBoundingClientRect().height;
    event.preventDefault();
    previous?.animation.cancel();
    details.open = true;
    details.classList.add('is-animating');
    const to = opening ? details.scrollHeight + 2 : summary.offsetHeight + 2;
    const animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both',
    });
    accordions.set(details, { animation, opening });
    running.add(animation);
    if (opening) enter(details.querySelector('.capability__body'), 35);
    animation.addEventListener('finish', () => {
      details.open = opening;
      details.classList.remove('is-animating');
      accordions.delete(details);
      running.delete(animation);
      animation.cancel();
    }, { once: true });
    animation.addEventListener('cancel', () => running.delete(animation), { once: true });
  });
  document.addEventListener('toggle', event => {
    if (event.target.matches?.('.capability[open]') && !accordions.has(event.target)) enter(event.target.querySelector('.capability__body'));
  }, true);
  window.addEventListener('motion:change', () => {
    clearPointer();
    if (!motionOff()) { scheduleSpatial(); return; }
    running.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
    document.querySelectorAll('[data-spatial-media]').forEach(media => media.style.removeProperty('--media-drift'));
    ['--scene-x','--scene-y','--scene-drift'].forEach(property => scene?.style.removeProperty(property));
  });
  finePointer.addEventListener('change', () => { clearPointer(); scheduleSpatial(); });
})();
