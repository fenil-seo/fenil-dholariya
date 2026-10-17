import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {PAGE_SECTIONS,defaultSections,validateSections} from '../lib/page-sections.js';
import {serviceCatalog,validateServiceCatalog} from '../lib/service-catalog.js';
import {SITE_FIELDS} from '../lib/site-settings.js';
import {handleSiteEditor,handleGallerySections} from '../api/admin.js';
import {renderSitePage} from '../api/site.js';
import {renderPublicPage} from '../lib/public-page.js';
import {createCmsStore} from './fixtures/cms-store.mjs';
import {catalogMarkup,customSectionFields} from '../js/page-section-controls.js';
const store=await createCmsStore(),res=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
async function call(page,action,data){const r=res();await handleSiteEditor(store.sql,page,action,data,r,{migrate:async()=>{}});return r;}
const render=async(page,settings)=>['work','insights'].includes(page)?renderPublicPage(page==='work'?'work':'blog','',store.data(),settings):renderSitePage(page,settings);
for(const [page,definitions] of Object.entries(PAGE_SECTIONS)){
  const name=page==='home'?'index':page==='insights'?'blog':page,$=load((await readFile(`${name}.html`,'utf8')).replace(/^\uFEFF/,''));
  for(const def of definitions){assert.equal($(def.selector).length,1,`${page}: section selector ${def.id}`);if(!def.fixed)assert.equal($(def.selector).parent().is('main'),true,`${page}: ${def.id} must be a complete outer section`);}
  for(const field of SITE_FIELDS[page].filter(f=>!/^service\./.test(f.key)&&!/^services\.item\./.test(f.key)))assert.ok(definitions.some(d=>d.groups.includes(field.group)),`${page}: missing field group ${field.group}`);
  const before=load((await render(page,{})).html),after=load((await render(page,{[page]:{'layout.sections':defaultSections(page)}})).html);
  assert.deepEqual(after('main').children().toArray().map(n=>after(n).html()),before('main').children().toArray().map(n=>before(n).html()),`${page}: default layout preserves every original section`);
}
const expected=['Header / navigation','Selected case · D2C commerce','How I work','Find a starting point','Services','More selected work','The work gallery','A useful fit'];
const home=await call('home','get');for(const name of expected)assert.ok(home.body.sections.some(s=>s.title===name));assert.ok(home.body.fields.some(f=>f.key==='goal.workflow.title'));
const initial=await serviceCatalog();assert.equal(initial.length,8);
const controls=load(catalogMarkup(initial,'','home')+catalogMarkup(initial,'','services')+customSectionFields({type:'text'},'about'));
const controlIds=controls('[id]').toArray().map(n=>controls(n).attr('id'));assert.equal(new Set(controlIds).size,controlIds.length,'Cached page editors must not share control IDs');
for(const label of controls('label[for]').toArray())assert.ok(controlIds.includes(controls(label).attr('for')),'Every label targets its own control');
const migrated=await serviceCatalog({services:{'service.technical-seo.title':'Owner saved service','service.technical-seo.scope.1':'Owner saved scope'}});assert.equal(migrated[0].title,'Owner saved service');assert.equal(migrated[0].scope[0],'Owner saved scope');
const added={id:'measurement-planning',title:'Measurement planning',intro:'Clarify the measurement plan.',body:'Agree what to measure before implementation.',scopeTitle:'Scope',scope:['Baseline','Event plan','Review'],button:'Discuss measurement',url:'/contact?interest=measurement-planning',published:true,showOnHome:true};
const catalog=validateServiceCatalog([...initial,added]);
assert.equal((await call('services','update',{'hero.lede':'Saved introduction.','shared.services':catalog})).code,200);
let settings=Object.fromEntries(store.settings),a=load((await render('home',settings)).html),b=load((await render('services',settings)).html);
assert.equal(a('.home-service-index a').length,9);assert.equal(a('.home-service-index a:last-child h3').text(),added.title);assert.equal(a('.home-service-index a:last-child').attr('href'),'/services#'+added.id);assert.equal(b('#'+added.id+' .capability__title').text(),added.title);assert.equal(JSON.parse(b('#ldJsonServices').text()).hasOfferCatalog.itemListElement.length,9);assert.ok(!a('.home-services .section-intro').text().includes('Eight services'));
// Both editors load the same authoritative catalog. A page-only save must not
// copy stale service forms over a catalog saved from another workspace.
assert.deepEqual((await call('home','get')).body.item['shared.services'],catalog);
const baseCopy=structuredClone(catalog),newer=structuredClone(catalog);newer[0].title='Saved in another session';
await call('services','update',{'shared.services':newer,'shared.servicesBase':baseCopy});
const writesBefore=store.writes.length,conflict=await call('home','update',{'hero.lede':'Must not be saved on conflict','shared.services':catalog,'shared.servicesBase':baseCopy});assert.equal(conflict.code,409);assert.equal(store.writes.length,writesBefore);assert.equal(store.settings.get('service-catalog').items[0].title,newer[0].title);
// PostgreSQL JSONB can return object keys in another order. This must not be
// mistaken for somebody changing the catalog.
store.settings.get('service-catalog').items=newer.map(item=>Object.fromEntries(Object.entries(item).reverse()));
assert.equal((await call('home','update',{'shared.services':catalog,'shared.servicesBase':newer})).code,200);
await call('home','update',{'hero.lede':'Independent home edit.'});assert.deepEqual(store.settings.get('service-catalog').items,catalog);
catalog[0].title='Renamed in Home';catalog[1].showOnHome=false;catalog[2].published=false;catalog.reverse();await call('home','update',{'shared.services':catalog});
settings=Object.fromEntries(store.settings);a=load((await render('home',settings)).html);b=load((await render('services',settings)).html);assert.equal(a('.home-service-index a').length,7);assert.equal(b('.capability').length,8);assert.equal(a('.home-service-index a:first-child h3').text(),added.title);assert.equal(b('#technical-seo .capability__title').text(),'Renamed in Home');assert.equal(b('#local-seo').length,0);
const layout=defaultSections('home'),block={id:'custom-proof',title:'New evidence section',type:'image',hidden:false,eyebrow:'Context',heading:'A clear heading',body:'First line\nSecond line',image:'/assets/fenil.jpg',alt:'Portrait',video:'',poster:'',button:'Read more',url:'/work'};
layout.find(s=>s.id==='method').hidden=true;const moved=layout.splice(layout.findIndex(s=>s.id==='fit'),1)[0];layout.splice(1,0,moved);layout.splice(3,0,block);layout.splice(layout.findIndex(s=>s.id==='closing'),1);
assert.equal((await call('home','update',{'layout.sections':layout})).code,200);settings=Object.fromEntries(store.settings);a=load((await render('home',settings)).html);assert.equal(a('.method-section').length,0);assert.equal(a('.closing-cta').length,0);assert.equal(a('main').children().first().is('.fit-section'),true);assert.equal(a('#custom-proof h2').text(),block.heading);assert.equal(a('#custom-proof img').attr('alt'),block.alt);assert.equal(a('#custom-proof .btn').attr('href'),block.url);
const preview=await call('home','preview',{content:{'layout.sections':layout,'hero.lede':'Private draft.'},group:block.id});assert.equal(preview.code,200);const p=load(preview.body.html);assert.equal(p('main').children().length,1);assert.equal(p('#custom-proof').length,1);assert.equal(p('script,iframe,form,a[href]').length,0);assert.notEqual(store.settings.get('home')['hero.lede'],'Private draft.');
await call('home','update',{'header.name':'Edited brand','header.link.2.label':'Expertise'});b=load((await render('services',Object.fromEntries(store.settings))).html);assert.ok(b('#nav .brand').text().includes('Edited brand'));assert.equal(b('#nav .nav__links li:nth-child(2) a > span:first-of-type').text(),'Expertise');
assert.throws(()=>validateServiceCatalog([...initial,{...added,url:'javascript:alert(1)'}]),/safe URL/);assert.throws(()=>validateServiceCatalog([added,added]),/unique/);assert.throws(()=>validateServiceCatalog([{...added,scope:'invalid'}]),/scope/);assert.throws(()=>validateSections('home',[...defaultSections('home'),{...block,image:'javascript:alert(1)'}]),/safe URL/);assert.throws(()=>validateSections('home',defaultSections('home').filter(s=>s.id!=='header')),/navigation/);assert.throws(()=>validateSections('home',[block,block]),/unique/);
assert.equal((await call('home','update',{'layout.sections':[{...block,body:7}]})).code,400);
const ids=[...store.categories.keys()].reverse(),orderResponse=res();await handleGallerySections(store.sql,'reorder',null,{ids},orderResponse);assert.equal(orderResponse.code,200);assert.deepEqual([...store.categories.values()].sort((a,b)=>a.position-b.position).map(c=>c.id),ids);
const invalidOrder=res(),galleryWrites=store.writes.length;await handleGallerySections(store.sql,'reorder',null,{ids:[999]},invalidOrder);assert.equal(invalidOrder.code,409);assert.equal(store.writes.length,galleryWrites);
console.log('PASS: complete page sections, existing layout preservation, section add/reorder/hide/remove, shared header, shared service add/edit/order/visibility, legacy content migration, atomic persistence, safe selected previews and validation. Isolated storage only.');
