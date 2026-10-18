import {mediaChoice,bindVideoChoices} from './video-media.js?v=20261018media';
export const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeMedia=value=>/^(?:\/(?!\/)|https:\/\/)/i.test(String(value || '').trim())?String(value).trim():'';
export function fieldMarkup(field,value,scope='record',values={}) {
  if(field.hidden)return '';
  const id=`cms-${scope}-${field.key}`,key=`data-cms-key="${esc(field.key)}"`;
  let control;
  if(field.type==='checkbox')control=`<input type="checkbox" id="${id}" ${key} ${value?'checked':''}>`;
  else if(field.type==='select')control=`<select class="site-input site-select" id="${id}" ${key}>${field.options.map(o=>{const v=typeof o==='object'?o.value:o;return `<option value="${esc(v)}" ${value===v?'selected':''}>${esc(typeof o==='object'?o.label:o)}</option>`;}).join('')}</select>`;
  else if(['image','video'].includes(field.type))control=`<div class="site-media"><div class="site-media__thumb" data-cms-thumb="${field.key}">${mediaMarkup(value,field.type)}</div><div class="site-media__details"><p>Use published media or a hosted HTTPS URL.</p><button type="button" class="site-button site-button--orange" data-cms-media="${field.key}">Choose ${field.type}</button><button type="button" class="site-button site-button--quiet" data-cms-clear="${field.key}">Clear</button></div></div><input class="site-input" id="${id}" ${key} value="${esc(value)}" placeholder="/assets/file or https://...">`;
  else if(field.type==='richtext')control=`<div class="case-richtext" data-cms-rich="${field.key}"><div class="rte-toolbar"><button type="button" class="rte-btn" data-cms-command="bold" title="Bold">B</button><button type="button" class="rte-btn" data-cms-command="italic" title="Italic">I</button><button type="button" class="rte-btn" data-cms-command="formatBlock">Heading</button><button type="button" class="rte-btn" data-cms-command="insertUnorderedList">Bullet list</button><button type="button" class="rte-btn" data-cms-command="createLink">Link</button><button type="button" class="rte-btn" data-cms-inline-image>Image</button><button type="button" class="rte-btn" data-cms-html aria-pressed="false">HTML</button></div><div id="${id}" role="textbox" aria-label="${esc(field.label)}" aria-multiline="true" class="rte-editor" contenteditable="true" ${key}></div><textarea class="site-input site-textarea--code" data-cms-source="${field.key}" aria-label="${esc(field.label)} HTML" hidden>${esc(value)}</textarea></div>`;
  else if(['textarea','json'].includes(field.type))control=`<textarea class="site-input site-textarea${field.type==='json'?' site-textarea--code':''}" id="${id}" ${key} rows="${field.type==='json'?12:4}">${esc(value)}</textarea>`;
  else control=`<input class="site-input" type="${field.type==='number'?'number':field.type==='date'?'date':'text'}" id="${id}" ${key} value="${esc(value)}" ${field.readonly?'readonly':''}>`;
  if(field.mediaTypeKey)control=mediaChoice({key:field.key,typeKey:field.mediaTypeKey,videoKey:field.mediaVideoKey,type:values[field.mediaTypeKey]||'image',video:values[field.mediaVideoKey]||'',scope:`cms-${scope}`})+`<div data-image-controls${values[field.mediaTypeKey]==='video'?' hidden':''}>${control}</div>`;
  return `<div class="site-field${field.wide || ['richtext','textarea','image','video','json'].includes(field.type)?' site-field--wide':''}"><div class="site-field__label-row"><label for="${id}">${esc(field.label)}${field.required?' *':''}</label>${field.target?`<span class="site-field__counter" data-cms-counter="${field.key}">${String(value).length} / ${field.target}</span>`:''}</div>${control}${field.hint?`<p class="site-field__hint">${esc(field.hint)}</p>`:''}</div>`;
}
function mediaMarkup(value,type){const url=safeMedia(value);return url?type==='video'?`<video src="${esc(url)}" preload="metadata" muted playsinline></video>`:`<img src="${esc(url)}" alt="Selected image" loading="lazy">`:'<span class="site-media__empty">No media selected</span>';}
function safeRich(value){const doc=new DOMParser().parseFromString(value,'text/html');doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,svg,math,link,meta').forEach(el=>el.remove());doc.body.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(a.name.startsWith('on') || a.name==='srcdoc' || ['src','href'].includes(a.name)&&!(/^(?:\/(?!\/)|https?:\/\/|mailto:|#)/i.test(a.value)))el.removeAttribute(a.name);}));return doc.body.innerHTML;}
export function initializeRichControls(panel,draft){panel.querySelectorAll('[data-cms-rich]').forEach(w=>w.querySelector('[contenteditable]').innerHTML=safeRich(draft[w.dataset.cmsRich] || ''));}
let mediaLibrary;
export function bindControls({panel,fields,draft,onChange,signal,allowGallery=false}) {
  bindVideoChoices(panel,{signal});
  const set=(key,value)=>{draft()[key]=value;const el=panel.querySelector(`[data-cms-key="${key}"]`);if(el && !el.isContentEditable)el.value=value;
    const thumb=panel.querySelector(`[data-cms-thumb="${key}"]`);if(thumb)thumb.innerHTML=mediaMarkup(value,fields.find(f=>f.key===key)?.type);
    const counter=panel.querySelector(`[data-cms-counter="${key}"]`);if(counter)counter.textContent=`${String(value).length} / ${fields.find(f=>f.key===key).target}`;onChange(key);};
  const input=event=>{const el=event.target,key=el.dataset.cmsKey || el.dataset.cmsSource;if(!key)return;set(key,el.type==='checkbox'?el.checked:el.isContentEditable?el.innerHTML:el.value);};
  panel.addEventListener('input',input,{signal});panel.addEventListener('change',input,{signal});
  panel.addEventListener('mousedown',e=>{if(e.target.closest('[data-cms-command],[data-cms-inline-image],[data-cms-html]'))e.preventDefault();},{signal});
  panel.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button || button.disabled)return;
    if(button.dataset.cmsClear){set(button.dataset.cmsClear,'');return;}
    const rich=button.closest('[data-cms-rich]'),editor=rich?.querySelector('[contenteditable]'),source=rich?.querySelector('textarea');
    if(button.hasAttribute('data-cms-html')){const toSource=source.hidden;if(toSource)source.value=draft()[rich.dataset.cmsRich];else editor.innerHTML=safeRich(source.value);editor.hidden=toSource;source.hidden=!toSource;button.setAttribute('aria-pressed',String(toSource));return;}
    if(button.dataset.cmsCommand){if(editor.hidden)return;editor.focus();let value=button.dataset.cmsCommand==='formatBlock'?'h3':null;if(button.dataset.cmsCommand==='createLink'){value=prompt('Link URL (HTTPS or a site path)');if(!value || !/^(?:https:\/\/|\/(?!\/))/i.test(value))return;}document.execCommand(button.dataset.cmsCommand,false,value);set(rich.dataset.cmsRich,editor.innerHTML);return;}
    if(!button.dataset.cmsMedia && !button.hasAttribute('data-cms-inline-image'))return;
    const key=button.dataset.cmsMedia || rich.dataset.cmsRich,inline=Boolean(rich),selectedDraft=draft(),selection=getSelection(),range=inline && selection.rangeCount && editor.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null,start=source?.selectionStart,end=source?.selectionEnd;
    if(!mediaLibrary){try{const response=await fetch('/assets/media-index.json');if(response.ok)mediaLibrary=await response.json();}catch{}}
    if(signal.aborted || draft()!==selectedDraft || !panel.classList.contains('is-active'))return;
    const video=fields.find(f=>f.key===key)?.type==='video',dialog=document.createElement('dialog');dialog.className='site-media-dialog';
    dialog.innerHTML=`<div class="site-media-dialog__head"><div><strong>Choose ${video?'video':'image'}</strong><p>Published media on this website.</p></div><button type="button" class="site-media-dialog__close" aria-label="Close media picker">×</button></div><label class="site-media-dialog__search">Search media<input class="site-input" type="search" placeholder="Search file name"></label><div class="site-media-dialog__list"></div><div class="site-media-dialog__foot">Publish new files in assets or host them, then paste their HTTPS URL.</div>`;document.body.append(dialog);
    const render=query=>{const items=(Array.isArray(mediaLibrary)?mediaLibrary:[]).filter(m=>m.type===(video?'video':'image') && (allowGallery || !m.path.startsWith('/assets/gallery/')) && `${m.name} ${m.path}`.toLowerCase().includes(query.toLowerCase()));dialog.querySelector('.site-media-dialog__list').innerHTML=items.map(m=>`<button type="button" class="site-media-option" data-cms-choice="${esc(m.path)}">${video?'<span class="site-media-option__video">Video</span>':`<img src="${esc(m.path)}" alt="" loading="lazy">`}<span>${esc(m.name)}</span></button>`).join('') || '<p>No matching media. You can paste a published URL in the field.</p>';};
    render('');dialog.querySelector('input').oninput=e=>render(e.target.value);dialog.querySelector('.site-media-dialog__close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.addEventListener('click',e=>{const choice=e.target.closest('[data-cms-choice]');if(!choice)return;
      if(inline){const markup=`<img src="${esc(choice.dataset.cmsChoice)}" alt="">`;if(!source.hidden){source.setRangeText(markup,start,end,'end');set(key,source.value);}else{editor.focus();const target=range || document.createRange();if(!range){target.selectNodeContents(editor);target.collapse(false);}selection.removeAllRanges();selection.addRange(target);document.execCommand('insertHTML',false,markup);set(key,editor.innerHTML);}}
      else set(key,choice.dataset.cmsChoice);dialog.close();
    });dialog.showModal();signal.addEventListener('abort',()=>dialog.close(),{once:true});
  },{signal});
  return {set};
}
