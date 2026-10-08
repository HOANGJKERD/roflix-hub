// ============================================================
// AniMapper — nút nguồn bên cạnh KKPhim / VSMOV / VidSrc
// Mở catalog anime (AniList) và phát bằng API công khai AniMapper.
// Không proxy, không đổi catalog KKPhim/VSMOV.
// Docs: https://animapper.net/docs/tutorial
// ============================================================
(function (w) {
  'use strict';

  function injectSourcePill() {
    var box = document.getElementById('source-switch');
    if (!box) return;
    if (box.querySelector('[data-source="animapper"]')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'source-pill';
    btn.dataset.source = 'animapper';
    btn.textContent = 'AniMapper';
    btn.onclick = function () {
      if (typeof w.switchSource === 'function') w.switchSource('animapper');
      else openAniMapper();
    };

    var vidsrc = box.querySelector('[data-source="vidsrc"]');
    var note = document.getElementById('source-note');
    if (vidsrc && vidsrc.nextSibling) {
      box.insertBefore(btn, vidsrc.nextSibling);
    } else if (note && note.parentNode === box) {
      box.insertBefore(btn, note);
    } else {
      box.appendChild(btn);
    }
  }

  function loadScript(id, src) {
    return new Promise(function (resolve, reject) {
      var existing = document.getElementById(id);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error(src)); }, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.async = false;
      s.onload = function () { s.dataset.loaded = '1'; resolve(); };
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function ensureAnimeStack() {
    if (w.roflixAnime && w.roflixAnimePlayer) return Promise.resolve();
    return loadScript('rf-anime-player-script', 'js/features/anime-player.js?v=20261007-5')
      .then(function () {
        return loadScript('rf-anime-catalog-script', 'js/features/anime-hub.js?v=20261007-9');
      });
  }

  function openAniMapper() {
    ensureAnimeStack().then(function () {
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (w.roflixAnime && typeof w.roflixAnime.open === 'function') {
          clearInterval(timer);
          w.roflixAnime.open(1);
          return;
        }
        if (tries > 20) {
          clearInterval(timer);
          if (typeof showToast === 'function') {
            showToast('error', 'AniMapper', 'Chưa tải được catalog anime.');
          }
        }
      }, 150);
    }).catch(function () {
      if (typeof showToast === 'function') {
        showToast('error', 'AniMapper', 'Không tải được script anime.');
      }
    });
  }

  function boot() { injectSourcePill(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(injectSourcePill, 900);
  setTimeout(injectSourcePill, 2200);

  w.RoflixAniMapper = {
    open: openAniMapper,
    injectSourcePill: injectSourcePill
  };
})(window);
