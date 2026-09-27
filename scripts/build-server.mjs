import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';

// Vercel's function instrumentation cannot synchronously require the ESM parser
// used by sanitize-html. Bundle that dependency as CJS without changing its
// sanitization behavior. Keep the maintained sanitizer, rather than a custom one.
await build({
  stdin: { contents: 'module.exports = require("sanitize-html");', resolveDir: process.cwd() },
  outfile: '.generated/sanitize.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node24',
});
console.log('Built server HTML sanitizer.');

// Vercel serves existing static files before fallback rewrites. Keep the four
// dynamic templates inside the function bundle, outside the public output.
const root = process.cwd();
const output = resolve(root, '.generated', 'public');
if (!output.startsWith(resolve(root, '.generated') + sep)) throw new Error('Unexpected output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['assets', 'css', 'js', 'index.html', 'services.html', 'about.html', 'gallery.html', 'contact.html', '404.html', 'admin.html', 'robots.txt', 'indexnow-key.txt']) {
  await cp(join(root, path), join(output, path), { recursive: true });
}
console.log('Built static public output; dynamic page templates remain server-only.');
