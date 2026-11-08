(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- state ----------
let channels = [];
let currentGroup = '';
let selectedChannel = null;
let hls = null;
let resultsDay = 'today';

// ---------- helpers ----------
function dateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

async function api(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  if (!res.ok || body.ok === false) throw new Error(body.error || 'API error');
  return body;
}

// ---------- standings ----------
async function loadStandings(league = 'eng.1') {
  const el = $('#bxh-list');
  if (!el) return;
  el.innerHTML = '<div class="rb-loading">Đang tải…</div>';
  try {
    const data = await api('/api/robong?sport=football&resource=standings&league=' + encodeURIComponent(league));
    const items = data.items || [];
    if (!items.length) {
      el.innerHTML = '<div class="rb-empty">Chưa có dữ liệu</div>';
      return;
    }
    el.replaceChildren();
    items.slice(0, 10).forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'rb-stand-row';
      const rank = row.rank || i + 1;
      div.innerHTML =
        '<span class="rank">' + rank + '</span>' +
        '<span class="club">' + (row.team || '—') + '</span>' +
        '<span class="played">' + (row.played ?? '–') + '</span>' +
        '<span class="pts">' + (row.points ?? '–') + '</span>';
      el.append(div);
    });
  } catch (e) {
    el.innerHTML = '<div class="rb-empty">' + (e.message || 'Lỗi') + '</div>';
  }
}

// ---------- results / matches ----------
async function loadResults() {
  const el = $('#results-list');
  const matchEl = $('#match-list');
  if (!el) return;
  el.innerHTML = '<div class="rb-loading">Đang tải…</div>';
  if (matchEl) matchEl.innerHTML = '<div class="rb-loading">Đang tải…</div>';

  const offset = resultsDay === 'yesterday' ? -1 : resultsDay === 'tomorrow' ? 1 : 0;
  const date = dateStr(offset);

  try {
    const data = await api('/api/robong?sport=football&resource=matches&league=eng.1&date=' + date);
    const items = data.items || [];
    renderMatchCards(el, items.slice(0, 12), true);
    if (matchEl) renderMatchCards(matchEl, items, false);

    // schedule from same data or tomorrow
    const sched = $('#schedule-list');
    if (sched) {
      const upcoming = items.filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'pre' || s === 'scheduled' || s === 'status_scheduled';
      }).slice(0, 8);
      if (!upcoming.length) {
        sched.innerHTML = '<div class="rb-empty">Chưa có lịch gần</div>';
      } else {
        sched.replaceChildren();
        upcoming.forEach(m => {
          const row = document.createElement('div');
          row.className = 'rb-sched-row';
          const t = m.startAt ? new Date(m.startAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
          row.innerHTML =
            '<span class="time">' + t + '</span>' +
            '<span class="names">' + (m.home || '?') + ' <b>vs</b> ' + (m.away || '?') + '</span>' +
            '<span class="comp">' + (m.competition || '') + '</span>';
          sched.append(row);
        });
      }
    }
  } catch (e) {
    el.innerHTML = '<div class="rb-empty">' + (e.message || 'Lỗi') + '</div>';
    if (matchEl) matchEl.innerHTML = '<div class="rb-empty">' + (e.message || 'Lỗi') + '</div>';
  }
}

function renderMatchCards(container, items, compact) {
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = '<div class="rb-empty">Không có trận</div>';
    return;
  }
  items.forEach(m => {
    const card = document.createElement('div');
    card.className = 'rb-match-card';
    const status = String(m.status || '').toLowerCase();
    const live = status.includes('in') || status === 'live' || status === 'status_in_progress';
    const score =
      m.homeScore != null || m.awayScore != null
        ? (m.homeScore ?? '–') + ' - ' + (m.awayScore ?? '–')
        : '—';
    card.innerHTML =
      '<div class="mc-left">' +
        (live ? '<span class="mc-live">LIVE</span>' : '<span class="mc-status">' + (m.status || '') + '</span>') +
      '</div>' +
      '<div class="mc-mid">' +
        '<span class="mc-home">' + (m.home || '?') + '</span>' +
        '<span class="mc-score">' + score + '</span>' +
        '<span class="mc-away">' + (m.away || '?') + '</span>' +
      '</div>' +
      '<button type="button" class="mc-watch">Xem TT</button>';
    const btn = card.querySelector('.mc-watch');
    btn.addEventListener('click', () => {
      // jump to live section / first channel
      if (channels[0]) {
        selectChannel(channels[0]);
        document.getElementById('feature-box')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
    container.append(card);
  });
}

// ---------- live channels ----------
async function loadChannels() {
  const list = $('#channel-list');
  if (!list) return;
  list.innerHTML = '<div class="rb-loading">Đang tải kênh…</div>';
  try {
    const data = await api('/api/robong-live?resource=channels');
    channels = data.items || [];
    renderPills();
    renderChannels();
    if (channels[0]) selectChannel(channels[0], false);
  } catch (e) {
    list.innerHTML = '<div class="rb-empty">' + (e.message || 'Lỗi kênh') + '</div>';
  }
}

function renderPills() {
  const el = $('#channel-pills');
  if (!el) return;
  const groups = [...new Set(channels.map(c => c.group).filter(Boolean))];
  el.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'rb-pill' + (!currentGroup ? ' active' : '');
  all.textContent = 'Tất cả';
  all.onclick = () => { currentGroup = ''; renderPills(); renderChannels(); };
  el.append(all);
  groups.forEach(g => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rb-pill' + (currentGroup === g ? ' active' : '');
    b.textContent = g;
    b.onclick = () => { currentGroup = g; renderPills(); renderChannels(); };
    el.append(b);
  });
}

function renderChannels() {
  const list = $('#channel-list');
  if (!list) return;
  const filtered = currentGroup
    ? channels.filter(c => c.group === currentGroup)
    : channels;
  list.replaceChildren();
  if (!filtered.length) {
    list.innerHTML = '<div class="rb-empty">Không có kênh</div>';
    return;
  }
  filtered.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'rb-match-card' + (selectedChannel && selectedChannel.id === ch.id ? ' active' : '');
    card.innerHTML =
      '<div class="mc-left"><span class="mc-live">LIVE</span></div>' +
      '<div class="mc-mid ch">' +
        (ch.logo ? '<img class="ch-logo" src="' + ch.logo + '" alt="" loading="lazy">' : '') +
        '<div><b>' + (ch.name || ch.id) + '</b><small>' + (ch.group || '') + '</small></div>' +
      '</div>' +
      '<button type="button" class="mc-watch">Xem TT</button>';
    card.querySelector('.mc-watch').onclick = e => {
      e.stopPropagation();
      selectChannel(ch);
      playChannel(ch.id);
    };
    card.onclick = () => selectChannel(ch);
    list.append(card);
  });
}

function selectChannel(ch, enableCta = true) {
  selectedChannel = ch;
  const home = $('#feature-home');
  const away = $('#feature-away');
  const league = $('#feature-league');
  const score = $('#feature-score');
  const cta = $('#feature-cta');
  const hint = $('#feature-hint');
  const bg = $('#feature-bg');

  if (home) home.textContent = ch.name || 'Kênh';
  if (away) away.textContent = ch.group || 'Live';
  if (league) league.textContent = ch.group || 'ROBONG LIVE';
  if (score) score.textContent = '▶';
  if (hint) hint.textContent = (ch.type || 'stream').toUpperCase() + ' · ' + (ch.source || 'curated');
  if (bg && ch.logo) bg.style.backgroundImage = 'url(' + ch.logo + ')';
  if (cta) {
    cta.disabled = !enableCta;
    cta.onclick = () => playChannel(ch.id);
  }
  renderChannels();
}

async function playChannel(id) {
  const box = $('#feature-player');
  const body = $('#feature-body');
  const video = $('#live-video');
  const hint = $('#feature-hint');
  if (!video || !box) return;

  if (hint) hint.textContent = 'Đang lấy link…';
  try {
    const data = await api('/api/robong-live?resource=play&id=' + encodeURIComponent(id));
    const item = data.item;
    if (!item || !item.url) throw new Error('Không có link');

    if (hls) { try { hls.destroy(); } catch (_) {} hls = null; }
    video.removeAttribute('src');

    box.hidden = false;
    if (body) body.style.display = 'none';

    const url = item.url;
    const type = (item.type || '').toLowerCase();

    if (type === 'hls' || url.includes('.m3u8')) {
      if (window.Hls && Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => {});
      }
    } else {
      video.src = url;
      video.play().catch(() => {});
    }
    if (hint) hint.textContent = 'Đang phát';
  } catch (e) {
    if (hint) hint.textContent = e.message || 'Lỗi phát';
  }
}

function stopPlayer() {
  const box = $('#feature-player');
  const body = $('#feature-body');
  const video = $('#live-video');
  if (hls) { try { hls.destroy(); } catch (_) {} hls = null; }
  if (video) { video.removeAttribute('src'); video.load(); }
  if (box) box.hidden = true;
  if (body) body.style.display = '';
}

// ---------- UI bindings ----------
function bindUI() {
  const menu = $('#rb-menu');
  const nav = $('#rb-nav');
  if (menu && nav) {
    menu.onclick = () => nav.classList.toggle('open');
  }

  $('#bxh-league')?.addEventListener('change', e => loadStandings(e.target.value));
  $('#bxh-more')?.addEventListener('click', () => loadStandings($('#bxh-league')?.value || 'eng.1'));

  $$('#hot-leagues button').forEach(btn => {
    btn.onclick = () => {
      const lg = btn.dataset.league;
      const sel = $('#bxh-league');
      if (sel) {
        // add option if missing
        if (![...sel.options].some(o => o.value === lg)) {
          sel.add(new Option(btn.textContent, lg));
        }
        sel.value = lg;
      }
      loadStandings(lg);
    };
  });

  $$('.rb-day-pills button').forEach(btn => {
    btn.onclick = () => {
      $$('.rb-day-pills button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resultsDay = btn.dataset.day || 'today';
      loadResults();
    };
  });

  $$('.rb-tab').forEach(tab => {
    tab.onclick = () => {
      $$('.rb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panel = tab.dataset.panel;
      const ch = $('#channel-list');
      const mt = $('#match-list');
      const pills = $('#channel-pills');
      if (panel === 'matches') {
        if (ch) ch.hidden = true;
        if (pills) pills.hidden = true;
        if (mt) mt.hidden = false;
      } else {
        if (ch) ch.hidden = false;
        if (pills) pills.hidden = false;
        if (mt) mt.hidden = true;
        if (panel === 'all') {
          currentGroup = '';
          renderPills();
          renderChannels();
        }
      }
    };
  });

  $('#player-close')?.addEventListener('click', stopPlayer);
  $('#feature-cta')?.addEventListener('click', () => {
    if (selectedChannel) playChannel(selectedChannel.id);
  });
}

// ---------- init ----------
bindUI();
loadStandings('eng.1');
loadResults();
loadChannels();
})();
