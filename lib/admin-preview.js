import { load } from 'cheerio';
import {esc} from './search.js';

export function previewHtml(html, selector = '', {focus=false}={}) {
  const $ = load(html);
  // Page previews stay scriptless. Provider playback is available through the
  // media control's dedicated Preview video dialog in the admin workspace.
  $('[data-cms-video]').each((_,node)=>{const el=$(node),provider=el.attr('data-cms-video');el.html(`<div class="cms-video__player cms-preview-video"><strong>${esc(provider==='youtube'?'YouTube video':provider==='instagram'?'Instagram Reel':'Video')}</strong>Video replaces this image. Use Preview video in the media control to play it.</div>`);});
  $('script,form,iframe,noscript,#loader,.cursor-dot,.cursor-ring').remove();
  $('html').removeClass('is-loading');$('a').removeAttr('href');
  $('.reveal,.reveal-line,[data-enter]').addClass('is-in is-entered').css('opacity','1').css('visibility','visible').css('transform','none');
  $('meta[name="robots"]').attr('content','noindex, nofollow');
  if($('body').attr('data-page')==='about'){
    const target=selector?$(selector).first():null;
    const id=target?.closest('.experience-panel').attr('id') || target?.closest('[data-panel]').attr('data-panel') || 'discipline-search';
    $('.about-disciplines .experience-panel').each((_,node)=>{const active=$(node).attr('id')===id;$(node).attr('hidden',active?null:'').toggleClass('is-active',active);if(active)$(node).css('display','block');});
    $('.about-disciplines [data-panel]').each((_,node)=>$(node).attr('aria-pressed',String($(node).attr('data-panel')===id)));
  }
  if(focus&&selector){
    const target=$(selector).first();
    if(target.length){
      if(target.is('#nav'))$('main,footer').remove();
      else{target.remove();$('main').empty().append(target);$('footer,#nav,.brand-intro,.scroll-progress,.back-to-top').remove();$('main').css('padding-top','24px');}
    }
  }
  return $.html();
}
