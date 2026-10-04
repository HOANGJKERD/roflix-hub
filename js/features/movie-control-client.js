/* RoFlix Movie Control Center client: source overrides, locked titles, custom MP4 titles. */
(function(){
  'use strict';
  const sb=window.rfSupabase;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let settings={lock_18_plus:true,force_login_for_locked:true};
  const overrideCache=new Map();
  const customCache=new Map();

  async function loadSettings(){
    if(!sb)return settings;
    try{const r=await sb.from('roflix_movie_settings').select('lock_18_plus,force_login_for_locked').eq('id',true).maybeSingle();if(r.data)settings=r.data;}catch(_){}
    return settings;
  }
  function is18(movie){
    const values=[...(movie?.genre||[]),...(movie?.categories||[])].map(x=>String(x||'').toLowerCase());
    return values.some(v=>/18\s*\+|18plus|adult|người lớn|nguoi lon|hentai/.test(v));
  }
  async function getOverride(source,slug){
    const key=`${source||'kkphim'}:${slug}`;
    if(overrideCache.has(key))return overrideCache.get(key);
    if(!sb||!slug)return null;
    const r=await sb.from('roflix_movie_overrides').select('*').eq('source_id',source||'kkphim').eq('movie_slug',slug).maybeSingle();
    const value=r.data||null;overrideCache.set(key,value);return value;
  }
  async function getCustom(idOrSlug){
    const key=String(idOrSlug||'');
    if(customCache.has(key))return customCache.get(key);
    if(!sb)return null;
    let q=sb.from('roflix_custom_movies').select('*').eq('published',true);
    q=key.includes('-')?q.eq('id',key):q.eq('slug',key);
    const r=await q.maybeSingle();
    if(r.data){customCache.set(key,r.data);customCache.set(r.data.id,r.data);customCache.set(r.data.slug,r.data)}
    return r.data||null;
  }
  async function requireLogin(reason){
    const r=await sb?.auth?.getUser?.();
    if(r?.data?.user)return true;
    if(typeof openAuthModal==='function')openAuthModal('login');
    if(typeof showToastPro==='function')showToastPro('info','Cần đăng nhập',reason||'Hãy đăng nhập hoặc tạo tài khoản để xem nội dung này.');
    else if(typeof showToast==='function')showToast('info','Cần đăng nhập',reason||'Hãy đăng nhập hoặc tạo tài khoản để xem nội dung này.');
    return false;
  }
  async function accessForMovie(movie,source,slug){
    await loadSettings();
    const ov=source==='custom'?null:await getOverride(source,slug);
    if(ov?.hidden)return {allowed:false,hidden:true,locked:false,override:ov};
    const locked=!!ov?.locked || !!movie?.locked || (settings.lock_18_plus && is18(movie));
    if(locked && settings.force_login_for_locked){
      const ok=await requireLogin('Phim này yêu cầu đăng nhập để xem.');
      if(!ok)return {allowed:false,locked:true,override:ov};
    }
    return {allowed:true,locked,override:ov};
  }
  function applyOverride(ov){
    if(!ov||!window.currentMovieData)return;
    const m=window.currentMovieData;
    const map=[['title','title'],['origin_name','origin_name'],['summary','summary'],['poster_url','poster'],['backdrop_url','backdrop'],['quality','quality'],['lang','lang'],['trailer_url','trailer']];
    map.forEach(([a,b])=>{if(ov[a]!=null&&ov[a]!=='')m[b]=ov[a]});
    if(Array.isArray(ov.actors)&&ov.actors.length)m.actors=ov.actors;
    if(Array.isArray(ov.directors)&&ov.directors.length)m.directors=ov.directors;
    if(Array.isArray(ov.categories)&&ov.categories.length)m.genre=ov.categories;
    if(ov.year)m.year=ov.year;
    if(Array.isArray(ov.episodes)&&ov.episodes.length&&Array.isArray(window.currentEpisodeList)){
      window.currentEpisodeList.length=0;ov.episodes.forEach(e=>{if(e?.link)window.currentEpisodeList.push({name:e.name||'Full',link:e.link})});
    }
    const title=document.querySelector('#detail-content-container h1');if(title&&ov.title)title.textContent=ov.title;
    const origin=document.querySelector('#detail-content-container h1 + p');if(origin&&ov.origin_name!=null)origin.textContent=ov.origin_name;
    const summary=[...document.querySelectorAll('#detail-content-container h3')].find(x=>x.textContent.includes('Tóm tắt'))?.nextElementSibling;if(summary&&ov.summary!=null)summary.textContent=ov.summary||'Chưa có tóm tắt';
    const poster=document.querySelector('#detail-content-container img');if(poster&&ov.poster_url)poster.src=ov.poster_url;
  }
  function lockBadge(){
    const box=document.getElementById('detail-content-container');if(!box)return;
    const old=box.querySelector('.rf-locked-badge');if(old)old.remove();
    const badge=document.createElement('div');badge.className='rf-locked-badge';badge.innerHTML='🔒 YÊU CẦU ĐĂNG NHẬP';box.prepend(badge);
  }
  async function guardPlay(){
    const slug=window.currentSlug||'';const source=window.currentSourceId||'kkphim';
    const m=window.currentMovieData||{};const result=await accessForMovie(m,source,slug);
    if(!result.allowed){if(result.hidden&&typeof showToast==='function')showToast('error','Phim đã bị ẩn','Admin đã gỡ phim này khỏi RoFlix.');return false;}
    if(result.locked)lockBadge();
    if(result.override)applyOverride(result.override);
    return true;
  }
  async function openCustom(id){
    const movie=await getCustom(id);if(!movie){showToast?.('error','Không tìm thấy phim','Phim tự thêm không tồn tại hoặc đã bị ẩn.');return;}
    const ok=await accessForMovie(movie,'custom',movie.slug);if(!ok.allowed)return;
    window.rfActiveCustomMovie=movie;window.currentSlug=movie.slug;window.currentMovieTitle=movie.title;
    window.currentMovieData={...movie,_src:'custom',type:'Phim tự thêm',genre:movie.categories||[],poster:movie.poster_url,summary:movie.summary,actors:movie.actors||[],directors:movie.directors||[],year:movie.year||'N/A',quality:movie.quality,lang:movie.lang};
    const box=document.getElementById('detail-content-container');if(!box)return;
    const locked=movie.locked||is18(movie);
    box.innerHTML=`<div class="glass-premium p-5 md:p-8 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-8"><div><div class="aspect-[2/3] rounded-2xl overflow-hidden border border-gray-800 shadow-xl"><img src="${esc(movie.poster_url)}" class="w-full h-full object-cover" alt="${esc(movie.title)}"></div><button id="rf-custom-play" class="rf-detail-watch-btn"><i class="fa-solid fa-play"></i> Xem phim</button></div><div class="md:col-span-3 space-y-5"><div class="flex justify-between gap-3"><div><h1 class="text-2xl md:text-3xl font-black text-white">${esc(movie.title)}</h1><p class="text-sm mt-1 text-gray-400">${esc(movie.origin_name)}</p></div>${locked?'<span class="rf-locked-badge">🔒 KHÓA</span>':''}</div><div class="flex flex-wrap gap-2 text-xs text-gray-300"><span class="bg-amber-500 text-black font-bold px-3 py-1 rounded-lg">${esc(movie.quality||'HD')}</span><span>${esc(movie.year||'N/A')}</span><span>${esc(movie.lang||'Vietsub')}</span></div><div><h3 class="text-sm font-bold text-gray-400 mb-1">Tóm tắt:</h3><p class="text-sm leading-relaxed text-gray-300">${esc(movie.summary||'Chưa có tóm tắt')}</p></div><div class="text-xs text-gray-400">Diễn viên: ${(movie.actors||[]).map(esc).join(', ')||'Chưa cập nhật'}</div><div class="text-xs text-gray-400">Đạo diễn: ${(movie.directors||[]).map(esc).join(', ')||'Chưa cập nhật'}</div></div></div>`;
    document.getElementById('rf-custom-play').onclick=async()=>{
      const ok2=await accessForMovie(movie,'custom',movie.slug);if(!ok2.allowed)return;
      const u=await sb.storage.from('roflix-media').createSignedUrl(movie.video_path,3600);if(u.error){showToast?.('error','Không mở được video',u.error.message);return;}
      const player=document.getElementById('movie-player');if(player)player.src=u.data.signedUrl;const title=document.getElementById('playing-title');if(title)title.textContent=movie.title;navigateTo('play-page');
    };
    navigateTo('detail-page');
  }
  function renderCustomSection(){
    if(!sb||document.getElementById('rf-custom-movies-section'))return;
    const main=document.getElementById('view-main-site');if(!main)return;
    const section=document.createElement('section');section.id='rf-custom-movies-section';section.className='max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8';section.innerHTML='<div class="flex items-center justify-between mb-4"><div><h2 class="text-xl font-black text-white">🎬 Phim RoFlix Studio</h2><p class="text-xs text-gray-500">Nội dung do Admin RoFlix thêm trực tiếp.</p></div></div><div id="rf-custom-movies-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4"></div>';
    main.appendChild(section);loadCustomMovies(section.querySelector('#rf-custom-movies-grid'));
  }
  async function loadCustomMovies(grid){
    if(!grid)return;const r=await sb.from('roflix_custom_movies').select('id,slug,title,origin_name,poster_url,year,quality,locked,categories').eq('published',true).order('updated_at',{ascending:false}).limit(24);if(r.error||!r.data?.length){grid.innerHTML='<div class="col-span-full text-sm text-gray-500">Chưa có phim tự thêm.</div>';return;}grid.innerHTML=r.data.map(m=>`<article class="rf-custom-card cursor-pointer" data-custom="${esc(m.id)}"><div class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 relative"><img src="${esc(m.poster_url)}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://placehold.co/300x450/111827/f59e0b?text=RoFlix'"><span class="absolute top-2 left-2 text-[9px] font-black bg-black/75 text-white px-2 py-1 rounded">${m.locked?'🔒 ':''}${esc(m.quality||'HD')}</span></div><h3 class="text-xs font-bold text-white mt-2 line-clamp-2">${esc(m.title)}</h3><p class="text-[10px] text-gray-500">${esc(m.year||'')}</p></article>`).join('');grid.querySelectorAll('[data-custom]').forEach(el=>el.addEventListener('click',()=>openCustom(el.dataset.custom)));
  }
  function hideGoogle(){
    document.querySelectorAll('button').forEach(b=>{if(/Đăng nhập bằng Google/i.test(b.textContent||'')){b.style.display='none';b.setAttribute('aria-hidden','true')}});
    window.mockGoogleAuth=async()=>{showToast?.('info','Google Login đã tắt','RoFlix chỉ sử dụng đăng nhập bằng email và mật khẩu.');return false;};
  }
  function patch(){
    const ov=window.viewMovieDetail;if(typeof ov==='function'&&!ov.__rfMovieControl){const f=async function(slug,src){const source=src||window.currentSourceId||'kkphim';const policy=await getOverride(source,slug);if(policy?.hidden){showToast?.('error','Phim đã bị ẩn','Admin đã ẩn phim này khỏi RoFlix.');return null;}const r=await ov.apply(this,arguments);const result=await accessForMovie(window.currentMovieData||{},source,slug);if(!result.allowed&&result.locked)lockBadge();if(result.override)applyOverride(result.override);return r};f.__rfMovieControl=true;window.viewMovieDetail=f;}
    const pm=window.playMovie;if(typeof pm==='function'&&!pm.__rfMovieControl){const f=async function(){if(!(await guardPlay()))return;return pm.apply(this,arguments)};f.__rfMovieControl=true;window.playMovie=f;}
    const pi=window.playMovieByIndex;if(typeof pi==='function'&&!pi.__rfMovieControl){const f=function(index,options){guardPlay().then(ok=>{if(ok)pi.call(this,index,options)});};f.__rfMovieControl=true;window.playMovieByIndex=f;}
  }
  function boot(){loadSettings();hideGoogle();patch();setTimeout(patch,500);setTimeout(patch,1500);setTimeout(renderCustomSection,1000);new MutationObserver(()=>hideGoogle()).observe(document.body,{subtree:true,childList:true});}
  window.rfMovieAccess={loadSettings,getOverride,getCustom,requireLogin,accessForMovie,openCustom,refreshCustomMovies:()=>loadCustomMovies(document.getElementById('rf-custom-movies-grid'))};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
