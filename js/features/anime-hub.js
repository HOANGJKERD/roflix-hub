/* RoFlix Anime Hub
 * Additive feature: keeps the existing RoFlix shell/layout intact.
 * Anime catalog is sourced only from the existing movie providers and
 * filtered to animation titles that are anime/donghua-style entries.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIME_HUB__) return;
  window.__ROFLIX_ANIME_HUB__ = true;

  const PAGE_SIZE = 24;
  const SOURCE_IDS = ['kkphim', 'vsmov'];
  const providerState = new Map();
  const catalog = [];
  const seen = new Set();

  function text(value) {
    return String(value || '').trim();
  }

  function normalize(value) {
    return text(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function listNames(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.name || item.slug || item.title || '';
        return '';
      }).map(text).filter(Boolean);
    }
    return [text(value)].filter(Boolean);
  }

  function rawNames(movie, fields) {
    const values = [];
    for (const field of fields) values.push(...listNames(movie?.[field]));
    return values;
  }

  function isAnimeItem(movie) {
    const categories = rawNames(movie, ['category', 'categories']).map(normalize);
    const countries = rawNames(movie, ['country', 'countries', 'region', 'regions']).map(normalize);
    const keywords = rawNames(movie, ['keyword', 'keywords', 'tags']).map(normalize);
    const type = normalize(movie?.type);
    const tmdbType = normalize(movie?.tmdb?.type);

    const isAnimation =
      categories.some(v => v === 'hoat hinh' || v.includes('hoat hinh')) ||
      type === 'hoathinh' ||
      tmdbType === 'animation';

    if (!isAnimation) return false;

    const explicitAnime = keywords.some(v => v === 'anime' || v.includes('anime'));
    const asianAnimation = countries.some(v =>
      v.includes('nhat ban') ||
      v.includes('trung quoc') ||
      v.includes('han quoc') ||
      v.includes('dai loan')
    );

    return explicitAnime || asianAnimation;
  }

  function dedupeKey(movie) {
    const imdb = text(movie?.imdb?.id);
    const tmdb = text(movie?.tmdb?.id);
    if (imdb) return 'imdb:' + imdb;
    if (tmdb) return 'tmdb:' + tmdb;
    const title = normalize(movie?.name || movie?.origin_name || movie?.slug);
    const year = text(movie?.year);
    return 'title:' + title + ':' + year;
  }

  function addRawMovies(items, sid) {
    let added = 0;
    for (const item of items || []) {
      if (!item || !item.slug || !isAnimeItem(item)) continue;
      item._src = sid;
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push(item);
      added++;
    }
    return added;
  }

  async function fetchProviderPage(sid, page) {
    const key = sid + ':' + page;
    if (providerState.has(key)) return providerState.get(key);

    const promise = (async () => {
      try {
        const url = srcListUrl(`/the-loai/hoat-hinh?page=${page}`, sid);
        const data = await fetchJson(url);
        const wrapped = unwrapList(data);
        const items = Array.isArray(wrapped.items) ? wrapped.items : [];
        const pagination = wrapped.pag || {};
        const totalPages = Number(
          pagination.totalPages || data.last_page || data.total_pages || 1
        ) || 1;
        const totalItems = Number(
          pagination.totalItems || data.total || 0
        ) || 0;

        return {
          sid,
          page,
          items,
          totalPages,
          totalItems,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix Anime] provider failed:', sid, page, error);
        return {
          sid,
          page,
          items: [],
          totalPages: page,
          totalItems: 0,
          ok: false
        };
      }
    })();

    providerState.set(key, promise);
    return promise;
  }

  async function ensureCatalog(targetCount) {
    let page = 1;
    let stalledRounds = 0;

    while (catalog.length < targetCount && page <= 60) {
      const results = await Promise.all(
        SOURCE_IDS.map(sid => fetchProviderPage(sid, page))
      );

      let added = 0;
      let anyProviderHasMore = false;

      for (const result of results) {
        added += addRawMovies(result.items, result.sid);
        if (result.page < result.totalPages) anyProviderHasMore = true;
      }

      if (added === 0) stalledRounds++;
      else stalledRounds = 0;

      if (!anyProviderHasMore) break;
      if (stalledRounds >= 4) break;

      page++;
    }

    return {
      hasMore: page <= 60 && SOURCE_IDS.some(sid => {
        const state = providerState.get(sid + ':' + page);
        return !state;
      })
    };
  }

  function renderPagination(page, hasMore) {
    const host = document.getElementById('pagination-container');
    if (!host) return;

    const buttons = [];
    if (page > 1) {
      buttons.push(
        `<button onclick="window.roflixAnime.open(${page - 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">‹</button>`
      );
    }

    buttons.push(
      `<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm transition">${page}</button>`
    );

    if (hasMore) {
      buttons.push(
        `<button onclick="window.roflixAnime.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">${page + 1}</button>`
      );
      buttons.push(
        `<button onclick="window.roflixAnime.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">›</button>`
      );
    }

    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${buttons.join('')}</div>`;
  }

  function renderCards(movies) {
    const container = document.getElementById('movie-grid-container');
    if (!container) return;

    if (!movies.length) {
      container.innerHTML = `
        <div class="col-span-full">
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-film"></i></div>
            <h3>Chưa có Anime phù hợp</h3>
            <p>RoFlix chưa nhận được dữ liệu Anime từ các nguồn phim hiện tại.</p>
          </div>
        </div>
      `;
      return;
    }

    const mapped = movies
      .map(item => mapMovieData(item))
      .filter(movie => isValidPosterUrl(movie.poster));

    container.innerHTML = mapped.map(m => `
      <div onclick="viewMovieDetail('${m.slug}', '${m._src || ''}')" class="movie-card-premium card-stagger">
        <div class="card-poster">
          <img src="${m.poster}" alt="${escapeHtml(m.title)}" loading="lazy" decoding="async"
               onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=No+Image'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" onclick="event.stopPropagation(); playMovie('${m.slug}', '${m._src || ''}')">
              <i class="fa-solid fa-play"></i> Xem Ngay
            </button>
            <div class="card-actions">
              <button onclick="event.stopPropagation(); toggleFavorite('${m.slug}')" title="Yêu thích">
                <i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i>
              </button>
              <button onclick="event.stopPropagation(); viewMovieDetail('${m.slug}', '${m._src || ''}')" title="Chi tiết">
                <i class="fa-solid fa-circle-info"></i>
              </button>
            </div>
          </div>
          <div class="card-badges">
            <span class="src-chip">${escapeHtml((m._src || '').toUpperCase())}</span>
            <span class="badge" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff">ANIME</span>
            ${parseFloat(m.rating) >= 8 ? '<span class="badge hot">🔥 Hot</span>' : ''}
            ${m.episode_total > 1 ? `<span class="badge eps">${m.episode_total} Tập</span>` : '<span class="badge eps">HD</span>'}
            ${m.status === 'Hoàn thành' ? '<span class="badge" style="background:#10b981;color:#fff">✅ Full</span>' : ''}
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">${escapeHtml(m.title)}</div>
          <div class="card-meta">
            <span class="rating"><i class="fa-solid fa-star"></i> ${m.rating || 'N/A'}${m.imdbId ? ` · <a href="https://www.imdb.com/title/${m.imdbId}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="text-amber-400/80 hover:underline text-[10px]">IMDb</a>` : ''}</span>
            <span>${m.year}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const container = document.getElementById('movie-grid-container');
    if (!container) return;

    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = '';
    currentGenreSlug = '';
    currentCountrySlug = '';
    homePriorityMode = false;
    currentListEndpoint = 'phim-moi-cap-nhat';
    currentPage = page;

    const titleEl = document.getElementById('list-title');
    if (titleEl) titleEl.textContent = 'Anime';

    const si = document.getElementById('search-input');
    const sm = document.getElementById('search-input-mobile');
    if (si) si.value = '';
    if (sm) sm.value = '';

    navigateTo('main-site');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    container.innerHTML = Array(12).fill(0).map(() => `
      <div class="skeleton-card-premium">
        <div class="skeleton-poster"></div>
        <div class="skeleton-info">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join('');

    const target = page * PAGE_SIZE + 1;
    const result = await ensureCatalog(target);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);

    currentPage = page;
    totalItems = catalog.length;
    totalPages = result.hasMore ? page + 1 : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));

    const countEl = document.getElementById('movie-count');
    if (countEl) countEl.textContent = String(catalog.length);

    renderCards(movies);
    renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;

    const card = document.createElement('button');
    card.type = 'button';
    card.id = 'rf-topic-anime';
    card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
    card.addEventListener('click', () => window.roflixAnime.open(1));
    row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));
    const desktopAnimation = links.find(a =>
      a.textContent.trim() === 'Hoạt Hình' &&
      a.closest('.glass-premium') &&
      !a.closest('#mobile-menu')
    );

    if (desktopAnimation && !document.getElementById('rf-genre-anime-desktop')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-anime-desktop';
      link.className = desktopAnimation.className;
      link.innerHTML = 'ANIME';
      link.addEventListener('click', event => {
        event.preventDefault();
        window.roflixAnime.open(1);
      });
      desktopAnimation.insertAdjacentElement('afterend', link);
    }

    const mobileAnimation = links.find(a =>
      a.textContent.trim() === 'Hoạt Hình' &&
      a.closest('#mobile-menu')
    );

    if (mobileAnimation && !document.getElementById('rf-genre-anime-mobile')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-anime-mobile';
      link.className = mobileAnimation.className;
      link.innerHTML = 'ANIME';
      link.addEventListener('click', event => {
        event.preventDefault();
        window.closeMobileMenu?.();
        window.roflixAnime.open(1);
      });
      mobileAnimation.insertAdjacentElement('afterend', link);
    }
  }

  function css() {
    if (document.getElementById('rf-anime-hub-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-anime-hub-css';
    style.textContent = `
      #rf-topic-anime {
        border:1px solid rgba(255,255,255,.12);
        background:linear-gradient(135deg,#7c3aed,#db2777) !important;
      }
      #rf-topic-anime:hover {
        box-shadow:0 12px 28px rgba(124,58,237,.28);
      }
      #rf-genre-anime-desktop,
      #rf-genre-anime-mobile {
        font-weight:900;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    css();
    addTopicCard();
    addGenreLink();
    setTimeout(addTopicCard, 300);
    setTimeout(addGenreLink, 300);
    setTimeout(addTopicCard, 1200);
    setTimeout(addGenreLink, 1200);
  }

  window.roflixAnime = { open };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
