import { getSql, isDbConfigured } from "../lib/db.js";
import { SEED } from "../lib/seed-data.js";

const SITE_URL = "https://fenildholariya.vercel.app";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const data = await loadContent();

  if (req.query?.format === "sitemap") {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(buildSitemap(data));
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
  return res.status(200).json(data);
}

async function loadContent() {
  if (!isDbConfigured()) return SEED;

  try {
    const sql = getSql();
    const [profileRows, stats, services, steps, projects, posts, testimonials, skills, timeline] = await Promise.all([
      sql(`SELECT * FROM profile WHERE id = 1`),
      sql(`SELECT value, suffix, label, trend FROM stats ORDER BY sort_order, id`),
      sql(`SELECT icon, title, description AS "desc" FROM services ORDER BY sort_order, id`),
      sql(`SELECT title, description AS "desc" FROM process_steps ORDER BY sort_order, id`),
      sql(`SELECT slug, title, category, client, description AS "desc", viz, accent, metrics, featured, schema_markup FROM projects ORDER BY sort_order, id`),
      sql(`SELECT slug, title, category, excerpt, viz, accent, reading_time, date FROM posts WHERE published = true ORDER BY date DESC, id DESC`),
      sql(`SELECT quote, name, role, initials FROM testimonials ORDER BY sort_order, id`),
      sql(`SELECT name FROM skills ORDER BY sort_order, id`),
      sql(`SELECT role, org, period FROM timeline ORDER BY sort_order, id`),
    ]);

    const isEmpty = !profileRows.length && !stats.length && !services.length && !projects.length && !posts.length;
    if (isEmpty) return SEED;

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
      services: services.length ? services : SEED.services,
      process: steps.length ? steps : SEED.process,
      projects: projects.length ? projects : SEED.projects,
      posts: posts.length ? posts : SEED.posts,
      testimonials: testimonials.length ? testimonials : SEED.testimonials,
      skills: skills.length ? skills.map((s) => s.name) : SEED.skills,
      timeline: timeline.length ? timeline : SEED.timeline,
    };
  } catch (err) {
    console.error("content api error", err);
    return SEED;
  }
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(data) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/work`, priority: "0.8" },
    { loc: `${SITE_URL}/blog`, priority: "0.8" },
  ];
  (data.posts || []).forEach((p) => urls.push({ loc: `${SITE_URL}/post/${p.slug}`, lastmod: p.date, priority: "0.6" }));

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n${u.lastmod ? `    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n` : ""}    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
