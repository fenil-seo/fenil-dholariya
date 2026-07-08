import { getSql, isDbConfigured } from "../lib/db.js";
import { isAuthenticated } from "../lib/auth.js";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthenticated(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not connected. Add DATABASE_URL in your environment variables, redeploy, then run setup from the dashboard." });
  }

  const { resource, action, id, data } = req.body || {};
  const sql = getSql();

  try {
    switch (resource) {
      case "profile":
        return await handleProfile(sql, action, data, res);
      case "stats":
        return await handleSimpleList(sql, "stats", ["value", "suffix", "label", "trend", "sort_order"], action, id, data, res);
      case "services":
        return await handleSimpleList(sql, "services", ["icon", "title", "description", "sort_order"], action, id, data, res);
      case "process":
        return await handleSimpleList(sql, "process_steps", ["title", "description", "sort_order"], action, id, data, res);
      case "testimonials":
        return await handleSimpleList(sql, "testimonials", ["quote", "name", "role", "initials", "sort_order"], action, id, data, res);
      case "skills":
        return await handleSimpleList(sql, "skills", ["name", "sort_order"], action, id, data, res);
      case "timeline":
        return await handleSimpleList(sql, "timeline", ["role", "org", "period", "sort_order"], action, id, data, res);
      case "projects":
        return await handleProjects(sql, action, id, data, res);
      case "posts":
        return await handlePosts(sql, action, id, data, res);
      case "leads":
        return await handleLeads(sql, action, id, data, res);
      case "gallery-sections":
        return await handleGallerySections(sql, action, id, data, res);
      case "gallery":
        return await handleGallery(sql, action, id, data, res);
      default:
        return res.status(400).json({ error: "Unknown resource" });
    }
  } catch (err) {
    console.error("admin api error", resource, action, err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "That slug is already in use - choose a different one." });
    }
    return res.status(500).json({ error: "Something went wrong. " + (err.message || "") });
  }
}

/* ---------- Generic CRUD for flat list tables (whitelisted columns only) ---------- */
async function handleSimpleList(sql, table, fields, action, id, data, res) {
  const cols = (subset) => subset.map((f) => `"${f}"`).join(", ");

  if (action === "list") {
    const rows = await sql(`SELECT id, ${cols(fields)} FROM ${table} ORDER BY sort_order, id`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create") {
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const placeholders = usable.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await sql(
      `INSERT INTO ${table} (${cols(usable)}) VALUES (${placeholders}) RETURNING id, ${cols(fields)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = usable.map((f) => data[f]);
    values.push(id);
    const rows = await sql(
      `UPDATE ${table} SET ${sets} WHERE id = $${values.length} RETURNING id, ${cols(fields)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Profile (singleton row) ---------- */
async function handleProfile(sql, action, data, res) {
  if (action === "get") {
    const rows = await sql(`SELECT * FROM profile WHERE id = 1`);
    return res.status(200).json({ item: rows[0] || null });
  }

  if (action === "update") {
    const fields = ["name", "role", "tagline", "intro", "location", "email", "phone", "whatsapp", "available", "available_text", "instagram", "linkedin", "schema_markup"];
    const usable = fields.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const placeholder = (f, i) => (f === "schema_markup" ? `$${i + 1}::jsonb` : `$${i + 1}`);
    const values = usable.map((f) => (f === "schema_markup" ? JSON.stringify(data[f]) : data[f]));
    const insertCols = usable.map((f) => `"${f}"`).join(", ");
    const insertPlaceholders = usable.map((f, i) => placeholder(f, i)).join(", ");
    const sets = usable.map((f, i) => `"${f}" = ${placeholder(f, i)}`).join(", ");
    const rows = await sql(
      `INSERT INTO profile (id, ${insertCols}) VALUES (1, ${insertPlaceholders})
       ON CONFLICT (id) DO UPDATE SET ${sets}
       RETURNING *`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Projects (slug + JSONB metrics) ---------- */
async function handleProjects(sql, action, id, data, res) {
  const RETURNING = `id, slug, title, category, client, description AS "desc", viz, accent, metrics, featured, sort_order, schema_markup, COALESCE(image_url,'') AS image_url, COALESCE(body,'') AS body`;

  if (action === "list") {
    const rows = await sql(`SELECT ${RETURNING} FROM projects ORDER BY sort_order, id`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create" || action === "update") {
    const slug = slugify(data?.slug) || slugify(data?.title);
    if (!slug) return res.status(400).json({ error: "Title or slug is required." });
    const metricsJson = JSON.stringify(data?.metrics || []);
    const schemaJson = JSON.stringify(data?.schema_markup ?? null);
    const params = [
      slug,
      data?.title || "",
      data?.category || "",
      data?.client || "",
      data?.desc || data?.description || "",
      data?.viz || "network",
      data?.accent || "violet",
      metricsJson,
      data?.featured !== false,
      Number(data?.sort_order) || 0,
      schemaJson,
      data?.image_url || "",
      data?.body || "",
    ];

    if (action === "create") {
      const rows = await sql(
        `INSERT INTO projects (slug, title, category, client, description, viz, accent, metrics, featured, sort_order, schema_markup, image_url, body)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13)
         RETURNING ${RETURNING}`,
        params
      );
      return res.status(200).json({ item: rows[0] });
    }

    if (!id) return res.status(400).json({ error: "Missing id" });
    params.push(id);
    const rows = await sql(
      `UPDATE projects SET slug=$1, title=$2, category=$3, client=$4, description=$5, viz=$6, accent=$7, metrics=$8::jsonb, featured=$9, sort_order=$10, schema_markup=$11::jsonb, image_url=$12, body=$13
       WHERE id = $14
       RETURNING ${RETURNING}`,
      params
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM projects WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Posts (slug + body HTML) ---------- */
async function handlePosts(sql, action, id, data, res) {
  const RETURNING = `id, slug, title, category, excerpt, body, viz, accent, reading_time, date, published, schema_markup, COALESCE(image_url,'') AS image_url`;

  if (action === "list") {
    const rows = await sql(`SELECT ${RETURNING} FROM posts ORDER BY date DESC, id DESC`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create" || action === "update") {
    const slug = slugify(data?.slug) || slugify(data?.title);
    if (!slug) return res.status(400).json({ error: "Title or slug is required." });
    const schemaJson = JSON.stringify(data?.schema_markup ?? null);
    const params = [
      slug,
      data?.title || "",
      data?.category || "",
      data?.excerpt || "",
      data?.body || "",
      data?.viz || "network",
      data?.accent || "violet",
      Number(data?.reading_time) || 5,
      data?.date || new Date().toISOString().slice(0, 10),
      data?.published !== false,
      schemaJson,
      data?.image_url || "",
    ];

    if (action === "create") {
      const rows = await sql(
        `INSERT INTO posts (slug, title, category, excerpt, body, viz, accent, reading_time, date, published, schema_markup, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
         RETURNING ${RETURNING}`,
        params
      );
      return res.status(200).json({ item: rows[0] });
    }

    if (!id) return res.status(400).json({ error: "Missing id" });
    params.push(id);
    const rows = await sql(
      `UPDATE posts SET slug=$1, title=$2, category=$3, excerpt=$4, body=$5, viz=$6, accent=$7, reading_time=$8, date=$9, published=$10, schema_markup=$11::jsonb, image_url=$12
       WHERE id = $13
       RETURNING ${RETURNING}`,
      params
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM posts WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Gallery sections (CRUD for section metadata) ---------- */
async function handleGallerySections(sql, action, id, data, res) {
  const COLS = ["key", "label", "eyebrow", "description", "position"];
  const c = (arr) => arr.map((f) => `"${f}"`).join(", ");

  if (action === "list") {
    const rows = await sql(`SELECT id, ${c(COLS)} FROM gallery_sections ORDER BY position ASC, id ASC`);
    return res.status(200).json({ items: rows });
  }

  if (action === "create") {
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const rows = await sql(
      `INSERT INTO gallery_sections (${c(usable)}) VALUES (${usable.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id, ${c(COLS)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const editable = COLS.filter((f) => f !== "key");
    const usable = editable.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = [...usable.map((f) => data[f]), id];
    const rows = await sql(
      `UPDATE gallery_sections SET ${sets} WHERE id = $${values.length} RETURNING id, ${c(COLS)}`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM gallery_sections WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Gallery items (images shown on /gallery) ---------- */
async function handleGallery(sql, action, id, data, res) {
  const COLS = ["section", "image_url", "alt", "badge", "caption", "highlight", "pinned"];
  const cols = (arr) => arr.map((f) => `"${f}"`).join(", ");

  if (action === "list") {
    let rows;
    try {
      rows = await sql(`SELECT id, ${cols(COLS)}, created_at FROM gallery ORDER BY pinned DESC NULLS LAST, id DESC`);
    } catch (e) {
      if (/column "pinned"/.test(e.message)) {
        const noPinned = COLS.filter((f) => f !== "pinned");
        rows = await sql(`SELECT id, ${cols(noPinned)}, created_at FROM gallery ORDER BY id DESC`);
        rows = rows.map((r) => ({ ...r, pinned: false }));
      } else throw e;
    }
    return res.status(200).json({ items: rows });
  }

  if (action === "create") {
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const values = usable.map((f) => data[f]);
    const rows = await sql(
      `INSERT INTO gallery (${cols(usable)}) VALUES (${usable.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id, ${cols(COLS)}, created_at`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const usable = COLS.filter((f) => data?.[f] !== undefined);
    if (!usable.length) return res.status(400).json({ error: "No fields provided" });
    const sets = usable.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const values = [...usable.map((f) => data[f]), id];
    const rows = await sql(
      `UPDATE gallery SET ${sets} WHERE id = $${values.length} RETURNING id, ${cols(COLS)}, created_at`,
      values
    );
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM gallery WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}

/* ---------- Leads (read / triage / delete only - created by the public contact form) ---------- */
async function handleLeads(sql, action, id, data, res) {
  if (action === "list") {
    const rows = await sql(`SELECT id, name, email, company, message, status, created_at FROM leads ORDER BY created_at DESC LIMIT 300`);
    return res.status(200).json({ items: rows });
  }

  if (action === "update") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    const status = data?.status || "new";
    const rows = await sql(`UPDATE leads SET status = $1 WHERE id = $2 RETURNING id, status`, [status, id]);
    return res.status(200).json({ item: rows[0] });
  }

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "Missing id" });
    await sql(`DELETE FROM leads WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
