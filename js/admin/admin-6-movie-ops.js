/* RoFlix Admin 6.1 Movie Operations
 * Adds source health + playback-oriented diagnostics without duplicating Movie Control.
 */
(function(){
 'use strict';
 const sb=window.rfSupabase;if(!sb||window.__ROFLIX_ADMIN61_MOVIE_OPS__)return;window.__ROFLIX_ADMIN61_MOVIE_OPS__=true;
 const SOURCES=[
  {id:'kkphim',name:'KKPhim',url:'https://phimapi.com/v1/api/tim-kiem?keyword=avatar&page=1'},
  {id:'vsmov',name:'VSMOV',url:'https://vsmov.com/api/tim-kiem?keyword=avatar&page=1'}
 ];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ms=n=>Number(n||0).toLocaleString('vi-VN')+' ms';
 async function checkSource(src){const t=performance.now();try{const r=await fetch(src.url,{cache:'no-store',signal:AbortSignal.timeout(8000)});const elapsed=performance.now()-t;return {id:src.id,name:src.name,ok:r.ok,status:r.status,latency:Math.round(elapsed)}}catch(e){return{id:src.id,name:src.name,ok:false,status:0,latency:Math.round(performance.now()-t),error:e.message}}}
 async function movieHealth(){
  const page=document.getElementById('admin6');if(!page||document.getElementById('rf-admin61-movie-health'))return;
  const anchor=page.querySelector('.rf-admin6-grid');if(!anchor)return;
  const box=document.createElement('div');box.id='rf-admin61-movie-health';box.className='card';box.style.marginTop='16px';box.innerHTML='<div class="page-title" style="margin-bottom:8px"><div><h3 class="section-title" style="margin:0">🎬 Movie Operations</h3><p class="muted">Kiểm tra nguồn phim thật, độ trễ và tình trạng dữ liệu xem gần đây.</p></div><button class="btn" id="rf-admin61-source-refresh">↻ Kiểm tra nguồn</button></div><div id="rf-admin61-sources" class="rf-admin6-health"></div><div class="rf-admin6-grid" id="rf-admin61-metrics" style="margin-top:12px"></div>';
  page.appendChild(box);document.getElementById('rf-admin61-source-refresh').onclick=refresh;
  refresh();
 }
 async function refresh(){
  const host=document.getElementById('rf-admin61-sources');if(!host)return;host.innerHTML='<span class="pill">Đang kiểm tra...</span>';
  const results=await Promise.all(SOURCES.map(checkSource));
  host.innerHTML=results.map(x=>`<span class="pill ${x.ok?'pill-active':'pill-banned'}">${x.ok?'●':'●'} ${esc(x.name)} · ${x.ok?x.status:'OFFLINE'} · ${ms(x.latency)}</span>`).join('');
  const m=await sb.rpc('roflix_admin_live_ops');const x=m.data||{};const metrics=document.getElementById('rf-admin61-metrics');if(metrics)metrics.innerHTML=[['🎥','Đang xem',x.watching_sessions||0,'active sessions có movie'],['⚠️','Playback/API errors',x.errors_5m||0,'5 phút gần nhất'],['🟢','Online',x.active_sessions||0,'heartbeat < 5 phút'],['🕒','Event cuối',x.last_event_at?new Date(x.last_event_at).toLocaleTimeString('vi-VN'):'--','server event']].map(v=>`<div class="card rf-admin6-stat"><div class="label">${v[0]} ${v[1]}</div><div class="value">${typeof v[2]==='number'?v[2].toLocaleString('vi-VN'):esc(v[2])}</div><div class="sub">${esc(v[3])}</div></div>`).join('');
 }
 function start(){setTimeout(movieHealth,900)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
