/* RoFlix Anime Player 2.0
 * AniMapper registry -> multiple providers -> playable source.
 * Uses provider/source URLs returned by the public API. No proxy/bypass layer.
 */
(function(){'use strict';
if(window.__ROFLIX_ANIME_PLAYER__)return;window.__ROFLIX_ANIME_PLAYER__=true;
const API='/api/animapper?path=';
const PROVIDER_PRIORITY=['ANIMEVIETSUB','NINIYO','ANIMETVN'];
const sourceCache=new Map(),mediaCache=new Map(),episodeCache=new Map();
let hlsInstance=null,embedFrame=null,videoElement=null;

const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function api(p){const r=await fetch(API+encodeURIComponent(p),{headers:{Accept:'application/json','Cache-Control':'no-cache'},cache:'no-store'});if(!r.ok)throw Error('AniMapper '+r.status);return r.json();}
function arr(d,keys){
  if(Array.isArray(d))return d;
  for(const k of keys)if(Array.isArray(d?.[k]))return d[k];
  if(Array.isArray(d?.result?.episodes))return d.result.episodes;
  if(Array.isArray(d?.data?.episodes))return d.data.episodes;
  if(Array.isArray(d?.result))return d.result;
  if(Array.isArray(d?.data))return d.data;
  return[];
}
function val(o,keys){if(!o||typeof o!=='object')return'';for(const k of keys){const v=text(o[k]);if(v)return v;}return'';}
function match(q,i){
  q=norm(q);const ts=[i?.title?.userPreferred,i?.title?.english,i?.title?.romaji,i?.title?.native,i?.name,i?.origin_name,i?.title].map(norm).filter(Boolean);let best=0;
  for(const t of ts){if(q===t)best=Math.max(best,100);else if(q&&(q.includes(t)||t.includes(q)))best=Math.max(best,86);else{const a=new Set(q.split(' ')),b=new Set(t.split(' '));let n=0;a.forEach(w=>{if(w.length>1&&b.has(w))n++;});best=Math.max(best,Math.min(78,n*13));}}
  return best;
}
function sourceUrl(d){
  const fields=['url','embed','embedUrl','embed_url','link','src'];
  for(const obj of [d,d?.data,d?.result]){const u=val(obj,fields);if(/^https?:\/\//i.test(u))return u;}
  return '';
}
function providerKey(p){
  return text(p?.provider||p?.id||p?.slug||p?.name).toUpperCase().replace(/[^A-Z0-9]+/g,'');
}
function normalizeProviders(m){
  const raw=m?.providers||m?.streamingProviders||m?.result?.providers||m?.result?.streamingProviders||m?.data?.providers||m?.data?.streamingProviders||{};
  if(Array.isArray(raw))return raw;
  return Object.entries(raw||{}).map(([key,value])=>typeof value==='object'?{...value,provider:value.provider||key,id:value.id||key,name:value.name||key}:{provider:key,id:key,name:key});
}
function providerScore(p){
  const k=providerKey(p);
  const i=PROVIDER_PRIORITY.indexOf(k);
  return i<0?50:100-i*10;
}
async function findMedia(title){
  const key=norm(title);if(mediaCache.has(key))return mediaCache.get(key);
  const d=await api('/search?title='+encodeURIComponent(title)+'&mediaType=ANIME&limit=10');
  const rs=arr(d,['results','items','media']);
  const best=rs.map(i=>({i,s:match(title,i)})).sort((a,b)=>b.s-a.s)[0];
  if(!best||best.s<60)throw Error('Không khớp anime trên AniMapper');
  let id=val(best.i,['id','mediaId','aniId','anilistId','malId']);
  let metadata=null;
  try{metadata=await api('/metadata?id='+encodeURIComponent(id));}catch(_){}
  let providers=normalizeProviders(metadata);
  providers=providers.sort((a,b)=>providerScore(b)-providerScore(a));
  const result={id,metadata,providers};
  mediaCache.set(key,result);return result;
}
function providerId(p){return val(p,['mediaId','id','providerId','slug'])||providerKey(p);}
async function loadEpisodes(mediaId,provider){
  const pk=providerKey(provider)||text(provider);
  const key=mediaId+':'+pk;if(episodeCache.has(key))return episodeCache.get(key);
  // AniMapper expects the media ID returned by /search, not a provider object's internal ID.
  const id=mediaId;
  const d=await api('/stream/episodes?id='+encodeURIComponent(id)+'&provider='+encodeURIComponent(pk));
  const es=arr(d,['episodes','results','items']);
  if(!es.length)throw Error('Provider '+pk+' không có tập');
  const value={provider:pk,mediaId:id,episodes:es};episodeCache.set(key,value);return value;
}
function episodeId(e){return val(e,['episodeId','episode_id','id','numberId','episodeData']);}
function episodeName(e,i){return val(e,['number','episodeNumber','episode','title','name'])||String(i+1);}
async function resolveEpisode(providerMediaId,provider,e,i){
  const pk=providerKey(provider)||text(provider),raw=episodeId(e);if(!raw)throw Error('Tập không có episodeId');
  // AniMapper returns provider-specific episodeId formats. Use it verbatim.
  const ed=raw;
  const key=pk+':'+ed;if(sourceCache.has(key))return sourceCache.get(key);

  // AnimeVietSub: DU = HLS cần CORS/Referer proxy; HDX = embed không cần proxy.
  // Browser không thể tự thêm Referer tùy ý, vì vậy không chờ DU rồi mới thử HDX.
  const reported=text(e?.server||e?.serverName||e?.sourceServer).toUpperCase();
  const servers=['HDX'];
  if(reported && reported!=='UNKNOWN' && reported!=='DU' && reported!=='HDX')servers.push(reported);

  let last=null;
  for(const server of servers){
    try{
      const d=await api('/stream/source?episodeData='+encodeURIComponent(ed)+'&provider='+encodeURIComponent(pk)+'&server='+encodeURIComponent(server));
      const u=sourceUrl(d);
      const type=text(d?.type||d?.data?.type||d?.result?.type).toUpperCase()||'EMBED';
      if(d?.corsProxyRequired&&type==='HLS'){last=Error('HLS yêu cầu proxy CORS');continue;}
      if(u){
        const r={url:u,type,server:text(d?.server||d?.data?.server||d?.result?.server)||server,provider:pk,episodeData:ed,index:i};
        sourceCache.set(key,r);return r;
      }
      last=Error('AniMapper không trả URL cho server '+server);
    }catch(err){last=err;}
  }

  // Không gọi endpoint không có server: AniMapper mặc định DU và DU cần proxy.
  throw last||Error('Không tìm thấy nguồn phát khả dụng');
}
function cleanup(){if(hlsInstance){try{hlsInstance.destroy();}catch(_){}hlsInstance=null;}if(videoElement){try{videoElement.pause();videoElement.removeAttribute('src');videoElement.load();}catch(_){}videoElement.remove();videoElement=null;}if(embedFrame){embedFrame.remove();embedFrame=null;}const p=document.getElementById('movie-player');if(p){p.style.display='';p.src='';}}
function fullscreen(){
  const target=videoElement||embedFrame||document.getElementById('movie-player');
  try{if(target?.requestFullscreen)return target.requestFullscreen();if(target?.webkitRequestFullscreen)return target.webkitRequestFullscreen();}catch(_){}
}
async function mount(url,title,type){
  const p=document.getElementById('movie-player');if(!p)throw Error('Không tìm thấy movie-player');cleanup();
  const upper=String(type||'').toUpperCase();
  const isHls=/\.m3u8(?:[?#]|$)/i.test(url)||upper==='HLS';
  const isVideo=isHls||/\.(mp4|webm|ogg)(?:[?#]|$)/i.test(url)||['MP4','VIDEO'].includes(upper);
  if(isVideo){
    const parent=p.parentElement;if(!parent)throw Error('Không có vùng player');
    videoElement=document.createElement('video');videoElement.id='rf-anime-video';videoElement.controls=true;videoElement.playsInline=true;videoElement.autoplay=true;videoElement.setAttribute('aria-label',title||'RoFlix Anime Player');videoElement.style.cssText='width:100%;height:100%;min-height:420px;display:block;background:#000;';p.style.display='none';parent.appendChild(videoElement);
    if(isHls&&!videoElement.canPlayType('application/vnd.apple.mpegurl')){
      if(!window.Hls){const hs=document.createElement('script');hs.id='rf-hls-js';hs.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';await new Promise((resolve,reject)=>{hs.onload=resolve;hs.onerror=()=>reject(Error('Không tải được HLS player'));document.head.appendChild(hs);});}
      if(!window.Hls||!window.Hls.isSupported())throw Error('Trình duyệt không hỗ trợ HLS');
      hlsInstance=new window.Hls({enableWorker:true,lowLatencyMode:false});hlsInstance.loadSource(url);hlsInstance.attachMedia(videoElement);
    }else{videoElement.src=url;}
    try{await videoElement.play();}catch(_){}
    return;
  }
  p.src=url;p.allow='autoplay; fullscreen; picture-in-picture';p.allowFullscreen=true;
}
async function prepare(item){
  const title=text(item?.name||item?.origin_name||item?.slug),media=await findMedia(title);
  const usable=[];
  for(const p of media.providers||[]){
    const pk=providerKey(p);if(!pk)continue;
    try{const ep=await loadEpisodes(media.id,p);usable.push(ep);}catch(e){console.warn('[RoFlix Anime] provider failed',pk,e);}
  }
  if(!usable.length)throw Error('Không có provider nào có tập');
  const chosen=usable[0];
  window.__ROFLIX_ANIME_PROVIDER_POOL__=usable;
  currentEpisodeList=chosen.episodes.map((e,i)=>({name:episodeName(e,i),link:'',__rfAniMapper:{mediaId:chosen.mediaId,provider:chosen.provider,episode:e,index:i}}));
  currentMovieTitle=title;currentSlug=item?.slug||currentSlug;
  return {media,providers:usable,chosen};
}
async function play(item){
  try{
    const prepared=await prepare(item);if(!currentEpisodeList[0])throw Error('Không có tập');
    let selected=null,last=null;
    for(const candidate of prepared.providers||[]){
      try{
        const episode=candidate.episodes?.[0];
        if(!episode)continue;
        const resolved=await resolveEpisode(candidate.mediaId,candidate.provider,episode,0);
        selected={candidate,episode,resolved};break;
      }catch(e){last=e;console.warn('[RoFlix Anime] source failed',candidate.provider,e);}
    }
    if(!selected)throw last||Error('Không tìm thấy nguồn phát');
    const meta={mediaId:selected.candidate.mediaId,provider:selected.candidate.provider,episode:selected.episode,index:0};
    currentEpisodeList=selected.candidate.episodes.map((e,i)=>({name:episodeName(e,i),link:'',__rfAniMapper:{mediaId:selected.candidate.mediaId,provider:selected.candidate.provider,episode:e,index:i}}));
    currentEpisodeList[0].link=selected.resolved.url;
    window.__ROFLIX_ANIME_SELECTED_PROVIDER__=selected.candidate.provider;
    await playMovieByIndex(0);
  }catch(e){
    console.warn('[RoFlix Anime] multi-provider failed',e);
    if(typeof showToastPro==='function')showToastPro('warning','Anime chưa phát được','Không tìm thấy nguồn phát khả dụng.');
    if(item?._src&&item._src!=='anilist'&&typeof playMovie==='function')return playMovie(item.slug,item._src);
  }
}
window.roflixAnimePlayer={play,prepareEpisodeList:prepare,resolveEpisode,mount,stop:cleanup,findMedia,fullscreen};
})();