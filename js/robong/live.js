(() => {
'use strict';

const channelsEl = document.getElementById('live-channels');
const groupEl = document.getElementById('live-group');
const refreshBtn = document.getElementById('live-refresh');
const video = document.getElementById('live-video');
const overlay = document.getElementById('live-overlay');
const nowTitle = document.getElementById('live-now-title');
const nowMeta = document.getElementById('live-now-meta');
const statusEl = document.getElementById('live-status');
const stopBtn = document.getElementById('live-stop');

if (!channelsEl || !video) return;

let allChannels = [];
let currentId = null;
let hls = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function stopPlayback() {
  if (hls) {
    try { hls.destroy(); } catch (_) {}
    hls = null;
  }
  video.removeAttribute('src');
  video.load();
  currentId = null;
  if (stopBtn) stopBtn.hidden = true;
  if (overlay) overlay.style.opacity = '1';
  if (nowTitle) nowTitle.textContent = 'Chọn kênh để xem';
  if (nowMeta) nowMeta.textContent = 'RoBong Live · curated channels';
  setStatus('Đã dừng');
  document.querySelectorAll('.live-channel.active').forEach(el => el.classList.remove('active'));
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

    if (nowTitle) nowTitle.textContent = item.name || id;
    if (nowMeta) nowMeta.textContent = (item.group || '') + ' · ' + (item.type || 'stream').toUpperCase();
    if (overlay) overlay.style.opacity = '0';
    if (stopBtn) stopBtn.hidden = false;

    document.querySelectorAll('.live-channel').forEach(el => {
      el.classList.toggle('active', el.dataset.id === item.id);
    });

    // Cleanup previous
    if (hls) {
      try { hls.destroy(); } catch (_) {}
      hls = null;
    }
    video.removeAttribute('src');

    const url = item.url;
    const type = (item.type || '').toLowerCase();

    if (type === 'hls' || url.includes('.m3u8')) {
      if (window.Hls && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
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
      // flv / progressive / other — try native
      video.src = url;
      video.play().catch(() => setStatus('Nhấn play hoặc mở bằng player ngoài'));
      setStatus(type === 'flv' ? 'FLV · thử native / player ngoài' : 'Đang phát');
    }
  } catch (err) {
    setStatus(err.message || 'Không phát được');
    if (overlay) overlay.style.opacity = '1';
  }
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'live-channel' + (ch.id === currentId ? ' active' : '');
    btn.dataset.id = ch.id;

    const logo = document.createElement('span');
    logo.className = 'live-logo';
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

    const copy = document.createElement('span');
    copy.className = 'live-copy';
    const name = document.createElement('b');
    name.textContent = ch.name || ch.id;
    const meta = document.createElement('small');
    meta.textContent = (ch.group || '') + (ch.type ? ' · ' + ch.type.toUpperCase() : '');
    copy.append(name, meta);

    const mark = document.createElement('span');
    mark.className = 'live-play-mark';
    mark.textContent = '▶';

    btn.append(logo, copy, mark);
    btn.addEventListener('click', () => playChannel(ch.id));
    frag.append(btn);
  });
  channelsEl.append(frag);
}

function fillGroups(channels) {
  if (!groupEl) return;
  const current = groupEl.value;
  const groups = [...new Set(channels.map(c => c.group).filter(Boolean))].sort();
  groupEl.replaceChildren(new Option('Tất cả nhóm', ''));
  groups.forEach(g => groupEl.add(new Option(g, g)));
  if (current && groups.includes(current)) groupEl.value = current;
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
    fillGroups(allChannels);
    applyFilter();
    setStatus(allChannels.length + ' kênh');
  } catch (err) {
    channelsEl.innerHTML = '<div class="live-empty">Không tải được kênh: ' + (err.message || 'lỗi') + '</div>';
    setStatus('Lỗi tải danh sách');
  }
}

function applyFilter() {
  const g = (groupEl && groupEl.value) || '';
  const list = g
    ? allChannels.filter(c => (c.group || '').toLowerCase() === g.toLowerCase())
    : allChannels;
  renderChannels(list);
}

if (groupEl) groupEl.addEventListener('change', applyFilter);
if (refreshBtn) refreshBtn.addEventListener('click', loadChannels);
if (stopBtn) stopBtn.addEventListener('click', stopPlayback);

loadChannels();
})();
