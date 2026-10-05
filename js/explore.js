/* Goal exploration and section navigation. Native links stay usable without JS. */
(() => {
  'use strict';
  const reduced = () => window.SiteMotion?.isReduced() ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const running = new Set();
  const animate = (element, frames, options) => {
    if (!element?.animate || reduced()) return;
    const animation = element.animate(frames, options);
    running.add(animation);
    animation.addEventListener('finish', () => { running.delete(animation); animation.cancel(); }, { once:true });
    animation.addEventListener('cancel', () => running.delete(animation), { once:true });
    return animation;
  };
  const goals = {
    search: {
      title:'Start with search visibility.',
      description:'Review technical access, search intent and the pages people discover. Build a clearer set of priorities before adding more activity.',
      service:'technical-seo', label:'Explore SEO & audits',
      steps:['Audit the foundations','Understand demand','Set the priorities'],
    },
    conversion: {
      title:'Make the next step easier.',
      description:'Look at the journey from first visit to enquiry. Review landing pages, calls to action and measurement to find where useful changes can begin.',
      service:'conversion', label:'Explore conversion work',
      steps:['Map the journey','Find the friction','Review the changes'],
    },
    workflow: {
      title:'Improve one real workflow.',
      description:'Choose a repeatable task, then explore where AI can support it. Keep human review, useful documentation and output quality in the process.',
      service:'ai-workflows', label:'Explore AI workflows',
      steps:['Choose a useful task','Build a small pilot','Evaluate the output'],
    },
  };
  document.querySelectorAll('[data-goal-starter]').forEach(group => {
    const choices = [...group.querySelectorAll('[data-goal]')];
    const result = group.querySelector('.goal-starter__result');
    const title = group.querySelector('[data-goal-title]');
    const description = group.querySelector('[data-goal-description]');
    const service = group.querySelector('[data-goal-service]');
    const brief = group.querySelector('[data-goal-brief]');
    const steps = [...group.querySelectorAll('[data-goal-step]')];
    const status = group.querySelector('[data-goal-status]');
    let selection = 'search';
    function select(button, { force = false, notify = true } = {}) {
      const key = button.dataset.goal;
      const fallback = goals[key];
      if (!fallback || selection === key && !force) return;
      const value = (attr, defaultValue) => button.getAttribute(`data-goal-config-${attr}`) ?? defaultValue;
      const goal = {
        title:value('title',fallback.title), description:value('description',fallback.description),
        serviceUrl:value('service-url','/services#' + fallback.service), serviceLabel:value('service-label',fallback.label),
        briefUrl:value('brief-url','/contact?interest=' + fallback.service), briefLabel:value('brief-label','Start a brief'),
        steps:fallback.steps.map((step,index) => value(`step-${index+1}`,step)),
      };
      selection = key;
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      result.getAnimations().forEach(animation => animation.cancel());
      title.textContent = goal.title;
      description.textContent = goal.description;
      service.href = goal.serviceUrl;
      service.querySelector('span').textContent = goal.serviceLabel;
      brief.href = goal.briefUrl;
      const briefText = [...brief.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
      if (briefText) briefText.textContent = goal.briefLabel + ' ';
      steps.forEach((step,index) => step.textContent = goal.steps[index]);
      result.dataset.goalSelection = key;
      if (!notify) return;
      status.textContent = 'Suggested starting point: ' + goal.title;
      animate(result, [{opacity:.55,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'none'}], {duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
      group.querySelectorAll('.goal-map__node').forEach((node,index) => animate(node,
        [{transform:'translateY(8px) scale(.85)'},{transform:'translateY(0) scale(1)'}],
        {duration:480,delay:index*60,easing:'cubic-bezier(.22,1,.36,1)'}));
      window.dataLayer?.push({event:'portfolio_goal_select',goal:key,placement:document.body.dataset.page});
    }
    choices.forEach(choice => choice.addEventListener('click', () => select(choice)));
    group.querySelector('.goal-starter__choices').hidden = false;
    select(choices.find(choice => choice.dataset.goal === selection) || choices[0], { force:true, notify:false });
    window.addEventListener('site:preview-updated', () => {
      const choice = choices.find(choice => choice.dataset.goal === selection);
      if (choice) select(choice, { force:true, notify:false });
    });
  });

  const trackers = [];
  document.querySelectorAll('.page-index, .about-local-nav').forEach(nav => {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const items = links.map(link => ({link,target:document.getElementById(link.hash.slice(1))})).filter(item => item.target);
    if (!items.length) return;
    const marker = document.createElement('span');
    marker.className = 'section-index__indicator';
    marker.setAttribute('aria-hidden','true');
    nav.append(marker);
    nav.classList.add('has-section-tracker');
    const record = {nav,items,marker,index:-1};
    function place() {
      const link = items[Math.max(0,record.index)].link;
      const parent = nav.getBoundingClientRect(), bounds = link.getBoundingClientRect();
      Object.assign(marker.style,{width:bounds.width+'px',height:bounds.height+'px',transform:`translate(${bounds.left-parent.left}px,${bounds.top-parent.top}px)`});
    }
    record.place = place;
    trackers.push(record);
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(nav);
    links.forEach(link => link.addEventListener('click', () => {
      record.index = items.findIndex(item => item.link === link);
      items.forEach(item => item.link.toggleAttribute('data-section-active',item.link===link));
      items.forEach(item => item.link === link ? item.link.setAttribute('aria-current','location') : item.link.removeAttribute('aria-current'));
      place();
    }));
  });
  let frame = 0;
  function update() {
    frame = 0;
    trackers.forEach(record => {
      let index = 0;
      record.items.forEach((item,i) => { if (item.target.getBoundingClientRect().top <= innerHeight*.4) index=i; });
      if (record.index === index) return;
      record.index=index;
      record.items.forEach((item,i) => {
        item.link.toggleAttribute('data-section-active',i===index);
        if (i===index) item.link.setAttribute('aria-current','location'); else item.link.removeAttribute('aria-current');
      });
      record.place();
    });
  }
  const schedule = () => { if (trackers.length && !frame) frame=requestAnimationFrame(update); };
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',() => {trackers.forEach(record=>record.place());schedule();},{passive:true});
  document.fonts?.ready.then(() => trackers.forEach(record => record.place()));
  update();
  window.addEventListener('motion:change', () => {
    if (reduced()) running.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
  });
})();
