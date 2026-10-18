const field=(key,label,group,options={})=>({key,label,group,...options});
export const COLLECTIONS={
  posts:{title:'Articles',singular:'article',resource:'posts',back:'insights',description:'Write and publish the articles shown in Insights.',seo:true,event:'site:posts-changed',titleKey:'title',subtitleKey:'category',path:item=>`/post/${item.slug}`,fields:[
    field('title','Article title','Overview',{required:true,wide:true}),field('slug','URL slug','Overview',{hint:'Leave blank to generate it from the title. Changing a saved slug changes the public address.'}),field('category','Topic / category','Overview'),field('excerpt','Excerpt','Overview',{type:'textarea',wide:true}),
    field('date','Publish date','Publishing',{type:'date'}),field('reading_time','Reading time (minutes)','Publishing',{type:'number',default:5}),field('published','Published','Publishing',{type:'checkbox',default:false,hint:'Save with this checked to publish. Leave unchecked to save a private draft.'}),
    field('image_url','Card image','Images and video',{type:'image'}),field('image_alt','Card image alt text','Images and video',{wide:true}),field('blog_image_url','Article hero image','Images and video',{type:'image',hint:'Leave blank to use the card image.'}),field('hero_image_alt','Hero image alt text','Images and video',{wide:true}),
    field('video_url','Optional video file','Images and video',{type:'video',hint:'Direct MP4 or WebM URL. Shown before the article body.'}),field('video_poster','Video poster','Images and video',{type:'image'}),field('video_caption','Video caption','Images and video',{wide:true}),
    field('viz','Fallback artwork','Images and video',{type:'select',options:['network','bars','orbit','wave'],default:'network'}),field('accent','Accent color','Images and video',{type:'select',options:['violet','cyan'],default:'violet'}),
    field('body','Article content','Article body',{type:'richtext',wide:true}),
    field('meta_title','Meta title','SEO',{wide:true,target:60}),field('meta_description','Meta description','SEO',{type:'textarea',wide:true,target:160}),field('meta_keywords','Meta keywords','SEO',{wide:true,hint:'Optional. Major search engines generally ignore meta keywords.'}),field('canonical_url','Canonical URL','SEO',{wide:true,hint:'Absolute HTTPS address. Leave blank to use the article URL.'}),
    field('robots','Robots','SEO',{type:'select',options:['','index, follow, max-image-preview:large','noindex, follow','noindex, nofollow','index, nofollow'],hint:'Blank uses index, follow. Drafts remain private regardless of this setting.'}),
    field('og_title','OG title','SEO',{wide:true,target:60}),field('og_description','OG description','SEO',{type:'textarea',wide:true,target:160}),field('og_image_url','OG image','SEO',{type:'image',hint:'Leave blank to use the article cover.'}),
    field('schema_markup','Additional schema markup (JSON-LD)','SEO',{type:'json',wide:true,hint:'One object or an array of objects. BlogPosting and breadcrumbs are generated automatically.'}),
  ]},
  'gallery-media':{title:'Gallery captures',singular:'capture',resource:'gallery',back:'gallery',description:'Edit the actual captures shown in the gallery, including captions, category and display order.',event:'site:gallery-changed',allowGallery:true,titleKey:'alt',subtitleKey:'section',fields:[
    field('image_url','Capture image','Image and context',{type:'image',required:true}),field('alt','Image alt text','Image and context',{wide:true,required:true}),field('badge','Badge / date','Image and context'),field('caption','Caption','Image and context',{type:'textarea',wide:true}),
    field('section','Category','Placement',{type:'select',options:[],required:true}),field('sort_order','Order in category','Placement',{type:'number',default:0,hint:'Lower numbers appear first. Pinned captures appear before other captures.'}),field('pinned','Pin to the top of this category','Placement',{type:'checkbox',default:false}),field('highlight','Highlight this capture','Placement',{type:'checkbox',default:false}),
  ]},
  'gallery-sections':{title:'Gallery categories',singular:'category',resource:'gallery-sections',back:'gallery',description:'Edit category headings, filter labels, descriptions and their order.',event:'site:gallery-changed',titleKey:'label',subtitleKey:'key',fields:[
    field('key','Category key','Category details',{required:true,hint:'Lowercase words separated by hyphens. The key stays fixed after the category is created.'}),field('label','Category heading','Category details',{required:true,wide:true}),field('filter_label','Filter label','Category details',{hint:'A short label for the gallery filters.'}),field('eyebrow','Eyebrow','Category details'),field('description','Description','Category details',{type:'textarea',wide:true}),field('position','Category order','Category details',{type:'number',default:99}),
  ]},
};
for(const [page,config] of Object.entries(COLLECTIONS))for(const f of [...config.fields]){
  if(f.type!=='image'||f.group==='SEO'||f.key==='video_poster')continue;
  f.mediaTypeKey=page==='posts'?f.key+'_media_type':'media_type';f.mediaVideoKey=page==='posts'?f.key+'_video_url':'video_url';
  config.fields.push(field(f.mediaTypeKey,'Display as',f.group,{hidden:true,default:'image'}),field(f.mediaVideoKey,'Video link',f.group,{hidden:true,default:''}));
}
