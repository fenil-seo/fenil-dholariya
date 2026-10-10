// Contact storage is independent of the public-content migrations. A failed
// cold-start migration can be retried, and warm requests reuse the same promise.
const migrations = new WeakMap();

export const LEAD_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
    company TEXT DEFAULT '', message TEXT NOT NULL, project_brief TEXT,
    services JSONB NOT NULL DEFAULT '[]'::jsonb,
    website TEXT DEFAULT '', market TEXT DEFAULT '', budget TEXT DEFAULT '',
    currency TEXT DEFAULT '', timeline TEXT DEFAULT '', timezone TEXT DEFAULT '',
    source_path TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'new',
    priority TEXT NOT NULL DEFAULT 'normal', notes TEXT NOT NULL DEFAULT '',
    follow_up_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS project_brief TEXT,
    ADD COLUMN IF NOT EXISTS services JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS market TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS budget TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS timeline TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS source_path TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS leads_follow_up_idx ON leads (follow_up_at)
    WHERE status IN ('new', 'contacted', 'qualified')`,
];

export function ensureLeadsSchema(sql) {
  if (!migrations.has(sql)) {
    const promise = (async () => {
      for (const statement of LEAD_SCHEMA_SQL) await sql(statement);
    })().catch(error => {
      migrations.delete(sql);
      throw error;
    });
    migrations.set(sql, promise);
  }
  return migrations.get(sql);
}
