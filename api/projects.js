import { loadPublicContent, summaries } from '../lib/public-content.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const slug = typeof req.query?.slug === 'string' ? req.query.slug : null;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await loadPublicContent();
    if (slug) {
      const item = data.projects.find(item => item.slug === slug);
      return item ? res.status(200).json({ project: item }) : res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({ projects: summaries(data).projects });
  } catch (error) {
    console.error('projects api unavailable', error.name);
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'Content temporarily unavailable' });
  }
}
