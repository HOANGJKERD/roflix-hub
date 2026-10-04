/* Applies Admin preferred source overrides before movie detail fetch. */
(function(){
 'use strict';
 const sb=window.rfSupabase;
 function patch(){
  const ov=window.viewMovieDetail;
  if(!sb||typeof ov!=='function'||ov.__rfPreferredSourceBridge)return;
  const f=async function(slug,src){
   const source=src||window.currentSourceId||'kkphim';
   try{
    const r=await sb.from('roflix_movie_overrides').select('preferred_source_id,hidden').eq('source_id',source).eq('movie_slug',slug).maybeSingle();
    if(r.data?.hidden)return ov.apply(this,arguments);
    if(r.data?.preferred_source_id&&r.data.preferred_source_id!==source)return ov.call(this,slug,r.data.preferred_source_id);
   }catch(_){}
   return ov.apply(this,arguments);
  };
  f.__rfPreferredSourceBridge=true;window.viewMovieDetail=f;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{patch();setTimeout(patch,700)}, {once:true});else{patch();setTimeout(patch,700)}
})();
