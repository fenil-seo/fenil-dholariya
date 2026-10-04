import { build } from 'esbuild';
import { cp, mkdir, rm, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';

// Vercel's function instrumentation cannot synchronously require the ESM parser
// used by sanitize-html. Bundle that dependency as CJS without changing its
// sanitization behavior. Keep the maintained sanitizer, rather than a custom one.
await build({
  stdin: { contents: 'module.exports = require("sanitize-html");', resolveDir: process.cwd() },
  outfile: '.generated/sanitize.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node24',
});
console.log('Built server HTML sanitizer.');

// Vercel serves existing static files before fallback rewrites. Keep editable
// public page templates inside their function bundles, outside public output.
const root = process.cwd();
const output = resolve(root, '.generated', 'public');
if (!output.startsWith(resolve(root, '.generated') + sep)) throw new Error('Unexpected output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['assets', 'css', 'js', '404.html', 'admin.html', 'indexnow-key.txt']) {
  await cp(join(root, path), join(output, path), { recursive: true });
}
const mediaIndex = [];
async function indexMedia(folder, prefix = '') {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { await indexMedia(join(folder, entry.name), relative); continue; }
    const video = /\.(?:mp4|webm)$/i.test(entry.name);
    if (!video && !/\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(entry.name)) continue;
    mediaIndex.push({ path: `/assets/${relative.split('/').map(encodeURIComponent).join('/')}`, name: entry.name, type: video ? 'video' : 'image' });
  }
}
await indexMedia(join(root, 'assets'));
await writeFile(join(output, 'assets', 'media-index.json'), JSON.stringify(mediaIndex));
console.log('Built static public output; dynamic page templates remain server-only.');
