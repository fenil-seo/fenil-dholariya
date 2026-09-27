import { SITE_URL } from '../lib/search.js';
import { INDEXNOW_KEY } from '../lib/indexnow-key.js';
import { submitIndexNow } from '../lib/indexnow.js';

// Run after a deployment. Verify public ownership before sending canonical URLs.
const keyResponse = await fetch(`${SITE_URL}/indexnow-key.txt`);
if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) throw new Error('Deploy the IndexNow key before submitting.');
const sitemap = await fetch(`${SITE_URL}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`Sitemap HTTP ${sitemap.status}`);
const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const result = await submitIndexNow(process.argv.slice(2).length ? process.argv.slice(2) : urls);
console.log(JSON.stringify(result));
console.log('Receipt confirms notification only, not indexing or ranking.');
