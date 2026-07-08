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
  `CREATE TABLE IF NOT EXISTS gallery (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL DEFAULT 'general',
    section_label TEXT NOT NULL DEFAULT '',
    section_eyebrow TEXT DEFAULT '',
    section_desc TEXT DEFAULT '',
    section_order INT DEFAULT 99,
    image_url TEXT NOT NULL DEFAULT '',
    alt TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    highlight BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS gallery_sections (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    eyebrow TEXT DEFAULT '',
    description TEXT DEFAULT '',
    position INT DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `ALTER TABLE gallery ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE`,
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

  if ((await count("gallery_sections")) === 0) {
    const SECS = [
      { key: "d2c-revenue",    label: "D2C Revenue Month-on-Month",   eyebrow: "Looker Studio · D2C e-commerce",    desc: "Looker Studio SEO reports showing organic revenue, purchases and sessions compounding month over month for a D2C brand.",       pos: 1 },
      { key: "lead-gen",       label: "Lead Gen Dashboard Reports",    eyebrow: "Looker Studio · lead generation",   desc: "Overall SEO Performance Summary dashboards tracking total leads, phone calls, form submissions and emails month over month.", pos: 2 },
      { key: "ai-search",      label: "AI Search Visibility Results",  eyebrow: "AI search · monthly reports",       desc: "Monthly reports showing client brand visibility across ChatGPT, Google AI Mode, Grok, Perplexity, Copilot and AI Overviews.", pos: 3 },
      { key: "search-console", label: "Search Console Performance",    eyebrow: "Google Search Console · analytics", desc: "Raw Google Search Console and Analytics screenshots showing clicks, impressions, CTR and organic sessions across client accounts.", pos: 4 },
    ];
    for (const s of SECS) {
      await sql(`INSERT INTO gallery_sections (key, label, eyebrow, description, position) VALUES ($1,$2,$3,$4,$5)`, [s.key, s.label, s.eyebrow, s.desc, s.pos]);
    }
    inserted.gallery_sections = SECS.length;
  }

  if ((await count("gallery")) === 0) {
    const SEC = {
      "d2c-revenue":     { label: "D2C Revenue Month-on-Month",   eyebrow: "Looker Studio · D2C e-commerce",   desc: "Looker Studio SEO reports showing organic revenue, purchases and sessions compounding month over month for a D2C brand.", order: 1 },
      "lead-gen":        { label: "Lead Gen Dashboard Reports",    eyebrow: "Looker Studio · lead generation",   desc: "Overall SEO Performance Summary dashboards tracking total leads, phone calls, form submissions and emails month over month.", order: 2 },
      "ai-search":       { label: "AI Search Visibility Results",  eyebrow: "AI search · monthly reports",       desc: "Monthly reports showing client brand visibility across ChatGPT, Google AI Mode, Grok, Perplexity, Copilot and AI Overviews.", order: 3 },
      "search-console":  { label: "Search Console Performance",    eyebrow: "Google Search Console · analytics", desc: "Raw Google Search Console and Analytics screenshots showing clicks, impressions, CTR and organic sessions across client accounts.", order: 4 },
    };
    const GI = [
      { s:"d2c-revenue",    img:"/assets/gallery/D2C.PNG",  alt:"Looker Studio SEO Report March 2026",  badge:"Mar 2026", cap:"Revenue ₹26.48K · Clicks 315 · Purchases 13",  hl:true,  o:1 },
      { s:"d2c-revenue",    img:"/assets/gallery/D2C1.PNG", alt:"Looker Studio SEO Report April 2026",  badge:"Apr 2026", cap:"Revenue ₹38.93K · Clicks 425 · Purchases 19",  hl:true,  o:2 },
      { s:"d2c-revenue",    img:"/assets/gallery/D2C2.PNG", alt:"Looker Studio SEO Report May 2026",    badge:"May 2026", cap:"Revenue ₹70.80K · Clicks 491 · Purchases 31",  hl:true,  o:3 },
      { s:"d2c-revenue",    img:"/assets/gallery/D2C3.PNG", alt:"Looker Studio SEO Report June 2026",   badge:"Jun 2026", cap:"Revenue ₹75.68K · Clicks 436 · Purchases 37",  hl:true,  o:4 },
      { s:"lead-gen",       img:"/assets/gallery/Lead%20generation%20bsuiness%202.PNG", alt:"Looker Studio Overall SEO Performance May 2026",  badge:"May 2026", cap:"42 Leads · 5 Calls · 19 Forms · 18 Emails",    hl:true,  o:1 },
      { s:"lead-gen",       img:"/assets/gallery/Lead%20generation%20bsuiness.PNG",     alt:"Looker Studio Overall SEO Performance June 2026", badge:"Jun 2026", cap:"145 Leads · 27 Calls · 41 Forms · 77 Emails",  hl:true,  o:2 },
      { s:"lead-gen",       img:"/assets/gallery/Lead%20generation%20bsuiness%204.PNG", alt:"Looker Studio Lead-Based Report May 2026",         badge:"May 2026", cap:"19 Leads · 3 Calls · 14 Forms · CTR 0.51%",   hl:true,  o:3 },
      { s:"lead-gen",       img:"/assets/gallery/Lead%20generation%20bsuiness%203.PNG", alt:"Looker Studio Lead-Based Report June 2026",        badge:"Jun 2026", cap:"18 Leads · 5 Calls · 12 Forms · CTR 0.45%",   hl:true,  o:4 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches.PNG",  alt:"AI search visibility monthly report 1", badge:"Report 1", cap:"AI Responses · AIO 29 · AI Mode 6",              hl:true, o:1 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches2.PNG", alt:"AI search visibility monthly report 2", badge:"Report 2", cap:"AI Citations · AI Overviews 6 · Perplexity 3",  hl:true, o:2 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches3.PNG", alt:"AI search visibility monthly report 3", badge:"Report 3", cap:"AI Responses · ChatGPT 8 · Grok 15",             hl:true, o:3 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches4.PNG", alt:"AI search visibility monthly report 4", badge:"Report 4", cap:"AI Responses · ChatGPT 57 · Grok 4",             hl:true, o:4 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches5.PNG", alt:"AI search visibility monthly report 5", badge:"Report 5", cap:"AI Responses · ChatGPT 1 · Grok 7",              hl:true, o:5 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches6.PNG", alt:"AI search visibility monthly report 6", badge:"Report 6", cap:"AI Responses · AI Overviews 6 · Grok 11",        hl:true, o:6 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches7.PNG", alt:"AI search visibility monthly report 7", badge:"Report 7", cap:"AI Overviews 19 · ChatGPT 43 · Grok 52",         hl:true, o:7 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches8.PNG", alt:"AI search visibility monthly report 8", badge:"Report 8", cap:"AI Responses · ChatGPT 13 · Grok 42",            hl:true, o:8 },
      { s:"ai-search",      img:"/assets/gallery/AI%20Searches9.PNG", alt:"AI search visibility monthly report 9", badge:"Report 9", cap:"AI Responses · AI Overviews 6 · AIO 107",        hl:true, o:9 },
      { s:"search-console", img:"/assets/gallery/overview-1.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:1 },
      { s:"search-console", img:"/assets/gallery/overview-2.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:2 },
      { s:"search-console", img:"/assets/gallery/overview-3.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:3 },
      { s:"search-console", img:"/assets/gallery/overview-4.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:4 },
      { s:"search-console", img:"/assets/gallery/overview-5.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:5 },
      { s:"search-console", img:"/assets/gallery/overview-6.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:6 },
      { s:"search-console", img:"/assets/gallery/overview-7.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:7 },
      { s:"search-console", img:"/assets/gallery/overview-8.jpg", alt:"Search Console clicks and impressions", cap:"Search Console - clicks & impressions", hl:false, o:8 },
      { s:"search-console", img:"/assets/gallery/d2c-1.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:9  },
      { s:"search-console", img:"/assets/gallery/d2c-2.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:10 },
      { s:"search-console", img:"/assets/gallery/d2c-3.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:11 },
      { s:"search-console", img:"/assets/gallery/d2c-4.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:12 },
      { s:"search-console", img:"/assets/gallery/d2c-5.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:13 },
      { s:"search-console", img:"/assets/gallery/d2c-6.jpg",      alt:"Search Console performance for a D2C client",               cap:"D2C - Search Console performance",     hl:false, o:14 },
      { s:"search-console", img:"/assets/gallery/d2c-7.jpg",      alt:"Analytics channels and sessions for a D2C client",          cap:"D2C - Analytics channels & sessions",  hl:false, o:15 },
      { s:"search-console", img:"/assets/gallery/d2c-8.jpg",      alt:"Analytics channels and sessions for a D2C client",          cap:"D2C - Analytics channels & sessions",  hl:false, o:16 },
      { s:"search-console", img:"/assets/gallery/leadgen-4.jpg",  alt:"Search Console performance for a lead generation client",   cap:"Lead gen - Search Console performance",hl:false, o:17 },
      { s:"search-console", img:"/assets/gallery/leadgen-5.jpg",  alt:"Search Console performance for a lead generation client",   cap:"Lead gen - Search Console performance",hl:false, o:18 },
      { s:"search-console", img:"/assets/gallery/leadgen-6.jpg",  alt:"Search Console performance for a lead generation client",   cap:"Lead gen - Search Console performance",hl:false, o:19 },
    ];
    for (const g of GI) {
      const sec = SEC[g.s];
      await sql(
        `INSERT INTO gallery (section,section_label,section_eyebrow,section_desc,section_order,image_url,alt,badge,caption,highlight,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [g.s, sec.label, sec.eyebrow, sec.desc, sec.order, g.img, g.alt, g.badge || "", g.cap || "", g.hl, g.o]
      );
    }
    inserted.gallery = GI.length;
  }

  return inserted;
}
