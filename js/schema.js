/* =================================================================
   STRUCTURED DATA - schema.org JSON-LD builders + injectors.
   Builds Person/WebSite/Service/BreadcrumbList/CollectionPage/
   CreativeWork/Blog/BlogPosting nodes from site content and writes
   them into <script type="application/ld+json"> tags. Reuses the
   same element ids the static HTML baseline ships with, so this
   only refreshes (never duplicates) markup on hydration. Also wires
   in admin-authored custom schema (profile.schema_markup,
   project/post.schema_markup) alongside the generated markup.
   ================================================================= */
window.Schema = (() => {
  "use strict";

  const SITE_URL = "https://fenil-dholariya.vercel.app";

  function prune(obj) {
    Object.keys(obj).forEach((k) => obj[k] === undefined && delete obj[k]);
    return obj;
  }

  function personNode(profile) {
    const p = profile || {};
    const sameAs = [p.socials?.linkedin, p.socials?.instagram].filter(Boolean);
    return prune({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: p.name || "Fenil Dholariya",
      jobTitle: p.role || "AI + SEO Growth Strategist",
      description: p.tagline || undefined,
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/assets/fenil.jpg`,
      email: p.email || undefined,
      telephone: p.phone || undefined,
      address: { "@type": "PostalAddress", addressLocality: "Surat", addressRegion: "Gujarat", addressCountry: "IN" },
      sameAs: sameAs.length ? sameAs : undefined,
      knowsAbout: ["SEO", "Technical SEO", "Local SEO", "Content Marketing", "AI Workflows", "Prompt Engineering"],
      alumniOf: { "@type": "CollegeOrUniversity", name: "CHARUSAT" },
    });
  }

  function websiteNode() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Fenil Dholariya",
      url: `${SITE_URL}/`,
      description:
        "Portfolio and blog of Fenil Dholariya, an AI + SEO growth strategist helping D2C, local and B2B brands grow organic traffic, leads and revenue.",
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#person` },
    };
  }

  function breadcrumbNode(items) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: (items || []).map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
    };
  }

  function serviceCatalogNode(services) {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "AI + SEO Growth Strategy",
      provider: { "@id": `${SITE_URL}/#person` },
      areaServed: "Worldwide",
      description:
        "Technical SEO audits, content strategy, local SEO, lead-funnel optimization, AI workflow design and competitive intelligence for D2C, local and B2B brands.",
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: (services || []).map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.title, description: s.desc },
        })),
      },
    };
  }

  function reviewNodes(testimonials) {
    return (testimonials || []).map((t) => ({
      "@type": "Review",
      reviewBody: t.quote,
      author: { "@type": "Person", name: [t.name, t.role].filter(Boolean).join(", ") },
      itemReviewed: { "@id": `${SITE_URL}/#person` },
    }));
  }

  function creativeWorkNode(project) {
    const url = `${SITE_URL}/work#${project.slug}`;
    return prune({
      "@type": "CreativeWork",
      "@id": url,
      name: project.title,
      headline: project.title,
      about: project.category,
      description: project.desc || project.description,
      creator: { "@id": `${SITE_URL}/#person` },
      url,
    });
  }

  function collectionPageNode({ name, url, description }, items) {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name,
      url,
      description,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: (items || []).map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
      },
    };
  }

  function blogPostingSummaryNode(post) {
    const url = `${SITE_URL}/post/${post.slug}`;
    return prune({
      "@type": "BlogPosting",
      "@id": url,
      headline: post.title,
      description: post.excerpt,
      url,
      datePublished: post.date,
      articleSection: post.category,
      author: { "@id": `${SITE_URL}/#person` },
    });
  }

  function blogNode(posts) {
    return {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${SITE_URL}/blog/#blog`,
      name: "Fenil Dholariya - Blog",
      url: `${SITE_URL}/blog`,
      description: "Practical writing on AI workflows, technical SEO, local SEO and content strategy.",
      author: { "@id": `${SITE_URL}/#person` },
      blogPost: (posts || []).map(blogPostingSummaryNode),
    };
  }

  function blogPostingNode(post) {
    const url = `${SITE_URL}/post/${post.slug}`;
    const words = String(post.body || post.excerpt || "")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return prune({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": url,
      mainEntityOfPage: url,
      url,
      headline: post.title,
      description: post.excerpt,
      image: `${SITE_URL}/assets/og.png`,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "en",
      articleSection: post.category,
      keywords: post.category,
      wordCount: words || undefined,
      author: { "@id": `${SITE_URL}/#person` },
      publisher: { "@id": `${SITE_URL}/#person` },
      speakable: { "@type": "SpeakableSpecification", cssSelector: ["#postTitle", "#postBody"] },
    });
  }

  /** Writes (or removes, if value is null/undefined) a JSON-LD <script> tag by id. */
  function setScript(id, value) {
    if (value === null || value === undefined) {
      document.getElementById(id)?.remove();
      return;
    }
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(value);
  }

  function refreshHome(data) {
    const person = personNode(data.profile);
    if (data.testimonials?.length) person.review = reviewNodes(data.testimonials);
    setScript("ldJsonPerson", person);
    setScript("ldJsonWebsite", websiteNode());
    setScript("ldJsonServices", serviceCatalogNode(data.services));
    setScript("ldJsonCustom", data.profile?.schema_markup || null);
  }

  function refreshWork(data) {
    const projects = data.projects || [];
    setScript(
      "ldJsonCollection",
      collectionPageNode(
        {
          name: "Case Studies - Fenil Dholariya",
          url: `${SITE_URL}/work`,
          description: "Real growth case studies: D2C jewellery, local services, B2B SaaS and ayurvedic brands.",
        },
        projects.map(creativeWorkNode)
      )
    );
    setScript("ldJsonBreadcrumb", breadcrumbNode([{ name: "Home", url: `${SITE_URL}/` }, { name: "Work", url: `${SITE_URL}/work` }]));
    const customs = projects.map((p) => p.schema_markup).filter(Boolean);
    setScript("ldJsonCustom", customs.length ? (customs.length === 1 ? customs[0] : customs) : null);
  }

  function refreshBlog(data) {
    setScript("ldJsonBlog", blogNode(data.posts));
    setScript("ldJsonBreadcrumb", breadcrumbNode([{ name: "Home", url: `${SITE_URL}/` }, { name: "Blog", url: `${SITE_URL}/blog` }]));
  }

  function boot() {
    const page = document.body?.dataset?.page;
    const refresh = { home: refreshHome, work: refreshWork, blog: refreshBlog }[page];
    if (refresh && window.SITE_DATA) refresh(window.SITE_DATA);
  }

  boot();

  return {
    SITE_URL,
    personNode,
    websiteNode,
    breadcrumbNode,
    serviceCatalogNode,
    reviewNodes,
    creativeWorkNode,
    collectionPageNode,
    blogNode,
    blogPostingNode,
    setScript,
    refreshHome,
    refreshWork,
    refreshBlog,
  };
})();
