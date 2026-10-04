/* Edge refraction for small glass surfaces. Text stays outside the filter. */
(() => {
  'use strict';
  if (!window.ResizeObserver || !document.createElement('canvas').getContext) return;
  const ns = 'http://www.w3.org/2000/svg';
  const transparent = matchMedia('(prefers-reduced-transparency: reduce)');
  const chromium = /Chrom(?:e|ium)\//.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
  const defsHost = document.createElementNS(ns, 'svg');
  defsHost.setAttribute('aria-hidden', 'true');
  defsHost.setAttribute('focusable', 'false');
  defsHost.classList.add('glass-optics-defs');
  const defs = document.createElementNS(ns, 'defs');
  defsHost.append(defs);
  document.body.append(defsHost);
  const records = [];
  const known = new WeakSet();
  let sequence = 0;

  function node(tag, attributes) {
    const element = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }
  function map(width, height, radius) {
    // Half-resolution maps keep the cost small; the SVG scales the field.
    const ratio = Math.min(1, 520 / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d');
    if (!context) return null;
    const pixels = context.createImageData(canvas.width, canvas.height);
    const halfWidth = width / 2, halfHeight = height / 2;
    const r = Math.min(radius, halfWidth, halfHeight);
    const bezel = Math.min(18, Math.max(7, r * .55));
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const dx = (x + .5) / ratio - halfWidth;
      const dy = (y + .5) / ratio - halfHeight;
      const qx = Math.abs(dx) - (halfWidth - r);
      const qy = Math.abs(dy) - (halfHeight - r);
      const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
      const length = Math.hypot(ax, ay);
      const distance = -(length + Math.min(Math.max(qx, qy), 0) - r);
      let vx = 0, vy = 0;
      if (distance >= 0 && distance < bezel) {
        const intensity = Math.sin(Math.PI * distance / bezel) ** .7;
        const normalX = length > 0 ? ax / length : qx > qy ? 1 : 0;
        const normalY = length > 0 ? ay / length : qy >= qx ? 1 : 0;
        vx = normalX * Math.sign(dx) * intensity;
        vy = normalY * Math.sign(dy) * intensity;
      }
      const index = (y * canvas.width + x) * 4;
      pixels.data[index] = Math.round(127.5 + vx * 127.5);
      pixels.data[index + 1] = Math.round(127.5 + vy * 127.5);
      pixels.data[index + 2] = 128;
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL();
  }
  function alignPhoto(record) {
    if (!record.image || !record.source?.complete) return;
    const source = record.source.getBoundingClientRect();
    const target = record.element.getBoundingClientRect();
    const style = getComputedStyle(record.source);
    record.image.src = record.source.currentSrc || record.source.src;
    Object.assign(record.image.style, {
      width: `${source.width}px`, height: `${source.height}px`,
      left: `${source.left - target.left}px`, top: `${source.top - target.top}px`,
      objectFit: style.objectFit, objectPosition: style.objectPosition,
    });
  }
  function refresh(record) {
    if (!record.element.isConnected) return;
    const { width, height } = record.element.getBoundingClientRect();
    if (!width || !height) return;
    alignPhoto(record);
    if (transparent.matches) {
      record.element.removeAttribute('data-glass-optics');
      return;
    }
    const key = `${Math.round(width)}:${Math.round(height)}`;
    if (record.key !== key) {
      const radius = parseFloat(getComputedStyle(record.element).borderTopLeftRadius) || 24;
      const data = map(width, height, radius);
      if (!data) return;
      record.filter.replaceChildren(
        node('feImage', { href: data, x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'bezel' }),
        node('feDisplacementMap', { in: 'SourceGraphic', in2: 'bezel', scale: record.image ? 18 : 14, xChannelSelector: 'R', yChannelSelector: 'G' }),
      );
      record.filter.setAttribute('width', width);
      record.filter.setAttribute('height', height);
      record.key = key;
    }
    record.element.setAttribute('data-glass-optics', record.image ? 'photo' : 'backdrop');
  }
  function enhance(element, source) {
    if (known.has(element)) return;
    known.add(element);
    const id = `glass-optics-${++sequence}`;
    const filter = node('filter', { id, x: 0, y: 0, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
    defs.append(filter);
    const record = { element, filter, source, key: '', timer: 0 };
    element.style.setProperty('--glass-lens-filter', `url("#${id}")`);
    if (source) {
      const layer = document.createElement('span');
      layer.className = 'glass-photo-lens';
      layer.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.alt = '';
      image.decoding = 'async';
      layer.append(image);
      element.prepend(layer);
      record.image = image;
      source.addEventListener('load', () => refresh(record));
    }
    records.push(record);
    const observer = new ResizeObserver(() => {
      // Wait for a contracting dock to settle, rather than rebuilding each frame.
      element.removeAttribute('data-glass-optics');
      clearTimeout(record.timer);
      record.timer = setTimeout(() => refresh(record), 160);
    });
    observer.observe(element);
    if (source) observer.observe(source);
    refresh(record);
  }
  function boot() {
    if (chromium) document.querySelectorAll('.nav__inner, .nav-indicator').forEach(element => enhance(element));
    document.querySelectorAll('[data-glass-photo]').forEach(element => {
      const source = document.querySelector(element.dataset.glassPhoto);
      if (source instanceof HTMLImageElement) enhance(element, source);
    });
    records.forEach(refresh);
  }
  window.addEventListener('resize', () => records.forEach(alignPhoto), { passive: true });
  window.addEventListener('content:hydrated', boot);
  document.fonts?.ready.then(() => records.forEach(refresh));
  transparent.addEventListener('change', () => records.forEach(refresh));
  boot();
})();
