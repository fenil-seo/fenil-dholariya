import { PROJECT_SECTIONS, PROJECT_FIELDS } from './project-editor-config.js?v=20261005case';

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const safeMedia = value => /^(?:\/(?!\/)|https:\/\/)/i.test(String(value || '').trim()) ? String(value).trim() : '';
const schemaField = {key:'schema_markup',label:'Additional schema markup (JSON-LD)',type:'json',wide:true,hint:'Add one schema object or an array of objects. CreativeWork and breadcrumbs are generated automatically.'};

export async function mountProjectEditor({panel,api,noteDbStatus}) {
  panel.__siteEditorAbort?.abort();
  const controller = new AbortController(), signal = controller.signal;
  panel.__siteEditorAbort = controller;
  const response = await api.admin('projects','list');
  noteDbStatus(response.ok,response.data);
  if (!response.ok) {
    panel.innerHTML = `<div class="site-editor-empty"><h2>Could not load case studies</h2><p>${esc(response.data?.error || 'Please try again.')}</p><button class="site-button" data-case-action="retry">Retry</button></div>`;
    panel.querySelector('button').onclick = ()=>mountProjectEditor({panel,api,noteDbStatus});return;
  }
  const settingsFields = response.data.settings_fields || [];
  const fields = [...PROJECT_FIELDS,...settingsFields.map(f=>({...f,key:`settings:${f.key}`})),schemaField];
  const records = new Map();
  function normalize(item) {
    return Object.fromEntries(fields.map(f=> {
      let value = f.key.startsWith('settings:') ? item.page_settings?.[f.key.slice(9)] : item[f.key];
      if (value==null) value = f.key==='settings:cover.caption' ? item.image_url ? 'Project image' : 'Editorial context photo · Not client photography' : f.default ?? (f.type==='checkbox' ? false : '');
      if (f.type==='metrics') value=(Array.isArray(value)?value:[]).map(m=>`${m.value} | ${m.label}`).join('\n');
      else if (f.type==='json') value=value ? JSON.stringify(value,null,2) : '';
      else if (f.type!=='checkbox') value=String(value);
      return [f.key,value];
    }));
  }
  for(const item of response.data.items || []) {
    const draft=normalize(item);records.set(String(item.id),{id:item.id,draft,saved:{...draft}});
  }
  const state={view:location.hash.split('/')[1]==='seo'?'seo':'content',group:'Overview',mode:'content',device:'desktop',selected:records.has(location.hash.split('/')[2])?location.hash.split('/')[2]:records.keys().next().value,query:'',busy:false,message:'',error:false};
  panel.__siteEditorState=state;
  const current=()=>records.get(state.selected);
  const firstRecordKey=()=>[...records].sort((a,b)=>Number(a[1].saved.sort_order)-Number(b[1].saved.sort_order)||Number(a[1].id || 0)-Number(b[1].id || 0))[0]?.[0];
  const changed=record=>record && (!record.id || Object.keys(record.draft).some(k=>record.draft[k]!==record.saved[k]));
  const path=record=>`/work/${slugify(record?.draft.slug || record?.draft.title)}`;
  function payload(record) {
    const data={page_settings:{}};
    for(const f of fields) {
      const value=record.draft[f.key];
      if(f.key.startsWith('settings:'))data.page_settings[f.key.slice(9)]=value;
      else if(f.type==='metrics') {
        data[f.key]=value.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
          const split=line.indexOf('|');if(split<1 || !line.slice(split+1).trim())throw new Error('Each metric needs a value and label separated by |.');
          return {value:line.slice(0,split).trim(),label:line.slice(split+1).trim()};
        });
      } else if(f.type==='json') {
        try {data[f.key]=value.trim()?JSON.parse(value):null;}catch {throw new Error('Schema markup contains invalid JSON. Format or correct it before saving.');}
        if(data[f.key]!==null && (typeof data[f.key]!=='object' || Array.isArray(data[f.key])&&!data[f.key].every(n=>n&&typeof n==='object'&&!Array.isArray(n))))throw new Error('Schema must be a JSON object or an array of objects.');
      } else data[f.key]=f.type==='number'?Number(value):value;
    }
    if(!data.title.trim())throw new Error('Case study title is required.');
    data.slug=slugify(data.slug || data.title);return data;
  }
  function fieldMarkup(f) {
    const value=current().draft[f.key], id=`case-${f.key.replace(/[^a-z0-9-]/gi,'-')}`;
    const label=`<div class="site-field__label-row"><label for="${id}">${esc(f.label)}${f.required?' *':''}</label>${f.target?`<span class="site-field__counter" data-case-counter="${esc(f.key)}">${value.length} / ${f.target}</span>`:''}</div>`;
    const hint=f.hint || (f.mode==='markup'?'Optional <br>, <span>, <em> and <strong> formatting.':'');
    const key=`data-case-key="${esc(f.key)}"`;
    let control;
    if(f.type==='checkbox')control=`<input id="${id}" type="checkbox" ${key} ${value?'checked':''}>`;
    else if(f.type==='select')control=`<select id="${id}" class="site-input site-select" ${key}>${f.options.map(o=>{const v=typeof o==='string'?o:o.value;return `<option value="${esc(v)}" ${value===v?'selected':''}>${esc(typeof o==='string'?o:o.label)}</option>`;}).join('')}</select>`;
    else if(f.type==='image' || f.type==='video') {
      const url=safeMedia(value);
      control=`<div class="site-media"><div class="site-media__thumb" data-case-media-preview="${esc(f.key)}">${url?f.type==='video'?`<video src="${esc(url)}" preload="metadata" muted playsinline></video>`:`<img src="${esc(url)}" alt="Selected image">`:'<span class="site-media__empty">No media selected</span>'}</div><div class="site-media__details"><p>Choose published media or paste a secure URL.</p><button type="button" class="site-button site-button--orange" data-case-media="${esc(f.key)}">Choose ${f.type==='video'?'video':'image'}</button><button type="button" class="site-button site-button--quiet" data-case-clear="${esc(f.key)}">Clear</button></div></div><input id="${id}" class="site-input" ${key} value="${esc(value)}" placeholder="/assets/media/file or https://...">`;
    } else if(f.type==='richtext')control=`<div class="case-richtext" data-case-rich="${esc(f.key)}"><div class="rte-toolbar"><button type="button" class="rte-btn" data-case-command="bold" title="Bold">B</button><button type="button" class="rte-btn" data-case-command="italic" title="Italic">I</button><button type="button" class="rte-btn" data-case-command="insertUnorderedList">Bullet list</button><button type="button" class="rte-btn" data-case-command="formatBlock">Heading</button><button type="button" class="rte-btn" data-case-command="createLink">Link</button><button type="button" class="rte-btn" data-case-inline-image>Image</button><button type="button" class="rte-btn" data-case-source aria-pressed="false">HTML</button></div><div id="${id}" class="rte-editor" role="textbox" aria-multiline="true" aria-label="${esc(f.label)}" contenteditable="true" ${key}></div><textarea class="site-input site-textarea site-textarea--code" data-case-source-input="${esc(f.key)}" aria-label="${esc(f.label)} HTML" hidden>${esc(value)}</textarea></div>`;
    else if(['textarea','metrics','json'].includes(f.type))control=`<textarea id="${id}" class="site-input site-textarea${f.type==='json'?' site-textarea--code':''}" ${key} rows="${f.type==='json'?12:4}">${esc(value)}</textarea>`;
    else control=`<input id="${id}" class="site-input" ${key} type="${f.type==='number'?'number':'text'}" value="${esc(value)}" ${f.required?'required':''}>`;
    return `<div class="site-field${f.wide?' site-field--wide':''}">${label}${control}${hint?`<p class="site-field__hint">${esc(hint)}</p>`:''}</div>`;
  }
  function toolbar() {
    return `<div class="site-editor-toolbar"><div class="site-editor-toolbar__left">${state.view==='seo'?'<strong>Search &amp; sharing</strong>':`<div class="site-segmented"><button type="button" data-case-mode="content" class="${state.mode==='content'?'is-active':''}">Content</button><button type="button" data-case-mode="preview" class="${state.mode==='preview'?'is-active':''}">Preview</button></div>`}</div><div class="site-editor-toolbar__actions"><span class="site-save-state${changed(current())?' is-dirty':''}" data-case-status role="status"></span><button type="button" class="site-button site-button--quiet" data-case-action="discard">Discard changes</button><button type="button" class="site-button site-button--save" data-case-action="save">Save changes <kbd>Ctrl+S</kbd></button></div></div>`;
  }
  function seoBody() {
    const seo=fields.filter(f=>f.group==='SEO'),search=seo.filter(f=>!f.key.includes('.og')),social=seo.filter(f=>f.key.includes('.og'));
    return `<div class="site-editor-seo"><div class="site-snippet-grid">${['Desktop','Mobile'].map((name,i)=>`<div><span class="site-preview-label">${name} search preview</span><div class="site-search-card${i?' site-search-card--mobile':''}"><div class="site-search-card__source"><span class="site-search-card__favicon">F</span><span><strong>Fenil Dholariya</strong><small data-case-preview-host></small></span></div><div class="site-search-card__title" data-case-preview-title></div><p data-case-preview-description></p></div></div>`).join('')}</div><details class="site-seo-block" open><summary><strong>Search engine</strong><span>Title, snippet and indexing</span></summary><div class="site-fields-grid">${search.map(fieldMarkup).join('')}</div></details><details class="site-seo-block" open><summary><strong>Social sharing</strong><span>Open Graph and X / Twitter</span></summary><div class="site-fields-grid">${social.map(fieldMarkup).join('')}<div class="site-field--wide site-social-card"><div class="site-social-card__image" data-case-social-image></div><div class="site-social-card__body"><span data-case-preview-host></span><strong data-case-social-title></strong><p data-case-social-description></p></div></div></div></details><details class="site-seo-block" open><summary><strong>Schema markup</strong><span>Additional structured data</span></summary><div class="site-schema-start"><p>CreativeWork and breadcrumbs are already generated from the case study. Add only markup that accurately describes this page.</p><div>${['FAQPage','Review','Empty block'].map(name=>`<button type="button" class="site-button" data-case-schema="${name}">+ ${name}</button>`).join('')}</div></div><div class="site-fields-grid">${fieldMarkup(schemaField)}</div><div class="site-schema-actions"><button type="button" class="site-button" data-case-action="format-schema">Format JSON</button></div></details></div>`;
  }
  function body() {
    if(state.view==='seo')return seoBody();
    if(state.mode==='preview')return `<div class="site-live-preview"><div class="site-live-preview__bar"><span>Unsaved page preview</span><div class="site-segmented"><button type="button" data-case-device="desktop" class="${state.device==='desktop'?'is-active':''}">Desktop</button><button type="button" data-case-device="mobile" class="${state.device==='mobile'?'is-active':''}">Mobile</button></div></div><p data-case-preview-status>Rendering your changes...</p><div class="site-live-preview__viewport"><iframe title="Case study draft preview" sandbox="" style="width:100%;height:850px"></iframe></div></div>`;
    const section=PROJECT_SECTIONS.find(s=>s.name===state.group);
    const selected=[...section.fields,...fields.filter(f=>f.group===state.group)];
    return `<div class="site-editor-card__body"><div class="site-editor-section-head"><span class="site-editor-section-head__number">Section ${PROJECT_SECTIONS.indexOf(section)+1} of ${PROJECT_SECTIONS.length}</span><h2>${esc(section.name)}</h2><p>${esc(section.description)}</p></div><fieldset class="case-fields site-fields-grid" ${state.busy?'disabled':''}>${selected.map(fieldMarkup).join('')}</fieldset></div>`;
  }
  function list() {
    const sorted=[...records].sort((a,b)=>Number(a[1].saved.sort_order)-Number(b[1].saved.sort_order)||Number(a[1].id || 0)-Number(b[1].id || 0));
    return sorted.filter(([,r])=>`${r.draft.title} ${r.draft.client} ${r.draft.category} ${r.draft.slug}`.toLowerCase().includes(state.query.toLowerCase())).map(([key,r])=>`<button type="button" class="case-record${state.selected===key?' is-active':''}" data-case-select="${esc(key)}" aria-pressed="${state.selected===key}"><strong>${esc(r.draft.title || 'New case study')}</strong><span>${esc(r.draft.category || 'Case study')}</span><small>${!r.id?'Not saved':changed(r)?'Unsaved changes':r.draft.featured?'Home highlight':'Published'}</small></button>`).join('') || '<p class="case-list-empty">No case studies found.</p>';
  }
  function render() {
    const record=current();
    panel.innerHTML=`<div class="case-workspace"><div class="site-editor-heading"><h1>Case studies</h1><p>Edit each project’s Work card, case study content, media and search appearance.</p><button type="button" class="site-button" data-case-action="work">Work page editor</button></div><div class="case-collection"><div class="case-collection__head"><strong>Case studies <span>${records.size}</span></strong><button type="button" class="site-button site-button--orange" data-case-action="add">+ Add case study</button></div><label class="case-search">Search case studies<input class="site-input" data-case-search value="${esc(state.query)}" placeholder="Title, client, industry or slug"></label><nav class="case-records" aria-label="Case studies">${list()}</nav></div>${record?`<div class="case-current"><div><h2 data-case-title>${esc(record.draft.title || 'New case study')}</h2><p data-case-path>${esc(path(record))}</p></div><div class="case-current__actions">${record.id?`<a class="site-button" href="${esc(path({draft:record.saved}))}" target="_blank" rel="noopener">View published page ↗</a>`:''}<button type="button" class="site-button case-delete" data-case-action="delete">${record.id?'Delete case study':'Remove unsaved case'}</button></div></div><div class="site-editor-views"><button type="button" data-case-view="content" class="${state.view==='content'?'is-active':''}">Content</button><button type="button" data-case-view="seo" class="${state.view==='seo'?'is-active':''}">SEO</button></div><div class="site-editor-layout${state.view==='seo'?' site-editor-layout--seo':''}">${state.view==='content'?`<aside class="site-editor-sections"><div class="site-editor-sections__head"><strong>Sections</strong><span>${PROJECT_SECTIONS.length}</span></div><nav aria-label="Case study sections">${PROJECT_SECTIONS.map((section,i)=>`<button type="button" class="site-editor-section${state.group===section.name?' is-active':''}" data-case-section="${esc(section.name)}" aria-current="${state.group===section.name?'true':'false'}"><span class="site-editor-section__number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(section.name)}</strong><small>Section ${i+1}</small></span></button>`).join('')}</nav></aside>`:''}<div class="site-editor-card">${toolbar()}${body()}</div></div>`:'<div class="site-editor-empty"><h2>Add your first case study</h2><p>Start with a title and client context, then add the story, media and search appearance.</p></div>'}</div>`;
    panel.querySelectorAll('[data-case-rich]').forEach(wrapper=>{
      const editor=wrapper.querySelector('[contenteditable]');editor.innerHTML=safeRich(current().draft[wrapper.dataset.caseRich]);
    });
    if (matchMedia('(max-width:620px)').matches) {
      const active=panel.querySelector('.site-editor-section.is-active');
      if(active)active.parentElement.scrollLeft=active.offsetLeft-active.parentElement.offsetLeft;
    }
    updateStatus();updatePreviews();
    if(record && state.view==='content' && state.mode==='preview')loadPreview();
  }
  function safeRich(html) {
    const doc=new DOMParser().parseFromString(html,'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,svg,math,link,meta').forEach(el=>el.remove());
    doc.body.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(a.name.startsWith('on') || a.name==='srcdoc' || ['src','href'].includes(a.name)&&!(/^(?:\/(?!\/)|https?:\/\/|mailto:|#)/i.test(a.value)))el.removeAttribute(a.name);}));
    return doc.body.innerHTML;
  }
  function updateStatus() {
    const el=panel.querySelector('[data-case-status]');if(!el)return;
    el.textContent=state.message || (changed(current())?'Unsaved changes':'All changes saved');el.classList.toggle('is-error',state.error);el.classList.toggle('is-dirty',changed(current()));
    panel.querySelector('[data-case-action="save"]').disabled=state.busy || !changed(current());
    panel.querySelector('[data-case-action="discard"]').disabled=state.busy || !changed(current());
    panel.querySelectorAll('[data-case-action="add"],[data-case-action="delete"],[data-case-select],[data-case-view],[data-case-section],[data-case-mode]').forEach(el=>el.disabled=state.busy);
    panel.querySelectorAll('input[data-case-key],select[data-case-key],textarea[data-case-key],[data-case-source-input]').forEach(el=>el.disabled=state.busy);
    panel.querySelectorAll('[contenteditable]').forEach(el=>el.contentEditable=String(!state.busy));
    panel.querySelectorAll('[data-case-media],[data-case-clear],[data-case-command],[data-case-source],[data-case-inline-image],[data-case-schema],[data-case-action="format-schema"]').forEach(el=>el.disabled=state.busy);
  }
  function updatePreviews() {
    if(!current())return;const d=current().draft;
    const title=d['settings:seo.title'] || `${d.title || 'Untitled case study'} - Fenil Dholariya`,description=d['settings:seo.description'] || d.desc;
    let host=location.host;try{host=new URL(d['settings:seo.canonical'] || location.origin+path(current())).host;}catch{}
    panel.querySelectorAll('[data-case-preview-title]').forEach(el=>el.textContent=title);panel.querySelectorAll('[data-case-preview-description]').forEach(el=>el.textContent=description || 'A search engine may choose text from the page.');panel.querySelectorAll('[data-case-preview-host]').forEach(el=>el.textContent=host);
    const titleEl=panel.querySelector('[data-case-social-title]'),descEl=panel.querySelector('[data-case-social-description]');
    if(titleEl)titleEl.textContent=d['settings:seo.ogTitle'] || title;if(descEl)descEl.textContent=d['settings:seo.ogDescription'] || description;
    const builtin={'d2c-silver-jewellery':'case-d2c-jewellery','local-construction-gmb':'case-local-construction','b2b-saas-pipeline':'case-b2b-saas','ayurvedic-technical-seo':'case-ayurveda'}[d.slug];
    const image=safeMedia(d['settings:seo.ogImage']) || safeMedia(d.image_url) || (builtin?`/assets/media/${builtin}.webp`:'/assets/og.png');
    const imageEl=panel.querySelector('[data-case-social-image]');if(imageEl)imageEl.innerHTML=`<img src="${esc(image)}" alt="Social sharing preview">`;
  }
  let previewSequence=0;
  async function loadPreview() {
    const sequence=++previewSequence,selected=state.selected,iframe=panel.querySelector('iframe');
    try {
      const response=await api.admin('projects','preview',{id:current().id,data:payload(current())});
      if(sequence!==previewSequence || state.selected!==selected || !iframe.isConnected)return;
      if(!response.ok)throw new Error(response.data?.error || 'Could not render preview.');
      iframe.srcdoc=response.data.html;sizePreview();panel.querySelector('[data-case-preview-status]').textContent='Includes unsaved content and the current shared footer. Links are disabled.';
    } catch(error) {if(sequence===previewSequence && iframe.isConnected)panel.querySelector('[data-case-preview-status]').textContent=error.message;}
  }
  function sizePreview() {const iframe=panel.querySelector('iframe');if(iframe){const width=iframe.parentElement.clientWidth,base=state.device==='mobile'?390:1280;iframe.style.width=`${base}px`;iframe.style.transform=`scale(${Math.min(1,width/base)})`;iframe.parentElement.style.height=`${850*Math.min(1,width/base)}px`;}}
  function hash(){history.replaceState(null,'',`#projects/${state.view}/${state.selected || ''}`);}
  function captureInput(el) {
    if(!current())return;
    const key=el.dataset.caseKey || el.dataset.caseSourceInput;if(!key)return;
    current().draft[key]=el.type==='checkbox'?el.checked:el.isContentEditable?el.innerHTML:el.value;state.message='';state.error=false;
    const counter=panel.querySelector(`[data-case-counter="${key}"]`);if(counter)counter.textContent=`${String(current().draft[key]).length} / ${fields.find(f=>f.key===key).target}`;
    if(key==='title' || key==='slug'){panel.querySelector('[data-case-title]').textContent=current().draft.title || 'New case study';panel.querySelector('[data-case-path]').textContent=path(current());}
    panel.querySelector('.case-records').innerHTML=list();
    const thumb=panel.querySelector(`[data-case-media-preview="${key}"]`);if(thumb){const url=safeMedia(current().draft[key]);thumb.innerHTML=url?fields.find(f=>f.key===key).type==='video'?`<video src="${esc(url)}" preload="metadata" muted playsinline></video>`:`<img src="${esc(url)}" alt="Selected image">`:'<span class="site-media__empty">No media selected</span>';}
    updateStatus();updatePreviews();
  }
  panel.addEventListener('input',event=>captureInput(event.target),{signal});
  panel.addEventListener('change',event=>captureInput(event.target),{signal});
  panel.addEventListener('mousedown',event=>{if(event.target.closest('[data-case-command],[data-case-inline-image],[data-case-source]'))event.preventDefault();},{signal});
  panel.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button || button.disabled)return;
    if(button.dataset.caseSelect){state.selected=button.dataset.caseSelect;state.message='';state.error=false;hash();render();return;}
    if(button.dataset.caseSection){state.group=button.dataset.caseSection;state.mode='content';render();return;}
    if(button.dataset.caseView){state.view=button.dataset.caseView;hash();render();return;}
    if(button.dataset.caseMode){state.mode=button.dataset.caseMode;render();return;}
    if(button.dataset.caseDevice){state.device=button.dataset.caseDevice;panel.querySelectorAll('[data-case-device]').forEach(b=>b.classList.toggle('is-active',b===button));sizePreview();return;}
    if(button.dataset.caseMedia){await openMedia(button.dataset.caseMedia);return;}
    if(button.hasAttribute('data-case-inline-image')){const rich=button.closest('[data-case-rich]');await openMedia(rich.dataset.caseRich,true);return;}
    if(button.dataset.caseClear){setValue(button.dataset.caseClear,'');return;}
    if(button.hasAttribute('data-case-source')){
      const wrapper=button.closest('[data-case-rich]'),editor=wrapper.querySelector('[contenteditable]'),source=wrapper.querySelector('textarea'),toSource=source.hidden;
      if(toSource)source.value=current().draft[wrapper.dataset.caseRich];else editor.innerHTML=safeRich(source.value);
      editor.hidden=toSource;source.hidden=!toSource;button.setAttribute('aria-pressed',String(toSource));return;
    }
    if(button.dataset.caseCommand){const editor=button.closest('[data-case-rich]').querySelector('[contenteditable]');if(editor.hidden)return;editor.focus();const command=button.dataset.caseCommand;let value=command==='formatBlock'?'h3':null;if(command==='createLink'){value=prompt('Link URL (HTTPS or a site path)');if(!value || !/^(?:https:\/\/|\/(?!\/))/i.test(value))return;}document.execCommand(command,false,value);captureInput(editor);return;}
    if(button.dataset.caseSchema){
      let nodes;try{const raw=current().draft.schema_markup;nodes=raw.trim()?JSON.parse(raw):[];nodes=Array.isArray(nodes)?nodes:[nodes];}catch{state.message='Correct the existing JSON before adding a block.';state.error=true;updateStatus();return;}
      const type=button.dataset.caseSchema,template={'@context':'https://schema.org','@type':type==='Empty block'?'':type};if(type==='FAQPage')template.mainEntity=[];if(type==='Review')template.itemReviewed={'@type':'CreativeWork',name:current().draft.title,url:location.origin+path(current())};nodes.push(template);setValue('schema_markup',JSON.stringify(nodes,null,2));return;
    }
    const action=button.dataset.caseAction;
    if(action==='work'){document.dispatchEvent(new CustomEvent('site:open-page',{detail:{page:'work'}}));return;}
    if(action==='add'){const key=`new-${Date.now()}`;const draft=normalize({title:'',slug:'',metrics:[],viz:'network',accent:'violet',featured:true,sort_order:records.size});records.set(key,{draft,saved:{...draft}});state.selected=key;state.view='content';state.group='Overview';state.mode='content';state.query='';state.message='';hash();render();panel.querySelector('[data-case-key="title"]').focus();return;}
    if(action==='discard'){const record=current();if(record.id)record.draft={...record.saved};else records.delete(state.selected);if(!records.has(state.selected))state.selected=firstRecordKey();state.message='';hash();render();return;}
    if(action==='save'){await save();return;}
    if(action==='format-schema'){try{const raw=current().draft.schema_markup;setValue('schema_markup',raw.trim()?JSON.stringify(JSON.parse(raw),null,2):'');}catch{state.message='Schema markup contains invalid JSON.';state.error=true;updateStatus();}return;}
    if(action==='delete'){
      const record=current();if(!confirm(record.id?'Delete this case study and remove its public page? This cannot be undone.':'Remove this unsaved case study?'))return;
      if(record.id){state.busy=true;updateStatus();const result=await api.admin('projects','delete',{id:record.id});state.busy=false;if(!result.ok){state.message=result.data?.error || 'Delete failed.';state.error=true;updateStatus();return;}window.dispatchEvent(new Event('site:projects-changed'));}
      records.delete(state.selected);state.selected=firstRecordKey();state.message='';hash();render();
    }
  },{signal});
  function setValue(key,value){current().draft[key]=value;const el=panel.querySelector(`[data-case-key="${key}"]`);if(el){el.value=value;captureInput(el);}else{state.message='';updateStatus();}}
  async function save() {
    if(state.busy || !current() || !changed(current()))return;
    let data;try{data=payload(current());}catch(error){state.message=error.message;state.error=true;updateStatus();return;}
    const record=current(),oldKey=state.selected;state.busy=true;state.message='Saving...';state.error=false;render();
    try {
      const result=await api.admin('projects',record.id?'update':'create',{id:record.id,data});if(!result.ok || !result.data?.item)throw new Error(result.data?.error || 'Save failed.');
      const item=result.data.item,draft=normalize(item);records.delete(oldKey);state.selected=String(item.id);records.set(state.selected,{id:item.id,draft,saved:{...draft}});state.message='All changes saved';window.dispatchEvent(new Event('site:projects-changed'));hash();
    }catch(error){state.message=error.message;state.error=true;}finally{state.busy=false;render();}
  }
  let media=[];
  async function openMedia(key,inline=false){
    const rich=inline?panel.querySelector(`[data-case-rich="${key}"]`):null;
    const editor=rich?.querySelector('[contenteditable]'),source=rich?.querySelector('textarea');
    const selection=getSelection(),range=inline && selection.rangeCount && editor.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null;
    const sourceStart=source?.selectionStart,sourceEnd=source?.selectionEnd;
    if(!media.length){try{const response=await fetch('/assets/media-index.json');if(response.ok){const index=await response.json();media=(Array.isArray(index)?index:index.items || []).map(m=>({...m,url:m.path || m.url})).filter(m=>m.url && !/\/assets\/gallery\//i.test(m.url));}}catch{}}
    if(signal.aborted)return;
    const video=fields.find(f=>f.key===key)?.type==='video';
    const dialog=document.createElement('dialog');dialog.className='site-media-dialog';dialog.innerHTML=`<div class="site-media-dialog__head"><div><strong>Choose ${video?'video':'image'}</strong><p>Published assets available on this website.</p></div><button type="button" class="site-media-dialog__close" aria-label="Close media picker">×</button></div><label class="site-media-dialog__search">Search media<input class="site-input" placeholder="Search file name"></label><div class="site-media-dialog__list"></div><div class="site-media-dialog__foot">To use a new file, publish it in /assets/media or host it, then paste its HTTPS URL.</div>`;document.body.append(dialog);
    const draw=query=>{const filtered=media.filter(m=>(video?m.type==='video':m.type==='image') && `${m.name} ${m.url}`.toLowerCase().includes(query.toLowerCase()));dialog.querySelector('.site-media-dialog__list').innerHTML=filtered.map(m=>`<button type="button" class="site-media-option" data-media-url="${esc(m.url)}">${video?'<span class="site-media-option__video">Video</span>':`<img src="${esc(m.url)}" alt="" loading="lazy">`}<span>${esc(m.name)}</span></button>`).join('') || '<p>No matching media. You can paste a published URL in the field.</p>';};draw('');
    dialog.querySelector('input').oninput=event=>draw(event.target.value);dialog.querySelector('.site-media-dialog__close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.addEventListener('click',event=>{const option=event.target.closest('[data-media-url]');if(!option)return;
      if(inline){
        const markup=`<img src="${esc(option.dataset.mediaUrl)}" alt="">`;
        if(!source.hidden){source.setRangeText(markup,sourceStart,sourceEnd,'end');captureInput(source);}
        else {editor.focus();const insertion=range || document.createRange();if(!range){insertion.selectNodeContents(editor);insertion.collapse(false);}selection.removeAllRanges();selection.addRange(insertion);document.execCommand('insertHTML',false,markup);captureInput(editor);}
      }else setValue(key,option.dataset.mediaUrl);
      dialog.close();
    });dialog.showModal();
  }
  panel.addEventListener('input',event=>{if(event.target.hasAttribute('data-case-search')){state.query=event.target.value;panel.querySelector('.case-records').innerHTML=list();}},{signal});
  window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&panel.classList.contains('is-active')){event.preventDefault();save();}},{signal});
  window.addEventListener('beforeunload',event=>{if([...records.values()].some(changed)){event.preventDefault();event.returnValue='';}},{signal});
  window.addEventListener('resize',sizePreview,{signal});
  controller.signal.addEventListener('abort',()=>document.querySelectorAll('.site-media-dialog').forEach(dialog=>dialog.close()),{once:true});
  render();hash();
}
