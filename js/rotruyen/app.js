(function () {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const API = '/api/mangadex';
  // TruyenDex is a MangaDex-powered frontend project, not a separate public REST API.
  // RoTruyen integrates MangaDex's documented public API directly.
  // Public catalogue only uses published database records or the explicitly selected external API.
  const state = {source:'database',query:'',genre:'all',status:'all',rating:'all',catalogSource:'all',contentType:'all',sort:'featured',items:[],saved:new Set(),history:[],selected:null,chapters:[],chapterIndex:0,chapterPages:[],apiBusy:false,readerBusy:false,chapterRequestId:0};
  const memory = {
    read(key, fallback) { try { const v=JSON.parse(localStorage.getItem('rotruyen:'+key)); return v ?? fallback; } catch (_) { return fallback; } },
    write(key, value) { try { localStorage.setItem('rotruyen:'+key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  };
  state.saved = new Set(memory.read('saved:v1', []));
  state.history = memory.read('history:v1', []);
  const readProgress = memory.read('read-progress:v1', {});
  let progressSaveTimer = null;
  let cloudUserId=null, libraryChannel=null, userLibraryChannel=null, cloudSyncBusy=false, cloudSyncTimer=null;
  async function syncCloudLibrary(){
    const sb=window.rfSupabase;if(!sb||cloudSyncBusy)return;
    cloudSyncBusy=true;
    try{
      const {data:authData}=await sb.auth.getUser(), user=authData?.user;
      if(!user){cloudUserId=null;return;}
      const changedUser=cloudUserId!==user.id;cloudUserId=user.id;
      const {data:remote,error}=await sb.from('rotruyen_user_library').select('*').eq('user_id',user.id);
      if(error)throw error;
      const rows=remote||[], byId=new Map(rows.map(row=>[row.item_id,row]));
      const localSaved=[...state.saved];
      const writes=[];
      for(const id of localSaved){
        const old=byId.get(String(id));
        if(!old?.is_saved){
          const item=state.items.find(x=>String(x.id)===String(id));
          writes.push({user_id:user.id,item_id:String(id),item_source:item?.source||'unknown',title:item?.title||old?.title||'',is_saved:true});
        }
      }
      for(const h of state.history){
        const id=String(h.mangaId||'');if(!id)continue;
        const old=byId.get(id);
        if(!old||Number(new Date(h.updatedAt||0))>Number(new Date(old.progress_updated_at||0))){
          const item=state.items.find(x=>String(x.id)===id);
          writes.push({user_id:user.id,item_id:id,item_source:item?.source||'unknown',title:h.title||item?.title||old?.title||'',is_saved:state.saved.has(id)||(old?.is_saved||false),last_chapter_id:String(h.chapterId||''),last_chapter_label:String(h.chapter||''),progress_updated_at:new Date(h.updatedAt||Date.now()).toISOString()});
        }
      }
      if(writes.length){
        const merged=new Map();
        writes.forEach(row=>{const prev=merged.get(row.item_id);merged.set(row.item_id,{...(prev||{}),...row,is_saved:!!(row.is_saved||prev?.is_saved)});});
        const {error:writeError}=await sb.from('rotruyen_user_library').upsert([...merged.values()],{onConflict:'user_id,item_id'});
        if(writeError)throw writeError;
      }
      const {data:latest,error:latestError}=await sb.from('rotruyen_user_library').select('*').eq('user_id',user.id);
      if(latestError)throw latestError;
      const cloudRows=latest||[];
      state.saved=new Set(cloudRows.filter(x=>x.is_saved).map(x=>x.item_id));
      const cloudHistory=cloudRows.filter(x=>x.last_chapter_id).map(x=>({mangaId:x.item_id,title:x.title,chapterId:x.last_chapter_id,chapter:x.last_chapter_label,updatedAt:x.progress_updated_at?new Date(x.progress_updated_at).getTime():0}));
      const historyMap=new Map();
      [...state.history,...cloudHistory].forEach(h=>{const k=String(h.mangaId);const old=historyMap.get(k);if(!old||Number(h.updatedAt||0)>Number(old.updatedAt||0))historyMap.set(k,h);});
      state.history=[...historyMap.values()].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,100);
      memory.write('saved:v1',[...state.saved]);memory.write('history:v1',state.history);
      if(changedUser)renderSavedCount();
    }catch(e){console.warn('[RoTruyen cloud sync]',e.message||e);}
    finally{cloudSyncBusy=false;}
  }
  function scheduleCloudSync(){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncCloudLibrary(),250);}
  function connectRealtime(){
    const sb=window.rfSupabase;if(!sb)return;
    if(libraryChannel){sb.removeChannel(libraryChannel);libraryChannel=null;}
    libraryChannel=sb.channel('rotruyen-live-catalog')
      .on('postgres_changes',{event:'*',schema:'public',table:'rotruyen_series'},()=>loadOwnCatalog())
      .on('postgres_changes',{event:'*',schema:'public',table:'rotruyen_chapters'},()=>{if(state.selected?.source==='database')loadChapters();})
      .subscribe();
    sb.auth.onAuthStateChange(()=>{setTimeout(()=>{syncCloudLibrary();rtRenderAccountLink();},0);});
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notify(message) {
    const toast=$('#toast'); if(!toast)return;
    toast.textContent=message; toast.classList.add('visible');
    window.clearTimeout(notify.timer); notify.timer=window.setTimeout(()=>toast.classList.remove('visible'),2600);
  }
  function titleOf(item) {
    const t=item?.attributes?.title || {};
    return t.vi || t['en'] || Object.values(t)[0] || 'Chưa có tiêu đề';
  }
  function coverOf(item) {
    const id=item?.id, file=item?.relationships?.find(x=>x.type==='cover_art')?.attributes?.fileName;
    return id && file ? '/api/mangadex-image?host=uploads.mangadex.org&path='+encodeURIComponent('/covers/'+id+'/'+file+'.512.jpg') : '';
  }
  function mapManga(item) {
    const a=item.attributes||{};
    const tags=(a.tags||[]).map(t=>t.attributes?.name?.en||'').filter(Boolean);
    const tagText=tags.join(' ').toLowerCase();
    const genre=tagText.includes('romance')?'romance':tagText.includes('action')?'action':tagText.includes('drama')?'drama':tagText.includes('adventure')?'adventure':'fantasy';
    return {id:item.id,source:'mangadex',title:titleOf(item),author:(item.relationships||[]).find(r=>r.type==='author')?.attributes?.name||'Chưa rõ tác giả',genre,kind:tags.slice(0,2).join(' · ')||'Manga',chapters:null,rating:null,pop:0,updated:0,cover:coverOf(item),description:a.description?.vi||a.description?.en||'Chưa có mô tả.',status:a.status||'unknown',contentRating:a.contentRating||'safe',raw:item};
  }
  async function fetchJSON(url, options={}) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),18000);
    try {
      const response=await fetch(url,{...options,signal:controller.signal,headers:{Accept:'application/json',...(options.headers||{})}});
      if(!response.ok) {
        let detail='';
        try { detail=(await response.clone().text()).slice(0,220); } catch (_) {}
        throw new Error('HTTP '+response.status+' tại '+url+(detail?' · '+detail:''));
      }
      return await response.json();
    } catch(error) {
      if(error && error.name==='AbortError') throw new Error('Hết thời gian chờ khi gọi '+url);
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function fetchMangaDexCatalog(params) {
    const query=params.toString();
    try {
      return await fetchJSON('/api/mangadex/manga?'+query);
    } catch(proxyError) {
      // Dự phòng trực tiếp từ API công khai nếu proxy của RoHub đang lỗi.
      // MangaDex là nguồn catalog; đây không phải API của TruyenDex.
      try {
        return await fetchJSON('https://api.mangadex.org/manga?'+query);
      } catch(directError) {
        throw new Error('Proxy RoHub: '+proxyError.message+'; API MangaDex trực tiếp: '+directError.message);
      }
    }
  }
  async function searchMangaDex() {
    const params=new URLSearchParams({limit:'100',offset:'0'});
    params.set('order[followedCount]','desc');
    params.append('includes[]','cover_art');
    params.append('includes[]','author');
    params.append('contentRating[]','safe');
    params.append('contentRating[]','suggestive');
    // RoTruyen chỉ hiển thị manga có bản dịch tiếng Việt. Không fallback sang catalog đa ngôn ngữ.
    params.append('availableTranslatedLanguage[]','vi');
    if(state.query.trim()) params.set('title',state.query.trim());
    if(state.genre!=='all') {
      const tagIds={action:'391b0423-d847-456f-aff0-8b0cfc03066b',romance:'423e2eae-a7a2-4a8b-ac03-a8351462d71d',drama:'b9af3a63-f058-46de-a9a0-e0c13906197a',adventure:'3b60b75c-a2d7-4860-ab56-05f391bb889c',fantasy:'cdc58593-87dd-415e-bbc0-2ec27bf404cc'};
      if(tagIds[state.genre]) params.append('includedTags[]',tagIds[state.genre]);
    }
    // Load several pages so the catalogue is not artificially limited to the first 100 results.
    // MangaDex caps each request at 100; offsets are deduplicated below.
    const pages = await Promise.all([0,100,200].map(async offset => {
      const pageParams = new URLSearchParams(params);
      pageParams.set('offset', String(offset));
      return fetchMangaDexCatalog(pageParams);
    }));
    const results = pages.flatMap(data => Array.isArray(data.data) ? data.data : []);
    const unique = new Map();
    results
      .filter(item=>(item.attributes?.availableTranslatedLanguages||[]).includes('vi'))
      .forEach(item => { if (!unique.has(item.id)) unique.set(item.id, item); });
    return [...unique.values()].map(mapManga);
  }
  function normalizeFilterText(value){return String(value??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/đ/g,'d').toLowerCase();}
  function genreMatches(item,genre){
    if(genre==='all')return true;
    const aliases={
      action:['action','hành động','hanh dong'],adventure:['adventure','phiêu lưu','phieu luu'],
      comedy:['comedy','hài hước','hai huoc'],drama:['drama','chính kịch','chinh kich'],
      fantasy:['fantasy','kỳ ảo','ky ao'],horror:['horror','kinh dị','kinh di'],
      mystery:['mystery','bí ẩn','bi an'],romance:['romance','lãng mạn','lang man'],
      'sci-fi':['sci-fi','science fiction','khoa học viễn tưởng','khoa hoc vien tuong'],
      'slice-of-life':['slice of life','đời thường','doi thuong'],sports:['sports','thể thao','the thao'],
      supernatural:['supernatural','siêu nhiên','sieu nhien'],adult:['adult','18+','18plus','erotica','pornographic','nsfw','người lớn','nguoi lon']
    };
    const haystack=normalizeFilterText([item.genre,item.kind,...(Array.isArray(item.genres)?item.genres:[]),...(item.raw?.attributes?.tags||[]).map(t=>t.attributes?.name?.en||'')].join(' '));
    if(genre==='adult')return isAdultOnly(item)||aliases.adult.some(alias=>haystack.includes(normalizeFilterText(alias)));
    return (aliases[genre]||[genre]).some(alias=>haystack.includes(normalizeFilterText(alias)));
  }
  function statusMatches(item){
    if(state.status==='all')return true;
    const value=normalizeFilterText(item.status);
    const map={ongoing:['ongoing','publishing','đang ra','dang ra'],completed:['completed','finished','hoàn thành','hoan thanh'],hiatus:['hiatus','tạm ngưng','tam ngung'],cancelled:['cancelled','canceled','đã hủy','da huy']};
    return (map[state.status]||[state.status]).some(x=>value.includes(normalizeFilterText(x)));
  }
  function ratingMatches(item){
    if(state.rating==='all')return true;
    const value=normalizeFilterText(item.contentRating??item.content_rating??'safe');
    const adult=isAdultOnly(item)||['erotica','pornographic','adult','mature','18+','nsfw'].some(x=>value.includes(x));
    if(state.rating==='adult')return adult;
    if(state.rating==='safe')return !adult&&value!=='suggestive';
    if(state.rating==='suggestive')return !adult&&value==='suggestive';
    return true;
  }
  function activeItems() {
    const query=normalizeFilterText(state.query);
    let items=state.items.filter(s=>{
      const searchable=normalizeFilterText([s.title,s.author,s.description,s.synopsis,s.kind].join(' '));
      return (!query||searchable.includes(query))
        &&genreMatches(s,state.genre)
        &&statusMatches(s)
        &&ratingMatches(s)
        &&(state.catalogSource==='all'||s.source===state.catalogSource)
        &&(state.contentType==='all'||(s.contentType||'comic')===state.contentType);
    });
    if(state.sort==='latest') items=[...items].sort((a,b)=>(Date.parse(b.raw?.attributes?.updatedAt||b.updated||0)||0)-(Date.parse(a.raw?.attributes?.updatedAt||a.updated||0)||0));
    if(state.sort==='popular') items=[...items].sort((a,b)=>(Number(b.pop)||Number(b.raw?.attributes?.followedCount)||0)-(Number(a.pop)||Number(a.raw?.attributes?.followedCount)||0));
    if(state.sort==='rating') items=[...items].sort((a,b)=>(b.rating||0)-(a.rating||0));
    return items;
  }
  function updateFilterSummary(){
    const el=$('#active-filter-count');if(!el)return;
    const count=[state.query.trim(),state.genre!=='all',state.status!=='all',state.rating!=='all',state.catalogSource!=='all',state.contentType!=='all'].filter(Boolean).length;
    el.textContent=count+' bộ lọc đang dùng';
  }
  function isStoryLocked(item){return item?.source==='database' && (item.isLocked===true || item.is_locked===true);}
  function coverMarkup(s) {
    const style='--cover:'+esc(s.coverColor||'#282449')+';--glow:'+esc(s.glow||'#8c6ce0')+';--accent:'+esc(s.accent||'#d3b9ff');
    const visual=s.cover && ['mangadex','database','longbook','truyenviet'].includes(s.source) && s.cover ? '<img loading="lazy" src="'+esc(s.cover)+'" alt="" onerror="this.onerror=null;this.style.display=\'none\';this.parentElement.classList.add(\'cover-missing\');this.insertAdjacentHTML(\'beforeend\',\'<i class=&quot;fa-solid fa-book-open&quot; aria-hidden=&quot;true&quot;></i>\')">' : '<i class="fa-solid '+esc(s.icon||'fa-book-open')+'"></i>';
    const locked=isStoryLocked(s),ageLock=isAdultOnly(s)?'<span class="rt-age-lock" title="18+ · cần đăng nhập"><i class="fa-solid fa-lock"></i> 18+</span>':'';
    const lockBadge=locked?'<span class="rt-story-lock-badge"><i class="fa-solid fa-lock"></i> Đã khóa</span>':'';
    return '<div class="cover'+(locked?' is-story-locked':'')+'" style="'+style+'">'+visual+ageLock+lockBadge+'<small>'+esc(s.kind||'Truyện')+'</small><button data-save="'+esc(s.id)+'" class="'+(state.saved.has(s.id)?'saved':'')+'" aria-label="'+(state.saved.has(s.id)?'Bỏ lưu':'Lưu truyện')+'"><i class="fa-'+(state.saved.has(s.id)?'solid':'regular')+' fa-bookmark"></i></button></div>';
  }
  function render() {
    const items=activeItems(), grid=$('#story-grid'); if(!grid)return;
    grid.innerHTML=items.map(s=>'<article class="story'+(isAdultOnly(s)?' story-adult':'')+(isStoryLocked(s)?' story-locked':'')+'"><div class="story-open" data-open="'+esc(s.id)+'" role="button" tabindex="0" aria-label="'+(isStoryLocked(s)?'Truyện đã bị khóa: ':isAdultOnly(s)?'Truyện 18+, cần đăng nhập: ':'Xem chi tiết ')+esc(s.title)+'">'+coverMarkup(s)+'<h3 title="'+esc(s.title)+'">'+esc(s.title)+(isStoryLocked(s)?' <small class="rt-age-label">🔒 Truyện đã khóa</small>':isAdultOnly(s)?' <small class="rt-age-label">🔒 18+ · Đăng nhập để xem</small>':'')+'</h3></div><p>'+esc(s.author||'Đang cập nhật')+'</p><div class="meta"><span>'+(s.chapters?s.chapters+' chương':s.source==='mangadex'?'MangaDex':s.source==='truyenviet'?'Truyện Việt':'Chưa có chương')+'</span><span class="rating">'+(s.rating?'★ '+s.rating.toFixed(1):['mangadex','truyenviet'].includes(s.source)?'Nguồn ngoài':'Chưa đánh giá')+'</span></div></article>').join('');
    const count=$('#result-count'); if(count)count.textContent=items.length+' kết quả';updateFilterSummary();
    const empty=$('#empty-state'); if(empty)empty.hidden=!!items.length;
    const rank=$('#ranking-list'); if(rank)rank.innerHTML=[...state.items].sort((a,b)=>(b.pop||0)-(a.pop||0)).slice(0,4).map((s,i)=>'<div class="ranking"><span class="rank">0'+(i+1)+'</span><span class="rank-info"><b>'+esc(s.title)+'</b><small>'+esc(s.kind||'Truyện')+'</small></span><span>'+(s.rating?'★ '+s.rating.toFixed(1):'↗')+'</span></div>').join('')||'<p class="muted">Chưa có dữ liệu xếp hạng từ nguồn này.</p>';
    renderSavedCount();
    renderRecommend(state.items);
  }
  const reel = {ids:"", index:0, timer:0, ms:5600};
  function renderRecommend(items){
    const box = $("#rt-recommend");
    if(!box) return;
    const slides = (items||[]).filter(s=>s.cover && !isStoryLocked(s)).slice(0,12);
    const sig = slides.map(s=>String(s.id)).join("|");
    if(!slides.length){
      clearInterval(reel.timer);
      box.innerHTML = "<p class='rt-reel-empty'>Chưa có bìa để đề xuất.</p>";
      reel.ids = "";
      return;
    }
    if(sig !== reel.ids){
      reel.ids = sig;
      reel.index = 0;
      box.innerHTML = "<button type='button' class='rt-reel-hit' id='rt-reel-hit'><img id='rt-reel-img' alt=''><div class='rt-reel-copy'><span id='rt-reel-kind'></span><strong id='rt-reel-title'></strong></div><div class='rt-reel-bar'><i id='rt-reel-bar'></i></div></button><div class='rt-reel-dots' id='rt-reel-dots'></div>";
      const dots = $("#rt-reel-dots");
      dots.innerHTML = slides.map((_,i)=>"<button type='button' data-reel='"+i+"' aria-label='Truyện "+(i+1)+"'></button>").join("");
      dots.onclick = (e)=>{
        const b = e.target.closest("[data-reel]");
        if(!b) return;
        showReel(slides, Number(b.dataset.reel));
        armReel(slides);
      };
      $("#rt-reel-hit").onclick = ()=>{
        const s = slides[reel.index];
        if(s) openDetail(s.id);
      };
      box.onmouseenter = ()=>clearInterval(reel.timer);
      box.onmouseleave = ()=>armReel(slides);
      showReel(slides, 0);
      armReel(slides);
      return;
    }
    showReel(slides, reel.index);
  }
  function showReel(slides, index){
    reel.index = (index + slides.length) % slides.length;
    const s = slides[reel.index];
    const img = $("#rt-reel-img");
    if(!img) return;
    img.src = s.cover;
    img.alt = s.title || "";
    $("#rt-reel-kind").textContent = s.kind || "Đề xuất";
    $("#rt-reel-title").textContent = s.title || "";
    const bar = $("#rt-reel-bar");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "rtreel "+reel.ms+"ms linear";
    $$("#rt-reel-dots button").forEach((b,i)=>b.classList.toggle("on", i===reel.index));
  }
  function armReel(slides){
    clearInterval(reel.timer);
    reel.timer = setInterval(()=>showReel(slides, reel.index+1), reel.ms);
  }
  function renderSavedCount(){const el=$('#saved-count');if(el)el.textContent=state.saved.size;}
  async function loadOwnCatalog() {
    const sb=window.rfSupabase;
    if(!sb){state.source='database';state.items=[];render();notify('Supabase chưa sẵn sàng. Không hiển thị truyện mẫu.');return;}
    const grid=$('#story-grid');if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải catalog RoTruyện…</p></div>';
    try{
      const {data,error}=await sb.from('rotruyen_series').select('id,title,slug,synopsis,cover_url,author,source_key,source_id,genres,content_rating,content_type,status,is_published,is_locked,lock_reason,sort_order').eq('is_published',true).order('sort_order',{ascending:true}).limit(100);
      if(error)throw error;
      state.items=(data||[]).map(s=>({id:s.id,source:'database',title:s.title,author:s.author,genre:(s.genres||[])[0]||'all',kind:({comic:'Truyện tranh',novel:'Tiểu thuyết',light_novel:'Light Novel',web_novel:'Web Novel'}[s.content_type]||'Truyện tranh')+' · '+((s.genres||[]).join(' · ')||'Chưa phân loại'),contentType:s.content_type||'comic',chapters:null,rating:null,pop:0,updated:0,cover:s.cover_url,description:s.synopsis,status:s.status,contentRating:s.content_rating,isLocked:!!s.is_locked,lockReason:s.lock_reason||'',sourceId:s.source_id}));
      state.source='database';
      if(!state.items.length){notify('Catalog chưa có truyện thật đã xuất bản.');}
      render();
    }catch(e){state.items=[];state.source='database';render();notify('Không tải được catalog RoTruyện: '+e.message+'. Đã tắt dữ liệu mẫu.');}
  }
  async function loadCatalog() {
    try{const sb=window.rfSupabase;if(sb){const {data:cfg}=await sb.from('rotruyen_settings').select('value').eq('key','public.sources').maybeSingle();if(cfg?.value?.mangadex?.enabled===false){notify('MangaDex đã bị tắt trong RoTruyện Admin.');return;}}}catch(_){}
    if(state.source==='database'){await loadOwnCatalog();return;}
    state.apiBusy=true; const btn=$('#load-source');if(btn){btn.disabled=true;btn.textContent='Đang kết nối…';}
    const grid=$('#story-grid');if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải danh mục từ MangaDex…</p></div>';
    try {state.items=await searchMangaDex();render();if(!state.items.length)notify('Nguồn đã phản hồi nhưng chưa có kết quả phù hợp.');}
    catch(e){state.items=[];state.source='mangadex';render();notify('MangaDex chưa tải được: '+(e.name==='AbortError'?'hết thời gian chờ':e.message)+'. Không hiển thị truyện mẫu.');}
    finally{state.apiBusy=false;if(btn){btn.disabled=false;btn.textContent='Tải truyện từ MangaDex';}}
  }

  async function loadTruyenViet() {
    const grid=$('#story-grid');if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải nguồn Truyện Việt…</p></div>';
    try{
      const params=new URLSearchParams({action:'search',source:'all'});
      if(state.query.trim())params.set('q',state.query.trim());
      const data=await fetchJSON('/api/truyenviet?'+params.toString());
      state.items=(data.items||[]).map(item=>({...item,source:'truyenviet',contentType:'novel',kind:item.kind||'Tiểu thuyết',chapters:null,raw:item}));
      state.source='truyenviet';render();
      if(data.errors?.length)notify('Một số nguồn Truyện Việt chưa phản hồi: '+data.errors.map(x=>x.source).join(', '));
      else if(!state.items.length)notify('Nguồn phản hồi nhưng chưa nhận diện được truyện. Thử tìm bằng từ khóa hoặc mở lại sau.');
    }catch(e){state.items=[];state.source='truyenviet';render();notify('Truyện Việt chưa tải được: '+e.message);}
  }

  async function loadLongBook() {
    const sb=window.rfSupabase;
    if(!sb){notify('Supabase chưa sẵn sàng để đọc cấu hình nguồn.');return;}
    try{
      const {data:cfg,error}=await sb.from('rotruyen_settings').select('value').eq('key','public.sources').maybeSingle();
      if(error)throw error;
      const source=cfg?.value?.longbook;
      if(!source?.enabled){notify('LongBookApi đang tắt. Hãy bật trong RoTruyện Admin.');return;}
      const base=String(source.baseUrl||'').replace(/\/+$/,'');
      if(!/^https:\/\/[^/]+/i.test(base))throw new Error('Base URL chưa được cấu hình bằng HTTPS.');
      const params=new URLSearchParams({start:'0',limit:'24'});
      const endpoint=state.query?'/book/search?keyword='+encodeURIComponent(state.query):'/book?'+params.toString();
      const data=await fetchJSON(base+endpoint);
      const rows=Array.isArray(data)?data:(data.books||data.items||data.data||[]);
      state.items=rows.map((b,i)=>{const id=String(b.id??b.book_id??b._id??i);return{id:'longbook:'+id,source:'longbook',sourceId:id,title:String(b.title??b.name??b.book_name??'Chưa có tiêu đề'),author:String(b.author??b.writer??'Chưa rõ tác giả'),genre:'all',kind:String(b.category??b.genre??'LongBook'),chapters:Number(b.chapter_count??b.chapters_count)||null,rating:null,pop:0,updated:0,cover:String(b.cover_url??b.cover??b.thumbnail??''),description:String(b.description??b.summary??''),status:String(b.status??'unknown'),raw:b};});
      state.source='longbook';render();if(!state.items.length)notify('LongBookApi đã phản hồi nhưng không nhận diện được danh sách truyện.');
    }catch(e){notify('LongBookApi chưa khả dụng: '+e.message);}
  }
  function resetFilters(){state.query='';state.genre='all';state.status='all';state.rating='all';state.catalogSource='all';state.contentType='all';state.sort='featured';$('#story-search').value='';$('#genre-filter').value='all';$('#status-filter').value='all';$('#rating-filter').value='all';$('#source-filter').value='all';if($('#content-type-filter'))$('#content-type-filter').value='all';$('[data-sort]').forEach(b=>{b.classList.toggle('active',b.dataset.sort===state.sort);b.setAttribute('aria-selected',String(b.dataset.sort===state.sort));});render();}
  function isAdultOnly(item) {
    const raw=String(item?.contentRating ?? item?.content_rating ?? item?.content_rating_label ?? item?.age_rating ?? '').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim();
    // Chấp nhận cả mã chuẩn lẫn nhãn do admin/importer lưu.
    return /(^|[^a-z])(erotica|pornographic|adult|mature|18\s*\+|18plus|nsfw|restricted)([^a-z]|$)/i.test(raw)
      || raw.includes('nguoi truong thanh')
      || raw.includes('danh cho nguoi lon')
      || raw.includes('chi danh cho nguoi lon');
  }
  async function canOpenAdultContent(item) {
    if(!isAdultOnly(item))return true;
    // Fail closed: nếu không xác minh được phiên đăng nhập thì không mở nội dung.
    return await requireSignedIn('đọc truyện 18+');
  }
  async function openDetail(id) {
    const s=state.items.find(x=>String(x.id)===String(id));if(!s)return;
    if(isStoryLocked(s)){notify('Truyện này hiện đã bị khóa bởi quản trị viên.');return;}
    if(!(await canOpenAdultContent(s)))return;
    state.selected=s;
    $('#detail-title').textContent=s.title;$('#detail-author').textContent=s.author||'Đang cập nhật';$('#detail-description').textContent=s.description||'Nguồn chưa cung cấp mô tả.';$('#detail-status').textContent=s.status||'Thông tin nguồn';$('#detail-cover').innerHTML=s.cover&&['mangadex','database','longbook','truyenviet'].includes(s.source)&&s.cover?'<img src="'+esc(s.cover)+'" alt="Bìa '+esc(s.title)+'">':'<i class="fa-solid '+esc(s.icon||'fa-book-open')+'"></i>';
    $('#detail-meta').textContent=(s.kind||'Truyện')+' · '+(s.chapters?s.chapters+' chương':s.source==='mangadex'?'MangaDex':s.source==='database'?'Catalog RoTruyện':s.source==='longbook'?'LongBook API':s.source==='truyenviet'?'Truyện Việt':'Bản demo');
    const read=$('#detail-read');read.disabled=!['mangadex','database','truyenviet'].includes(s.source);read.textContent=['mangadex','database','truyenviet'].includes(s.source)?'Xem chương / Tải lại':'Bản demo chưa có nội dung chương';
    if(isAdultOnly(s))$('#detail-meta').textContent+=' · 🔞 18+ · Yêu cầu đăng nhập';
    $('#chapter-list').innerHTML=['mangadex','database','truyenviet'].includes(s.source)?'<p>Đang tải danh sách chương…</p>':'';$('#detail-modal').hidden=false;document.body.classList.add('modal-open');if(['mangadex','database','truyenviet'].includes(s.source))loadChapters();
  }
  function closeModal(id){const m=$('#'+id);if(m)m.hidden=true;if(!$$('.modal:not([hidden])').length)document.body.classList.remove('modal-open');}
  async function loadChapters() {
    const selected=state.selected;if(!selected||!['mangadex','database','truyenviet'].includes(selected.source))return;
    const requestId=++state.chapterRequestId;
    const list=$('#chapter-list'),read=$('#detail-read');
    read.disabled=true;read.textContent='Đang tải chương…';
    list.innerHTML='<p>Đang tải danh sách chương…</p>';
    const isCurrent=()=>requestId===state.chapterRequestId&&state.selected===selected&&$('#detail-modal')&&!$('#detail-modal').hidden;
    try {
      if(selected.source==='truyenviet'){
        const params=new URLSearchParams({action:'chapters',source:selected.provider||'truyenfull',url:selected.externalUrl||selected.id});
        const data=await fetchJSON('/api/truyenviet?'+params.toString());
        if(!isCurrent())return;state.chapters=(data.chapters||[]).map(c=>({...c,source:'truyenviet'}));
        if(!state.chapters.length){list.innerHTML='<p>Chưa lấy được danh sách chương từ nguồn. Bạn có thể mở trang nguồn chính thức.</p><p><a class="btn" href="'+esc(selected.externalUrl)+'" target="_blank" rel="noopener noreferrer">Mở truyện tại nguồn ↗</a></p>';return;}
        list.innerHTML=state.chapters.map((c,i)=>'<button class="chapter-row" data-chapter="'+i+'"><span class="chapter-row-title"><span class="chapter-number">Chương '+esc(c.chapter_number||i+1)+'</span><span class="chapter-name">'+esc(c.title)+'</span></span><span class="chapter-row-meta"><small>Truyện Việt</small></span></button>').join('');return;
      }
      if(selected.source==='database'){
        const sb=window.rfSupabase;if(!sb)throw new Error('Supabase chưa sẵn sàng.');
        const {data:seriesState,error:seriesError}=await sb.from('rotruyen_series').select('is_locked').eq('id',selected.id).maybeSingle();
        if(seriesError)throw seriesError;
        if(seriesState?.is_locked){selected.isLocked=true;closeModal('detail-modal');notify('Truyện này hiện đã bị khóa bởi quản trị viên.');return;}
        const {data,error}=await sb.from('rotruyen_chapters').select('id,series_id,chapter_number,title,external_url,page_manifest,is_published,published_at').eq('series_id',selected.id).eq('is_published',true).order('chapter_number',{ascending:true}).limit(500);
        if(!isCurrent())return;
        if(error)throw error;state.chapters=data||[];
        if(!state.chapters.length){list.innerHTML='<p>Tác phẩm này chưa có chương được xuất bản.</p>';return;}
        list.innerHTML=state.chapters.map((c,i)=>'<button class="chapter-row" data-chapter="'+i+'"><span class="chapter-row-title"><span class="chapter-number">Chương '+esc(c.chapter_number)+'</span><span class="chapter-name">'+esc(c.title||'')+'</span></span><span class="chapter-row-meta"><small>Đọc</small></span></button>').join('');return;
      }
      // MangaDex: chỉ chương tiếng Việt; phân trang để không bỏ sót chương do giới hạn 100 kết quả.
      const rows=[];let offset=0,total=Infinity;
      while(offset<total&&rows.length<1000){
        const params=new URLSearchParams({limit:'100',offset:String(offset),'order[chapter]':'asc'});
        params.append('translatedLanguage[]','vi');
        params.append('contentRating[]','safe');params.append('contentRating[]','suggestive');
        params.append('includes[]','scanlation_group');
        const data=await fetchJSON(API+'/manga/'+encodeURIComponent(selected.id)+'/feed?'+params.toString());
        if(!isCurrent())return;
        const batch=Array.isArray(data.data)?data.data:[];
        rows.push(...batch.filter(c=>c.attributes?.translatedLanguage==='vi'&&Number(c.attributes?.pages)>0));
        total=Number(data.total||0);
        if(!batch.length||batch.length<100)break;
        offset+=batch.length;
      }
      if(!isCurrent())return;
      state.chapters=rows;
      if(!rows.length){list.innerHTML='<p>Truyện này hiện chưa có chương tiếng Việt công khai có trang đọc.</p>';return;}
      list.innerHTML=rows.map((c,i)=>{const group=(c.relationships||[]).find(r=>r.type==='scanlation_group')?.attributes?.name;return '<button class="chapter-row" data-chapter="'+i+'"><span class="chapter-row-title"><span class="chapter-number">Chương '+esc(c.attributes.chapter||'?')+'</span><span class="chapter-name">'+esc(c.attributes.title||'')+'</span></span><span class="chapter-row-meta">'+(group?'<span class="chapter-group">Nhóm dịch: '+esc(group)+'</span>':'')+'<small>vi</small></span></button>';}).join('');
    } catch(e){if(isCurrent())list.innerHTML='<p>Không tải được chương. '+esc(e.message)+'</p>';}
    finally{if(isCurrent()){read.disabled=false;read.textContent='Xem chương / Tải lại';}}
  }
  function persistReadProgress(force) {
    if (!state.selected || !state.chapters[state.chapterIndex]) return;
    const modal=$('#reader-modal');
    const chapter=state.chapters[state.chapterIndex];
    const key=String(state.selected.id);
    const max=Math.max(0,(modal?.scrollHeight||0)-(modal?.clientHeight||0));
    const ratio=max>0?Math.min(1,Math.max(0,(modal.scrollTop||0)/max)):0;
    readProgress[key]={mangaId:key,title:state.selected.title||'RoTruyện',source:state.selected.source||'unknown',chapterId:String(chapter.id||chapter.chapter_number||state.chapterIndex),chapter:String(chapter.attributes?.chapter||chapter.chapter_number||'?'),chapterIndex:state.chapterIndex,scrollRatio:ratio,updatedAt:Date.now()};
    if(progressSaveTimer)clearTimeout(progressSaveTimer);
    const save=()=>{memory.write('read-progress:v1',readProgress);};
    if(force)save();else progressSaveTimer=setTimeout(save,250);
  }
  function restoreReadProgress() {
    const saved=readProgress[String(state.selected?.id||'')];
    if(!saved || Number(saved.chapterIndex)!==state.chapterIndex)return;
    const modal=$('#reader-modal'),container=$('#reader-content');
    if(!modal)return;
    const apply=()=>{const max=Math.max(0,modal.scrollHeight-modal.clientHeight);if(max>0)modal.scrollTop=Math.round(max*Math.min(1,Math.max(0,Number(saved.scrollRatio)||0)));};
    requestAnimationFrame(()=>{apply();container?.querySelectorAll('img').forEach(img=>img.addEventListener('load',apply,{once:true}));});
  }
  function rememberChapter() {
    if(!state.selected || !state.chapters[state.chapterIndex]) return;
    const chapter=state.chapters[state.chapterIndex];
    const saved={mangaId:state.selected.id,title:state.selected.title,chapterId:chapter.id,chapter:chapter.attributes?.chapter||chapter.chapter_number||'?',updatedAt:Date.now()};
    state.history=[saved,...state.history.filter(x=>String(x.mangaId)!==String(saved.mangaId))].slice(0,100);
    memory.write('history:v1',state.history);
    scheduleCloudSync();
  }
  function wireReaderImages() {
    const container=$('#reader-content');
    container?.querySelectorAll('img').forEach((img)=>{
      img.addEventListener('error',()=>{
        if(img.dataset.roRetry==='1')return;
        img.dataset.roRetry='1';
        const original=img.getAttribute('src');
        if(original && original.startsWith('/api/mangadex-image?')){
          try{const u=new URL(original,location.origin);u.searchParams.set('retry',String(Date.now()));img.src=u.pathname+u.search;return;}catch(_){}
        }
        if(original){img.src=original;return;}
        img.alt='Không tải được ảnh. Hãy tải lại chương.';
      });
    });
  }
  async function openReader(index) {
    const chapter=state.chapters[index];if(!chapter)return;
    if(isStoryLocked(state.selected)){closeModal('reader-modal');notify('Truyện này hiện đã bị khóa bởi quản trị viên.');return;}
    if(!(await canOpenAdultContent(state.selected)))return;
    persistReadProgress(true);state.chapterIndex=index;const title=chapter.attributes?.chapter||chapter.chapter_number||'?';rememberChapter();
    $('#reader-title').textContent=(state.selected?.title||'RoTruyện')+' · Chương '+title;
    const prev=$('#reader-prev'),next=$('#reader-next'),position=$('#reader-chapter-position');
    if(prev)prev.disabled=index<=0;
    if(next)next.disabled=index>=state.chapters.length-1;
    if(position)position.textContent='Chương '+(index+1)+' / '+state.chapters.length;
    const chapterGroup=(chapter.relationships||[]).find(r=>r.type==='scanlation_group')?.attributes?.name;
    const readerCredit=$('#reader-source-credit');if(readerCredit)readerCredit.textContent=chapterGroup?'Nguồn: MangaDex · Nhóm dịch: '+chapterGroup:'Nguồn chương: MangaDex';
    $('#reader-content').innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải trang đọc…</p></div>';closeModal('detail-modal');$('#reader-modal').hidden=false;document.body.classList.add('modal-open');
    try {
      if(state.selected?.source==='truyenviet'){
        const params=new URLSearchParams({action:'chapter',source:chapter.provider||state.selected.provider||'truyenfull',url:chapter.url,title:chapter.title||''});
        const data=await fetchJSON('/api/truyenviet?'+params.toString());
        const body=data.chapter?.content;if(!body)throw new Error('Nguồn chưa cung cấp nội dung chương.');
        $('#reader-content').innerHTML='<article class="reader-text" style="max-width:820px;margin:0 auto;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.95;font-size:1.08rem">'+esc(body)+'</article>';
        const credit=$('#reader-source-credit');if(credit)credit.textContent='Nguồn chương: '+(chapter.provider||state.selected.provider||'Truyện Việt');
        restoreReadProgress();return;
      }
      if(state.selected?.source==='database'){
        const pages=Array.isArray(chapter.page_manifest)?chapter.page_manifest:[];
        const textBlocks=pages.filter(p=>p&&typeof p==='object'&&p.type==='text'&&typeof p.text==='string');
        if(textBlocks.length){
          $('#reader-content').innerHTML=textBlocks.map(p=>'<article class="reader-text" style="max-width:820px;margin:0 auto;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.95;font-size:1.08rem">'+esc(p.text)+'</article>').join('');
          restoreReadProgress();
          return;
        }
        if(pages.length){
          const urls=pages.map(p=>typeof p==='string'?p:p?.url).filter(u=>{try{return new URL(u).protocol==='https:'}catch(_){return false}});
          if(urls.length){$('#reader-content').innerHTML=urls.map((url,i)=>'<img loading="'+(i<2?'eager':'lazy')+'" src="'+esc(url)+'" alt="Trang '+(i+1)+'" referrerpolicy="no-referrer">').join('');wireReaderImages();restoreReadProgress();return;}
        }
        if(chapter.external_url&&/^https:\/\//i.test(chapter.external_url)){ $('#reader-content').innerHTML='<div class="reader-error"><h3>Chương nằm ở nguồn ngoài</h3><p>Để tôn trọng cách phân phối của nguồn, chương này sẽ mở trong tab riêng.</p><a class="btn" href="'+esc(chapter.external_url)+'" target="_blank" rel="noopener noreferrer">Mở chương ↗</a></div>';return; }
        throw new Error('Chương chưa có danh sách trang HTTPS hoặc URL nguồn hợp lệ.');
      }
      // Cùng luồng đọc MangaDex @Home như TruyenDex: lấy baseUrl/hash/data từ phản hồi,
      // sau đó proxy ảnh qua RoHub để tránh lỗi truy cập trực tiếp từ trình duyệt.
      const data=await fetchJSON(API+'/at-home/server/'+encodeURIComponent(chapter.id));
      const base=data.baseUrl, hash=data.chapter?.hash, files=data.chapter?.data;
      if(!base||!hash||!Array.isArray(files)||!files.length)throw new Error('MangaDex @Home không cung cấp ảnh chương.');
      let imageHost;
      try { const parsedBase=new URL(base); if(parsedBase.protocol!=='https:')throw new Error(); imageHost=parsedBase.hostname; }
      catch (_) { throw new Error('MangaDex @Home trả về baseUrl không hợp lệ.'); }
      const saverFiles=Array.isArray(data.chapter?.dataSaver)?data.chapter.dataSaver:[];
      const pageSrc=(kind, file)=>'/api/mangadex-image?host='+encodeURIComponent(imageHost)+'&path='+encodeURIComponent('/'+kind+'/'+encodeURIComponent(hash)+'/'+encodeURIComponent(file));
      const container=$('#reader-content');
      container.innerHTML=files.map((file,i)=>{const fallback=saverFiles[i]?pageSrc('data-saver', saverFiles[i]):'';return '<img loading="'+(i<2?'eager':'lazy')+'" src="'+esc(pageSrc('data', file))+'" data-saver="'+esc(fallback)+'" alt="Trang '+(i+1)+'" referrerpolicy="no-referrer">';}).join('');
      container.querySelectorAll('img[data-saver]').forEach(img=>{img.addEventListener('error',()=>{const next=img.getAttribute('data-saver');if(next&&!img.dataset.fallback){img.dataset.fallback='1';img.src=next;}});});wireReaderImages();restoreReadProgress();
    }catch(e){$('#reader-content').innerHTML='<div class="reader-error"><h3>Không thể tải chương</h3><p>'+esc(e.message)+'</p><p>Thử lại sau hoặc chọn chương khác.</p><button class="btn" id="retry-chapter">Thử lại</button></div>';$('#retry-chapter')?.addEventListener('click',()=>openReader(index));}
  }
  async function requireSignedIn(feature){const sb=window.rfSupabase;if(!sb){notify('Dịch vụ tài khoản chưa sẵn sàng.');return false;}try{const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data?.user){notify('Đăng nhập RoHub để dùng '+feature+'.');location.href='rotruyen-account.html';return false;}return true;}catch(e){notify('Không kiểm tra được tài khoản: '+e.message);return false;}}
  async function showSaved() {
    if(!(await requireSignedIn('tủ truyện yêu thích')))return;
    const items=state.items.filter(s=>state.saved.has(String(s.id)));
    if(!items.length){notify('Tủ truyện yêu thích đang trống.');return;}
    const grid=$('#story-grid');grid.innerHTML=items.map(s=>'<article class="story"><div class="story-open" data-open="'+esc(s.id)+'" role="button" tabindex="0">'+coverMarkup(s)+'<h3>'+esc(s.title)+'</h3></div><p>'+esc(s.author||'')+'</p></article>').join('');
    $('#result-count').textContent=items.length+' truyện yêu thích';$('#empty-state').hidden=true;$('#stories').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  async function showHistory(){if(!(await requireSignedIn('lịch sử đọc')))return;const grid=$('#story-grid');if(!grid)return;const rows=[...state.history].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));if(!rows.length){notify('Bạn chưa có lịch sử đọc.');return;}const known=new Map(state.items.map(x=>[String(x.id),x]));grid.innerHTML=rows.map(h=>{const item=known.get(String(h.mangaId));return '<article class="story"><div class="story-open" '+(item?'data-open="'+esc(item.id)+'"':'')+' role="button" tabindex="0">'+(item?coverMarkup(item):'<div class="cover"><i class="fa-solid fa-book-open"></i></div>')+'<h3>'+esc(h.title||item?.title||'Truyện')+'</h3></div><p>'+esc(h.chapter||'Đã đọc')+'</p></article>';}).join('');$('#result-count').textContent=rows.length+' mục lịch sử';$('#empty-state').hidden=true;$('#stories').scrollIntoView({behavior:'smooth'});}
  function safeHttps(value,label,optional=true){
    const v=String(value||'').trim();if(!v&&optional)return '';
    let u;try{u=new URL(v)}catch(_){throw new Error(label+' phải là URL hợp lệ.');}
    if(u.protocol!=='https:')throw new Error(label+' phải dùng HTTPS.');
    return u.href;
  }
  function slugify(value){
    return String(value||'truyen-moi').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'truyen-moi';
  }
  async function submitStory(event){
    event.preventDefault();
    const sb=window.rfSupabase, message=$('#submit-story-message'), save=$('#submit-story-save');
    const say=t=>{if(message)message.textContent=t;};
    if(!sb){say('Dịch vụ tài khoản chưa sẵn sàng. Hãy tải lại trang.');return;}
    save.disabled=true;say('Đang kiểm tra tài khoản và gửi truyện…');
    try{
      const {data:userResult,error:userError}=await sb.auth.getUser();
      if(userError||!userResult?.user){say('Bạn cần đăng nhập tài khoản RoHub trước khi đăng truyện.');return;}
      const user=userResult.user;
      const {data:profile,error:profileError}=await sb.from('profiles').select('role,account_status').eq('id',user.id).maybeSingle();
      if(profileError)throw profileError;
      if(profile?.account_status&&profile.account_status!=='active')throw new Error('Tài khoản hiện không được phép đăng nội dung.');
      const isAdmin=profile?.role==='admin';
      const title=$('#submit-title').value.trim();
      if(title.length<2)throw new Error('Tên truyện cần ít nhất 2 ký tự.');
      const cover=safeHttps($('#submit-cover').value,'Link ảnh bìa');
      const chapterUrl=safeHttps($('#submit-chapter-url').value,'Link chương');
      const pageLines=$('#submit-chapter-pages').value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
      const pages=pageLines.map((url,i)=>({url:safeHttps(url,'Link ảnh trang '+(i+1),false)}));
      if((chapterUrl||pages.length)===false)throw new Error(''); 
      if((chapterUrl||pages.length>0)===false)throw new Error(''); 
      if((chapterUrl||pages.length)&&!chapterUrl&&!pages.length)throw new Error('Hãy cung cấp link chương hoặc ít nhất một link ảnh.');
      const baseSlug=slugify(title);
      const seriesPayload={
        title,slug:baseSlug+'-'+Date.now().toString(36).slice(-5),
        synopsis:$('#submit-synopsis').value.trim(),cover_url:cover,
        author:$('#submit-author').value.trim()||user.user_metadata?.display_name||user.email?.split('@')[0]||'Tác giả ẩn danh',
        source_key:'manual',genres:$('#submit-genre').value==='other'?['Khác']:[$('#submit-genre').value],
        content_rating:$('#submit-rating').value,status:$('#submit-status').value,
        is_published:isAdmin,created_by:user.id,sort_order:0
      };
      const {data:series,error:seriesError}=await sb.from('rotruyen_series').insert(seriesPayload).select('id,title,is_published').single();
      if(seriesError)throw seriesError;
      const chapterNumber=Number($('#submit-chapter-number').value||1);
      if(chapterUrl||pages.length){
        const chapterPayload={series_id:series.id,chapter_number:chapterNumber,title:$('#submit-chapter-title').value.trim(),external_url:chapterUrl,page_manifest:pages,is_published:isAdmin,published_at:isAdmin?new Date().toISOString():null};
        const {error:chapterError}=await sb.from('rotruyen_chapters').insert(chapterPayload);
        if(chapterError)throw new Error('Đã tạo truyện nhưng chưa lưu được chương đầu: '+chapterError.message);
      }
      say(isAdmin?'Đã đăng và xuất bản truyện thành công!':'Đã gửi truyện thành công. Truyện đang chờ admin duyệt.');
      notify(isAdmin?'Truyện đã được xuất bản.':'Đã gửi truyện, chờ duyệt.');
      $('#submit-story-form').reset();
      if(isAdmin){closeModal('submit-story-modal');await loadOwnCatalog();}
    }catch(e){say('Chưa gửi được truyện: '+(e.message||'Vui lòng kiểm tra thông tin.'));}
    finally{save.disabled=false;}
  }
  async function openSubmitStory(){
    const sb=window.rfSupabase;
    if(!sb){notify('Tài khoản RoHub chưa sẵn sàng.');return;}
    try{const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data?.user){notify('Hãy đăng nhập để đăng truyện.');location.href='rotruyen-account.html';return;}
      $('#submit-story-message').textContent='';
      $('#submit-story-modal').hidden=false;document.body.classList.add('modal-open');
    }catch(e){notify('Không kiểm tra được phiên đăng nhập: '+e.message);}
  }

  async function loadAutomaticCatalog() {
    const grid=$('#story-grid');
    if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải truyện tự động từ RoTruyện và MangaDex…</p></div>';
    // Tải truyện người dùng/admin đã xuất bản trước, sau đó bổ sung catalog Vietsub từ MangaDex.
    let ownItems=[];
    try {
      const sb=window.rfSupabase;
      if(sb){
        const {data,error}=await sb.from('rotruyen_series').select('id,title,slug,synopsis,cover_url,author,source_key,source_id,genres,content_rating,status,is_published,sort_order').eq('is_published',true).order('sort_order',{ascending:true}).limit(100);
        if(error)throw error;
        ownItems=(data||[]).map(s=>({id:s.id,source:'database',title:s.title,author:s.author,genre:(s.genres||[])[0]||'all',kind:(s.genres||[]).join(' · ')||'Truyện',chapters:null,rating:null,pop:0,updated:0,cover:s.cover_url,description:s.synopsis,status:s.status,contentRating:s.content_rating,sourceId:s.source_id}));
      }
    } catch(e) { console.warn('[RoTruyện catalog]',e.message||e); }
    state.source='mixed';
    state.items=ownItems;
    render();
    // Gộp cả ba nguồn vào thư viện mặc định để người dùng không phải tự chọn từng provider.
    const [mangaResult, vietResult] = await Promise.allSettled([
      searchMangaDex(),
      fetchJSON('/api/truyenviet?action=search&source=all'+(state.query.trim()?'&q='+encodeURIComponent(state.query.trim()):''))
    ]);
    const mangaItems = mangaResult.status==='fulfilled' ? mangaResult.value : [];
    const vietItems = vietResult.status==='fulfilled' ? (vietResult.value.items||[]).map(item=>({...item,source:'truyenviet',contentType:'novel',kind:item.kind||'Tiểu thuyết',chapters:null,raw:item})) : [];
    if(mangaResult.status==='rejected') console.warn('[RoTruyen MangaDex catalog]',mangaResult.reason);
    if(vietResult.status==='rejected') console.warn('[RoTruyen Truyện Việt catalog]',vietResult.reason);
    const existing=new Set(ownItems.map(x=>String(x.id)));
    const combined=[...ownItems,...mangaItems.filter(x=>!existing.has(String(x.id)))];
    const known=new Set(combined.map(x=>String(x.id)));
    state.items=[...combined,...vietItems.filter(x=>!known.has(String(x.id)))];
    render();
    const errors=[];
    if(mangaResult.status==='rejected')errors.push('MangaDex');
    if(vietResult.status==='rejected')errors.push('Truyện Việt');
    else if(vietResult.value.errors?.length)errors.push(...vietResult.value.errors.map(x=>x.source));
    if(errors.length)notify('Một số nguồn chưa phản hồi: '+[...new Set(errors)].join(', '));
    if(!state.items.length)notify('Chưa có truyện từ thư viện, MangaDex hoặc Truyện Việt.');
  }

async function loadPublicGenres(){
    const select=$('#genre-filter'),sb=window.rfSupabase;if(!select||!sb)return;
    try{
      const {data,error}=await sb.from('rotruyen_genres').select('name,slug').eq('is_active',true).order('sort_order',{ascending:true}).limit(200);
      if(error)throw error;
      const current=select.value,existing=new Set(Array.from(select.options).map(o=>o.value));
      (data||[]).forEach(g=>{if(!existing.has(g.slug)){const option=document.createElement('option');option.value=g.slug;option.textContent=g.name;select.appendChild(option);existing.add(g.slug);}});
      if(Array.from(select.options).some(o=>o.value===current))select.value=current;
    }catch(error){console.warn('[RoTruyen genres]',error.message||error);}
  }
  function bind() {
    $('#story-search').addEventListener('input',e=>{state.query=e.target.value;render();});
    $('#genre-filter').addEventListener('change',e=>{state.genre=e.target.value;render();});
    $('#status-filter')?.addEventListener('change',e=>{state.status=e.target.value;render();});
    $('#rating-filter')?.addEventListener('change',e=>{state.rating=e.target.value;render();});
    $('#source-filter')?.addEventListener('change',e=>{state.catalogSource=e.target.value;const v=e.target.value;if(v==='truyenviet')loadTruyenViet();else if(v==='mangadex'){state.source='mangadex';loadCatalog();}else if(v==='database')loadOwnCatalog();else if(v==='all')loadAutomaticCatalog();else render();});
    $('#story-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&state.source==='truyenviet')loadTruyenViet();});
    $('#content-type-filter')?.addEventListener('change',e=>{state.contentType=e.target.value;render();});
    $('#reset-filters').addEventListener('click',resetFilters);$('#empty-reset').addEventListener('click',resetFilters);
    $$('[data-sort]').forEach(b=>b.addEventListener('click',()=>{state.sort=b.dataset.sort;$$('[data-sort]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});render();}));
    $('#story-grid').addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){e.preventDefault();e.stopPropagation();requireSignedIn('tủ truyện yêu thích').then(ok=>{if(!ok)return;const id=save.dataset.save;state.saved.has(id)?state.saved.delete(id):state.saved.add(id);memory.write('saved:v1',[...state.saved]);render();scheduleCloudSync();notify(state.saved.has(id)?'Đã lưu truyện vào tủ.':'Đã bỏ lưu truyện.');});return;}const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);}});
    $('#show-saved').addEventListener('click',showSaved);
    $('#show-history')?.addEventListener('click',showHistory);
    $('#open-submit-story')?.addEventListener('click',openSubmitStory);
    $('#submit-story-close')?.addEventListener('click',()=>closeModal('submit-story-modal'));
    $('#submit-story-form')?.addEventListener('submit',submitStory);
    $('#focus-search').addEventListener('click',()=>{$('#story-search').focus();$('#stories').scrollIntoView({behavior:'smooth'});});
    $('#load-source')?.addEventListener('click',()=>{state.source='mangadex';loadCatalog();});
    $('#load-catalog')?.addEventListener('click',loadOwnCatalog);
    $('#load-longbook')?.addEventListener('click',loadLongBook);
    $('#detail-close').addEventListener('click',()=>closeModal('detail-modal'));$('#reader-close').addEventListener('click',()=>closeModal('reader-modal'));
    $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
    $('#detail-read').addEventListener('click',loadChapters);
    $('#chapter-list').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)openReader(Number(b.dataset.chapter));});
    $('#reader-prev')?.addEventListener('click',()=>{if(state.chapterIndex>0)openReader(state.chapterIndex-1);});
    $('#reader-next')?.addEventListener('click',()=>{if(state.chapterIndex<state.chapters.length-1)openReader(state.chapterIndex+1);});
    $('#reader-modal')?.addEventListener('scroll',()=>persistReadProgress(false),{passive:true});
    $('#reader-close')?.addEventListener('click',()=>persistReadProgress(true));
    $('#mobile-menu').addEventListener('click',()=>$('#rt-nav').classList.toggle('open'));
    $('#security-dismiss')?.addEventListener('click',()=>{const el=$('#devtools-block');if(el)el.style.display='none';});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal:not([hidden])').forEach(m=>closeModal(m.id));if(e.key==='/'&&!/input|textarea|select/i.test(document.activeElement.tagName)){e.preventDefault();$('#story-search').focus();}});
  }
  const THEME_KEY='rohub-theme';
  function rtGetTheme(){try{return localStorage.getItem(THEME_KEY)==='light'?'light':'dark'}catch(_){return 'dark'}}
  function rtSetTheme(value){const t=value==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.body.dataset.theme=t;try{localStorage.setItem(THEME_KEY,t)}catch(_){}const b=$('#theme-toggle');if(b){const i=b.querySelector('i');if(i)i.className='fa-solid '+(t==='dark'?'fa-sun':'fa-moon');b.title=t==='dark'?'Chuyển sang giao diện sáng':'Chuyển sang giao diện tối';b.setAttribute('aria-label',b.title)}const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'#090909':'#f3f4f6'}
  rtSetTheme(rtGetTheme());
  $('#theme-toggle')?.addEventListener('click',()=>rtSetTheme(rtGetTheme()==='dark'?'light':'dark'));
  window.addEventListener('storage',e=>{if(e.key===THEME_KEY)rtSetTheme(e.newValue)});
  async function rtRenderAccountLink(){const link=$('#rt-account-link'),label=$('#rt-account-label'),sb=window.rfSupabase;if(!link||!sb)return;try{const {data}=await sb.auth.getUser();const user=data?.user;if(user){let p={};try{p=JSON.parse(localStorage.getItem('roflix-profile')||'{}')}catch(_){}link.href='rotruyen-account.html';if(label)label.textContent=(user.user_metadata?.display_name||p.name||user.email?.split('@')[0]||'Tài khoản').slice(0,24);link.title='Tài khoản '+(user.email||'')}else{link.href='rotruyen-account.html';if(label)label.textContent='Đăng nhập'}}catch(_){if(label)label.textContent='Tài khoản'}}
  rtRenderAccountLink();
  if(window.rfSupabase){window.rfSupabase.auth.onAuthStateChange(()=>{setTimeout(rtRenderAccountLink,0)})}
  bind();render();connectRealtime();syncCloudLibrary();loadPublicGenres();loadAutomaticCatalog();
})();