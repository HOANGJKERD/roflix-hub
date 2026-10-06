/* RoFlix All Features 2.0
 * 1 Cloud-first account sync
 * 2 Release schedule live layer
 * 3 Realtime comments + moderation-aware rendering
 * 4 Watch Party persistent room state
 * 5 Server-authoritative Gacha
 * 6 Admin-safe realtime helpers
 * 7 Mobile UX polish
 */
(function(){
  'use strict';
  if(window.__ROFLIX_ALL_FEATURES_2__) return;
  window.__ROFLIX_ALL_FEATURES_2__ = true;
  const sb=window.rfSupabase;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};

  /* ---------- 1. CLOUD SYNC 2.0 ---------- */
  async function user(){try{const r=await sb?.auth?.getUser?.();return r?.data?.user||null}catch(_){return null}}
  async function snapshot(){if(!sb)return null;try{const r=await sb.rpc('roflix_cloud_snapshot');if(r.error)throw r.error;return r.data||null}catch(e){console.debug('[RoFlix Cloud 2]',e.message||e);return null}}
  function localFavs(){return typeof window.getFavorites==='function'?window.getFavorites():read('roflix-favs',[])}
  function mergeHistory(a,b){const m=new Map();[...(b||[]),...(a||[])].forEach(x=>{if(!x?.slug)return;const k=String(x.slug);const old=m.get(k);const t=Number(x.timestamp||x.updated_at?new Date(x.updated_at||0).getTime():0);const ot=Number(old?.timestamp||old?.updated_at?new Date(old.updated_at||0).getTime():0);if(!old||t>=ot)m.set(k,x)});return [...m.values()].slice(-100)}
  async function syncCloud2(){
    const u=await user(); if(!u||!sb)return;
    const s=await snapshot(); if(!s)return;
    const lf=localFavs(); const cf=Array.isArray(s.favorites)?s.favorites.map(String):[];
    const fav=Array.from(new Set([...cf,...lf.map(String)]));
    write('roflix-favs',fav);
    if(fav.length!==cf.length) await sb.rpc('roflix_favorites_replace',{p_slugs:fav});
    const localH=typeof window.getWatchHistory==='function'?window.getWatchHistory():[];
    const cloudH=Array.isArray(s.history)?s.history:[];
    const merged=mergeHistory(localH,cloudH);
    const hk=typeof window.getWatchHistoryStorageKey==='function'?window.getWatchHistoryStorageKey():`roflix-watch-history:user:${u.id}`;
    write(hk,merged);
    await sb.rpc('roflix_watch_history_sync',{p_items:merged});
    if(Array.isArray(s.watchlist)) write('roflix-watchlist-cloud-cache',s.watchlist);
    if(Number.isFinite(Number(s.pity))) localStorage.setItem('roflix-gacha-pity',String(s.pity));
    if(Array.isArray(s.gacha)) write('roflix-gacha-inventory-cloud-cache',s.gacha);
    try{window.dispatchEvent(new CustomEvent('roflix:cloud-sync',{detail:s}))}catch(_){ }
    try{window.renderContinueWatching?.();window.renderHistoryTab?.();window.renderProfile?.();window.updateProfileUI?.()}catch(_){ }
  }
  window.rfCloudSync2=syncCloud2;

  function wrapCloud(name,after){
    const fn=window[name]; if(typeof fn!=='function'||fn.__rfCloud2||fn.__rfCloudWrapped)return;
    const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).then(()=>after()).catch(()=>{});return r};
    w.__rfCloud2=true;window[name]=w;
  }
  function installCloudWrappers(){
    wrapCloud('toggleFavorite',async()=>{const u=await user();if(u)await sb.rpc('roflix_favorites_replace',{p_slugs:localFavs()})});
    wrapCloud('saveWatchHistory',async()=>{const u=await user();if(u){const h=window.getWatchHistory?.()||[];await sb.rpc('roflix_watch_history_sync',{p_items:h})}});
    wrapCloud('clearWatchHistory',async()=>{const u=await user();if(u){const h=window.getWatchHistory?.()||[];await sb.rpc('roflix_watch_history_sync',{p_items:h})}});
  }

  /* Generic Watchlist bridge. It supports the common localStorage shapes without replacing existing UI code. */
  function watchlistKeys(){return ['roflix-watchlist','roflix_watchlist','watchlist','roflix-watchlist-items']}
  function getLocalWatchlist(){for(const k of watchlistKeys()){const v=read(k,null);if(Array.isArray(v))return {key:k,items:v}}return {key:'roflix-watchlist',items:[]}}
  async function syncWatchlist(){const u=await user();if(!u)return;const r=await sb.rpc('roflix_watchlist_get');if(r.error)return;const cloud=Array.isArray(r.data)?r.data:[];const local=getLocalWatchlist().items;const map=new Map();[...cloud,...local].forEach(x=>{const slug=String(x?.movie_slug||x?.slug||'').trim();if(slug)map.set(slug,{...x,movie_slug:slug})});const merged=[...map.values()];write('roflix-watchlist-cloud-cache',merged);if(merged.length!==cloud.length)await sb.rpc('roflix_watchlist_replace',{p_items:merged})}
  window.rfSyncWatchlist2=syncWatchlist;

  /* ---------- 2. RELEASE SCHEDULE 2.0 ---------- */
  function scheduleStyle(){if($('rf-schedule-2-style'))return;const s=document.createElement('style');s.id='rf-schedule-2-style';s.textContent=`
  .rf-schedule2{margin:18px 0;padding:16px;border:1px solid rgba(245,158,11,.18);border-radius:20px;background:linear-gradient(135deg,rgba(245,158,11,.07),rgba(124,58,237,.06));box-shadow:0 16px 45px rgba(0,0,0,.18)}
  .rf-schedule2-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.rf-schedule2-head h3{margin:0;color:#fff;font-weight:900}.rf-schedule2-head small{color:#94a3b8}
  .rf-schedule2-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}.rf-schedule2-card{position:relative;overflow:hidden;border-radius:14px;background:#0f1320;border:1px solid rgba(255,255,255,.08);cursor:pointer}.rf-schedule2-card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}.rf-schedule2-body{padding:8px}.rf-schedule2-title{font-size:11px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rf-schedule2-time{font-size:10px;color:#fbbf24;margin-top:4px}.rf-schedule2-badge{position:absolute;top:7px;left:7px;padding:4px 6px;border-radius:7px;background:#ef4444;color:#fff;font-size:8px;font-weight:1000}
  @media(max-width:900px){.rf-schedule2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:560px){.rf-schedule2{padding:12px}.rf-schedule2-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;document.head.appendChild(s)}
  function scheduleTarget(){return $('schedule-home-row')||$('home-release-schedule')||$('release-schedule-home')}
  async function renderSchedule2(){if(!sb)return;const host=scheduleTarget();if(!host)return;scheduleStyle();const r=await sb.from('roflix_release_schedule').select('id,movie_slug,title,poster_url,release_at,status,featured,source_id').in('status',['scheduled','released']).order('release_at',{ascending:true}).limit(10);if(r.error)return;const rows=r.data||[];if(!rows.length){host.innerHTML='';return}host.innerHTML=`<section class="rf-schedule2"><div class="rf-schedule2-head"><div><h3>📅 Lịch phim RoFlix</h3><small>Sắp chiếu và mới phát hành</small></div><span class="rf-schedule2-live">LIVE</span></div><div class="rf-schedule2-grid">${rows.map(x=>{const d=new Date(x.release_at);const released=x.status==='released'||d<=new Date();return `<article class="rf-schedule2-card" onclick="viewMovieDetail('${String(x.movie_slug).replace(/'/g,"\\'")}','${x.source_id||'kkphim'}')"><img loading="lazy" src="${esc(x.poster_url||'https://placehold.co/300x450/10131d/f59e0b?text=RoFlix')}" alt="${esc(x.title)}"><span class="rf-schedule2-badge">${released?'🟢 ĐÃ RA':'🔴 SẮP CHIẾU'}</span><div class="rf-schedule2-body"><div class="rf-schedule2-title">${esc(x.title)}</div><div class="rf-schedule2-time">${released?'Đã phát hành':d.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div></div></article>`}).join('')}</div></section>`}
  window.rfRenderSchedule2=renderSchedule2;

  /* ---------- 3. COMMENTS 2.0 ---------- */
  async function renderComments2(slug){if(typeof window.rfRenderCommentThread2==='function'){window.rfRenderCommentThread2(slug);return;}if(!sb||!slug)return;const {data,error}=await sb.from('roflix_movie_comments').select('id,movie_slug,movie_title,user_id,username,display_name,body,created_at,status').eq('movie_slug',slug).order('created_at',{ascending:false}).limit(100);if(error)return;const hidden=await sb.from('roflix_movie_comment_moderation').select('comment_id').eq('status','hidden');const hiddenSet=new Set((hidden.data||[]).map(x=>x.comment_id));const rows=(data||[]).filter(x=>x.status!=='hidden'&&!hiddenSet.has(x.id));const box=$('comments-container');if(!box)return;box.innerHTML=rows.length?rows.map(c=>`<div class="rf-comment2"><div class="rf-comment2-top"><b>${esc(c.username||c.display_name||'Khán Giả')}</b><time>${new Date(c.created_at).toLocaleString('vi-VN')}</time></div><p>${esc(c.body)}</p></div>`).join(''):'<div class="text-center text-gray-500 py-8">Chưa có bình luận. Hãy là người đầu tiên!</div>'}
  window.rfRenderComments2=renderComments2;

  /* ---------- 4. WATCH PARTY 2.0 persistence ---------- */
  async function partyPersist(){if(!sb||!window.rfWatchPartyIsHost?.())return;const code=window.__rfPartyCode||'';if(!code)return;try{const r=await sb.rpc('roflix_watch_room_snapshot',{p_code:code});if(r.error)return;window.__rfPartyRoomId=r.data?.room?.id||window.__rfPartyRoomId}catch(_){} }
  window.rfWatchPartyPersistState=async function(state){if(!sb||!window.__rfPartyRoomId||!window.rfWatchPartyIsHost?.())return;try{await sb.rpc('roflix_watch_room_update_state',{p_room_id:window.__rfPartyRoomId,p_state:state||{},p_movie_slug:state?.movieSlug||null,p_movie_title:state?.movieTitle||null,p_episode_index:Number.isFinite(Number(state?.episodeIndex))?Number(state.episodeIndex):null})}catch(e){console.debug('[RoFlix Party 2]',e.message||e)}};

  /* ---------- 5. GACHA 3.0 ---------- */
  window.rfServerGachaPull=async function(count){if(!sb){window.showToast?.('error','Lỗi','Supabase chưa sẵn sàng');return null}try{const r=await sb.rpc('roflix_gacha_roll',{p_count:Number(count)});if(r.error)throw r.error;const d=r.data||{};localStorage.setItem('roflix-gacha-pity',String(d.pity??0));if(Array.isArray(d.results))write('roflix-gacha-last-results',d.results);window.showGachaPull?.(d.results?.length===1?d.results[0]:d.results);window.updateProfileUI?.();window.rfCloudSync2?.();return d}catch(e){window.showToast?.('error','Gacha',e.message||'Không quay được Gacha');return null}};
  function patchGacha(){
    if(typeof window.performGacha==='function'&&!window.performGacha.__rfServerGacha&&!window.performGacha._cloudWrapped){const old=window.performGacha;const w=()=>window.rfServerGachaPull(1);w.__rfServerGacha=true;w.__rfOld=old;window.performGacha=w}
    if(typeof window.performGacha10==='function'&&!window.performGacha10.__rfServerGacha&&!window.performGacha10._cloudWrapped){const old=window.performGacha10;const w=()=>window.rfServerGachaPull(10);w.__rfServerGacha=true;w.__rfOld=old;window.performGacha10=w}
  }

  /* ---------- 6. Admin safety helpers ---------- */
  function adminMobile(){if(!location.pathname.endsWith('admin.html'))return;const s=document.createElement('style');s.id='rf-admin-2-style';s.textContent=`@media(max-width:800px){body{overflow-x:hidden}.admin-sidebar{width:100%!important;max-width:100%!important}.admin-main,.admin-content{padding:12px!important}.table-wrap{overflow-x:auto}.table{min-width:720px}.card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:480px){.card-grid{grid-template-columns:1fr!important}}`;document.head.appendChild(s)}

  /* ---------- 7. Mobile UX ---------- */
  function mobileStyle(){if($('rf-mobile-2-style'))return;const s=document.createElement('style');s.id='rf-mobile-2-style';s.textContent=`
  html{scroll-behavior:smooth}body{-webkit-tap-highlight-color:transparent}.header-ios{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
  @media(max-width:768px){.header-ios .max-w-7xl{padding-left:10px!important;padding-right:10px!important;gap:8px!important}.header-ios{position:sticky!important;top:0!important}.page-view{max-width:100vw;overflow-x:hidden}.glass-premium{max-width:calc(100vw - 20px)}button,a{touch-action:manipulation}.rf-reco-card{min-width:0}.rf-reco-body h4{font-size:11px}.rf-gacha-shell{margin-left:0;margin-right:0}.bb-comment{padding:10px!important}.search-container-ios{min-width:0}.notification-panel{max-width:calc(100vw - 20px)!important;right:10px!important}.mobile-menu{max-height:calc(100vh - 70px);overflow:auto}}
  @media(max-width:480px){.header-ios .logo-text{display:none}.header-ios .search-container-ios{flex:1}.header-ios .search-container-ios input{font-size:12px}.nav-link-ios{padding-left:7px!important;padding-right:7px!important}.rf-gacha-actions .gacha-btn{min-width:0!important;padding:10px!important}.rf-comment2{padding:11px;border-radius:12px;background:rgba(255,255,255,.035);margin-bottom:8px}.rf-comment2-top{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#fbbf24}.rf-comment2-top time{color:#64748b;font-weight:500}.rf-comment2 p{margin:5px 0 0;color:#d1d5db;font-size:13px;line-height:1.45}}
  `;document.head.appendChild(s)}

  async function boot(){
    mobileStyle();scheduleStyle();adminMobile();
    installCloudWrappers();
    if(sb){
      const u=await user();
      if(u){await syncCloud2();await syncWatchlist();}
      sb.auth.onAuthStateChange((ev)=>{if(['SIGNED_IN','SIGNED_OUT'].includes(ev))setTimeout(()=>{installCloudWrappers();syncCloud2();syncWatchlist()},250)});
      sb.channel('roflix-all-features-2').on('postgres_changes',{event:'*',schema:'public',table:'roflix_release_schedule'},()=>renderSchedule2()).on('postgres_changes',{event:'*',schema:'public',table:'roflix_movie_comments'},()=>{renderSchedule2();if(window.currentSlug)renderComments2(window.currentSlug)}).subscribe();
    }
    patchGacha();
    setTimeout(patchGacha,500);setTimeout(patchGacha,1500);
    renderSchedule2();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
