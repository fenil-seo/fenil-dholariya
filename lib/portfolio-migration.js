import { SEED } from './seed-data.js';

// The existing live portfolio exposes these four bundled case studies when the
// projects table is empty. Persist that already-public catalogue once before
// removing the fallback. The marker prevents later deletions from resurrecting it.
export async function initializePublicPortfolio(sql) {
  await sql(`CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const projects = SEED.projects.map((project, i) => ({ ...project, description: project.desc, sort_order: i, image_url: project.image_url || '', body: project.body || '' }));
  await sql(`WITH claimed AS (
      INSERT INTO app_migrations (key) VALUES ('2026-09-server-rendered-portfolio')
      ON CONFLICT DO NOTHING RETURNING key
    )
    INSERT INTO projects (slug, title, category, client, description, viz, accent, metrics, featured, sort_order,
      image_url, body, period, services, challenge, approach, results_text, takeaway)
    SELECT seed.slug, seed.title, seed.category, seed.client, seed.description, seed.viz, seed.accent, seed.metrics,
      COALESCE(seed.featured, true), seed.sort_order, seed.image_url, seed.body,
      seed.period, seed.services, seed.challenge, seed.approach, seed.results_text, seed.takeaway
    FROM jsonb_to_recordset($1::jsonb) AS seed(slug text, title text, category text, client text, description text,
      viz text, accent text, metrics jsonb, featured boolean, sort_order integer, image_url text, body text,
      period text, services text, challenge text, approach text, results_text text, takeaway text)
    WHERE EXISTS (SELECT 1 FROM claimed) AND NOT EXISTS (SELECT 1 FROM projects)
    ON CONFLICT (slug) DO NOTHING`, [JSON.stringify(projects)]);
}
