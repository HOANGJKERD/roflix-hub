// AniMapper watch page. Search + episodes from the public API.
// Playback uses the server name returned with each episode (not HDX).
// HLS that requires a Referer proxy is skipped. Hung /stream/source calls abort.
(function (w) {
  'use strict';
  var API = 'https://api.animapper.net/api/v1';
  var PROVIDERS = ['ANIMEVIETSUB', 'NINIYO', 'ANIMETVN'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[c];
    });
  }
  function titleOf(item) {
    var t = (item && item.titles) || {};
    return t.vi || t['user-preferred'] || t.en || t.main || t['ja-ro'] || 'Anime';
  }
  function posterOf(item) {
    var img = (item && item.images) || {};
    return img.coverXl || img.coverLg || img.coverMd || '';
  }
  function api(path, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 14000);
    return fetch(API + path, { headers: { Accept: 'application/json' }, signal: ctrl.signal })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new Error('AniMapper không trả link (quá 14 giây)');
        throw err;
      });
  }

  function injectSourcePill() {
    var box = document.getElementById('source-switch');
    if (!box || box.querySelector('[data-source="animapper"]')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'source-pill';
    btn.dataset.source = 'animapper';
    btn.textContent = 'AniMapper';
    btn.onclick = function () {
      if (typeof w.switchSource === 'function') w.switchSource('animapper');
      else openPage();
    };
    var note = document.getElementById('source-note');
    if (note && note.parentNode === box) box.insertBefore(btn, note);
    else box.appendChild(btn);
  }

  function ensureCss() {
    if (document.getElementById('rf-am-css')) return;
    var css = document.createElement('style');
    css.id = 'rf-am-css';
    css.textContent = [
      '#rf-am-page{position:fixed;inset:0;z-index:10000;background:#05060a;color:#f5f5f5;display:flex;flex-direction:column;}',
      '#rf-am-page *{box-sizing:border-box;}',
      '#rf-am-page .top{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid #1c1f2a;background:#080a10;}',
      '#rf-am-page .back,#rf-am-page .fs{border:1px solid #2c3142;background:#12151e;color:#eee;border-radius:12px;padding:8px 14px;font-weight:700;cursor:pointer;}',
      '#rf-am-page .back:hover,#rf-am-page .fs:hover{border-color:#f59e0b;color:#fbbf24;}',
      '#rf-am-page .brand{font-weight:900;letter-spacing:.03em;}',
      '#rf-am-page .brand b{background:linear-gradient(90deg,#f59e0b,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent;}',
      '#rf-am-page .body{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 340px;min-height:0;}',
      '@media(max-width:980px){#rf-am-page .body{grid-template-columns:1fr;overflow:auto;} #rf-am-page .side{border-left:0;border-top:1px solid #1c1f2a;max-height:none;}}',
      '#rf-am-page .watch{min-width:0;overflow:auto;padding:16px 18px 28px;}',
      '#rf-am-page .stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;border:1px solid #222;box-shadow:0 30px 80px #000a;}',
      '#rf-am-page iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;}',
      '#rf-am-page .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 40%,#1a1428,#05060a 70%);color:#9ca3af;}',
      '#rf-am-page .ph strong{color:#fff;font-size:20px;}',
      '#rf-am-page .now{margin:14px 0 8px;}',
      '#rf-am-page .now h1{margin:0;font-size:22px;font-weight:900;}',
      '#rf-am-page .now p{margin:4px 0 0;color:#9ca3af;font-size:13px;}',
      '#rf-am-page .eps{display:flex;gap:8px;overflow:auto;padding-bottom:6px;}',
      '#rf-am-page .ep{flex:0 0 auto;border:1px solid #2c3142;background:#141824;color:#eee;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;}',
      '#rf-am-page .ep.on{background:#f59e0b;color:#111;border-color:#f59e0b;}',
      '#rf-am-page .more{margin-top:8px;border:0;background:transparent;color:#c4b5fd;font-weight:700;cursor:pointer;}',
      '#rf-am-page .side{border-left:1px solid #1c1f2a;background:#090b12;display:flex;flex-direction:column;min-height:0;}',
      '#rf-am-page form{display:flex;gap:8px;padding:14px;}',
      '#rf-am-page input{flex:1;min-width:0;border:1px solid #2c3142;background:#0c0f18;color:#fff;border-radius:12px;padding:11px 12px;}',
      '#rf-am-page input:focus{outline:none;border-color:#a78bfa;}',
      '#rf-am-page .go{border:0;border-radius:12px;padding:0 14px;font-weight:800;cursor:pointer;color:#111;background:linear-gradient(135deg,#f59e0b,#c084fc);}',
      '#rf-am-page .list{overflow:auto;padding:0 14px 18px;display:flex;flex-direction:column;gap:8px;}',
      '#rf-am-page .card{display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;text-align:left;border:1px solid #23283a;background:#121622;color:#fff;border-radius:14px;padding:8px;cursor:pointer;}',
      '#rf-am-page .card.on{border-color:#a78bfa;}',
      '#rf-am-page .card img{width:54px;height:76px;object-fit:cover;border-radius:8px;background:#000;}',
      '#rf-am-page .card b{display:block;font-size:13px;line-height:1.3;}',
      '#rf-am-page .card small{color:#9ca3af;}',
      'body.rf-am-lock{overflow:hidden;}'
    ].join('');
    document.head.appendChild(css);
  }

  function closePage() {
    var el = document.getElementById('rf-am-page');
    if (el) {
      var frame = document.getElementById('rf-am-frame');
      if (frame) frame.src = '';
      el.remove();
    }
    document.body.classList.remove('rf-am-lock');
  }

  function openPage() {
    ensureCss();
    closePage();
    var root = document.createElement('div');
    root.id = 'rf-am-page';
    root.innerHTML =
      '<div class="top"><button class="back" id="rf-am-back" type="button">← Quay lại</button>' +
      '<div class="brand">Ro<b>Flix</b></div><button class="fs" id="rf-am-fs" type="button">Toàn màn hình</button></div>' +
      '<div class="body"><section class="watch">' +
        '<div class="stage"><div class="ph" id="rf-am-ph"><strong>Chọn anime ở cột phải</strong><span>Rồi bấm tập để phát</span></div>' +
        '<iframe id="rf-am-frame" allowfullscreen allow="autoplay; fullscreen; encrypted-media" style="display:none"></iframe></div>' +
        '<div class="now"><h1 id="rf-am-title">AniMapper</h1><p id="rf-am-sub">Nguồn phát anime công khai. Không đổi KKPhim.</p></div>' +
        '<div class="eps" id="rf-am-eps"></div><button class="more" id="rf-am-more" type="button" hidden>Tải thêm tập</button>' +
      '</section><aside class="side"><form id="rf-am-form"><input id="rf-am-q" placeholder="Tìm anime..." autocomplete="off"><button class="go" type="submit">Tìm</button></form><div class="list" id="rf-am-list"></div></aside></div>';
    document.body.appendChild(root);
    document.body.classList.add('rf-am-lock');

    var state = { item: null, provider: '', episodes: [], offset: 0, hasNext: false };

    function setSub(text) { document.getElementById('rf-am-sub').textContent = text; }
    function showFrame(url) {
      var frame = document.getElementById('rf-am-frame');
      var ph = document.getElementById('rf-am-ph');
      frame.style.display = 'block';
      if (ph) ph.style.display = 'none';
      frame.src = url;
    }
    function showMessage(title, detail) {
      var frame = document.getElementById('rf-am-frame');
      var ph = document.getElementById('rf-am-ph');
      if (frame) { frame.style.display = 'none'; frame.src = ''; }
      if (ph) {
        ph.style.display = 'flex';
        ph.innerHTML = '<strong>' + esc(title) + '</strong><span>' + esc(detail) + '</span>';
      }
    }

    function renderEpisodes() {
      var box = document.getElementById('rf-am-eps');
      box.innerHTML = state.episodes.map(function (ep, i) {
        return '<button type="button" class="ep" data-i="' + i + '">Tập ' + esc(ep.episodeNumber || (i + 1)) + '</button>';
      }).join('');
      box.querySelectorAll('.ep').forEach(function (btn) {
        btn.addEventListener('click', function () {
          box.querySelectorAll('.ep').forEach(function (x) { x.classList.remove('on'); });
          btn.classList.add('on');
          playEpisode(state.episodes[Number(btn.getAttribute('data-i'))], btn);
        });
      });
      document.getElementById('rf-am-more').hidden = !state.hasNext;
    }

    async function playEpisode(ep) {
      var episodeData = ep.episodeId || ep.episodeData;
      if (!episodeData) { showMessage('Tập lỗi', 'Không có mã tập'); return; }
      showMessage('Đang lấy link...', 'Server ' + (ep.server || 'mặc định'));
      var server = ep.server && String(ep.server).toLowerCase() !== 'unknown' ? ep.server : '';
      var paths = [];
      if (server) {
        paths.push('/stream/source?episodeData=' + encodeURIComponent(episodeData) + '&provider=' + encodeURIComponent(state.provider) + '&server=' + encodeURIComponent(server));
      }
      paths.push('/stream/source?episodeData=' + encodeURIComponent(episodeData) + '&provider=' + encodeURIComponent(state.provider));
      var last = 'Không có link';
      for (var i = 0; i < paths.length; i++) {
        try {
          var data = await api(paths[i], 14000);
          var url = data.url || (data.result && data.result.url) || (data.data && data.data.url);
          var type = String(data.type || '').toUpperCase();
          if (data.corsProxyRequired && type === 'HLS') { last = 'Link HLS cần proxy, bỏ qua'; continue; }
          if (!url) { last = 'API không trả url'; continue; }
          showFrame(url);
          setSub((data.server || state.provider) + ' · Tập ' + (ep.episodeNumber || ''));
          return;
        } catch (e) { last = e.message || String(e); }
      }
      showMessage('Chưa phát được tập này', last + '. Bấm tập khác hoặc thử lại.');
      setSub(last);
    }

    async function loadShow(item, reset) {
      state.item = item;
      if (reset) { state.episodes = []; state.offset = 0; state.provider = ''; }
      document.getElementById('rf-am-title').textContent = titleOf(item);
      setSub('Đang lấy danh sách tập...');
      showMessage(titleOf(item), 'Đang tìm nguồn phát');
      var providers = state.provider ? [state.provider] : PROVIDERS;
      var found = null;
      for (var p = 0; p < providers.length && !found; p++) {
        try {
          var data = await api('/stream/episodes?id=' + encodeURIComponent(item.id) + '&provider=' + encodeURIComponent(providers[p]) + '&limit=60&offset=' + state.offset, 12000);
          if (data.episodes && data.episodes.length) found = { provider: providers[p], data: data };
        } catch (e) { setSub(providers[p] + ': ' + e.message); }
      }
      if (!found) {
        showMessage('Không có tập', 'AniMapper không map được phim này.');
        return;
      }
      state.provider = found.provider;
      state.hasNext = !!found.data.hasNextPage;
      state.offset = (found.data.offset || 0) + (found.data.episodes.length || 0);
      state.episodes = state.episodes.concat(found.data.episodes);
      setSub(found.provider + ' · ' + (found.data.total || state.episodes.length) + ' tập');
      renderEpisodes();
      if (reset && state.episodes[0]) {
        var first = document.querySelector('#rf-am-eps .ep');
        if (first) first.classList.add('on');
        playEpisode(state.episodes[0]);
      }
    }

    async function search(q) {
      var list = document.getElementById('rf-am-list');
      list.innerHTML = '<div style="color:#9ca3af;padding:8px">Đang tìm...</div>';
      try {
        var data = await api('/search?title=' + encodeURIComponent(q) + '&mediaType=ANIME&limit=20', 12000);
        var items = data.results || [];
        if (!items.length) { list.innerHTML = '<div style="color:#9ca3af;padding:8px">Không thấy.</div>'; return; }
        list.innerHTML = items.map(function (item, i) {
          var img = posterOf(item);
          return '<button type="button" class="card" data-i="' + i + '">' +
            '<img alt="" src="' + esc(img || 'https://placehold.co/120x170/111/666?text=Anime') + '">' +
            '<div><b>' + esc(titleOf(item)) + '</b><small>' + esc(item.seasonYear || item.format || '') + '</small></div></button>';
        }).join('');
        list.querySelectorAll('.card').forEach(function (card) {
          card.addEventListener('click', function () {
            list.querySelectorAll('.card').forEach(function (x) { x.classList.remove('on'); });
            card.classList.add('on');
            loadShow(items[Number(card.getAttribute('data-i'))], true);
          });
        });
      } catch (e) {
        list.innerHTML = '<div style="color:#fca5a5;padding:8px">' + esc(e.message) + '</div>';
      }
    }

    document.getElementById('rf-am-back').onclick = closePage;
    document.getElementById('rf-am-fs').onclick = function () {
      var stage = root.querySelector('.stage');
      if (stage.requestFullscreen) stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    };
    document.getElementById('rf-am-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      search(document.getElementById('rf-am-q').value.trim());
    });
    document.getElementById('rf-am-more').onclick = function () {
      if (state.item) loadShow(state.item, false);
    };
    document.getElementById('rf-am-q').focus();
    search('naruto');
  }

  function boot() { injectSourcePill(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(injectSourcePill, 800);
  setTimeout(injectSourcePill, 2200);
  w.RoflixAniMapper = { open: openPage, injectSourcePill: injectSourcePill };
})(window);
