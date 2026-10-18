import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {videoSource,videoMarkup,mediaChoice} from '../js/video-media.js';
import {SITE_FIELDS,editorDefaults,validateSiteSettings} from '../lib/site-settings.js';
import {validatePostContent} from '../lib/post-metadata.js';
import {validateProjectSettings} from '../lib/project-settings.js';
import {renderSitePage} from '../api/site.js';
import {renderPublicPage} from '../lib/public-page.js';
import {loadGalleryContent} from '../lib/gallery-content.js';
import {handleSiteEditor,handleGallery,handlePosts,handleProjects} from '../api/admin.js';
import {createCmsStore} from './fixtures/cms-store.mjs';
const yt='https://www.youtube.com/watch?v=M7lc1UVf-VE',ig='https://www.instagram.com/reel/TEST_public123/',noop=async()=>{};
for(const url of [yt,'https://youtu.be/M7lc1UVf-VE?t=1m30s','https://www.youtube.com/shorts/M7lc1UVf-VE','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'])assert.equal(videoSource(url)?.provider,'youtube');
assert.ok(videoSource('https://youtu.be/M7lc1UVf-VE?t=1m30s').embed.endsWith('&start=90'));
assert.equal(videoSource(ig+'?igsh=example').embed,'https://www.instagram.com/reel/TEST_public123/embed/');
for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://www.instagram.com@evil.test/reel/test/','https://user:pass@youtube.com/watch?v=M7lc1UVf-VE','//www.youtube.com/embed/M7lc1UVf-VE','https://www.youtube.com/watch?v=bad-id','https://www.instagram.com/accounts/login/','<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE">'])assert.equal(videoSource(url),null,url);
assert.equal(videoSource('/assets/media/analytics-work.mp4')?.provider,'file');
assert.equal(load(videoMarkup(yt,{title:'A "safe" <title>'}))('iframe').attr('title'),'A "safe" <title> (YouTube)');
const control=load(mediaChoice({key:'cover',typeKey:'type',videoKey:'video',type:'image',scope:'test'}));assert.deepEqual(control('select option').map((_,n)=>control(n).text()).get(),['Image','Video']);
const store=await createCmsStore(),res=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
async function site(page,action,data){const r=res();await handleSiteEditor(store.sql,page,action,data,r,{migrate:noop});return r;}
async function record(handler,action,id,data){const r=res();await handler(store.sql,action,id,data,r,noop);return r;}
for(const page of ['home','services','work','gallery','about']){
  const source=SITE_FIELDS[page].find(f=>f.mediaTypeKey);assert.ok(source,page);const before=await editorDefaults(page);
  const data={[source.mediaTypeKey]:'video',[source.mediaVideoKey]:yt};assert.equal((await site(page,'update',data)).code,200,page);
  const settings=Object.fromEntries(store.settings);const result=page==='work'?await renderPublicPage('work','',store.data(),settings):await renderSitePage(page,settings,page==='gallery'?{gallery:await loadGalleryContent(store.sql)}:{});const $=load(result.html);
  assert.ok($('iframe[src^="https://www.youtube-nocookie.com/embed/"]').length,page);assert.ok(!$('a iframe').length,'Provider controls must not sit inside navigation links');
  const preview=await site(page,'preview',{content:data});assert.equal(preview.code,200);assert.equal(load(preview.body.html)('iframe,script').length,0);assert.ok(preview.body.html.includes('YouTube video'));
  assert.equal((await site(page,'update',{[source.mediaTypeKey]:'image'})).code,200);const current=(await site(page,'get')).body.item;assert.equal(current[source.key],before[source.key]);assert.equal(current[source.mediaVideoKey],yt);
}
assert.throws(()=>validateSiteSettings('home',{'hero.image.videoUrl':'https://evil.test/embed/123'}),/YouTube/);
assert.equal((await site('home','update',{'case.image.mediaType':'video'})).code,400,'Video requires a URL before saving');
const gallery=[...store.gallery.values()][0],galleryBefore=gallery.image_url;
assert.equal((await record(handleGallery,'update',gallery.id,{...gallery,media_type:'video',video_url:ig})).code,200);
let rendered=load((await renderSitePage('gallery',Object.fromEntries(store.settings),{gallery:await loadGalleryContent(store.sql)})).html);assert.equal(rendered('.gallery-item--video iframe').attr('src'),videoSource(ig).embed);
assert.equal((await record(handleGallery,'update',gallery.id,{...store.gallery.get(gallery.id),media_type:'image'})).code,200);assert.equal(store.gallery.get(gallery.id).image_url,galleryBefore);
const bad=await record(handleGallery,'update',gallery.id,{...gallery,media_type:'video',video_url:'https://evil.test/iframe'});assert.equal(bad.code,400);
const post={title:'Media test',slug:'media-test',category:'SEO',excerpt:'Video cover test.',body:'<p>Article body.</p>',date:'2026-10-18',reading_time:3,published:true,image_url:'/assets/fenil.jpg',image_url_media_type:'video',image_url_video_url:yt,blog_image_url:'/assets/fenil.jpg',blog_image_url_media_type:'video',blog_image_url_video_url:ig};
const created=await record(handlePosts,'create',null,post);assert.equal(created.code,200);const id=created.body.item.id;assert.equal(store.posts.get(id).image_url_video_url,yt);
rendered=load((await renderPublicPage('post',post.slug,store.data())).html);assert.equal(rendered('#postHeroWrap iframe').attr('src'),videoSource(ig).embed);
rendered=load((await renderPublicPage('blog','',store.data())).html);assert.ok(rendered('#postsGrid iframe[src^="https://www.youtube-nocookie.com"]').length);assert.ok(rendered('#journalFeature iframe').length);assert.equal(rendered('a iframe').length,0);
assert.equal((await record(handlePosts,'update',id,{...post,image_url_media_type:'image',blog_image_url_media_type:'image'})).code,200);rendered=load((await renderPublicPage('post',post.slug,store.data())).html);assert.equal(rendered('#postHeroWrap iframe').length,0);assert.equal(rendered('#postHeroWrap img').attr('src'),post.blog_image_url);
const project=[...store.projects.values()][0],projectBefore=project.image_url;assert.equal((await record(handleProjects,'update',project.id,{...project,page_settings:{'cover.mediaType':'video','cover.videoUrl':yt}})).code,200);rendered=load((await renderPublicPage('project',project.slug,store.data())).html);assert.equal(rendered('#projectHeroWrap iframe').attr('src'),videoSource(yt).embed);rendered=load((await renderPublicPage('work','',store.data())).html);assert.ok(rendered('.work-project iframe').length);assert.equal(rendered('a iframe').length,0);
assert.throws(()=>validateProjectSettings({'cover.mediaType':'video','cover.videoUrl':'https://evil.test/embed/123'}),/YouTube/);assert.throws(()=>validatePostContent({...post,image_url_video_url:'javascript:alert(1)'}),/YouTube/);
for(const page of ['home','services','work','gallery','about'])for(const f of SITE_FIELDS[page].filter(f=>f.mediaTypeKey))assert.ok(!/logo|brand|authorImage/i.test(f.key));
const csp=JSON.parse(await readFile('vercel.json','utf8')).headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy').value;assert.ok(csp.includes('https://www.youtube-nocookie.com https://www.instagram.com'));
console.log('PASS: Image/Video controls, YouTube/Shorts/Reel URL parsing, unsafe embed rejection, page/record saves, server delivery, media restore, linked card accessibility, scriptless previews and provider CSP. Isolated storage only; provider playback tested separately.');
