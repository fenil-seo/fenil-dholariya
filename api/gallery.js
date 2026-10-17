import { getSql, isDbConfigured } from '../lib/db.js';
import { loadGalleryContent } from '../lib/gallery-content.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try { return res.status(200).json({sections:await loadGalleryContent(isDbConfigured()?getSql():null),authoritative:true}); }
  catch(error) {console.error('Gallery content unavailable',error.name);return res.status(503).json({error:'Gallery temporarily unavailable.'});}
}
