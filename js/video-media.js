// Shared by the browser controls, public renderer and server validation.
export function videoSource(value) {
  const raw=String(value||'').trim();
  if(!raw)return null;
  if(raw.length>2048||raw.startsWith('//')||/[\u0000-\u0020\\]/.test(raw))return null;
  let url;try{url=new URL(raw,'https://fenil-dholariya.vercel.app');}catch{return null;}
  if(url.username||url.password||url.port||url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase(),path=url.pathname;
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
    const id=host==='youtu.be'?path.slice(1).split('/')[0]:path==='/watch'?url.searchParams.get('v'):path.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
    if(!/^[a-zA-Z0-9_-]{11}$/.test(id||''))return null;
    const start=url.searchParams.get('start')||url.searchParams.get('t')||'',parts=start.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/),seconds=parts?Number(parts[1]||0)*3600+Number(parts[2]||0)*60+Number(parts[3]||0):0;
    return {provider:'youtube',label:'YouTube',url:`https://www.youtube.com/watch?v=${id}`,embed:`https://www.youtube-nocookie.com/embed/${id}?playsinline=1${seconds?`&start=${Math.min(seconds,86400)}`:''}`,portrait:path.startsWith('/shorts/')};
  }
  if(['instagram.com','www.instagram.com'].includes(host)){
    const match=path.match(/^\/(reel|reels|p)\/([a-zA-Z0-9_-]{1,80})\/(?:embed\/?)?$/)||path.match(/^\/(reel|reels|p)\/([a-zA-Z0-9_-]{1,80})$/);
    if(!match)return null;
    const kind=match[1]==='reels'?'reel':match[1],base=`https://www.instagram.com/${kind}/${match[2]}/`;
    return {provider:'instagram',label:'Instagram',url:base,embed:base+'embed/',portrait:true};
  }
  if((raw.startsWith('/')&&!raw.startsWith('//')||raw.startsWith('https://'))&&/\.(?:mp4|webm)$/i.test(path))return {provider:'file',label:'Video',url:raw,embed:raw,portrait:false};
  return null;
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function videoMarkup(value,{title='Video',poster=''}={}) {
  const source=videoSource(value);if(!source)return '';
  const frame=source.provider==='file'?`<video controls playsinline preload="metadata" aria-label="${esc(title)}" src="${esc(source.url)}"${poster?` poster="${esc(poster)}"`:''}></video>`:`<iframe src="${esc(source.embed)}" title="${esc(title)} (${source.label})" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  return `<div class="cms-video cms-video--${source.provider}${source.portrait?' cms-video--portrait':''}" data-cms-video="${source.provider}" data-video-url="${esc(source.url)}"><div class="cms-video__player">${frame}</div><a class="cms-video__source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open ${source.provider==='file'?'video':`on ${source.label}`} ↗</a></div>`;
}
export function mediaChoice({key,typeKey,videoKey,type='image',video='',scope='media',binding='cms'}) {
  const id=`${scope}-${key.replace(/[^a-z0-9_-]/gi,'-')}-choice`;
  return `<div class="cms-media-choice" data-media-choice-field="${esc(key)}"><label for="${id}">Display as</label><select class="site-input" id="${id}" data-${binding}-key="${esc(typeKey)}" data-media-type-control><option value="image"${type!=='video'?' selected':''}>Image</option><option value="video"${type==='video'?' selected':''}>Video</option></select><div data-video-controls${type==='video'?'':' hidden'}><label for="${id}-url">Video link</label><input class="site-input" id="${id}-url" data-${binding}-key="${esc(videoKey)}" value="${esc(video)}" placeholder="YouTube or Instagram Reel URL" data-video-url-control><p class="site-field__hint">Paste a public YouTube / Shorts, Instagram Reel or direct MP4 / WebM link. The image is kept when you switch.</p><button type="button" class="site-button" data-preview-embedded-video>Preview video</button><span data-video-validation role="status"></span></div></div>`;
}
export function bindVideoChoices(panel,{signal}={}) {
  const sync=control=>{const wrapper=control.closest('.cms-media-choice'),video=wrapper.querySelector('[data-media-type-control]').value==='video';wrapper.querySelector('[data-video-controls]').hidden=!video;const image=wrapper.parentElement.querySelector('[data-image-controls]');if(image)image.hidden=video;};
  panel.addEventListener('change',event=>{if(event.target.matches('[data-media-type-control]'))sync(event.target);},{signal});
  panel.addEventListener('click',event=>{
    if(event.defaultPrevented)return;
    const button=event.target.closest('[data-preview-embedded-video]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const wrapper=button.closest('.cms-media-choice'),input=wrapper.querySelector('[data-video-url-control]'),status=wrapper.querySelector('[data-video-validation]');
    const markup=videoMarkup(input.value,{title:'Selected video preview'});if(!markup){status.textContent='Enter a valid YouTube, Instagram Reel or MP4 / WebM URL.';input.focus();return;}status.textContent='';
    const dialog=document.createElement('dialog');dialog.className='site-media-dialog cms-video-dialog';dialog.innerHTML=`<div class="site-media-dialog__head"><strong>Video preview</strong><button type="button" class="site-button" data-close-video>Close</button></div>${markup}`;document.body.append(dialog);dialog.querySelector('[data-close-video]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});signal?.addEventListener('abort',()=>dialog.close(),{once:true});dialog.showModal();
  },{signal});
}
