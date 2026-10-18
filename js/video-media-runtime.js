import {videoMarkup} from './video-media.js?v=20261018media';
function upgrade(){
  document.querySelectorAll('img[data-media-type="video"]').forEach(img=>{
    const html=videoMarkup(img.dataset.videoUrl,{title:img.alt||'Video',poster:img.src});if(!html)return;
    const anchor=img.closest('a'),href=anchor?.getAttribute('href');
    if(anchor){const element=document.createElement(anchor.querySelector('h2,h3')?'article':'div');for(const attr of anchor.attributes)if(!['href','tabindex','aria-hidden'].includes(attr.name))element.setAttribute(attr.name,attr.value);element.append(...anchor.childNodes);anchor.replaceWith(element);const heading=element.querySelector('h2,h3');if(href&&heading){const link=document.createElement('a');link.href=href;link.append(...heading.childNodes);heading.append(link);}else if(href){const link=document.createElement('a');link.className='cms-video-context';link.href=href;link.textContent='View details ↗';element.append(link);}}
    img.parentElement.classList.add('cms-video-host');img.outerHTML=html;
  });
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;upgrade();});}).observe(document.body,{childList:true,subtree:true});upgrade();
