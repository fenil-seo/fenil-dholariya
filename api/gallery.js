import { getSql, isDbConfigured } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isDbConfigured()) return res.status(200).json({ sections: [] });

  try {
    const sql = getSql();
    const rows = await sql(
      `SELECT id, section, section_label, section_eyebrow, section_desc, section_order,
              image_url, alt, badge, caption, highlight
       FROM gallery
       ORDER BY section_order ASC, sort_order ASC, id ASC`
    );

    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.section)) {
        map.set(r.section, {
          key: r.section,
          label: r.section_label,
          eyebrow: r.section_eyebrow,
          description: r.section_desc,
          items: [],
        });
      }
      map.get(r.section).items.push({
        id: r.id,
        image_url: r.image_url,
        alt: r.alt,
        badge: r.badge,
        caption: r.caption,
        highlight: r.highlight,
      });
    }

    return res.status(200).json({ sections: Array.from(map.values()) });
  } catch (err) {
    console.error("gallery api error", err);
    return res.status(500).json({ error: "Could not load gallery." });
  }
}
