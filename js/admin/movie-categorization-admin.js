/* RoFlix Admin Movie Classification Center */
(function(){
  'use strict';
  const sb=window.rfSupabase;
  if(!sb||window.__RF_MOVIE_CURATION_ADMIN__)return;
  window.__RF_MOVIE_CURATION_ADMIN__=true;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const SOURCES={kkphim:{name:'KKPhim',base:'https://phimapi.com'},vsmov:{name:'VSMOV',base:'https://vsmov.com/api'}};
  const LISTS=[['phim-moi','Phim mới cập nhật'],['phim-le','Phim Lẻ'],['phim-bo','Phim Bộ'],['dang-chieu','Đang chiếu'],['4k','Phim 4K'],['long-tieng','Lồng tiếng'],['thuyet-minh','Thuyết minh'],['subteam','Subteam']];
  const GENRES=[['chinh-kich','Chính kịch'],['hai','Hài'],['bi-an','Bí ẩn'],['gia-dinh','Gia Đình'],['hanh-dong','Hành Động'],['vien-tuong','Viễn Tưởng'],['hinh-su','Hình Sự'],['kinh-di','Kinh Dị'],['phieu-luu','Phiêu Lưu'],['khoa-hoc-vien-tuong','Khoa Học Viễn Tưởng'],['co-trang','Cổ Trang'],['vo-thuat','Võ Thuật'],['lang-man','Lãng Mạn'],['gia-tuong','Giả Tưởng'],['chien-tranh','Chiến Tranh'],['hoc-duong','Học Đường'],['hoat-hinh','Hoạt Hình'],['tam-ly','Tâm Lý'],['hai-huoc','Hài Hước'],['tinh-cam','Tình Cảm'],['tai-lieu','Tài Liệu'],['am-nhac','Âm Nhạc'],['the-thao','Thể Thao'],['than-thoai','Thần Thoại'],['kinh-dien','Kinh Điển'],['chieu-rap','Chiếu Rạp'],['tre-em','Trẻ Em'],['phim-18-plus','Phim 18+'],['lich-su','Lịch Sử'],['mien-tay','Miền Tây'],['phim-ngan','Phim Ngắn'],['tv-shows','TV Shows'],['short-drama','Short Drama'],['action','Action'],['fantasy','Fantasy']];
  const ALIAS={'chính kịch':'chinh-kich','drama':'chinh-kich','tâm lý':'tam-ly','psychological':'tam-ly','hài':'hai','hài hước':'hai-huoc','comedy':'hai-huoc','bí ẩn':'bi-an','mystery':'bi-an','gia đình':'gia-dinh','family':'gia-dinh','hành động':'hanh-dong','action':'action','viễn tưởng':'vien-tuong','sci-fi':'vien-tuong','khoa học viễn tưởng':'khoa-hoc-vien-tuong','hình sự':'hinh-su','crime':'hinh-su','kinh dị':'kinh-di','horror':'kinh-di','phiêu lưu':'phieu-luu','adventure':'phieu-luu','cổ trang':'co-trang','period':'co-trang','võ thuật':'vo-thuat','martial arts':'vo-thuat','tình cảm':'tinh-cam','romance':'lang-man','lãng mạn':'lang-man','thần thoại':'than-thoai','fantasy':'fantasy','chiến tranh':'chien-tranh','war':'chien-tranh','học đường':'hoc-duong','school':'hoc-duong','hoạt hình':'hoat-hinh','animation':'hoat-hinh','tài liệu':'tai-lieu','documentary':'tai-lieu','âm nhạc':'am-nhac','music':'am-nhac','thể thao':'the-thao','sports':'the-thao','kinh điển':'kinh-dien','classic':'kinh-dien','lịch sử':'lich-su','history':'lich-su','miền tây':'mien-tay','western':'mien-tay','chiếu rạp':'chieu-rap','trẻ em':'tre-em','kids':'tre-em','children':'tre-em','phim 18+':'phim-18-plus','18+':'phim-18-plus','adult':'phim-18-plus','phim ngắn':'phim-ngan','short drama':'short-drama','tv shows':'tv-shows'};
  const state={source:'kkphim',results:[],selected:null,saved:null};
  const val=id=>($(id)?.value||'').trim();
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
  function toast(msg,type){if(window.showToastPro)window.showToastPro(type||'info','Phân loại phim',msg);else if(window.showToast)window.showToast(type||'info','Phân loại phim',msg);else alert(msg)}
  async function isAdmin(){try{const u=await sb.auth.getUser();if(!u.data?.user)return false;const p=await sb.from('profiles').select('role').eq('id',u.data.user.id).maybeSingle();return p.data?.role==='admin'}catch(_){return false}}
  function names(detail){const x=detail?.category||detail?.categories||detail?.genre||[];return Array.isArray(x)?x.map(v=>typeof v==='object'?(v.name||v.title||''):v).filter(Boolean):[]}
  function genreKey(name){const n=norm(name);if(ALIAS[n])return ALIAS[n];const low=String(name||'').toLowerCase();if(ALIAS[low])return ALIAS[low];const hit=GENRES.find(x=>norm(x[1])===n);return hit?.[0]||null}
  function suggest(detail){
    const g=names(detail),lists=[];const t=String(detail?.type||'').toLowerCase();
    if(t.includes('series')||t.includes('tv')||Number(detail?.episode_total||0)>1)lists.push('phim-bo');else lists.push('phim-le');
    const status=String(detail?.status||detail?.episode_current||'').toLowerCase();if(/ongoing|đang chiếu|dang-chieu|chieurap/.test(status))lists.push('dang-chieu');
    const quality=String(detail?.quality||'').toLowerCase();if(/4k|2160/.test(quality))lists.push('4k');
    const lang=[detail?.lang,detail?.language,detail?.voice,detail?.subteam].filter(Boolean).join(' ').toLowerCase();
    if(/lồng tiếng|long tieng|dub|dubbed/.test(lang))lists.push('long-tieng');
    if(/thuyết minh|thuyet minh/.test(lang))lists.push('thuyet-minh');
    if(/subteam/.test(lang)||detail?.subteam)lists.push('subteam');
    // 'Phim mới cập nhật' is a curation decision, not inferred from release year.
    return {lists:[...new Set(lists)],genres:[...new Set(g.map(genreKey).filter(Boolean))]};
  }
  function checks(id,items,cls){const box=$(id);box.innerHTML=items.map(x=>'<label class="rf-curation-check"><input class="'+cls+'" type="checkbox" value="'+esc(x[0])+'"><span>'+esc(x[1])+'</span></label>').join('')}
  function setChecks(cls,vals){const set=new Set(vals||[]);document.querySelectorAll('.'+cls).forEach(x=>x.checked=set.has(x.value))}
  function getChecks(cls){return Array.from(document.querySelectorAll('.'+cls+':checked')).map(x=>x.value)}
  function poster(url,sid){if(!url)return '';if(/^https?:/i.test(url))return url;return sid==='kkphim'?'https://phimimg.com/'+String(url).replace(/^\//,''):url}
  async function search(){
    const q=val('rf-cat-search');if(!q){toast('Nhập tên phim hoặc slug.','warning');return}
    const sid=$('rf-cat-source').value;state.source=sid;$('rf-cat-results').innerHTML='<div class="muted">🔎 Đang tìm...</div>';
    try{const r=await fetch(SOURCES[sid].base+'/tim-kiem?keyword='+encodeURIComponent(q)+'&page=1',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();const items=d?.items||d?.data?.items||d?.data||d?.movies||[];state.results=Array.isArray(items)?items.slice(0,20):[];$('rf-cat-results').innerHTML=state.results.length?state.results.map((m,i)=>'<button type="button" class="rf-curation-result" data-cat-i="'+i+'"><img src="'+esc(poster(m.poster_url||m.thumb_url||m.poster||'',sid)||'https://placehold.co/70x100/111827/f59e0b?text=RF')+'"><span><b>'+esc(m.name||m.title||m.origin_name||m.slug)+'</b><small>'+esc(m.origin_name||'')+' · '+esc(m.year||'')+'</small><small>'+esc(m.slug||'')+'</small></span><em>Chọn</em></button>').join(''):'<div class="muted">Không tìm thấy.</div>';document.querySelectorAll('[data-cat-i]').forEach(b=>b.onclick=()=>selectMovie(Number(b.dataset.catI)))}catch(e){$('rf-cat-results').innerHTML='<div class="danger-text">'+esc(e.message)+'</div>'}
  }
  async function selectMovie(i){
    const raw=state.results[i];if(!raw)return;let d=raw;try{const r=await fetch(SOURCES[state.source].base+'/phim/'+encodeURIComponent(raw.slug),{cache:'no-store'});if(r.ok){const j=await r.json();d=j?.movie||j?.data||j?.item||j||raw}}catch(_){}
    state.selected={source_id:state.source,movie_slug:d.slug||raw.slug,movie_title:d.name||d.title||raw.name||raw.title||raw.slug,origin_name:d.origin_name||raw.origin_name||'',poster_url:poster(d.poster_url||d.thumb_url||raw.poster_url||raw.thumb_url||'',state.source),year:Number(d.year||raw.year)||null,type:d.type||'',quality:d.quality||'',lang:d.lang||d.language||'',status:d.status||d.episode_current||'',source_genres:names(d),detail:d};
    await loadSaved();fill(true);
  }
  async function loadSaved(){const m=state.selected;if(!m)return;const r=await sb.from('roflix_movie_curation').select('*').eq('source_id',m.source_id).eq('movie_slug',m.movie_slug).maybeSingle();state.saved=r.data||null}
  function fill(auto){
    const m=state.selected||{},s=state.saved;
    $('rf-cat-selected-title').textContent=m.movie_title||'Chưa chọn phim';
    $('rf-cat-selected-meta').textContent=(SOURCES[m.source_id]?.name||'RoFlix Studio')+' · '+(m.movie_slug||'');
    $('rf-cat-poster').src=m.poster_url||'https://placehold.co/90x130/111827/f59e0b?text=RF';
    $('rf-cat-slug').value=m.movie_slug||'';$('rf-cat-title').value=m.movie_title||'';$('rf-cat-origin').value=m.origin_name||'';
    $('rf-cat-quality').value=m.quality||'';$('rf-cat-lang').value=m.lang||'';
    $('rf-cat-source-genres').innerHTML=(m.source_genres||[]).map(x=>'<span class="rf-source-tag">'+esc(x)+'</span>').join('')||'<span class="muted">Không có dữ liệu.</span>';
    if(s){setChecks('rf-cat-list',s.list_keys);setChecks('rf-cat-genre',s.genre_keys);$('rf-cat-auto').checked=!!s.auto_suggested;$('rf-cat-status').textContent='Đã có phân loại lưu trên Supabase.'}
    else if(auto){const x=suggest(m.detail);setChecks('rf-cat-list',x.lists);setChecks('rf-cat-genre',x.genres);$('rf-cat-auto').checked=true;$('rf-cat-status').textContent='Đã tự xếp theo dữ liệu từ nguồn. Có thể chỉnh lại trước khi lưu.'}
    else $('rf-cat-status').textContent='Chưa có phân loại lưu.';
  }
  function autoClassify(){if(!state.selected)return toast('Chọn phim trước.','warning');const x=suggest(state.selected.detail||state.selected);setChecks('rf-cat-list',x.lists);setChecks('rf-cat-genre',x.genres);$('rf-cat-auto').checked=true;$('rf-cat-status').textContent='Đã tự xếp. Kiểm tra rồi lưu.'}
  async function save(){
    if(!(await isAdmin()))return toast('Không có quyền Admin.','error');if(!state.selected)return toast('Chọn phim trước.','warning');
    const lists=getChecks('rf-cat-list'),genres=getChecks('rf-cat-genre');if(!lists.length&&!genres.length)return toast('Chọn ít nhất một Danh Mục hoặc Thể Loại.','warning');
    const p={p_source_id:state.selected.source_id,p_movie_slug:val('rf-cat-slug'),p_movie_title:val('rf-cat-title'),p_origin_name:val('rf-cat-origin'),p_poster_url:state.selected.poster_url||'',p_year:Number(state.selected.year)||null,p_type_key:lists.includes('phim-bo')?'phim-bo':'phim-le',p_list_keys:lists,p_genre_keys:genres,p_source_genres:state.selected.source_genres||[],p_quality:val('rf-cat-quality'),p_lang:val('rf-cat-lang'),p_status:state.selected.status||'',p_auto_suggested:!!$('rf-cat-auto').checked};
    const r=await sb.rpc('roflix_admin_movie_curation_upsert',p);if(r.error)return toast(r.error.message,'error');
    state.saved={...p,list_keys:lists,genre_keys:genres};$('rf-cat-status').textContent='✅ Đã lưu phân loại.';toast('Đã lưu phân loại phim.','success');loadList();
  }
  async function del(){if(!(await isAdmin()))return;if(!state.selected)return;if(!confirm('Xóa phân loại của phim này? Dữ liệu nguồn không bị xóa.'))return;const r=await sb.rpc('roflix_admin_movie_curation_delete',{p_source_id:state.selected.source_id,p_movie_slug:state.selected.movie_slug});if(r.error)return toast(r.error.message,'error');state.saved=null;setChecks('rf-cat-list',[]);setChecks('rf-cat-genre',[]);$('rf-cat-auto').checked=false;$('rf-cat-status').textContent='Đã xóa phân loại.';toast('Đã xóa phân loại.','success');loadList()}
  async function loadList(){const box=$('rf-cat-saved');if(!box)return;const r=await sb.from('roflix_movie_curation').select('id,source_id,movie_slug,movie_title,list_keys,genre_keys,auto_suggested,updated_at').order('updated_at',{ascending:false}).limit(200);if(r.error){box.innerHTML='<div class="danger-text">'+esc(r.error.message)+'</div>';return}box.innerHTML=r.data?.length?r.data.map(x=>'<div class="rf-cat-saved-row"><div><b>'+esc(x.movie_title)+'</b><small>'+esc(x.source_id)+' · '+esc(x.movie_slug)+'</small><small>'+esc((x.list_keys||[]).map(k=>(LISTS.find(a=>a[0]===k)||[k,k])[1]).join(' · '))+'</small><small>'+esc((x.genre_keys||[]).map(k=>(GENRES.find(a=>a[0]===k)||[k,k])[1]).join(', '))+'</small></div><span>'+((x.auto_suggested)?'🤖 Auto':'✋ Manual')+'</span></div>').join(''):'<div class="muted">Chưa có phim nào được phân loại.</div>'}
  function build(){
    const nav=$('admin-nav'),content=document.querySelector('.content');if(!nav||!content||$('movie-categorization'))return;
    const b=document.createElement('button');b.dataset.page='movie-categorization';b.innerHTML='<span>🗂️</span><b>Phân loại phim</b>';nav.appendChild(b);
    const s=document.createElement('section');s.id='movie-categorization';s.className='page';s.innerHTML='<div class="page-title"><div><h1>🗂️ Phân loại phim</h1><p>Admin xếp phim vào các Danh Mục và Thể Loại có sẵn trên thanh điều hướng. Dữ liệu nguồn không bị sửa.</p></div><span class="pill pill-admin">ADMIN ONLY</span></div><div class="grid two rf-cat-top"><div class="card"><h3 class="section-title">🔎 Chọn phim từ nguồn</h3><div class="toolbar"><select class="input" id="rf-cat-source"><option value="kkphim">KKPhim</option><option value="vsmov">VSMOV</option></select><input class="input" id="rf-cat-search" placeholder="Tên phim hoặc slug..." style="flex:1"><button class="btn btn-primary" id="rf-cat-search-btn">Tìm</button></div><div id="rf-cat-results" class="rf-curation-results"><div class="muted">Tìm phim rồi bấm Chọn.</div></div></div><div class="card"><h3 class="section-title">🎯 Phân loại đang chỉnh</h3><div class="rf-cat-selected"><img id="rf-cat-poster" src="https://placehold.co/90x130/111827/f59e0b?text=RF" alt=""><div><b id="rf-cat-selected-title">Chưa chọn phim</b><small id="rf-cat-selected-meta">--</small><small id="rf-cat-status">Chưa có phân loại lưu.</small></div></div><div class="rf-cat-field"><label>Tiêu đề</label><input class="input" id="rf-cat-title"></div><div class="rf-cat-field"><label>Slug</label><input class="input" id="rf-cat-slug"></div><div class="rf-cat-field"><label>Tên gốc</label><input class="input" id="rf-cat-origin"></div><div class="rf-cat-field"><label>Thể loại từ nguồn</label><div id="rf-cat-source-genres" class="rf-source-tags"></div></div><div class="rf-cat-field"><label>Danh Mục trên thanh điều hướng</label><div id="rf-cat-list" class="rf-check-grid"></div></div><div class="rf-cat-field"><label>Thể Loại RoFlix</label><div id="rf-cat-genre" class="rf-check-grid rf-genre-grid"></div></div><div class="toolbar" style="margin-top:12px"><button class="btn" id="rf-cat-auto-btn">🤖 Tự xếp</button><label class="rf-check"><input id="rf-cat-auto" type="checkbox"> Đánh dấu Auto</label><button class="btn btn-primary" id="rf-cat-save">💾 Lưu phân loại</button><button class="btn btn-danger" id="rf-cat-delete">Xóa phân loại</button></div></div></div><div class="card" style="margin-top:16px"><h3 class="section-title">📚 Danh sách phim đã phân loại</h3><div id="rf-cat-saved"></div></div>';
    content.appendChild(s);checks('rf-cat-list',LISTS,'rf-cat-list');checks('rf-cat-genre',GENRES,'rf-cat-genre');
    b.onclick=function(){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));s.classList.add('active');document.querySelectorAll('#admin-nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('top-title').textContent='Phân loại phim';loadList()};
    $('rf-cat-search-btn').onclick=search;$('rf-cat-search').onkeydown=e=>{if(e.key==='Enter')search()};$('rf-cat-auto-btn').onclick=autoClassify;$('rf-cat-save').onclick=save;$('rf-cat-delete').onclick=del;loadList();
  }
  build();
})();