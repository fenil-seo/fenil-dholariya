export const POST_METADATA_FIELDS = ['meta_title', 'meta_description', 'og_title', 'og_description', 'og_image_url','meta_keywords','canonical_url','robots','video_url','video_poster','video_caption','image_alt','hero_image_alt'];

export function validatePostMetadata(data = {}) {
  const result = {};
  for (const key of POST_METADATA_FIELDS) {
    if (data[key] === undefined) continue;
    const limit = /(?:url|poster)$/.test(key) ? 2048 : key.endsWith('title') ? 200 : 500;
    if (typeof data[key] !== 'string' || data[key].length > limit) throw new Error(`${key} must be text of ${limit} characters or fewer.`);
    const value = data[key].trim();
    if(key==='robots' && value && !['index, follow, max-image-preview:large','index, follow','noindex, follow','noindex, nofollow','index, nofollow'].includes(value))throw new Error('Choose a valid article robots directive.');
    if(key==='canonical_url' && value){try{const url=new URL(value);if(url.protocol!=='https:' || url.username || url.password)throw new Error();}catch{throw new Error('Canonical URL must be an absolute HTTPS address.');}}
    if(['video_url','video_poster'].includes(key) && value){if(!/^(?:\/(?!\/)|https:\/\/)/i.test(value))throw new Error('Video media must use a site path or HTTPS URL.');if(key==='video_url' && !/\.(?:mp4|webm)(?:[?#]|$)/i.test(value))throw new Error('Video must link to an MP4 or WebM file.');}
    if (key === 'og_image_url' && value) {
      const path = value.replace(/\\/g, '/').replace(/^(?:\.\.\/|\.\/)+/, '').replace(/^assets\//i, '/assets/');
      if (!/^(?:\/(?!\/)|https?:\/\/)/i.test(path)) throw new Error('OG image must be a site image path or an http/https URL.');
      try {
        const url = new URL(path, 'https://fenil-dholariya.vercel.app');
        if (url.username || url.password || /\/assets\/gallery\//i.test(decodeURIComponent(url.pathname))) throw new Error();
      } catch { throw new Error('Choose a valid public image for social sharing.'); }
    }
    result[key] = value;
  }
  return result;
}

export function validatePostContent(data={}) {
  const metadata=validatePostMetadata(data);
  if(data.published!==undefined && typeof data.published!=='boolean')throw new Error('Published must be checked or unchecked.');
  if(typeof data.title!=='string' || !data.title.trim() || data.title.length>300)throw new Error('Article title is required (up to 300 characters).');
  for(const key of ['category','excerpt','slug','body','image_url','blog_image_url'])if(data[key]!==undefined && (typeof data[key]!=='string' || data[key].length>(key==='body'?200000:5000)))throw new Error(`${key} is too long or invalid.`);
  for(const key of ['image_url','blog_image_url'])if(data[key] && !/^(?:\/(?!\/)|https:\/\/|(?:\.\/)?assets\/)/i.test(data[key]))throw new Error('Article images must use a site path or HTTPS URL.');
  if(data.reading_time!==undefined && (!Number.isInteger(Number(data.reading_time)) || Number(data.reading_time)<1 || Number(data.reading_time)>240))throw new Error('Reading time must be between 1 and 240 minutes.');
  if(data.date){const date=new Date(data.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==data.date)throw new Error('Choose a valid publish date.');}
  if(data.schema_markup!=null && (typeof data.schema_markup!=='object' || Array.isArray(data.schema_markup) && !data.schema_markup.every(n=>n && typeof n==='object' && !Array.isArray(n)) || JSON.stringify(data.schema_markup).length>50000))throw new Error('Schema must be a JSON object or array of objects, up to 50000 characters.');
  return metadata;
}
export const postNoIndexPaths=posts=>posts.filter(p=>/^noindex\b/i.test(p.robots || '')).map(p=>`/post/${p.slug}`);
