import { getSql, isDbConfigured } from './db.js';
import { ensureNewColumns } from './migrate.js';
import { SEED } from './seed-data.js';

// A configured database is authoritative, including an empty catalogue.
// Database errors must remain errors, never resurrect deleted or draft content.
export async function loadPublicContent({ configured = isDbConfigured(), sql = configured ? getSql() : null, migrate = ensureNewColumns } = {}) {
  if (!configured) return { posts: SEED.posts.filter(p => p.published !== false), projects: SEED.projects };
  await migrate(sql);
  const [posts, projects] = await Promise.all([
    sql(`SELECT slug, title, category, excerpt, body, viz, accent, reading_time, date, updated_at, schema_markup,
      COALESCE(image_url,'') AS image_url, COALESCE(blog_image_url,'') AS blog_image_url,
      COALESCE(meta_title,'') AS meta_title, COALESCE(meta_description,'') AS meta_description,
      COALESCE(og_title,'') AS og_title, COALESCE(og_description,'') AS og_description, COALESCE(og_image_url,'') AS og_image_url
      FROM posts WHERE published = true ORDER BY date DESC, id DESC`),
    sql(`SELECT slug, title, category, client, description AS "desc", viz, accent, metrics, featured, sort_order,
      updated_at, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(body,'') AS body,
      COALESCE(period,'') AS period, COALESCE(services,'') AS services, COALESCE(challenge,'') AS challenge,
      COALESCE(approach,'') AS approach, COALESCE(results_text,'') AS results_text, COALESCE(takeaway,'') AS takeaway,
      COALESCE(testimonial,'') AS testimonial, COALESCE(testimonial_author,'') AS testimonial_author,
      COALESCE(listing_title,'') AS listing_title, COALESCE(listing_description,'') AS listing_description,
      COALESCE(work_category,'') AS work_category, COALESCE(image_alt,'') AS image_alt
      FROM projects ORDER BY sort_order, id`),
  ]);
  return { posts, projects };
}

export function summaries(data) {
  const omitBody = ({ body, challenge, approach, results_text, testimonial, testimonial_author, takeaway, schema_markup, ...item }) => item;
  return { posts: data.posts.map(omitBody), projects: data.projects.map(omitBody) };
}
