/* RoFlix route persistence: keep the current movie/detail/player route across F5.
   Uses URL query parameters so refresh and copied links restore the same title/episode. */
(function () {
  'use strict';
  const KEY='roflix:last-route:v1';
  let restoring=false;
  function readRoute(){
    const u=new URL(location.href);
    const mode=u.searchParams.get('rf');
    const movie=u.searchParams.get('movie');
    if(!movie || !['detail','play'].includes(mode)) return null;
    const ep=Math.max(0,Number.parseInt(u.searchParams.get('ep')||'0',10)||0);
    return {mode,movie,ep,src:u.searchParams.get('src')||''};
  }
  function writeRoute(route){
    if(restoring)return;
    const u=new URL(location.href);
    if(!route || route.mode==='home'){
      ['rf','movie','ep','src'].forEach(k=>u.searchParams.delete(k));
      try{sessionStorage.removeItem(KEY);}catch(_){}
    } else {
      u.searchParams.set('rf',route.mode);
      u.searchParams.set('movie',route.movie);
      if(route.mode==='play')u.searchParams.set('ep',String(route.ep||0));else u.searchParams.delete('ep');
      if(route.src)u.searchParams.set('src',route.src);else u.searchParams.delete('src');
      try{sessionStorage.setItem(KEY,JSON.stringify(route));}catch(_){}
    }
    history.replaceState(history.state,'',u.pathname+u.search+u.hash);
  }
  function wrap(name,handler){
    const original=window[name];
    if(typeof original!=='function'||original.__rfRouteWrapped)return;
    const wrapped=handler(original);
    wrapped.__rfRouteWrapped=true;
    window[name]=wrapped;
  }
  wrap('viewMovieDetail',original=>async function(slug,src){
    if(!restoring && slug)writeRoute({mode:'detail',movie:String(slug),src:src||''});
    return original.apply(this,arguments);
  });
  wrap('playMovieByIndex',original=>async function(index,options){
    if(!restoring && window.currentSlug)writeRoute({mode:'play',movie:String(window.currentSlug),ep:Number(index)||0,src:window.currentSourceId||''});
    return original.apply(this,arguments);
  });
  wrap('navigateTo',original=>function(target){
    if(!restoring && target==='main-site')writeRoute({mode:'home'});
    return original.apply(this,arguments);
  });
  async function restore(){
    const route=readRoute();
    if(!route)return;
    restoring=true;
    try{
      if(typeof window.viewMovieDetail!=='function')return;
      await window.viewMovieDetail(route.movie,route.src||undefined);
      if(route.mode==='play'){
        const list=window.currentEpisodeList||[];
        if(list.length){
          const index=Math.min(route.ep,Math.max(0,list.length-1));
          if(typeof window.playMovieByIndex==='function')await window.playMovieByIndex(index);
        }
      }
    }catch(error){console.warn('[RoFlix route restore] failed',error);}
    finally{restoring=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restore,0),{once:true});
  else setTimeout(restore,0);
  window.addEventListener('popstate',()=>{const r=readRoute();if(r)restore();});
})();
