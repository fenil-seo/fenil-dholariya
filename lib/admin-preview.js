import { load } from 'cheerio';

export function previewHtml(html, selector = '') {
  const $ = load(html);
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
  return $.html();
}
