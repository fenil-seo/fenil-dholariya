import { getSql, isDbConfigured } from "../lib/db.js";
import { isAuthenticated } from "../lib/auth.js";
import { ensureNewColumns } from "../lib/migrate.js";
import { notifyPublication } from "../lib/indexnow.js";
import { POST_METADATA_FIELDS, validatePostContent } from '../lib/post-metadata.js';
import { PROJECT_LISTING_FIELDS } from '../lib/project-listing.js';
import { projectSettingsFields, validateProjectContent } from '../lib/project-settings.js';
import { loadPublicContent } from '../lib/public-content.js';
import { renderPublicPage } from '../lib/public-page.js';
import { load } from 'cheerio';
import { renderSitePage } from './site.js';
import { loadGalleryContent, ensureGalleryCollection } from '../lib/gallery-content.js';
import { previewHtml } from '../lib/admin-preview.js';
import { getEditorFields, editorDefaults, loadSiteSettings, validateSiteSettings } from '../lib/site-settings.js';
import { PAGE_SECTIONS, defaultSections } from '../lib/page-sections.js';
import { serviceCatalog, validateServiceCatalog } from '../lib/service-catalog.js';
import { ensureLeadsSchema } from '../lib/lead-migration.js';
import { LeadError, listLeads, updateLead, deleteLead, validateLeadList, validateLeadId, validateLeadUpdate } from '../lib/leads.js';
import { notificationSettings, sendLeadNotification } from '../lib/lead-notifications.js';
import { attemptLeadNotification, deliverLeadNotification } from '../lib/lead-notification-state.js';

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let authorized = false;
  try { authorized = isAuthenticated(req); } catch { /* Malformed cookies do not grant access. */ }
  if (!authorized) return res.status(401).json({ error: "Unauthorized" });
  const { resource, action, id, data } = req.body || {};

  try {
    // Configuration checks and explicit owner tests need authentication, but
    // do not require a database connection or create a contact enquiry.
    if (resource === 'leads' && ['notification-settings', 'test-notification'].includes(action)) {
      return await handleLeads(null, action, id, data, res);
    }
    if (!isDbConfigured()) {
      return res.status(503).json({ error: "Database not connected. Add DATABASE_URL in your environment variables, redeploy, then run setup from the dashboard." });
    }
    const sql = getSql();
    // Notify only public content changes, including the old URL after a rename
    // or unpublish. Never submit drafts, admin URLs or preview deployments.
    if (['posts', 'projects'].includes(resource) && ['create', 'update', 'delete'].includes(action)) {
      const previous = id && action !== 'create'
        ? (await sql(`SELECT slug${resource === 'posts' ? ', published' : ''} FROM ${resource} WHERE id=$1`, [id]))[0]
        : null;
      const sendJson = res.json.bind(res);
      res.json = async payload => {
        if (res.statusCode === 200 && (payload.item || payload.ok)) {
          await notifyPublication(resource, previous, payload.item || null);
        }
        return sendJson(payload);
      };
    }
    switch (resource) {
      case "home":
      case "work":
      case "footer":
      case "about":
      case "insights":
        return await handleSiteEditor(sql, resource, action, data, res);
      case "services-page":
        return await handleSiteEditor(sql, 'services', action, data, res);
      case 'gallery-page':
        return await handleSiteEditor(sql,'gallery',action,data,res);
      case "profile":
        return await handleProfile(sql, action, data, res);
      case "stats":
        return await handleSimpleList(sql, "stats", ["value", "suffix", "label", "trend", "sort_order"], action, id, data, res);
      case "services":
        return await handleSimpleList(sql, "services", ["icon", "title", "description", "sort_order"], action, id, data, res);
      case "process":
        return await handleSimpleList(sql, "process_steps", ["title", "description", "sort_order"], action, id, data, res);
      case "testimonials":
        return await handleSimpleList(sql, "testimonials", ["quote", "name", "role", "initials", "sort_order"], action, id, data, res);
      case "skills":
        return await handleSimpleList(sql, "skills", ["name", "sort_order"], action, id, data, res);
      case "timeline":
        return await handleSimpleList(sql, "timeline", ["role", "org", "period", "sort_order"], action, id, data, res);
      case "projects":
        return await handleProjects(sql, action, id, data, res);
      case "posts":
        return await handlePosts(sql, action, id, data, res);
      case "leads":
        return await handleLeads(sql, action, id, data, res);
      case "gallery-sections":
        return await handleGallerySections(sql, action, id, data, res);
      case "gallery":
        return await handleGallery(sql, action, id, data, res);
      default:
        return res.status(400).json({ error: "Unknown resource" });
    }
  } catch (err) {
    if (resource === 'leads') {
      console.error('Admin lead storage failed', {
        code: typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code) ? err.code : 'storage_error',
      });
      return res.status(500).json({ error: 'Could not complete this lead action. Please try again.' });
    }
    console.error("admin api error", resource, action, err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "That slug is already in use - choose a different one." });
    }
    return res.status(500).json({ error: "Something went wrong. " + (err.message || "") });
  }
}

export async function handleSiteEditor(sql, page, action, data, res, dependencies = {}) {
  const fields = getEditorFields(page);
  if (action === 'get') {
    const settings = await loadSiteSettings(sql);
    const item={...await editorDefaults(page),...(settings[page]||{})};
    if(PAGE_SECTIONS[page])item['layout.sections']??=defaultSections(page);
    if(['home','services'].includes(page))item['shared.services']=await serviceCatalog(settings);
    return res.status(200).json({ fields, sections:PAGE_SECTIONS[page]||[], item });
  }
  if (!['update','preview'].includes(action)) return res.status(400).json({ error: 'Unknown action' });
  let content;
  try { content = validateSiteSettings(page, action==='preview' && data?.content ? data.content : data); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  const existing=await loadSiteSettings(sql);
  const shared=content['shared.services'],base=content['shared.servicesBase'];delete content['shared.services'];delete content['shared.servicesBase'];
  if(action==='preview') {
    const settings={...existing,[page]:{...existing[page],...content},...(shared?{'service-catalog':{items:shared}}:{})};
    const result=['insights','work'].includes(page) ? await renderPublicPage(page==='insights'?'blog':'work','',await loadPublicContent({configured:true,sql,migrate:dependencies.migrate}),settings)
      : await renderSitePage(page,settings,page==='gallery'?{gallery:await loadGalleryContent(sql)}:{});
    const selected=PAGE_SECTIONS[page]?.find(s=>s.id===data?.group);
    const custom=content['layout.sections']?.find(s=>s.id===data?.group&&s.type);
    return res.status(200).json({html:previewHtml(result.html,selected?.selector||(custom?`#${custom.id}`:fields.find(field=>field.group===data?.group)?.selector),{focus:Boolean(selected||custom)})});
  }
  // A shared catalog and page copy save in one atomic statement. Patch only
  // submitted keys so another page editor cannot overwrite unrelated content.
  const conflict=()=>res.status(409).json({error:'Services changed in another editor. Load the latest services before saving this list.',conflict:'services'});
  if(shared&&base&&JSON.stringify(base)!==JSON.stringify(validateServiceCatalog(await serviceCatalog(existing))))return conflict();
  const catalogStatement=`WITH catalog AS (
    INSERT INTO site_settings (key, content, updated_at) VALUES ($3, $4::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET content=site_settings.content || EXCLUDED.content, updated_at=now()
      WHERE site_settings.content->'items'=$5::jsonb RETURNING key
  ) `;
  const rows = await sql(`${shared?catalogStatement:''}INSERT INTO site_settings (key, content, updated_at) ${shared?'SELECT $1, $2::jsonb, now() WHERE EXISTS (SELECT 1 FROM catalog)':'VALUES ($1, $2::jsonb, now())'}
    ON CONFLICT (key) DO UPDATE SET content=site_settings.content || EXCLUDED.content, updated_at=now() RETURNING key, content`,
    [page, JSON.stringify(content),...(shared?['service-catalog',JSON.stringify({items:shared}),JSON.stringify(base||await serviceCatalog(existing))]:[])]);
  if(!rows.length&&shared)return conflict();
  return res.status(200).json({ item: rows.find(r=>r.key===page)?.content||rows[0].content });
}

/* ---------- Generic CRUD for flat list tables (whitelisted columns only) ---------- */
async function handleSimpleList(sql, table, fields, action, id, data, res) {
  const cols = (subset) => subset.map((f) => `"${f}"`).join(", ");

  if (action === "list") {
    const rows = await sql(`SELECT id, ${cols(fields)} FROM ${table} ORDER BY sort_order, id`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create") {
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const placeholders = usable.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await sql(
      `INSERT INTO ${table} (${cols(usable)}) VALUES (${placeholders}) RETURNING id, ${cols(fields)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = usable.map((f) => data[f]);
    values.push(id);
    const rows = await sql(
      `UPDATE ${table} SET ${sets} WHERE id = $${values.length} RETURNING id, ${cols(fields)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Profile (singleton row) ---------- */
async function handleProfile(sql, action, data, res) {
  if (action === "get") {
    const rows = await sql(`SELECT * FROM profile WHERE id = 1`);
    return res.status(200).json({ item: rows[0] || null });
  }

  if (action === "update") {
    const fields = ["name", "role", "tagline", "intro", "location", "email", "phone", "whatsapp", "available", "available_text", "instagram", "linkedin", "schema_markup"];
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const placeholder = (f, i) => (f === "schema_markup" ? `$${i + 1}::jsonb` : `$${i + 1}`);
    const values = usable.map((f) => (f === "schema_markup" ? JSON.stringify(data[f]) : data[f]));
    const insertCols = usable.map((f) => `"${f}"`).join(", ");
    const insertPlaceholders = usable.map((f, i) => placeholder(f, i)).join(", ");
    const sets = usable.map((f, i) => `"${f}" = ${placeholder(f, i)}`).join(", ");
    const rows = await sql(
      `INSERT INTO profile (id, ${insertCols}) VALUES (1, ${insertPlaceholders})
       ON CONFLICT (id) DO UPDATE SET ${sets}
       RETURNING *`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Projects (slug + JSONB metrics) ---------- */
export async function handleProjects(sql, action, id, data, res, migrate = ensureNewColumns) {
  await migrate(sql);
  const CS_COLS = ["period", "services", "challenge", "approach", "results_text", "takeaway", "testimonial", "testimonial_author"];
  const RETURNING = `id, slug, title, category, client, description AS "desc", viz, accent, metrics, featured, sort_order, schema_markup, COALESCE(page_settings,'{}'::jsonb) AS page_settings, COALESCE(image_url,'') AS image_url, COALESCE(body,'') AS body, ${[...CS_COLS,...PROJECT_LISTING_FIELDS].map((c) => `COALESCE(${c},'') AS ${c}`).join(", ")}`;

  if (action === "list") {
    const rows = await sql(`SELECT ${RETURNING} FROM projects ORDER BY sort_order, id`);
    return res.status(200).json({ items: rows, settings_fields:await projectSettingsFields() });
  }

  if (action === 'preview') {
    let validated;
    try { validated = validateProjectContent(data); }
    catch (error) { return res.status(400).json({error:error.message}); }
    const content = await loadPublicContent({configured:true,sql,migrate});
    const draft = {...data,...validated.listing,page_settings:validated.settings || {},slug:slugify(data.slug) || slugify(data.title)};
    if (!draft.slug) return res.status(400).json({error:'Title or slug is required.'});
    const previous = id ? (await sql('SELECT slug FROM projects WHERE id=$1',[id]))[0] : null;
    content.projects = [draft,...content.projects.filter(p=>p.slug!==draft.slug && p.slug!==previous?.slug)];
    const settings = await loadSiteSettings(sql);
    const result = await renderPublicPage('project',draft.slug,content,settings);
    // Preview uses the production renderer, with navigation and executable
    // content removed. It never writes the case study or notifies crawlers.
    const $ = load(result.html);
    $('script,form,iframe,noscript').remove();$('a').removeAttr('href');
    $('.reveal,[data-enter]').addClass('is-in is-entered').css('opacity','1').css('transform','none');
    $('meta[name="robots"]').attr('content','noindex, nofollow');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({html:$.html()});
  }

  if (action === "create" || action === "update") {
    let listing, settings;
    try { ({listing,settings} = validateProjectContent(data)); }
    catch (error) { return res.status(400).json({ error:error.message }); }
    const slug = slugify(data?.slug) || slugify(data?.title);
    if (!slug) return res.status(400).json({ error: "Title or slug is required." });
    const metricsJson = JSON.stringify(data?.metrics || []);
    const schemaJson = JSON.stringify(data?.schema_markup ?? null);
    const params = [
      slug,
      data?.title || "",
      data?.category || "",
      data?.client || "",
      data?.desc || data?.description || "",
      data?.viz || "network",
      data?.accent || "violet",
      metricsJson,
      data?.featured !== false,
      Number(data?.sort_order) || 0,
      schemaJson,
      data?.image_url || "",
      data?.body || "",
      ...CS_COLS.map((c) => data?.[c] || ""),
      ...PROJECT_LISTING_FIELDS.map(key => listing[key] ?? (action === 'create' ? '' : null)),
      settings===undefined ? (action==='create' ? '{}' : null) : JSON.stringify(settings),
    ];

    if (action === "create") {
      const rows = await sql(
        `INSERT INTO projects (slug, title, category, client, description, viz, accent, metrics, featured, sort_order, schema_markup, image_url, body, ${[...CS_COLS,...PROJECT_LISTING_FIELDS].join(", ")}, page_settings)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13,${[...CS_COLS,...PROJECT_LISTING_FIELDS].map((_, i) => `$${14 + i}`).join(",")},$${14 + CS_COLS.length + PROJECT_LISTING_FIELDS.length}::jsonb)
         RETURNING ${RETURNING}`,
        params
      );
      return res.status(200).json({ item: rows[0] });
    }

    if (!id) return res.status(400).json({ error: "Missing id" });
    params.push(id);
    const rows = await sql(
      `UPDATE projects SET updated_at=NOW(), slug=$1, title=$2, category=$3, client=$4, description=$5, viz=$6, accent=$7, metrics=$8::jsonb, featured=$9, sort_order=$10, schema_markup=$11::jsonb, image_url=$12, body=$13, ${CS_COLS.map((c, i) => `${c}=$${14 + i}`).join(", ")},
       ${PROJECT_LISTING_FIELDS.map((key,i) => `${key}=COALESCE($${14 + CS_COLS.length + i},${key})`).join(', ')}, page_settings=COALESCE($${14 + CS_COLS.length + PROJECT_LISTING_FIELDS.length}::jsonb,page_settings)
       WHERE id = $${15 + CS_COLS.length + PROJECT_LISTING_FIELDS.length}
       RETURNING ${RETURNING}`,
      params
    );
    if (!rows[0]) return res.status(404).json({error:'This case study no longer exists. Reload the dashboard.'});
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM projects WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Posts (slug + body HTML) ---------- */
export async function handlePosts(sql, action, id, data, res, migrate = ensureNewColumns) {
  await migrate(sql);
  const RETURNING = `id, slug, title, category, excerpt, body, viz, accent, reading_time, date, published, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(blog_image_url,'') AS blog_image_url, ${POST_METADATA_FIELDS.map(key => `COALESCE(${key},'') AS ${key}`).join(', ')}`;

  if (action === "list") {
    const rows = await sql(`SELECT ${RETURNING} FROM posts ORDER BY date DESC, id DESC`);
    return res.status(200).json({ items: rows });
  }

  if(action==='preview') {
    let metadata;
    try{metadata=validatePostContent(data);}catch(error){return res.status(400).json({error:error.message});}
    const slug=slugify(data.slug) || slugify(data.title);if(!slug)return res.status(400).json({error:'Title or slug is required.'});
    const content=await loadPublicContent({configured:true,sql,migrate}),previous=id?(await sql('SELECT slug FROM posts WHERE id=$1',[id]))[0]:null;
    const draft={...data,...metadata,slug};content.posts=[draft,...content.posts.filter(p=>p.slug!==slug && p.slug!==previous?.slug)];
    const result=await renderPublicPage('post',slug,content,await loadSiteSettings(sql));
    return res.status(200).json({html:previewHtml(result.html)});
  }

  if (action === "create" || action === "update") {
    let metadata;
    try { metadata = validatePostContent(data); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const slug = slugify(data?.slug) || slugify(data?.title);
    if (!slug) return res.status(400).json({ error: "Title or slug is required." });
    const schemaJson = JSON.stringify(data?.schema_markup ?? null);
    const params = [
      slug,
      data?.title || "",
      data?.category || "",
      data?.excerpt || "",
      data?.body || "",
      data?.viz || "network",
      data?.accent || "violet",
      Number(data?.reading_time) || 5,
      data?.date || new Date().toISOString().slice(0, 10),
      action==='create' ? data?.published===true : data?.published ?? null,
      schemaJson,
      data?.image_url || "",
      data?.blog_image_url || "",
      ...POST_METADATA_FIELDS.map(key => metadata[key] ?? (action === 'create' ? '' : null)),
    ];

    if (action === "create") {
      const rows = await sql(
        `INSERT INTO posts (slug, title, category, excerpt, body, viz, accent, reading_time, date, published, schema_markup, image_url, blog_image_url, ${POST_METADATA_FIELDS.join(', ')})
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,${POST_METADATA_FIELDS.map((_, i) => `$${14 + i}`).join(',')})
         RETURNING ${RETURNING}`,
        params
      );
      return res.status(200).json({ item: rows[0] });
    }

    if (!id) return res.status(400).json({ error: "Missing id" });
    params.push(id);
    const rows = await sql(
      `UPDATE posts SET updated_at=NOW(), slug=$1, title=$2, category=$3, excerpt=$4, body=$5, viz=$6, accent=$7, reading_time=$8, date=$9, published=COALESCE($10,published), schema_markup=$11::jsonb, image_url=$12, blog_image_url=$13,
       ${POST_METADATA_FIELDS.map((key, i) => `${key}=COALESCE($${14 + i},${key})`).join(', ')}
       WHERE id = $${14 + POST_METADATA_FIELDS.length}
       RETURNING ${RETURNING}`,
      params
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM posts WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Gallery sections (CRUD for section metadata) ---------- */
export async function handleGallerySections(sql, action, id, data, res) {
  await ensureGalleryCollection(sql);
  if(action==='reorder'){
    const ids=data?.ids;
    if(!Array.isArray(ids)||ids.length>300||ids.some(v=>!Number.isSafeInteger(v)||v<1)||new Set(ids).size!==ids.length)return res.status(400).json({error:'Invalid gallery section order.'});
    const current=await sql('SELECT id FROM gallery_sections ORDER BY position, id');
    if(current.length!==ids.length||current.some(c=>!ids.includes(c.id)))return res.status(409).json({error:'Gallery sections changed. Reload and try again.'});
    const items=await sql('UPDATE gallery_sections g SET position=s.position FROM jsonb_to_recordset($1::jsonb) AS s(id integer, position integer) WHERE g.id=s.id RETURNING g.*',[JSON.stringify(ids.map((id,position)=>({id,position})))]);
    return res.status(200).json({items});
  }
  const COLS = ["key", "label", "eyebrow", "description", "position", "filter_label"];
  const c = (arr) => arr.map((f) => `"${f}"`).join(", ");
  if(['create','update','preview'].includes(action)){
    if(!data || typeof data!=='object' || typeof data.label!=='string' || !data.label.trim())return res.status(400).json({error:'Category heading is required.'});
    if(action==='create' && (typeof data.key!=='string' || data.key.length>80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.key)))return res.status(400).json({error:'Use a category key of up to 80 lowercase letters, numbers and hyphens.'});
    for(const key of ['label','eyebrow','description','filter_label'])if(data[key]!==undefined&&(typeof data[key]!=='string'||data[key].length>5000))return res.status(400).json({error:`${key} is too long or invalid.`});
    if(data.position!==undefined && (!Number.isInteger(Number(data.position)) || Math.abs(Number(data.position))>100000))return res.status(400).json({error:'Category order must be a whole number between -100000 and 100000.'});
  }
  if(action==='preview')return galleryPreview(sql,'category',id,data,res);

  if (action === "list") {
    const rows = await sql(`SELECT id, ${c(COLS)} FROM gallery_sections ORDER BY position ASC, id ASC`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create") {
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const rows = await sql(
      `INSERT INTO gallery_sections (${c(usable)}) VALUES (${usable.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id, ${c(COLS)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const editable = COLS.filter((f) => f !== "key");
    const usable = editable.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = [...usable.map((f) => data[f]), id];
    const rows = await sql(
      `UPDATE gallery_sections SET ${sets} WHERE id = $${values.length} RETURNING id, ${c(COLS)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const used=await sql('SELECT g.id FROM gallery g JOIN gallery_sections s ON g.section=s.key WHERE s.id=$1 LIMIT 1',[id]);
    if(used.length)return res.status(409).json({error:'Move or delete the captures in this category before deleting it.'});
    await sql(`DELETE FROM gallery_sections WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Gallery items (images shown on /gallery) ---------- */
export async function handleGallery(sql, action, id, data, res) {
  await ensureGalleryCollection(sql);
  const COLS = ["section", "image_url", "alt", "badge", "caption", "highlight", "pinned", "sort_order"];
  const cols = (arr) => arr.map((f) => `"${f}"`).join(", ");
  const normalizeLocalImage = (url) => {
    const value = String(url || "");
    return value.startsWith("/assets/gallery/") ? value.replace(/\.(?:png|jpe?g)$/i, ".webp") : value;
  };
  if(['create','update','preview'].includes(action)){
    if(!data || typeof data!=='object' || !/^(?:\/(?!\/)|https:\/\/)/i.test(data.image_url || ''))return res.status(400).json({error:'Choose a published image or HTTPS image URL.'});
    if(!data.alt || typeof data.alt!=='string')return res.status(400).json({error:'Image alt text is required.'});
    for(const key of ['image_url','alt','badge','caption','section'])if(data[key]!==undefined && (typeof data[key]!=='string'||data[key].length>5000))return res.status(400).json({error:`${key} is too long or invalid.`});
    if(data.sort_order!==undefined&&(!Number.isInteger(Number(data.sort_order)) || Math.abs(Number(data.sort_order))>100000))return res.status(400).json({error:'Capture order must be a whole number between -100000 and 100000.'});
    for(const key of ['pinned','highlight'])if(data[key]!==undefined && typeof data[key]!=='boolean')return res.status(400).json({error:`${key} must be checked or unchecked.`});
    if(!(await sql('SELECT key FROM gallery_sections WHERE key=$1',[data.section])).length)return res.status(400).json({error:'Choose an existing gallery category.'});
  }
  if(action==='preview')return galleryPreview(sql,'capture',id,data,res);

  if (action === "list") {
    let rows;
    try {
      rows = await sql(`SELECT id, ${cols(COLS)}, created_at FROM gallery ORDER BY pinned DESC NULLS LAST, sort_order, id DESC`);
    } catch (e) {
      if (/column "pinned"/.test(e.message)) {
        const noPinned = COLS.filter((f) => f !== "pinned");
        rows = await sql(`SELECT id, ${cols(noPinned)}, created_at FROM gallery ORDER BY id DESC`);
        rows = rows.map((r) => ({ ...r, pinned: false }));
      } else throw e;
    }
    return res.status(200).json({
      items: rows.map((row) => ({ ...row, image_url: normalizeLocalImage(row.image_url) })),
    });
  }

  if (action === "create") {
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const rows = await sql(
      `INSERT INTO gallery (${cols(usable)}) VALUES (${usable.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id, ${cols(COLS)}, created_at`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = [...usable.map((f) => data[f]), id];
    const rows = await sql(
      `UPDATE gallery SET ${sets} WHERE id = $${values.length} RETURNING id, ${cols(COLS)}, created_at`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM gallery WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

async function galleryPreview(sql,kind,id,data,res){
  let sections=await loadGalleryContent(sql);
  if(kind==='category'){
    const previous=sections.find(s=>String(s.id)===String(id));
    if(previous)Object.assign(previous,data,{key:previous.key});else sections.push({...data,items:[]});
  }else{
    sections.forEach(s=>s.items=s.items.filter(i=>String(i.id)!==String(id)));
    sections.find(s=>s.key===data.section)?.items.unshift({...data,id:id || 'preview'});
  }
  const result=await renderSitePage('gallery',await loadSiteSettings(sql),{gallery:sections});
  return res.status(200).json({html:previewHtml(result.html)});
}

/* ---------- Leads (created by the public contact form) ---------- */
export async function handleLeads(sql, action, id, data, res, migrate = ensureLeadsSchema, dependencies = {}) {
  res.setHeader?.('Cache-Control', 'no-store');
  try {
    if (action === 'notification-settings') {
      return res.status(200).json({ item: (dependencies.notificationSettings || notificationSettings)() });
    }
    if (action === 'test-notification') {
      const notification = await attemptLeadNotification({
        id: 'test', name: 'Portfolio notification test', email: 'fenil.seo@gmail.com', company: 'Portfolio admin',
        message: 'This is an email notification test requested from your admin panel. It is not a website enquiry.',
        project_brief: 'This is an email notification test requested from your admin panel. It is not a website enquiry.',
        services: [], source_path: '/admin', created_at: new Date().toISOString(),
      }, dependencies.notify || sendLeadNotification);
      if (notification.status === 'sent') return res.status(200).json({ notification });
      const errors = {
        gmail_app_password_missing: 'Email notifications are not configured. Add GMAIL_APP_PASSWORD in Vercel and redeploy, then try again.',
        notifications_disabled: 'Email notifications are disabled. Enable them in Vercel and redeploy, then try again.',
        smtp_auth_failed: 'Gmail could not authenticate. Check the Gmail app password in Vercel and redeploy.',
      };
      const error = errors[notification.error_code] || 'The test email could not be sent. Check the Gmail configuration and try again.';
      return res.status(['not_configured', 'disabled'].includes(notification.status) ? 503 : 502).json({ error, notification });
    }
    // Validate every action before migration or a write can occur.
    if (action === 'list') {
      const filters = validateLeadList(data);
      await migrate(sql);
      return res.status(200).json(await listLeads(sql, filters));
    }
    if (action === 'update') {
      const leadId = validateLeadId(id), values = validateLeadUpdate(data);
      await migrate(sql);
      return res.status(200).json({ item: await updateLead(sql, leadId, values) });
    }
    if (action === 'delete') {
      const leadId = validateLeadId(id);
      await migrate(sql);
      await deleteLead(sql, leadId);
      return res.status(200).json({ ok: true });
    }
    if (action === 'notify') {
      const leadId = validateLeadId(id);
      if (data != null && (typeof data !== 'object' || Array.isArray(data))) throw new LeadError('Provide the notification options.');
      if (data?.confirm_resend !== undefined && typeof data.confirm_resend !== 'boolean') throw new LeadError('Resend confirmation must be true or false.');
      await migrate(sql);
      const result = await deliverLeadNotification(sql, leadId, { ...dependencies, confirmResend: data?.confirm_resend === true });
      return res.status(200).json(result);
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    if (error instanceof LeadError) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}
