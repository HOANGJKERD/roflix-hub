/* RoFlix curated categories bridge. Loads once, no polling, no per-card API calls. */
(function(){
  'use strict';
  if(window.__RF_MOVIE_CURATION_CLIENT__)return;
  window.__RF_MOVIE_CURATION_CLIENT__=true;
  const sb=window.rfSupabase;
  let rows=[];
  const cache=new Map();
  const resolveCache=new Map();
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const GENRE_ALIAS={'chinh-kich':'chinh-kich','chính kịch':'chinh-kich','drama':'chinh-kich','tam-ly':'tam-ly','tâm lý':'tam-ly','hai':'hai','hài':'hai','hai-huoc':'hai-huoc','hài hước':'hai-huoc','bi-an':'bi-an','bí ẩn':'bi-an','gia-dinh':'gia-dinh','gia đình':'gia-dinh','hanh-dong':'hanh-dong','hành động':'hanh-dong','action':'action','vien-tuong':'vien-tuong','viễn tưởng':'vien-tuong','khoa-hoc-vien-tuong':'khoa-hoc-vien-tuong','khoa học viễn tưởng':'khoa-hoc-vien-tuong','hinh-su':'hinh-su','hình sự':'hinh-su','kinh-di':'kinh-di','kinh dị':'kinh-di','phieu-luu':'phieu-luu','phiêu lưu':'phieu-luu','co-trang':'co-trang','cổ trang':'co-trang','vo-thuat':'vo-thuat','võ thuật':'vo-thuat','lang-man':'lang-man','lãng mạn':'lang-man','tinh-cam':'tinh-cam','tình cảm':'tinh-cam','gia-tuong':'gia-tuong','giả tưởng':'gia-tuong','fantasy':'fantasy','than-thoai':'than-thoai','thần thoại':'than-thoai','chien-tranh':'chien-tranh','chiến tranh':'chien-tranh','hoc-duong':'hoc-duong','học đường':'hoc-duong','hoat-hinh':'hoat-hinh','hoạt hình':'hoat-hinh','tai-lieu':'tai-lieu','tài liệu':'tai-lieu','am-nhac':'am-nhac','âm nhạc':'am-nhac','the-thao':'the-thao','thể thao':'the-thao','kinh-dien':'kinh-dien','kinh điển':'kinh-dien','chieu-rap':'chieu-rap','chiếu rạp':'chieu-rap','tre-em':'tre-em','trẻ em':'tre-em','phim-18-plus':'phim-18-plus','phim 18+':'phim-18-plus','18+':'phim-18-plus','lich-su':'lich-su','lịch sử':'lich-su','mien-tay':'mien-tay','miền tây':'mien-tay','phim-ngan':'phim-ngan','phim ngắn':'phim-ngan','tv-shows':'tv-shows','tv shows':'tv-shows','short-drama':'short-drama','short drama':'short-drama'};
  async function load(){
    if(cache.has('all'))return cache.get('all');
    const p=(async()=>{if(!sb)return [];try{const r=await sb.from('roflix_movie_curation').select('id,source_id,movie_slug,movie_title,origin_name,poster_url,year,type_key,list_keys,genre_keys,quality,lang,status').limit(5000);if(r.error)throw r.error;rows=r.data||[];return rows}catch(e){console.debug('[RoFlix Curation]',e.message||e);return []}})();
    cache.set('all',p);return p;
  }
  const ready=load();
  window.rfMovieCuration={ready,rows:()=>rows,get:(source,slug)=>rows.find(x=>x.source_id===source&&x.movie_slug===slug)||null,refresh:async()=>{cache.clear();return load()}};
  function normalizeGenreKey(value){
    const raw=String(value||'').toLowerCase().trim();
    const normalized=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return GENRE_ALIAS[raw]||GENRE_ALIAS[normalized]||normalized;
  }
  function normalizeTitle(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
  function normalizeSource(raw){return raw&&raw!=='custom'?raw:'kkphim'}
  function existingSlugs(){
    const set=new Set();
    document.querySelectorAll('#movie-grid-container .movie-card-premium').forEach(card=>{
      const curatedId=card.getAttribute('data-rf-curated-id');
      if(curatedId){set.add('id:'+curatedId);return}
      const x=(card.getAttribute('onclick')||'').match(/viewMovieDetail\(['\"]([^'\"]+)/);
      if(x?.[1])set.add('slug:'+x[1]);
    });
    return set;
  }
  async function resolveTitle(row){
    const title=String(row?.movie_title||'').trim();
    if(!title)return null;
    const key=normalizeTitle(title);
    if(resolveCache.has(key))return resolveCache.get(key);
    const promise=(async()=>{
      const ids=['kkphim','vsmov'];
      let fallback=null;
      for(const sid of ids){
        try{
          const url=typeof window.srcListUrl==='function'?window.srcListUrl('/tim-kiem?keyword='+encodeURIComponent(title)+'&page=1',sid):null;
          if(!url||typeof window.fetchJson!=='function')continue;
          const data=await window.fetchJson(url);
          const items=typeof window.unwrapList==='function'?window.unwrapList(data).items:(data?.items||data?.data?.items||[]);
          if(!Array.isArray(items)||!items.length)continue;
          const exact=items.find(m=>normalizeTitle(m?.name||m?.title||'')===key||normalizeTitle(m?.origin_name||'')===key);
          const hit=exact||items[0];
          if(hit?.slug)return {...hit,_src:sid};
          if(!fallback&&hit)fallback={...hit,_src:sid};
        }catch(e){console.debug('[RoFlix Curation resolve]',sid,e?.message||e)}
      }
      return fallback;
    })();
    resolveCache.set(key,promise);return promise;
  }
  window.rfOpenCuratedMovie=async function(row){
    if(!row)return;
    const isSearch=String(row.movie_slug||'').startsWith('roflix-search-');
    if(!isSearch){
      if(typeof window.viewMovieDetail==='function')return window.viewMovieDetail(row.movie_slug,normalizeSource(row.source_id));
      return;
    }
    window.showToast?.('info','Đang tìm phim',`Đang tìm “${row.movie_title}” trên KKPhim/VSMOV...`);
    const hit=await resolveTitle(row);
    if(!hit?.slug){window.showToast?.('error','Không tìm thấy',`Không tìm thấy “${row.movie_title}” trên các nguồn phim.`);return}
    if(typeof window.viewMovieDetail==='function')return window.viewMovieDetail(hit.slug,hit._src||'kkphim');
  };
  window.rfPlayCuratedMovie=async function(row){
    const hit=String(row?.movie_slug||'').startsWith('roflix-search-')?await resolveTitle(row):row;
    if(!hit?.slug){window.showToast?.('error','Không tìm thấy',`Không tìm thấy “${row?.movie_title||''}”.`);return}
    if(typeof window.playMovie==='function')return window.playMovie(hit.slug,hit._src||normalizeSource(row.source_id));
  };
  function card(row){
    const poster=row.poster_url||'https://placehold.co/300x450/111827/f59e0b?text=RoFlix';
    const genres=(row.genre_keys||[]).join(', ');
    const payload=JSON.stringify({id:row.id||'',source_id:row.source_id||'',movie_slug:row.movie_slug||'',movie_title:row.movie_title||'',poster_url:row.poster_url||''}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/'/g,'\\u0027');
    return '<div data-rf-curated-id="'+esc(row.id||row.movie_slug||'')+'" onclick=\'window.rfOpenCuratedMovie('+payload+')\' class="movie-card-premium card-stagger rf-curated-card"><div class="card-poster"><img src="'+esc(poster)+'" alt="'+esc(row.movie_title)+'" loading="lazy" decoding="async" onerror="this.src=\'https://placehold.co/300x400/1a1a1a/666?text=No+Image\'"><div class="card-overlay"><button class="watch-btn btn-ripple" onclick=\'event.stopPropagation();window.rfPlayCuratedMovie('+payload+')\'><i class="fa-solid fa-play"></i> Xem Ngay</button></div><div class="card-badges"><span class="badge eps">'+esc(row.quality||'HD')+'</span></div></div><div class="card-info"><div class="card-title">'+esc(row.movie_title)+'</div><div class="card-meta"><span>'+esc(genres)+'</span><span>'+esc(row.year||'')+'</span></div></div></div>';
  }
  function appendMatches(listKey,genreArg){
    const box=document.getElementById('movie-grid-container');if(!box)return;
    const existing=existingSlugs();const gKey=normalizeGenreKey(genreArg);
    const matches=rows.filter(r=>r.source_id!=='custom'&&((listKey&&Array.isArray(r.list_keys)&&r.list_keys.includes(listKey))||(genreArg&&Array.isArray(r.genre_keys)&&r.genre_keys.includes(gKey)))&&(!r.id||!existing.has('id:'+r.id))&&!existing.has('slug:'+r.movie_slug));
    if(!matches.length)return;
    box.insertAdjacentHTML('beforeend',matches.slice(0,24).map(card).join(''));
  }
  function wrap(name,mode){
    const original=window[name]; if(typeof original!=='function'||original.__rfCuration)return;
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