import {videoSource,videoMarkup} from '../js/video-media.js';
import {esc} from './search.js';
export {videoSource,videoMarkup};
export function validateVideo(value,label='Video link') {
  if(typeof value!=='string'||value.length>2048||value.trim()&&!videoSource(value))throw new Error(`${label}: use a YouTube, Instagram Reel or direct MP4 / WebM URL.`);
  return value.trim();
}
export function installMediaAssets($) {
  if(!$('link[data-video-media]').length)$('head').append('<link rel="stylesheet" href="/css/video-media.css?v=20261018media" data-video-media>');
  if(!$('script[data-video-media]').length)$('body').append('<script type="module" src="/js/video-media-runtime.js?v=20261018media" data-video-media></script>');
}
export function replaceImageWithVideo($,image,url,title='Video') {
  const img=typeof image==='string'?$(image).first():$(image);if(!img.length)return;
  const markup=videoMarkup(url,{title,poster:img.attr('src')||''});if(!markup)return;
  const anchor=img.closest('a'),href=anchor.attr('href');
  if(anchor.length){
    const heading=anchor.find('h2,h3').first();anchor[0].name=heading.length?'article':'div';anchor.removeAttr('href tabindex aria-hidden');
    if(href){if(heading.length)heading.wrapInner(`<a href="${esc(href)}"></a>`);else anchor.append(`<a class="cms-video-context" href="${esc(href)}">View details ↗</a>`);}
  }
  const parent=img.parent();parent.addClass('cms-video-host');
  const id=img.attr('id'),replacement=$(markup);if(id)replacement.attr('id',id);
  img.replaceWith(replacement);installMediaAssets($);
}
