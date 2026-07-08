import { getSql, isDbConfigured } from "../lib/db.js";
import { SEED } from "../lib/seed-data.js";
import { ensureNewColumns } from "../lib/migrate.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const slug = typeof req.query.slug === "string" ? req.query.slug : null;

  if (!isDbConfigured()) {
    const all = SEED.projects || [];
    if (slug) {
      const project = all.find((p) => p.slug === slug);
      return project ? res.status(200).json({ project }) : res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ projects: all });
  }

  try {
    const sql = getSql();
    await ensureNewColumns(sql);
    const cols = `slug, title, category, client, description AS "desc", viz, accent, metrics, featured, sort_order, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(body,'') AS body`;

    if (slug) {
      const rows = await sql(`SELECT ${cols} FROM projects WHERE slug = $1 LIMIT 1`, [slug]);
      if (rows.length) return res.status(200).json({ project: rows[0] });
      const fallback = (SEED.projects || []).find((p) => p.slug === slug);
      return fallback
        ? res.status(200).json({ project: fallback })
        : res.status(404).json({ error: "Not found" });
    }

    const rows = await sql(`SELECT ${cols} FROM projects ORDER BY sort_order, id`);
    return res.status(200).json({ projects: rows.length ? rows : (SEED.projects || []) });
  } catch (err) {
    console.error("projects api error", err);
    if (slug) {
      const fallback = (SEED.projects || []).find((p) => p.slug === slug);
      return fallback
        ? res.status(200).json({ project: fallback })
        : res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ projects: SEED.projects || [] });
  }
}
