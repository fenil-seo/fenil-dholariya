# Fenil Dholariya — Portfolio

A fast, dark, animated portfolio site for an AI + SEO growth strategist. Static HTML/CSS/vanilla JS on the front end, with an optional Neon Postgres backend and a password-protected admin dashboard for editing every piece of content without touching code.

The site works fully out of the box with zero configuration — it serves built-in seed content until you connect a database.

## Stack

- **Front end:** plain HTML/CSS/JS, no framework, no build step
- **Back end:** Vercel serverless functions (`/api`) backed by Neon Postgres (`@neondatabase/serverless`)
- **Auth:** signed HTTP-only cookie (HMAC-SHA256), no third-party auth provider
- **Hosting:** Vercel

## Project structure

```
index.html, work.html, blog.html, post.html   public pages
admin.html                                    admin dashboard (password-protected)
css/style.css                                 public design system
css/admin.css                                 admin-only styles
js/data.js                                    static seed content used by the public pages on first paint
js/render.js                                   hydrates pages from /api/content once it responds
js/schema.js                                   builds & injects schema.org JSON-LD (SEO/AEO/AIO/GEO) per page
js/main.js                                     animations, nav, counters, contact form
js/api.js                                     fetch wrapper for all API calls
js/admin.js                                    admin dashboard logic (login, tabs, CRUD)
api/                                           serverless functions: content, posts, leads, auth, admin, seed
lib/                                           shared server helpers (db, auth, seed-data) — not routable endpoints
db/schema.sql                                  reference copy of the table definitions (also embedded in api/seed.js)
llms.txt                                       plain-text site summary for AI agents / answer engines
```

## Run it locally

No database needed to get started:

```bash
npm install
npm run dev
```

This starts `vercel dev`. Open `http://localhost:3000` — the site renders from the seed content in `js/data.js` / `lib/seed-data.js`. The admin panel is at `http://localhost:3000/admin`, password `Fenil@007` (see below to change it).

> `vercel dev` requires the Vercel CLI, which `npm install` pulls in as needed the first time you run it. If you'd rather not install the CLI, any static file server works for browsing the public pages — you just won't get the `/api/*` routes (the site falls back to seed content automatically).

## Connecting Neon Postgres (optional, for persistent content + blog)

1. Create a free project at [neon.tech](https://neon.tech) and copy the **pooled** connection string.
2. Create a `.env` file (copy `.env.example`) and set:
   ```
   DATABASE_URL=postgresql://...neon.tech/dbname?sslmode=require
   ADMIN_PASSWORD=Fenil@007
   AUTH_SECRET=<a long random string>
   ```
   Generate a secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Restart `npm run dev`, log into `/admin`, and click **Initialize database** in the yellow banner. This creates all tables and loads the same seed content into Postgres so you start from a populated, editable site instead of an empty one.
4. From here, every edit in `/admin` writes to Postgres and is what the public site serves.

If `DATABASE_URL` is ever unset or unreachable, the public site silently falls back to the seed content — it never shows an error to visitors.

## Admin panel

Go to `/admin` and log in with `ADMIN_PASSWORD` (default `Fenil@007`, override it via the environment variable — never edit it in the code). From the dashboard you can edit:

- Profile (name, bio, contact links)
- Stats, Services, Process steps
- Projects (case studies) and Blog posts — both support custom slugs, JSON metrics, and draft/publish state
- Testimonials, Skills, Timeline
- Leads — everyone who submits the contact form, with status triage

## Structured data (SEO / AEO / AIO / GEO)

Every page ships schema.org JSON-LD out of the box, both as static markup in the HTML (for crawlers that don't execute JavaScript, e.g. most AI bots) and refreshed live by `js/schema.js` once content hydrates from the database:

- **Home** — `Person` (with reviews), `WebSite`, and a `Service`/`OfferCatalog` node.
- **Work** — `CollectionPage`/`ItemList` of `CreativeWork` case studies, plus a `BreadcrumbList`.
- **Blog** — `Blog` with a `blogPost[]` summary of every article, plus a `BreadcrumbList`.
- **Post** — a full `BlogPosting` (with `speakable` for voice/AEO) and a 3-level `BreadcrumbList`.

On top of the built-in markup, you can attach your **own** custom JSON-LD — a `Review`, `FAQPage`, `HowTo`, `Product`, anything schema.org defines — to:

- **Profile** (shows on the home page, alongside the Person/WebSite/Service markup)
- **Each project** (shows on /work)
- **Each blog post** (shows on its /post/&lt;slug&gt; page, alongside the BlogPosting markup)

Just paste JSON into the "Custom schema markup (JSON-LD)" field on that resource in `/admin` — it's validated as JSON before saving and stored as-is. Leave it blank to skip. (The "Technical SEO Audit" seed post ships with a `HowTo` example so you can see the field in action.)

`/llms.txt` at the site root gives AI agents and answer engines a plain-text summary of the site, separate from the JSON-LD.

## Deploying to Vercel

1. Push this folder to a GitHub repo and import it in Vercel ("Add New Project").
2. In the project's **Settings → Environment Variables**, add `DATABASE_URL` (if using Neon), `ADMIN_PASSWORD`, and `AUTH_SECRET`. Without `DATABASE_URL` the site still deploys and works, just on seed content.
3. Deploy. Then visit `https://your-domain/admin`, log in, and click **Initialize database** once (only needed if you added `DATABASE_URL`).
4. Update the canonical/OG URLs in `index.html`, `work.html`, `blog.html`, `post.html`, `robots.txt`, and `SITE_URL` in `api/content.js` if you're using a custom domain instead of the default `*.vercel.app` one.

## Notes

- `assets/logo.png`, `assets/fenil.jpg`, `assets/favicon.png` and `assets/og.png` are the real brand assets — replace them directly any time the logo or headshot changes.
- The admin password is read server-side only (`process.env.ADMIN_PASSWORD`) — it's never present in any file shipped to the browser.
