(() => {
'use strict';
const STREAMS = [{id:'vcdn-720p',label:'VCDN · HLS 720p',url:'https://pzhgifbkllliv.vcdn.cloud/1793516416_hd/1793516416_hd@720p.m3u8'}];
const video=document.getElementById('rb-live-video'),status=document.getElementById('rb-player-status'),overlay=document.getElementById('rb-video-overlay'),overlayText=document.getElementById('rb-video-overlay-text'),quality=document.getElementById('rb-quality-select'),qualityBadge=document.getElementById('rb-video-quality'),reload=document.getElementById('rb-reload'),sourceName=document.getElementById('rb-source-name'),openSource=document.getElementById('rb-open-source');
if(!video||!status)return;
let hls=null,currentStream=STREAMS[0],fatalRecoveries=0;
function setStatus(message,state){status.textContent=message;status.dataset.state=state||'info';if(overlayText)overlayText.textContent=message;}
function destroyHls(){if(hls){hls.destroy();hls=null;}video.pause();video.removeAttribute('src');video.load();quality.innerHTML='<option value="-1">Tự động</option>';quality.disabled=true;qualityBadge.textContent='AUTO';}
function showError(message){setStatus(message,'error');if(overlay)overlay.hidden=false;}
function attachStream(stream){
 destroyHls();currentStream=stream;fatalRecoveries=0;sourceName.textContent=stream.label;openSource.href=stream.url;if(overlay)overlay.hidden=false;setStatus('Đang kết nối máy chủ phát...','loading');
 if(window.Hls&&window.Hls.isSupported()){
  hls=new window.Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:30,liveSyncDurationCount:3,manifestLoadingTimeOut:15000,levelLoadingTimeOut:15000,fragLoadingTimeOut:20000,manifestLoadingMaxRetry:2,levelLoadingMaxRetry:2,fragLoadingMaxRetry:2});
  hls.on(window.Hls.Events.MEDIA_ATTACHED,()=>hls.loadSource(stream.url));
  hls.on(window.Hls.Events.MANIFEST_PARSED,(_event,data)=>{quality.innerHTML='<option value="-1">Tự động</option>';(data.levels||[]).forEach((level,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=level.height?level.height+'p':Math.round((level.bitrate||0)/1000)+' kbps';quality.appendChild(option);});quality.disabled=!(data.levels&&data.levels.length>1);setStatus('Đã tải playlist. Nhấn Phát để xem trực tiếp.','ready');});
  hls.on(window.Hls.Events.LEVEL_SWITCHED,(_event,data)=>{const level=hls.levels[data.level];qualityBadge.textContent=level&&level.height?level.height+'p':'AUTO';});
  hls.on(window.Hls.Events.ERROR,(_event,data)=>{if(!data||!data.fatal)return;if(data.type===window.Hls.ErrorTypes.NETWORK_ERROR&&fatalRecoveries<2){fatalRecoveries++;setStatus('Mất kết nối. Đang thử kết nối lại ('+fatalRecoveries+'/2)...','loading');hls.startLoad();}else if(data.type===window.Hls.ErrorTypes.MEDIA_ERROR&&fatalRecoveries<2){fatalRecoveries++;setStatus('Đang khôi phục bộ giải mã video...','loading');hls.recoverMediaError();}else{const detail=String(data.details||'Lỗi HLS');showError(/manifest|network|xhr|fetch/i.test(detail)?'Không tải được playlist/segment. Kiểm tra URL, máy chủ nguồn và CORS.':'Nguồn phát không tương thích hoặc đã ngừng: '+detail);}});
  hls.attachMedia(video);return;
 }
 if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=stream.url;video.addEventListener('loadedmetadata',()=>setStatus('Nguồn HLS đã sẵn sàng. Nhấn Phát để xem.','ready'),{once:true});video.addEventListener('error',()=>showError('Trình duyệt không tải được nguồn HLS. Có thể URL đã hết hạn hoặc máy chủ từ chối truy cập.'),{once:true});return;}
 showError('Trình duyệt này không hỗ trợ HLS. Hãy thử Chrome, Firefox hoặc Safari phiên bản mới.');
}
video.addEventListener('playing',()=>{setStatus('Đang phát trực tiếp.','playing');if(overlay)overlay.hidden=true;});
video.addEventListener('waiting',()=>setStatus('Đang tải dữ liệu video...','loading'));
video.addEventListener('pause',()=>{if(!video.ended&&video.currentTime>0)setStatus('Video đang tạm dừng.','paused');});
video.addEventListener('error',()=>{if(video.error)showError('Lỗi video ('+video.error.code+'). Nguồn có thể chặn nhúng hoặc không còn khả dụng.');});
quality.addEventListener('change',()=>{if(hls)hls.currentLevel=Number(quality.value);});
reload.addEventListener('click',()=>attachStream(currentStream));
attachStream(currentStream);
})();