# Search and AI discovery

Target: worldwide clients for Fenil Dholariya's existing SEO and organic-growth services. No city-specific query set was supplied. Being based in Surat and working worldwide are already visible on the site. Do not create fictional city offices or near-duplicate city landing pages.

## Verified problems in the original live responses

- Article HTML contained a loading message and a canonical pointing to `/post`, rather than the article URL. The text and final metadata depended on JavaScript.
- Case-study HTML had a generic heading, no case-study sections and a canonical pointing to `/work`.
- Missing articles returned HTTP 200, which can be treated as soft 404s.
- The journal's published article links and excerpts were rendered in JavaScript.
- Sitemap dates used JavaScript's human-readable date strings, rather than the required date format.
- API fallbacks could republish seed articles after a database deletion or unpublish.

These are technical discovery problems. They do not establish the cause of a particular Brave ranking. A direct Brave name search returned HTTP 429 and a CAPTCHA during this audit. No CAPTCHA was bypassed and no Brave ranking improvement has been claimed.

## Implemented behavior

- The journal, work index, articles and case studies render from the published database catalogue on the server. Readers and crawlers receive the same complete HTML.
- Article responses include the real heading, body, image, author, publication date, table of contents, related links, unique canonical, social metadata and BlogPosting structured data. Case studies use CreativeWork and the correct individual URLs.
- Unpublished or deleted articles return 404. Database outages return 503 with Retry-After instead of fabricated content or a permanent missing-page signal.
- The database is authoritative when configured. Empty published collections stay empty.
- A one-time migration preserves the four case studies that the existing live site was serving from its bundled catalogue when the database's projects table was empty. It records a migration marker even if the table already has content, so later deletions cannot re-create those cases. No existing project rows are overwritten.
- The sitemap contains canonical public URLs. Unknown modification dates are omitted. Real CMS updates set `updated_at`, which is emitted as ISO 8601 in the sitemap and article schema.
- Public pages allow indexing and large image previews. Admin pages are noindex. robots.txt allows public crawling while excluding admin and API routes; crawlers do not need the API to read the pages.
- No-JavaScript styles remove the intro overlay and reveal text. The approved mobile layout, blue Instrument Serif accents and shorter desktop article image remain in place.
- JSON embedded in HTML is escaped. CMS body HTML is sanitized. The maintained sanitizer is bundled for Vercel compatibility.
- IndexNow notifications run after successful production article and case-study publication changes, including old URLs after renaming, unpublishing or deleting. Draft-only edits and previews do not submit URLs. Notification failures do not undo a saved edit.
- `llms.txt` is a supplemental navigation map generated from the published catalogue. It is not a ranking directive or a substitute for HTML, a sitemap, useful content or independent references.

## Search platform distinctions

- **Brave:** its crawler does not advertise a distinct user agent. Brave says it will not crawl a page that Googlebot cannot crawl. There is no invented Brave-specific robots rule or claim that IndexNow submits to Brave. [Brave crawler guidance](https://search.brave.com/help/brave-search-crawler)
- **Google and Gemini search features:** Google's AI search guidance emphasizes standard SEO, useful original material, crawlable text and index eligibility. Google explicitly says it does not use `llms.txt`. Crawlability is not a promise of selection, ranking or citation. [Google guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- **Bing and Copilot:** accessible HTML, canonical URLs, accurate sitemaps and IndexNow support discovery. [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)
- **ChatGPT:** OAI-SearchBot is the search crawler; GPTBot is a separate training control. ChatGPT-User is a user-triggered fetcher. Public pages are allowed by the existing wildcard robots rule. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)
- **Claude:** Claude-SearchBot and Claude-User are distinct from the ClaudeBot training crawler. The public crawl policy allows them. [Anthropic crawler documentation](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- **Meta AI and Grok:** the same accessible, attributable public HTML is available. No special inclusion, model-training outcome or guaranteed citation is claimed. Product-specific answer selection and access may vary.

The website's pre-existing training permissions were not changed. Allowing model training is not a requirement for allowing search retrieval.

## Owner actions and measurement

1. In a verified Google Search Console property for `https://fenil-dholariya.vercel.app/`, submit `/sitemap.xml`. Inspect the home page and main articles, check Google's selected canonical and request indexing after this deployment. Do not repeatedly submit unchanged URLs.
2. In Bing Webmaster Tools, verify or import the same property, submit the sitemap, inspect the main URLs and review IndexNow reports. Account verification cannot be completed by adding a made-up verification token.
3. Keep the same name, role, website URL and service description on real professional profiles. Seek relevant independent coverage through genuine work and original research. Do not buy fabricated mentions or create unsupported claims.
4. Publish useful material tied to actual services: specific technical problems, documented decisions, methods, limitations and attributable evidence. The current broad service page is a foundation; service-specific pages should be created when there is enough distinct content and proof to support them.
5. Record an initial baseline, then compare weekly by country and query: branded impressions/clicks, service-query impressions/clicks, indexed canonical URLs, AI referrals where reported, and qualified contact enquiries. AI referrals and a few sampled prompts are incomplete measures of total AI visibility.
6. For Brave, check the same agreed queries and country consistently in a normal browser. A ranking observation in one location does not establish worldwide visibility. There is no promised indexing deadline.

Search Console and Bing account ownership, indexing coverage and search performance were not available in this repository audit. The code cannot manufacture that access or guarantee worldwide placement.

## Maintenance

- `npm test`: existing portfolio checks plus server HTML, metadata, sanitization, database publication rules, dates, missing responses and IndexNow payload checks. Tests do not write to the production database.
- `npm run build`: creates the server sanitizer bundle used by Vercel. Requires Node 24.
- `npm run search:submit`: after a deployment, verify the public IndexNow key and submit sitemap URLs once. For a small subsequent change, pass the changed canonical paths, for example `npm run search:submit -- /services`.
- IndexNow HTTP 200 means received; 202 means received with key validation pending. Neither proves indexing or ranking. [Protocol documentation](https://www.indexnow.org/documentation)
- Publication notifications are best effort with a five-second timeout. If a notification fails, inspect Vercel logs and submit the affected paths after the service recovers. No persistent queue is claimed.
- Server-rendered content bypasses CDN storage to respect unpublishing immediately. This adds a database read to each page request. At materially higher traffic, introduce cache invalidation on publish before enabling long-lived HTML caching.

## Verification record

Implementation commit: `7c172d0`, deployed through GitHub to `https://fenil-dholariya.vercel.app` on 27 September 2026 UTC.

- `npm test` passed, covering the existing portfolio plus server rendering, metadata, safe body HTML, publication-state handling, missing pages and IndexNow rules.
- `node scripts/audit-search-live.mjs` passed on the live domain: all 15 sitemap URLs returned 200 with matching canonical URLs, one heading, parseable structured data and no indexing prohibition. All eight article/case-study pages contained readable body text and their cover images returned 200.
- Four missing/template routes returned real 404s. Admin returned `X-Robots-Tag: noindex, nofollow`.
- Requests using Googlebot, bingbot, OAI-SearchBot and Claude-SearchBot user-agent strings received complete article content. This checks application behavior, not reachability from the providers' actual crawler IPs or proof that they indexed the pages.
- Local and live Chrome checks passed for the journal, work index, article and case study at 1440px and 390px, with JavaScript enabled and disabled: readable headings/body, image proportions, no horizontal overflow, functional table of contents, article filters and sharing where JavaScript is available. The shorter desktop cover and 16:9 mobile cover were preserved.
- `npm audit --omit=dev` reported zero known production-dependency vulnerabilities. This does not characterize development-tool dependencies.
- A single IndexNow submission of the 15 canonical URLs returned HTTP **202**. The service received the URLs; ownership-key validation is pending. Indexing and ranking are not confirmed.
- Brave returned a CAPTCHA, so its result positions were not verified. Search Console/Bing account verification, indexed-page counts, actual crawler logs and AI citation changes were not available or claimed.
