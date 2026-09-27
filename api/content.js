import { getSql, isDbConfigured } from "../lib/db.js";
import { SEED } from "../lib/seed-data.js";
import { ensureNewColumns } from "../lib/migrate.js";
import { loadPublicContent } from "../lib/public-content.js";
import { buildSitemap, buildLlmMap } from "../lib/search.js";


export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (['sitemap', 'llms'].includes(req.query?.format)) {
    let data;
    try { data = await loadPublicContent(); }
    catch { res.setHeader('Retry-After', '60'); return res.status(503).send('Temporarily unavailable'); }
    res.setHeader("Content-Type", req.query.format === 'sitemap' ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).send(req.query.format === 'sitemap' ? buildSitemap(data) : buildLlmMap(data));
  }

  let data;
  try { data = await loadContent(); }
  catch { res.setHeader('Retry-After', '60'); return res.status(503).json({ error: 'Content temporarily unavailable' }); }
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json(data);
}

async function loadContent() {
  if (!isDbConfigured()) return SEED;

  try {
    const sql = getSql();
    await ensureNewColumns(sql);
    const [profileRows, stats, rawServices, steps, projects, posts, testimonials, rawSkills, rawTimeline] = await Promise.all([
      sql(`SELECT * FROM profile WHERE id = 1`),
      sql(`SELECT value, suffix, label, trend FROM stats ORDER BY sort_order, id`),
      sql(`SELECT icon, title, description AS "desc" FROM services ORDER BY sort_order, id`),
      sql(`SELECT title, description AS "desc" FROM process_steps ORDER BY sort_order, id`),
      sql(`SELECT slug, title, category, client, description AS "desc", viz, accent, metrics, featured, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(body,'') AS body FROM projects ORDER BY sort_order, id`),
      sql(`SELECT slug, title, category, excerpt, viz, accent, reading_time, date, COALESCE(image_url,'') AS image_url, COALESCE(blog_image_url,'') AS blog_image_url FROM posts WHERE published = true ORDER BY date DESC, id DESC`),
      sql(`SELECT quote, name, role, initials FROM testimonials ORDER BY sort_order, id`),
      sql(`SELECT name FROM skills ORDER BY sort_order, id`),
      sql(`SELECT role, org, period FROM timeline ORDER BY sort_order, id`),
    ]);

    // Auto-add any seed services / skills / timeline entries missing from the DB
    // Service labels can change during editorial updates. Match the stable icon
    // key so renaming a capability does not create duplicate database services.
    const services  = await syncMissing(sql, "services",  rawServices,  SEED.services,  (s) => s.icon || s.title, (s, i) => [`INSERT INTO services (icon, title, description, sort_order) VALUES ($1,$2,$3,$4)`, [s.icon, s.title, s.desc, rawServices.length + i]], `SELECT icon, title, description AS "desc" FROM services ORDER BY sort_order, id`);
    const skills    = await syncMissing(sql, "skills",    rawSkills,    SEED.skills.map((n) => ({ name: n })), (s) => s.name, (s, i) => [`INSERT INTO skills (name, sort_order) VALUES ($1,$2)`, [s.name, rawSkills.length + i]], `SELECT name FROM skills ORDER BY sort_order, id`);
    const timeline  = await syncMissing(sql, "timeline",  rawTimeline,  SEED.timeline,  (t) => `${t.role}|${t.org}`, (t, i) => [`INSERT INTO timeline (role, org, period, sort_order) VALUES ($1,$2,$3,$4)`, [t.role, t.org, t.period, rawTimeline.length + i]], `SELECT role, org, period FROM timeline ORDER BY sort_order, id`);

    return {
      profile: profileRows[0]
        ? {
            name: profileRows[0].name,
            role: profileRows[0].role,
            tagline: profileRows[0].tagline,
            intro: profileRows[0].intro,
            location: profileRows[0].location,
            email: profileRows[0].email,
            phone: profileRows[0].phone,
            whatsapp: profileRows[0].whatsapp,
            available: profileRows[0].available,
            availableText: profileRows[0].available_text,
            schema_markup: profileRows[0].schema_markup,
            socials: {
              instagram: profileRows[0].instagram,
              linkedin: profileRows[0].linkedin,
              whatsapp: `https://wa.me/${profileRows[0].whatsapp || ""}`,
              email: `mailto:${profileRows[0].email || ""}`,
            },
          }
        : SEED.profile,
      stats: stats.length ? stats : SEED.stats,
      services,
      process: steps.length ? steps : SEED.process,
      projects,
      posts,
      testimonials: testimonials.length ? testimonials : SEED.testimonials,
      skills: skills.map((s) => s.name || s),
      timeline,
    };
  } catch (err) {
    console.error("content api error", err.name);
    throw err;
  }
}

/* Auto-inserts any seed entries missing from the DB, then re-fetches.
   key(row) → comparable string; insertFn(seedRow, index) → [sql, params]; fetchSql → re-fetch query */
async function syncMissing(sql, _table, dbRows, seedRows, key, insertFn, fetchSql) {
  if (!dbRows.length) return dbRows; // table is empty - seed.js handles full init
  const existing = new Set(dbRows.map((r) => key(r).toLowerCase()));
  const missing = seedRows.filter((r) => !existing.has(key(r).toLowerCase()));
  if (!missing.length) return dbRows;
  await Promise.all(missing.map((r, i) => {
    const [q, p] = insertFn(r, i);
    return sql(q, p).catch(() => {});
  }));
  return sql(fetchSql);
}
