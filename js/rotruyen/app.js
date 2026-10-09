(function () {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const API = 'https://api.mangadex.org';
  // TruyenDex is a MangaDex-powered frontend project, not a separate public REST API.
  // RoTruyen integrates MangaDex's documented public API directly.
  const DEMOS = [
    {id:'demo-1',title:'Thành Phố Sau Hoàng Hôn',author:'RoTruyen Studio',genre:'fantasy',kind:'Fantasy',chapters:42,rating:9.2,pop:98,updated:6,icon:'fa-city',cover:'#282449',glow:'#8c6ce0',accent:'#d3b9ff',description:'Một thành phố nơi những vì sao chỉ xuất hiện sau hoàng hôn. Nhân vật chính bắt đầu hành trình tìm ra bí mật của bầu trời.'},
    {id:'demo-2',title:'Kiếm Sĩ Cuối Cùng',author:'RoTruyen Studio',genre:'action',kind:'Hành động',chapters:86,rating:9.5,pop:100,updated:1,icon:'fa-khanda',cover:'#402b38',glow:'#d66d70',accent:'#ffc1a7',description:'Truyện mẫu dùng để trình diễn giao diện danh mục và trang chi tiết.'},
    {id:'demo-3',title:'Khu Vườn Của Những Vì Sao',author:'RoTruyen Studio',genre:'romance',kind:'Lãng mạn',chapters:24,rating:8.9,pop:82,updated:2,icon:'fa-star',cover:'#243b4b',glow:'#58a9d4',accent:'#a5e4ff',description:'Một câu chuyện nhẹ nhàng về những lời hứa, ký ức và một khu vườn nhỏ.'},
    {id:'demo-4',title:'Biên Niên Sử Lục Địa',author:'RoTruyen Studio',genre:'adventure',kind:'Phiêu lưu',chapters:112,rating:9.4,pop:95,updated:3,icon:'fa-mountain-sun',cover:'#423521',glow:'#d9a64b',accent:'#f9d58b',description:'Hành trình phiêu lưu qua những vùng đất chưa được vẽ lên bản đồ.'},
    {id:'demo-5',title:'Ngày Mai Không Có Mưa',author:'RoTruyen Studio',genre:'drama',kind:'Chính kịch',chapters:18,rating:8.7,pop:73,updated:4,icon:'fa-cloud-moon',cover:'#293447',glow:'#7c91bd',accent:'#c9d7ff',description:'Truyện minh họa cho bản giao diện đầu tiên của RoTruyện.'},
    {id:'demo-6',title:'Pháp Sư Và Chiếc Đồng Hồ',author:'RoTruyen Studio',genre:'fantasy',kind:'Fantasy',chapters:57,rating:9.1,pop:89,updated:0,icon:'fa-hourglass-half',cover:'#362943',glow:'#a56cce',accent:'#e9c7ff',description:'Một chiếc đồng hồ cổ có thể mở ra cánh cửa đến những thời điểm đã mất.'}
  ];
  const state = {source:'demo',query:'',genre:'all',sort:'featured',items:[],saved:new Set(),history:[],selected:null,chapters:[],chapterIndex:0,chapterPages:[],apiBusy:false,readerBusy:false};
  const memory = {
    read(key, fallback) { try { const v=JSON.parse(localStorage.getItem('rotruyen:'+key)); return v ?? fallback; } catch (_) { return fallback; } },
    write(key, value) { try { localStorage.setItem('rotruyen:'+key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  };
  state.saved = new Set(memory.read('saved:v1', []));
  state.history = memory.read('history:v1', []);
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
    return id && file ? 'https://uploads.mangadex.org/covers/'+encodeURIComponent(id)+'/'+encodeURIComponent(file)+'.256.jpg' : '';
  }
  function mapManga(item) {
    const a=item.attributes||{};
    const tags=(a.tags||[]).map(t=>t.attributes?.name?.en||'').filter(Boolean);
    const tagText=tags.join(' ').toLowerCase();
    const genre=tagText.includes('romance')?'romance':tagText.includes('action')?'action':tagText.includes('drama')?'drama':tagText.includes('adventure')?'adventure':'fantasy';
    return {id:item.id,source:'mangadex',title:titleOf(item),author:(item.relationships||[]).find(r=>r.type==='author')?.attributes?.name||'Chưa rõ tác giả',genre,kind:tags.slice(0,2).join(' · ')||'Manga',chapters:null,rating:null,pop:0,updated:0,cover:coverOf(item),description:a.description?.vi||a.description?.en||'Chưa có mô tả.',status:a.status||'unknown',contentRating:a.contentRating||'safe',raw:item};
  }
  async function fetchJSON(url, options={}) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(url,{...options,signal:controller.signal,headers:{Accept:'application/json',...(options.headers||{})}});
      if(!response.ok) throw new Error('Nguồn truyện trả về HTTP '+response.status);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  async function searchMangaDex() {
    const buildParams = (preferVietnamese) => {
      const params=new URLSearchParams({limit:'24',offset:'0'});
      params.set('order[followedCount]','desc');
      params.append('includes[]','cover_art');
      params.append('includes[]','author');
      params.append('contentRating[]','safe');
      params.append('contentRating[]','suggestive');
      if(state.query.trim()) params.set('title',state.query.trim());
      // Ưu tiên truyện có bản dịch tiếng Việt, nhưng đừng để bộ lọc này làm catalog trắng.
      if(preferVietnamese) params.append('availableTranslatedLanguage[]','vi');
      if(state.genre!=='all') {
        const tagIds={action:'391b0423-d847-456f-aff0-8b0cfc03066b',romance:'423e2eae-a7a2-4a8b-ac03-a8351462d71d',drama:'b9af3a63-f058-46de-a9a0-e0c13906197a',adventure:'3b60b75c-a2d7-4860-ab56-05f391bb889c',fantasy:'cdc58593-87dd-415e-bbc0-2ec27bf404cc'};
        if(tagIds[state.genre]) params.append('includedTags[]',tagIds[state.genre]);
      }
      return params;
    };
    let data;
    try {
      data=await fetchJSON(API+'/manga?'+buildParams(true).toString());
      if(!(data.data||[]).length && !state.query.trim() && state.genre==='all') {
        data=await fetchJSON(API+'/manga?'+buildParams(false).toString());
      }
    } catch(firstError) {
      // Thử lại một lần với truy vấn rộng hơn để tránh bộ lọc ngôn ngữ làm hỏng việc tải catalog.
      try {
        data=await fetchJSON(API+'/manga?'+buildParams(false).toString());
      } catch(secondError) {
        throw new Error('Không kết nối được MangaDex API. '+secondError.message);
      }
    }
    return (data.data||[]).map(mapManga);
  }
  function activeItems() {
    let items=state.items.filter(s=>(!state.query || s.title.toLocaleLowerCase('vi').includes(state.query.toLocaleLowerCase('vi')) || (s.author||'').toLocaleLowerCase('vi').includes(state.query.toLocaleLowerCase('vi')))&&(state.genre==='all'||s.genre===state.genre));
    if(state.sort==='latest') items=[...items].sort((a,b)=>(b.updated||0)-(a.updated||0));
    if(state.sort==='popular') items=[...items].sort((a,b)=>(b.pop||0)-(a.pop||0));
    if(state.sort==='rating') items=[...items].sort((a,b)=>(b.rating||0)-(a.rating||0));
    return items;
  }
  function coverMarkup(s) {
    const style='--cover:'+esc(s.coverColor||'#282449')+';--glow:'+esc(s.glow||'#8c6ce0')+';--accent:'+esc(s.accent||'#d3b9ff');
    const visual=s.cover && ['mangadex','database','longbook'].includes(s.source) && s.cover ? '<img loading="lazy" src="'+esc(s.cover)+'" alt="">' : '<i class="fa-solid '+esc(s.icon||'fa-book-open')+'"></i>';
    return '<div class="cover" style="'+style+'">'+visual+'<small>'+esc(s.kind||'Truyện')+'</small><button data-save="'+esc(s.id)+'" class="'+(state.saved.has(s.id)?'saved':'')+'" aria-label="'+(state.saved.has(s.id)?'Bỏ lưu':'Lưu truyện')+'"><i class="fa-'+(state.saved.has(s.id)?'solid':'regular')+' fa-bookmark"></i></button></div>';
  }
  function render() {
    const items=activeItems(), grid=$('#story-grid'); if(!grid)return;
    grid.innerHTML=items.map(s=>'<article class="story"><div class="story-open" data-open="'+esc(s.id)+'" role="button" tabindex="0" aria-label="Xem chi tiết '+esc(s.title)+'">'+coverMarkup(s)+'<h3 title="'+esc(s.title)+'">'+esc(s.title)+'</h3></div><p>'+esc(s.author||'Đang cập nhật')+'</p><div class="meta"><span>'+(s.chapters?s.chapters+' chương':s.source==='mangadex'?'MangaDex':'Bản mẫu')+'</span><span class="rating">'+(s.rating?'★ '+s.rating.toFixed(1):s.source==='mangadex'?'Nguồn ngoài':'★ Demo')+'</span></div></article>').join('');
    const count=$('#result-count'); if(count)count.textContent=items.length+' kết quả'+(state.source==='demo'?' mẫu':'');
    const empty=$('#empty-state'); if(empty)empty.hidden=!!items.length;
    const rank=$('#ranking-list'); if(rank)rank.innerHTML=[...state.items].sort((a,b)=>(b.pop||0)-(a.pop||0)).slice(0,4).map((s,i)=>'<div class="ranking"><span class="rank">0'+(i+1)+'</span><span class="rank-info"><b>'+esc(s.title)+'</b><small>'+esc(s.kind||'Truyện')+'</small></span><span>'+(s.rating?'★ '+s.rating.toFixed(1):'↗')+'</span></div>').join('')||'<p class="muted">Chưa có dữ liệu xếp hạng từ nguồn này.</p>';
    renderSavedCount();
  }
  function renderSavedCount(){const el=$('#saved-count');if(el)el.textContent=state.saved.size;}
  async function loadOwnCatalog() {
    const sb=window.rfSupabase;
    if(!sb){state.source='demo';state.items=DEMOS;render();notify('Supabase chưa sẵn sàng, đang hiển thị dữ liệu mẫu.');return;}
    const grid=$('#story-grid');if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải catalog RoTruyện…</p></div>';
    try{
      const {data,error}=await sb.from('rotruyen_series').select('id,title,slug,synopsis,cover_url,author,source_key,source_id,genres,content_rating,status,is_published,sort_order').eq('is_published',true).order('sort_order',{ascending:true}).limit(100);
      if(error)throw error;
      state.items=(data||[]).map(s=>({id:s.id,source:'database',title:s.title,author:s.author,genre:(s.genres||[])[0]||'all',kind:(s.genres||[]).join(' · ')||'Truyện',chapters:null,rating:null,pop:0,updated:0,cover:s.cover_url,description:s.synopsis,status:s.status,contentRating:s.content_rating,sourceId:s.source_id}));
      state.source='database';
      if(!state.items.length){state.items=DEMOS;state.source='demo';notify('Catalog chưa có tác phẩm đã xuất bản. Đang hiển thị dữ liệu mẫu.');}
      render();
    }catch(e){state.items=DEMOS;state.source='demo';render();notify('Catalog chưa sẵn sàng: '+e.message+'. Đang dùng dữ liệu mẫu.');}
  }
  async function loadCatalog() {
    try{const sb=window.rfSupabase;if(sb){const {data:cfg}=await sb.from('rotruyen_settings').select('value').eq('key','public.sources').maybeSingle();if(cfg?.value?.mangadex?.enabled===false){notify('MangaDex đã bị tắt trong RoTruyện Admin.');return;}}}catch(_){}
    if(state.source==='demo'){state.items=DEMOS;render();return;}
    state.apiBusy=true; const btn=$('#load-source');if(btn){btn.disabled=true;btn.textContent='Đang kết nối…';}
    const grid=$('#story-grid');if(grid)grid.innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải danh mục từ MangaDex…</p></div>';
    try {state.items=await searchMangaDex();render();if(!state.items.length)notify('Nguồn đã phản hồi nhưng chưa có kết quả phù hợp.');}
    catch(e){state.items=DEMOS;state.source='demo';render();notify('MangaDex chưa tải được: '+(e.name==='AbortError'?'hết thời gian chờ':e.message)+'. Đang hiển thị truyện mẫu, hãy thử lại.');}
    finally{state.apiBusy=false;if(btn){btn.disabled=false;btn.textContent='Tải truyện từ MangaDex';}}
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
  function resetFilters(){state.query='';state.genre='all';state.sort='featured';$('#story-search').value='';$('#genre-filter').value='all';$$('[data-sort]').forEach(b=>{b.classList.toggle('active',b.dataset.sort===state.sort);b.setAttribute('aria-selected',String(b.dataset.sort===state.sort));});render();}
  function openDetail(id) {
    const s=state.items.find(x=>x.id===id)||DEMOS.find(x=>x.id===id);if(!s)return;state.selected=s;
    $('#detail-title').textContent=s.title;$('#detail-author').textContent=s.author||'Đang cập nhật';$('#detail-description').textContent=s.description||'Nguồn chưa cung cấp mô tả.';$('#detail-status').textContent=s.status||'Thông tin nguồn';$('#detail-cover').innerHTML=s.cover&&['mangadex','database','longbook'].includes(s.source)&&s.cover?'<img src="'+esc(s.cover)+'" alt="Bìa '+esc(s.title)+'">':'<i class="fa-solid '+esc(s.icon||'fa-book-open')+'"></i>';
    $('#detail-meta').textContent=(s.kind||'Truyện')+' · '+(s.chapters?s.chapters+' chương':s.source==='mangadex'?'MangaDex':s.source==='database'?'Catalog RoTruyện':s.source==='longbook'?'LongBook API':'Bản demo');
    const read=$('#detail-read');read.disabled=!['mangadex','database'].includes(s.source);read.textContent=s.source==='mangadex'?'Xem chương có sẵn':s.source==='database'?'Xem chương đã xuất bản':'Bản demo chưa có nội dung chương';$('#detail-modal').hidden=false;document.body.classList.add('modal-open');
  }
  function closeModal(id){const m=$('#'+id);if(m)m.hidden=true;if(!$$('.modal:not([hidden])').length)document.body.classList.remove('modal-open');}
  async function loadChapters() {
    const s=state.selected;if(!s||!['mangadex','database'].includes(s.source))return;
    const list=$('#chapter-list');list.innerHTML='<p>Đang tải danh sách chương…</p>';
    try {
      if(s.source==='database'){
        const sb=window.rfSupabase;if(!sb)throw new Error('Supabase chưa sẵn sàng.');
        const {data,error}=await sb.from('rotruyen_chapters').select('id,series_id,chapter_number,title,external_url,page_manifest,is_published,published_at').eq('series_id',s.id).eq('is_published',true).order('chapter_number',{ascending:true}).limit(500);
        if(error)throw error;state.chapters=data||[];
        if(!state.chapters.length){list.innerHTML='<p>Tác phẩm này chưa có chương được xuất bản.</p>';return;}
        list.innerHTML=state.chapters.map((c,i)=>'<button class="chapter-row" data-chapter="'+i+'"><span>Chương '+esc(c.chapter_number)+' '+esc(c.title||'')+'</span><small>Đọc</small></button>').join('');return;
      }
      const p=new URLSearchParams({limit:'100','order[chapter]':'asc'});p.append('translatedLanguage[]','vi');p.append('contentRating[]','safe');p.append('contentRating[]','suggestive');p.append('includes[]','scanlation_group');
      const data=await fetchJSON(API+'/manga/'+encodeURIComponent(s.id)+'/feed?'+p.toString());
      state.chapters=(data.data||[]).filter(c=>c.attributes?.pages>0);
      if(!state.chapters.length){list.innerHTML='<p>Nguồn chưa có chương tiếng Việt công khai cho truyện này.</p>';return;}
      list.innerHTML=state.chapters.map((c,i)=>{const group=(c.relationships||[]).find(r=>r.type==='scanlation_group')?.attributes?.name;return '<button class="chapter-row" data-chapter="'+i+'"><span>Chương '+esc(c.attributes.chapter||'?')+' '+esc(c.attributes.title||'')+(group?'<small>Nhóm dịch: '+esc(group)+'</small>':'')+'</span><small>'+esc(c.attributes.translatedLanguage||'')+'</small></button>';}).join('');
    } catch(e){list.innerHTML='<p>Không tải được chương. '+esc(e.message)+'</p>';}
  }
  async function openReader(index) {
    const chapter=state.chapters[index];if(!chapter)return;
    state.chapterIndex=index;const title=chapter.attributes?.chapter||chapter.chapter_number||'?';
    $('#reader-title').textContent=(state.selected?.title||'RoTruyện')+' · Chương '+title;
    const chapterGroup=(chapter.relationships||[]).find(r=>r.type==='scanlation_group')?.attributes?.name;
    const readerCredit=$('#reader-source-credit');if(readerCredit)readerCredit.textContent=chapterGroup?'Nguồn: MangaDex · Nhóm dịch: '+chapterGroup:'Nguồn chương: MangaDex';
    $('#reader-content').innerHTML='<div class="loading-state"><span class="spinner"></span><p>Đang tải trang đọc…</p></div>';closeModal('detail-modal');$('#reader-modal').hidden=false;document.body.classList.add('modal-open');
    try {
      if(state.selected?.source==='database'){
        const pages=Array.isArray(chapter.page_manifest)?chapter.page_manifest:[];
        if(pages.length){const urls=pages.map(p=>typeof p==='string'?p:p?.url).filter(u=>{try{return new URL(u).protocol==='https:'}catch(_){return false}});if(urls.length){$('#reader-content').innerHTML=urls.map((url,i)=>'<img loading="'+(i<2?'eager':'lazy')+'" src="'+esc(url)+'" alt="Trang '+(i+1)+'" referrerpolicy="no-referrer">').join('');return;}}
        if(chapter.external_url&&/^https:\/\//i.test(chapter.external_url)){ $('#reader-content').innerHTML='<div class="reader-error"><h3>Chương nằm ở nguồn ngoài</h3><p>Để tôn trọng cách phân phối của nguồn, chương này sẽ mở trong tab riêng.</p><a class="btn" href="'+esc(chapter.external_url)+'" target="_blank" rel="noopener noreferrer">Mở chương ↗</a></div>';return; }
        throw new Error('Chương chưa có danh sách trang HTTPS hoặc URL nguồn hợp lệ.');
      }
      const data=await fetchJSON(API+'/at-home/server/'+encodeURIComponent(chapter.id));
      const base=data.baseUrl, hash=data.chapter?.hash, files=data.chapter?.data;
      if(!base||!hash||!Array.isArray(files)||!files.length)throw new Error('Nguồn không cung cấp ảnh chương.');
      const container=$('#reader-content');container.innerHTML=files.map((file,i)=>'<img loading="'+(i<2?'eager':'lazy')+'" src="'+esc(base+'/data/'+encodeURIComponent(hash)+'/'+encodeURIComponent(file))+'" alt="Trang '+(i+1)+'" referrerpolicy="no-referrer">').join('');
      const saved={mangaId:state.selected.id,title:state.selected.title,chapterId:chapter.id,chapter:title,updatedAt:Date.now()};state.history=[saved,...state.history.filter(x=>x.mangaId!==saved.mangaId)].slice(0,100);memory.write('history:v1',state.history);
    }catch(e){$('#reader-content').innerHTML='<div class="reader-error"><h3>Không thể tải chương</h3><p>'+esc(e.message)+'</p><p>Thử lại sau hoặc chọn chương khác.</p><button class="btn" id="retry-chapter">Thử lại</button></div>';$('#retry-chapter')?.addEventListener('click',()=>openReader(index));}
  }
  function showSaved() {
    const items=state.items.filter(s=>state.saved.has(s.id));
    if(!items.length){notify('Tủ truyện đang trống.');return;}
    const grid=$('#story-grid');grid.innerHTML=items.map(s=>'<article class="story"><div class="story-open" data-open="'+esc(s.id)+'" role="button" tabindex="0">'+coverMarkup(s)+'<h3>'+esc(s.title)+'</h3></div><p>'+esc(s.author||'')+'</p></article>').join('');
    $('#result-count').textContent=items.length+' truyện đã lưu';$('#empty-state').hidden=true;$('#stories').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function bind() {
    $('#story-search').addEventListener('input',e=>{state.query=e.target.value;render();});
    $('#genre-filter').addEventListener('change',e=>{state.genre=e.target.value;render();});
    $('#reset-filters').addEventListener('click',resetFilters);$('#empty-reset').addEventListener('click',resetFilters);
    $$('[data-sort]').forEach(b=>b.addEventListener('click',()=>{state.sort=b.dataset.sort;$$('[data-sort]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});render();}));
    $('#story-grid').addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save){e.preventDefault();e.stopPropagation();const id=save.dataset.save;state.saved.has(id)?state.saved.delete(id):state.saved.add(id);memory.write('saved:v1',[...state.saved]);render();notify(state.saved.has(id)?'Đã lưu truyện vào tủ.':'Đã bỏ lưu truyện.');return;}const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);}});
    $('#show-saved').addEventListener('click',showSaved);
    $('#focus-search').addEventListener('click',()=>{$('#story-search').focus();$('#stories').scrollIntoView({behavior:'smooth'});});
    $('#load-source')?.addEventListener('click',()=>{state.source='mangadex';loadCatalog();});
    $('#source-demo')?.addEventListener('click',()=>{state.source='demo';state.items=DEMOS;render();});
    $('#load-catalog')?.addEventListener('click',loadOwnCatalog);
    $('#load-longbook')?.addEventListener('click',loadLongBook);
    $('#detail-close').addEventListener('click',()=>closeModal('detail-modal'));$('#reader-close').addEventListener('click',()=>closeModal('reader-modal'));
    $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
    $('#detail-read').addEventListener('click',loadChapters);
    $('#chapter-list').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)openReader(Number(b.dataset.chapter));});
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
  bind();state.items=DEMOS;render();state.source='mangadex';loadCatalog();
})();