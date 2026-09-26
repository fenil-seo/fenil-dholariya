import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {REVISED_POST, ORIGINAL_BODY_MD5, applyContentRevisions} from '../lib/content-revisions.js';
import {SEED} from '../lib/seed-data.js';

const sandbox={window:{},URL};
vm.runInNewContext(await readFile('js/render.js','utf8'),sandbox);
const media=sandbox.window.Render.postMediaUrl;
for(const path of ['assets/blog images/post-3.webp','/assets/blog%20images/post-3.webp','./assets/blog images/post-3.webp','assets\\blog images\\post-3.webp']){
 const actual=media({image_url:path});
 assert.equal(actual,'/assets/blog%20images/post-3.webp');
 assert.equal(new URL(actual,'https://example.com/post/an-article').pathname,'/assets/blog%20images/post-3.webp','Nested routes must resolve to the site root');
}
assert.equal(media({image_url:'/assets/custom.webp',blog_image_url:'/assets/featured.webp'}),'/assets/featured.webp');
assert.equal(media({slug:'content-that-converts',image_url:'/assets/custom.webp'}),'/assets/custom.webp','CMS image must override the default');
assert.equal(media({image_url:'https://images.example.com/test image.webp'}),'https://images.example.com/test%20image.webp');
assert.equal(media({image_url:'javascript:alert(1)'}),'');
assert.equal(media({image_url:'//external.example/test.webp'}),'');
assert.equal(media({image_url:'/assets/gallery/overview-1.webp'}),'');
assert.equal(media({slug:'content-that-converts'}),'/assets/media/article-content.webp');

let row={...REVISED_POST,body:'a later edit by the author'};
const calls=[];
const sql=async(query,params)=>{
 calls.push({query,params});
 assert.match(query,/WHERE slug=\$1 AND md5\(COALESCE\(body,''\)\)=\$7/);
 if(row.slug===params[0]&&createHash('md5').update(row.body).digest('hex')===params[6])row.body=params[3];
 return [];
};
await applyContentRevisions(sql);
assert.equal(row.body,'a later edit by the author','Never overwrite a subsequent CMS edit');
assert.equal(calls[0].params[6],ORIGINAL_BODY_MD5);
assert.equal(calls[0].params[3],REVISED_POST.body);
const client={window:{}};
vm.runInNewContext(await readFile('js/data.js','utf8'),client);
assert.equal(JSON.stringify(client.window.SITE_DATA.posts.find(p=>p.slug===REVISED_POST.slug)),JSON.stringify(REVISED_POST));
assert.deepEqual(SEED.posts.find(p=>p.slug===REVISED_POST.slug),REVISED_POST);
for(const file of ['js/blog.js','js/gallery.js','js/post.js'])new vm.Script(await readFile(file,'utf8'),{filename:file});
assert.ok(!REVISED_POST.body.includes('\u2014'));
console.log('PASS: nested-route media regression, encoded URLs, CMS image precedence, unsafe URL handling, guarded content revision, client/server article parity and script syntax.');
