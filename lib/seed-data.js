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
      desc: "Deep crawl, Core Web Vitals, indexation and architecture fixes that remove the brakes on your rankings.",
    },
    {
      icon: "content",
      title: "Content That Converts",
      desc: "Search-led content and copy engineered for humans and algorithms - built around buyer intent, not keyword stuffing.",
    },
    {
      icon: "local",
      title: "Local SEO & Google Business",
      desc: "Map-pack visibility, GBP optimization and review systems that turn nearby searches into phone calls and walk-ins.",
    },
    {
      icon: "funnel",
      title: "Lead Gen & Funnel Optimization",
      desc: "From first click to closed deal - landing pages, tracking and funnels tuned to lift qualified leads, not just traffic.",
    },
    {
      icon: "ai",
      title: "AI & Prompt Engineering",
      desc: "Custom AI workflows that scale research, briefs and production without sacrificing quality or brand voice.",
    },
    {
      icon: "research",
      title: "Market & Competitive Intel",
      desc: "Know exactly where the demand and the gaps are, so every campaign targets high-impact opportunities first.",
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
      title: "D2C Silver Jewellery - Organic Growth Engine",
      category: "D2C / E-commerce",
      client: "Silver jewellery brand",
      desc: "Rebuilt product-page architecture and search-led content to turn organic search into a primary sales channel for a direct-to-consumer silver brand.",
      viz: "network",
      accent: "violet",
      metrics: [
        { value: "2.1x", label: "Organic sales" },
        { value: "+64%", label: "PDP visibility" },
        { value: "40+", label: "Keywords on pg.1" },
      ],
      featured: true,
    },
    {
      slug: "local-construction-gmb",
      title: "Construction & Fencing - Local Lead Machine",
      category: "Local SEO",
      client: "Local contractor",
      desc: "Optimized the Google Business Profile, built a review engine and local landing pages to scale qualified, ready-to-buy leads.",
      viz: "bars",
      accent: "cyan",
      metrics: [
        { value: "3x", label: "Qualified leads" },
        { value: "+120%", label: "Calls from search" },
        { value: "Top 3", label: "Map-pack rank" },
      ],
      featured: true,
    },
    {
      slug: "b2b-saas-pipeline",
      title: "B2B SaaS - Content-Led Pipeline",
      category: "SaaS / B2B",
      client: "SaaS company",
      desc: "Built an intent-mapped content engine and AI-driven nurture sequences that grew trials and tripled marketing-qualified leads.",
      viz: "orbit",
      accent: "violet",
      metrics: [
        { value: "3x", label: "MQLs" },
        { value: "+58%", label: "Trial signups" },
        { value: "-22%", label: "Cost per lead" },
      ],
      featured: true,
    },
    {
      slug: "ayurvedic-technical-seo",
      title: "Ayurvedic D2C - Technical SEO Turnaround",
      category: "Technical SEO",
      client: "Ayurvedic brand",
      desc: "Resolved crawl, indexation and Core Web Vitals issues that were capping growth, unlocking a steady organic traffic climb.",
      viz: "wave",
      accent: "cyan",
      metrics: [
        { value: "-85%", label: "Crawl errors" },
        { value: "+60%", label: "Organic traffic" },
        { value: "96", label: "Core Web Vitals" },
      ],
      featured: true,
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
  ],

  timeline: [
    { role: "SEO Head", org: "Global Surat", period: "Sep 2025 - Present" },
    { role: "SEO Head", org: "Ark Intelligence", period: "Nov 2024 - Aug 2025" },
    { role: "SEO Executive", org: "Dexoc Solutions", period: "Jan 2024 - Oct 2024" },
    { role: "Freelance Content Writer", org: "Independent", period: "2022 - 2023" },
  ],
};
