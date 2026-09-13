/* Optional inner-page interactions. No global dependencies or Home changes. */
(() => {
  'use strict';
  if (document.body.dataset.page === 'home') return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let disabledByVisitor = false;
  try { disabledByVisitor = sessionStorage.getItem('fd-inner-motion') === 'off'; } catch {}
  const motionOff = () => reduced.matches || disabledByVisitor;
  const animate = (element, frames, options) => {
    if (!motionOff() && element?.animate) element.animate(frames, options);
  };

  // All panels remain readable without JavaScript. Enhance only after binding.
  document.querySelectorAll('[data-experience]').forEach(group => {
    const choices = [...group.querySelectorAll('[data-panel]')];
    const panels = [...group.querySelectorAll('.experience-panel')];
    if (!choices.length || !panels.length) return;
    const select = (button, withMotion) => {
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      panels.forEach(panel => {
        panel.hidden = panel.id !== button.dataset.panel;
        if (!panel.hidden && withMotion) animate(panel, [{opacity:.45,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
      });
    };
    choices.forEach(button => button.addEventListener('click', () => select(button,true)));
    group.classList.add('is-enhanced');
    select(choices[0],false);
  });

  document.querySelectorAll('[data-checklist]').forEach(group => {
    group.classList.add('is-enhanced');
    const checks = [...group.querySelectorAll('input[type="checkbox"]')];
    const progress = group.querySelector('progress');
    const output = group.querySelector('output');
    const update = () => {
      const count = checks.filter(input => input.checked).length;
      if (progress) { progress.max = checks.length; progress.value = count; }
      if (output) output.textContent = `${count} of ${checks.length} ${group.dataset.checklist || 'considered'}`;
    };
    group.addEventListener('change', update);
    update();
  });

  document.querySelectorAll('[data-copy-prompt]').forEach(button => {
    button.hidden = !navigator.clipboard?.writeText;
    button.addEventListener('click', async () => {
      const group = button.closest('[data-prompt]');
      const status = group?.querySelector('.copy-status');
      try {
        await navigator.clipboard.writeText(group.querySelector('blockquote p').textContent.trim());
        if (status) status.textContent = 'Prompt copied. Paste it into your own notes.';
      } catch {
        if (status) status.textContent = 'Copy is unavailable. You can select and copy the prompt above.';
      }
    });
  });

  const motionButton = document.querySelector('[data-motion-toggle]');
  const syncMotion = () => {
    document.body.classList.toggle('depth-motion-off',motionOff());
    if (motionOff()) document.getAnimations().forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
    if (motionButton) {
      motionButton.hidden = false;
      motionButton.setAttribute('aria-pressed',String(motionOff()));
      motionButton.textContent = reduced.matches ? 'Motion reduced by your device' : disabledByVisitor ? 'Motion off' : 'Motion on';
      motionButton.setAttribute('aria-label',reduced.matches ? 'Motion reduced by your device' : disabledByVisitor ? 'Motion off. Enable page motion' : 'Motion on. Reduce page motion');
      motionButton.disabled = reduced.matches;
    }
  };
  motionButton?.addEventListener('click', () => {
    disabledByVisitor = !disabledByVisitor;
    try { sessionStorage.setItem('fd-inner-motion',disabledByVisitor ? 'off' : 'on'); } catch {}
    syncMotion();
  });
  reduced.addEventListener('change',syncMotion);
  syncMotion();

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        animate(element,[{opacity:.6,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)',delay:Math.min(Number(element.dataset.enter)||0,180)});
        if (element.classList.contains('journey-diagram')) element.querySelectorAll('i').forEach((line,index)=>animate(line,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:700,delay:index*150,easing:'ease-out'}));
        revealObserver.unobserve(element);
      });
    },{threshold:.12});
    document.querySelectorAll('[data-enter]').forEach(element=>revealObserver.observe(element));
    const chapterObserver = new IntersectionObserver(entries => {
      entries.filter(entry=>entry.isIntersecting).forEach(entry=>{
        const journey=entry.target.closest('[data-journey]');
        journey.querySelectorAll('.journey-chapter').forEach(chapter=>chapter.classList.toggle('is-current',chapter===entry.target));
        journey.querySelectorAll('.journey-diagram span').forEach((node,index)=>node.classList.toggle('is-current',String(index+1)===entry.target.dataset.chapter));
      });
    },{rootMargin:'-15% 0px -40% 0px',threshold:0});
    document.querySelectorAll('.journey-chapter').forEach(chapter=>chapterObserver.observe(chapter));
  }

  const box = document.getElementById('lightbox');
  const image = document.getElementById('lightboxImg');
  if (box && image) {
    const controls = document.createElement('div');
    controls.className = 'gallery-navigation';
    controls.innerHTML = '<button type="button" data-gallery-prev aria-label="Previous screenshot">←</button><output aria-live="polite" aria-label="Screenshot position"></output><button type="button" data-gallery-next aria-label="Next screenshot">→</button>';
    const caption = document.createElement('p');
    caption.className = 'gallery-image-caption';
    box.append(caption,controls);
    box.classList.add('has-navigation');
    const previous = controls.querySelector('[data-gallery-prev]');
    const next = controls.querySelector('[data-gallery-next]');
    const counter = controls.querySelector('output');
    let index = 0;
    const items = () => [...document.querySelectorAll('.gallery-item img')];
    const sync = () => {
      const images = items();
      const current = images[index];
      if (!current) return;
      counter.textContent = `${index+1} / ${images.length}`;
      previous.disabled = index === 0;
      next.disabled = index === images.length-1;
      caption.textContent = current.closest('figure')?.querySelector('figcaption')?.textContent.trim() || current.alt;
    };
    const step = direction => {
      const images = items();
      if (!images.length) return;
      index = Math.max(0,Math.min(images.length-1,index+direction));
      image.src = images[index].currentSrc || images[index].src;
      image.alt = images[index].alt;
      sync();
      if (document.activeElement === previous && previous.disabled) next.focus();
      if (document.activeElement === next && next.disabled) previous.focus();
      animate(image,[{opacity:.5},{opacity:1}],{duration:220});
    };
    previous.addEventListener('click',()=>step(-1));
    next.addEventListener('click',()=>step(1));
    document.addEventListener('click',event=>{
      if (!event.target.matches('.gallery-item img')) return;
      index = items().indexOf(event.target);
      sync();
    });
    document.addEventListener('keydown',event=>{
      if (event.target.matches('.gallery-item img') && ['Enter',' '].includes(event.key)) {
        index = items().indexOf(event.target);
        sync();
      }
    });
    box.addEventListener('keydown',event=>{
      if (!box.classList.contains('is-open')) return;
      if (event.key==='ArrowLeft'||event.key==='ArrowRight') { event.preventDefault();event.stopPropagation();step(event.key==='ArrowLeft'?-1:1); }
      if (event.key==='Tab') {
        event.preventDefault();event.stopPropagation();
        const buttons=[...box.querySelectorAll('button:not(:disabled)')];
        const position=buttons.indexOf(document.activeElement);
        buttons[(position+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
      }
    });
  }
})();
