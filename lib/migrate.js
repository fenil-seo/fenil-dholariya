/* Lazy schema migrations — adds columns introduced after initial deploy.
   Each ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent (no-op when
   the column already exists), so it is safe to run on every cold start.
   The Promise is cached for the lifetime of the serverless instance so
   warm requests pay no extra round-trips. */

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
    ]);
  }
  return _promise;
}
