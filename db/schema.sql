-- =====================================================================
-- Fenil Dholariya portfolio — Neon Postgres schema
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- This is also applied automatically by the admin dashboard's
-- "Initialize database" action (POST /api/seed), which calls the same
-- statements programmatically — running this file by hand is optional.
-- =====================================================================

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
  company TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);
