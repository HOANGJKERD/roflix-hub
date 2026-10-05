/* RoFlix AniMapper discovery bridge
 * Search + ANIME genre are routed to AniMapper while normal movie search stays intact.
 * AniMapper is metadata/search; playback remains handled by anime-animapper.js.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIMAPPER_DISCOVERY__) return;
  window.__ROFLIX_ANIMAPPER_DISCOVERY__ = true;

  const BASE = 'https://api.animapper.net/api/v1';
  const cache = new Map();
  let wrappedSearch = false;
  let wrappedGenre = false;

  const esc = v => typeof escapeHtml === 'function'
    ? escapeHtml(String(v == null ? '' : v))
    : String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = v => String(v == null ? '' : v).trim();

  function json(url) {
    const hit = cache.get(url);
    if (hit) return hit;
    const p = fetch(url, {headers:{Accept:'application/json'}}).then(async r => {
      if (!r.ok) throw new Error('AniMapper HTTP ' + r.status);
      const d = await r.json();
      if (d?.success === false) throw new Error(d.message || 'AniMapper request failed');
      return d;
    }).finally(() => setTimeout(() => cache.delete(url), 2 * 60 * 1000));
    cache.set(url, p);
    return p;
  }

  function results(data) {
    return Array.isArray(data?.results) ? data.results
      : Array.isArray(data?.data?.results) ? data.data.results
      : Array.isArray(data?.data) ? data.data : [];
  }

  function title(item) {
    return text(item?.titles?.vi || item?.titles?.en || item?.title?.userPreferred || item?.title?.english || item?.title?.romaji || item?.title?.native || item?.title || 'Anime');
  }

  function card(item) {
    const id = Number(item.id);
    const name = title(item);
    const image = item?.images?.coverXl || item?.images?.coverLg || item?.images?.coverMd || '';
    const year = text(item?.seasonYear || (item?.startDate || '').slice(0,4) || 'N/A');
    const format = text(item?.format || 'ANIME');
    const status = ({FINISHED:'Hoàn thành',RELEASING:'Đang phát sóng',NOT_YET_RELEASED:'Sắp chiếu',HIATUS:'Tạm ngưng',CANCELLED:'Đã hủy'})[item?.status] || text(item?.status || 'Anime');
    return `<div class="movie-card-premium card-stagger rf-anime-card rf-animapper-card" data-animapper-id="${id}" tabindex="0" role="button" aria-label="${esc(name)}">
      <div class="card-poster">
        <img src="${esc(image)}" alt="${esc(name)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
        <div class="card-overlay">
          <button class="watch-btn btn-ripple" data-rf-am-watch="${id}"><i class="fa-solid fa-play"></i> Xem Vietsub</button>
          <div class="card-actions"><button data-rf-am-info="${id}" title="Chi tiết Anime"><i class="fa-solid fa-circle-info"></i></button></div>
        </div>
        <div class="card-badges"><span class="badge" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff">ANIME VIETSUB</span><span class="badge eps">${esc(format)}</span></div>
      </div>
      <div class="card-info"><div class="card-title">${esc(name)}</div><div class="card-meta"><span>${esc(year)}</span><span>${esc(status)}</span><span>AniMapper</span></div></div>
    </div>`;
  }

  function toAnime(item) {
    return {
      id: Number(item.id),
      idMal: item.idMal,
      title: {
        english: text(item?.titles?.en),
        native: text(item?.titles?.ja),
        userPreferred: text(item?.titles?.vi || item?.titles?.en || item?.titles?.ja)
      },
      format: item.format,
      status: item.status,
      seasonYear: item.seasonYear,
      startDate: {year: Number(String(item.startDate || '').slice(0,4)) || 0},
      coverImage: {large: item?.images?.coverLg || item?.images?.coverMd || '', extraLarge: item?.images?.coverXl || item?.images?.coverLg || ''},
      siteUrl: '',
      description: ''
    };
  }

  async function search(titleText, offset = 0) {
    const url = `${BASE}/search?title=${encodeURIComponent(titleText)}&mediaType=ANIME&limit=48&offset=${offset}`;
    return json(url);
  }

  async function renderAniMapperResults(query, append = false) {
    const data = await search(query, 0);
    const items = results(data);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!items.length) return;

    const byId = new Map(items.map(item => [Number(item.id), item]));
    const html = items.map(card).join('');
    if (append) host.insertAdjacentHTML('beforeend', html);
    else host.innerHTML = html;

    host.querySelectorAll('[data-animapper-id]').forEach(el => {
      const id = Number(el.dataset.animapperId);
      const item = byId.get(id);
      if (!item || el.dataset.rfBound) return;
      el.dataset.rfBound = '1';
      el.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        window.roflixAnime?.info?.(toAnime(item), 'Nguồn catalog: AniMapper • Provider Vietsub: ANIMEVIETSUB');
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.roflixAnime?.info?.(toAnime(item), 'Nguồn catalog: AniMapper • Provider Vietsub: ANIMEVIETSUB');
        }
      });
      el.querySelector('[data-rf-am-watch]')?.addEventListener('click', e => {
        e.stopPropagation();
        window.roflixAnime?.watch?.(toAnime(item));
      });
      el.querySelector('[data-rf-am-info]')?.addEventListener('click', e => {
        e.stopPropagation();
        window.roflixAnime?.info?.(toAnime(item), 'Nguồn catalog: AniMapper • Provider Vietsub: ANIMEVIETSUB');
      });
    });
    const count = document.getElementById('movie-count');
    if (count) count.textContent = String(data.total || items.length);
  }

  async function openAnimeGenre() {
    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = '';
    currentGenreSlug = '';
    currentCountrySlug = '';
    homePriorityMode = false;
    currentListEndpoint = 'phim-moi-cap-nhat';
    currentPage = 1;
    const titleEl = document.getElementById('list-title');
    if (titleEl) titleEl.textContent = 'Anime Vietsub';
    document.getElementById('search-input')?.value && (document.getElementById('search-input').value = '');
    document.getElementById('search-input-mobile')?.value && (document.getElementById('search-input-mobile').value = '');
    navigateTo('main-site');
    window.scrollTo({top:0, behavior:'smooth'});
    const host = document.getElementById('movie-grid-container');
    if (host) host.innerHTML = '<div class="col-span-full py-16 text-center text-gray-400">Đang tải Anime Vietsub từ AniMapper...</div>';
    try {
      const data = await search('', 0);
      const items = results(data);
      if (!items.length) throw new Error('AniMapper không trả về Anime.');
      const byId = new Map(items.map(item => [Number(item.id), item]));
      host.innerHTML = items.map(card).join('');
      host.querySelectorAll('[data-animapper-id]').forEach(el => {
        const item = byId.get(Number(el.dataset.animapperId));
        el.addEventListener('click', e => { if (!e.target.closest('button')) window.roflixAnime?.info?.(toAnime(item), 'Nguồn catalog: AniMapper • Provider Vietsub: ANIMEVIETSUB'); });
        el.querySelector('[data-rf-am-watch]')?.addEventListener('click', e => { e.stopPropagation(); window.roflixAnime?.watch?.(toAnime(item)); });
        el.querySelector('[data-rf-am-info]')?.addEventListener('click', e => { e.stopPropagation(); window.roflixAnime?.info?.(toAnime(item), 'Nguồn catalog: AniMapper • Provider Vietsub: ANIMEVIETSUB'); });
      });
      document.getElementById('movie-count')?.replaceChildren(document.createTextNode(String(data.total || items.length)));
      document.getElementById('pagination-container')?.replaceChildren();
    } catch (e) {
      if (host) host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Không tải được Anime</h3><p>${esc(e.message || 'AniMapper không phản hồi.')}</p></div></div>`;
    }
  }

  function install() {
    if (!wrappedSearch && typeof window.handleSearch === 'function') {
      const original = window.handleSearch;
      window.handleSearch = function () {
        const input = document.getElementById('search-input');
        const q = text(input?.value);
        if (!q || !window.__ROFLIX_ANIME_MODE__) return original.apply(this, arguments);
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(async () => {
          searchKeyword = q;
          navigateTo('main-site');
          document.getElementById('list-title').textContent = `Anime Vietsub: "${q}"`;
          document.querySelectorAll('#weekly-section, #random-panel-wrap, #reco-section').forEach(el => { if (el) el.style.display = 'none'; });
          try { await renderAniMapperResults(q, false); } catch (e) { console.warn('[AniMapper search]', e); }
        }, 250);
      };
      wrappedSearch = true;
    }
    if (!wrappedGenre && typeof window.filterByGenre === 'function') {
      const originalGenre = window.filterByGenre;
      window.filterByGenre = function (slug, title) {
        if (String(slug || '').toLowerCase() === 'anime' || String(title || '').trim().toUpperCase() === 'ANIME') return openAnimeGenre();
        return originalGenre.apply(this, arguments);
      };
      wrappedGenre = true;
    }
    return wrappedSearch || wrappedGenre;
  }

  function boot() {
    if (install()) return;
    setTimeout(install, 300);
    setTimeout(install, 1200);
    setTimeout(install, 2500);
  }
  window.roflixAnimeMapperDiscovery = {search, openAnimeGenre};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
