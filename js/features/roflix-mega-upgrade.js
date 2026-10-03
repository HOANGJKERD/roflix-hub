/* RoFlix Pro Mega Upgrade 3.0
 * Cloud Watchlist + real leaderboard + realtime comments + improved gacha + homepage/player/profile UX.
 * Works with Supabase when mega_upgrade.sql has been executed, and falls back gracefully to local storage.
 */
(function(){
  'use strict';
  const sb=window.rfSupabase;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(_){return d}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  let syncTimer=null;
  let commentChannel=null;
  let currentCommentSlug='';

  async function user(){ if(!sb)return null; try{const {data}=await sb.auth.getUser();return data?.user||null}catch(_){return null} }
  async function cloudReady(){return !!(sb && await user());}
  function toast(type,title,msg){ if(typeof window.showToastPro==='function')window.showToastPro(type,title,msg); else if(typeof window.showToast==='function')window.showToast(type,title,msg); }

  /* ---------- Cloud profile ---------- */
  async function syncProfileCloud(){
    const u=await user(); if(!u||!sb)return;
    const p=read('roflix-profile',{});
    try{await sb.from('profiles').update({display_name:p.name||u.user_metadata?.display_name||'Người dùng',bio:p.bio||'',avatar_url:p.avatar||'',banner_url:p.banner||'',country:p.country||'Việt Nam'}).eq('id',u.id);}catch(e){console.debug('[RoFlix Mega] profile sync',e.message);}
  }
  async function hydrateProfileCloud(){
    const u=await user(); if(!u||!sb)return;
    try{const {data}=await sb.from('profiles').select('display_name,bio,avatar_url,banner_url,country,created_at').eq('id',u.id).maybeSingle();if(!data)return;const p=read('roflix-profile',{});p.name=data.display_name||p.name||u.email?.split('@')[0]||'Người dùng';p.bio=data.bio||p.bio||'';p.avatar=data.avatar_url||p.avatar||'default';p.banner=data.banner_url||p.banner||'default';p.country=data.country||p.country||'Việt Nam';p.joinDate=p.joinDate||data.created_at?.slice(0,10);write('roflix-profile',p);if(typeof renderProfile==='function')renderProfile();}catch(e){console.debug('[RoFlix Mega] profile hydrate',e.message);}
  }
  /* ---------- Cloud game stats ---------- */
  async function hydrateGameStats(){
    const u=await user(); if(!u||!sb)return null;
    try{
      const {data,error}=await sb.from('roflix_game_stats').select('level,exp,gems,gems_earned,movies_watched,episodes_watched,comments_count,favorites_count,watch_minutes,gacha_pulls').eq('user_id',u.id).maybeSingle();
      if(error)throw error;
      if(!data)return null;
      write('roflix-level',{level:Number(data.level)||1,exp:Number(data.exp)||0});
      write('roflix-gem',Number(data.gems)||0);
      write('roflix-stats',{totalEpisodesWatched:Number(data.episodes_watched)||0,totalMoviesWatched:Number(data.movies_watched)||0,totalComments:Number(data.comments_count)||0,totalFavorites:Number(data.favorites_count)||0,totalGemEarned:Number(data.gems_earned)||0,watchTime:Number(data.watch_minutes)||0});
      write('roflix-gacha-pulls',Number(data.gacha_pulls)||0);
      try{ if(typeof window.updateProfileUI==='function') window.updateProfileUI(); }catch(_){}
      return data;
    }catch(e){ console.debug('[RoFlix Mega] game hydrate skipped',e.message); return null; }
  }
  async function syncGameStats(){
    if(!await cloudReady() || !sb.rpc)return;
    const lvl=read('roflix-level',{level:1,exp:0});
    const st=read('roflix-stats',{totalEpisodesWatched:0,totalMoviesWatched:0,totalComments:0,totalFavorites:0,totalGemEarned:0,watchTime:0});
    // IMPORTANT: never send localStorage RoGem to the cloud. Admin changes live in Supabase.
    let cloud=await hydrateGameStats();
    const gems=Number(cloud?.gems ?? localStorage.getItem('roflix-gem') ?? 0);
    try{
      await sb.rpc('roflix_sync_game_state',{
        p_level:Number(lvl.level)||1,p_exp:Number(lvl.exp)||0,p_gems:gems,
        p_gems_earned:Number(cloud?.gems_earned ?? st.totalGemEarned)||0,p_movies_watched:Number(st.totalMoviesWatched)||0,
        p_episodes_watched:Number(st.totalEpisodesWatched)||0,p_comments_count:Number(st.totalComments)||0,
        p_favorites_count:Number(st.totalFavorites)||0,p_watch_minutes:Math.round(Number(st.watchTime)||0),
        p_gacha_pulls:Number(read('roflix-gacha-pulls',cloud?.gacha_pulls||0))||0
      });
    }catch(e){ console.debug('[RoFlix Mega] game sync skipped',e.message); }
  }
  function queueGameSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncGameStats,500);}

  /* ---------- Real leaderboard ---------- */
  async function renderRealLeaderboard(){
    const box=$('leaderboard-list'); if(!box)return;
    let rows=[];
    if(sb){try{const r=await sb.rpc('roflix_leaderboard',{p_limit:50});if(!r.error)rows=r.data||[]}catch(_){} }
    if(!rows.length){
      const local=typeof getLeaderboardData==='function'?getLeaderboardData():[];
      rows=local.map((x,i)=>({rank:i+1,display_name:x.name,level:x.level,exp:x.exp,gems:x.gem,episodes_watched:0,gacha_pulls:0,score:0}));
    }
    const count=$('lb-user-count');if(count)count.textContent=rows.length;
    if(!rows.length){box.innerHTML='<div class="empty-state" style="padding:40px"><div class="empty-icon">🏆</div><h3>Chưa có dữ liệu BXH</h3><p>Hãy đăng nhập và bắt đầu xem phim.</p></div>';return;}
    box.innerHTML=rows.map((u,i)=>{
      const rank=Number(u.rank)||i+1, cls=rank===1?'top1':rank===2?'top2':rank===3?'top3':'';
      const avatar=u.avatar_url||`https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name||'RoFlix')}&background=f59e0b&color=000&size=80`;
      return `<div class="rf-real-lb-item ${rank<=3?'rf-lb-podium':''}"><span class="lb-rank ${cls}">${rank<=3?['🥇','🥈','🥉'][rank-1]:'#'+rank}</span><div class="lb-user"><img class="lb-avatar" src="${esc(avatar)}" alt=""><span class="lb-name">${esc(u.display_name||'Người dùng')}</span></div><span class="lb-level">Lv.${Number(u.level)||1}</span><span class="rf-lb-xp">${Number(u.exp||0).toLocaleString('vi-VN')} EXP</span><span class="lb-gem">💎 ${Number(u.gems||0).toLocaleString('vi-VN')}</span></div>`;
    }).join('');
  }

  /* ---------- Cloud watchlist ---------- */
  async function getCloudWatchlist(){
    const u=await user(); if(!u||!sb)return [];
    try{const {data,error}=await sb.from('roflix_watchlist').select('*').eq('user_id',u.id).order('created_at',{ascending:false});if(error)throw error;return data||[]}catch(e){console.debug('[RoFlix Mega] watchlist read',e.message);return []}
  }
  async function rfToggleWatchlist(slug,movie){
    const u=await user();
    if(!u){toast('warning','Watchlist','Đăng nhập để lưu danh sách xem sau.');return false;}
    const existing=await sb.from('roflix_watchlist').select('id').eq('user_id',u.id).eq('movie_slug',slug).maybeSingle();
    if(existing.data?.id){await sb.from('roflix_watchlist').delete().eq('id',existing.data.id);toast('info','Watchlist','Đã bỏ khỏi danh sách xem sau.');}
    else{
      const m=movie||window.currentMovieData||{};
      const {error}=await sb.from('roflix_watchlist').insert({user_id:u.id,movie_slug:slug,movie_title:m.title||m.name||window.currentMovieTitle||slug,origin_name:m.origin_name||'',poster_url:m.poster||m.poster_url||m.thumb_url||'',source_id:m._src||window.currentSourceId||'kkphim'});
      if(error){toast('error','Watchlist',error.message);return false;}
      toast('success','Watchlist','Đã thêm vào Xem sau ❤️');
    }
    renderWatchlistTab(); renderDetailWatchlistButton(); return true;
  }
  async function renderWatchlistTab(){
    const box=$('watchlist-grid');if(!box)return;
    const rows=await getCloudWatchlist();
    if(!rows.length){box.innerHTML='<div class="col-span-full empty-state" style="padding:40px"><div class="empty-icon">📚</div><h3>Watchlist đang trống</h3><p>Thêm phim vào Xem sau để quay lại bất cứ lúc nào.</p></div>';return;}
    box.innerHTML=rows.map(m=>`<article class="rf-watchlist-card" onclick="viewMovieDetail('${String(m.movie_slug).replace(/'/g,"\\'")}','${esc(m.source_id||'kkphim')}')"><div class="rf-watchlist-poster"><img src="${esc(m.poster_url||'https://placehold.co/300x450/10131d/f59e0b?text=RF')}" alt="" loading="lazy"></div><div class="rf-watchlist-body"><b>${esc(m.movie_title)}</b><small>${esc(m.origin_name||'')}</small><button onclick="event.stopPropagation();rfToggleWatchlist('${String(m.movie_slug).replace(/'/g,"\\'")}')">✓ Đã lưu</button></div></article>`).join('');
  }
  async function renderDetailWatchlistButton(){
    const container=$('detail-content-container');if(!container)return;
    const title=container.querySelector('h1');const slug=window.currentSlug||'';if(!slug)return;
    let btn=document.getElementById('rf-detail-watchlist-btn');
    if(!btn){const fav=container.querySelector('.rf-detail-watch-btn');const host=fav?.parentElement||container.querySelector('.md\\:col-span-3');if(!host)return;btn=document.createElement('button');btn.id='rf-detail-watchlist-btn';btn.className='rf-watchlist-detail-btn';(fav?fav.parentElement:host).appendChild(btn);}
    const u=await user();let saved=false;
    if(u){const r=await sb.from('roflix_watchlist').select('id').eq('user_id',u.id).eq('movie_slug',slug).maybeSingle();saved=!!r.data?.id;}
    btn.textContent=saved?'✓ Đã lưu Watchlist':'＋ Thêm Watchlist';btn.onclick=()=>rfToggleWatchlist(slug,window.currentMovieData||{});
  }

  /* ---------- Realtime movie comments ---------- */
  async function renderCloudComments(slug,title,targetId='comments-container'){
    const box=$(targetId);if(!box||!slug||!sb)return;
    const {data,error}=await sb.from('movie_comments').select('id,movie_slug,movie_title,display_name,body,created_at,user_id').eq('movie_slug',slug).eq('status','visible').order('created_at',{ascending:false}).limit(50);
    if(error){box.innerHTML='<div class="rf-empty-state">Không tải được bình luận realtime.</div>';return;}
    box.innerHTML=data?.length?data.map(c=>`<article class="rf-live-comment"><div class="rf-live-avatar">${esc((c.display_name||'R').slice(0,1).toUpperCase())}</div><div><div class="rf-live-comment-head"><b>${esc(c.display_name||'RoFlix user')}</b><time>${new Date(c.created_at).toLocaleString('vi-VN')}</time></div><p>${esc(c.body)}</p></div></article>`).join(''):'<div class="rf-empty-state">Chưa có bình luận. Hãy mở màn bằng một câu hay ho. 🍿</div>';
  }
  async function subscribeMovieComments(slug,title){
    if(!sb||!slug)return;
    if(commentChannel){try{await sb.removeChannel(commentChannel)}catch(_){}commentChannel=null;}
    currentCommentSlug=slug;
    await renderCloudComments(slug,title,'comments-container');
    await renderCloudComments(slug,title,'rf-player-comments-list');
    commentChannel=sb.channel('roflix-comments:'+slug).on('postgres_changes',{event:'*',schema:'public',table:'movie_comments',filter:'movie_slug=eq.'+slug},async()=>{
      if(currentCommentSlug!==slug)return;
      await renderCloudComments(slug,title,'comments-container');
      await renderCloudComments(slug,title,'rf-player-comments-list');
    }).subscribe();
  }
  async function submitRealtimeComment(slug,inputId){
    const input=$(inputId);if(!input)return;
    const body=input.value.trim();if(!body)return;
    const u=await user();if(!u){toast('warning','Bình luận','Đăng nhập để bình luận realtime.');return;}
    const display=u.user_metadata?.display_name||u.email?.split('@')[0]||'RoFlix user';
    const {error}=await sb.from('movie_comments').insert({movie_slug:slug,movie_title:window.currentMovieTitle||slug,user_id:u.id,display_name:display.slice(0,40),body:body.slice(0,2000),status:'visible'});
    if(error){toast('error','Bình luận',error.message);return;}
    input.value='';
    const st=read('roflix-stats',{totalComments:0});st.totalComments=(st.totalComments||0)+1;write('roflix-stats',st);queueGameSync();
    toast('success','Bình luận','Đã đăng realtime 💬');
  }
  window.rfSubmitMovieComment=()=>submitRealtimeComment(window.currentSlug||'', 'rf-player-comment-input');
  window.submitComment=(slug)=>submitRealtimeComment(slug||window.currentSlug||'', 'comment-input');

  /* ---------- Gacha 3.0 ---------- */
  const RF_GACHA_POOL=[
    {key:'frieren',name:'Frieren',movie:'Frieren: Beyond Journey\'s End',rarity:'legendary',character:'Frieren'},
    {key:'gojo',name:'Satoru Gojo',movie:'Jujutsu Kaisen',rarity:'epic',character:'Satoru Gojo'},
    {key:'makima',name:'Makima',movie:'Chainsaw Man',rarity:'epic',character:'Makima'},
    {key:'yor',name:'Yor Forger',movie:'SPY x FAMILY',rarity:'super-rare',character:'Yor Forger'},
    {key:'marin',name:'Marin Kitagawa',movie:'My Dress-Up Darling',rarity:'super-rare',character:'Marin Kitagawa'},
    {key:'shinobu',name:'Shinobu Kocho',movie:'Demon Slayer',rarity:'super-rare',character:'Shinobu Kocho'},
    {key:'mikasa',name:'Mikasa Ackerman',movie:'Attack on Titan',rarity:'rare',character:'Mikasa Ackerman'},
    {key:'levi',name:'Levi Ackerman',movie:'Attack on Titan',rarity:'rare',character:'Levi Ackerman'},
    {key:'nezuko',name:'Nezuko Kamado',movie:'Demon Slayer',rarity:'rare',character:'Nezuko Kamado'},
    {key:'tanjiro',name:'Tanjiro Kamado',movie:'Demon Slayer',rarity:'common',character:'Tanjiro Kamado'},
    {key:'anya',name:'Anya Forger',movie:'SPY x FAMILY',rarity:'common',character:'Anya Forger'},
    {key:'denji',name:'Denji',movie:'Chainsaw Man',rarity:'common',character:'Denji'}
  ];
  const RF_WEIGHTS={common:45,rare:27,'super-rare':16,epic:8,legendary:3,secret:1};
  const RF_RARITY={common:'⚪ Common',rare:'🟢 Rare','super-rare':'🔵 Super Rare',epic:'🟣 Epic',legendary:'🟠 Legendary',secret:'🌈 Secret'};
  const RF_CACHE='roflix-gacha-art-cache-v3';
  async function characterArt(name){
    const cache=read(RF_CACHE,{});if(cache[name])return cache[name];
    try{const r=await fetch('https://api.jikan.moe/v4/characters?q='+encodeURIComponent(name)+'&limit=1',{cache:'force-cache'});if(r.ok){const d=await r.json();const url=d?.data?.[0]?.images?.webp?.large_image_url||d?.data?.[0]?.images?.jpg?.large_image_url;if(url){cache[name]=url;write(RF_CACHE,cache);return url;}}}catch(_){}
    const fallback='https://placehold.co/600x900/10131d/fbbf24?text='+encodeURIComponent(name);cache[name]=fallback;write(RF_CACHE,cache);return fallback;
  }
  function rollRF(){
    const pity=Number(localStorage.getItem('roflix-gacha-pity')||0)+1;
    let pool=RF_GACHA_POOL;
    if(pity>=50)pool=RF_GACHA_POOL.filter(x=>x.rarity==='legendary');
    else if(pity>=20)pool=RF_GACHA_POOL.filter(x=>['epic','legendary'].includes(x.rarity));
    const weights=pool.reduce((n,x)=>n+(RF_WEIGHTS[x.rarity]||1),0);let r=Math.random()*weights;
    let card=pool[0];for(const c of pool){r-=RF_WEIGHTS[c.rarity]||1;if(r<=0){card=c;break;}}
    localStorage.setItem('roflix-gacha-pity',String(['epic','legendary','secret'].includes(card.rarity)?0:pity));return {...card,id:card.key+'_'+Date.now()};
  }
  async function pullOne(){
    const cost=50;
    let gems=Number(localStorage.getItem('roflix-gem')||0);
    if(gems<cost){toast('error','Gacha','Cần 50 💎 để quay.');return null;}
    const card=rollRF();card.image=await characterArt(card.character);
    const u=await user();
    if(u&&sb){
      try{const r=await sb.rpc('roflix_gacha_commit',{p_cost:cost,p_card_key:card.key,p_name:card.name,p_movie:card.movie,p_rarity:card.rarity,p_image:card.image});if(r.error)throw r.error;gems=Number(r.data?.gems);localStorage.setItem('roflix-gem',String(gems));localStorage.setItem('roflix-gacha-pulls',String(Number(localStorage.getItem('roflix-gacha-pulls')||0)+1));}
      catch(e){toast('error','Gacha',e.message||'Không thể lưu lượt quay.');return null;}
    }else{localStorage.setItem('roflix-gem',String(gems-cost));localStorage.setItem('roflix-gacha-pulls',String(Number(localStorage.getItem('roflix-gacha-pulls')||0)+1));}
    const cards=read('roflix-cards',[]);cards.push({...card,obtainedAt:new Date().toISOString()});write('roflix-cards',cards);queueGameSync();return card;
  }
  async function megaGacha(times=1){
    const cost=50*times;
    if(Number(localStorage.getItem('roflix-gem')||0)<cost){toast('error','Gacha',`Cần ${cost} 💎 để quay ${times} lần.`);return;}
    const btn=$('gacha-btn');if(btn)btn.disabled=true;
    const pulls=[];for(let i=0;i<times;i++){const c=await pullOne();if(c)pulls.push(c);else break;}
    if(pulls.length===1)showMegaGachaPull(pulls[0]);else if(pulls.length>1)showMegaGachaMulti(pulls);
    if(btn)btn.disabled=false; const pity=$('rf-gacha-pity-label');if(pity)pity.textContent=`Pity: ${Number(localStorage.getItem('roflix-gacha-pity')||0)}/20`; if(typeof renderCollection==='function')renderCollection(); if(typeof updateProfileUI==='function')updateProfileUI();
  }
  function showMegaGachaPull(card){
    const overlay=$('gacha-pull-overlay'),art=$('pull-art'),pull=$('gacha-pull-card');if(!overlay||!pull)return;
    $('pull-rarity').textContent=RF_RARITY[card.rarity]||card.rarity;$('pull-rarity').className='pull-rarity '+card.rarity;$('pull-name').textContent=card.name;$('pull-movie').textContent=card.movie;art.src=card.image;art.classList.add('rf-gacha-portrait');overlay.classList.add('show');setTimeout(()=>pull.classList.add('show'),80);
  }
  function showMegaGachaMulti(cards){
    const overlay=$('gacha-pull-overlay'),pull=$('gacha-pull-card');if(!overlay||!pull)return;
    $('pull-rarity').textContent='🎰 10 PULL';$('pull-name').textContent='Bộ sưu tập mới';$('pull-movie').textContent=cards.map(c=>c.name).join(' · ');$('pull-art').src=cards[0].image;pull.classList.add('rf-gacha-multi');overlay.classList.add('show');setTimeout(()=>pull.classList.add('show'),80);
  }
  window.performGacha=()=>megaGacha(1);
  window.performGacha10=()=>megaGacha(10);
  window.RF_GACHA_POOL=RF_GACHA_POOL;
  window.rfCharacterArt=characterArt;

  /* Replace collection renderer with large vertical cards. */
  window.renderCollection=function(){
    const cards=read('roflix-cards',[]),grid=$('card-grid');if(!grid)return;
    const total=RF_GACHA_POOL.length;const uniq=new Set(cards.map(c=>c.key||c.id));
    $('collection-count').textContent=uniq.size;$('collection-total').textContent=total;$('collection-percent').textContent=Math.round(uniq.size/Math.max(1,total)*100)+'%';
    if(!cards.length){grid.innerHTML='<div class="col-span-full empty-state" style="padding:40px"><div class="empty-icon">🎴</div><h3>Chưa có nhân vật</h3><p>Quay Gacha để bắt đầu bộ sưu tập.</p></div>';return;}
    const seen=new Set();const list=cards.slice().reverse().filter(c=>{const k=c.key||c.id;if(seen.has(k))return false;seen.add(k);return true;});
    grid.innerHTML=list.map(c=>`<article class="rf-gacha-card rf-rarity-${esc(c.rarity)}"><div class="rf-gacha-art"><img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"></div><div class="rf-gacha-overlay"><span>${esc(RF_RARITY[c.rarity]||c.rarity)}</span><b>${esc(c.name)}</b><small>${esc(c.movie)}</small></div></article>`).join('');
  };

  /* ---------- Homepage 3.0 ---------- */
  async function loadMegaHome(){
    const main=document.getElementById('movie-list-section');if(!main||document.getElementById('rf-mega-home'))return;
    const sec=document.createElement('section');sec.id='rf-mega-home';sec.className='rf-mega-home max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full';
    sec.innerHTML='<div class="rf-mega-head"><div><span class="rf-section-kicker">ROFLIX DISCOVER</span><h2>🔥 Đang được quan tâm</h2><p>Những lựa chọn nổi bật từ kho phim hiện tại.</p></div><button onclick="refreshMegaHome()">Làm mới ↻</button></div><div id="rf-mega-hot" class="rf-mega-row"><div class="rf-loading-line">Đang tải...</div></div><div class="rf-mega-head rf-mega-subhead"><div><span class="rf-section-kicker">FOR YOU</span><h2>✨ Đề xuất cho bạn</h2></div></div><div id="rf-mega-reco" class="rf-mega-row"><div class="rf-loading-line">Đang tải...</div></div>';
    main.parentNode.insertBefore(sec,main.nextSibling);
    await refreshMegaHome();
  }
  function megaCard(m){return `<article class="rf-mega-card" onclick="viewMovieDetail('${String(m.slug||'').replace(/'/g,"\\'")}','${esc(m._src||window.currentSourceId||'kkphim')}')"><div class="rf-mega-poster"><img src="${esc(m.poster||m.poster_url||m.thumb_url||'')}" alt="" loading="lazy"><span>★ ${esc(m.rating||'N/A')}</span><button onclick="event.stopPropagation();playMovie('${String(m.slug||'').replace(/'/g,"\\'")}','${esc(m._src||'')}')">▶</button></div><b>${esc(m.title||m.name||'Phim')}</b><small>${esc(m.origin_name||'')} · ${esc(m.year||'')}</small></article>`}
  async function refreshMegaHome(){
    const hot=$('rf-mega-hot'),reco=$('rf-mega-reco');if(!hot||!reco)return;
    try{const r=await fetchListWithFallback('/danh-sach/phim-moi-cap-nhat?page=1');const items=mapListResultItems(r,10);hot.innerHTML=items.slice(0,10).map(megaCard).join('')||'<div class="rf-empty-state">Chưa có dữ liệu.</div>';const pool=typeof fetchRecoPool==='function'?await fetchRecoPool():items;const signals=typeof getRecoSignals==='function'?getRecoSignals():{watched:new Set()};const rec=(pool||items).filter(x=>!signals.watched?.has?.(x.slug)).slice(0,10);reco.innerHTML=rec.map(megaCard).join('')||'<div class="rf-empty-state">Xem vài phim để RoFlix hiểu gu của bạn hơn.</div>';}catch(e){hot.innerHTML='<div class="rf-empty-state">Không tải được dữ liệu.</div>';reco.innerHTML=hot.innerHTML;}
  }
  window.refreshMegaHome=refreshMegaHome;

  /* ---------- Player + Watch Party advanced UI ---------- */
  function injectPlayerParty(){
    const target=document.querySelector('#view-play-page .rf-player-summary');if(!target||document.getElementById('rf-party-mini'))return;
    const box=document.createElement('section');box.id='rf-party-mini';box.className='rf-party-mini rf-v2-section';box.innerHTML='<div class="rf-section-heading"><div><span class="rf-section-kicker">WATCH PARTY 3.0</span><h2>👥 Xem chung</h2><p>Phòng realtime, thành viên và chat.</p></div><button onclick="openRoflixTools(\'party\')">Mở phòng</button></div><div id="rf-party-mini-body"><div class="rf-party-empty">Mở Xem chung để tạo hoặc tham gia phòng.</div></div>';
    target.parentNode.insertBefore(box,target.nextSibling);
  }

  /* ---------- Profile tabs ---------- */
  function injectWatchlistTab(){
    const tabs=document.querySelector('.profile-tabs');if(!tabs||tabs.querySelector('[data-tab="watchlist"]'))return;
    const b=document.createElement('button');b.className='tab-btn';b.dataset.tab='watchlist';b.innerHTML='<i class="fa-solid fa-bookmark"></i> <span>Watchlist</span>';tabs.insertBefore(b,tabs.children[2]||null);
    b.addEventListener('click',()=>{tabs.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('#view-profile-page .tab-content').forEach(x=>x.classList.remove('active'));$('tab-watchlist')?.classList.add('active');renderWatchlistTab();});
    const settings=$('tab-settings');if(!settings)return;
    const pane=document.createElement('div');pane.className='tab-content';pane.id='tab-watchlist';pane.innerHTML='<div class="rf-watchlist-head"><div><span class="rf-section-kicker">MY LIBRARY</span><h2>📚 Xem sau</h2><p>Watchlist đồng bộ theo tài khoản Supabase.</p></div><button onclick="renderWatchlistTab()">↻</button></div><div id="watchlist-grid" class="rf-watchlist-grid"></div>';
    settings.parentNode.insertBefore(pane,settings);renderWatchlistTab();
  }

  /* ---------- Detail hooks ---------- */
  function hookDetail(){
    if(typeof window.viewMovieDetail!=='function'||window.__rfMegaDetailHook)return;
    window.__rfMegaDetailHook=true;const original=window.viewMovieDetail;
    window.viewMovieDetail=async function(){const result=await original.apply(this,arguments);setTimeout(async()=>{renderDetailWatchlistButton();subscribeMovieComments(window.currentSlug||'',window.currentMovieTitle||'');},120);return result;};
  }
  function hookPlay(){
    if(typeof window.playMovieByIndex!=='function'||window.__rfMegaPlayHook)return;
    window.__rfMegaPlayHook=true;const original=window.playMovieByIndex;
    window.playMovieByIndex=function(){const result=original.apply(this,arguments);setTimeout(()=>{injectPlayerParty();subscribeMovieComments(window.currentSlug||'',window.currentMovieTitle||'');},120);return result;};
  }

  function hookGame(){
    if(window.__rfMegaGameHook)return;window.__rfMegaGameHook=true;
    ['addGem','addExp'].forEach(name=>{const original=window[name];if(typeof original!=='function')return;window[name]=function(){const r=original.apply(this,arguments);queueGameSync();return r;};});
    const saveP=window.saveProfile;if(typeof saveP==='function'){window.saveProfile=function(){const r=saveP.apply(this,arguments);setTimeout(syncProfileCloud,80);return r;};}
    const originalFav=window.toggleFavorite;if(typeof originalFav==='function'){window.toggleFavorite=function(){const r=originalFav.apply(this,arguments);setTimeout(()=>{const st=read('roflix-stats',{});st.totalFavorites=typeof getFavorites==='function'?getFavorites().length:st.totalFavorites||0;write('roflix-stats',st);queueGameSync();},60);return r;};}
  }

  function boot(){
    hydrateGameStats().then(()=>{try{if(typeof window.updateProfileUI==='function')window.updateProfileUI();}catch(_){} });
    hookGame();hookDetail();hookPlay();injectWatchlistTab();
    setTimeout(()=>{hookDetail();hookPlay();loadMegaHome();renderRealLeaderboard();renderCollection();},700);
    setTimeout(()=>{syncGameStats();renderWatchlistTab();},1800);
    const auth=sb?.auth;if(auth)auth.onAuthStateChange(()=>{setTimeout(()=>{syncGameStats();renderRealLeaderboard();renderWatchlistTab();},700)});
    const observer=new MutationObserver(()=>{hookDetail();hookPlay();injectWatchlistTab();});observer.observe(document.body,{subtree:true,childList:true});
  }
  document.addEventListener('DOMContentLoaded',boot);
  window.rfMegaSync=syncGameStats;
  window.rfMegaLeaderboard=renderRealLeaderboard;
  window.rfMegaWatchlist=renderWatchlistTab;
})();
