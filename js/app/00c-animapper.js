// AniMapper watch page. Search + episodes + playback qua AniMapper API (đi qua proxy Vercel /api/animapper).
// Server AnimeVietSub:
//   DU  = HLS, cần Referer -> phát bằng <video> + hls.js qua proxy /api/hls
//   HDX = EMBED -> iframe
// Mặc định thử DU trước (kiểm tra được lỗi), lỗi thì tự chuyển HDX. Có nút đổi server thủ công.
(function (w) {
  'use strict';
  var API = '/api/animapper?path=';
  var HLS_PROXY = '/api/hls?u=';
  var HLS_LIB = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
  var PROVIDERS = ['ANIMEVIETSUB'];
  var DEFAULT_SERVERS = ['DU', 'HDX'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function titleOf(item) {
    var t = (item && item.titles) || {};
    return t.vi || t['user-preferred'] || t.en || t.main || t['ja-ro'] || t.romaji || 'Anime';
  }
  function posterOf(item) {
    var img = (item && item.images) || {};
    return img.coverXl || img.coverLg || img.coverMd || '';
  }
  function api(path, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 14000);
    return fetch(API + encodeURIComponent(path), { headers: { Accept: 'application/json' }, signal: ctrl.signal })
      .then(function (res) {
        clearTimeout(timer);
        return res.json().catch(function () { return null; }).then(function (json) {
          if (!res.ok || (json && json.success === false)) {
            var msg = (json && (json.message || json.error)) || ('HTTP ' + res.status);
            throw new Error(msg);
          }
          return json;
        });
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new Error('quá thời gian chờ');
        throw err;
      });
  }

  var hlsLibPromise = null;
  function loadHlsLib() {
    if (w.Hls) return Promise.resolve(w.Hls);
    if (hlsLibPromise) return hlsLibPromise;
    hlsLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = HLS_LIB;
      s.onload = function () { resolve(w.Hls); };
      s.onerror = function () { hlsLibPromise = null; reject(new Error('không tải được hls.js')); };
      document.head.appendChild(s);
    });
    return hlsLibPromise;
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
      '#rf-am-page iframe,#rf-am-page video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;}',
      '#rf-am-page .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 40%,#1a1428,#05060a 70%);color:#9ca3af;}',
      '#rf-am-page .ph strong{color:#fff;font-size:20px;}',
      '#rf-am-page .ph span{max-width:640px;font-size:13px;line-height:1.5;word-break:break-word;}',
      '#rf-am-page .now{margin:14px 0 8px;}',
      '#rf-am-page .now h1{margin:0;font-size:22px;font-weight:900;}',
      '#rf-am-page .now p{margin:4px 0 0;color:#9ca3af;font-size:13px;}',
      '#rf-am-page .servers{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0;}',
      '#rf-am-page .servers small{color:#9ca3af;font-weight:700;}',
      '#rf-am-page .srv{border:1px solid #2c3142;background:#141824;color:#eee;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;cursor:pointer;}',
      '#rf-am-page .srv.on{background:#a78bfa;color:#111;border-color:#a78bfa;}',
      '#rf-am-page .eps{display:flex;gap:8px;overflow:auto;padding-bottom:6px;flex-wrap:wrap;}',
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

  // ----- Player (một instance cho cả trang) -----
  var hls = null;
  var playToken = 0; // huỷ kết quả của lần phát cũ khi người dùng bấm tập/server khác

  function stopPlayer() {
    if (hls) { try { hls.destroy(); } catch (_) {} hls = null; }
    var v = document.getElementById('rf-am-video');
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} v.remove(); }
    var f = document.getElementById('rf-am-frame');
    if (f) { f.style.display = 'none'; f.src = 'about:blank'; }
  }

  function closePage() {
    stopPlayer();
    var el = document.getElementById('rf-am-page');
    if (el) el.remove();
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
        '<iframe id="rf-am-frame" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" style="display:none"></iframe></div>' +
        '<div class="now"><h1 id="rf-am-title">AniMapper</h1><p id="rf-am-sub">Nguồn phát anime công khai.</p></div>' +
        '<div class="servers" id="rf-am-servers" hidden></div>' +
        '<div class="eps" id="rf-am-eps"></div><button class="more" id="rf-am-more" type="button" hidden>Tải thêm tập</button>' +
      '</section><aside class="side"><form id="rf-am-form"><input id="rf-am-q" placeholder="Tìm anime..." autocomplete="off"><button class="go" type="submit">Tìm</button></form><div class="list" id="rf-am-list"></div></aside></div>';
    document.body.appendChild(root);
    document.body.classList.add('rf-am-lock');

    var state = { item: null, provider: '', episodes: [], offset: 0, hasNext: false, activeIndex: -1, server: '', servers: [] };

    function setSub(text) { document.getElementById('rf-am-sub').textContent = text; }
    function stage() { return root.querySelector('.stage'); }

    function showMessage(title, detail) {
      stopPlayer();
      var ph = document.getElementById('rf-am-ph');
      if (ph) {
        ph.style.display = 'flex';
        ph.innerHTML = '<strong>' + esc(title) + '</strong><span>' + esc(detail || '') + '</span>';
      }
    }
    function hidePlaceholder() {
      var ph = document.getElementById('rf-am-ph');
      if (ph) ph.style.display = 'none';
    }

    function playEmbed(url) {
      stopPlayer();
      hidePlaceholder();
      var f = document.getElementById('rf-am-frame');
      f.style.display = 'block';
      f.src = url;
    }

    // Trả về Promise: resolve khi đã thực sự có hình/segment, reject khi lỗi nặng hoặc quá 20s.
    function playHls(sourceUrl, token) {
      return loadHlsLib().then(function (Hls) {
        if (token !== playToken) throw new Error('đã huỷ');
        stopPlayer();
        hidePlaceholder();
        var video = document.createElement('video');
        video.id = 'rf-am-video';
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        stage().appendChild(video);
        var viaProxy = /^https:\/\/api\.animapper\.net\/api\/v1\/stream\/source\/m3u8\//.test(sourceUrl);
        var src = viaProxy ? HLS_PROXY + encodeURIComponent(sourceUrl) : sourceUrl;

        return new Promise(function (resolve, reject) {
          var settled = false;
          function ok() { if (!settled) { settled = true; clearTimeout(timer); resolve(); } }
          function fail(msg) {
            if (settled) { setSub('Lỗi phát: ' + msg); return; }
            settled = true; clearTimeout(timer); reject(new Error(msg));
          }
          var timer = setTimeout(function () { fail('quá 20 giây không có dữ liệu video'); }, 20000);

          if (Hls && Hls.isSupported()) {
            hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hls.on(Hls.Events.FRAG_LOADED, ok);
            hls.on(Hls.Events.ERROR, function (_e, data) {
              if (!data || !data.fatal) return;
              var code = data.response && data.response.code ? ' HTTP ' + data.response.code : '';
              fail('HLS ' + data.type + '/' + data.details + code);
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            video.play().catch(function () {});
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.addEventListener('playing', ok, { once: true });
            video.addEventListener('error', function () { fail('trình duyệt không phát được HLS'); }, { once: true });
            video.play().catch(function () {});
          } else {
            fail('trình duyệt không hỗ trợ HLS');
          }
        });
      });
    }

    function fetchSource(episodeData, provider, server) {
      var path = '/stream/source?episodeData=' + encodeURIComponent(episodeData) +
        '&provider=' + encodeURIComponent(provider) +
        '&server=' + encodeURIComponent(server);
      return api(path, 20000).then(function (d) {
        var data = (d && (d.result || d.data)) || d || {};
        var url = data.url || d.url;
        if (!url) throw new Error('không trả URL');
        return { url: url, type: String(data.type || d.type || '').toUpperCase(), server: data.server || server };
      });
    }

    function orderedServers(preferred) {
      var base = state.servers.length ? state.servers.slice() : DEFAULT_SERVERS.slice();
      // Mặc định: DU (kiểm tra được lỗi) trước, HDX sau.
      base.sort(function (a, b) { return (a === 'DU' ? 0 : 1) - (b === 'DU' ? 0 : 1); });
      if (preferred) base = [preferred].concat(base.filter(function (x) { return x !== preferred; }));
      return base;
    }

    function renderServerButtons() {
      var box = document.getElementById('rf-am-servers');
      var list = state.servers.length ? state.servers : DEFAULT_SERVERS;
      box.hidden = false;
      box.innerHTML = '<small>Server:</small>' + list.map(function (s) {
        return '<button type="button" class="srv' + (state.server === s ? ' on' : '') + '" data-s="' + esc(s) + '">' +
          esc(s === 'DU' ? 'DU (HLS)' : s === 'HDX' ? 'HDX (Embed)' : s) + '</button>';
      }).join('');
      box.querySelectorAll('.srv').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var ep = state.episodes[state.activeIndex];
          if (ep) playEpisode(ep, btn.getAttribute('data-s'));
        });
      });
    }

    async function playEpisode(ep, forcedServer) {
      var episodeData = ep.episodeId || ep.episodeData;
      if (!episodeData) { showMessage('Tập lỗi', 'Không có mã tập (episodeId).'); return; }
      var token = ++playToken;
      var provider = state.provider || PROVIDERS[0];
      var epNo = ep.episodeNumber || '';
      showMessage('Đang lấy link...', 'Tập ' + epNo);

      var candidates = forcedServer ? [forcedServer] : orderedServers();
      var errors = [];
      for (var i = 0; i < candidates.length; i++) {
        var server = candidates[i];
        if (token !== playToken) return;
        try {
          setSub(provider + ' · đang thử ' + server + '...');
          var src = await fetchSource(episodeData, provider, server);
          if (token !== playToken) return;
          var type = src.type || (server === 'DU' ? 'HLS' : 'EMBED');
          if (type === 'HLS') {
            await playHls(src.url, token);
          } else if (type === 'DIRECT') {
            if (/\.m3u8(?:[?#]|$)/i.test(src.url)) await playHls(src.url, token);
            else playEmbed(src.url);
          } else {
            playEmbed(src.url);
          }
          if (token !== playToken) return;
          state.server = src.server || server;
          renderServerButtons();
          setSub(provider + ' · ' + state.server + ' · Tập ' + epNo);
          return;
        } catch (e) {
          if (e && e.message === 'đã huỷ') return;
          errors.push(server + ': ' + (e && e.message ? e.message : e));
        }
      }
      if (token !== playToken) return;
      showMessage('Chưa phát được tập này', errors.join(' | ') || 'Không có server khả dụng.');
      setSub(errors[errors.length - 1] || 'Không có nguồn');
    }

    function renderEpisodes() {
      var box = document.getElementById('rf-am-eps');
      box.innerHTML = state.episodes.map(function (ep, i) {
        return '<button type="button" class="ep' + (i === state.activeIndex ? ' on' : '') + '" data-i="' + i + '">Tập ' + esc(ep.episodeNumber || (i + 1)) + '</button>';
      }).join('');
      box.querySelectorAll('.ep').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.activeIndex = Number(btn.getAttribute('data-i'));
          box.querySelectorAll('.ep').forEach(function (x) { x.classList.remove('on'); });
          btn.classList.add('on');
          playEpisode(state.episodes[state.activeIndex]);
        });
      });
      document.getElementById('rf-am-more').hidden = !state.hasNext;
    }

    async function loadShow(item, reset) {
      state.item = item;
      if (reset) { state.episodes = []; state.offset = 0; state.provider = ''; state.activeIndex = -1; state.server = ''; state.servers = []; }
      document.getElementById('rf-am-title').textContent = titleOf(item);
      setSub('Đang lấy danh sách tập...');
      showMessage(titleOf(item), 'Đang tìm nguồn phát');
      var providers = state.provider ? [state.provider] : PROVIDERS;
      var found = null;
      var lastErr = '';
      for (var p = 0; p < providers.length && !found; p++) {
        try {
          var data = await api('/stream/episodes?id=' + encodeURIComponent(item.id) + '&provider=' + encodeURIComponent(providers[p]) + '&limit=60&offset=' + state.offset, 15000);
          if (data.episodes && data.episodes.length) found = { provider: providers[p], data: data };
          else lastErr = providers[p] + ': không có tập';
        } catch (e) { lastErr = providers[p] + ': ' + e.message; setSub(lastErr); }
      }
      if (!found) {
        showMessage('Không có tập', (lastErr || 'AniMapper không map được phim này') + '. Thử anime khác hoặc báo mapping trên Discord AniMapper.');
        return;
      }
      state.provider = found.provider;
      state.hasNext = !!found.data.hasNextPage;
      state.offset = (found.data.offset || 0) + (found.data.episodes.length || 0);
      state.episodes = state.episodes.concat(found.data.episodes);
      setSub(found.provider + ' · ' + (found.data.total || state.episodes.length) + ' tập');
      if (reset) {
        try {
          var sd = await api('/stream/episodes/servers?id=' + encodeURIComponent(item.id) + '&provider=' + encodeURIComponent(found.provider), 10000);
          if (sd && Array.isArray(sd.servers)) state.servers = sd.servers.map(function (x) { return String(x).toUpperCase(); });
        } catch (_) { state.servers = []; }
        renderServerButtons();
        if (state.episodes[0]) state.activeIndex = 0;
      }
      renderEpisodes();
      if (reset && state.episodes[0]) playEpisode(state.episodes[0]);
    }

    async function search(q) {
      var list = document.getElementById('rf-am-list');
      list.innerHTML = '<div style="color:#9ca3af;padding:8px">Đang tìm...</div>';
      try {
        var data = await api('/search?title=' + encodeURIComponent(q) + '&mediaType=ANIME&limit=20', 15000);
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
      var st = stage();
      if (st.requestFullscreen) st.requestFullscreen();
      else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen();
    };
    document.getElementById('rf-am-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var q = document.getElementById('rf-am-q').value.trim();
      if (q) search(q);
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