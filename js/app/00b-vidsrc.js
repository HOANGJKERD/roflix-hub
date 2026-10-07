// ============================================================
// VidSrc — Source pill + Player Tester panel
// Giống https://vidsrc.sh/#tester
// Không thay catalog KKPhim/VSMOV; chỉ mở bảng điều khiển embed
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

  // ── Inject pill "VidSrc" vào #source-switch ──
  function injectSourcePill() {
    var box = document.getElementById('source-switch');
    if (!box) return;
    if (box.querySelector('[data-source="vidsrc"]')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'source-pill';
    btn.dataset.source = 'vidsrc';
    btn.textContent = 'VidSrc · tester';
    btn.onclick = function () {
      openTesterPanel();
    };

    var note = document.getElementById('source-note');
    if (note && note.parentNode === box) {
      box.insertBefore(btn, note);
    } else {
      box.appendChild(btn);
    }
  }

  // ── Tester panel UI ──
  function ensurePanelStyles() {
    if (document.getElementById('rf-vidsrc-tester-css')) return;
    var css = document.createElement('style');
    css.id = 'rf-vidsrc-tester-css';
    css.textContent = [
      '#rf-vidsrc-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;}',
      '#rf-vidsrc-panel{background:#12141c;border:1px solid #2a2d3a;border-radius:20px;max-width:960px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 25px 80px rgba(0,0,0,.5);}',
      '#rf-vidsrc-panel .rf-vs-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #2a2d3a;}',
      '#rf-vidsrc-panel .rf-vs-head h3{margin:0;font-size:1.1rem;font-weight:800;color:#fff;}',
      '#rf-vidsrc-panel .rf-vs-close{background:#1e2130;border:none;color:#aaa;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:1.2rem;}',
      '#rf-vidsrc-panel .rf-vs-body{display:grid;grid-template-columns:280px 1fr;gap:0;min-height:360px;}',
      '@media(max-width:720px){#rf-vidsrc-panel .rf-vs-body{grid-template-columns:1fr;}}',
      '#rf-vidsrc-panel .rf-vs-controls{padding:16px 18px;border-right:1px solid #2a2d3a;}',
      '@media(max-width:720px){#rf-vidsrc-panel .rf-vs-controls{border-right:none;border-bottom:1px solid #2a2d3a;}}',
      '#rf-vidsrc-panel .rf-vs-toggle{display:flex;gap:6px;margin-bottom:14px;}',
      '#rf-vidsrc-panel .rf-vs-type{flex:1;padding:8px 10px;border-radius:999px;border:1px solid #333;background:#1a1d28;color:#bbb;font-size:12px;font-weight:700;cursor:pointer;}',
      '#rf-vidsrc-panel .rf-vs-type.active{background:#6d5efc;border-color:#6d5efc;color:#fff;}',
      '#rf-vidsrc-panel label{display:block;font-size:10px;letter-spacing:.04em;color:#888;margin:10px 0 4px;text-transform:uppercase;}',
      '#rf-vidsrc-panel input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #333;background:#0d0f16;color:#eee;font-size:13px;}',
      '#rf-vidsrc-panel .rf-vs-hint{font-size:11px;margin-top:4px;color:#6b7280;}',
      '#rf-vidsrc-panel .rf-vs-hint.ok{color:#34d399;}',
      '#rf-vidsrc-panel .rf-vs-load{width:100%;margin-top:14px;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#7c6cff,#5b4df0);color:#fff;font-weight:800;font-size:13px;cursor:pointer;}',
      '#rf-vidsrc-panel .rf-vs-examples{margin-top:14px;}',
      '#rf-vidsrc-panel .rf-vs-examples p{font-size:10px;color:#666;margin:0 0 6px;text-transform:uppercase;}',
      '#rf-vidsrc-panel .rf-vs-chips{display:flex;flex-wrap:wrap;gap:6px;}',
      '#rf-vidsrc-panel .rf-vs-chip{padding:6px 10px;border-radius:999px;border:1px solid #333;background:#1a1d28;color:#ccc;font-size:11px;cursor:pointer;}',
      '#rf-vidsrc-panel .rf-vs-preview{padding:12px;background:#0a0b10;}',
      '#rf-vidsrc-panel .rf-vs-frame-wrap{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;border:1px solid #222;}',
      '#rf-vidsrc-panel .rf-vs-frame-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}',
      '#rf-vidsrc-panel .rf-vs-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#555;font-size:13px;}'
    ].join('');
    document.head.appendChild(css);
  }

  function openTesterPanel(prefill) {
    ensurePanelStyles();
    var existing = document.getElementById('rf-vidsrc-overlay');
    if (existing) existing.remove();

    var type = (prefill && prefill.type) || 'movie';
    var id = (prefill && prefill.id) || '';
    var season = (prefill && prefill.season) != null ? prefill.season : 1;
    var episode = (prefill && prefill.episode) != null ? prefill.episode : 1;

    // Prefill từ phim đang xem nếu có
    if (!id && w.currentMovieData && pickId(w.currentMovieData)) {
      id = pickId(w.currentMovieData);
      type = isTv(w.currentMovieData) ? 'tv' : 'movie';
    }

    var overlay = document.createElement('div');
    overlay.id = 'rf-vidsrc-overlay';
    overlay.innerHTML =
      '<div id="rf-vidsrc-panel" role="dialog" aria-modal="true">' +
        '<div class="rf-vs-head">' +
          '<h3>▶ VidSrc Player Tester</h3>' +
          '<button type="button" class="rf-vs-close" id="rf-vs-close" aria-label="Đóng">×</button>' +
        '</div>' +
        '<div class="rf-vs-body">' +
          '<div class="rf-vs-controls">' +
            '<div class="rf-vs-toggle">' +
              '<button type="button" class="rf-vs-type' + (type === 'movie' ? ' active' : '') + '" data-type="movie">Bộ phim</button>' +
              '<button type="button" class="rf-vs-type' + (type === 'tv' ? ' active' : '') + '" data-type="tv">Chương trình truyền hình</button>' +
            '</div>' +
            '<label>Mã định danh IMDb hoặc TMDB</label>' +
            '<input type="text" id="rf-vs-id" placeholder="tt1300854 hoặc 385687" value="' + String(id).replace(/"/g, '"') + '" />' +
            '<div class="rf-vs-hint" id="rf-vs-id-hint"></div>' +
            '<div id="rf-vs-tv-fields" style="' + (type === 'tv' ? '' : 'display:none') + '">' +
              '<label>Mùa</label>' +
              '<input type="number" id="rf-vs-season" min="1" value="' + season + '" />' +
              '<label>Tập phim</label>' +
              '<input type="number" id="rf-vs-episode" min="1" value="' + episode + '" />' +
            '</div>' +
            '<button type="button" class="rf-vs-load" id="rf-vs-load">▶ Tải trình phát</button>' +
            '<div class="rf-vs-examples">' +
              '<p>Ví dụ nhanh:</p>' +
              '<div class="rf-vs-chips">' +
                '<button type="button" class="rf-vs-chip" data-type="movie" data-id="tt1300854">Iron Man 3</button>' +
                '<button type="button" class="rf-vs-chip" data-type="movie" data-id="385687">Fast X</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="tt0944947" data-s="1" data-e="1">GoT S1E1</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="66732">Stranger Things</button>' +
                '<button type="button" class="rf-vs-chip" data-type="tv" data-id="tt9522300" data-s="2" data-e="1">Kaguya S2E1</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="rf-vs-preview">' +
            '<div class="rf-vs-frame-wrap">' +
              '<div class="rf-vs-placeholder" id="rf-vs-placeholder">Nhập ID và bấm <strong>Tải trình phát</strong></div>' +
              '<iframe id="rf-vs-frame" src="" allowfullscreen allow="autoplay; fullscreen; encrypted-media" style="display:none"></iframe>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function currentType() {
      var a = overlay.querySelector('.rf-vs-type.active');
      return a ? a.getAttribute('data-type') : 'movie';
    }

    function updateIdHint() {
      var v = (document.getElementById('rf-vs-id').value || '').trim();
      var hint = document.getElementById('rf-vs-id-hint');
      if (!v) { hint.textContent = ''; hint.className = 'rf-vs-hint'; return; }
      if (/^tt\d+$/i.test(v)) {
        hint.textContent = '✓ Đã phát hiện ID IMDb';
        hint.className = 'rf-vs-hint ok';
      } else if (/^\d+$/.test(v)) {
        hint.textContent = '✓ Đã phát hiện ID TMDB';
        hint.className = 'rf-vs-hint ok';
      } else {
        hint.textContent = 'Nhập IMDb (tt…) hoặc TMDB (số)';
        hint.className = 'rf-vs-hint';
      }
    }

    function loadPlayer() {
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
    }

    overlay.querySelectorAll('.rf-vs-type').forEach(function (b) {
      b.addEventListener('click', function () {
        overlay.querySelectorAll('.rf-vs-type').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var tvFields = document.getElementById('rf-vs-tv-fields');
        tvFields.style.display = b.getAttribute('data-type') === 'tv' ? '' : 'none';
      });
    });

    document.getElementById('rf-vs-id').addEventListener('input', updateIdHint);
    document.getElementById('rf-vs-load').addEventListener('click', loadPlayer);
    document.getElementById('rf-vs-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) overlay.remove();
    });

    overlay.querySelectorAll('.rf-vs-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.getAttribute('data-type');
        var i = chip.getAttribute('data-id');
        overlay.querySelectorAll('.rf-vs-type').forEach(function (x) {
          x.classList.toggle('active', x.getAttribute('data-type') === t);
        });
        document.getElementById('rf-vs-tv-fields').style.display = t === 'tv' ? '' : 'none';
        document.getElementById('rf-vs-id').value = i;
        if (chip.getAttribute('data-s')) document.getElementById('rf-vs-season').value = chip.getAttribute('data-s');
        if (chip.getAttribute('data-e')) document.getElementById('rf-vs-episode').value = chip.getAttribute('data-e');
        updateIdHint();
        loadPlayer();
      });
    });

    updateIdHint();
    if (id) loadPlayer();
  }

  // Boot: inject pill + ensure loaded with source UI
  function boot() {
    injectSourcePill();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // Retry vài lần nếu source-switch render muộn
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
    openTester: openTesterPanel,
    injectSourcePill: injectSourcePill
  };

  console.log('[RoFlix] VidSrc tester panel ready');
})(window);
