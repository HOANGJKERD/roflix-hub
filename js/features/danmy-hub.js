/* RoFlix Đam Mỹ Catalog 2.1
 * Dedicated BL / Danmei catalog.
 * Playback source: KKPhim + VSMOV only.
 * Discovery: China/Thailand BL search + country fallback.
 * No fake/demo movie data.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_DANMY_HUB__) return;
  window.__ROFLIX_DANMY_HUB__ = true;

  const PAGE_SIZE = 24;
  const SOURCE_IDS = ['kkphim', 'vsmov'];

  // Không chỉ tìm "đam mỹ": nhiều API lưu BL dưới tên gốc/tiếng Anh/tiếng Trung/tiếng Thái.
  const SEARCH_TERMS = [
    // Trung Quốc
    'đam mỹ', 'đam my', 'danmei', '耽美', '男男', '双男主',
    '同性恋', '同性爱情', '耽美剧',
    // Thái Lan
    'boy love', 'boys love', "boy's love", 'boys-love',
    'boylove', 'boys love series', 'วาย', 'ชายรักชาย', 'ซีรีส์วาย',
    'นิยายวาย', 'BL series'
  ];

  // Fallback rộng hơn: các kho thường xếp BL vào Tình Cảm theo quốc gia.
  const ROMANCE_COUNTRIES = [
    'trung-quoc', 'thai-lan'
  ];

  const MAX_SEARCH_PAGES = 4;
  const MAX_FALLBACK_PAGES = 4;
  const providerState = new Map();
  const catalog = [];
  const seen = new Set();
  let fallbackStarted = false;

  const text = v => String(v == null ? '' : v).trim();
  const normalize = v => text(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim();

  const esc = v => typeof escapeHtml === 'function'
    ? escapeHtml(text(v))
    : text(v).replace(/[&<>"']/g, c => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
      }[c]));

  function listNames(value) {
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'string'
        ? v
        : (v?.name || v?.slug || v?.title || v?.keyword || '')
      ).map(text).filter(Boolean);
    }
    if (value && typeof value === 'object') {
      return [value.name, value.slug, value.title, value.keyword]
        .map(text).filter(Boolean);
    }
    return text(value) ? [text(value)] : [];
  }

  function searchableText(movie) {
    const fields = [
      movie?.name, movie?.origin_name, movie?.slug,
      movie?.content, movie?.description, movie?.overview,
      movie?.type, movie?.category, movie?.categories,
      movie?.keyword, movie?.keywords, movie?.tag, movie?.tags,
      movie?.country, movie?.countries, movie?.region, movie?.regions,
      movie?.tmdb?.type, movie?.tmdb?.name
    ];
    return fields.flatMap(listNames).map(normalize).join(' ');
  }

  function isDanMyItem(movie, query = '') {
    const haystack = searchableText(movie);

    // Từ khóa mạnh, bao phủ metadata phổ biến của BL/Danmei.
    const strong = [
      'dam my', 'danmei', 'boy love', 'boys love', 'boylove',
      'boys love series', 'boys love drama',
      '耽美', '男男', '双男主', '同性恋', '同性爱情', '耽美剧',
      'ชายรักชาย', 'วาย', 'ซีรีส์วาย', 'นิยายวาย'
    ];

    // Không dùng includes('bl'): BL quá ngắn và sẽ khớp nhầm trong
    // nhiều từ không liên quan. Chỉ chấp nhận BL khi là token riêng.
    const tokens = new Set(haystack.split(/\s+/).filter(Boolean));
    if (tokens.has('bl') || strong.some(k => haystack.includes(normalize(k)))) return true;

    // Query chỉ được dùng nếu đó là một cụm BL rõ ràng, không phải chuỗi ngắn.
    const q = normalize(query);
    if (!q || q.length < 4 || q === 'bl') return false;
    return strong.some(k => normalize(k) === q) && haystack.includes(q);
  }

  function dedupeKey(movie) {
    const imdb = text(movie?.imdb?.id || movie?.imdb_id);
    const tmdb = text(movie?.tmdb?.id || movie?.tmdb_id);
    if (imdb) return 'imdb:' + imdb;
    if (tmdb) return 'tmdb:' + tmdb;
    return 'title:' + normalize(movie?.name || movie?.origin_name || movie?.slug) + ':' + text(movie?.year);
  }

  function addItems(items, sid, query) {
    let added = 0;
    for (const raw of items || []) {
      if (!raw?.slug) continue;
      if (!isDanMyItem(raw, query)) continue;

      const item = raw;
      item._src = sid;
      item._danmyMatch = query || 'fallback';
      const key = dedupeKey(item);

      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push(item);
      added++;
    }
    return added;
  }

  async function fetchSearchPage(sid, query, page) {
    const key = 'search:' + sid + ':' + normalize(query) + ':' + page;
    if (providerState.has(key)) return providerState.get(key);

    const promise = (async () => {
      try {
        const path = '/tim-kiem?keyword=' + encodeURIComponent(query)
          + '&page=' + page + '&limit=64';
        const data = await fetchJson(srcListUrl(path, sid));
        const wrapped = unwrapList(data);
        const pag = wrapped.pag || {};
        return {
          sid, query, page,
          items: Array.isArray(wrapped.items) ? wrapped.items : [],
          totalPages: Number(
            pag.totalPages || pag.pageRanges || data.last_page || data.total_pages || 1
          ) || 1,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix Đam Mỹ] search failed', sid, query, page, error);
        return { sid, query, page, items: [], totalPages: page, ok: false };
      }
    })();

    providerState.set(key, promise);
    return promise;
  }

  async function fetchRomanceCountryPage(sid, country, page) {
    const key = 'romance:' + sid + ':' + country + ':' + page;
    if (providerState.has(key)) return providerState.get(key);

    const promise = (async () => {
      try {
        // KKPhim/VSMOV hỗ trợ lọc country trên endpoint thể loại.
        const path = '/the-loai/tinh-cam?country=' + encodeURIComponent(country)
          + '&page=' + page + '&limit=64';
        const data = await fetchJson(srcListUrl(path, sid));
        const wrapped = unwrapList(data);
        const pag = wrapped.pag || {};
        return {
          sid, country, page,
          items: Array.isArray(wrapped.items) ? wrapped.items : [],
          totalPages: Number(
            pag.totalPages || pag.pageRanges || data.last_page || data.total_pages || 1
          ) || 1,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix Đam Mỹ] romance fallback failed', sid, country, page, error);
        return { sid, country, page, items: [], totalPages: page, ok: false };
      }
    })();

    providerState.set(key, promise);
    return promise;
  }

  async function runSearchDiscovery(targetCount) {
    for (let page = 1; page <= MAX_SEARCH_PAGES && catalog.length < targetCount; page++) {
      const jobs = [];
      for (const query of SEARCH_TERMS) {
        for (const sid of SOURCE_IDS) jobs.push(fetchSearchPage(sid, query, page));
      }

      const results = await Promise.all(jobs);
      for (const result of results) addItems(result.items, result.sid, result.query);

      if (catalog.length >= targetCount) break;
      const hasMore = results.some(r => r.ok && r.page < r.totalPages);
      if (!hasMore) break;
    }
  }

  async function runRomanceFallback(targetCount) {
    if (fallbackStarted && catalog.length >= targetCount) return;
    fallbackStarted = true;

    for (let page = 1; page <= MAX_FALLBACK_PAGES && catalog.length < targetCount; page++) {
      const jobs = [];
      for (const country of ROMANCE_COUNTRIES) {
        for (const sid of SOURCE_IDS) jobs.push(fetchRomanceCountryPage(sid, country, page));
      }

      const results = await Promise.all(jobs);
      for (const result of results) {
        // Fallback chỉ nhận item có metadata BL/Danmei rõ ràng.
        addItems(result.items, result.sid, '');
      }

      const hasMore = results.some(r => r.ok && r.page < r.totalPages);
      if (!hasMore) break;
    }
  }

  async function ensureCatalog(targetCount) {
    await runSearchDiscovery(targetCount);

    // Nếu tìm kiếm trực tiếp không đủ, mở rộng qua Tình Cảm + các quốc gia
    // nơi BL/Danmei xuất hiện nhiều, nhưng vẫn bắt buộc metadata phải match BL.
    if (catalog.length < targetCount) {
      await runRomanceFallback(targetCount);
    }

    return {
      hasMore: catalog.length >= targetCount
        || !fallbackStarted
        || catalog.length >= PAGE_SIZE
    };
  }

  function renderPagination(page, hasMore) {
    const host = document.getElementById('pagination-container');
    if (!host) return;

    const b = [];
    if (page > 1) {
      b.push('<button onclick="window.roflixDanMy.open(' + (page - 1)
        + ')" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>');
    }

    b.push('<button class="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-sm">'
      + page + '</button>');

    if (hasMore) {
      b.push('<button onclick="window.roflixDanMy.open(' + (page + 1)
        + ')" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">'
        + (page + 1) + '</button>');
      b.push('<button onclick="window.roflixDanMy.open(' + (page + 1)
        + ')" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>');
    }

    host.innerHTML = '<div class="flex items-center justify-center gap-2 flex-wrap">'
      + b.join('') + '</div>';
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;

    if (!movies.length) {
      host.innerHTML = '<div class="col-span-full"><div class="empty-state">'
        + '<div class="empty-icon"><i class="fa-solid fa-heart"></i></div>'
        + '<h3>Chưa tìm thấy phim Đam Mỹ</h3>'
        + '<p>Chỉ hiển thị phim Trung Quốc/Thái Lan có metadata BL/Đam Mỹ rõ ràng.</p>'
        + '</div></div>';
      return;
    }

    const mapped = movies
      .map(item => mapMovieData(item))
      .filter(m => isValidPosterUrl(m.poster));

    host.innerHTML = mapped.map((m, i) => {
      const sourceItem = movies[i];
      return '<div class="movie-card-premium card-stagger" data-rf-danmy-card="' + i
        + '" tabindex="0" role="button">'
        + '<div class="card-poster">'
        + '<img src="' + esc(m.poster) + '" alt="' + esc(m.title)
        + '" loading="lazy" decoding="async" onerror="this.src=\'https://placehold.co/300x400/1a1a1a/666?text=BL\'">'
        + '<div class="card-overlay">'
        + '<button class="watch-btn btn-ripple" data-rf-watch="1"><i class="fa-solid fa-play"></i> Xem Ngay</button>'
        + '<div class="card-actions">'
        + '<button data-rf-fav="1" title="Yêu thích"><i class="fa-'
        + (isFavorite(m.slug) ? 'solid' : 'regular')
        + ' fa-heart"></i></button>'
        + '<button data-rf-info="1" title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button>'
        + '</div></div>'
        + '<div class="card-badges">'
        + '<span class="src-chip">' + esc((m._src || '').toUpperCase()) + '</span>'
        + '<span class="badge" style="background:linear-gradient(135deg,#e11d48,#be185d);color:#fff">ĐAM MỸ</span>'
        + '<span class="badge eps">' + (Number(m.episode_total) > 1
          ? esc(m.episode_total + ' Tập') : 'HD') + '</span>'
        + '</div></div>'
        + '<div class="card-info">'
        + '<div class="card-title">' + esc(m.title) + '</div>'
        + '<div class="card-meta"><span class="rating"><i class="fa-solid fa-star"></i> '
        + esc(m.rating || 'N/A') + '</span><span>' + esc(m.year) + '</span></div>'
        + '</div></div>';
    }).join('');

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

    host.innerHTML = Array(12).fill(0).map(() =>
      '<div class="skeleton-card-premium"><div class="skeleton-poster"></div>'
      + '<div class="skeleton-info"><div class="skeleton-line"></div>'
      + '<div class="skeleton-line short"></div></div></div>'
    ).join('');

    const result = await ensureCatalog(page * PAGE_SIZE + 1);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);

    totalItems = catalog.length;
    totalPages = result.hasMore
      ? page + 1
      : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));

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

    const desktop = links.find(a =>
      a.textContent.trim() === 'ANIME'
      && a.closest('.glass-premium')
      && !a.closest('#mobile-menu')
    );

    if (desktop && !document.getElementById('rf-genre-danmy-desktop')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-danmy-desktop';
      link.className = desktop.className;
      link.innerHTML = 'ĐAM MỸ';
      link.addEventListener('click', e => {
        e.preventDefault();
        window.roflixDanMy.open(1);
      });
      desktop.insertAdjacentElement('afterend', link);
    }

    const mobile = links.find(a =>
      a.textContent.trim() === 'ANIME'
      && a.closest('#mobile-menu')
    );

    if (mobile && !document.getElementById('rf-genre-danmy-mobile')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-danmy-mobile';
      link.className = mobile.className;
      link.innerHTML = 'ĐAM MỸ';
      link.addEventListener('click', e => {
        e.preventDefault();
        window.closeMobileMenu?.();
        window.roflixDanMy.open(1);
      });
      mobile.insertAdjacentElement('afterend', link);
    }
  }

  function css() {
    if (document.getElementById('rf-danmy-hub-css')) return;

    const style = document.createElement('style');
    style.id = 'rf-danmy-hub-css';
    style.textContent = `
      #rf-topic-danmy{
        border:1px solid rgba(255,255,255,.12);
        background:linear-gradient(135deg,#be123c,#7e22ce)!important
      }
      #rf-topic-danmy:hover{
        box-shadow:0 12px 28px rgba(190,18,60,.28)
      }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
