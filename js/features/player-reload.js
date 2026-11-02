/* RoFlix: reload only the active player, never the whole document. */
(function () {
  'use strict';

  function toast(type, title, message) {
    if (typeof window.showToastPro === 'function') window.showToastPro(type, title, message);
    else if (typeof window.showToast === 'function') window.showToast(type, title, message);
  }

  async function reloadPlayer(button) {
    if (button.dataset.busy === '1') return;
    button.dataset.busy = '1';
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Đang tải lại…';

    try {
      const episodes = Array.isArray(window.currentEpisodeList) ? window.currentEpisodeList : [];
      const index = Number.isInteger(window.__RF_LAST_EP_INDEX__) ? window.__RF_LAST_EP_INDEX__ : 0;
      const episode = episodes[index];

      // Anime provider: resolve the current episode again, then remount its player.
      if (episode && episode.__rfAniMapper && window.roflixAnimePlayer?.resolveEpisode && window.roflixAnimePlayer?.mount) {
        const meta = episode.__rfAniMapper;
        const source = await window.roflixAnimePlayer.resolveEpisode(
          meta.mediaId, meta.provider, meta.episode, meta.index
        );
        episode.link = source.url;
        episode.__rfAniSource = source;
        await window.roflixAnimePlayer.mount(source.url, window.currentMovieTitle || 'RoFlix', source.type);
      } else {
        const frame = document.getElementById('movie-player');
        const video = document.getElementById('rf-anime-video');
        if (video) {
          const currentSrc = video.currentSrc || video.src;
          if (!currentSrc) throw new Error('Không tìm thấy nguồn video hiện tại.');
          video.pause();
          video.src = currentSrc;
          video.load();
          try { await video.play(); } catch (_) {}
        } else if (frame) {
          const currentSrc = frame.getAttribute('src') || frame.src;
          if (!currentSrc || currentSrc === 'about:blank') throw new Error('Trình phát chưa có nguồn để tải lại.');
          // Reassigning src reloads only this iframe. Keep sandbox/allow/referrer settings intact.
          frame.src = 'about:blank';
          requestAnimationFrame(() => { frame.src = currentSrc; });
        } else {
          throw new Error('Không tìm thấy trình phát hiện tại.');
        }
      }
      toast('success', 'Trình phát', 'Đã gửi yêu cầu tải lại trình phát hiện tại.');
    } catch (error) {
      console.warn('[RoFlix player reload]', error);
      toast('error', 'Không tải lại được', error?.message || 'Nguồn phát hiện tại không thể tải lại.');
    } finally {
      button.dataset.busy = '0';
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function installButton() {
    const frame = document.getElementById('movie-player');
    if (!frame || !frame.parentElement || document.getElementById('rf-reload-player')) return;
    const holder = frame.parentElement;
    if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';

    const button = document.createElement('button');
    button.id = 'rf-reload-player';
    button.type = 'button';
    button.textContent = '↻ Tải lại trình phát';
    button.title = 'Chỉ tải lại video/iframe hiện tại, không tải lại trang';
    button.setAttribute('aria-label', 'Tải lại trình phát hiện tại');
    button.style.cssText = [
      'position:absolute','right:12px','bottom:12px','z-index:30',
      'display:inline-flex','align-items:center','gap:7px',
      'padding:9px 13px','border:1px solid rgba(245,158,11,.55)',
      'border-radius:10px','background:rgba(12,14,22,.88)',
      'color:#fbbf24','font:700 12px/1.2 system-ui,sans-serif',
      'box-shadow:0 5px 20px rgba(0,0,0,.35)','backdrop-filter:blur(8px)',
      'cursor:pointer','transition:opacity .2s'
    ].join(';');
    button.addEventListener('click', () => reloadPlayer(button));
    holder.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installButton, { once: true });
  } else {
    installButton();
  }
})();
