/* Cloud snapshot -> local UI cache. Cloud remains authoritative for signed-in accounts. */
(function(){
 'use strict';
 function hydrate(e){const s=e?.detail;if(!s)return;try{
  const p=s.profile||{};const pd=p.profile_data||{};const profile={name:p.display_name||pd.name||'Người dùng',avatar:p.avatar_url||pd.avatar||'default',bio:p.bio||pd.bio||'',banner:p.banner_url||pd.banner||'default',country:p.country||pd.country||'Việt Nam',favoriteMovie:pd.favoriteMovie||'',birthday:pd.birthday||'',joinDate:pd.joinDate||p.created_at||new Date().toISOString().slice(0,10)};localStorage.setItem('roflix-profile',JSON.stringify(profile));
  const g=s.game||{};localStorage.setItem('roflix-level',JSON.stringify({level:Number(g.level||1),exp:Number(g.exp||0)}));if(Number.isFinite(Number(g.gems)))localStorage.setItem('roflix-gem',String(Math.max(0,Number(g.gems))));
  if(Number.isFinite(Number(g.comments_count))||Number.isFinite(Number(g.episodes_watched)))localStorage.setItem('roflix-stats',JSON.stringify({totalEpisodesWatched:Number(g.episodes_watched||0),totalMoviesWatched:Number(g.movies_watched||0),totalFavorites:Number(g.favorites_count||0),totalComments:Number(g.comments_count||0),totalGemEarned:Number(g.gems_earned||0),mostWatchedMovie:null,favoriteGenre:null,watchTime:Number(g.watch_minutes||0)}));
  if(Array.isArray(s.gacha))localStorage.setItem('roflix-cards',JSON.stringify(s.gacha.map(c=>({...c,baseId:c.card_key,id:c.card_key,obtainedAt:c.obtained_at}))));
  window.updateProfileUI?.();window.renderProfile?.();window.renderCollection?.();
 }catch(err){console.debug('[RoFlix Cloud Hydrate]',err)}}
 window.addEventListener('roflix:cloud-sync',hydrate);
})();
