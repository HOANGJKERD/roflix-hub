/* RoFlix curated categories bridge. Loads once, no polling, no per-card API calls. */
(function(){
  'use strict';
  if(window.__RF_MOVIE_CURATION_CLIENT__)return;
  window.__RF_MOVIE_CURATION_CLIENT__=true;
  const sb=window.rfSupabase;
  let rows=[];
  const cache=new Map();
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const GENRE_ALIAS={'chinh-kich':'chinh-kich','chính kịch':'chinh-kich','drama':'chinh-kich','tam-ly':'tam-ly','tâm lý':'tam-ly','hai':'hai','hài':'hai','hai-huoc':'hai-huoc','hài hước':'hai-huoc','bi-an':'bi-an','bí ẩn':'bi-an','gia-dinh':'gia-dinh','gia đình':'gia-dinh','hanh-dong':'hanh-dong','hành động':'hanh-dong','action':'action','vien-tuong':'vien-tuong','viễn tưởng':'vien-tuong','khoa-hoc-vien-tuong':'khoa-hoc-vien-tuong','khoa học viễn tưởng':'khoa-hoc-vien-tuong','hinh-su':'hinh-su','hình sự':'hinh-su','kinh-di':'kinh-di','kinh dị':'kinh-di','phieu-luu':'phieu-luu','phiêu lưu':'phieu-luu','co-trang':'co-trang','cổ trang':'co-trang','vo-thuat':'vo-thuat','võ thuật':'vo-thuat','lang-man':'lang-man','lãng mạn':'lang-man','tinh-cam':'tinh-cam','tình cảm':'tinh-cam','gia-tuong':'gia-tuong','giả tưởng':'gia-tuong','fantasy':'fantasy','than-thoai':'than-thoai','thần thoại':'than-thoai','chien-tranh':'chien-tranh','chiến tranh':'chien-tranh','hoc-duong':'hoc-duong','học đường':'hoc-duong','hoat-hinh':'hoat-hinh','hoạt hình':'hoat-hinh','tai-lieu':'tai-lieu','tài liệu':'tai-lieu','am-nhac':'am-nhac','âm nhạc':'am-nhac','the-thao':'the-thao','thể thao':'the-thao','kinh-dien':'kinh-dien','kinh điển':'kinh-dien','chieu-rap':'chieu-rap','chiếu rạp':'chieu-rap','tre-em':'tre-em','trẻ em':'tre-em','phim-18-plus':'phim-18-plus','phim 18+':'phim-18-plus','18+':'phim-18-plus','lich-su':'lich-su','lịch sử':'lich-su','mien-tay':'mien-tay','miền tây':'mien-tay','phim-ngan':'phim-ngan','phim ngắn':'phim-ngan','tv-shows':'tv-shows','tv shows':'tv-shows','short-drama':'short-drama','short drama':'short-drama'};
  async function load(){
    if(cache.has('all'))return cache.get('all');
    const p=(async()=>{if(!sb)return [];try{const r=await sb.from('roflix_movie_curation').select('source_id,movie_slug,movie_title,origin_name,poster_url,year,type_key,list_keys,genre_keys,quality,lang,status').limit(5000);if(r.error)throw r.error;rows=r.data||[];return rows}catch(e){console.debug('[RoFlix Curation]',e.message||e);return []}})();
    cache.set('all',p);return p;
  }
  const ready=load();
  window.rfMovieCuration={ready,rows:()=>rows,get:(source,slug)=>rows.find(x=>x.source_id===source&&x.movie_slug===slug)||null,refresh:async()=>{cache.clear();return load()}};
  function normalizeGenreKey(value){
    const raw=String(value||'').toLowerCase().trim();
    const normalized=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return GENRE_ALIAS[raw]||GENRE_ALIAS[normalized]||normalized;
  }
  function normalizeSource(raw){return raw&&raw!=='custom'?raw:'kkphim'}
  function existingSlugs(){const set=new Set();document.querySelectorAll('#movie-grid-container .movie-card-premium').forEach(card=>{const x=(card.getAttribute('onclick')||'').match(/viewMovieDetail\(['\"]([^'\"]+)/);if(x?.[1])set.add(x[1])});return set}
  function card(row){
    const poster=row.poster_url||'https://placehold.co/300x450/111827/f59e0b?text=RoFlix';
    const source=normalizeSource(row.source_id);
    const slug=String(row.movie_slug||'').replace(/'/g,"\\'");
    const genres=(row.genre_keys||[]).join(', ');
    return '<div onclick="viewMovieDetail(\''+slug+'\',\''+source+'\')" class="movie-card-premium card-stagger rf-curated-card" data-rf-curated="1"><div class="card-poster"><img src="'+esc(poster)+'" alt="'+esc(row.movie_title)+'" loading="lazy" decoding="async" onerror="this.src=\'https://placehold.co/300x400/1a1a1a/666?text=No+Image\'"><div class="card-overlay"><button class="watch-btn btn-ripple" onclick="event.stopPropagation();playMovie(\''+slug+'\',\''+source+'\')"><i class="fa-solid fa-play"></i> Xem Ngay</button></div><div class="card-badges"><span class="badge eps">'+esc(row.quality||'HD')+'</span></div></div><div class="card-info"><div class="card-title">'+esc(row.movie_title)+'</div><div class="card-meta"><span>'+esc(genres)+'</span><span>'+esc(row.year||'')+'</span></div></div></div>';
  }
  function appendMatches(listKey,genreArg){
    const box=document.getElementById('movie-grid-container');if(!box)return;
    const existing=existingSlugs();const gKey=normalizeGenreKey(genreArg);
    const matches=rows.filter(r=>r.source_id!=='custom'&&((listKey&&Array.isArray(r.list_keys)&&r.list_keys.includes(listKey))||(genreArg&&Array.isArray(r.genre_keys)&&r.genre_keys.includes(gKey)))&&!existing.has(r.movie_slug));
    if(!matches.length)return;
    box.insertAdjacentHTML('beforeend',matches.slice(0,24).map(card).join(''));
  }
  function wrap(name,mode){
    const original=window[name];
    if(typeof original!=='function'||original.__rfCuration)return;
    const wrapped=async function(){const args=arguments;const result=await original.apply(this,args);await ready;try{if(mode==='list')appendMatches(String(args[0]||''),'');else appendMatches('',String(args[0]||''));}catch(_){}return result};
    wrapped.__rfCuration=true;window[name]=wrapped;
  }
  function wrapGenericFilter(){
    const original=window.filterBy;if(typeof original!=='function'||original.__rfCuration)return;
    const wrapped=function(){const args=arguments;const result=original.apply(this,args);if(String(args[0]||'').toLowerCase()==='genre'){ready.then(()=>setTimeout(()=>{try{appendMatches('',String(args[1]||''))}catch(_){}},550))}return result};
    wrapped.__rfCuration=true;window.filterBy=wrapped;
  }
  function install(){wrap('filterByList','list');wrap('filterByGenre','genre');wrapGenericFilter()}
  install();setTimeout(install,500);setTimeout(install,1500);
  window.addEventListener('roflix:curation-refresh',async()=>{await window.rfMovieCuration.refresh();install()});
})();