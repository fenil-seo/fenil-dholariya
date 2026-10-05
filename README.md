# Fenil Dholariya - Portfolio

A fast, dark, animated portfolio site for an AI + SEO growth strategist. Static HTML/CSS/vanilla JS on the front end, with an optional Neon Postgres backend and a password-protected admin dashboard for editing every piece of content without touching code.

The site works fully out of the box with zero configuration - it serves built-in seed content until you connect a database.

## Stack

- **Front end:** plain HTML/CSS/JS, no framework, no build step
- **Back end:** Vercel serverless functions (`/api`) backed by Neon Postgres (`@neondatabase/serverless`)
- **Auth:** signed HTTP-only cookie (HMAC-SHA256), no third-party auth provider
- **Hosting:** Vercel

## Project structure

```
index.html, services.html, work.html,         public pages (multi-page site, not a single-page scroller)
gallery.html, about.html, blog.html,
post.html, contact.html
admin.html                                    admin dashboard (password-protected)
404.html                                       custom not-found page
css/style.css                                 public design system
css/admin.css                                 admin-only styles
js/data.js                                    static seed content used by the public pages on first paint
js/render.js                                   hydrates pages from /api/content once it responds
js/schema.js                                   builds & injects schema.org JSON-LD (SEO/AEO/AIO/GEO) per page
js/main.js                                     animations, nav, counters, contact form
js/api.js                                     fetch wrapper for all API calls
js/admin.js                                    admin dashboard logic (login, tabs, CRUD)
api/                                           serverless functions: content, posts, leads, auth, admin, seed
lib/                                           shared server helpers (db, auth, seed-data) - not routable endpoints
db/schema.sql                                  reference copy of the table definitions (also embedded in api/seed.js)
llms.txt                                       plain-text site summary for AI agents / answer engines
```

## Run it locally

No database needed to get started:

```bash
npm install
npx vercel dev
```

Open the local URL printed by Vercel. The site renders from seed content until the database is connected. The admin panel is at `/admin` and uses `ADMIN_PASSWORD` from the environment.

> `vercel dev` requires the Vercel CLI, which `npm install` pulls in as needed the first time you run it. If you'd rather not install the CLI, any static file server works for browsing the public pages - you just won't get the `/api/*` routes (the site falls back to seed content automatically).

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
3. Restart `npx vercel dev`, log into `/admin`, and click **Initialize database** in the yellow banner. This creates all tables and loads the same seed content into Postgres so you start from a populated, editable site instead of an empty one.
4. From here, every edit in `/admin` writes to Postgres and is what the public site serves.

If `DATABASE_URL` is unset, the site uses seed content. If a configured database is unavailable, database-driven content routes return a temporary error so deleted or unpublished content cannot reappear from the seed catalogue.

## Admin panel

Go to `/admin` and log in with the password configured in the `ADMIN_PASSWORD` environment variable. From the dashboard you can edit:

- Profile (name, bio, contact links)
- Stats and Process steps
- Projects (case studies) with custom slugs, metrics, cover images and structured content
- Blog posts with custom slugs, SEO fields and draft/publish state
- Testimonials, Skills, Timeline
- Leads - everyone who submits the contact form, with status triage

The **Home page** editor covers every main section, its copy, links, images and the method video. The **Services page** editor covers 22 sections: the hero and photo, navigation, goal recommendations, all eight service cards, situation finder, delivery journey, engagement models and FAQs. The **Footer** editor controls the footer shared by all public pages. Media fields accept a deployed `/assets/` path or a hosted HTTPS URL; binary uploads are not stored by this project.

The **Work page** editor covers nine sections: the hero, its three images, collection labels, project reasoning and evidence links. **Manage case studies** opens the section-based Case Studies workspace. Search and select a case study, then edit its overview, Work card, images/video, metrics, challenge, approach, results, takeaway/testimonial, extra content, page labels/links and closing reflection. Card metrics and sequence come from the project's headline metrics and order. Cover changes override the built-in image on both the Work card and the case study page. New settings are added automatically without replacing existing content.

Each case study has its own **SEO** tab with title, description, keywords, canonical URL, robots, Open Graph fields and additional JSON-LD. **Preview** renders the actual page with unsaved changes, including a newly created case study, without writing content. **Save changes** publishes the selected case study. Unsaved edits survive switching between projects and dashboard tabs during the session, and the browser warns before leaving with changes. Returning to Work preserves its unsaved page draft and refreshes its preview after case study changes.

Home, Services and Work SEO include title, description, keywords, canonical URL, page robots, Open Graph fields and custom JSON-LD. Sitewide `robots.txt` is managed in Home SEO. Page robots settings also control the response header and sitemap inclusion; Work's indexing directive applies to the collection page, with individual case study URLs remaining independent. `robots.txt` controls crawler access and can prevent crawlers from seeing a page's meta robots tag. Saved content and metadata are rendered into the HTML response, and saved goal recommendations remain active when visitors switch goals.

Use the section list to edit one part of the page at a time. **Preview** shows unsaved content at desktop or mobile size. **Save changes** or **Ctrl+S** saves the current draft; **Discard changes** returns to the last saved version. The **SEO** tabs include live search and social previews, JSON validation and schema starter templates. **Choose image/video** opens a searchable library generated from `assets/` during the build. Add new files to the repository and deploy, or use a hosted HTTPS URL. Direct editor links include `/admin#projects/content`, `/admin#projects/seo`, `/admin#work/content`, `/admin#work/seo`, `/admin#services/content` and `/admin#services/seo`.

## Structured data (SEO / AEO / AIO / GEO)

Every page ships schema.org JSON-LD out of the box, both as static markup in the HTML (for crawlers that don't execute JavaScript, e.g. most AI bots) and refreshed live by `js/schema.js` once content hydrates from the database:

- **Home** - `Person` (with reviews), `WebSite`, and a `Service`/`OfferCatalog` node.
- **Work** - `CollectionPage`/`ItemList` of `CreativeWork` case studies, plus a `BreadcrumbList`.
- **Blog** - `Blog` with a `blogPost[]` summary of every article, plus a `BreadcrumbList`.
- **Post** - a full `BlogPosting` (with `speakable` for voice/AEO) and a 3-level `BreadcrumbList`.

On top of the built-in markup, you can attach your **own** custom JSON-LD - a `Review`, `FAQPage`, `HowTo`, `Product`, anything schema.org defines - to:

- **Profile** (shows on the home page, alongside the Person/WebSite/Service markup)
- **Each project** (shows on /work)
- **Each blog post** (shows on its /post/&lt;slug&gt; page, alongside the BlogPosting markup)

Just paste JSON into the "Custom schema markup (JSON-LD)" field on that resource in `/admin` - it's validated as JSON before saving and stored as-is. Leave it blank to skip. (The "Technical SEO Audit" seed post ships with a `HowTo` example so you can see the field in action.)

`/llms.txt` at the site root gives AI agents and answer engines a plain-text summary of the site, separate from the JSON-LD.

## Deploying to Vercel

1. Push this folder to a GitHub repo and import it in Vercel ("Add New Project").
2. In the project's **Settings → Environment Variables**, add `DATABASE_URL` (if using Neon), `ADMIN_PASSWORD`, and `AUTH_SECRET`. Without `DATABASE_URL` the site still deploys and works, just on seed content.
3. Deploy. Then visit `https://your-domain/admin`, log in, and click **Initialize database** once (only needed if you added `DATABASE_URL`).
4. Update the canonical/OG URLs in every public HTML page, `robots.txt`, `llms.txt`, and `SITE_URL` in `api/content.js` and `js/schema.js` if you're using a custom domain instead of the default `*.vercel.app` one.

## Notes

- `assets/logo.png`, `assets/fenil.jpg`, `assets/favicon.png` and `assets/og.png` are the real brand assets - replace them directly any time the logo or headshot changes.
- The admin password is read server-side only (`process.env.ADMIN_PASSWORD`) - it's never present in any file shipped to the browser.
