import { getSql, isDbConfigured } from "../lib/db.js";
import { isAuthenticated } from "../lib/auth.js";
import { SEED } from "../lib/seed-data.js";

const DDL = [
  `CREATE TABLE IF NOT EXISTS profile (
    id INT PRIMARY KEY DEFAULT 1,
    name TEXT, role TEXT, tagline TEXT, intro TEXT,
    location TEXT, email TEXT, phone TEXT, whatsapp TEXT,
    available BOOLEAN DEFAULT TRUE, available_text TEXT,
    instagram TEXT, linkedin TEXT, schema_markup JSONB,
    CHECK (id = 1)
  )`,
  `CREATE TABLE IF NOT EXISTS stats (
    id SERIAL PRIMARY KEY, value TEXT NOT NULL, suffix TEXT, label TEXT NOT NULL, trend TEXT, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY, icon TEXT, title TEXT NOT NULL, description TEXT, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS process_steps (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT, client TEXT,
    description TEXT, viz TEXT DEFAULT 'network', accent TEXT DEFAULT 'violet', metrics JSONB DEFAULT '[]',
    featured BOOLEAN DEFAULT TRUE, sort_order INT DEFAULT 0, schema_markup JSONB, created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, category TEXT, excerpt TEXT, body TEXT,
    viz TEXT DEFAULT 'network', accent TEXT DEFAULT 'violet', reading_time INT DEFAULT 5,
    date DATE DEFAULT CURRENT_DATE, published BOOLEAN DEFAULT TRUE, schema_markup JSONB, created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS testimonials (
    id SERIAL PRIMARY KEY, quote TEXT NOT NULL, name TEXT, role TEXT, initials TEXT, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS timeline (
    id SERIAL PRIMARY KEY, role TEXT NOT NULL, org TEXT, period TEXT, sort_order INT DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, message TEXT,
    status TEXT DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT now()
  )`,
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthenticated(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!isDbConfigured()) {
    return res.status(400).json({ error: "DATABASE_URL is not set. Add it in your environment variables, then redeploy." });
  }

  const sql = getSql();
  try {
    for (const stmt of DDL) await sql(stmt);
    const inserted = await insertSeedIfEmpty(sql);
    return res.status(200).json({ ok: true, inserted });
  } catch (err) {
    console.error("seed error", err);
    return res.status(500).json({ error: err.message || "Setup failed." });
  }
}

async function insertSeedIfEmpty(sql) {
  const inserted = {};
  const count = async (table) => (await sql(`SELECT COUNT(*)::int AS c FROM ${table}`))[0].c;

  if ((await count("profile")) === 0) {
    const p = SEED.profile;
    await sql(
      `INSERT INTO profile (id, name, role, tagline, intro, location, email, phone, whatsapp, available, available_text, instagram, linkedin)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [p.name, p.role, p.tagline, p.intro, p.location, p.email, p.phone, p.whatsapp, p.available, p.availableText, p.socials.instagram, p.socials.linkedin]
    );
    inserted.profile = 1;
  }

  if ((await count("stats")) === 0) {
    for (const [i, s] of SEED.stats.entries()) {
      await sql(`INSERT INTO stats (value, suffix, label, trend, sort_order) VALUES ($1,$2,$3,$4,$5)`, [String(s.value), s.suffix, s.label, s.trend, i]);
    }
    inserted.stats = SEED.stats.length;
  }

  if ((await count("services")) === 0) {
    for (const [i, s] of SEED.services.entries()) {
      await sql(`INSERT INTO services (icon, title, description, sort_order) VALUES ($1,$2,$3,$4)`, [s.icon, s.title, s.desc, i]);
    }
    inserted.services = SEED.services.length;
  }

  if ((await count("process_steps")) === 0) {
    for (const [i, s] of SEED.process.entries()) {
      await sql(`INSERT INTO process_steps (title, description, sort_order) VALUES ($1,$2,$3)`, [s.title, s.desc, i]);
    }
    inserted.process = SEED.process.length;
  }

  if ((await count("projects")) === 0) {
    for (const [i, p] of SEED.projects.entries()) {
      await sql(
        `INSERT INTO projects (slug, title, category, client, description, viz, accent, metrics, featured, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
        [p.slug, p.title, p.category, p.client, p.desc, p.viz || "network", p.accent || "violet", JSON.stringify(p.metrics || []), p.featured !== false, i]
      );
    }
    inserted.projects = SEED.projects.length;
  }

  if ((await count("posts")) === 0) {
    for (const [i, p] of SEED.posts.entries()) {
      await sql(
        `INSERT INTO posts (slug, title, category, excerpt, body, viz, accent, reading_time, date, published, schema_markup) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
        [p.slug, p.title, p.category, p.excerpt, p.body, p.viz || "network", p.accent || "violet", p.reading_time || 5, p.date, true, JSON.stringify(p.schema_markup ?? null)]
      );
    }
    inserted.posts = SEED.posts.length;
  }

  if ((await count("testimonials")) === 0) {
    for (const [i, t] of SEED.testimonials.entries()) {
      await sql(`INSERT INTO testimonials (quote, name, role, initials, sort_order) VALUES ($1,$2,$3,$4,$5)`, [t.quote, t.name, t.role, t.initials, i]);
    }
    inserted.testimonials = SEED.testimonials.length;
  }

  if ((await count("skills")) === 0) {
    for (const [i, s] of SEED.skills.entries()) {
      await sql(`INSERT INTO skills (name, sort_order) VALUES ($1,$2)`, [s, i]);
    }
    inserted.skills = SEED.skills.length;
  }

  if ((await count("timeline")) === 0) {
    for (const [i, t] of SEED.timeline.entries()) {
      await sql(`INSERT INTO timeline (role, org, period, sort_order) VALUES ($1,$2,$3,$4)`, [t.role, t.org, t.period, i]);
    }
    inserted.timeline = SEED.timeline.length;
  }

  return inserted;
}
