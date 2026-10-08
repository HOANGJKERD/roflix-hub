// ============================================================
// AniMapper source page
// Search + episodes + embed from https://api.animapper.net/api/v1
// No CORS proxy. Prefer EMBED servers (HDX). Skip HLS that needs a proxy.
// ============================================================
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
    var t = item && item.titles || {};
    return t.vi || t['user-preferred'] || t.en || t.main || t['ja-ro'] || 'Anime';
  }

  function posterOf(item) {
    var img = item && item.images || {};
    return img.coverXl || img.coverLg || img.coverMd || '';
  }

  async function api(path) {
    var res = await fetch(API + path, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('AniMapper HTTP ' + res.status);
    return res.json();
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
      '#rf-am-page{position:fixed;inset:0;z-index:10000;background:#07080d;color:#fff;display:flex;flex-direction:column;overflow:auto;}',
      '#rf-am-page .top{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:linear-gradient(180deg,#07080d,#07080dcc 70%,transparent);}',
      '#rf-am-page .back,#rf-am-page .fs{padding:8px 14px;border-radius:12px;border:1px solid #2a2d3a;background:#141722;color:#eee;font-weight:700;cursor:pointer;}',
      '#rf-am-page .brand{font-weight:900;letter-spacing:.04em;}',
      '#rf-am-page .brand b{background:linear-gradient(90deg,#a78bfa,#f472b6);-webkit-background-clip:text;background-clip:text;color:transparent;}',
      '#rf-am-page .wrap{width:min(1180px,100%);margin:0 auto;padding:8px 16px 48px;}',
      '#rf-am-page .stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;border:1px solid #222;box-shadow:0 24px 70px #0008;}',
      '#rf-am-page .stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;}',
      '#rf-am-page .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6b7280;}',
      '#rf-am-page .search{display:flex;gap:8px;margin:16px 0;}',
      '#rf-am-page input{flex:1;padding:12px 14px;border-radius:12px;border:1px solid #2a2d3a;background:#0c0e16;color:#fff;}',
      '#rf-am-page .go{padding:0 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:800;cursor:pointer;}',
      '#rf-am-page .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;}',
      '#rf-am-page .card{background:#12141c;border:1px solid #232636;border-radius:14px;overflow:hidden;cursor:pointer;text-align:left;color:#fff;padding:0;}',
      '#rf-am-page .card img{width:100%;aspect-ratio:2/3;object-fit:cover;background:#000;display:block;}',
      '#rf-am-page .card span{display:block;padding:8px 10px 10px;font-size:12px;font-weight:700;}',
      '#rf-am-page .eps{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}',
      '#rf-am-page .ep{padding:8px 10px;border-radius:10px;border:1px solid #333;background:#161822;color:#eee;font-size:12px;font-weight:700;cursor:pointer;}',
      '#rf-am-page .ep.on{background:#f59e0b;color:#111;border-color:#f59e0b;}',
      '#rf-am-page .status{min-height:20px;color:#9ca3af;font-size:13px;margin:8px 0;}',
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
    var page = document.createElement('div');
    page.id = 'rf-am-page';
    page.innerHTML =
      '<div class="top"><button type="button" class="back" id="rf-am-back">← Quay lại</button>' +
      '<div class="brand">Ro<b>Flix</b> · AniMapper</div>' +
      '<button type="button" class="fs" id="rf-am-fs">Toàn màn hình</button></div>' +
      '<div class="wrap">' +
        '<div class="stage"><div class="ph" id="rf-am-ph">Tìm anime rồi chọn tập</div>' +
        '<iframe id="rf-am-frame" allowfullscreen allow="autoplay; fullscreen; encrypted-media" style="display:none"></iframe></div>' +
        '<form class="search" id="rf-am-form"><input id="rf-am-q" placeholder="Tìm anime, ví dụ Naruto" autocomplete="off"><button class="go" type="submit">Tìm</button></form>' +
        '<div class="status" id="rf-am-status"></div>' +
        '<div class="grid" id="rf-am-grid"></div>' +
        '<div class="eps" id="rf-am-eps"></div>' +
      '</div>';
    document.body.appendChild(page);
    document.body.classList.add('rf-am-lock');

    var status = document.getElementById('rf-am-status');
    var grid = document.getElementById('rf-am-grid');
    var eps = document.getElementById('rf-am-eps');
    var picked = null;

    function setStatus(msg) { status.textContent = msg || ''; }

    async function search(q) {
      q = String(q || '').trim();
      if (!q) return;
      setStatus('Đang tìm trên AniMapper...');
      grid.innerHTML = '';
      eps.innerHTML = '';
      try {
        var data = await api('/search?title=' + encodeURIComponent(q) + '&mediaType=ANIME&limit=24');
        var items = data.results || data.items || [];
        if (!items.length) { setStatus('Không thấy anime nào.'); return; }
        setStatus(items.length + ' kết quả');
        grid.innerHTML = items.map(function (item, i) {
          var img = posterOf(item);
          return '<button type="button" class="card" data-i="' + i + '">' +
            (img ? '<img src="' + esc(img) + '" alt="">' : '<img alt="" src="https://placehold.co/300x450/111/666?text=Anime">') +
            '<span>' + esc(titleOf(item)) + (item.seasonYear ? ' · ' + esc(item.seasonYear) : '') + '</span></button>';
        }).join('');
        grid.querySelectorAll('.card').forEach(function (card) {
          card.addEventListener('click', function () {
            loadShow(items[Number(card.getAttribute('data-i'))]);
          });
        });
      } catch (e) {
        setStatus('AniMapper lỗi: ' + (e.message || e));
      }
    }

    async function loadShow(item) {
      picked = item;
      eps.innerHTML = '';
      setStatus('Đang lấy tập ' + titleOf(item) + '...');
      var lastErr = null;
      for (var p = 0; p < PROVIDERS.length; p++) {
        var provider = PROVIDERS[p];
        try {
          var data = await api('/stream/episodes?id=' + encodeURIComponent(item.id) + '&provider=' + provider);
          var list = data.episodes || [];
          if (!list.length) continue;
          setStatus(titleOf(item) + ' · ' + provider + ' · ' + list.length + ' tập');
          eps.innerHTML = list.map(function (ep, i) {
            return '<button type="button" class="ep" data-i="' + i + '">Tập ' + esc(ep.episodeNumber || (i + 1)) + '</button>';
          }).join('');
          eps.querySelectorAll('.ep').forEach(function (btn) {
            btn.addEventListener('click', function () {
              eps.querySelectorAll('.ep').forEach(function (x) { x.classList.remove('on'); });
              btn.classList.add('on');
              playEpisode(item, provider, list[Number(btn.getAttribute('data-i'))]);
            });
          });
          playEpisode(item, provider, list[0]);
          var first = eps.querySelector('.ep');
          if (first) first.classList.add('on');
          return;
        } catch (e) { lastErr = e; }
      }
      setStatus('Không có tập phát được' + (lastErr ? ' (' + lastErr.message + ')' : ''));
    }

    async function playEpisode(item, provider, ep) {
      var episodeData = ep.episodeId || ep.episodeData;
      if (!episodeData) { setStatus('Tập không có id.'); return; }
      setStatus('Đang mở tập ' + (ep.episodeNumber || '') + '...');
      var tries = [
        '/stream/source?episodeData=' + encodeURIComponent(episodeData) + '&provider=' + encodeURIComponent(provider) + '&server=HDX',
        '/stream/source?episodeData=' + encodeURIComponent(episodeData) + '&provider=' + encodeURIComponent(provider)
      ];
      var last = null;
      for (var i = 0; i < tries.length; i++) {
        try {
          var data = await api(tries[i]);
          var url = data.url || (data.result && data.result.url) || (data.data && data.data.url);
          var type = String(data.type || '').toUpperCase();
          if (!url) continue;
          if (data.corsProxyRequired && type === 'HLS') continue;
          var frame = document.getElementById('rf-am-frame');
          var ph = document.getElementById('rf-am-ph');
          frame.style.display = 'block';
          if (ph) ph.style.display = 'none';
          frame.src = url;
          setStatus(titleOf(item) + ' · Tập ' + (ep.episodeNumber || '') + ' · ' + (data.server || provider));
          return;
        } catch (e) { last = e; }
      }
      setStatus('Tập này không có link embed' + (last ? ' (' + last.message + ')' : ''));
    }

    document.getElementById('rf-am-back').onclick = closePage;
    document.getElementById('rf-am-fs').onclick = function () {
      var stage = page.querySelector('.stage');
      if (stage.requestFullscreen) stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
    };
    document.getElementById('rf-am-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      search(document.getElementById('rf-am-q').value);
    });
    document.getElementById('rf-am-q').focus();
  }

  function boot() { injectSourcePill(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(injectSourcePill, 800);
  setTimeout(injectSourcePill, 2000);

  w.RoflixAniMapper = { open: openPage, injectSourcePill: injectSourcePill };
})(window);
