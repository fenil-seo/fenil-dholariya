import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load } from 'cheerio';
import { esc } from './search.js';

const anchors={'d2c-revenue':'gallery-reports','lead-gen':'gallery-local','ai-search':'gallery-ai','search-console':'gallery-search'};
const filterLabels={'d2c-revenue':'D2C reports','lead-gen':'Lead generation','ai-search':'AI search','search-console':'Search & Analytics'};
const keys=Object.keys(anchors);
export function galleryUrl(value) {
  let url=String(value || '').trim().replace(/^(?:\.\/)?assets\//,'/assets/');
  if(!/^(?:\/(?!\/)|https:\/\/)/i.test(url))return '';
  url=url.replace(/AI(?:%20| )Searches(\d*)\.webp/gi,(_,n)=>`ai-searches-${n || '1'}.webp`)
    .replace(/Lead(?:%20| )generation(?:%20| )bsuiness(?:(?:%20| )(\d+))?\.webp/gi,(_,n)=>`lead-generation-business-${n || '1'}.webp`);
  if(url.startsWith('/assets/gallery/'))url=url.replace(/\.(?:png|jpe?g)$/i,'.webp');
  return url;
}
export async function galleryDefaults() {
  const $=load(await readFile(join(process.cwd(),'gallery.html'),'utf8'));
  return $('#galleryRoot > section').toArray().map((section,i)=>({key:keys[i],anchor:section.attribs.id,filter_label:filterLabels[keys[i]],label:$(section).find('h2').text().trim(),eyebrow:$(section).find('.eyebrow').text().trim(),description:$(section).find('.lead').text().trim(),position:i,
    items:$(section).find('.gallery-item').toArray().map((figure,j)=>({section:keys[i],image_url:galleryUrl($(figure).find('img').attr('src')),alt:$(figure).find('img').attr('alt') || '',badge:'',caption:$(figure).find('figcaption').text().trim(),highlight:$(figure).hasClass('gallery-item--highlight'),pinned:false,sort_order:j}))}));
}
const initialized=new WeakMap();
export function ensureGalleryCollection(sql) {
  if(!initialized.has(sql))initialized.set(sql,(async()=>{
    await sql(`CREATE TABLE IF NOT EXISTS gallery_sections (id SERIAL PRIMARY KEY, key TEXT UNIQUE NOT NULL, label TEXT NOT NULL DEFAULT '', eyebrow TEXT DEFAULT '', description TEXT DEFAULT '', position INTEGER DEFAULT 99)`);
    await sql(`CREATE TABLE IF NOT EXISTS gallery (id SERIAL PRIMARY KEY, section TEXT NOT NULL, section_label TEXT DEFAULT '', section_eyebrow TEXT DEFAULT '', section_desc TEXT DEFAULT '', section_order INTEGER DEFAULT 99, image_url TEXT NOT NULL, alt TEXT DEFAULT '', badge TEXT DEFAULT '', caption TEXT DEFAULT '', highlight BOOLEAN DEFAULT false, pinned BOOLEAN DEFAULT false, sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`);
    await sql(`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
    await sql(`ALTER TABLE gallery_sections ADD COLUMN IF NOT EXISTS filter_label TEXT DEFAULT ''`);
    await sql(`CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await sql(`CREATE TABLE IF NOT EXISTS cms_migration_backups (migration_key TEXT PRIMARY KEY, content JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    if((await sql(`SELECT key FROM app_migrations WHERE key='2026-10-editable-gallery'`)).length)return;
    const [defaults,existingSections,existingItems]=await Promise.all([galleryDefaults(),sql('SELECT * FROM gallery_sections ORDER BY position, id'),sql('SELECT * FROM gallery ORDER BY pinned DESC, sort_order, id DESC')]);
    // The previous browser renderer always showed these bundled captures,
    // even after deletion. Persist that currently visible collection once.
    // The migration marker makes later edits and deletions authoritative.
    const consumed=new Set(),sections=defaults.map(section=>({...section,items:section.items.map(item=>{
      const current=existingItems.find(row=>galleryUrl(row.image_url)===item.image_url && row.section===item.section && !consumed.has(row.id));
      if(current)consumed.add(current.id);return {...item,id:current?.id ?? null,pinned:current?.pinned ?? false};
    })}));
    for(const item of existingItems)if(!consumed.has(item.id)) {
      let section=sections.find(s=>s.key===item.section);
      if(!section){const metadata=existingSections.find(s=>s.key===item.section) || {};section={key:item.section,label:metadata.label || item.section_label || item.section,eyebrow:metadata.eyebrow || '',description:metadata.description || '',position:metadata.position ?? 99,filter_label:metadata.filter_label || '',items:[]};sections.push(section);}
      // Duplicate legacy file aliases were not visible in the old gallery.
      if(sections.some(s=>s.items.some(row=>row.image_url===galleryUrl(item.image_url))))continue;
      section.items.push({...item,image_url:galleryUrl(item.image_url),sort_order:section.items.length});
    }
    const items=sections.flatMap(s=>s.items);
    await sql(`WITH claimed AS (
      INSERT INTO app_migrations (key) VALUES ('2026-10-editable-gallery') ON CONFLICT DO NOTHING RETURNING key
    ), backed_up AS (
      INSERT INTO cms_migration_backups (migration_key,content)
      SELECT '2026-10-editable-gallery',jsonb_build_object('captures',(SELECT COALESCE(jsonb_agg(to_jsonb(g)),'[]'::jsonb) FROM gallery g),'categories',(SELECT COALESCE(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM gallery_sections s))
      WHERE EXISTS(SELECT 1 FROM claimed) ON CONFLICT DO NOTHING RETURNING migration_key
    ), section_seed AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS s(key text,label text,eyebrow text,description text,position integer,filter_label text)
    ), item_seed AS (
      SELECT * FROM jsonb_to_recordset($2::jsonb) AS i(id integer,section text,image_url text,alt text,badge text,caption text,highlight boolean,pinned boolean,sort_order integer)
    ), categories AS (
      INSERT INTO gallery_sections (key,label,eyebrow,description,position,filter_label)
      SELECT key,label,eyebrow,description,position,filter_label FROM section_seed WHERE EXISTS(SELECT 1 FROM claimed)
      ON CONFLICT(key) DO UPDATE SET label=EXCLUDED.label,eyebrow=EXCLUDED.eyebrow,description=EXCLUDED.description,position=EXCLUDED.position,filter_label=EXCLUDED.filter_label RETURNING id
    ), updated AS (
      UPDATE gallery g SET image_url=s.image_url,alt=s.alt,badge=s.badge,caption=s.caption,highlight=s.highlight,pinned=s.pinned,sort_order=s.sort_order
      FROM item_seed s WHERE g.id=s.id AND EXISTS(SELECT 1 FROM claimed) RETURNING g.id
    ), inserted AS (
      INSERT INTO gallery (section,image_url,alt,badge,caption,highlight,pinned,sort_order)
      SELECT section,image_url,alt,badge,caption,highlight,pinned,sort_order FROM item_seed WHERE id IS NULL AND EXISTS(SELECT 1 FROM claimed) RETURNING id
    ) SELECT (SELECT COUNT(*) FROM updated)+(SELECT COUNT(*) FROM inserted) AS count`,[JSON.stringify(sections),JSON.stringify(items)]);
  })().catch(error=>{initialized.delete(sql);throw error;}));
  return initialized.get(sql);
}
export async function loadGalleryContent(sql=null) {
  if(!sql)return galleryDefaults();
  await ensureGalleryCollection(sql);
  const [sections,items]=await Promise.all([sql('SELECT * FROM gallery_sections ORDER BY position, id'),sql('SELECT * FROM gallery ORDER BY pinned DESC, sort_order, id DESC')]);
  return sections.map(s=>({...s,anchor:anchors[s.key] || `gallery-${s.key}`,filter_label:s.filter_label || filterLabels[s.key] || s.label,items:items.filter(i=>i.section===s.key).map(i=>({...i,image_url:galleryUrl(i.image_url)}))}));
}
export function renderGallery($,sections,settings={}) {
  $('#galleryRoot').html(sections.map(section=>`<section class="container" id="${esc(section.anchor || anchors[section.key] || `gallery-${section.key}`)}" data-gallery-label="${esc(section.filter_label || section.label)}" style="padding-bottom:clamp(4rem,8vw,7rem)"><div class="section-head">${section.eyebrow?`<span class="eyebrow reveal">${esc(section.eyebrow)}</span>`:''}<h2 class="reveal" data-delay="1">${esc(section.label)}</h2>${section.description?`<p class="lead reveal" data-delay="2" style="margin-top:0.8rem">${esc(section.description)}</p>`:''}</div><div class="gallery-grid${section.items.length>4?' gallery-grid--collapsible':''}">${section.items.map((item,i)=>`<figure class="gallery-item${item.highlight?' gallery-item--highlight':''} reveal" data-cursor${i>0&&i<3?` data-delay="${i}"`:''}><img src="${esc(galleryUrl(item.image_url))}" alt="${esc(item.alt)}" loading="lazy"><figcaption>${item.badge?`<span class="gallery-badge">${esc(item.badge)}</span> `:''}${esc(item.caption)}</figcaption></figure>`).join('')}</div></section>`).join(''));
  $('body').attr('data-gallery-rendered','true');
  if(!sections.some(s=>s.items.length))$('#galleryRoot').prepend(`<p class="container" data-gallery-empty>${esc(settings['collection.empty'] ?? 'No captures to show yet.')}</p>`);
}
