import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {createCmsStore} from './fixtures/cms-store.mjs';
import {SITE_FIELDS,editorDefaults,getEditorFields,siteNoIndexPaths,validateSiteSettings} from '../lib/site-settings.js';
import {handleSiteEditor,handleGallery,handleGallerySections,handlePosts} from '../api/admin.js';
import {renderSitePage} from '../api/site.js';
import {renderPublicPage} from '../lib/public-page.js';
import {loadPublicContent} from '../lib/public-content.js';
import {loadGalleryContent,ensureGalleryCollection,galleryUrl,galleryDefaults} from '../lib/gallery-content.js';
import {postNoIndexPaths} from '../lib/post-metadata.js';
import {buildSitemap} from '../lib/search.js';

const store=await createCmsStore(),noop=async()=>{};
const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;},setHeader(){}});
const site=async(page,action,data)=>{const res=response();await handleSiteEditor(store.sql,page,action,data,res,{migrate:noop});return res;};
const records=async(handler,action,id,data)=>{const res=response();await handler(store.sql,action,id,data,res,noop);return res;};
const counts={};
for(const page of ['gallery','about','insights']){
  const defaults=await editorDefaults(page);counts[page]=Object.keys(defaults).length;assert.equal(counts[page],getEditorFields(page).length);
  const template=load(await readFile(`${page==='insights'?'blog':page}.html`,'utf8'));
  for(const field of SITE_FIELDS[page])assert.equal(template(field.selector).length,1,`${page}: ${field.key}`);
  const changed={...defaults,'hero.title':`Edited <em>${page}</em>`,'seo.title':`Edited ${page} search title`,'seo.canonical':`https://fenil-dholariya.vercel.app/${page==='insights'?'blog':page}`,'seo.robots':'noindex, follow','seo.ogTitle':'Edited social title','seo.schema':{'@context':'https://schema.org','@type':'WebPage',name:page}};
  if(page==='about'){changed['portrait.image']='/assets/fenil.jpg';changed['career.1.company']='Edited employer';changed['approach.ai.body']='Edited practical AI explanation.';}
  if(page==='gallery'){changed['collection.all']='All evidence';changed['reading.1.title']='Compare the timeframe';}
  if(page==='insights'){changed['feature.slug']=[...store.posts.values()].at(-1).slug;changed['feature.banner']='A selected perspective';changed['library.read']='Open this article';changed['library.plural']='notes';}
  assert.equal((await site(page,'update',changed)).code,200);const loaded=await site(page,'get');assert.equal(loaded.body.item['hero.title'],changed['hero.title']);
  const html=page==='insights'?(await renderPublicPage('blog','',store.data(),Object.fromEntries(store.settings))).html:(await renderSitePage(page,Object.fromEntries(store.settings),page==='gallery'?{gallery:await loadGalleryContent(store.sql)}:{})).html;
  const $=load(html);assert.equal($('title').text(),changed['seo.title']);assert.equal($('meta[name="robots"]').attr('content'),'noindex, follow');assert.equal($('meta[property="og:title"]').attr('content'),'Edited social title');assert.equal(JSON.parse($('#ldJsonEditor').text()).name,page);
  if(page==='about'){assert.equal($('.about-career h3').first().text(),'Edited employer');assert.equal($('#discipline-ai > p:not(.eyebrow)').text(),changed['approach.ai.body']);}
  if(page==='gallery'){assert.equal($('#galleryRoot').attr('data-all-label'),'All evidence');assert.equal($('.evidence-reading__grid h3').first().text(),'Compare the timeframe');}
  if(page==='insights'){assert.equal($('#journalFeature h2').text(),[...store.posts.values()].at(-1).title);assert.equal($('#postsGrid .post-card__foot > span:first-child').first().text(),'Open this article');}
  const before=store.writes.length,preview=await site(page,'preview',{content:{...changed,'hero.title':'Unsaved preview title'},group:page==='about'?'Approach: Practical AI':''});assert.equal(preview.code,200);assert.equal(store.writes.length,before);const draft=load(preview.body.html);assert.equal(draft('h1').text(),'Unsaved preview title');assert.equal(draft('script,iframe,noscript,form,a[href],#loader').length,0);if(page==='about'){assert.equal(draft('#discipline-ai').is('[hidden]'),false);assert.equal(draft('#discipline-search').is('[hidden]'),true);}
  assert.throws(()=>validateSiteSettings(page,{'hero.title':'Fine','seo.canonical':'/relative'}),/https/);assert.throws(()=>validateSiteSettings(page,{'seo.robotsTxt':'Disallow: /'}),/Unknown content/);
}
assert.deepEqual(siteNoIndexPaths(Object.fromEntries(store.settings)),['/gallery','/about','/blog']);
const first=[...store.gallery.values()][0],edited={...first,caption:'A saved capture caption',alt:'An updated image description',sort_order:-2,pinned:true};
assert.equal((await records(handleGallery,'update',first.id,edited)).code,200);
let gallery=await loadGalleryContent(store.sql);assert.equal(gallery[0].items[0].caption,edited.caption);assert.equal(gallery[0].items[0].pinned,true);
const beforePreview=store.writes.length,capturePreview=await records(handleGallery,'preview',first.id,{...edited,caption:'Unsaved capture caption'});assert.equal(capturePreview.code,200);assert.equal(store.writes.length,beforePreview);assert.ok(capturePreview.body.html.includes('Unsaved capture caption'));assert.equal(store.gallery.get(first.id).caption,edited.caption);
assert.equal((await records(handleGallery,'update',first.id,{...edited,section:'unknown-category'})).code,400);
const category=[...store.categories.values()][0];assert.equal((await records(handleGallerySections,'delete',category.id)).code,409);
assert.equal((await records(handleGallerySections,'update',category.id,{...category,label:'Edited category heading',filter_label:'Edited filter'})).code,200);
assert.equal((await loadGalleryContent(store.sql))[0].filter_label,'Edited filter');
assert.equal((await records(handleGallery,'delete',first.id)).code,200);assert.equal((await loadGalleryContent(store.sql)).flatMap(s=>s.items).some(i=>i.id===first.id),false,'Deleted captures must not reappear from bundled HTML');
const post={title:'New editorial test',slug:'new-editorial-test',category:'SEO',excerpt:'An excerpt.',body:'<h2>A clear heading</h2><p>Useful content.</p>',date:'2026-10-17',reading_time:4,published:false,meta_title:'Custom article title',meta_description:'Custom article description',meta_keywords:'SEO, content',canonical_url:'https://fenil-dholariya.vercel.app/post/new-editorial-test',robots:'noindex, follow',og_title:'Custom share title',og_description:'Custom share description',og_image_url:'/assets/og.png',image_url:'/assets/fenil.jpg',image_alt:'A card image description',hero_image_alt:'A hero image description',video_url:'/assets/media/analytics-work.mp4',video_poster:'/assets/media/analytics-work-poster.webp',video_caption:'A helpful walkthrough',schema_markup:{'@context':'https://schema.org','@type':'FAQPage',mainEntity:[]}};
const created=await records(handlePosts,'create',null,post);assert.equal(created.code,200);const id=created.body.item.id;
assert.equal((await records(handlePosts,'update',id,{title:post.title,og_title:'A draft-only metadata edit'})).code,200);assert.equal(store.posts.get(id).published,false,'An update without a publish flag must not publish a private draft');
const publicContent=await loadPublicContent({configured:true,sql:store.sql,migrate:noop});assert.ok(!publicContent.posts.some(p=>p.slug===post.slug),'Private article drafts must stay out of public delivery');
const preview=await records(handlePosts,'preview',id,post);assert.equal(preview.code,200);const draft=load(preview.body.html);assert.equal(draft('title').text(),post.meta_title);assert.equal(draft('video').attr('src'),post.video_url);assert.equal(draft('script,form,iframe,noscript,a[href]').length,0);
const published=await records(handlePosts,'update',id,{...post,published:true});assert.equal(published.code,200);const content=await loadPublicContent({configured:true,sql:store.sql,migrate:noop});assert.ok(content.posts.some(p=>p.slug===post.slug));const rendered=await renderPublicPage('post',post.slug,content);const $=load(rendered.html);assert.equal(rendered.robots,post.robots);assert.equal($('meta[name="keywords"]').attr('content'),post.meta_keywords);assert.equal($('link[rel="canonical"]').attr('href'),post.canonical_url);assert.equal($('#postHeroWrap img').attr('alt'),post.hero_image_alt);assert.ok(!buildSitemap(content,postNoIndexPaths(content.posts)).includes('/post/new-editorial-test'));
assert.equal((await records(handlePosts,'update',id,{...post,canonical_url:'/relative'})).code,400);assert.equal((await records(handlePosts,'update',id,{...post,robots:'invalid'})).code,400);
const legacy=await createCmsStore({migrated:false});const removed=[...legacy.gallery.keys()].slice(0,3);removed.forEach(id=>legacy.gallery.delete(id));await ensureGalleryCollection(legacy.sql);assert.equal(legacy.gallery.size,(await galleryDefaults()).flatMap(s=>s.items).length,'One-time migration must preserve every currently visible bundled capture');
const migratedId=[...legacy.gallery.keys()][0];legacy.gallery.delete(migratedId);await ensureGalleryCollection((...args)=>legacy.sql(...args));assert.equal(legacy.gallery.has(migratedId),false,'A fresh server instance must respect later deletions');
assert.equal(galleryUrl('/assets/gallery/AI%20Searches2.webp'),'/assets/gallery/ai-searches-2.webp');
const emptyGallery=load((await renderSitePage('gallery',{gallery:{'collection.empty':'No evidence has been published yet.'}},{gallery:[]})).html);assert.equal(emptyGallery('[data-gallery-empty]').text(),'No evidence has been published yet.');
console.log(`PASS: ${JSON.stringify(counts)} page fields, persistence, selected previews, SEO, authoritative gallery migration/deletion, categories, article draft/publish, media and indexing. No live content writes.`);
