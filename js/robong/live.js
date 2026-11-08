(() => {
'use strict';

const channelsEl = document.getElementById('live-channels');
const pillsEl = document.getElementById('live-pills');
const refreshBtn = document.getElementById('live-refresh');
const video = document.getElementById('live-video');
const playerBox = document.getElementById('live-player-box');
const heroCta = document.getElementById('live-hero-cta');
const heroTitle = document.getElementById('live-hero-title');
const heroSub = document.getElementById('live-hero-sub');
const heroGroup = document.getElementById('live-hero-group');
const heroBg = document.getElementById('live-hero-bg');
const statusEl = document.getElementById('live-status');
const stopBtn = document.getElementById('live-stop');

if (!channelsEl || !video) return;

let allChannels = [];
let currentGroup = '';
let selected = null;
let currentId = null;
let hls = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setHero(ch) {
  selected = ch || null;
  if (heroTitle) heroTitle.textContent = ch ? ch.name : 'Chọn kênh bên dưới';
  if (heroSub) heroSub.textContent = ch
    ? ((ch.group || '') + (ch.type ? ' · ' + String(ch.type).toUpperCase() : ''))
    : 'RoBong Live · curated channels';
  if (heroGroup) heroGroup.textContent = (ch && ch.group) ? ch.group : 'LIVE';
  if (heroBg) {
    if (ch && ch.logo) {
      heroBg.style.backgroundImage = 'url(' + ch.logo + ')';
    } else {
      heroBg.style.backgroundImage = '';
    }
  }
  if (heroCta) {
    heroCta.disabled = !ch;
    heroCta.onclick = ch ? () => playChannel(ch.id) : null;
  }
}

function stopPlayback() {
  if (hls) {
    try { hls.destroy(); } catch (_) {}
    hls = null;
  }
  video.removeAttribute('src');
  video.load();
  currentId = null;
  if (playerBox) playerBox.hidden = true;
  setStatus('Đã dừng');
  document.querySelectorAll('.live-card.active').forEach(el => el.classList.remove('active'));
}

async function playChannel(id) {
  setStatus('Đang lấy link…');
  try {
    const res = await fetch('/api/robong-live?resource=play&id=' + encodeURIComponent(id), {
      headers: { Accept: 'application/json' }
    });
    const body = await res.json();
    if (!res.ok || !body.ok || !body.item || !body.item.url) {
      throw new Error(body.error || 'Không lấy được link');
    }
    const item = body.item;
    currentId = item.id;
    setHero(item);

    document.querySelectorAll('.live-card').forEach(el => {
      el.classList.toggle('active', el.dataset.id === item.id);
    });

    if (hls) {
      try { hls.destroy(); } catch (_) {}
      hls = null;
    }
    video.removeAttribute('src');
    if (playerBox) playerBox.hidden = false;

    const url = item.url;
    const type = (item.type || '').toLowerCase();

    if (type === 'hls' || url.includes('.m3u8')) {
      if (window.Hls && Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setStatus('Nhấn play để xem'));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setStatus('Lỗi phát HLS');
        });
        setStatus('Đang phát (HLS)');
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => setStatus('Nhấn play để xem'));
        setStatus('Đang phát (native HLS)');
      } else {
        setStatus('Trình duyệt không hỗ trợ HLS');
      }
    } else {
      video.src = url;
      video.play().catch(() => setStatus('Nhấn play hoặc mở player ngoài'));
      setStatus(type === 'flv' ? 'FLV · thử native / player ngoài' : 'Đang phát');
    }

    // scroll player into view on mobile
    const hero = document.getElementById('live-hero');
    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    setStatus(err.message || 'Không phát được');
  }
}

function renderPills(channels) {
  if (!pillsEl) return;
  const groups = [...new Set(channels.map(c => c.group).filter(Boolean))].sort();
  pillsEl.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'live-pill' + (!currentGroup ? ' active' : '');
  all.dataset.group = '';
  all.textContent = 'Tất cả';
  all.addEventListener('click', () => {
    currentGroup = '';
    renderPills(allChannels);
    applyFilter();
  });
  pillsEl.append(all);
  groups.forEach(g => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'live-pill' + (currentGroup === g ? ' active' : '');
    btn.dataset.group = g;
    btn.innerHTML = (g.toLowerCase().includes('world') || g.includes('FIFA') ? '<i class="dot"></i> ' : '') + g;
    btn.addEventListener('click', () => {
      currentGroup = g;
      renderPills(allChannels);
      applyFilter();
    });
    pillsEl.append(btn);
  });
}

function renderChannels(list) {
  channelsEl.replaceChildren();
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'live-empty';
    empty.textContent = 'Không có kênh trong nhóm này.';
    channelsEl.append(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(ch => {
    const card = document.createElement('article');
    card.className = 'live-card' + (ch.id === currentId ? ' active' : '');
    card.dataset.id = ch.id;

    const left = document.createElement('div');
    left.className = 'live-card-left';
    const logo = document.createElement('span');
    logo.className = 'live-card-logo';
    if (ch.logo) {
      const img = document.createElement('img');
      img.src = ch.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => { img.remove(); logo.textContent = (ch.name || '?').slice(0, 1); };
      logo.append(img);
    } else {
      logo.textContent = (ch.name || '?').slice(0, 1);
    }
    const info = document.createElement('div');
    info.className = 'live-card-info';
    const name = document.createElement('b');
    name.textContent = ch.name || ch.id;
    const meta = document.createElement('small');
    meta.innerHTML = '<span class="live-tag">LIVE</span> ' + (ch.group || 'Kênh');
    info.append(name, meta);
    left.append(logo, info);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'live-watch-btn';
    btn.innerHTML = '<span>▶</span> Xem TT';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      setHero(ch);
      playChannel(ch.id);
    });

    card.append(left, btn);
    card.addEventListener('click', () => {
      setHero(ch);
    });
    frag.append(card);
  });
  channelsEl.append(frag);

  // auto-select first for hero if none
  if (!selected && list[0]) setHero(list[0]);
}

function applyFilter() {
  const list = currentGroup
    ? allChannels.filter(c => (c.group || '') === currentGroup)
    : allChannels;
  renderChannels(list);
}

async function loadChannels() {
  channelsEl.innerHTML = '<div class="live-empty">Đang tải danh sách kênh…</div>';
  setStatus('Đang tải…');
  try {
    const res = await fetch('/api/robong-live?resource=channels', {
      headers: { Accept: 'application/json' }
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || 'API không phản hồi');
    allChannels = Array.isArray(body.items) ? body.items : [];
    renderPills(allChannels);
    applyFilter();
    setStatus(allChannels.length + ' kênh');
  } catch (err) {
    channelsEl.innerHTML = '<div class="live-empty">Không tải được kênh: ' + (err.message || 'lỗi') + '</div>';
    setStatus('Lỗi tải danh sách');
  }
}

if (refreshBtn) refreshBtn.addEventListener('click', loadChannels);
if (stopBtn) stopBtn.addEventListener('click', stopPlayback);

loadChannels();
})();
