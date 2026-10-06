/* RoFlix Đam Mỹ Catalog 1.0
 * Dedicated BL / Danmei catalog.
 * Playback source: KKPhim + VSMOV only.
 * Discovery: provider search variants + metadata keyword matching.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_DANMY_HUB__) return;
  window.__ROFLIX_DANMY_HUB__ = true;

  const PAGE_SIZE = 24;
  const SOURCE_IDS = ['kkphim', 'vsmov'];
  const SEARCH_TERMS = ['đam mỹ', 'boy love', 'boys love', 'boys love series', 'danmei', 'boys\' love'];
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

  function searchableText(movie) {
    const fields = [
      movie?.name, movie?.origin_name, movie?.slug, movie?.content, movie?.description,
      movie?.type, movie?.category, movie?.categories, movie?.keyword, movie?.keywords,
      movie?.tag, movie?.tags, movie?.country, movie?.countries, movie?.region, movie?.regions
    ];
    return fields.flatMap(v => listNames(v)).map(normalize).join(' ');
  }

  function isDanMyItem(movie, query) {
    const haystack = searchableText(movie);
    const q = normalize(query);
    const strong = [
      'dam my', 'dam my trung quoc', 'boy love', 'boys love', 'boys love series',
      'danmei', 'boys love drama', 'boys love series'
    ];
    if (strong.some(k => haystack.includes(k))) return true;
    return q && haystack.includes(q);
  }

  function dedupeKey(movie) {
    const imdb = text(movie?.imdb?.id), tmdb = text(movie?.tmdb?.id);
    if (imdb) return 'imdb:' + imdb;
    if (tmdb) return 'tmdb:' + tmdb;
    return 'title:' + normalize(movie?.name || movie?.origin_name || movie?.slug) + ':' + text(movie?.year);
  }

  function addItems(items, sid, query) {
    let added = 0;
    for (const item of items || []) {
      if (!item?.slug || !isDanMyItem(item, query)) continue;
      item._src = sid;
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push(item);
      added++;
    }
    return added;
  }

  async function fetchSearchPage(sid, query, page) {
    const key = sid + ':' + normalize(query) + ':' + page;
    if (providerState.has(key)) return providerState.get(key);
    const promise = (async () => {
      try {
        const path = `/tim-kiem?keyword=${encodeURIComponent(query)}&page=${page}`;
        const data = await fetchJson(srcListUrl(path, sid));
        const wrapped = unwrapList(data);
        const pag = wrapped.pag || {};
        return {
          sid, query, page,
          items: Array.isArray(wrapped.items) ? wrapped.items : [],
          totalPages: Number(pag.totalPages || data.last_page || data.total_pages || 1) || 1,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix Đam Mỹ] provider failed', sid, query, page, error);
        return { sid, query, page, items: [], totalPages: page, ok: false };
      }
    })();
    providerState.set(key, promise);
    return promise;
  }

  async function ensureCatalog(targetCount) {
    let page = 1;
    let stalledRounds = 0;
    while (catalog.length < targetCount && page <= 20) {
      const jobs = [];
      for (const query of SEARCH_TERMS) {
        for (const sid of SOURCE_IDS) jobs.push(fetchSearchPage(sid, query, page));
      }
      const results = await Promise.all(jobs);
      let added = 0;
      let anyMore = false;
      for (const result of results) {
        added += addItems(result.items, result.sid, result.query);
        if (result.page < result.totalPages) anyMore = true;
      }
      stalledRounds = added ? 0 : stalledRounds + 1;
      if (!anyMore || stalledRounds >= 2) break;
      page++;
    }
    return { hasMore: page < 20 };
  }

  function renderPagination(page, hasMore) {
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const b = [];
    if (page > 1) b.push(`<button onclick="window.roflixDanMy.open(${page - 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`);
    b.push(`<button class="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-sm">${page}</button>`);
    if (hasMore) {
      b.push(`<button onclick="window.roflixDanMy.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page + 1}</button>`);
      b.push(`<button onclick="window.roflixDanMy.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`);
    }
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${b.join('')}</div>`;
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!movies.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-heart"></i></div><h3>Chưa có phim Đam Mỹ phù hợp</h3><p>Không tìm thấy kết quả Đam Mỹ trong KKPhim/VSMOV.</p></div></div>`;
      return;
    }
    const mapped = movies.map(item => mapMovieData(item)).filter(m => isValidPosterUrl(m.poster));
    host.innerHTML = mapped.map((m, i) => `
      <div class="movie-card-premium card-stagger" data-rf-danmy-card="${i}" tabindex="0" role="button">
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
            <span class="badge" style="background:linear-gradient(135deg,#e11d48,#be185d);color:#fff">ĐAM MỸ</span>
            <span class="badge eps">${Number(m.episode_total) > 1 ? esc(m.episode_total + ' Tập') : 'HD'}</span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">${esc(m.title)}</div>
          <div class="card-meta"><span class="rating"><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')}</span><span>${esc(m.year)}</span></div>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-danmy-card]').forEach((card, i) => {
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

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    window.__ROFLIX_DANMY_MODE__ = true;
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
    const result = await ensureCatalog(page * PAGE_SIZE + 1);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);
    totalItems = catalog.length;
    totalPages = result.hasMore ? page + 1 : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));
    const count = document.getElementById('movie-count');
    if (count) count.textContent = String(catalog.length);
    renderCards(movies);
    renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-danmy')) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.id = 'rf-topic-danmy';
    card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#be123c 0%,#7e22ce 100%)';
    card.innerHTML = '<h3>ĐAM MỸ</h3><span>Xem chủ đề ›</span>';
    card.addEventListener('click', () => window.roflixDanMy.open(1));
    row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));
    const desktop = links.find(a => a.textContent.trim() === 'ANIME' && a.closest('.glass-premium') && !a.closest('#mobile-menu'));
    if (desktop && !document.getElementById('rf-genre-danmy-desktop')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-danmy-desktop';
      link.className = desktop.className;
      link.innerHTML = 'ĐAM MỸ';
      link.addEventListener('click', e => { e.preventDefault(); window.roflixDanMy.open(1); });
      desktop.insertAdjacentElement('afterend', link);
    }
    const mobile = links.find(a => a.textContent.trim() === 'ANIME' && a.closest('#mobile-menu'));
    if (mobile && !document.getElementById('rf-genre-danmy-mobile')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-danmy-mobile';
      link.className = mobile.className;
      link.innerHTML = 'ĐAM MỸ';
      link.addEventListener('click', e => { e.preventDefault(); window.closeMobileMenu?.(); window.roflixDanMy.open(1); });
      mobile.insertAdjacentElement('afterend', link);
    }
  }

  function css() {
    if (document.getElementById('rf-danmy-hub-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-danmy-hub-css';
    style.textContent = `
      #rf-topic-danmy{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#be123c,#7e22ce)!important}
      #rf-topic-danmy:hover{box-shadow:0 12px 28px rgba(190,18,60,.28)}
      #rf-genre-danmy-desktop,#rf-genre-danmy-mobile{font-weight:900}
    `;
    document.head.appendChild(style);
  }

  window.roflixDanMy = { open };

  function boot() {
    css();
    addTopicCard();
    addGenreLink();
    setTimeout(addTopicCard, 300);
    setTimeout(addGenreLink, 300);
    setTimeout(addTopicCard, 1200);
    setTimeout(addGenreLink, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
