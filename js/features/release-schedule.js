/* RoFlix public release calendar + AnimeVietSub-style upcoming cards. */
(function () {
  'use strict';
  const sb = window.rfSupabase;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateLabel = d => d.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'});
  const dayLabel = d => d.toLocaleDateString('vi-VN', {weekday:'short'}).replace('.', '');
  const timeLabel = v => v ? new Date(v).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
  const fullDate = v => v ? new Date(v).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'}) : '';
  const sourceUrl = {
    kkphim: slug => `https://phimapi.com/phim/${encodeURIComponent(slug)}`,
    vsmov: slug => `https://vsmov.com/api/phim/${encodeURIComponent(slug)}`
  };
  const ratingCache = new Map();

  async function getRating(item) {
    if (!item?.movie_slug) return '';
    const key = `${item.source_id || 'kkphim'}:${item.movie_slug}`;
    if (ratingCache.has(key)) return ratingCache.get(key);
    try {
      const r = await fetch(sourceUrl[item.source_id || 'kkphim'](item.movie_slug), {cache:'no-store'});
      if (!r.ok) throw new Error('HTTP '+r.status);
      const d = await r.json();
      const m = d?.movie || d?.data?.movie || d?.data || d;
      const value = parseFloat(m?.tmdb?.vote_average ?? m?.imdb?.rating ?? m?.rating ?? 0);
      const out = value > 0 ? value.toFixed(1) : '';
      ratingCache.set(key, out);
      return out;
    } catch (_) {
      ratingCache.set(key, '');
      return '';
    }
  }

  function cardHtml(x, rating) {
    const future = new Date(x.release_at) > new Date();
    const poster = x.poster_url || 'https://placehold.co/300x450/10131d/f59e0b?text=RoFlix';
    const slug = String(x.movie_slug || '').replace(/'/g, "\\'");
    return `<article class="rf-upcoming-card" data-release-at="${esc(x.release_at)}" onclick="viewMovieDetail('${slug}', '${esc(x.source_id || 'kkphim')}')">
      <div class="rf-upcoming-poster">
        <img src="${esc(poster)}" alt="${esc(x.title)}" loading="lazy">
        ${rating ? `<span class="rf-upcoming-rating">★${esc(rating)}</span>` : ''}
        <span class="rf-upcoming-date">${fullDate(x.release_at)}</span>
        <span class="rf-upcoming-countdown" data-countdown="${esc(x.release_at)}">${future ? 'SẮP CHIẾU' : 'ĐÃ RA'}</span>
      </div>
      <div class="rf-upcoming-title" title="${esc(x.title)}">${esc(x.title)}</div>
      <div class="rf-upcoming-views">${x.origin_name ? esc(x.origin_name) : 'Lịch phát hành RoFlix'}</div>
    </article>`;
  }

  function broadcastHtml(x) {
    const slug = String(x.movie_slug || '').replace(/'/g, "\\'");
    const status = new Date(x.release_at) <= new Date();
    return `<button class="rf-broadcast-item" type="button" onclick="viewMovieDetail('${slug}', '${esc(x.source_id || 'kkphim')}')">
      <span class="rf-broadcast-time">${timeLabel(x.release_at)}</span>
      <span class="rf-broadcast-poster"><img src="${esc(x.poster_url || 'https://placehold.co/70x100/10131d/f59e0b?text=RF')}" alt=""></span>
      <span class="rf-broadcast-info"><b>${esc(x.title)}</b><small>${esc(x.origin_name || '')}</small><em>${status ? 'ĐÃ RA' : 'SẮP RA'}</em></span>
    </button>`;
  }

  let upcomingExpanded = false;
  let upcomingItems = [];

  async function renderUpcoming(items) {
    const box = document.getElementById('public-upcoming-schedule');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="rf-empty-state">Admin chưa lên lịch phim sắp chiếu.</div>'; return; }
    upcomingItems = items;
    const visible = upcomingExpanded ? items : items.slice(0, 5);
    box.innerHTML = visible.map(x => cardHtml(x, '')).join('');
    const ratings = await Promise.all(visible.map(getRating));
    box.querySelectorAll('.rf-upcoming-card').forEach((el, i) => {
      if (!ratings[i]) return;
      const badge = document.createElement('span');
      badge.className = 'rf-upcoming-rating';
      badge.textContent = '★' + ratings[i];
      el.querySelector('.rf-upcoming-poster')?.appendChild(badge);
    });
    const more = document.getElementById('rf-upcoming-more');
    if (more) {
      more.textContent = items.length > 5 && !upcomingExpanded ? 'XEM THÊM...' : (items.length > 5 ? 'THU GỌN ↑' : '');
      more.style.display = items.length > 5 ? 'block' : 'none';
    }
  }

  function renderBroadcastTabs(items) {
    const tabs = document.getElementById('rf-broadcast-tabs');
    const list = document.getElementById('rf-broadcast-list');
    if (!tabs || !list) return;
    const now = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); days.push(d); }
    let selected = dateKey(days[0]);
    const render = () => {
      tabs.innerHTML = days.map((d,i) => `<button type="button" class="rf-day-tab ${dateKey(d)===selected?'active':''}" data-day="${dateKey(d)}"><b>${i===0?'HÔM NAY':dayLabel(d)}</b><span>${dateLabel(d)}</span></button>`).join('');
      tabs.querySelectorAll('[data-day]').forEach(btn => btn.addEventListener('click', () => { selected = btn.dataset.day; render(); }));
      const dayItems = items.filter(x => dateKey(new Date(x.release_at)) === selected).sort((a,b)=>new Date(a.release_at)-new Date(b.release_at));
      list.innerHTML = dayItems.length ? dayItems.map(broadcastHtml).join('') : '<div class="rf-broadcast-empty">Không có phim được lên lịch trong ngày này.</div>';
    };
    render();
  }

  function tickCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const t = new Date(el.dataset.countdown).getTime();
      if (!Number.isFinite(t)) return;
      const diff = t - Date.now();
      if (diff <= 0) { el.textContent = 'ĐÃ RA'; el.classList.add('released'); return; }
      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const mins = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      el.textContent = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    });
  }

  async function loadPublicSchedule() {
    const boxes = [document.getElementById('public-release-schedule'), document.getElementById('player-release-schedule')].filter(Boolean);
    const homeUpcoming = document.getElementById('public-upcoming-schedule');
    const broadcast = document.getElementById('rf-broadcast-tabs');
    if ((!boxes.length && !homeUpcoming && !broadcast) || !sb) return;
    // Public visitors can read published rows through RLS; only the admin UI runs the sync RPC.
    const res = await sb.from('roflix_release_schedule')
      .select('id,movie_slug,title,origin_name,source_id,poster_url,summary,release_at,status,featured')
      .in('status',['scheduled','released'])
      .order('release_at',{ascending:true}).limit(60);
    if (res.error) {
      boxes.forEach(box => box.innerHTML = '<div class="rf-empty-state">Không tải được lịch phát hành.</div>');
      if (homeUpcoming) homeUpcoming.innerHTML = '<div class="rf-empty-state">Không tải được lịch phát hành.</div>';
      return;
    }
    const all = res.data || [];
    const upcoming = all.filter(x => x.status === 'scheduled' && new Date(x.release_at) > new Date()).slice(0, 10);
    if (homeUpcoming) await renderUpcoming(upcoming);
    if (broadcast) renderBroadcastTabs(all.filter(x => new Date(x.release_at) >= new Date(Date.now()-86400000)).slice(0, 60));

    const html = all.slice(0, 12).map(x => `<article class="rf-schedule-card" onclick="viewMovieDetail('${String(x.movie_slug||'').replace(/'/g,"\\'")}', '${x.source_id||''}')"><img src="${esc(x.poster_url || 'https://placehold.co/120x180/10131d/f59e0b?text=RoFlix')}" alt="${esc(x.title)}" loading="lazy"><div><span class="rf-schedule-status ${x.status==='released'?'released':''}">${x.status==='released'?'ĐÃ RA':'SẮP RA'}</span><h4>${esc(x.title)}</h4><p>${esc(x.origin_name||'')}</p><time>${timeLabel(x.release_at)} · ${fullDate(x.release_at)}</time></div></article>`).join('') || '<div class="rf-empty-state">Chưa có lịch phim.</div>';
    boxes.forEach(box => box.innerHTML = html);
    tickCountdowns();
  }

  window.rfLoadReleaseSchedule = loadPublicSchedule;
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('rf-upcoming-more')?.addEventListener('click', async () => {
      upcomingExpanded = !upcomingExpanded;
      await renderUpcoming(upcomingItems);
    });
    setTimeout(loadPublicSchedule, 1200);
    setInterval(tickCountdowns, 1000);
  });
})();
