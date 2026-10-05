// Shared contract for the case study editor and its server validation.
const text = (key, label, extra = {}) => ({ key, label, ...extra });
export const PROJECT_SECTIONS = [
  { name:'Overview', description:'The case study headline, client context and public address.', fields:[
    text('title','Case study title',{required:true,wide:true}), text('slug','URL slug',{hint:'Lowercase words separated by hyphens. Changing this changes the public address.'}),
    text('category','Industry / category'), text('client','Client'), text('period','Timeline'), text('services','Services provided',{hint:'Comma-separated names, shown as tags.'}),
    text('desc','Short summary',{type:'textarea',wide:true}), text('sort_order','Collection order',{type:'number',default:0,hint:'Lower numbers appear first on Work.'}), text('featured','Show in home page highlights',{type:'checkbox',default:true}),
  ]},
  { name:'Work card', description:'Card presentation on the Work collection. The case study headline remains separate.', fields:[
    text('listing_title','Work card title',{wide:true,hint:'Leave blank to use the existing display title or the case study title.'}),
    text('listing_description','Work card description',{type:'textarea',wide:true,hint:'Leave blank to use the existing display description or summary.'}),
    text('work_category','Work filter category',{type:'select',options:[{value:'',label:'Automatic from industry'},{value:'commerce',label:'E-commerce'},{value:'local',label:'Local services'},{value:'b2b',label:'B2B & SaaS'},{value:'other',label:'All work only'}]}),
    text('viz','Fallback animation',{type:'select',options:['network','bars','orbit','wave']}), text('accent','Accent color',{type:'select',options:['violet','cyan']}),
  ]},
  { name:'Images and video', description:'The shared card / case study cover and an optional film below the cover. Files must already be published.', fields:[
    text('image_url','Cover image',{type:'image',wide:true,hint:'Leave blank to use the existing editorial cover or a text cover.'}), text('image_alt','Cover image alt text',{wide:true}),
  ]},
  { name:'Headline metrics', description:'Results below the hero. The first metric also appears on the Work card.', fields:[text('metrics','Headline metrics',{type:'metrics',wide:true,hint:'One result per line: value | label. Use only figures you can substantiate.'})]},
  { name:'Challenge', description:'The starting problem and constraints.', fields:[text('challenge','Challenge content',{type:'richtext',wide:true})]},
  { name:'Approach', description:'Your decisions and implementation sequence.', fields:[text('approach','Approach content',{type:'richtext',wide:true})]},
  { name:'Results', description:'The outcome and supporting evidence.', fields:[text('results_text','Results content',{type:'richtext',wide:true})]},
  { name:'Takeaway and testimonial', description:'The lesson and an optional client quote.', fields:[text('takeaway','Key takeaway',{type:'textarea',wide:true}),text('testimonial','Client testimonial',{type:'textarea',wide:true}),text('testimonial_author','Testimonial author',{wide:true})]},
  { name:'Extra content', description:'Additional detail after the structured story. Supports formatted text, lists and images.', fields:[text('body','Extra content',{type:'richtext',wide:true})]},
  { name:'Page labels and links', description:'Section headings, overview labels, author details and related work links.', fields:[]},
  { name:'Closing reflection', description:'The checklist and invitation at the end of this case study.', fields:[]},
];
export const PROJECT_FIELDS = PROJECT_SECTIONS.flatMap(section => section.fields);
export const PROJECT_SETTINGS_FIELDS = [
  text('cover.caption','Cover caption',{group:'Images and video'}),
  text('video.url','Video file URL',{group:'Images and video',type:'video',wide:true,hint:'Published MP4 or WebM file path, or a direct HTTPS video URL. Leave blank to hide the video.'}),
  text('video.poster','Video poster image',{group:'Images and video',type:'image',wide:true}),text('video.caption','Video caption',{group:'Images and video'}),
  ...[['challenge.heading','Challenge heading','Challenge','The Challenge'],['approach.heading','Approach heading','Approach','The Approach'],['results.heading','Results heading','Results','The Results'],['takeaway.heading','Takeaway label','Takeaway and testimonial','Key takeaway']].map(([key,label,group,defaultValue])=>text(key,label,{group,default:defaultValue})),
  ...[['client','Client'],['industry','Industry'],['timeline','Timeline'],['services','Services']].map(([key,label])=>text(`glance.${key}`,`${label} overview label`,{group:'Page labels and links',default:label})),
  text('hero.clientLabel','Client label above headline',{group:'Page labels and links',default:'Client'}),
  ...[
    ['author.initials','Author initials','.author-box .quote__avatar'],['author.name','Author name','.author-box .quote__name'],['author.role','Author role','.author-box .quote__role'],
    ['author.button','Author button label','.author-box .btn'],['author.url','Author button URL','.author-box .btn','href'],
    ['related.eyebrow','Related work eyebrow','#relatedProjectsSection .eyebrow'],['related.title','Related work heading','#relatedProjectsSection h2','markup'],
  ].map(([key,label,selector,mode])=>text(key,label,{group:'Page labels and links',selector,mode:mode || 'text',wide:mode==='markup'})),
  ...[
    ['closing.eyebrow','Eyebrow','.depth-heading .eyebrow'],['closing.title','Headline','.depth-heading h2','markup'],['closing.description','Supporting paragraph','.depth-heading > p:last-child'],
    ['closing.button','Button label','.practical-checklist > div > .text-link','linkText'],['closing.url','Button URL','.practical-checklist > div > .text-link','href'],
    ['closing.legend','Checklist heading','.practical-checklist legend'],['closing.note','Reflection note','.practical-checklist .depth-note'],
    ...[0,1,2].flatMap(i=>[[`closing.question.${i}` ,`Question ${i+1}`,`label[for="case-check-${i}"] strong`],[`closing.answer.${i}`,`Question ${i+1} explanation`,`label[for="case-check-${i}"] small`]]),
  ].map(([key,label,selector,mode])=>text(key,label,{group:'Closing reflection',selector,mode:mode || 'text',wide:true,type:mode==='markup' || /description|answer|note/.test(key)?'textarea':undefined})),
  text('seo.title','Meta title',{group:'SEO',wide:true,target:60}),text('seo.description','Meta description',{group:'SEO',type:'textarea',wide:true,target:160}),
  text('seo.keywords','Meta keywords',{group:'SEO',wide:true,hint:'Optional. Major search engines generally ignore meta keywords.'}),text('seo.canonical','Canonical URL',{group:'SEO',wide:true,hint:'Preferred absolute HTTPS address. Leave blank to use this case study URL.'}),
  text('seo.robots','Robots',{group:'SEO',type:'select',default:'index, follow, max-image-preview:large',options:['index, follow, max-image-preview:large','noindex, follow','noindex, nofollow','index, nofollow'],hint:'Controls indexing and link following for this page. Sitewide robots.txt is managed in Home page SEO.'}),
  text('seo.ogTitle','OG title',{group:'SEO',wide:true,target:60}),text('seo.ogDescription','OG description',{group:'SEO',type:'textarea',wide:true,target:160}),text('seo.ogImage','OG image',{group:'SEO',type:'image',wide:true,hint:'Leave blank to use the case study cover. Recommended size: 1200 × 630.'}),
];
