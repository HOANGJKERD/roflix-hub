/* RoFlix cross-device user data: favorites + watch history.
 * Supabase is the source of truth when a user is signed in.
 * LocalStorage remains a short-lived cache/fallback for the current device.
 */
(function(){
  'use strict';
  const sb = window.rfSupabase;
  if (!sb) return;
  const favKey = 'roflix-favs';
  const readJson = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch (_) { return fallback; } };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };

  async function currentUser(){
    try { const {data} = await sb.auth.getUser(); return data?.user || null; } catch (_) { return null; }
  }
  function toast(type,title,msg){
    try { if(typeof window.showToastPro === 'function') window.showToastPro(type,title,msg); else if(typeof window.showToast === 'function') window.showToast(type,title,msg); } catch (_) {}
  }

  async function getCloudFavorites(){
    const u = await currentUser(); if(!u) return null;
    try {
      const {data,error} = await sb.rpc('roflix_favorites_get');
      if(error) throw error;
      return Array.isArray(data) ? data.filter(Boolean).map(String) : [];
    } catch(e) { console.debug('[RoFlix Cloud] favorites read:', e?.message || e); return null; }
  }
  async function replaceCloudFavorites(favs){
    const u = await currentUser(); if(!u) return false;
    try {
      const {error} = await sb.rpc('roflix_favorites_replace',{p_slugs:Array.from(new Set((favs||[]).map(String).filter(Boolean)))});
      if(error) throw error;
      return true;
    } catch(e) { console.debug('[RoFlix Cloud] favorites write:', e?.message || e); return false; }
  }

  async function getCloudHistory(){
    const u = await currentUser(); if(!u) return null;
    try {
      const {data,error} = await sb.rpc('roflix_watch_history_get');
      if(error) throw error;
      return Array.isArray(data) ? data : [];
    } catch(e) { console.debug('[RoFlix Cloud] history read:', e?.message || e); return null; }
  }
  async function syncCloudHistory(items){
    const u = await currentUser(); if(!u) return false;
    try {
      const {error} = await sb.rpc('roflix_watch_history_sync',{p_items:Array.isArray(items)?items:[]});
      if(error) throw error;
      return true;
    } catch(e) { console.debug('[RoFlix Cloud] history write:', e?.message || e); return false; }
  }

  function mergeHistory(localItems, cloudItems){
    const map = new Map();
    [...(Array.isArray(cloudItems)?cloudItems:[]), ...(Array.isArray(localItems)?localItems:[])].forEach(item=>{
      if(!item?.slug) return;
      const old = map.get(String(item.slug));
      if(!old || Number(item.timestamp||0) >= Number(old.timestamp||0)) map.set(String(item.slug), item);
    });
    return [...map.values()].sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0)).slice(-50);
  }

  async function hydrateUserData(){
    const u = await currentUser();
    if(!u) return;

    const localFavs = typeof window.getFavorites === 'function' ? window.getFavorites() : readJson(favKey,[]);
    const cloudFavs = await getCloudFavorites();
    if(cloudFavs !== null){
      const mergedFavs = Array.from(new Set([...(cloudFavs||[]), ...(localFavs||[]).map(String)]));
      writeJson(favKey, mergedFavs);
      if(mergedFavs.length !== (cloudFavs||[]).length) await replaceCloudFavorites(mergedFavs);
    }

    const localHistory = typeof window.getWatchHistory === 'function' ? window.getWatchHistory() : [];
    const cloudHistory = await getCloudHistory();
    if(cloudHistory !== null){
      const merged = mergeHistory(localHistory,cloudHistory);
      const key = typeof window.getWatchHistoryStorageKey === 'function' ? window.getWatchHistoryStorageKey() : `roflix-watch-history:user:${u.id}`;
      if(key) writeJson(key,merged);
      await syncCloudHistory(merged);
    }

    try { if(typeof window.renderContinueWatching === 'function') window.renderContinueWatching(); } catch (_) {}
    try { if(typeof window.renderHistoryTab === 'function') window.renderHistoryTab(); } catch (_) {}
    try { if(typeof window.renderProfile === 'function') window.renderProfile(); } catch (_) {}
  }

  function installWrappers(){
    if(typeof window.toggleFavorite === 'function' && !window.toggleFavorite.__rfCloudWrapped){
      const original = window.toggleFavorite;
      const wrapped = async function(slug){
        const result = original.apply(this,arguments);
        const u = await currentUser();
        if(u){
          const favs = typeof window.getFavorites === 'function' ? window.getFavorites() : readJson(favKey,[]);
          await replaceCloudFavorites(favs);
        }
        return result;
      };
      wrapped.__rfCloudWrapped = true;
      window.toggleFavorite = wrapped;
    }

    if(typeof window.saveWatchHistory === 'function' && !window.saveWatchHistory.__rfCloudWrapped){
      const originalSave = window.saveWatchHistory;
      const wrappedSave = function(){
        const result = originalSave.apply(this,arguments);
        const args = arguments;
        const uPromise = currentUser();
        uPromise.then(async u=>{
          if(!u) return;
          const items = typeof window.getWatchHistory === 'function' ? window.getWatchHistory() : [];
          await syncCloudHistory(items);
        }).catch(()=>{});
        return result;
      };
      wrappedSave.__rfCloudWrapped = true;
      window.saveWatchHistory = wrappedSave;
    }

    if(typeof window.clearWatchHistory === 'function' && !window.clearWatchHistory.__rfCloudWrapped){
      const originalClear = window.clearWatchHistory;
      const wrappedClear = async function(){
        const result = originalClear.apply(this,arguments);
        const u = await currentUser();
        if(u){
          const items = typeof window.getWatchHistory === 'function' ? window.getWatchHistory() : [];
          await syncCloudHistory(items);
        }
        return result;
      };
      wrappedClear.__rfCloudWrapped = true;
      window.clearWatchHistory = wrappedClear;
    }
  }

  function boot(){
    installWrappers();
    setTimeout(installWrappers,300);
    setTimeout(installWrappers,1200);
    hydrateUserData();
    sb.auth.onAuthStateChange((event)=>{
      if(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') setTimeout(()=>{installWrappers();hydrateUserData();},100);
      if(event === 'SIGNED_OUT'){
        try { localStorage.removeItem(favKey); } catch (_) {}
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.rfCloudUserDataSync = hydrateUserData;
})();
