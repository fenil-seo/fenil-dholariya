import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { load } from 'cheerio';
import { handleProjects } from '../api/admin.js';
import { PROJECT_LISTING_FIELDS, projectListing, validateProjectListing } from '../lib/project-listing.js';
import { renderPublicPage, mediaUrl } from '../lib/public-page.js';
import { SEED } from '../lib/seed-data.js';

// Exercise real CMS SQL generation against isolated rows, without DB access.
const rows = new Map();
let nextId = 1;
const alias = key => key === 'description' ? 'desc' : key;
const assign = (row,key,value) => { row[alias(key)] = ['metrics','schema_markup','page_settings'].includes(key) ? JSON.parse(value) : value; };
const sql = async (query,params=[]) => {
  if (query.startsWith('SELECT')) return [...rows.values()].sort((a,b)=>a.sort_order-b.sort_order);
  if (query.startsWith('INSERT')) {
    const columns = query.match(/INSERT INTO projects \(([^)]+)\)/)[1].split(',').map(key=>key.trim());
    assert.equal(columns.length,params.length,'Every project column must have one bound value');
    const row = {id:nextId++};
    columns.forEach((key,i)=>assign(row,key,params[i]));
    rows.set(row.id,row);
    return [{...row}];
  }
  if (query.startsWith('UPDATE')) {
    const idPosition = Number(query.match(/WHERE id = \$(\d+)/)[1]);
    assert.equal(idPosition,params.length,'Project id must follow all content values');
    const row = rows.get(params[idPosition-1]);
    assert.ok(row);
    const sets=query.split(' SET ')[1].split(' WHERE ')[0];
    for(const match of sets.matchAll(/(\w+)=(COALESCE\()?\$(\d+)/g)) {
      const value=params[Number(match[3])-1];
      if(match[2] && value === null) continue;
      assign(row,match[1],value);
    }
    return [{...row}];
  }
  if(query.startsWith('DELETE')) { rows.delete(params[0]);return []; }
  throw new Error('Unexpected project query');
};
const response=()=>({status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const call=async(action,id,data)=>{const res=response();await handleProjects(sql,action,id,data,res,async()=>{});return res;};
const created=await call('create',null,{
  ...SEED.projects[0], image_url:'/assets/fenil.jpg',image_alt:'A custom project cover',
  listing_title:'A tailored card title',listing_description:'A tailored card description',work_category:'local',sort_order:2,
});
assert.equal(created.code,200);
const project=created.body.item;
assert.equal(projectListing(project).title,'A tailored card title');
assert.equal(projectListing(project).category,'local');
const listed=await call('list');
assert.equal(listed.body.items[0].listing_description,'A tailored card description');
const rendered=load((await renderPublicPage('work','',{posts:[],projects:[project]})).html);
assert.equal(rendered('#caseList h2').text(),project.listing_title);
assert.equal(rendered('#caseList .work-project > p').text(),project.listing_description);
assert.equal(rendered('#caseList .work-project').attr('data-work-category'),'local');
assert.equal(rendered('#caseList img').attr('src'),'/assets/fenil.jpg');
assert.equal(rendered('#caseList img').attr('alt'),project.image_alt);
assert.equal(JSON.parse(rendered('#publicContent').text()).projects[0].listing_title,project.listing_title);
const detail=load((await renderPublicPage('project',project.slug,{posts:[],projects:[project]})).html);
assert.equal(detail('#projectTitle').text(),project.title,'Work card title must not replace the case study title');
assert.equal(detail('#projectHeroWrap img').attr('src'),project.image_url);
assert.equal(detail('#projectHeroWrap img').attr('alt'),project.image_alt);
const legacy={...project};PROJECT_LISTING_FIELDS.forEach(key=>delete legacy[key]);
const legacySaved=await call('update',project.id,legacy);
assert.equal(legacySaved.code,200);
assert.equal(legacySaved.body.item.listing_title,project.listing_title,'Old clients must preserve Work fields');
const cleared=await call('update',project.id,{...legacy,...Object.fromEntries(PROJECT_LISTING_FIELDS.map(key=>[key,'']))});
assert.equal(cleared.code,200);
assert.equal(projectListing(cleared.body.item).title,projectListing(SEED.projects[0]).title);
assert.equal(projectListing(cleared.body.item).category,'commerce');
assert.equal((await call('update',project.id,{...project,work_category:'invalid'})).code,400);
assert.throws(()=>validateProjectListing({listing_title:300}),/must be text/);
assert.equal(projectListing({slug:'new-case',title:'New case',category:'Local SEO'}).category,'local');
assert.equal(projectListing({slug:'new-case',title:'New case',category:'B2B SaaS'}).category,'b2b');

const sandbox={window:{},URL};
vm.runInNewContext(await readFile('js/render.js','utf8'),sandbox);
for(const item of [...SEED.projects,project,{...project,image_url:'javascript:alert(1)'},{...project,image_url:'/assets/gallery/overview-1.webp'}]) {
  assert.equal(mediaUrl(item,'work'),sandbox.window.Render.projectMediaUrl(item),'Server and browser must agree on project cover precedence');
}
assert.equal(mediaUrl(project,'work'),'/assets/fenil.jpg','CMS cover must override the built-in image');
const target={innerHTML:'',getAttribute:()=>null};
sandbox.window.Render.renderProjects([project],target,{full:true});
const client=load(target.innerHTML);
assert.equal(client('h2').text(),rendered('#caseList h2').text());
assert.equal(client('.work-project').attr('data-work-category'),'local');
assert.equal(client('.work-project > p').text(),rendered('#caseList .work-project > p').text());
assert.equal(client('img').attr('src'),rendered('#caseList img').attr('src'));
const deleted=await call('delete',project.id);
assert.equal(deleted.code,200);
const empty=await call('list');
assert.equal(empty.body.items.length,0);
assert.equal((await renderPublicPage('project',project.slug,{posts:[],projects:[]})).status,404);
console.log('PASS: Work card editing, project create/update/clear/delete, legacy-client preservation, cover overrides, filter categories, server/browser parity and case study content independence. No live content writes.');
