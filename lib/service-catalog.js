import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { join } from "node:path";
import { esc, json, SITE_URL } from "./search.js";
import { safeContentUrl } from "./page-sections.js";
export async function serviceCatalog(settings = {}) {
  // Read through existing page edits until the owner first saves the catalog.
  // Opening an editor never seeds or overwrites production content.
  if (Array.isArray(settings["service-catalog"]?.items)) return settings["service-catalog"].items;
  const $ = load(await readFile(join(process.cwd(), "services.html"), "utf8"));
  const stored = settings.services || {}, home = settings.home || {};
  return $(".capability").toArray().map((el, i) => {
    const card = $(el), id = card.attr("id"), value = (key, fallback) => stored[`service.${id}.${key}`] ?? fallback;
    return { id, title: value("title", home[`services.item.${i + 1}.title`] ?? card.find(".capability__title").text()), intro: value("intro", card.find(".capability__intro").text()), body: value("body", card.find(".capability__body > p").text()), scopeTitle: value("scopeTitle", card.find(".capability__body h3").text()), scope: [1, 2, 3].map((n) => value(`scope.${n}`, card.find("li").eq(n - 1).text())), button: value("link", card.find(".text-link").contents().filter((_, n) => n.type === "text").text().trim()), url: value("url", card.find(".text-link").attr("href")), published: true, showOnHome: true };
  });
}
export function validateServiceCatalog(input) {
  if (!Array.isArray(input) || input.length > 80) throw new Error("Use up to 80 services.");
  const seen = new Set();
  return input.map((item) => {
    if (!item || typeof item.id !== "string" || item.id.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || seen.has(item.id)) throw new Error("Each service needs a unique URL name.");
    seen.add(item.id);
    if (["starting-point", "main", "maincontent", "nav", "capabilities", "engagements", "questions-title", "services-title", "goal-title", "goal-result", "find-your-start", "finder-title", "delivery-title", "engagements-title"].includes(item.id)) throw new Error("This service URL name is already used by a page section.");
    const result = { id: item.id };
    for (const key of ["title", "intro", "body", "scopeTitle", "button", "url"]) {
      if (typeof item[key] !== "string" || item[key].length > (key === "body" ? 5e3 : 1200)) throw new Error(`Invalid service ${key}.`);
      result[key] = item[key];
    }
    if (!result.title.trim()) throw new Error("Enter a name for every service.");
    if (!safeContentUrl(result.url)) throw new Error("Service enquiry link must be a safe URL.");
    if (!Array.isArray(item.scope) || item.scope.length > 30 || item.scope.some((v) => typeof v !== "string" || v.length > 1200)) throw new Error("Invalid service scope.");
    result.scope = item.scope;
    for (const key of ["published", "showOnHome"]) {
      if (typeof item[key] !== "boolean") throw new Error("Choose service visibility.");
      result[key] = item[key];
    }
    return result;
  });
}
export function renderServiceCatalog($, page, items) {
  if (!Array.isArray(items)) return;
  const visible = items.filter((s) => s.published), arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  if (!$(page === "home" ? ".home-service-index" : "#servicesList").length) {
    $("#ldJsonServices").remove();
    return;
  }
  let node = $("#ldJsonServices");
  const schema = node.length ? JSON.parse(node.text()) : { "@context": "https://schema.org", "@type": "Service", name: "Services", provider: { "@id": `${SITE_URL}/#person` } };
  schema.hasOfferCatalog = { ...schema.hasOfferCatalog, "@type": "OfferCatalog", name: "Services", itemListElement: visible.filter((s) => page !== "home" || s.showOnHome).map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.title, description: s.body, url: `${SITE_URL}/services#${s.id}` } })) };
  if (!node.length) {
    $("head").append('<script type="application/ld+json" id="ldJsonServices"><\/script>');
    node = $("#ldJsonServices");
  }
  node.attr("data-cms-managed", "true").text(json(schema));
  if (page === "home") {
    const home = visible.filter((s) => s.showOnHome);
    $(".home-service-index").html(home.map((s, i) => `<a href="/services#${esc(s.id)}"><span>${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3>${arrow}</a>`).join(""));
    if (home.length !== 8) {
      const intro = $(".home-services .section-intro");
      intro.text(intro.text().replace("Eight services,", "Services,"));
    }
    return;
  }
  const originals = new Map($(".capability").toArray().map((el) => [$(el).attr("id"), $(el).find(".capability__icon").toString()]));
  $("#servicesList").html(visible.map((s, i) => `<details class="capability" id="${esc(s.id)}"><summary><span class="capability__identity">${originals.get(s.id) || '<span class="capability__icon" aria-hidden="true">↗</span>'}<span class="capability__number">${String(i + 1).padStart(2, "0")}</span></span><span class="capability__heading"><span class="capability__title">${esc(s.title)}</span><span class="capability__intro">${esc(s.intro)}</span></span><span class="capability__toggle" aria-hidden="true">+</span></summary><div class="capability__body"><p>${esc(s.body)}</p><h3>${esc(s.scopeTitle)}</h3><ul>${s.scope.filter(Boolean).map((v) => `<li>${esc(v)}</li>`).join("")}</ul>${s.button && s.url ? `<a class="text-link" href="${esc(s.url)}">${esc(s.button)} ${arrow}</a>` : ""}</div></details>`).join(""));
  if (visible.length !== 8) {
    const link = $(".service-intro > div > a");
    const text = link.contents().toArray().find((n) => n.type === "text");
    if (text) text.data = text.data.replace("all eight services", "services");
  }
}
