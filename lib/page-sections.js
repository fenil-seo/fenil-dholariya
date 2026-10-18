import { esc } from "./search.js";
import {validateVideo,videoMarkup,installMediaAssets} from './video-media.js';
const section = (id, title, selector, groups, extra = {}) => ({ id, title, selector, groups, ...extra });
// Group fields by complete public sections. Selectors must point to direct
// children of main; the shared header is the single fixed exception.
export const PAGE_SECTIONS = {
  home: [
    section("header", "Header / navigation", "#nav", ["Header / navigation"], { fixed: true }),
    section("hero", "Opening introduction", ".home-hero", ["Hero"]),
    section("principles", "Working principles", ".authority-strip", ["Working principles"]),
    section("case", "Selected case · D2C commerce", "#featured-case", ["Featured case"]),
    section("method", "How I work", ".method-section", ["Method and video"]),
    section("starting", "Find a starting point", "#starting-point", ["Goal explorer", "Goal: Search visibility", "Goal: Better enquiries", "Goal: AI workflows"]),
    section("services", "Services", ".home-services", ["Services section"], { collection: "services" }),
    section("work", "More selected work", ".proof-room", ["Selected work"]),
    section("gallery", "The work gallery", ".gallery-invitation", ["Gallery invitation"]),
    section("fit", "A useful fit", ".fit-section", ["Audience fit"]),
    section("closing", "Start with context", ".closing-cta", ["Closing invitation"])
  ],
  services: [
    section("hero", "Services introduction", ".hero-band", ["Services hero"]),
    section("navigation", "On this page", ".page-index", ["Page navigation"]),
    section("starting", "Find a starting point", "#starting-point", ["Goal explorer", "Goal: Search visibility", "Goal: Better enquiries", "Goal: AI workflows"]),
    section("services", "What I can help with", "#capabilities", ["Service introduction"], { collection: "services" }),
    section("finder", "Find your starting point", "#find-your-start", ["Situation finder", "Situation: Visibility", "Situation: Conversion", "Situation: Team capacity"]),
    section("delivery", "Inside the delivery", 'section[aria-labelledby="delivery-title"]', ["Delivery journey", "Delivery: Understand", "Delivery: Prioritize", "Delivery: Deliver and learn"]),
    section("engagements", "Ways to work together", "#engagements", ["Engagement models"]),
    section("questions", "Questions before we start", ".service-questions", ["Frequently asked questions"])
  ],
  gallery: [
    section("hero", "Gallery introduction", ".evidence-intro", ["Gallery hero"]),
    section("filters", "Filters and image viewer", ".evidence-toolbar", ["Filters and viewer"]),
    section("captures", "Gallery sections and captures", "#galleryRoot", [], { collection: "gallery" }),
    section("reading", "Reading the evidence", ".evidence-reading", ["Reading the evidence"])
  ],
  about: [
    section("hero", "About introduction", ".about-world", ["About hero", "Portrait and identity", "Page navigation"]),
    section("approach", "My approach", "#approach", ["Approach introduction", "Approach: Search strategy", "Approach: Useful content", "Approach: Practical AI"]),
    section("experience", "Experience", "#experience", ["Experience introduction", "Experience: Role 1", "Experience: Role 2", "Experience: Role 3"]),
    section("principles", "Working together", "#principles", ["Working principles", "Evidence invitation"])
  ],
  insights: [
    section("hero", "Insights introduction and featured article", ".journal-heading", ["Insights hero", "Featured article"]),
    section("library", "Article library", ".journal-library", ["Article library"], { collection: "posts" }),
    section("note", "Editorial note", ".journal-note", ["Editorial note"])
  ],
  work: [
    section("hero", "Work introduction", ".hero-band", ["Work hero", "Hero imagery"]),
    section("cases", "Selected case studies", ".work-collection", ["Case study collection"], { collection: "projects" }),
    section("reasoning", "Decisions behind the work", 'section[aria-labelledby="decisions-title"]', ["Project reasoning", "E-commerce reasoning", "Local services reasoning", "B2B reasoning"]),
    section("evidence", "Explore the evidence", "main > .depth-section--ink", ["Evidence invitation", "Evidence links"])
  ]
};
export function defaultSections(page) {
  return (PAGE_SECTIONS[page] || []).map(({ id, title }) => ({ id, title, hidden: false }));
}
const text = (value, label, max = 1200) => {
  if (typeof value !== "string" || value.length > max) throw new Error(`${label} is invalid or too long.`);
  return value;
};
export function safeContentUrl(value, media = false) {
  if (!value) return true;
  if (typeof value !== "string" || /[\u0000-\u0020\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value) || !media && /^#[a-z\d_-]+$/i.test(value)) return true;
  try {
    return (media ? ["https:"] : ["https:", "mailto:", "tel:"]).includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function validateSections(page, input) {
  if (!PAGE_SECTIONS[page] || !Array.isArray(input) || input.length > 60) throw new Error("Invalid page sections.");
  const seen = new Set(), known = new Map(PAGE_SECTIONS[page].map((s) => [s.id, s]));
  const result = input.map((item) => {
    if (!item || typeof item !== "object" || !/^[-a-z0-9]{1,80}$/.test(item.id) || seen.has(item.id)) throw new Error("Sections need unique identifiers.");
    seen.add(item.id);
    if (typeof item.hidden !== "boolean") throw new Error("Choose section visibility.");
    const base = { id: item.id, title: text(item.title, "Section name", 160), hidden: item.hidden };
    if (known.has(item.id)) {
      if (known.get(item.id).fixed && item.hidden) throw new Error("This shared navigation cannot be hidden.");
      return base;
    }
    if (!item.id.startsWith("custom-") || !["text", "image", "video", "cta"].includes(item.type)) throw new Error("Unknown section type.");
    base.type = item.type;
    for (const key of ["eyebrow", "heading", "body", "image", "alt", "video", "poster", "button", "url"]) base[key] = text(item[key] ?? "", key, key === "body" ? 1e4 : 1200);
    for (const key of ["image", "video", "poster", "url"]) if (!safeContentUrl(base[key], key !== "url")) throw new Error(`${key} must be a safe URL.`);
    if(base.video)validateVideo(base.video);
    if(base.type==='video'&&!base.video.trim())throw new Error('Add a video link for the video section.');
    return base;
  });
  for (const def of PAGE_SECTIONS[page].filter((s) => s.fixed)) if (!seen.has(def.id)) throw new Error("Keep the shared navigation section.");
  return result;
}
export function applyPageSections($, page, settings = {}) {
  const layout = settings?.["layout.sections"];
  if (!Array.isArray(layout) || !PAGE_SECTIONS[page]) return;
  const definitions = PAGE_SECTIONS[page], nodes = new Map();
  // Reinsert existing nodes so editorial markup, classes and media stay intact.
  for (const def of definitions) {
    if (def.fixed) continue;
    const el = $(def.selector).first();
    if (el.length) nodes.set(def.id, el);
  }
  const first = [...nodes.values()][0];
  if (!first?.length) return;
  first.before("<span data-cms-insertion hidden></span>");
  const marker = $("[data-cms-insertion]");
  for (const node of nodes.values()) node.remove();
  let cursor = marker, hasCustom = false;
  for (const item of layout) {
    if (item.hidden) continue;
    let el = nodes.get(item.id);
    if (!el && item.type) {
      hasCustom = true;
      const title = `cms-heading-${item.id}`;
      const media = item.type === "image" && item.image ? `<img class="cms-section__media" src="${esc(item.image)}" alt="${esc(item.alt)}" loading="lazy">` : item.type === "video" && item.video ? `<div class="cms-section__media">${videoMarkup(item.video,{title:item.alt||item.heading,poster:item.poster||item.image})}</div>` : "";
      if(item.type==='video')installMediaAssets($);
      el = $(`<section class="section cms-section" id="${esc(item.id)}" aria-labelledby="${title}"><div class="container cms-section__layout"><div>${item.eyebrow ? `<p class="eyebrow">${esc(item.eyebrow)}</p>` : ""}<h2 class="section-title" id="${title}">${esc(item.heading || item.title)}</h2>${item.body ? `<p class="section-intro cms-section__body">${esc(item.body)}</p>` : ""}${item.button && item.url ? `<a class="btn btn--primary" href="${esc(item.url)}">${esc(item.button)}</a>` : ""}</div>${media}</div></section>`);
    }
    if (el) {
      cursor.after(el);
      cursor = el;
    }
  }
  marker.remove();
  if (hasCustom) $("head").append('<link rel="stylesheet" href="/css/cms-content.css">');
  for (const def of definitions.filter((s) => !s.fixed && !layout.some((v) => v.id === s.id && !v.hidden))) {
    const id = nodes.get(def.id)?.attr("id");
    if (id) $(`.page-index a[href="#${id}"],.about-local-nav a[href="#${id}"]`).remove();
  }
}
