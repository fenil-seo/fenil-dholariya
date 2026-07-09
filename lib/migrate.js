/* Lazy schema migrations — adds columns introduced after initial deploy.
   Each ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent (no-op when
   the column already exists), so it is safe to run on every cold start.
   The Promise is cached for the lifetime of the serverless instance so
   warm requests pay no extra round-trips. */

import { SEED } from "./seed-data.js";

let _promise = null;

export function ensureNewColumns(sql) {
  if (!_promise) {
    _promise = Promise.all([
      sql(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS blog_image_url TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS body TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS period TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS services TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS challenge TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS approach TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS results_text TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS takeaway TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS testimonial TEXT DEFAULT ''`).catch(() => {}),
      sql(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS testimonial_author TEXT DEFAULT ''`).catch(() => {}),
    ]).then(() =>
      // One-time backfill: project rows created before the structured
      // case-study fields existed are completely empty (no challenge, no
      // approach, no body) — fill them from seed content. The WHERE guards
      // make this a no-op once filled or whenever an admin has written
      // any content of their own.
      Promise.all(
        (SEED.projects || []).filter((p) => p.challenge).map((p) =>
          sql(
            `UPDATE projects SET period=$2, services=$3, challenge=$4, approach=$5, results_text=$6, takeaway=$7
             WHERE slug=$1 AND COALESCE(challenge,'')='' AND COALESCE(approach,'')='' AND COALESCE(body,'')=''`,
            [p.slug, p.period || "", p.services || "", p.challenge, p.approach || "", p.results_text || "", p.takeaway || ""]
          ).catch(() => {})
        )
      )
    );
  }
  return _promise;
}
