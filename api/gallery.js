import { getSql, isDbConfigured } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!isDbConfigured()) return res.status(200).json({ sections: [] });

  try {
    const sql = getSql();
    let rows;
    try {
      rows = await sql(
        `SELECT g.id, g.section, g.image_url, g.alt, g.badge, g.caption, g.highlight,
                COALESCE(g.pinned, FALSE) AS pinned,
                COALESCE(s.label, g.section_label, g.section)   AS section_label,
                COALESCE(s.eyebrow, g.section_eyebrow, '')       AS section_eyebrow,
                COALESCE(s.description, g.section_desc, '')      AS section_desc,
                COALESCE(s.position, g.section_order, 99)        AS section_order
         FROM gallery g
         LEFT JOIN gallery_sections s ON g.section = s.key
         ORDER BY COALESCE(s.position, g.section_order, 99) ASC,
                  COALESCE(g.pinned, FALSE) DESC,
                  g.id DESC`
      );
    } catch (e) {
      if (/gallery_sections|column "pinned"/.test(String(e.message))) {
        rows = await sql(
          `SELECT id, section, image_url, alt, badge, caption, highlight,
                  FALSE AS pinned, section_label, section_eyebrow, section_desc, section_order
           FROM gallery ORDER BY section_order ASC, id DESC`
        );
      } else throw e;
    }

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
        pinned: r.pinned,
      });
    }

    return res.status(200).json({ sections: Array.from(map.values()) });
  } catch (err) {
    console.error("gallery api error", err);
    return res.status(500).json({ error: "Could not load gallery." });
  }
}
