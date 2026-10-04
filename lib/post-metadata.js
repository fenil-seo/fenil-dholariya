export const POST_METADATA_FIELDS = ['meta_title', 'meta_description', 'og_title', 'og_description', 'og_image_url'];

export function validatePostMetadata(data = {}) {
  const result = {};
  for (const key of POST_METADATA_FIELDS) {
    if (data[key] === undefined) continue;
    const limit = key === 'og_image_url' ? 2048 : key.endsWith('title') ? 200 : 500;
    if (typeof data[key] !== 'string' || data[key].length > limit) throw new Error(`${key} must be text of ${limit} characters or fewer.`);
    const value = data[key].trim();
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
