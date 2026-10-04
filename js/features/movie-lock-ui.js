/* RoFlix locked movie poster UI: detects 18+ source categories and renders a login lock button. */
(function(){
  'use strict';
  if(window.__rfMovieLockUI)return; window.__rfMovieLockUI=true;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const cache=new Map();
  const SOURCES={
    kkphim:'https://phimapi.com',
    vsmov:'https://vsmov.com/api'
  };
  function is18(values){
    const flat=[];
    const walk=v=>{
      if(Array.isArray(v)) return v.forEach(walk);
      if(v&&typeof v==='object') return Object.values(v).forEach(walk);
      if(v!=null) flat.push(String(v).toLowerCase());
    };
    walk(values);
    return flat.some(v=>/\b18\s*\+\b|18plus|adult|người lớn|nguoi lon|hentai/.test(v));
  }
  async function detail(slug,source){
    const sid=source==='vsmov'?'vsmov':'kkphim';
    const key=sid+':'+slug;
    if(cache.has(key))return cache.get(key);
    const p=(async()=>{
      try{
        const base=SOURCES[sid];
        const url=sid==='kkphim'?base+'/phim/'+encodeURIComponent(slug):base+'/phim/'+encodeURIComponent(slug);
        const r=await fetch(url,{cache:'no-store'});
        if(!r.ok)return null;
        const d=await r.json();
        return d?.movie||d?.data||d||null;
      }catch(_){return null}
    })();
    cache.set(key,p); return p;
  }
  async function adminOverride(slug,source){
    try{
      const sb=window.rfSupabase;if(!sb)return null;
      const r=await sb.from('roflix_movie_overrides').select('locked,hidden').eq('source_id',source||'kkphim').eq('movie_slug',slug).maybeSingle();
      return r.data||null;
    }catch(_){return null}
  }
  async function markCard(card){
    if(!card||card.dataset.rfLockChecked==='1')return;
    const m=(card.getAttribute('onclick')||'').match(/viewMovieDetail\(['\"]([^'\"]+)/);
    const slug=m?.[1]; if(!slug)return;
    card.dataset.rfLockChecked='1';
    const source=window.currentSourceId||'kkphim';
    const [d,ov]=await Promise.all([detail(slug,source),adminOverride(slug,source)]);
    const categories=[d?.category,d?.categories,d?.genre,d?.genres,d?.type,d?.tags];
    const locked=!!ov?.locked||is18(categories);
    if(!locked)return;
    card.classList.add('rf-movie-locked');
    const poster=card.querySelector('.card-poster'); if(!poster)return;
    if(!poster.querySelector('.rf-poster-lock')){
      const badge=document.createElement('span');
      badge.className='rf-poster-lock';
      badge.innerHTML='🔒 18+ · ĐĂNG NHẬP';
      poster.appendChild(badge);
    }
    if(!poster.querySelector('.rf-lock-button')){
      const btn=document.createElement('button');
      btn.type='button'; btn.className='rf-lock-button';
      btn.innerHTML='<span class="rf-lock-icon">🔒</span><span>Cần đăng nhập để xem</span>';
      btn.addEventListener('click',async e=>{
        e.preventDefault(); e.stopPropagation();
        const access=window.rfMovieAccess;
        if(access?.requireLogin){await access.requireLogin('Phim này thuộc danh mục 18+ và yêu cầu đăng nhập để xem.');}
        else if(typeof window.openAuthModal==='function')window.openAuthModal('login');
      });
      poster.appendChild(btn);
    }
    const watch=card.querySelector('.watch-btn');
    if(watch){watch.innerHTML='<i class="fa-solid fa-lock"></i> Đăng nhập để xem';watch.classList.add('rf-locked-watch-btn');}
  }
  function scan(){document.querySelectorAll('#movie-grid-container .movie-card-premium').forEach(markCard);}
  function boot(){scan();new MutationObserver(()=>scan()).observe(document.getElementById('movie-grid-container')||document.body,{childList:true,subtree:true});setInterval(scan,2500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
