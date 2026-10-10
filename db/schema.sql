-- =====================================================================
-- Fenil Dholariya portfolio - Neon Postgres schema
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- This is also applied automatically by the admin dashboard's
-- "Initialize database" action (POST /api/seed), which calls the same
-- statements programmatically - running this file by hand is optional.
-- =====================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT,
  role TEXT,
  tagline TEXT,
  intro TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  available BOOLEAN DEFAULT TRUE,
  available_text TEXT,
  instagram TEXT,
  linkedin TEXT,
  schema_markup JSONB,
  CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS stats (
  id SERIAL PRIMARY KEY,
  value TEXT NOT NULL,
  suffix TEXT,
  label TEXT NOT NULL,
  trend TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  icon TEXT,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS process_steps (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  client TEXT,
  description TEXT,
  viz TEXT DEFAULT 'network',
  accent TEXT DEFAULT 'violet',
  metrics JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  schema_markup JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  excerpt TEXT,
  body TEXT,
  viz TEXT DEFAULT 'network',
  accent TEXT DEFAULT 'violet',
  reading_time INT DEFAULT 5,
  date DATE DEFAULT CURRENT_DATE,
  published BOOLEAN DEFAULT TRUE,
  schema_markup JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  quote TEXT NOT NULL,
  name TEXT,
  role TEXT,
  initials TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS timeline (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  org TEXT,
  period TEXT,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  message TEXT NOT NULL,
  project_brief TEXT,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  website TEXT DEFAULT '',
  market TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  currency TEXT DEFAULT '',
  timeline TEXT DEFAULT '',
  timezone TEXT DEFAULT '',
  source_path TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  notes TEXT NOT NULL DEFAULT '',
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Existing databases add these lead columns automatically through
-- lib/lead-migration.js; this reference also supports manual schema refreshes.
ALTER TABLE leads
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
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS leads_follow_up_idx ON leads (follow_up_at)
  WHERE status IN ('new', 'contacted', 'qualified');
