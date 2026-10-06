// ============================================================
// WINDOW ONLOAD
// ============================================================
window.onload = function () {
    if (localStorage.getItem('roflix-theme') === 'light') {
        document.body.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
        updateThemeIcon(true);
    }
    bindRandomChips();
    updateSourceUi();
    renderMoviesFromAPI(1);
    requestAnimationFrame(() => { initHeroSlider(); });
    const loadSecondary = () => {
        loadWeeklyPicks();
        renderBottomBoards();
        renderRecoPreferences();
        refreshRecommendations(false);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(loadSecondary, { timeout: 2500 });
    else setTimeout(loadSecondary, 500);
    checkUserAuthStatus();
    if (!localStorage.getItem('roflix-profile')) localStorage.setItem('roflix-profile', JSON.stringify({name:'Người dùng',avatar:'default',bio:'Chào mừng đến với RoFlix! 🎬',banner:'default',country:'Việt Nam',favoriteMovie:'',birthday:'',joinDate:new Date().toISOString().split('T')[0]}));
    if (!localStorage.getItem('roflix-level')) localStorage.setItem('roflix-level',JSON.stringify({level:1,exp:0}));
    if (!localStorage.getItem('roflix-gem')) localStorage.setItem('roflix-gem','0');
    if (!localStorage.getItem('roflix-stats')) localStorage.setItem('roflix-stats',JSON.stringify({totalEpisodesWatched:0,totalMoviesWatched:0,totalFavorites:0,totalComments:0,totalGemEarned:0,mostWatchedMovie:null,favoriteGenre:null,watchTime:0}));
    if (!localStorage.getItem('roflix-achievements')) localStorage.setItem('roflix-achievements',JSON.stringify([]));
    if (!localStorage.getItem('roflix-cards')) localStorage.setItem('roflix-cards',JSON.stringify([]));
    renderLeaderboard();
    try { if(typeof updateNotificationBadge==='function') updateNotificationBadge(); if(typeof renderNotifications==='function') renderNotifications(); } catch (_) {}
    console.log('🔥 RoFlix Pro - Cloud Account Bridge active');
};

// ============================================================
// CLOUD ACCOUNT BRIDGE
// Supabase is the source of truth for Gem, Gacha and Watch History.
// LocalStorage remains a fast cache for the UI/offline shell.
// ============================================================
(function rfInstallCloudAccountBridge(){
    let started=false, lastUserId=null, originalSaveWatchHistory=null, originalSaveProfile=null;
    function sb(){return window.rfSupabase||null;}
    async function getUser(){
        const client=sb(); if(!client) return null;
        try { if(window.rfSupabaseCurrentUser?.id) return window.rfSupabaseCurrentUser; const {data}=await client.auth.getUser(); return data?.user||null; } catch(_){return null;}
    }
    function userHistoryKey(uid){return `roflix-watch-history:user:${uid}`;}
    function safeJson(v,f){try{return JSON.parse(v);}catch(_){return f;}}
    function setLocalCards(rows){const cards=(Array.isArray(rows)?rows:[]).map(r=>({id:r.card_key,baseId:r.card_key,name:r.name,movie:r.movie,rarity:r.rarity,image:r.image,obtainedAt:r.obtained_at}));localStorage.setItem('roflix-cards',JSON.stringify(cards));return cards;}
    function setLocalHistory(rows,uid){const history=(Array.isArray(rows)?rows:[]).map(r=>({slug:r.slug,title:r.title||r.slug,poster:r.poster||'',episode:Number(r.episode)||0,episodeName:r.episode_name||'',progress:Number(r.progress)||0,sourceId:r.source_id||'vsmov',genres:Array.isArray(r.genres)?r.genres:[],timestamp:new Date(r.updated_at||Date.now()).getTime()}));localStorage.setItem(userHistoryKey(uid),JSON.stringify(history));return history;}
    async function hydrate(uid){
        const client=sb(); if(!client||!uid)return;
        try{
            const {data:stats,error:statsError}=await client.from('roflix_game_stats').select('*').eq('user_id',uid).maybeSingle();
            if(!statsError&&stats){
                localStorage.setItem('roflix-gem',String(Math.max(0,Number(stats.gems)||0)));
                localStorage.setItem('roflix-level',JSON.stringify({level:Number(stats.level)||1,exp:Number(stats.exp)||0}));
                localStorage.setItem('roflix-stats',JSON.stringify({...safeJson(localStorage.getItem('roflix-stats')||'{}',{}),totalEpisodesWatched:Number(stats.episodes_watched)||0,totalMoviesWatched:Number(stats.movies_watched)||0,totalComments:Number(stats.comments_count)||0,totalFavorites:Number(stats.favorites_count)||0,totalGemEarned:Number(stats.gems_earned)||0,watchTime:Number(stats.watch_minutes)||0,gachaPulls:Number(stats.gacha_pulls)||0}));
            }
            const {data:profile}=await client.from('profiles').select('display_name,bio,avatar_url,banner_url,country,created_at').eq('id',uid).maybeSingle();
            if(profile){const local=safeJson(localStorage.getItem('roflix-profile')||'{}',{});localStorage.setItem('roflix-profile',JSON.stringify({...local,name:profile.display_name||local.name||'Người dùng',bio:profile.bio??local.bio,avatar:profile.avatar_url||local.avatar,banner:profile.banner_url||local.banner,country:profile.country||local.country,joinDate:profile.created_at?String(profile.created_at).slice(0,10):(local.joinDate||new Date().toISOString().slice(0,10))}));}
            const {data:inventory}=await client.rpc('roflix_sync_gacha_inventory'); if(Array.isArray(inventory))setLocalCards(inventory);
            const {data:history}=await client.from('roflix_watch_history').select('*').eq('user_id',uid).order('updated_at',{ascending:false}).limit(50); if(Array.isArray(history))setLocalHistory(history,uid);
            try{updateProfileUI();}catch(_){} try{renderCollection();}catch(_){} try{renderContinueWatching();}catch(_){}
        }catch(e){console.debug('[RoFlix Cloud] hydrate failed',e?.message||e);}
    }
    async function syncProfile(){const client=sb(),uid=lastUserId;if(!client||!uid)return;try{const p=getProfile();await client.from('profiles').update({display_name:p.name||'Người dùng',bio:p.bio||'',avatar_url:(p.avatar&&p.avatar!=='default')?p.avatar:null,banner_url:(p.banner&&p.banner!=='default')?p.banner:null,country:p.country||'Việt Nam'}).eq('id',uid);}catch(e){console.debug('[RoFlix Cloud] profile sync failed',e?.message||e);}}
    async function syncHistory(slug,episode,progress,extra){const client=sb(),uid=lastUserId;if(!client||!uid||!slug)return;try{await client.rpc('roflix_sync_watch_history',{p_slug:String(slug),p_title:extra?.title||null,p_poster:extra?.poster||null,p_episode:Number(episode)||0,p_episode_name:extra?.episodeName||null,p_progress:Number(progress)||0,p_source_id:extra?.sourceId||null,p_genres:extra?.genres||[]});}catch(e){console.debug('[RoFlix Cloud] history sync failed',e?.message||e);}}
    async function cloudSell(baseId){const client=sb();if(!client||!lastUserId)return false;try{const {data,error}=await client.rpc('roflix_sell_gacha_card',{p_card_key:String(baseId)});if(error)throw error;if(data?.gems!=null)localStorage.setItem('roflix-gem',String(data.gems));await hydrate(lastUserId);try{showToast('success','Đã bán thẻ',`+${data?.reward||0} 💎`);}catch(_){}return true;}catch(e){console.debug('[RoFlix Cloud] sell failed',e?.message||e);try{showToast('error','Không thể bán thẻ','Giao dịch Cloud chưa thực hiện.');}catch(_){}return false;}}
    function installWrappers(){
        if(typeof saveWatchHistory==='function'&&!originalSaveWatchHistory){originalSaveWatchHistory=saveWatchHistory;window.saveWatchHistory=function(slug,episode,progress,extra={}){originalSaveWatchHistory(slug,episode,progress,extra);syncHistory(slug,episode,progress,extra);};}
        if(typeof saveProfile==='function'&&!originalSaveProfile){originalSaveProfile=saveProfile;window.saveProfile=function(data){originalSaveProfile(data);syncProfile();};}
        if(typeof rfSellGachaCard==='function'&&!rfSellGachaCard._cloudWrapped){const originalSell=rfSellGachaCard;const cloudSellWrapper=async function(baseId){if(lastUserId)return await cloudSell(baseId);return originalSell(baseId);};cloudSellWrapper._cloudWrapped=true;window.rfSellGachaCard=cloudSellWrapper;}
        if(typeof performGacha==='function'&&!performGacha._cloudWrapped&&!performGacha.__rfServerGacha&&typeof window.rfServerGachaPull!=='function'){const originalGacha=performGacha;const cloudGacha=async function(){if(!lastUserId)return await originalGacha();if(typeof window.rfServerGachaPull==='function')return window.rfServerGachaPull(1);await loadJikanGachaPool();try{const {data,error}=await sb().rpc('roflix_gacha_roll',{p_count:1});if(error)throw error;if(data?.gems!=null)localStorage.setItem('roflix-gem',String(data.gems));await hydrate(lastUserId);const card=(data?.results&&data.results[0])||null;if(card)showGachaPull(card);}catch(e){try{showToast('error','Gacha lỗi',e?.message||'Không thể hoàn tất lượt quay.');}catch(_){} }};cloudGacha._cloudWrapped=true;window.performGacha=cloudGacha;}
        if(typeof performGacha10==='function'&&!performGacha10._cloudWrapped&&!performGacha10.__rfServerGacha&&typeof window.rfServerGachaPull!=='function'){const originalGacha10=performGacha10;const cloudGacha10=async function(){if(!lastUserId)return await originalGacha10();if(typeof window.rfServerGachaPull==='function')return window.rfServerGachaPull(10);try{const {data,error}=await sb().rpc('roflix_gacha_roll',{p_count:10});if(error)throw error;if(data?.gems!=null)localStorage.setItem('roflix-gem',String(data.gems));await hydrate(lastUserId);const cards=Array.isArray(data?.results)?data.results:[];if(cards.length)showGachaBatch(cards);}catch(e){try{showToast('error','Gacha lỗi',e?.message||'Không thể hoàn tất 10 lượt quay.');}catch(_){} }};cloudGacha10._cloudWrapped=true;window.performGacha10=cloudGacha10;}
    }
    async function tick(){const user=await getUser(),uid=user?.id?String(user.id):null;if(uid&&uid!==lastUserId){lastUserId=uid;await hydrate(uid);}if(!uid&&lastUserId)lastUserId=null;installWrappers();}
    const start=()=>{if(started)return;started=true;tick();setInterval(tick,2500);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
