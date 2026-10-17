import { SEED } from '../../lib/seed-data.js';
import { galleryDefaults } from '../../lib/gallery-content.js';
import {isDeepStrictEqual} from 'node:util';

// Isolated storage adapter for exercising the actual CMS handlers and renderers.
// It never connects to Neon, sends email, or modifies production content.
export async function createCmsStore({migrated=true}={}) {
  const settings=new Map(),posts=new Map(),projects=new Map(),gallery=new Map(),categories=new Map(),markers=new Set(),writes=[];
  let nextPost=1,nextCapture=1,nextCategory=1,nextProject=1;
  for(const p of SEED.posts)posts.set(nextPost,{...structuredClone(p),id:nextPost++});
  for(const p of SEED.projects)projects.set(nextProject,{...structuredClone(p),id:nextProject++});
  const defaults=await galleryDefaults();
  for(const section of defaults){categories.set(nextCategory,{...section,items:undefined,id:nextCategory++});for(const item of section.items)gallery.set(nextCapture,{...item,id:nextCapture++});}
  if(migrated)markers.add('2026-10-editable-gallery');
  const clone=value=>structuredClone(value),sortCategories=()=>[...categories.values()].sort((a,b)=>a.position-b.position||a.id-b.id),sortGallery=()=>[...gallery.values()].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.sort_order-b.sort_order||b.id-a.id);
  const assign=(row,key,value)=>row[key==='description'?'desc':key]=['schema_markup','metrics','page_settings'].includes(key)?typeof value==='string'?JSON.parse(value):value:value;
  const sql=async(query,params=[])=>{
    if(query.startsWith('CREATE TABLE') || query.startsWith('ALTER TABLE'))return [];
    if(query.startsWith('SELECT key FROM app_migrations'))return markers.has('2026-10-editable-gallery')?[{key:'2026-10-editable-gallery'}]:[];
    if(query.startsWith('WITH claimed')){
      if(markers.has('2026-10-editable-gallery'))return [];
      markers.add('2026-10-editable-gallery');writes.push('gallery-migration');
      for(const section of JSON.parse(params[0])){const existing=[...categories.values()].find(c=>c.key===section.key);const row={...section,items:undefined,id:existing?.id || nextCategory++};categories.set(row.id,row);}
      for(const seed of JSON.parse(params[1])){const row={...seed,id:seed.id || nextCapture++};gallery.set(row.id,row);}
      return [{count:gallery.size}];
    }
    if(query.startsWith('SELECT key, content'))return [...settings].map(([key,content])=>({key,content:clone(content)}));
    if(query.startsWith('WITH catalog AS')){const previous=settings.get('service-catalog');if(previous&&!isDeepStrictEqual(previous.items,JSON.parse(params[4])))return [];const content={...(settings.get(params[0])||{}),...JSON.parse(params[1])};settings.set(params[2],JSON.parse(params[3]));settings.set(params[0],content);writes.push('site:service-catalog','site:'+params[0]);return [{key:params[0],content:clone(content)}];}
    if(query.startsWith('INSERT INTO site_settings')){const rows=[];for(let i=0;i<params.length;i+=2){const key=params[i],content={...(settings.get(key)||{}),...JSON.parse(params[i+1])};settings.set(key,content);writes.push('site:'+key);rows.push({key,content:clone(content)});}return rows;}
    if(query.startsWith('SELECT g.id FROM gallery g JOIN')){const category=categories.get(Number(params[0]));const capture=[...gallery.values()].find(g=>g.section===category?.key);return capture?[{id:capture.id}]:[];}
    if(query.startsWith('UPDATE gallery_sections g SET')){for(const item of JSON.parse(params[0]))categories.get(item.id).position=item.position;writes.push('gallery-sections:reorder');return clone(sortCategories());}
    if(query.startsWith('SELECT key FROM gallery_sections WHERE'))return sortCategories().filter(s=>s.key===params[0]).map(s=>({key:s.key}));
    const table=query.match(/(?:FROM|INTO|UPDATE) (gallery_sections|gallery|posts|projects)\b/)?.[1];
    const map={gallery_sections:categories,gallery,posts,projects}[table];
    if(query.startsWith('SELECT') && map){
      let rows=table==='gallery'?sortGallery():table==='gallery_sections'?sortCategories():[...map.values()];
      if(/WHERE id\s*=/.test(query))rows=rows.filter(r=>r.id===Number(params[0]));
      if(/WHERE published\s*=\s*true/.test(query))rows=rows.filter(r=>r.published!==false);
      return clone(rows);
    }
    if(query.startsWith('INSERT') && map){
      const id=table==='gallery'?nextCapture++:table==='gallery_sections'?nextCategory++:table==='posts'?nextPost++:nextProject++;
      const columns=query.match(/INSERT INTO \w+ \(([^)]+)\)/)[1].split(',').map(k=>k.trim().replaceAll('"',''));
      if(columns.length!==params.length)throw new Error('Unbound CMS insert value');
      const row={id};columns.forEach((key,i)=>assign(row,key,params[i]));
      if(table==='posts'&&[...map.values()].some(r=>r.slug===row.slug)){const error=new Error('Duplicate slug');error.code='23505';throw error;}
      map.set(id,row);writes.push(`${table}:create`);return [clone(row)];
    }
    if(query.startsWith('UPDATE') && map){
      const row=map.get(Number(params.at(-1)));if(!row)return [];
      for(const match of query.split(' SET ')[1].split(' WHERE ')[0].matchAll(/"?(\w+)"?\s*=\s*(COALESCE\()?\$(\d+)/g)){const value=params[Number(match[3])-1];if(match[2]&&value===null)continue;assign(row,match[1],value);}
      writes.push(`${table}:update`);return [clone(row)];
    }
    if(query.startsWith('DELETE') && map){map.delete(Number(params[0]));writes.push(`${table}:delete`);return [];}
    throw new Error('Unexpected fixture query: '+query.slice(0,100));
  };
  const data=()=>({posts:clone([...posts.values()].filter(p=>p.published!==false)),projects:clone([...projects.values()])});
  return {sql,settings,posts,projects,gallery,categories,markers,writes,data};
}
