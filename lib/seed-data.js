/* =================================================================
   SERVER-SIDE SEED DATA - mirrors js/data.js.
   Used by API routes as a fail-soft fallback (DB unset/unreachable)
   and by /api/seed.js to populate Neon Postgres on first run.
   ================================================================= */
export const SEED = {
  profile: {
    name: "Fenil Dholariya",
    role: "AI + SEO Growth Strategist",
    tagline: "Practical AI + SEO to grow traffic, leads & revenue.",
    intro:
      "I help D2C brands, local businesses and B2B teams turn organic search into a predictable revenue channel - blending technical SEO, content strategy and AI workflows.",
    location: "Surat, Gujarat, India",
    email: "fenil.seo@gmail.com",
    phone: "+91 63546 46935",
    whatsapp: "916354646935",
    available: true,
    availableText: "Available for new projects",
    socials: {
      instagram: "https://instagram.com/fenil_dholariya",
      linkedin: "https://www.linkedin.com/in/fenil-dholariya",
      whatsapp: "https://wa.me/916354646935",
      email: "mailto:fenil.seo@gmail.com",
    },
  },

  stats: [
    { value: 60, suffix: "%", label: "Avg. organic traffic lift", trend: "across client accounts" },
    { value: 40, suffix: "+", label: "Keywords moved to page 1", trend: "high-intent terms" },
    { value: 3, suffix: "x", label: "More marketing-qualified leads", trend: "for SaaS clients" },
    { value: 85, suffix: "%", label: "Fewer technical SEO errors", trend: "post-audit" },
  ],

  services: [
    {
      icon: "audit",
      title: "SEO & Technical Audits",
      desc: "Deep crawl, Core Web Vitals, indexation and architecture fixes that remove the invisible ceiling on your rankings — and keep it gone.",
    },
    {
      icon: "content",
      title: "Content That Converts",
      desc: "Search-led content built around genuine buyer intent. Pages that earn the click, answer the question and move readers toward a decision.",
    },
    {
      icon: "local",
      title: "Local SEO & Google Business",
      desc: "Map-pack dominance, GBP optimization and a review velocity system that turns nearby searches into phone calls, walk-ins and booked jobs.",
    },
    {
      icon: "funnel",
      title: "Lead Gen & Funnel Optimization",
      desc: "From first click to closed deal — landing pages, tracking and funnels aligned to the way real buyers make decisions, not just traffic volume.",
    },
    {
      icon: "ai",
      title: "AI & Prompt Engineering",
      desc: "Custom AI workflows that 3x content output without sacrificing quality, brand voice or accuracy. Scale the work — not the headcount.",
    },
    {
      icon: "research",
      title: "Market & Competitive Intel",
      desc: "Know exactly where demand sits and where competitors are vulnerable before a single piece of content is commissioned or a single rupee spent.",
    },
    {
      icon: "sem",
      title: "Search Engine Marketing (SEM)",
      desc: "Precision Google Ads campaigns engineered for return, not just reach. Smart bidding, intent-matched ad copy and landing pages that convert — every ad dollar made accountable.",
    },
    {
      icon: "web",
      title: "Performance Web Development",
      desc: "Fast, clean, SEO-ready websites that score 90+ on PageSpeed, pass Core Web Vitals and are built to rank from day one — no technical debt, no bloat.",
    },
  ],

  process: [
    {
      step: "01",
      title: "Discovery & Prioritization",
      desc: "I map demand, audit your site and rank opportunities by impact-vs-effort - so we start where the revenue is.",
    },
    {
      step: "02",
      title: "Execution & Automation",
      desc: "Controlled experiments, technical fixes and AI-assisted content production, shipped fast and measured cleanly.",
    },
    {
      step: "03",
      title: "Continuous Optimization",
      desc: "Winners get scaled, losers get cut. Transparent reporting ties every move back to traffic, leads and revenue.",
    },
  ],

  projects: [
    {
      slug: "d2c-silver-jewellery",
      title: "D2C Silver Jewellery — Organic Growth Engine",
      category: "D2C / E-commerce",
      client: "Direct-to-consumer silver jewellery brand",
      desc: "Rebuilt product-page architecture and search-led content to turn organic search into a primary sales channel — doubling revenue without a single extra rupee in ad spend.",
      viz: "network",
      accent: "violet",
      metrics: [
        { value: "2.1x", label: "Organic revenue" },
        { value: "+64%", label: "Product page visibility" },
        { value: "40+", label: "Keywords on page 1" },
      ],
      featured: true,
      period: "6-month engagement",
      services: "SEO, Content Strategy, Schema Markup, CRO",
      challenge: `<p>A direct-to-consumer silver jewellery brand was running paid ads just to keep the lights on. Their product pages were thin, structurally broken and invisible in organic search for the high-intent queries that drive purchases. Despite a strong product range, organic was contributing almost nothing to revenue.</p>

<h3>The Audit Findings</h3>
<p>A full technical and content audit surfaced four core problems blocking organic growth:</p>
<ul>
<li><strong>Duplicate title tags across PDPs</strong> — Google couldn't distinguish between product pages</li>
<li><strong>Flat, intent-agnostic URL structure</strong> — no topical clusters, no hierarchy</li>
<li><strong>Thin product descriptions</strong> — less than 80 words per page, no schema, no entities</li>
<li><strong>Zero internal linking strategy</strong> — authority wasn't being concentrated anywhere useful</li>
</ul>`,
      approach: `<h3>Product page architecture rebuild</h3>
<p>We restructured URLs around buyer intent clusters — material + style + occasion (e.g., <em>/silver-rings/statement/925-sterling</em>). Parent category pages were built to capture head-term traffic and funnel it to specific product pages. Each tier had a clear job in the conversion path.</p>

<h3>Content depth and entity coverage</h3>
<p>Each product description was rewritten using search-informed briefs: material purity, craftsmanship notes, care instructions, styling advice and social proof signals. Not keyword stuffing — content that genuinely helps buyers decide and gives search engines the entity context they need.</p>

<h3>Schema markup implementation</h3>
<p>Product, BreadcrumbList and Review schema was implemented across all PDPs. Rich result eligibility increased within six weeks, improving click-through rate from search results without any ranking change.</p>

<h3>Internal link architecture</h3>
<p>A hub-and-spoke structure was built connecting collection pages to individual PDPs with descriptive anchor text. Authority that was previously diffused across hundreds of undifferentiated pages was now concentrated where it could convert.</p>`,
      results_text: `<ul>
<li>Organic revenue <strong>doubled (2.1x)</strong> with zero increase in ad spend</li>
<li>Product page impressions in Google Search Console <strong>+64%</strong></li>
<li><strong>40+ high-intent keywords</strong> — including category-level terms — moved to page 1</li>
<li>Organic search became the brand's primary acquisition channel for the first time</li>
</ul>`,
      takeaway: "For D2C brands, the highest-ROI SEO move is almost always the least glamorous one: fixing the structural foundation. A clean product page architecture combined with genuinely useful content consistently outperforms any volume-first content strategy built on a broken base.",
      body: "",
    },
    {
      slug: "local-construction-gmb",
      title: "Construction & Fencing — Local Lead Machine",
      category: "Local SEO",
      client: "Local construction & fencing contractor",
      desc: "Optimized the Google Business Profile, built a review velocity system and created local landing pages — tripling qualified inbound calls in 90 days.",
      viz: "bars",
      accent: "cyan",
      metrics: [
        { value: "3x", label: "Qualified inbound calls" },
        { value: "+120%", label: "Calls from search" },
        { value: "Top 3", label: "Map-pack position" },
      ],
      featured: true,
      period: "90-day sprint",
      services: "Local SEO, Google Business Profile, Review Systems, Local Landing Pages",
      challenge: `<p>A local construction and fencing contractor had a strong reputation in their area — but was nearly invisible in local search. Competitors with weaker services consistently ranked above them in the Google Map Pack, capturing the calls that should have been theirs. Their Google Business Profile was incomplete, they had fewer than 10 reviews, and their website had no location-specific pages.</p>`,
      approach: `<p>Local SEO is a compounding game — every improvement feeds the next. We ran a structured four-phase sprint over 90 days, targeting the three pillars Google uses for local ranking: relevance, prominence and proximity.</p>

<h3>Phase 1 — Google Business Profile overhaul</h3>
<p>We rebuilt the GBP from scratch: corrected primary and secondary business categories (General Contractor + Fence Contractor), added a comprehensive service list with descriptions, uploaded professional project photos on a weekly schedule, activated messaging, and set up a Q&amp;A response system. An active, complete profile consistently outranks a neglected one — regardless of the business's actual quality.</p>

<h3>Phase 2 — Review velocity system</h3>
<p>We built a simple post-job review workflow: a personalised SMS sent 48 hours after project completion with a direct link to the GBP review form. In 90 days, review count grew from 8 to 60+. Volume, recency and response rate all improved in parallel — exactly the signals Google weights most heavily in local ranking.</p>

<h3>Phase 3 — Local landing pages</h3>
<p>Individual service-area pages were created for each service and location combination — unique content, real project photos, accurate and consistent NAP data, and service-specific FAQs. These pages supported the GBP listing's authority signals while capturing long-tail local traffic the GBP alone couldn't reach.</p>

<h3>Phase 4 — Citation clean-up</h3>
<p>NAP inconsistencies across 40+ local directories were audited and corrected. Inconsistent name, address and phone data is a silent local ranking killer most businesses never diagnose.</p>`,
      results_text: `<ul>
<li>Qualified inbound calls from Google <strong>tripled (3x)</strong></li>
<li>Calls directly attributed to search <strong>+120%</strong></li>
<li>Moved from outside the Map Pack to a <strong>consistent Top 3 position</strong> for core service + location searches</li>
</ul>`,
      takeaway: "For service businesses, three Map Pack slots decide who gets the call. You can't control proximity — but relevance (a complete, correctly categorised GBP) and prominence (review velocity + citation consistency) are entirely within your control. Nail those two, and the leads follow.",
      body: "",
    },
    {
      slug: "b2b-saas-pipeline",
      title: "B2B SaaS — Content-Led Pipeline",
      category: "SaaS / B2B",
      client: "B2B SaaS company",
      desc: "Built an intent-mapped content engine and AI-driven nurture sequences that tripled marketing-qualified leads and reduced paid acquisition dependence.",
      viz: "orbit",
      accent: "violet",
      metrics: [
        { value: "3x", label: "Marketing-qualified leads" },
        { value: "+58%", label: "Trial signups" },
        { value: "-22%", label: "Cost per lead" },
      ],
      featured: true,
      period: "6-month engagement",
      services: "SEO, Content Strategy, AI Workflows, Email Nurture",
      challenge: `<p>A B2B SaaS company had a capable product and a reasonable marketing budget — but a broken organic acquisition model. Their blog produced content on trending topics with no search intent alignment, their trial signup funnel leaked at every stage, and customer acquisition cost from paid channels was climbing quarter over quarter. They needed a scalable, compounding alternative to paid spend.</p>

<h3>The Diagnosis</h3>
<p>The root cause was a misalignment between content topics and buyer stages. The blog was producing awareness-level content for visitors who were already solution-aware. The pages that should have driven trial signups — feature comparisons, use-case guides, integration deep-dives — either didn't exist or ranked for nothing. Traffic existed; intent-matched traffic didn't.</p>`,
      approach: `<h3>Stage 1 — Intent mapping</h3>
<p>Every keyword cluster was mapped to a buyer stage: <em>unaware</em> (industry pain-point content), <em>problem-aware</em> (comparison content, use-case guides), <em>solution-aware</em> (feature deep-dives, alternatives, integrations) and <em>purchase-ready</em> (pricing, ROI calculators, case studies). Every content brief was tied to a stage and a measurable downstream outcome — not just a search volume number.</p>

<h3>Stage 2 — AI-assisted content production</h3>
<p>We built an AI-accelerated production workflow: keyword research → intent brief → AI draft → expert editing → internal accuracy review → publish. The system let the marketing team publish technically accurate, high-quality content at 3× their previous velocity — without the output reading like it was generated by a machine.</p>

<h3>Stage 3 — Conversion layer retrofit</h3>
<p>Every existing page was retrofitted with contextually relevant CTAs matched to the reader's stage. Awareness content got low-friction offers (a relevant checklist or framework). Comparison content got free trial CTAs with clear differentiators. The generic "Start Free Trial" button that appeared everywhere was replaced with intent-specific offers — and blog-to-trial conversion rate lifted immediately.</p>

<h3>Stage 4 — Intent-triggered nurture sequences</h3>
<p>We built email nurture sequences aligned to content clusters. Visitors who read comparison content received competitor-focused nurture. Those reading integration guides received feature-depth sequences. Personalised nurture compressed time-to-trial and reduced the number of touchpoints required to convert.</p>`,
      results_text: `<ul>
<li>Marketing-qualified leads from organic <strong>tripled (3x)</strong></li>
<li>Trial signups from content channels <strong>+58%</strong></li>
<li>Cost per lead from organic channels <strong>fell 22%</strong> as paid dependence reduced</li>
<li>Organic search overtook paid as the leading MQL source in month 5</li>
</ul>`,
      takeaway: "SaaS content that doesn't align to buyer intent is expensive noise. Map every piece to a stage, match the conversion offer to that stage, and build nurture sequences that continue the conversation. The compounding effect of a well-mapped content engine typically takes 3–4 months to appear — and then it accelerates faster than any paid channel can match.",
      body: "",
    },
    {
      slug: "ayurvedic-technical-seo",
      title: "Ayurvedic D2C — Technical SEO Turnaround",
      category: "Technical SEO",
      client: "Ayurvedic D2C brand",
      desc: "Resolved crawl waste, Core Web Vitals failures and duplicate content issues that were silently capping growth — unlocking a 60% organic traffic lift in 90 days.",
      viz: "wave",
      accent: "cyan",
      metrics: [
        { value: "-85%", label: "Technical errors eliminated" },
        { value: "+60%", label: "Organic traffic in 90 days" },
        { value: "96", label: "PageSpeed score" },
      ],
      featured: true,
      period: "90-day sprint",
      services: "Technical SEO, Core Web Vitals, Site Architecture",
      challenge: `<p>An Ayurvedic D2C brand was producing solid content and building out their product range — but organic traffic had plateaued for 18 months. Rankings wouldn't move despite consistent publishing. A working hypothesis emerged: something at the technical level was acting as a ceiling, preventing Google from properly crawling, evaluating and ranking the content that already existed.</p>

<h3>The Audit Findings</h3>
<p>A deep technical crawl confirmed the hypothesis. The site had accumulated significant technical debt across four problem areas:</p>
<ul>
<li><strong>Crawl budget waste</strong> — 40% of crawl budget was being consumed by paginated URLs, session-parameter variants and faceted navigation URLs that should never have been indexed. Google was spending its allowance on pages that couldn't rank instead of the ones that could.</li>
<li><strong>Core Web Vitals failures</strong> — LCP of 4.8s on mobile (threshold: 2.5s), driven by unoptimised hero images and render-blocking third-party scripts loaded synchronously in the document head.</li>
<li><strong>Duplicate content at scale</strong> — Product variant URLs (size, pack quantity) were generating hundreds of near-identical pages, splitting link authority across thin duplicates instead of concentrating it on the canonical PDP.</li>
<li><strong>Broken internal link graph</strong> — 200+ internal links pointing to 404 pages, leaking page authority into dead ends throughout the site architecture.</li>
</ul>`,
      approach: `<h3>Month 1 — Crawlability and indexation</h3>
<p>We restructured robots.txt directives and meta robots tags to block parameter variants and faceted navigation URLs from crawling. The XML sitemap was rebuilt to include only canonical, indexable pages. All 200+ broken internal links were identified and corrected. Within 30 days, crawl error volume dropped by 85% — confirmed in Google Search Console's Coverage report.</p>

<h3>Month 2 — Core Web Vitals</h3>
<p>The entire image pipeline was rebuilt: all hero and product images converted to WebP/AVIF, lazy loading enabled for below-fold media, and the LCP image preloaded with a <code>&lt;link rel="preload"&gt;</code> tag. Render-blocking third-party scripts were audited and non-critical tags deferred via GTM. LCP improved from 4.8s to 1.6s on mobile. CLS was eliminated by adding explicit <code>width</code> and <code>height</code> attributes to all media elements.</p>

<h3>Month 3 — Consolidation and architecture</h3>
<p>Product variant URLs were canonicalized to their primary PDPs. Thin category and ingredient pages were either consolidated or refreshed with substantive, intent-aligned content. An internal link audit redistributed anchor-text-rich links toward the pages with the highest conversion potential.</p>`,
      results_text: `<ul>
<li>Technical SEO errors <strong>reduced by 85%</strong></li>
<li>Organic traffic <strong>+60%</strong> in 90 days — rankings moved once crawlers could properly access and evaluate existing content</li>
<li>PageSpeed Insights score reached <strong>96/100</strong> across key pages</li>
<li>Content published before the engagement began started ranking — no new content required</li>
</ul>`,
      takeaway: "Technical debt is a silent ranking ceiling. You can publish excellent content for months and see no movement if crawlers can't access it efficiently, pages are too slow to rank competitively, or authority is being diluted across hundreds of duplicate URLs. Fix the foundation first — and the content you already have starts working harder immediately.",
      body: "",
    },
  ],

  posts: [
    {
      slug: "ai-seo-workflow-that-moves-rankings",
      title: "The AI + SEO Workflow That Actually Moves Rankings",
      category: "AI & SEO",
      date: "2026-05-28",
      reading_time: 6,
      viz: "network",
      accent: "violet",
      excerpt:
        "AI won't rank your site on its own. Here's the exact human-in-the-loop workflow I use to scale research and content without losing quality.",
      body:
        "<p>Most teams bolt AI onto a broken process and wonder why rankings don't move. AI is an accelerant - it multiplies whatever system it's dropped into. If the system is weak, you just produce mediocre content faster.</p>" +
        "<h2>Start with demand, not prompts</h2>" +
        "<p>Before a single prompt, I map real search demand and intent. AI is brilliant at clustering keywords, summarizing SERP intent and spotting content gaps - but only once you've fed it the right raw data from your own analytics and a proper crawl.</p>" +
        "<h2>Briefs are the leverage point</h2>" +
        "<p>The highest-ROI use of AI in SEO isn't writing - it's briefing. A tight, intent-rich brief that captures entities, questions and angle gives both writers and models a target. Garbage brief, garbage draft.</p>" +
        "<h2>Keep a human in the loop</h2>" +
        "<p>Every AI draft passes through editing for accuracy, brand voice and originality. Search engines reward genuinely helpful content; thin AI spam gets filtered. The workflow scales <em>volume</em>, not corner-cutting.</p>" +
        "<h2>Measure, then automate the winners</h2>" +
        "<p>Ship in controlled batches, watch what ranks and converts, then automate the repeatable parts of the winners. That's how you compound results instead of chasing every shiny tactic.</p>",
    },
    {
      slug: "local-seo-2026-map-pack",
      title: "Local SEO in 2026: Winning the Google Map Pack",
      category: "Local SEO",
      date: "2026-05-12",
      reading_time: 5,
      viz: "bars",
      accent: "cyan",
      excerpt:
        "The map pack is the most valuable real estate for local businesses. Here's what actually moves the needle this year.",
      body:
        "<p>For local businesses, three map-pack slots decide who gets the call. Ranking there is less about tricks and more about relevance, proximity and prominence done consistently.</p>" +
        "<h2>Your Google Business Profile is the homepage</h2>" +
        "<p>Categories, services, photos, posts and Q&amp;A all feed the algorithm. A complete, active profile beats a neglected one almost every time.</p>" +
        "<h2>Reviews are a ranking and conversion lever</h2>" +
        "<p>Volume, velocity, recency and keywords inside reviews all matter. Build a simple system that asks every happy customer at the right moment.</p>" +
        "<h2>Local landing pages with real signal</h2>" +
        "<p>City and service pages still work - when they carry unique, genuinely useful content and consistent NAP data, not spun duplicates.</p>",
    },
    {
      slug: "technical-seo-audit-checklist",
      title: "Technical SEO Audit: The 12-Point Checklist I Run First",
      category: "Technical SEO",
      date: "2026-04-22",
      reading_time: 7,
      viz: "orbit",
      accent: "violet",
      excerpt:
        "Before any content plan, I pressure-test the foundation. These twelve checks surface the issues quietly capping your growth.",
      body:
        "<p>Content can't rank if crawlers can't reach it, render it or trust it. Here's the foundation pass I run before anything else.</p>" +
        "<h2>Crawl & indexation</h2>" +
        "<p>I verify what's indexed vs. what should be, hunt down crawl traps, fix broken internal links and clean up the XML sitemap and robots rules.</p>" +
        "<h2>Core Web Vitals & rendering</h2>" +
        "<p>LCP, CLS and INP get measured on real pages. Slow, janky pages lose rankings and conversions - exactly the problem most sites underestimate.</p>" +
        "<h2>Architecture & internal links</h2>" +
        "<p>Flat, logical structures with intentional internal linking pass authority where it counts and help both users and crawlers understand priority.</p>" +
        "<h2>Structured data & duplication</h2>" +
        "<p>Schema, canonicalization and consolidation of thin or duplicate pages round out the pass - turning a leaky site into a clean growth platform.</p>",
      schema_markup: {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Technical SEO Audit: The 12-Point Checklist I Run First",
        description: "The foundation pass I run before any content plan, covering crawl access, Core Web Vitals, architecture and structured data.",
        step: [
          { "@type": "HowToStep", name: "Crawl & indexation", text: "Verify what's indexed vs. what should be, hunt down crawl traps, fix broken internal links and clean up the XML sitemap and robots rules." },
          { "@type": "HowToStep", name: "Core Web Vitals & rendering", text: "Measure LCP, CLS and INP on real pages. Slow, janky pages lose rankings and conversions." },
          { "@type": "HowToStep", name: "Architecture & internal links", text: "Build flat, logical structures with intentional internal linking so authority passes where it counts." },
          { "@type": "HowToStep", name: "Structured data & duplication", text: "Add schema, canonicalize and consolidate thin or duplicate pages to turn a leaky site into a clean growth platform." },
        ],
      },
    },
    {
      slug: "content-that-converts",
      title: "Content That Converts: Writing for Humans and Algorithms",
      category: "Content",
      date: "2026-04-03",
      reading_time: 5,
      viz: "wave",
      accent: "cyan",
      excerpt:
        "Ranking is step one. The real win is content that turns readers into customers. Here's how to write for both at once.",
      body:
        "<p>Traffic that doesn't convert is a vanity metric. Great SEO content earns the click <em>and</em> moves the reader toward a decision.</p>" +
        "<h2>Lead with intent</h2>" +
        "<p>Match the format to what the searcher actually wants - a quick answer, a comparison, a how-to. Give it fast, then go deep.</p>" +
        "<h2>Write the way people decide</h2>" +
        "<p>Address objections, show proof, and make the next step obvious. Persuasion and clarity beat keyword density every time.</p>" +
        "<h2>Build topical authority</h2>" +
        "<p>Cover a topic comprehensively across linked pages. Depth signals expertise to readers and search engines alike.</p>",
    },
  ],

  testimonials: [
    {
      quote:
        "Fenil treats SEO like a growth system, not a checklist. Within months our product pages were pulling in sales we used to pay ads for.",
      name: "Founder",
      role: "D2C Silver Jewellery Brand",
      initials: "DS",
    },
    {
      quote:
        "Our phone genuinely rings more. He fixed the Google profile, built a review process and the qualified leads followed.",
      name: "Owner",
      role: "Construction & Fencing",
      initials: "CF",
    },
    {
      quote:
        "The AI workflows he set up let our small team publish like a big one - without the content reading like a robot wrote it.",
      name: "Head of Marketing",
      role: "B2B SaaS",
      initials: "SA",
    },
  ],

  skills: [
    "Technical SEO", "On-Page SEO", "Content Strategy", "Local SEO", "Google Business Profile",
    "Prompt Engineering", "AI Workflows", "Keyword Research", "Core Web Vitals", "Link Building",
    "Google Analytics 4", "Search Console", "Screaming Frog", "Funnel Optimization", "Copywriting",
    "Google Ads", "SEM / PPC", "HTML / CSS / JS", "Web Performance",
  ],

  timeline: [
    { role: "SEO Head", org: "Global Surat", period: "Sep 2025 - Present" },
    { role: "SEO Head", org: "Ark Intelligence", period: "Nov 2024 - Aug 2025" },
    { role: "SEO Executive", org: "Dexoc Solutions", period: "Jan 2024 - Oct 2024" },
    { role: "Freelance Content Writer", org: "Independent", period: "2022 - 2023" },
    { role: "B.Tech · Information Technology", org: "CHARUSAT University", period: "2020 - 2024" },
  ],
};
