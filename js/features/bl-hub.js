/* RoFlix Đam Mỹ Catalog 1.0
 * Dedicated BL catalog using KKPhim + VSMOV playback/list data only.
 * Aggregates dedicated BL category/search routes and keeps the existing
 * movie detail/playback pipeline untouched.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_BL_HUB__) return;
  window.__ROFLIX_BL_HUB__ = true;

  const PAGE_SIZE = 24;
  const SOURCE_IDS = ['kkphim', 'vsmov'];
  const providerState = new Map();
  const catalog = [];
  const seen = new Set();

  const text = v => String(v == null ? '' : v).trim();
  const normalize = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(text(v)) : text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function listNames(value) {
    if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? v : (v?.name || v?.slug || v?.title || '')).map(text).filter(Boolean);
    return text(value) ? [text(value)] : [];
  }

  function rawNames(movie, fields) {
    return fields.flatMap(field => listNames(movie?.[field])).map(normalize);
  }

  function isBLItem(movie) {
    const fields = rawNames(movie, ['category','categories','keyword','keywords','tag','tags','type','origin_name','name']);
    const joined = fields.join(' | ');
    return /(^|[ |])dam my($|[ |])|boy love|boys love|boys-love|yaoi|danmei|dan mei|bl drama|bl series|bl phim|tinh yeu nam nam|nam nam|male love/.test(joined);
  }

  function dedupeKey(movie) {
    const imdb = text(movie?.imdb?.id), tmdb = text(movie?.tmdb?.id);
    if (imdb) return 'imdb:' + imdb;
    if (tmdb) return 'tmdb:' + tmdb;
    return 'title:' + normalize(movie?.name || movie?.origin_name || movie?.slug) + ':' + text(movie?.year);
  }

  function addRawMovies(items, sid) {
    let added = 0;
    for (const item of items || []) {
      if (!item?.slug || !isBLItem(item)) continue;
      item._src = sid;
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push(item);
      added++;
    }
    return added;
  }

  const ROUTES = [
    '/the-loai/dam-my?page=',
    '/tim-kiem?keyword=dam%20my&page=',
    '/tim-kiem?keyword=boy%20love&page=',
    '/tim-kiem?keyword=boys%20love&page=',
    '/tim-kiem?keyword=danmei&page='
  ];

  async function fetchProviderRoute(sid, route, page) {
    const key = sid + ':' + route + page;
    if (providerState.has(key)) return providerState.get(key);
    const promise = (async () => {
      try {
        const data = await fetchJson(srcListUrl(route + page, sid));
        const wrapped = unwrapList(data);
        const pagination = wrapped.pag || {};
        return {
          sid, route, page,
          items: Array.isArray(wrapped.items) ? wrapped.items : [],
          totalPages: Number(pagination.totalPages || data.last_page || data.total_pages || 1) || 1,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix BL] provider route failed', sid, route, page, error);
        return { sid, route, page, items: [], totalPages: page, ok: false };
      }
    })();
    providerState.set(key, promise);
    return promise;
  }

  async function ensureCatalog(targetCount) {
    let page = 1;
    let stalled = 0;
    while (catalog.length < targetCount && page <= 60) {
      let addedThisPage = 0;
      let anyMore = false;
      for (const route of ROUTES) {
        const results = await Promise.all(SOURCE_IDS.map(sid => fetchProviderRoute(sid, route, page)));
        for (const result of results) {
          addedThisPage += addRawMovies(result.items, result.sid);
          if (result.page < result.totalPages) anyMore = true;
        }
      }
      stalled = addedThisPage ? 0 : stalled + 1;
      if (!anyMore || stalled >= 3) break;
      page++;
    }
    return { hasMore: page < 60 && stalled < 3 };
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!movies.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-heart"></i></div><h3>Chưa có phim Đam Mỹ</h3><p>Không tìm thấy phim Đam Mỹ phù hợp trong KKPhim/VSMOV.</p></div></div>`;
      return;
    }

    const mapped = movies.map(item => mapMovieData(item)).filter(m => isValidPosterUrl(m.poster));
    host.innerHTML = mapped.map((m, i) => `
      <div class="movie-card-premium card-stagger" data-rf-bl-card="${i}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=BL'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch="1"><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions">
              <button data-rf-fav="1" title="Yêu thích"><i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i></button>
              <button data-rf-info="1" title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button>
            </div>
          </div>
          <div class="card-badges">
            <span class="src-chip">${esc((m._src || '').toUpperCase())}</span>
            <span class="badge" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff">ĐAM MỸ</span>
            <span class="badge eps">${Number(m.episode_total) > 1 ? esc(m.episode_total + ' Tập') : 'HD'}</span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">${esc(m.title)}</div>
          <div class="card-meta"><span class="rating"><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')}</span><span>${esc(m.year)}</span></div>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-bl-card]').forEach((card, i) => {
      const sourceItem = movies[i];
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        viewMovieDetail(sourceItem.slug, sourceItem._src || '');
      });
      card.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) {
          e.preventDefault();
          viewMovieDetail(sourceItem.slug, sourceItem._src || '');
        }
      });
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => {
        e.stopPropagation();
        playMovie(sourceItem.slug, sourceItem._src || '');
      });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => {
        e.stopPropagation();
        viewMovieDetail(sourceItem.slug, sourceItem._src || '');
      });
      card.querySelector('[data-rf-fav]')?.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(sourceItem.slug);
      });
    });
  }

  function renderPagination(page, hasMore) {
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const buttons = [];
    if (page > 1) buttons.push(`<button onclick="window.roflixBL.open(${page - 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`);
    buttons.push(`<button class="px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-sm">${page}</button>`);
    if (hasMore) {
      buttons.push(`<button onclick="window.roflixBL.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page + 1}</button>`);
      buttons.push(`<button onclick="window.roflixBL.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`);
    }
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${buttons.join('')}</div>`;
  }

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    window.__ROFLIX_BL_MODE__ = true;
    window.__ROFLIX_ANIME_MODE__ = false;
    searchKeyword = '';
    currentGenreSlug = '';
    currentCountrySlug = '';
    homePriorityMode = false;
    currentListEndpoint = 'phim-moi-cap-nhat';
    currentPage = page;
    const title = document.getElementById('list-title');
    if (title) title.textContent = 'Đam Mỹ';
    const si = document.getElementById('search-input');
    const sm = document.getElementById('search-input-mobile');
    if (si) si.value = '';
    if (sm) sm.value = '';
    navigateTo('main-site');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    host.innerHTML = Array(12).fill(0).map(() => `<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('');
    try {
      const result = await ensureCatalog(page * PAGE_SIZE);
      const start = (page - 1) * PAGE_SIZE;
      const movies = catalog.slice(start, start + PAGE_SIZE);
      totalItems = catalog.length;
      totalPages = Math.max(1, Math.ceil(catalog.length / PAGE_SIZE));
      currentPage = page;
      renderCards(movies);
      renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
    } catch (error) {
      console.error('[RoFlix BL] catalog failed', error);
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Không tải được Đam Mỹ</h3><p>Vui lòng thử lại sau.</p></div></div>`;
    }
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-bl')) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.id = 'rf-topic-bl';
    card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#ec4899 0%,#8b5cf6 100%)';
    card.innerHTML = '<h3>ĐAM MỸ</h3><span>Xem chủ đề ›</span>';
    card.addEventListener('click', () => open(1));
    const anime = document.getElementById('rf-topic-anime');
    if (anime) anime.insertAdjacentElement('afterend', card);
    else row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));
    const desktopAnime = document.getElementById('rf-genre-anime-desktop');
    const desktopBase = desktopAnime || links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('.glass-premium') && !a.closest('#mobile-menu'));
    if (desktopBase && !document.getElementById('rf-genre-bl-desktop')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-bl-desktop';
      link.className = desktopBase.className;
      link.textContent = 'Đam Mỹ';
      link.addEventListener('click', e => { e.preventDefault(); open(1); });
      desktopBase.insertAdjacentElement('afterend', link);
    }

    const mobileAnime = document.getElementById('rf-genre-anime-mobile');
    const mobileBase = mobileAnime || links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('#mobile-menu'));
    if (mobileBase && !document.getElementById('rf-genre-bl-mobile')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-bl-mobile';
      link.className = mobileBase.className;
      link.textContent = 'Đam Mỹ';
      link.addEventListener('click', e => { e.preventDefault(); window.closeMobileMenu?.(); open(1); });
      mobileBase.insertAdjacentElement('afterend', link);
    }
  }

  function bootUI() {
    addTopicCard();
    addGenreLink();
    setTimeout(addTopicCard, 300);
    setTimeout(addGenreLink, 300);
    setTimeout(addTopicCard, 1200);
    setTimeout(addGenreLink, 1200);
  }

  window.roflixBL = { open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootUI, { once: true });
  else bootUI();
})();
