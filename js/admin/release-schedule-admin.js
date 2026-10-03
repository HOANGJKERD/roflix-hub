(function(){
  'use strict';
  const sb = window.rfSupabase;
  if (!sb) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => v ? new Date(v).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'}) : '';
  function toast(msg){ if(typeof window.showToastPro==='function') window.showToastPro('info','Lịch phim',msg); else alert(msg); }
  async function isAdmin(){ const {data,error}=await sb.auth.getUser(); if(error||!data?.user)return false; const {data:p,error:pe}=await sb.from('profiles').select('role').eq('id',data.user.id).maybeSingle(); return !pe&&p?.role==='admin'; }
  async function sync(){ try{await sb.rpc('roflix_sync_release_schedule');}catch(_){} }
  const SOURCES={
    kkphim:{list:'https://phimapi.com/v1/api',detail:'https://phimapi.com',name:'KKPhim'},
    vsmov:{list:'https://vsmov.com/api',detail:'https://vsmov.com/api',name:'VSMOV'}
  };
  function pickPoster(m,sid){
    const raw=m.poster_url||m.thumb_url||m.poster||m.thumb||'';
    if(!raw)return '';
    if(/^https?:\/\//i.test(raw))return raw;
    return sid==='kkphim' ? 'https://phimimg.com/'+String(raw).replace(/^\//,'') : raw;
  }
  function unwrap(data){return data?.items||(data?.data?.items)||data?.data||data?.movies||[];}
  async function searchScheduleMovies(){
    const q=($('sch-pick-search')?.value||'').trim();
    const sid=$('sch-pick-source')?.value||'kkphim';
    const box=$('sch-pick-results');
    if(!q){box.innerHTML='<div class="muted">Nhập tên phim trước đã.</div>';return;}
    box.innerHTML='<div class="muted">🔎 Đang tìm phim...</div>';
    try{
      const url=SOURCES[sid].list+'/tim-kiem?keyword='+encodeURIComponent(q)+'&page=1';
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json();
      const items=unwrap(d).slice(0,12);
      if(!items.length){box.innerHTML='<div class="muted">Không tìm thấy phim. Thử từ khóa khác.</div>';return;}
      box.innerHTML=items.map((m,i)=>{
        const slug=m.slug||m.movie_slug||'';
        const title=m.name||m.title||m.origin_name||'Không tên';
        const origin=m.origin_name||m.original_name||'';
        const poster=pickPoster(m,sid);
        return `<button type="button" class="schedule-pick-item" data-pick-index="${i}">
          <img src="${esc(poster||'https://placehold.co/64x88/10131d/f59e0b?text=RF')}" alt="">
          <span><b>${esc(title)}</b><small>${esc(origin)}${m.year?' · '+esc(m.year):''}</small><small>${esc(slug)}</small></span><em>Chọn</em>
        </button>`;
      }).join('');
      window._rfScheduleSearchResults=items.map(m=>({...m,_src:sid}));
      box.querySelectorAll('[data-pick-index]').forEach(btn=>btn.addEventListener('click',()=>selectScheduleMovie(Number(btn.dataset.pickIndex))));
    }catch(e){box.innerHTML='<div class="danger-text">Không tìm được kho phim: '+esc(e.message)+'</div>';}
  }
  async function selectScheduleMovie(i){
    const m=window._rfScheduleSearchResults?.[i]; if(!m)return;
    const sid=m._src||'kkphim'; const slug=m.slug||m.movie_slug||'';
    $('sch-slug').value=slug; $('sch-title').value=m.name||m.title||m.origin_name||''; $('sch-origin').value=m.origin_name||m.original_name||''; $('sch-source').value=sid;
    const poster=pickPoster(m,sid); if(poster)$('sch-poster').value=poster;
    if($('sch-pick-results'))$('sch-pick-results').innerHTML='<div class="selected-movie">✅ Đã chọn: <b>'+esc($('sch-title').value)+'</b> <span>'+esc(slug)+'</span></div>';
    try{
      const r=await fetch(SOURCES[sid].detail+'/phim/'+encodeURIComponent(slug),{cache:'no-store'});
      if(r.ok){const d=await r.json(); const movie=d.movie||d.data||d; const p=pickPoster(movie,sid); if(p)$('sch-poster').value=p; if(movie.origin_name)$('sch-origin').value=movie.origin_name; if(movie.content&&!$('sch-summary').value)$('sch-summary').value=String(movie.content).replace(/<[^>]*>/g,'').trim();}
    }catch(_){}
  }

  async function load(){
    const box=$('schedule-list'); if(!box)return;
    await sync();
    const {data,error}=await sb.from('roflix_release_schedule').select('*').order('release_at',{ascending:true}).limit(100);
    if(error){box.innerHTML='<div class="danger-text">'+esc(error.message)+'</div>';return;}
    $('schedule-sync-time').textContent='Đồng bộ '+new Date().toLocaleTimeString('vi-VN');
    box.innerHTML=data?.length?data.map(x=>`<article class="schedule-admin-item"><img src="${esc(x.poster_url||'https://placehold.co/90x130/10131d/f59e0b?text=RF')}" alt=""><div class="schedule-admin-info"><div><span class="pill ${x.status==='released'?'pill-active':'pill-admin'}">${esc(x.status)}</span> ${x.featured?'<span class="pill pill-user">featured</span>':''}</div><h4>${esc(x.title)}</h4><p>${esc(x.origin_name||'')} · ${esc(x.source_id||'kkphim')}</p><time>${fmt(x.release_at)}</time><small>${esc(x.note||'')}</small><div class="schedule-admin-actions"><button class="btn" onclick="window.rfEditSchedule('${x.id}')">Sửa</button><button class="btn btn-danger" onclick="window.rfDeleteSchedule('${x.id}')">Xóa</button></div></div></article>`).join(''):'<div class="empty">Chưa có lịch ra phim.</div>';
  }
  function clear(){['sch-slug','sch-title','sch-origin','sch-poster','sch-summary','sch-note'].forEach(id=>{if($(id))$(id).value='';});if($('sch-release'))$('sch-release').value='';if($('sch-featured'))$('sch-featured').checked=false;window.rfScheduleEditing=null; if($('schedule-save'))$('schedule-save').textContent='Lưu lịch phim'; if($('sch-pick-search'))$('sch-pick-search').value=''; if($('sch-pick-results'))$('sch-pick-results').innerHTML='<div class="muted">Tìm phim rồi bấm <b>Chọn</b>. Thông tin phim sẽ tự điền vào lịch.</div>'; window._rfScheduleSearchResults=[];}
  window.rfScheduleEditing=null;
  window.rfEditSchedule=async function(id){const {data,error}=await sb.from('roflix_release_schedule').select('*').eq('id',id).maybeSingle();if(error){alert('Không đọc được lịch: '+error.message);return;}if(!data){alert('Không tìm thấy lịch phim.');return;}window.rfScheduleEditing=id; $('sch-slug').value=data.movie_slug||'';$('sch-title').value=data.title||'';$('sch-origin').value=data.origin_name||'';$('sch-source').value=data.source_id||'kkphim';$('sch-poster').value=data.poster_url||'';$('sch-summary').value=data.summary||'';$('sch-note').value=data.note||'';$('sch-featured').checked=!!data.featured; const d=new Date(data.release_at); const pad=n=>String(n).padStart(2,'0'); $('sch-release').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; $('schedule-save').textContent='Cập nhật lịch'; window.scrollTo({top:0,behavior:'smooth'});};
  window.rfDeleteSchedule=async function(id){if(!confirm('Xóa lịch phim này?'))return;const {data,error}=await sb.rpc('roflix_admin_release_schedule_delete',{p_id:id});if(error){alert('Không thể xóa lịch: '+error.message);return;}if(!data){alert('Không tìm thấy lịch để xóa.');return;}toast('Đã xóa lịch phim.');await load();};
  function getReleaseAt(){
    const raw=($('sch-release')?.value||'').trim();
    if(!raw)return {error:'Vui lòng chọn ngày và giờ phát sóng.'};
    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return {error:'Ngày giờ phát sóng không hợp lệ.'};
    return {value:d.toISOString()};
  }
  async function save(){
    if(!(await isAdmin()))return alert('Bạn không có quyền Admin.');
    const slug=($('sch-slug')?.value||'').trim();
    const title=($('sch-title')?.value||'').trim();
    const release=getReleaseAt();
    if(!slug||!title){alert('Nhập slug và tên phim.');return;}
    if(release.error){alert(release.error);return;}
    const payload={p_id:window.rfScheduleEditing||null,p_movie_slug:slug,p_title:title,p_origin_name:($('sch-origin')?.value||'').trim(),p_source_id:$('sch-source')?.value||'kkphim',p_poster_url:($('sch-poster')?.value||'').trim()||null,p_release_at:release.value,p_summary:($('sch-summary')?.value||'').trim(),p_note:($('sch-note')?.value||'').trim(),p_featured:!!$('sch-featured')?.checked};
    const {error}=await sb.rpc('roflix_admin_release_schedule_save',payload);
    if(error){alert('Không thể lưu lịch: '+error.message);console.error('[RoFlix schedule]',error);return;}
    toast(window.rfScheduleEditing?'Đã cập nhật lịch.':'Đã tạo lịch phim.');
    clear();
    await load();
  }
  window.rfLoadAdminSchedule = load;
  document.addEventListener('DOMContentLoaded',()=>{ $('schedule-save')?.addEventListener('click',save); $('sch-pick-btn')?.addEventListener('click',searchScheduleMovies); $('sch-pick-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchScheduleMovies();}}); load(); setInterval(load,30000); });
})();
