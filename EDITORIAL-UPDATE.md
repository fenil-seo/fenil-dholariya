# September 2026 editorial update

The existing Vercel project is `fenil4/fenil-dholariya`. Its Git integration uses
`fenil-seo/fenil-dholariya`, production branch `main`. No new project or database
is needed.

## Changes

- Resolve CMS image paths from the site root, including spaces and Windows
  separators. Prefer the CMS featured image over a default illustration.
- Replace the blog index with a featured article, search and categories derived
  from published posts. Preserve active search when live content arrives.
- Add article contents, a readable text column, working featured images and a
  copy-link action. Related articles follow the live published catalogue.
- Preserve all 44 gallery captures, add category filtering and counts, show
  reports without cropping, and keep keyboard navigation within the selected
  category.
- Replace the public site's footers with a shared invitation, service links,
  navigation, contact channels and location.
- Rewrite the requested SEO article while preserving its original URL and
  publication date. Separate paid search from interruption-based placements,
  remove permanent-ranking and guaranteed-citation claims, and link Google's
  primary documentation where relevant.

## Content update and future editing

`lib/content-revisions.js` contains the revised article. The existing server
migration calls a parameterized update limited to its exact slug and the MD5 of
the original live body. The first matching request updates that record. Later
requests do not overwrite it, and a subsequent CMS edit will not match the guard.
The same article is included in both client and server fallback data.

A local copy of the original public article is retained in
`.qa-redesign/live-posts-before.json`, excluded from Git and deployment. A code
rollback does not undo this database edit. Restore the original body through the
admin editor if an editorial rollback is required.

## Design references

- [Demand Curve](https://www.demandcurve.com/): prominent next-step invitation and
  clear service navigation.
- [Animalz](https://www.animalz.co/): approachable editorial tone and grouped
  resource links.
- [Ahrefs blog](https://ahrefs.com/blog/): topic discovery and article metadata.

The implementation retains this site's Manrope / Instrument Serif typography,
warm paper background and blue accents. No reference-site assets were copied.

## Article detail layout

The article template follows the image-led opening and centered reading layout
of the supplied [Medallion Fence article](https://medallionfence.com/hot-dip-galvanising-vs-armour-shield-coating-what-actually-protects-steel-fencing-through-canadian-winters-2/).
`css/article.css` is loaded only on `post.html`. Desktop titles sit over the
16:9 featured image; tablet and phone titles move beneath it to keep the image
uncropped and the text readable. The article column is capped at 860px, with a
collapsible contents list, author details, copy-link action and a contact panel.
The existing related articles follow the reader. This template change does not
modify stored article text or publication dates.

## Navigation, spacing and motion follow-up

All public pages now share the dark navigation treatment. `css/layout.css`
sets a 48-80px responsive section spacing scale, aligns hero spacing and the
gallery's sticky filter bar, and keeps the homepage caption clear of its result
card. Instrument Serif and the blue type accents remain unchanged.

`js/motion.js` owns the shared motion preference and loads before the optional
inner-page interactions. Its footer control remembers the visitor's preference
for the session. Reduced-motion and data-saving preferences limit the existing
page transitions. The previously added orbital graphic and perspective movement
were removed following design feedback.

## Verification

- `npm test`: existing portfolio checks plus image path regression coverage,
  CMS image precedence, guarded content update and client/server article parity.
- Browser checks at 1440, 768, 390 and 320 pixels: filters, empty results, search
  reset, gallery expansion, previous/next controls, keyboard and focus return,
  table of contents, copy link, mobile menu and horizontal overflow.
- All four published articles checked at their nested URLs for loaded featured
  images; forced image failure checked for a designed fallback.
- Vercel preview build and server APIs checked with the actual database.

Local UI testing uses saved public API responses with the revised article. It
does not need production database credentials. `.env.local` is still not a usable
local database connection; production credentials remain managed in Vercel.
