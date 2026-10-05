import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { handleProjects } from '../api/admin.js';
import { SEED } from '../lib/seed-data.js';
import { renderPublicPage } from '../lib/public-page.js';
import { projectSettingsFields, validateProjectContent, projectNoIndexPaths } from '../lib/project-settings.js';
import { buildSitemap } from '../lib/search.js';

const rows=new Map();let nextId=1,writes=0;
const assign=(row,key,value)=>row[key==='description'?'desc':key]=['metrics','schema_markup','page_settings'].includes(key)?JSON.parse(value):value;
const sql=async(query,params=[])=>{
  if(query.startsWith('CREATE TABLE'))return [];
  if(query.startsWith('SELECT key, content') || query.includes('FROM posts'))return [];
  if(query.startsWith('SELECT') && query.includes('FROM projects'))return [...rows.values()];
  if(query.startsWith('INSERT INTO projects')){writes++;const row={id:nextId++};const columns=query.match(/INSERT INTO projects \(([^)]+)\)/)[1].split(',').map(k=>k.trim());assert.equal(columns.length,params.length);columns.forEach((k,i)=>assign(row,k,params[i]));rows.set(row.id,row);return [{...row}];}
  if(query.startsWith('UPDATE projects')){writes++;assert.equal(Number(query.match(/WHERE id = \$(\d+)/)[1]),params.length);const row=rows.get(params.at(-1));if(!row)return [];for(const match of query.split(' SET ')[1].split(' WHERE ')[0].matchAll(/(\w+)=(COALESCE\()?\$(\d+)/g)){const value=params[Number(match[3])-1];if(match[2]&&value===null)continue;assign(row,match[1],value);}return [{...row}];}
  if(query.startsWith('DELETE FROM projects')){writes++;rows.delete(params[0]);return [];}
  throw new Error('Unexpected query');
};
const call=async(action,id,data)=>{const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;},setHeader(){}};await handleProjects(sql,action,id,data,res,async()=>{});return res;};
const settings={
  'seo.title':'Custom case study search title','seo.description':'Custom search description','seo.keywords':'case study, SEO',
  'seo.canonical':'https://fenil-dholariya.vercel.app/work/custom-case','seo.robots':'noindex, follow',
  'seo.ogTitle':'Custom share title','seo.ogDescription':'Custom share description','seo.ogImage':'/assets/og.png',
  'challenge.heading':'Starting constraints','approach.heading':'Implementation','results.heading':'Measured outcome','takeaway.heading':'The lesson',
  'glance.client':'Business','glance.industry':'Sector','glance.timeline':'Duration','glance.services':'Scope','hero.clientLabel':'Business',
  'author.name':'Updated author','author.button':'Discuss this project','author.url':'/contact#case-study',
  'related.title':'Other <em>engagements</em>','closing.question.0':'What is your baseline?',
  'video.url':'/assets/media/analytics-work.mp4','video.poster':'/assets/media/analytics-work-poster.webp','video.caption':'Implementation walkthrough',
};
const created=await call('create',null,{...SEED.projects[0],slug:'custom-case',page_settings:settings,schema_markup:{'@context':'https://schema.org','@type':'CreativeWork',name:'Custom data'}});
assert.equal(created.code,200);const project=created.body.item;assert.deepEqual(project.page_settings,settings);
const listed=await call('list');assert.deepEqual(listed.body.items[0].page_settings,settings);
const fields=await projectSettingsFields();
const original=load((await renderPublicPage('project',SEED.projects[0].slug,{posts:[],projects:SEED.projects})).html);
for(const field of fields.filter(f=>f.selector))assert.equal(original(field.selector).length,1,`Case study field ${field.key} must have exactly one target`);
assert.equal(fields.find(f=>f.key==='author.name').default,'Fenil Dholariya');
assert.equal(original('video').length,0,'Existing case studies must not gain a video until configured');
const rendered=await renderPublicPage('project',project.slug,{posts:[],projects:[project]});const $=load(rendered.html);
assert.equal($('title').text(),settings['seo.title']);assert.equal($('meta[name="description"]').attr('content'),settings['seo.description']);
assert.equal($('meta[name="keywords"]').attr('content'),settings['seo.keywords']);assert.equal($('link[rel="canonical"]').attr('href'),settings['seo.canonical']);assert.equal(rendered.robots,'noindex, follow');
for(const prefix of ['og','twitter']){
  const attr=prefix==='og'?'property':'name';
  assert.equal($(`meta[${attr}="${prefix}:title"]`).attr('content'),settings['seo.ogTitle']);assert.equal($(`meta[${attr}="${prefix}:description"]`).attr('content'),settings['seo.ogDescription']);assert.match($(`meta[${attr}="${prefix}:image"]`).attr('content'),/\/assets\/og.png$/);
}
assert.equal($('.cs-section h2').first().text(),settings['challenge.heading']);assert.equal($('.cs-takeaway .eyebrow').text(),settings['takeaway.heading']);assert.equal($('.cs-glance__item span').first().text(),'Business');
assert.equal($('.author-box .quote__name').text(),'Updated author');assert.equal($('.author-box .btn').attr('href'),'/contact#case-study');assert.equal($('#relatedProjectsSection h2 em').text(),'engagements');assert.equal($('label[for="case-check-0"] strong').text(),'What is your baseline?');
assert.equal($('.project-film video').attr('src'),settings['video.url']);assert.equal($('.project-film video').attr('poster'),settings['video.poster']);assert.equal($('.project-film figcaption').text(),settings['video.caption']);
assert.equal(JSON.parse($('#ldJsonCustom').text()).name,'Custom data');
assert.deepEqual(projectNoIndexPaths([project]),['/work/custom-case']);assert.ok(!buildSitemap({posts:[],projects:[project]},projectNoIndexPaths([project])).includes('/work/custom-case'));
const oldClient={...project};delete oldClient.page_settings;const preserved=await call('update',project.id,oldClient);assert.deepEqual(preserved.body.item.page_settings,settings,'Older clients must preserve case study settings');
const beforePreview=writes;const preview=await call('preview',project.id,{...project,title:'Unsaved headline',slug:'unsaved-case',challenge:'<p>Draft detail</p><script>alert(1)</script>',page_settings:{...settings,'closing.button':'Draft invitation'}});
assert.equal(preview.code,200);assert.equal(writes,beforePreview,'Preview must not write content');assert.equal(rows.get(project.id).title,project.title);
const draft=load(preview.body.html);assert.equal(draft('#projectTitle').text(),'Unsaved headline');assert.equal(draft('script,form,iframe,noscript,a[href]').length,0,'Preview must disable executable content, tracking embeds and navigation');assert.equal(draft('.practical-checklist > div > .text-link').text().trim(),'Draft invitation ↗');
const cleared=await call('update',project.id,{...project,page_settings:{'seo.title':'','seo.description':'','seo.canonical':'','seo.ogTitle':'','seo.ogDescription':'','seo.ogImage':'','video.url':''}});
assert.equal(cleared.code,200);const fallback=load((await renderPublicPage('project',project.slug,{posts:[],projects:[cleared.body.item]})).html);assert.equal(fallback('title').text(),`${project.title} - Fenil Dholariya`);assert.equal(fallback('meta[property="og:title"]').attr('content'),fallback('title').text());assert.equal(fallback('.project-film').length,0);
for(const change of [{title:''},{image_url:'javascript:alert(1)'},{page_settings:{'seo.canonical':'/work/custom-case'}},{page_settings:{'seo.robots':'garbage'}},{page_settings:{'video.url':'https://youtube.com/watch?v=test'}},{metrics:'bad'},{schema_markup:'bad'}])assert.equal((await call('update',project.id,{...project,...change})).code,400);
assert.throws(()=>validateProjectContent({...project,page_settings:{'author.url':'https://user:password@example.com'}}),/valid HTTPS/);
assert.equal((await call('update',999,project)).code,404);
console.log('PASS: Case study settings persistence, defaults, SEO/OG/robots, sitemap exclusions, media, labels, schema, safe unsaved preview, clear/fallback, legacy clients and invalid input. No live content writes.');
