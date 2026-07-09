import { getSql, isDbConfigured } from "../lib/db.js";
import { SEED } from "../lib/seed-data.js";
import { ensureNewColumns } from "../lib/migrate.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const slug = typeof req.query.slug === "string" ? req.query.slug : null;

  if (!isDbConfigured()) {
    if (slug) {
      const post = SEED.posts.find((p) => p.slug === slug);
      return post ? res.status(200).json({ post }) : res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ posts: SEED.posts });
  }

  try {
    const sql = getSql();
    await ensureNewColumns(sql);

    if (slug) {
      const rows = await sql(
        `SELECT slug, title, category, excerpt, body, viz, accent, reading_time, date, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(blog_image_url,'') AS blog_image_url FROM posts WHERE slug = $1 AND published = true LIMIT 1`,
        [slug]
      );
      if (rows.length) return res.status(200).json({ post: rows[0] });
      const fallback = SEED.posts.find((p) => p.slug === slug);
      return fallback ? res.status(200).json({ post: fallback }) : res.status(404).json({ error: "Not found" });
    }

    const rows = await sql(
      `SELECT slug, title, category, excerpt, viz, accent, reading_time, date, COALESCE(image_url,'') AS image_url, COALESCE(blog_image_url,'') AS blog_image_url FROM posts WHERE published = true ORDER BY date DESC, id DESC`
    );
    return res.status(200).json({ posts: rows.length ? rows : SEED.posts });
  } catch (err) {
    console.error("posts api error", err);
    if (slug) {
      const fallback = SEED.posts.find((p) => p.slug === slug);
      return fallback ? res.status(200).json({ post: fallback }) : res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json({ posts: SEED.posts });
  }
}
