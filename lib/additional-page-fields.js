// Content targets belong to the existing public designs. Collection records
// (captures, categories and articles) are edited separately from page copy.
export function registerAdditionalPages(add) {
  add('about','About hero',[
    ['hero.kicker','Greeting','.about-kicker','textNode'],['hero.title','Headline','#about-title','markup'],['hero.lede','Introduction','.about-hero__copy > p'],
    ...[1,2].flatMap(i=>[[`hero.button.${i}.label`,`Button ${i} label`,`.about-hero__actions a:nth-child(${i})`,'textNode'],[`hero.button.${i}.url`,`Button ${i} URL`,`.about-hero__actions a:nth-child(${i})`,'attr','href']]),
    ['hero.location','Location','.about-hero__location span:first-of-type'],['hero.reach','Availability / reach','.about-hero__location span:last-of-type'],
  ]);
  add('about','Portrait and identity',[
    ['portrait.image','Portrait image','#portraitImg','attr','src'],['portrait.alt','Portrait alt text','#portraitImg','attr','alt'],
    ['portrait.note','Image note','.about-profile__note strong'],['portrait.noteDetail','Note detail','.about-profile__note small'],
    ['portrait.name','Display name','.about-profile__identity strong'],['portrait.role','Professional role','.about-profile__identity > span'],
  ]);
  add('about','Page navigation',[1,2,3].flatMap(i=>[[`navigation.${i}.label`,`Link ${i} label`,`.about-local-nav a:nth-child(${i})`,'lastTextNode'],[`navigation.${i}.url`,`Link ${i} URL`,`.about-local-nav a:nth-child(${i})`,'attr','href']]));
  add('about','Approach introduction',[
    ['approach.eyebrow','Eyebrow','#approach .about-section__heading .eyebrow'],['approach.title','Heading','#approach-title','markup'],['approach.description','Introduction','#approach .about-section__heading > p'],
  ]);
  for(const [key,name] of [['search','Search strategy'],['content','Useful content'],['ai','Practical AI']])add('about',`Approach: ${name}`,[
    [`approach.${key}.label`,'Choice label',`[data-panel="discipline-${key}"] strong`],[`approach.${key}.note`,'Choice description',`[data-panel="discipline-${key}"] small`],
    [`approach.${key}.eyebrow`,'Panel eyebrow',`#discipline-${key} > .eyebrow`],[`approach.${key}.title`,'Panel heading',`#discipline-${key} h3`,'markup'],
    [`approach.${key}.body`,'Panel description',`#discipline-${key} > p:not(.eyebrow)`],
    ...[1,2,3].map(i=>[`approach.${key}.point.${i}`,`Point ${i}`,`#discipline-${key} li:nth-child(${i})`]),
    [`approach.${key}.link`,'Link label',`#discipline-${key} .text-link`,'textNode'],[`approach.${key}.url`,'Link URL',`#discipline-${key} .text-link`,'attr','href'],
  ]);
  add('about','Experience introduction',[
    ['experience.eyebrow','Eyebrow','#experience .eyebrow'],['experience.title','Heading','#experience-title','markup'],['experience.intro','Introduction','#experience .about-section__heading > p'],
  ]);
  [1,2,3].forEach(i=>add('about',`Experience: Role ${i}`,[
    [`career.${i}.initials`,'Company initials',`.about-career > li:nth-child(${i}) .about-career__mark`],
    [`career.${i}.label`,'Role label',`.about-career > li:nth-child(${i}) .about-career__tag`],
    [`career.${i}.company`,'Company',`.about-career > li:nth-child(${i}) h3`],
    [`career.${i}.role`,'Job title',`.about-career > li:nth-child(${i}) .about-career__role`],
    [`career.${i}.period`,'Dates',`.about-career > li:nth-child(${i}) .about-career__date`],
  ]));
  add('about','Working principles',[
    ['principles.eyebrow','Eyebrow','.about-principles__intro .eyebrow'],['principles.title','Heading','#principles-title','markup'],['principles.body','Introduction','.about-principles__intro > p:not(.eyebrow)'],
    ['principles.image','Supporting image','.about-principles__photo img','attr','src'],['principles.imageAlt','Image alt text','.about-principles__photo img','attr','alt'],['principles.caption','Image caption','.about-principles__photo figcaption'],
    ...[1,2,3].flatMap(i=>[[`principles.${i}.title`,`Principle ${i} title`,`.about-principles__list li:nth-child(${i}) h3`],[`principles.${i}.body`,`Principle ${i} description`,`.about-principles__list li:nth-child(${i}) p`]]),
  ]);
  add('about','Evidence invitation',[
    ['evidence.title','Heading','.about-evidence strong'],['evidence.body','Description','.about-evidence p'],
    ...[1,2].flatMap(i=>[[`evidence.${i}.label`,`Link ${i} label`,`.about-evidence__links a:nth-child(${i})`,'textNode'],[`evidence.${i}.url`,`Link ${i} URL`,`.about-evidence__links a:nth-child(${i})`,'attr','href']]),
  ]);

  add('gallery','Gallery hero',[
    ['hero.kicker','Eyebrow','.evidence-intro .eyebrow'],['hero.title','Headline','#gallery-title','markup'],['hero.lede','Introduction','.evidence-intro .lead'],['hero.note','Supporting note','.evidence-intro__note'],
    ['hero.image','Preview image','.evidence-preview img','attr','src'],['hero.imageAlt','Preview image alt text','.evidence-preview img','attr','alt'],['hero.caption','Preview caption','.evidence-preview figcaption span:first-child'],['hero.period','Preview date','.evidence-preview figcaption span:last-child'],
  ]);
  add('gallery','Filters and viewer',[
    ['collection.all','All captures label','#galleryRoot','attr','data-all-label','All captures'],['collection.count','Capture count unit','#galleryRoot','attr','data-count-label','captures'],
    ['collection.more','Expand button label','#galleryRoot','attr','data-more-label','Show {count} more screenshots'],['collection.less','Collapse button label','#galleryRoot','attr','data-less-label','Show fewer screenshots'],
    ['collection.empty','Empty gallery message','#galleryRoot','attr','data-empty-label','No captures to show yet.'],
    ['viewer.label','Image viewer accessible name','#lightbox','attr','aria-label'],['viewer.close','Close button accessible name','.lightbox__close','attr','aria-label'],
  ]);
  add('gallery','Reading the evidence',[
    ['reading.eyebrow','Eyebrow','.evidence-reading .eyebrow'],['reading.title','Heading','.evidence-reading h2'],
    ...[1,2,3].flatMap(i=>[[`reading.${i}.title`,`Guidance ${i} heading`,`.evidence-reading__grid > div:nth-child(${i}) h3`],[`reading.${i}.body`,`Guidance ${i} description`,`.evidence-reading__grid > div:nth-child(${i}) p`]]),
    ['reading.link','Case studies link label','.evidence-reading .text-link'],['reading.url','Case studies URL','.evidence-reading .text-link','attr','href'],
  ]);

  add('insights','Insights hero',[
    ['hero.kicker','Journal name','.editorial-masthead > span:first-child'],['hero.author','Author line','.journal-author','textNode'],['hero.authorImage','Author image','.journal-author img','attr','src'],['hero.authorAlt','Author image alt text','.journal-author img','attr','alt'],
    ['hero.title','Headline','#insights-title','markup'],['hero.lede','Introduction','.journal-heading__row > p'],
  ]);
  add('insights','Featured article',[
    ['feature.slug','Featured article slug','#journalFeature','attr','data-feature-slug',''],['feature.banner','Image banner','#journalFeature','attr','data-feature-banner','THE LATEST PERSPECTIVE'],
    ['feature.label','Story label','#journalFeature','attr','data-feature-label','Featured read'],['feature.link','Story link label','#journalFeature','attr','data-feature-link','Read the story'],
  ]);
  add('insights','Article library',[
    ['library.title','Library heading','#library-title'],['library.placeholder','Search placeholder','#articleSearch','attr','placeholder'],
    ['library.searchLabel','Search accessible label','.article-search .sr-only'],['library.filterLabel','Topic filter accessible name','#filterBar','attr','aria-label'],
    ['library.all','All topics label','#filterBar','attr','data-all-label','All articles'],['library.singular','Singular count label','#articleCount','attr','data-singular','article'],['library.plural','Plural count label','#articleCount','attr','data-plural','articles'],
    ['library.read','Card link label','#postsGrid','attr','data-read-label','Read article'],['library.minutes','Reading time unit','#postsGrid','attr','data-minutes-label','min'],
    ['library.emptyTitle','Empty results heading','#emptyState h3'],['library.emptyBody','Empty results description','#emptyState p'],['library.clear','Clear search button','#clearArticleSearch'],
  ]);
  add('insights','Editorial note',[
    ['note.eyebrow','Eyebrow','.journal-note .eyebrow'],['note.title','Heading','.journal-note h2','markup'],['note.body','Description','.journal-note__grid > div > p'],['note.link','About link label','.journal-note .text-link','textNode'],['note.url','About link URL','.journal-note .text-link','attr','href'],
  ]);
}
