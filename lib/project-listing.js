// Listing copy is independent of the full case-study title and introduction.
// Retain the approved display copy until an editor explicitly replaces it.
const defaults = {
  'd2c-silver-jewellery':['commerce','D2C silver jewellery','Product-page architecture and search-led content for a jewellery brand.'],
  'local-construction-gmb':['local','Construction & fencing','Google Business Profile, review processes and location pages for a local contractor.'],
  'b2b-saas-pipeline':['b2b','B2B software','Search intent, editorial planning and nurture journeys connected to the buying process.'],
  'ayurvedic-technical-seo':['commerce','Ayurvedic commerce','Crawl, indexation and performance improvements to strengthen an existing website.'],
};
export const PROJECT_LISTING_FIELDS = ['listing_title','listing_description','work_category','image_alt'];
export function projectListing(project) {
  const fallback = defaults[project.slug];
  const category = /local/i.test(project.category) ? 'local' : /b2b|saas|software/i.test(project.category) ? 'b2b' : /commerce|d2c/i.test(project.category) ? 'commerce' : 'other';
  return {
    category:project.work_category || fallback?.[0] || category,
    title:project.listing_title || fallback?.[1] || project.title,
    description:project.listing_description || fallback?.[2] || project.desc,
  };
}
export function validateProjectListing(data = {}) {
  const result = {};
  for (const key of PROJECT_LISTING_FIELDS) {
    if (data[key] === undefined) continue;
    const limit = key === 'listing_description' ? 1200 : 300;
    if (typeof data[key] !== 'string' || data[key].length > limit) throw new Error(`${key} must be text of ${limit} characters or fewer.`);
    const value = data[key].trim();
    if (key === 'work_category' && !['','commerce','local','b2b','other'].includes(value)) throw new Error('Choose a valid Work filter category.');
    result[key] = value;
  }
  return result;
}
