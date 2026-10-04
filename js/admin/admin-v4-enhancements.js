/* RoFlix Admin Dashboard 4.0 compatibility + safety layer + Movie Control loader */
(function(){
 'use strict';
 const sb=window.rfSupabase;if(!sb)return;const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
 async function comments(){
  const box=$('live-comments-body');if(!box)return;
  const r=await sb.from('roflix_movie_comments').select('id,movie_slug,movie_title,username,body,created_at').order('created_at',{ascending:false}).limit(250);
  if(r.error){box.innerHTML=`<tr><td colspan="6" class="danger-text">${esc(r.error.message)}</td></tr>`;return}
  const ids=(r.data||[]).map(x=>x.id);let hidden=new Set();if(ids.length){const m=await sb.from('roflix_movie_comment_moderation').select('comment_id,status').in('comment_id',ids);hidden=new Set((m.data||[]).filter(x=>x.status==='hidden').map(x=>x.comment_id))}
  box.innerHTML=(r.data||[]).length?(r.data||[]).map(c=>`<tr><td><b>${esc(c.movie_title||c.movie_slug)}</b><br><small class="muted">${esc(c.movie_slug)}</small></td><td>${esc(c.username||'Khán Giả')}</td><td style="max-width:430px;white-space:pre-wrap">${esc(c.body)}</td><td><span class="pill ${hidden.has(c.id)?'pill-banned':'pill-active'}">${hidden.has(c.id)?'hidden':'visible'}</span></td><td>${new Date(c.created_at).toLocaleString('vi-VN')}</td><td><button class="btn" onclick="rfAdminCommentToggleV4('${c.id}','${hidden.has(c.id)?'visible':'hidden'}')">${hidden.has(c.id)?'Hiện':'Ẩn'}</button> <button class="btn btn-danger" onclick="rfAdminCommentDeleteV4('${c.id}')">Xóa</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Chưa có bình luận.</td></tr>';
 }
 window.rfAdminCommentToggleV4=async(id,status)=>{const r=await sb.rpc('roflix_admin_movie_comment_status',{p_id:id,p_status:status});if(r.error)alert(r.error.message);else comments()};
 window.rfAdminCommentDeleteV4=async(id)=>{if(!confirm('Xóa bình luận này?'))return;const r=await sb.rpc('roflix_admin_movie_comment_delete',{p_id:id});if(r.error)alert(r.error.message);else comments()};
 async function health(){
  const checks=[['Supabase','profiles'],['Lịch phim','roflix_release_schedule'],['Bình luận realtime','roflix_movie_comments'],['Watch Party','watch_rooms'],['Gacha','roflix_gacha_banners'],['Kho phim Admin','roflix_custom_movies']];
  let host=$('content-source-health');if(!host)return;
  host.innerHTML=checks.map((x,i)=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #252a39"><span>${x[0]}</span><span id="rf-health-${i}" class="pill">checking</span></div>`).join('');
  for(let i=0;i<checks.length;i++){try{const r=await sb.from(checks[i][1]).select('*',{head:true,count:'exact'});const el=$('rf-health-'+i);if(r.error){el.textContent='ERROR';el.classList.add('pill-banned')}else{el.textContent='ONLINE';el.classList.add('pill-active')}}catch(_){}}
 }
 function loadMovieControl(){if(!document.getElementById('roflix-movie-control-css')){const l=document.createElement('link');l.id='roflix-movie-control-css';l.rel='stylesheet';l.href='css/admin/movie-control.css?v=1';document.head.appendChild(l)}if(document.getElementById('roflix-movie-control-admin'))return;const s=document.createElement('script');s.id='roflix-movie-control-admin';s.src='js/admin/movie-control-admin.js?v=1';s.async=false;document.body.appendChild(s)}
 window.rfAdminLoadLiveComments=comments;window.rfAdminCheckSources=health;
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{comments();health();loadMovieControl()},700);const nav=$('admin-nav');if(nav&&!document.getElementById('rf-admin-v4-badge')){const b=document.createElement('span');b.id='rf-admin-v4-badge';b.className='badge';b.textContent='v4';document.querySelector('.topbar-left')?.appendChild(b)}});
})();
