import {mediaChoice} from './video-media.js?v=20261018media';
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const readList = (draft, key) => {
  try {
    return JSON.parse(draft[key] || "[]");
  } catch {
    return [];
  }
};
const scopedInput = (key, label, value, options = {}, scope) => `<div class="site-field${options.wide ? " site-field--wide" : ""}"><label for="structured-${esc(scope)}-${key}">${esc(label)}</label>${options.area ? `<textarea class="site-input site-textarea" id="structured-${esc(scope)}-${key}" data-structured-key="${key}" rows="4">${esc(value)}</textarea>` : options.check ? `<input id="structured-${esc(scope)}-${key}" data-structured-key="${key}" type="checkbox" ${value ? "checked" : ""}>` : `<input class="site-input" id="structured-${esc(scope)}-${key}" data-structured-key="${key}" value="${esc(value)}">`}</div>`;
export function sectionActions(section, definition, index, total, fixedBefore = false) {
  return definition?.fixed ? "" : `<div class="cms-section-actions" aria-label="Section actions"><button type="button" class="site-button" data-section-action="up" ${index === 0 || fixedBefore ? "disabled" : ""}>Move up</button><button type="button" class="site-button" data-section-action="down" ${index === total - 1 ? "disabled" : ""}>Move down</button><button type="button" class="site-button" data-section-action="visibility">${section.hidden ? "Show section" : "Hide section"}</button><button type="button" class="site-button" data-section-action="remove">Remove section</button></div>${section.hidden ? '<p class="cms-inline-note">This section is hidden on the website. You can continue editing it here.</p>' : ""}`;
}
export function customSectionFields(section, scope = "page") {
  const input = (key,label,value,options) => scopedInput(key,label,value,options,scope);
  const media=['image','video'].includes(section.type)?`<div class="site-field site-field--wide">${mediaChoice({key:'block',typeKey:'block.type',videoKey:'block.video',type:section.type,video:section.video||'',scope:`block-${scope}`,binding:'structured'})}<div data-image-controls${section.type==='video'?' hidden':''}>${input('block.image','Image URL',section.image,{wide:true})}<button type="button" class="site-button" data-section-media="image">Choose image</button></div></div>${input('block.alt','Media description / alt text',section.alt,{wide:true})}`:'';
  return `<div class="site-fields-grid">${input("block.title", "Section name in the editor", section.title, { wide: true })}${input("block.eyebrow", "Small label above heading", section.eyebrow)}${input("block.heading", "Heading", section.heading)}${input("block.body", "Content", section.body, { area: true, wide: true })}${media}${input("block.button", "Button label", section.button)}${input("block.url", "Button link", section.url)}</div>`;
}
export function catalogMarkup(items, selected, scope = "page") {
  const input = (key,label,value,options) => scopedInput(key,label,value,options,scope);
  const index = Math.max(0, items.findIndex((s) => s.id === selected)), item = items[index];
  return `<div class="cms-inline-collection"><div class="cms-inline-collection__head"><div><h3>Services</h3><p>One list for Home and Services. Save changes above to publish.</p></div><button type="button" class="site-button site-button--orange" data-service-action="add">+ Add service</button></div><label class="cms-service-select">Choose a service<select class="site-input" data-service-dropdown>${items.map((s, i) => `<option value="${esc(s.id)}" ${i === index ? "selected" : ""}>${esc(s.title || "New service")}${s.published ? "" : " (hidden)"}</option>`).join("")}</select></label><div class="cms-service-tabs" role="group" aria-label="Choose a service">${items.map((s, i) => `<button type="button" class="site-button${i === index ? " is-active" : ""}" data-service-select="${esc(s.id)}">${esc(s.title || "New service")}${s.published ? "" : " · Hidden"}</button>`).join("")}</div>${item ? `<div class="cms-section-actions"><button type="button" class="site-button" data-service-action="up" ${index === 0 ? "disabled" : ""}>Move service up</button><button type="button" class="site-button" data-service-action="down" ${index === items.length - 1 ? "disabled" : ""}>Move service down</button><button type="button" class="site-button" data-service-action="remove">Remove service</button><span data-service-path>/services#${esc(item.id)}</span></div><div class="site-fields-grid">${input("service.title", "Service name (Home and Services)", item.title, { wide: true })}${input("service.intro", "Short introduction", item.intro, { wide: true })}${input("service.body", "Description", item.body, { area: true, wide: true })}${input("service.scopeTitle", "Scope heading", item.scopeTitle)}${input("service.scope", "Scope items (one per line)", item.scope.join("\n"), { area: true, wide: true })}${input("service.button", "Enquiry button label", item.button)}${input("service.url", "Enquiry button link", item.url)}${input("service.published", "Show on Services page", item.published, { check: true })}${input("service.showOnHome", "Also show on Home", item.showOnHome, { check: true })}</div>` : "<p>No services. Add a service to start.</p>"}</div>`;
}
export async function chooseSectionType(panel, definitions, sections) {
  const missing = definitions.filter((d) => !sections.some((s) => s.id === d.id));
  const dialog = document.createElement("dialog");
  dialog.className = "site-media-dialog cms-add-section";
  dialog.innerHTML = `<div class="site-media-dialog__head"><div><strong>Add a section</strong><p>Choose a layout, then edit its content.</p></div><button type="button" class="site-button" data-close>Close</button></div><div class="cms-add-section__options">${[["text", "Text section", "Heading and paragraphs"], ["image", "Image and text", "Photo, heading and content"], ["video", "Video and text", "Video file, poster and content"], ["cta", "Call to action", "Invitation and a button"]].map(([key, label, description]) => `<button class="site-button" type="button" data-type="${key}"><strong>${label}</strong><span>${description}</span></button>`).join("")}${missing.map((d) => `<button class="site-button" type="button" data-restore="${d.id}">Restore ${esc(d.title)}</button>`).join("")}</div>`;
  panel.append(dialog);
  dialog.showModal();
  return new Promise((resolve) => {
    let result = null;
    dialog.addEventListener("click", (event) => {
      const type = event.target.closest("[data-type]"), restore = event.target.closest("[data-restore]");
      if (type) result = { type: type.dataset.type };
      if (restore) result = { restore: restore.dataset.restore };
      if (type || restore || event.target.closest("[data-close]")) dialog.close();
    });
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve(result);
    }, { once: true });
  });
}
