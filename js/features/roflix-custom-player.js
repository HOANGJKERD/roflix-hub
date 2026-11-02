/* RoFlix Multi-Source Player UI
 * Native HLS/MP4 controls + safe iframe shell.
 * Cross-origin iframe internals are intentionally not accessed.
 */
(function (w, d) {
  'use strict';
  const state = { video: null, frame: null, stage: null, controls: null, theater: false, autoNext: true };
  const $ = (id) => d.getElementById(id);
  const fmt = (n) => {
    if (!Number.isFinite(n) || n < 0) return '0:00';
    const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = Math.floor(n % 60);
    return h ? h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') : m + ':' + String(s).padStart(2,'0');
  };
  function stageFor(el) {
    return el && (el.closest('.rf-player-stage') || el.parentElement);
  }
  function buildVideoControls(video) {
    const stage = stageFor(video);
    if (!stage) return;
    const old = stage.querySelector('.rf-custom-controls');
    if (old) old.remove();
    stage.classList.add('rf-native-player-stage');
    const ui = d.createElement('div');
    ui.className = 'rf-custom-controls';
    ui.innerHTML = `
      <div class="rf-control-top"><span class="rf-live-label"><i></i> ROFLIX PLAYER</span><span class="rf-control-status" data-status>Đang tải video</span></div>
      <input class="rf-progress" data-progress type="range" min="0" max="1000" value="0" aria-label="Tiến trình video">
      <div class="rf-control-row">
        <div class="rf-control-group">
          <button type="button" data-action="back" title="Tua lùi 10 giây">↶10</button>
          <button type="button" data-action="play" title="Phát / tạm dừng">▶</button>
          <button type="button" data-action="forward" title="Tua tới 10 giây">10↷</button>
          <span class="rf-time"><span data-current>0:00</span> / <span data-duration>0:00</span></span>
        </div>
        <div class="rf-control-group">
          <button type="button" data-action="mute" title="Bật/tắt âm thanh">Âm thanh</button>
          <input class="rf-volume" data-volume type="range" min="0" max="1" step="0.05" value="1" aria-label="Âm lượng">
          <select data-speed aria-label="Tốc độ phát"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="1.75">1.75x</option><option value="2">2x</option></select>
          <button type="button" data-action="pip" title="Hình trong hình">PiP</button>
          <button type="button" data-action="theater" title="Chế độ rạp">Rạp</button>
          <button type="button" data-action="fullscreen" title="Toàn màn hình">⛶</button>
        </div>
      </div>
      <div class="rf-control-bottom"><label><input type="checkbox" data-autonext checked> Tự chuyển tập</label><span>Phím tắt: Space · ←/→ · M · F</span></div>`;
    stage.appendChild(ui);
    state.video = video; state.stage = stage; state.controls = ui;
    video.controls = false;
    const q = (s) => ui.querySelector(s);
    const progress = q('[data-progress]');
    const playBtn = q('[data-action="play"]');
    function sync() {
      if (!video.duration || !Number.isFinite(video.duration)) return;
      progress.value = String(Math.round(video.currentTime / video.duration * 1000));
      q('[data-current]').textContent = fmt(video.currentTime);
      q('[data-duration]').textContent = fmt(video.duration);
    }
    function togglePlay() { if (video.paused) video.play().catch(()=>{}); else video.pause(); }
    q('[data-action="play"]').addEventListener('click', togglePlay);
    q('[data-action="back"]').addEventListener('click', () => video.currentTime = Math.max(0, video.currentTime - 10));
    q('[data-action="forward"]').addEventListener('click', () => video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10));
    q('[data-action="mute"]').addEventListener('click', () => { video.muted = !video.muted; q('[data-action="mute"]').textContent = video.muted ? 'Đã tắt tiếng' : 'Âm thanh'; });
    q('[data-volume]').addEventListener('input', e => { video.volume = Number(e.target.value); video.muted = video.volume === 0; });
    q('[data-speed]').addEventListener('change', e => { video.playbackRate = Number(e.target.value); });
    progress.addEventListener('input', () => { if (video.duration) video.currentTime = Number(progress.value) / 1000 * video.duration; });
    q('[data-action="pip"]').addEventListener('click', async () => {
      try { if (d.pictureInPictureElement) await d.exitPictureInPicture(); else if (video.requestPictureInPicture) await video.requestPictureInPicture(); }
      catch (_) { status('Trình duyệt không hỗ trợ PiP cho nguồn này'); }
    });
    q('[data-action="theater"]').addEventListener('click', () => {
      state.theater = !state.theater; stage.classList.toggle('rf-theater-mode', state.theater);
      q('[data-action="theater"]').classList.toggle('is-active', state.theater);
    });
    q('[data-action="fullscreen"]').addEventListener('click', () => {
      const target = stage;
      if (d.fullscreenElement) d.exitFullscreen?.(); else target.requestFullscreen?.();
    });
    video.addEventListener('timeupdate', sync);
    video.addEventListener('loadedmetadata', sync);
    video.addEventListener('play', () => { playBtn.textContent = 'Ⅱ'; status('Đang phát'); });
    video.addEventListener('pause', () => { playBtn.textContent = '▶'; status('Đã tạm dừng'); });
    video.addEventListener('waiting', () => status('Đang tải dữ liệu…'));
    video.addEventListener('playing', () => status('Đang phát'));
    video.addEventListener('ended', () => {
      status('Đã hết tập');
      if (q('[data-autonext]').checked && typeof w.playMovieByIndex === 'function') {
        const next = (Number(w.__RF_LAST_EP_INDEX__) || 0) + 1;
        if (Array.isArray(w.currentEpisodeList) && next < w.currentEpisodeList.length) w.playMovieByIndex(next);
      }
    });
    q('[data-autonext]').addEventListener('change', e => { state.autoNext = e.target.checked; });
    function status(text) { q('[data-status]').textContent = text; }
    state.status = status;
    if (!stage.hasAttribute('tabindex')) stage.tabIndex = 0;
  }
  function mountFrame(frame) {
    state.frame = frame;
    const stage = stageFor(frame);
    if (!stage) return;
    stage.classList.add('rf-iframe-player-stage');
    let note = stage.querySelector('.rf-iframe-note');
    if (!note) {
      note = d.createElement('div'); note.className = 'rf-iframe-note';
      note.innerHTML = '<span>ROFLIX MULTI-SOURCE</span><small>Nguồn nhúng bên thứ ba · Điều khiển nội bộ tùy API nguồn</small>';
      stage.appendChild(note);
    }
  }
  function destroy() {
    if (state.controls) state.controls.remove();
    if (state.stage) state.stage.classList.remove('rf-native-player-stage','rf-iframe-player-stage','rf-theater-mode');
    if (state.stage) { const n=state.stage.querySelector('.rf-iframe-note'); if(n)n.remove(); }
    state.video=null; state.frame=null; state.stage=null; state.controls=null;
  }
  d.addEventListener('keydown', (e) => {
    if (!state.video || !state.stage || !state.stage.isConnected) return;
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (['input','textarea','select','button'].includes(tag) || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'Space') { e.preventDefault(); state.video.paused ? state.video.play().catch(()=>{}) : state.video.pause(); }
    else if (e.key === 'ArrowLeft') state.video.currentTime = Math.max(0,state.video.currentTime-5);
    else if (e.key === 'ArrowRight') state.video.currentTime = Math.min(state.video.duration||Infinity,state.video.currentTime+5);
    else if (e.key.toLowerCase() === 'm') state.video.muted = !state.video.muted;
    else if (e.key.toLowerCase() === 'f') { if(d.fullscreenElement)d.exitFullscreen?.();else state.stage.requestFullscreen?.(); }
  });
  w.RoFlixCustomPlayer = { mountVideo: buildVideoControls, mountFrame, destroy, getCapabilities: () => state.video ? ['play-pause','seek','volume','speed','pip','fullscreen','theater','auto-next'] : ['episode-switch','theater-shell','fullscreen-shell'] };
})(window, document);
