// ============================================================
// VidSrc — Full-page cinema player (embed)
// Mở trang phát full-screen, không popup tester
// Catalog KKPhim/VSMOV không đổi
// ============================================================
(function (w) {
  'use strict';

  var BASE = 'https://vidsrc.sh';

  function pickId(movie) {
    if (!movie) return null;
    return movie.imdbId || movie.tmdbId || movie.imdb_id || movie.tmdb_id || null;
  }

  function isTv(movie) {
    if (!movie) return false;
    if (movie.tmdbType === 'tv') return true;
    var t = String(movie.type || '').toLowerCase();
    if (t.indexOf('bộ') >= 0 || t.indexOf('hoạt') >= 0 || t === 'series' || t === 'tv') return true;
    return Number(movie.episode_total) > 1;
  }

  function buildEmbedUrlFromParts(type, id, season, episode) {
    if (!id) return null;
    id = String(id).trim();
    if (!id) return null;
    if (type === 'tv') {
      if (season != null && season !== '' && episode != null && episode !== '') {
        return BASE + '/embed/tv/' + encodeURIComponent(id) + '/' + Number(season) + '/' + Number(episode);
      }
      return BASE + '/embed/tv/' + encodeURIComponent(id);
    }
    return BASE + '/embed/movie/' + encodeURIComponent(id);
  }

  function buildEmbedUrl(movie, season, episode) {
    var id = pickId(movie);
    if (!id) return null;
    return buildEmbedUrlFromParts(isTv(movie) ? 'tv' : 'movie', id, season, episode);
  }

  function loadIntoPlayer(movie, season, episode) {
    var url = buildEmbedUrl(movie, season, episode);
    if (!url) return false;
    var player = document.getElementById('movie-player');
    if (!player) return false;
    try { if (w.roflixAnimePlayer && w.roflixAnimePlayer.stop) w.roflixAnimePlayer.stop(); } catch (_) {}
    player.src = url;
    return true;
  }

  function hasIds(movie) {
    return !!pickId(movie);
  }

  function injectSourcePill() {
    var box = document.getElementById('source-switch');
    if (!box) return;
    if (box.querySelector('[data-source="vidsrc"]')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'source-pill';
    btn.dataset.source = 'vidsrc';
    btn.textContent = 'VidSrc';
    btn.onclick = function () { openCinemaPage(); };

    var note = document.getElementById('source-note');
    if (note && note.parentNode === box) {
      box.insertBefore(btn, note);
    } else {
      box.appendChild(btn);
    }
  }

  function ensureCinemaStyles() {
    if (document.getElementById('rf-vidsrc-cinema-css')) return;
    var css = document.createElement('style');
    css.id = 'rf-vidsrc-cinema-css';
    css.textContent = [
      '#rf-vidsrc-cinema{position:fixed;inset:0;z-index:10000;background:#05060a;color:#fff;display:flex;flex-direction:column;overflow:auto;}',
      '#rf-vidsrc-cinema .rf-vs-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;background:linear-gradient(180deg,rgba(5,6,10,.96),rgba(5,6,10,.72) 80%,transparent);}',
      '#rf-vidsrc-cinema .rf-vs-back{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;border:1px solid #2a2d3a;background:#12141c;color:#eee;font-size:13px;font-weight:700;cursor:pointer;}',
      '#rf-vidsrc-cinema .rf-vs-back:hover{border-color:#f59e0b;color:#fbbf24;}',
      '#rf-vidsrc-cinema .rf-vs-brand{font-size:18px;font-weight:900;letter-spacing:.04em;}',
      '#rf-vidsrc-cinema .rf-vs-brand span{background:linear-gradient(90deg,#f59e0b,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent;}',
      '#rf-vidsrc-cinema .rf-vs-fs{padding:8px 14px;border-radius:12px;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.08);color:#fbbf24;font-size:12px;font-weight:800;cursor:pointer;}',
      '#rf-vidsrc-cinema .rf-vs-main{flex:1;width:100%;max-width:1280px;margin:0 auto;padding:8px 16px 40px;display:flex;flex-direction:column;gap:16px;}',
      '#rf-vidsrc-cinema .rf-vs-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;border:1px solid #1f2230;box-shadow:0 30px 80px rgba(0,0,0,.55);}',
      '#rf-vidsrc-cinema .rf-vs-stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;}',
      '#rf-vidsrc-cinema .rf-vs-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#6b7280;background:radial-gradient(ellipse at center,#111827 0%,#05060a 70%);}',
      '#rf-vidsrc-cinema .rf-vs-placeholder strong{color:#e5e7eb;font-size:18px;}',
      '#rf-vidsrc-cinema .rf-vs-meta{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px;}',
      '#rf-vidsrc-cinema .rf-vs-title{font-size:22px;font-weight:900;margin:0;}',
      '#rf-vidsrc-cinema .rf-vs-sub{margin:4px 0 0;font-size:13px;color:#9ca3af;}',
      '#rf-vidsrc-cinema .rf-vs-dock{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:16px;}',
      '@media(max-width:900px){#rf-vidsrc-cinema .rf-vs-dock{grid-template-columns:1fr;}}',
      '#rf-vidsrc-cinema .rf-vs-card{background:rgba(18,20,28,.9);border:1px solid #232636;border-radius:18px;padding:16px;}',
      '#rf-vidsrc-cinema .rf-vs-toggle{display:flex;gap:8px;margin-bottom:12px;}',
      '#rf-vidsrc-cinema .rf-vs-type{flex:1;padding:9px 10px;border-radius:999px;border:1px solid #333;background:#161822;color:#bbb;font-size:12px;font-weight:800;cursor:pointer;}',
      '#rf-vidsrc-cinema .rf-vs-type.active{background:linear-gradient(135deg,#f59e0b,#d97706);border-color:#f59e0b;color:#111;}',
      '#rf-vidsrc-cinema label{display:block;font-size:10px;letter-spacing:.06em;color:#9ca3af;margin:10px 0 5px;text-transform:uppercase;font-weight:700;}',
      '#rf-vidsrc-cinema input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1px solid #2a2d3a;background:#0b0d14;color:#eee;font-size:14px;}',
      '#rf-vidsrc-cinema input:focus{outline:none;border-color:#f59e0b;}',
      '#rf-vidsrc-cinema .rf-vs-hint{font-size:11px;margin-top:5px;color:#6b7280;min-height:16px;}',
      '#rf-vidsrc-cinema .rf-vs-hint.ok{color:#34d399;}',
      '#rf-vidsrc-cinema .rf-vs-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '#rf-vidsrc-cinema .rf-vs-load{width:100%;margin-top:14px;padding:13px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#a855f7);color:#111;font-weight:900;font-size:14px;cursor:pointer;}',
      '#rf-vidsrc-cinema .rf-vs-examples p{font-size:10px;color:#6b7280;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;}',
      '#rf-vidsrc-cinema .rf-vs-chips{display:flex;flex-wrap:wrap;gap:8px;}',
      '#rf-vidsrc-cinema .rf-vs-chip{padding:7px 12px;border-radius:999px;border:1px solid #333;background:#161822;color:#ddd;font-size:12px;font-weight:700;cursor:pointer;}',
      '#rf-vidsrc-cinema .rf-vs-chip:hover{border-color:#f59e0b;color:#fbbf24;}',
      '#rf-vidsrc-cinema .rf-vs-help{font-size:13px;line-height:1.6;color:#9ca3af;margin:0;}',
      'body.rf-vs-lock{overflow:hidden;}'
    ].join('');
    document.head.appendChild(css);
  }

  function closeCinemaPage() {
    var el = document.getElementById('rf-vidsrc-cinema');
    if (el) {
      var frame = document.getElementById('rf-vs-frame');
      if (frame) frame.src = '';
      el.remove();
    }
    document.body.classList.remove('rf-vs-lock');
  }

  function openCinemaPage(prefill) {
    ensureCinemaStyles();
    closeCinemaPage();

    var type = (prefill && prefill.type) || 'movie';
    var id = (prefill && prefill.id) || '';
    var season = (prefill && prefill.season) != null ? prefill.season : 1;
    var episode = (prefill && prefill.episode) != null ? prefill.episode : 1;
    var titlePrefill = (prefill && prefill.title) || '';

    if (!id && w.currentMovieData && pickId(w.currentMovieData)) {
      id = pickId(w.currentMovieData);
      type = isTv(w.currentMovieData) ? 'tv' : 'movie';
      titlePrefill = titlePrefill || w.currentMovieData.title || w.currentMovieTitle || '';
    }

    var page = document.createElement('div');
    page.id = 'rf-vidsrc-cinema';
    page.innerHTML =
      '<div class="rf-vs-top">' +
        '<button type="button" class="rf-vs-back" id="rf-vs-back">← Quay lại</button>' +
        '<div class="rf-vs-brand">Ro<span>Flix</span></div>' +
        '<button type="button" class="rf-vs-fs" id="rf-vs-fs">Toàn màn hình</button>' +
      '</div>' +
      '<div class="rf-vs-main">' +
        '<div class="rf-vs-stage">' +
          '<div class="rf-vs-placeholder" id="rf-vs-placeholder">' +
            '<strong>Đang chờ phát</strong>' +
            '<span>Nhập IMDb / TMDB rồi bấm Phát</span>' +
          '</div>' +
          '<iframe id="rf-vs-frame" src="" allowfullscreen allow="autoplay; fullscreen; encrypted-media" style="display:none"></iframe>' +
        '</div>' +
        '<div class="rf-vs-meta">' +
          '<div>' +
            '<h1 class="rf-vs-title" id="rf-vs-now-title">' + (titlePrefill ? escapeHtml(titlePrefill) : 'Đang phát') + '</h1>' +
            '<p class="rf-vs-sub" id="rf-vs-now-sub">Nhập mã phim để xem full HD</p>' +
          '</div>' +
        '</div>' +
        '<div class="rf-vs-dock">' +
          '<div class="rf-vs-card">' +
            '<div class="rf-vs-toggle">' +
              '<button type="button" class="rf-vs-type' + (type === 'movie' ? ' active' : '') + '" data-type="movie">Phim lẻ</button>' +
              '<button type="button" class="rf-vs-type' + (type === 'tv' ? ' active' : '') + '" data-type="tv">Phim bộ</button>' +
            '</div>' +
            '<label>IMDb hoặc TMDB</label>' +
            '<input type="text" id="rf-vs-id" placeholder="tt1300854 hoặc 385687" value="' + escapeAttr(id) + '" />' +
            '<div class="rf-vs-hint" id="rf-vs-id-hint"></div>' +
            '<div id="rf-vs-tv-fields" style="' + (type === 'tv' ? '' : 'display:none') + '">' +
              '<div class="rf-vs-row">' +
                '<div><label>Mùa</label><input type="number" id="rf-vs-season" min="1" value="' + season + '" /></div>' +
                '<div><label>Tập</label><input type="number" id="rf-vs-episode" min="1" value="' + episode + '" /></div>' +
              '</div>' +
            '</div>' +
            '<button type="button" class="rf-vs-load" id="rf-vs-load">Phát phim</button>' +
            '<div class="rf-vs-examples">' +
              '<p>Gợi ý nhanh</p>' +
              '<div class="rf-vs-chips">' +
                '<button type="button" class="rf-vs-chip" data-type="movie" data-id="tt1300854" data-title="Iron Man 3">Iron Man 3</button>' +
                '<button type="button" class="rf-vs-chip" data-type="movie" data-id="385687" data-title="Fast X">Fast X</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="tt0944947" data-s="1" data-e="1" data-title="Game of Thrones">GoT S1E1</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="66732" data-title="Stranger Things">Stranger Things</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="tt9522300" data-s="2" data-e="1" data-title="Kaguya-sama">Kaguya S2E1</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="rf-vs-card">' +
            '<p class="rf-vs-help">Nhập mã IMDb (<b>tt…</b>) hoặc TMDB (số). Phim bộ có thể chọn mùa/tập, hoặc để trống để mở bộ chọn tập có sẵn trong player. Chất lượng tối đa 1080p, phụ đề đa ngôn ngữ nằm trong menu của player.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(page);
    document.body.classList.add('rf-vs-lock');

    function currentType() {
      var a = page.querySelector('.rf-vs-type.active');
      return a ? a.getAttribute('data-type') : 'movie';
    }

    function updateIdHint() {
      var v = (document.getElementById('rf-vs-id').value || '').trim();
      var hint = document.getElementById('rf-vs-id-hint');
      if (!v) { hint.textContent = ''; hint.className = 'rf-vs-hint'; return; }
      if (/^tt\d+$/i.test(v)) {
        hint.textContent = '✓ IMDb';
        hint.className = 'rf-vs-hint ok';
      } else if (/^\d+$/.test(v)) {
        hint.textContent = '✓ TMDB';
        hint.className = 'rf-vs-hint ok';
      } else {
        hint.textContent = 'Dùng IMDb (tt…) hoặc TMDB (số)';
        hint.className = 'rf-vs-hint';
      }
    }

    function setNowPlaying(label) {
      var tEl = document.getElementById('rf-vs-now-title');
      var sEl = document.getElementById('rf-vs-now-sub');
      var t = currentType();
      var s = document.getElementById('rf-vs-season').value;
      var e = document.getElementById('rf-vs-episode').value;
      if (tEl) tEl.textContent = label || (t === 'tv' ? ('Phim bộ · S' + s + 'E' + e) : 'Phim lẻ');
      if (sEl) sEl.textContent = t === 'tv' ? ('Mùa ' + s + ' · Tập ' + e) : 'Đang phát';
    }

    function loadPlayer(label) {
      var t = currentType();
      var idVal = (document.getElementById('rf-vs-id').value || '').trim();
      if (!idVal) {
        if (typeof showToast === 'function') showToast('error', 'VidSrc', 'Nhập IMDb hoặc TMDB ID');
        return;
      }
      var s = document.getElementById('rf-vs-season').value;
      var e = document.getElementById('rf-vs-episode').value;
      var url = buildEmbedUrlFromParts(t, idVal, t === 'tv' ? s : null, t === 'tv' ? e : null);
      if (!url) return;

      var frame = document.getElementById('rf-vs-frame');
      var ph = document.getElementById('rf-vs-placeholder');
      frame.style.display = 'block';
      if (ph) ph.style.display = 'none';
      frame.src = url;
      setNowPlaying(label);
      try { frame.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
    }

    page.querySelectorAll('.rf-vs-type').forEach(function (b) {
      b.addEventListener('click', function () {
        page.querySelectorAll('.rf-vs-type').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        document.getElementById('rf-vs-tv-fields').style.display =
          b.getAttribute('data-type') === 'tv' ? '' : 'none';
      });
    });

    document.getElementById('rf-vs-id').addEventListener('input', updateIdHint);
    document.getElementById('rf-vs-load').addEventListener('click', function () { loadPlayer(); });
    document.getElementById('rf-vs-back').addEventListener('click', closeCinemaPage);
    document.getElementById('rf-vs-fs').addEventListener('click', function () {
      var stage = page.querySelector('.rf-vs-stage');
      if (!stage) return;
      if (stage.requestFullscreen) stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    });

    page.querySelectorAll('.rf-vs-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.getAttribute('data-type');
        var i = chip.getAttribute('data-id');
        page.querySelectorAll('.rf-vs-type').forEach(function (x) {
          x.classList.toggle('active', x.getAttribute('data-type') === t);
        });
        document.getElementById('rf-vs-tv-fields').style.display = t === 'tv' ? '' : 'none';
        document.getElementById('rf-vs-id').value = i;
        if (chip.getAttribute('data-s')) document.getElementById('rf-vs-season').value = chip.getAttribute('data-s');
        if (chip.getAttribute('data-e')) document.getElementById('rf-vs-episode').value = chip.getAttribute('data-e');
        updateIdHint();
        loadPlayer(chip.getAttribute('data-title') || chip.textContent);
      });
    });

    document.addEventListener('keydown', function onEsc(ev) {
      if (ev.key === 'Escape') {
        closeCinemaPage();
        document.removeEventListener('keydown', onEsc);
      }
    });

    updateIdHint();
    if (id) loadPlayer(titlePrefill);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function boot() {
    injectSourcePill();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(injectSourcePill, 800);
  setTimeout(injectSourcePill, 2000);

  w.RoflixVidSrc = {
    base: BASE,
    pickId: pickId,
    isTv: isTv,
    buildEmbedUrl: buildEmbedUrl,
    buildEmbedUrlFromParts: buildEmbedUrlFromParts,
    loadIntoPlayer: loadIntoPlayer,
    hasIds: hasIds,
    openTester: openCinemaPage,
    openCinema: openCinemaPage,
    injectSourcePill: injectSourcePill
  };

  console.log('[RoFlix] VidSrc cinema page ready');
})(window);
