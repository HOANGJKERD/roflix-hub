/* RoFlix Pro V2 UI enhancements: player/detail/recommendations/source labels. */
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const sourceName = (sid) => sid === 'vsmov' ? 'VSMOV' : 'KKPhim';

  function renderRecoCards(containerId, movies) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!movies?.length) { el.innerHTML = '<div class="rf-empty-state">Chưa có đề xuất phù hợp.</div>'; return; }
    el.innerHTML = movies.slice(0, 10).map(m => `
      <article class="rf-reco-card" onclick="viewMovieDetail('${String(m.slug || '').replace(/'/g, "\\'")}', '${m._src || ''}')">
        <div class="rf-reco-poster"><img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy" onerror="this.src='https://placehold.co/220x330/10131d/f59e0b?text=RoFlix'"><span class="rf-reco-play"><i class="fa-solid fa-play"></i></span></div>
        <div class="rf-reco-body"><h4>${esc(m.title)}</h4><p><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')} · ${esc(m.year || '')}</p><button type="button" onclick="event.stopPropagation(); playMovie('${String(m.slug || '').replace(/'/g, "\\'")}', '${m._src || ''}')">Xem phim</button></div>
      </article>`).join('');
  }
  async function getRecommendations(excludeSlug) {
    try { if (typeof fetchRecoPool !== 'function') return []; const pool = await fetchRecoPool(); const signals = typeof getRecoSignals === 'function' ? getRecoSignals() : {watched:new Set()}; return pool.filter(m => m.slug && m.slug !== excludeSlug).map(m => ({m,score:typeof scoreMovie === 'function' ? scoreMovie(m,signals) : (parseFloat(m.rating)||0)})).sort((a,b)=>b.score-a.score).map(x=>x.m).filter(m=>!signals.watched?.has?.(m.slug)); } catch(e) { console.debug('[RoFlix V2] recommendation skipped',e); return []; }
  }
  async function renderDetailRecommendations() { const slug=window.currentSlug||''; const row=document.getElementById('detail-reco-row'); if(!row)return; row.innerHTML='<div class="rf-loading-line">Đang tìm phim bạn có thể thích...</div>'; renderRecoCards('detail-reco-row',await getRecommendations(slug)); }
  async function renderPlayerRecommendations() { const slug=window.currentSlug||''; const row=document.getElementById('play-reco-row'); if(!row)return; row.innerHTML='<div class="rf-loading-line">Đang tìm phim bạn có thể xem tiếp...</div>'; renderRecoCards('play-reco-row',await getRecommendations(slug)); }
  function updatePlayerMeta() { const movie=window.currentMovieData||{}; const title=document.getElementById('playing-title'),origin=document.getElementById('playing-origin'),summary=document.getElementById('playing-summary'),source=document.getElementById('playing-source'),poster=document.getElementById('playing-poster'); if(title&&movie.title)title.textContent=movie.title; if(origin)origin.textContent=movie.origin_name||''; if(summary)summary.textContent=movie.summary||'Chưa có tóm tắt cho phim này.'; if(source)source.textContent=sourceName(movie._src||window.currentSourceId); if(poster){poster.src=movie.poster||'';poster.alt=movie.title||'RoFlix';} }
  function ensureMovieStateGlobals(){try{if(!Object.prototype.hasOwnProperty.call(window,'currentSlug'))Object.defineProperty(window,'currentSlug',{get:()=>currentSlug});if(!Object.prototype.hasOwnProperty.call(window,'currentMovieData'))Object.defineProperty(window,'currentMovieData',{get:()=>currentMovieData});if(!Object.prototype.hasOwnProperty.call(window,'currentSourceId'))Object.defineProperty(window,'currentSourceId',{get:()=>currentSourceId});}catch(_){} }
  const originalView=window.viewMovieDetail; if(typeof originalView==='function'){window.viewMovieDetail=async function(){const result=await originalView.apply(this,arguments);ensureMovieStateGlobals();setTimeout(renderDetailRecommendations,80);return result;};}
  const originalPlay=window.playMovieByIndex; if(typeof originalPlay==='function'){window.playMovieByIndex=function(){const result=originalPlay.apply(this,arguments);setTimeout(()=>{updatePlayerMeta();renderPlayerRecommendations();if(typeof window.rfMovieCommentsRender==='function')window.rfMovieCommentsRender(window.currentSlug||currentSlug,window.currentMovieTitle||currentMovieTitle);},100);return result;};}
  window.rfRefreshDetailRecommendations=renderDetailRecommendations;
  window.rfRefreshPlayerRecommendations=renderPlayerRecommendations;
  document.addEventListener('DOMContentLoaded',()=>{ensureMovieStateGlobals();setTimeout(()=>{const note=document.getElementById('source-note');if(note)note.textContent='KKPhim là nguồn chính · VSMOV là nguồn phụ';},0);});

  /* Load the isolated header menu after the base header exists. */
  function loadRoFlixHeaderMenu(){
    if(document.getElementById('roflix-header-menu-script')) return;
    const s=document.createElement('script');
    s.id='roflix-header-menu-script';
    s.src='js/features/header-hamburger.js?v=4';
    s.async=false;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadRoFlixHeaderMenu,{once:true}); else loadRoFlixHeaderMenu();
})();
