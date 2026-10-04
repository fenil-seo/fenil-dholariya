import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {SEED} from '../lib/seed-data.js';
const pages=['index','services','work','about','blog','gallery','contact','project','post','404'];
const experiencePages=new Set(['services','work','about','blog','gallery','contact','project','post']);
let scripts=0,assets=0;
for(const page of pages){
 const source=await readFile(`${page}.html`,'utf8');
 const noScripts=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const ids=[...noScripts.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,`Duplicate IDs in ${page}`);
 assert.ok(!source.includes('\u2014'),`Em dash in ${page}`);
 const $=load(noScripts);
 for(const [path,label] of [['/services','Services'],['/gallery','Gallery']]) {
  const link=$(`.nav .nav__link[href="${path}"]`);
  assert.equal(link.length,1,`${label} nav missing in ${page}`);
  assert.ok(link.text().includes(label),`${label} nav label missing in ${page}`);
 }
 assert.match($('link[rel="stylesheet"]').last().attr('href'),/^\/css\/liquid\.css\?/,`Shared theme must load after page styles in ${page}`);
 const hasExperience=experiencePages.has(page);
 assert.equal(source.includes('/css/engagement.css?'),hasExperience,`Inner-page stylesheet scope in ${page}`);
 assert.equal(source.includes('/js/engagement.js?'),hasExperience,`Inner-page interaction scope in ${page}`);
 if(hasExperience){
  assert.ok(source.includes('class="depth-section '),`Missing depth section in ${page}`);
  assert.ok(source.includes('data-motion-toggle'),`Missing motion control in ${page}`);
  for(const match of noScripts.matchAll(/data-panel="([^"]+)" aria-controls="([^"]+)"/g)){
   assert.equal(match[1],match[2],`Panel control mismatch in ${page}`);
   assert.ok(ids.includes(match[1]),`Panel target ${match[1]} missing in ${page}`);
   assert.ok(ids.includes(match[1]+'-title'),`Panel heading ${match[1]} missing in ${page}`);
  }
 }
 for(const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
  if(!match[2].trim())continue;
  if(match[1].includes('application/ld+json'))JSON.parse(match[2]);else new vm.Script(match[2],{filename:`${page}:inline`});
  scripts++;
 }
 for(const match of source.matchAll(/(?:src|href)="(\/(?:assets|css|js)\/[^"?]+)[^"]*"/g)){
  assert.ok(existsSync('.'+decodeURIComponent(match[1])),`Missing ${match[1]}`);assets++;
 }
 if(page!=='gallery')assert.ok(!/src="\/assets\/(?:gallery|screenshots|AI Search|Looker|lead-gen)/i.test(source),`Gallery evidence leaked into ${page}`);
}
const dataContext={window:{}};vm.runInNewContext(await readFile('js/data.js','utf8'),dataContext);
const experienceScript=await readFile('js/engagement.js','utf8');
new vm.Script(experienceScript,{filename:'js/engagement.js'});
assert.ok(!experienceScript.includes('\u2014'),'Em dash in inner-page interactions');
// The module must exit on Home even if it is accidentally included later.
vm.runInNewContext(experienceScript,{document:{body:{dataset:{page:'home'}}}});
const clientServices=Object.values(dataContext.window).find(v=>v?.services)?.services;
assert.equal(clientServices.length,8);assert.equal(SEED.services.length,8);
assert.equal(JSON.stringify(clientServices),JSON.stringify(SEED.services),'Client and server service fallback mismatch');
const catalogue=await readFile('services.html','utf8');
assert.equal((catalogue.match(/class="capability"/g)||[]).length,8);
assert.equal((await readFile('contact.html','utf8')).match(/name="services"/g).length,8);

// Run the content API against an in-memory SQL fixture. No database calls.
const queries=[];
const oldNames=['SEO & Technical Audits','Content That Converts','Local SEO & Google Business','Lead Gen & Funnel Optimization','AI & Prompt Engineering','Market & Competitive Intel','Search Engine Marketing (SEM)','Performance Web Development'];
const oldServices=SEED.services.map((s,i)=>({...s,title:oldNames[i]}));
const sql=async(query)=>{queries.push(query);if(query.includes('FROM services'))return oldServices;if(query.includes('FROM skills'))return SEED.skills.map(name=>({name}));if(query.includes('FROM timeline'))return SEED.timeline;if(query.includes('FROM projects'))return SEED.projects;return [];};
const apiSource=(await readFile('api/content.js','utf8')).replace(/^import .*;\r?\n/gm,'').replace('export default async function handler','async function handler');
const context={getSql:()=>sql,isDbConfigured:()=>true,ensureNewColumns:async()=>{},SEED,console};
vm.createContext(context);vm.runInContext(apiSource,context);
let output;
const res={status(){return this},setHeader(){},json(value){output=value;return this}};
await context.handler({method:'GET',query:{}},res);
assert.equal(output.services.length,8,'Renamed services must not duplicate');
assert.ok(!queries.some(q=>q.startsWith('INSERT INTO services')),'Service renames caused inserts');
console.log(`PASS: ${pages.length} HTML pages, ${scripts} inline scripts/JSON blocks, ${assets} asset references, inner-page interaction scope and syntax, eight-service contract, legacy database identity. No real database writes.`);
