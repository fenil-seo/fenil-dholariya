import { esc, fieldMarkup, bindControls } from "./cms-controls.js";
const categoryFields = [{ key: "label", label: "Section heading", required: true, wide: true }, { key: "filter_label", label: "Short filter label" }, { key: "eyebrow", label: "Small label above heading" }, { key: "description", label: "Section description", type: "textarea", wide: true }];
const captureFields = [{ key: "image_url", label: "Capture image", type: "image", required: true }, { key: "alt", label: "Image description / alt text", required: true, wide: true }, { key: "caption", label: "Caption", type: "textarea", wide: true }, { key: "badge", label: "Badge / date" }, { key: "section", label: "Gallery section", type: "select", options: [] }, { key: "sort_order", label: "Display order (lower first)", type: "number" }, { key: "pinned", label: "Pin to top of section", type: "checkbox" }, { key: "highlight", label: "Highlight capture", type: "checkbox" }];
export async function createGalleryWorkspace({ panel, api, onChange, signal }) {
  let categories = [], captures = [], selected = "", message = "", busy = false, openDialog = null, dialogDraft = null, dialogInitial = "";
  async function refresh() {
    const results = await Promise.all([api.admin("gallery-sections", "list"), api.admin("gallery", "list")]);
    for (const r of results) if (!r.ok) throw new Error(r.data?.error || "Gallery unavailable.");
    categories = results[0].data.items;
    captures = results[1].data.items;
    if (!categories.some((c) => c.key === selected)) selected = categories[0]?.key || "";
  }
  await refresh();
  const current = () => categories.find((c) => c.key === selected);
  function markup() {
    const section = current(), items = captures.filter((c) => c.section === selected);
    return `<div class="cms-inline-collection" data-gallery-workspace><div class="cms-inline-collection__head"><div><h3>Gallery sections</h3><p>Choose a section to edit its heading and captures.</p></div><button type="button" class="site-button site-button--orange" data-gallery-action="add-section">+ Add gallery section</button></div><label class="cms-service-select">Choose a gallery section<select class="site-input" data-gallery-dropdown>${categories.map((c) => `<option value="${esc(c.key)}" ${c.key === selected ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label><div class="cms-service-tabs" role="group" aria-label="Gallery sections">${categories.map((c) => `<button type="button" class="site-button${c.key === selected ? " is-active" : ""}" data-gallery-select="${esc(c.key)}">${esc(c.label)} <small>${captures.filter((i) => i.section === c.key).length}</small></button>`).join("")}</div><p class="cms-inline-note" data-gallery-status aria-live="polite">${esc(message)}</p>${section ? `<div class="cms-inline-collection__head"><div><h3>${esc(section.label)}</h3><p>${items.length} ${items.length === 1 ? "capture" : "captures"}</p></div><div class="cms-section-actions"><button class="site-button" type="button" data-gallery-action="edit-section">Edit section details</button><button class="site-button" type="button" data-gallery-action="up" ${categories.indexOf(section) === 0 ? "disabled" : ""}>Move section up</button><button class="site-button" type="button" data-gallery-action="down" ${categories.indexOf(section) === categories.length - 1 ? "disabled" : ""}>Move section down</button><button class="site-button" type="button" data-gallery-action="delete-section">Delete section</button></div></div><button class="site-button site-button--orange" type="button" data-gallery-action="add-capture">+ Add capture to this section</button><div class="cms-capture-grid">${items.map((c) => `<button type="button" class="cms-capture" data-gallery-capture="${c.id}"><img src="${esc(c.image_url)}" alt="" loading="lazy"><strong>${esc(c.alt)}</strong><span>${esc(c.caption || c.badge || "Edit capture")}</span>${c.pinned ? "<small>Pinned</small>" : ""}</button>`).join("") || "<p>This section has no captures yet. Add the first capture above.</p>"}</div>` : "<p>Add your first gallery section.</p>"}</div>`;
  }
  function redraw() {
    const host = panel.querySelector("[data-gallery-host]");
    if (host) host.innerHTML = markup();
  }
  async function perform(resource, action, data, id) {
    const r = await api.admin(resource, action, { ...data ? { data } : {}, ...id ? { id } : {} });
    if (!r.ok) throw new Error(r.data?.error || "Could not save.");
    return r.data;
  }
  async function edit(kind, record) {
    const isCategory = kind === "section", fields = isCategory ? categoryFields : captureFields.map((f) => f.key === "section" ? { ...f, options: categories.map((c) => ({ value: c.key, label: c.label })) } : f), resource = isCategory ? "gallery-sections" : "gallery";
    const draft = isCategory ? { label: "", filter_label: "", eyebrow: "", description: "", position: Math.max(-1, ...categories.map((c) => Number(c.position) || 0)) + 1, ...record } : { image_url: "", alt: "", badge: "", caption: "", section: selected, sort_order: Math.max(-1, ...captures.filter((c) => c.section === selected).map((c) => Number(c.sort_order) || 0)) + 1, pinned: false, highlight: false, ...record }, initial = JSON.stringify(draft), dialog = document.createElement("dialog"), controller = new AbortController();
    dialog.className = "site-media-dialog cms-record-dialog is-active";
    openDialog = dialog;
    dialogDraft = draft;
    dialogInitial = initial;
    let saving = false;
    dialog.innerHTML = `<div class="site-media-dialog__head"><div><strong>${record ? "Edit" : "Add"} gallery ${kind}</strong><p>${isCategory ? "The section heading and filter shown on the gallery." : "The image and context shown inside this section."}</p></div><button type="button" class="site-button" data-dialog-close>Close</button></div><div class="site-fields-grid">${fields.map((f) => fieldMarkup(f, draft[f.key], `gallery-${kind}`)).join("")}</div><div class="cms-dialog-actions"><span data-dialog-status role="status"></span>${record && !isCategory ? '<button class="site-button" type="button" data-dialog-delete>Delete capture</button>' : ""}<button type="button" class="site-button" data-dialog-close>Cancel</button><button type="button" class="site-button site-button--orange" data-dialog-save>Save ${kind}</button></div>`;
    panel.append(dialog);
    bindControls({ panel: dialog, fields, draft: () => draft, onChange: () => {
      dialog.querySelector("[data-dialog-status]").textContent = "Unsaved changes";
    }, signal: controller.signal, allowGallery: true });
    const close = () => {
      if (saving) return;
      if (JSON.stringify(draft) !== initial && !confirm("Discard changes to this gallery " + kind + "?")) return;
      dialog.close();
    };
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("click", async (event) => {
      if (event.target.closest("[data-dialog-close]")) return close();
      const save = event.target.closest("[data-dialog-save]"), remove = event.target.closest("[data-dialog-delete]");
      if (!save && !remove || saving) return;
      if (remove && !confirm("Delete this capture from the gallery?")) return;
      saving = true;
      const status = dialog.querySelector("[data-dialog-status]");
      dialog.querySelectorAll("[data-dialog-save],[data-dialog-delete],[data-dialog-close]").forEach((b) => b.disabled = true);
      try {
        if (isCategory && !draft.label.trim()) throw new Error("Enter the section heading.");
        if (!isCategory && (!draft.image_url.trim() || !draft.alt.trim())) throw new Error("Choose an image and enter its description.");
        const payload = { ...draft };
        delete payload.id;
        if (isCategory && !record) payload.key = draft.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65) || `section-${Date.now()}`;
        if (!isCategory) payload.sort_order = Number(payload.sort_order) || 0;
        await perform(resource, remove ? "delete" : record ? "update" : "create", remove ? null : payload, record?.id);
        if (isCategory) selected = payload.key || record.key;
        message = remove ? "Capture deleted." : `Gallery ${kind} saved.`;
        await refresh();
        dialog.close();
        redraw();
        onChange();
        window.dispatchEvent(new CustomEvent("site:gallery-changed"));
      } catch (error) {
        status.textContent = error.message;
      } finally {
        saving = false;
        dialog.querySelectorAll("[data-dialog-save],[data-dialog-delete],[data-dialog-close]").forEach((b) => b.disabled = false);
      }
    });
    dialog.addEventListener("close", () => {
      controller.abort();
      dialog.remove();
      openDialog = null;
      dialogDraft = null;
    }, { once: true });
    dialog.showModal();
  }
  panel.addEventListener("click", async (event) => {
    const select = event.target.closest("[data-gallery-select]");
    if (select) {
      selected = select.dataset.gallerySelect;
      redraw();
      return;
    }
    const capture = event.target.closest("[data-gallery-capture]");
    if (capture) {
      edit("capture", captures.find((c) => String(c.id) === capture.dataset.galleryCapture));
      return;
    }
    const action = event.target.closest("[data-gallery-action]")?.dataset.galleryAction;
    if (!action || busy) return;
    if (action === "add-section") return edit("section");
    if (action === "edit-section") return edit("section", current());
    if (action === "add-capture") return edit("capture");
    busy = true;
    try {
      if (action === "delete-section") {
        if (captures.some((c) => c.section === selected)) throw new Error("Move or delete this section’s captures first. Edit a capture to move it to another section.");
        if (!confirm("Delete this empty gallery section?")) return;
        await perform("gallery-sections", "delete", null, current().id);
      }
      if (["up", "down"].includes(action)) {
        const order = [...categories], index = order.findIndex((c) => c.key === selected), to = index + (action === "up" ? -1 : 1);
        if (to < 0 || to >= order.length) return;
        [order[index], order[to]] = [order[to], order[index]];
        await perform("gallery-sections", "reorder", { ids: order.map((c) => c.id) });
      }
      await refresh();
      message = action === "delete-section" ? "Gallery section deleted." : "Gallery section order updated.";
      onChange();
      window.dispatchEvent(new CustomEvent("site:gallery-changed"));
    } catch (error) {
      message = error.message;
    } finally {
      busy = false;
      redraw();
    }
  }, { signal });
  panel.addEventListener("change", (event) => {
    if (event.target.matches("[data-gallery-dropdown]")) {
      selected = event.target.value;
      redraw();
    }
  }, { signal });
  signal?.addEventListener("abort", () => openDialog?.close(), { once: true });
  window.addEventListener("site:gallery-changed", async () => {
    if (openDialog) return;
    try {
      await refresh();
      redraw();
    } catch (error) {
      message = error.message;
      redraw();
    }
  }, { signal });
  return { markup, addSection: () => edit("section"), hasUnsavedChanges: () => dialogDraft && JSON.stringify(dialogDraft) !== dialogInitial, saveOpenDialog: () => {
    if (!openDialog) return false;
    openDialog.querySelector("[data-dialog-save]")?.click();
    return true;
  } };
}
