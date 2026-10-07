/* RoFlix Anime Hub 4.0
 * Catalog master: AniList GraphQL.
 * Playback resolver: AniMapper multi-provider.
 * KKPhim/VSMOV remain fallback playback/catalog bridges only.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIME_HUB__) return;
  window.__ROFLIX_ANIME_HUB__ = true;

  const PAGE_SIZE = 50;
  const JIKAN_PAGE_SIZE = 25;
  const ANILIST_URL = 'https://graphql.anilist.co';
  const JIKAN_URL = 'https://api.jikan.moe/v4/anime';
  const catalogCache = new Map();
  const jikanCache = new Map();
  let requestSeq = 0;

  const text = v => String(v == null ? '' : v).trim();
  const esc = v => typeof escapeHtml === 'function'
    ? escapeHtml(text(v))
    : text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titleOf = a => text(a?.title?.userPreferred || a?.title?.english || a?.title?.romaji || a?.title?.native || 'Unknown Anime');
  const altTitleOf = a => text(a?.title?.english || a?.title?.romaji || a?.title?.native || a?.title?.userPreferred || '');
  const posterOf = a => text(a?.coverImage?.extraLarge || a?.coverImage?.large || '');
  const slugOf = a => 'anilist-' + String(a?.id || '').trim();
  const descOf = a => text(a?.description).replace(/<[^>]*>/g, ' ');

  const QUERY = `
    query AnimeCatalog($page:Int!, $perPage:Int!, $search:String, $genre:String, $year:Int) {
      Page(page:$page, perPage:$perPage) {
        pageInfo { currentPage lastPage hasNextPage total }
        media(
          type:ANIME,
          isAdult:false,
          sort:POPULARITY_DESC,
          search:$search,
          genre:$genre,
          seasonYear:$year
        ) {
          id
          idMal
          title { romaji english native userPreferred }
          format
          status
          episodes
          duration
          averageScore
          genres
          countryOfOrigin
          seasonYear
          startDate { year month day }
          description(asHtml:false)
          coverImage { large extraLarge }
          bannerImage
          siteUrl
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `;

  async function jikanRequest(variables) {
    const key = JSON.stringify(variables);
    if (jikanCache.has(key)) return jikanCache.get(key);
    const qs = new URLSearchParams();
    qs.set('page', String(variables.page || 1));
    qs.set('limit', String(Math.min(JIKAN_PAGE_SIZE, 25)));
    if (variables.search) qs.set('q', variables.search);
    const p = fetch(JIKAN_URL + '?' + qs.toString(), {
      headers: {'Accept':'application/json'}
    }).then(async r => {
      if (!r.ok) throw new Error('Jikan HTTP ' + r.status);
      return r.json();
    }).catch(e => {
      jikanCache.delete(key);
      throw e;
    });
    jikanCache.set(key, p);
    return p;
  }

  function normalizeJikan(item) {
    const title = text(item?.title || item?.title_english || item?.title_japanese || 'Unknown Anime');
    const alt = text(item?.title_english || item?.title_japanese || item?.title || '');
    const poster = text(item?.images?.webp?.large_image_url || item?.images?.jpg?.large_image_url || item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '');
    const airedYear = item?.year || (item?.aired?.from ? Number(String(item.aired.from).slice(0,4)) : '');
    return {
      id: 'jikan-' + String(item?.mal_id || ''),
      idMal: Number(item?.mal_id || 0) || null,
      slug: 'jikan-' + String(item?.mal_id || ''),
      name: title,
      origin_name: alt,
      poster_url: poster,
      thumb_url: poster,
      poster,
      year: Number(airedYear || 0) || '',
      rating: item?.score ? Number(item.score).toFixed(1) : '',
      episode_total: Number(item?.episodes || 0) || '',
      type: 'anime',
      description: text(item?.synopsis),
      genres: Array.isArray(item?.genres) ? item.genres.map(g => g?.name).filter(Boolean) : [],
      format: text(item?.type),
      status: text(item?.status),
      country: '',
      duration: 0,
      banner: '',
      siteUrl: text(item?.url),
      nextEpisode: null,
      _jikan: item,
      _src: 'jikan'
    };
  }

  async function aniListRequest(variables) {
    const key = JSON.stringify(variables);
    if (catalogCache.has(key)) return catalogCache.get(key);
    const p = fetch(ANILIST_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({query:QUERY, variables})
    }).then(async r => {
      if (!r.ok) throw new Error('AniList HTTP ' + r.status);
      const json = await r.json();
      if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join('; '));
      return json?.data?.Page || {media:[], pageInfo:{}};
    }).catch(e => {
      catalogCache.delete(key);
      throw e;
    });
    catalogCache.set(key, p);
    return p;
  }

  function normalizeAni(item) {
    const title = titleOf(item);
    const alt = altTitleOf(item);
    const poster = posterOf(item);
    return {
      id: item.id,
      idMal: item.idMal,
      slug: slugOf(item),
      name: title,
      origin_name: alt,
      poster_url: poster,
      thumb_url: poster,
      poster,
      year: Number(item.seasonYear || item.startDate?.year || 0) || '',
      rating: item.averageScore ? (Number(item.averageScore) / 10).toFixed(1) : '',
      episode_total: Number(item.episodes || 0) || '',
      type: 'anime',
      description: descOf(item),
      genres: Array.isArray(item.genres) ? item.genres : [],
      format: text(item.format),
      status: text(item.status),
      country: text(item.countryOfOrigin),
      duration: Number(item.duration || 0) || 0,
      banner: text(item.bannerImage),
      siteUrl: text(item.siteUrl),
      nextEpisode: item.nextAiringEpisode?.episode || null,
      _anilist: item,
      _src: 'anilist'
    };
  }

  function renderPagination(page, info) {
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const prev = page > 1
      ? `<button onclick="window.roflixAnime.open(${page - 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`
      : '';
    const next = info?.hasNextPage
      ? `<button onclick="window.roflixAnime.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page + 1}</button><button onclick="window.roflixAnime.open(${page + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`
      : '';
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${prev}<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">${page}</button>${next}</div>`;
  }

  function closeDetail() {
    document.getElementById('rf-anime-detail')?.remove();
  }

  function showDetail(item) {
    closeDetail();
    const a = item._anilist || item;
    const genres = (item.genres || []).slice(0, 6).map(g => `<span class="px-2 py-1 rounded-full bg-white/10 text-xs">${esc(g)}</span>`).join('');
    const airing = item.nextEpisode ? `<span class="text-emerald-300">Tập kế tiếp: ${esc(item.nextEpisode)}</span>` : '';
    const root = document.createElement('div');
    root.id = 'rf-anime-detail';
    root.innerHTML = `
      <div class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="max-w-5xl mx-auto mt-8 rounded-3xl overflow-hidden bg-[#111827] border border-white/10 shadow-2xl">
          <div class="relative h-52 md:h-72 overflow-hidden">
            ${item.banner ? `<img src="${esc(item.banner)}" class="absolute inset-0 w-full h-full object-cover opacity-40">` : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-transparent"></div>
            <button data-rf-close class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white text-xl">×</button>
          </div>
          <div class="relative -mt-24 px-6 pb-7 flex flex-col md:flex-row gap-6">
            <img src="${esc(item.poster)}" class="w-36 md:w-48 aspect-[2/3] object-cover rounded-2xl shadow-xl bg-black" alt="${esc(item.name)}">
            <div class="flex-1 pt-2">
              <div class="flex flex-wrap gap-2 mb-3"><span class="px-2 py-1 rounded-full bg-violet-600 text-white text-xs font-bold">ANIME</span><span class="px-2 py-1 rounded-full bg-white/10 text-xs">${esc(item.format || 'ANIME')}</span>${airing}</div>
              <h2 class="text-2xl md:text-4xl font-black text-white">${esc(item.name)}</h2>
              <p class="text-sm text-white/60 mt-1">${esc(item.origin_name)}</p>
              <div class="flex flex-wrap gap-3 mt-3 text-sm text-white/75">
                <span>★ ${esc(item.rating || 'N/A')}</span><span>${esc(item.year || 'N/A')}</span><span>${esc(item.episode_total || '?')} tập</span><span>${esc(item.status || '')}</span>
              </div>
              <div class="flex flex-wrap gap-2 mt-4">${genres}</div>
              <p class="mt-5 text-white/75 leading-7 max-w-3xl">${esc(item.description || 'Chưa có mô tả.')}</p>
              <div class="mt-6 flex flex-wrap gap-3">
                <button data-rf-detail-watch class="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold"><i class="fa-solid fa-play"></i> Xem Anime</button>
                ${item.siteUrl ? `<a href="${esc(item.siteUrl)}" target="_blank" rel="noopener noreferrer" class="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white">AniList ↗</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.addEventListener('click', e => {
      if (e.target.closest('[data-rf-close]') || e.target === root.firstElementChild) closeDetail();
      if (e.target.closest('[data-rf-detail-watch]')) {
        closeDetail();
        window.roflixAnimePlayer?.play(item);
      }
    });
  }

  function renderCards(items, seq) {
    const host = document.getElementById('movie-grid-container');
    if (!host || seq !== requestSeq) return;
    if (!items.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-film"></i></div><h3>Không tìm thấy Anime</h3><p>Thử tên tiếng Anh, romaji hoặc tên Nhật.</p></div></div>`;
      return;
    }
    host.innerHTML = items.map((item, i) => `
      <div class="movie-card-premium card-stagger" data-rf-anime-card="${i}" data-rf-title="${esc(item.name)}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(item.poster)}" alt="${esc(item.name)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions"><button data-rf-fav title="Yêu thích"><i class="fa-${isFavorite(item.slug) ? 'solid' : 'regular'} fa-heart"></i></button><button data-rf-info title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button></div>
          </div>
          <div class="card-badges"><span class="src-chip">ANILIST</span><span class="badge" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff">ANIME</span><span class="badge eps">${item.episode_total ? esc(item.episode_total + ' Tập') : 'ON AIR'}</span></div>
        </div>
        <div class="card-info"><div class="card-title">${esc(item.name)}</div><div class="card-meta"><span class="rating"><i class="fa-solid fa-star"></i> ${esc(item.rating || 'N/A')}</span><span>${esc(item.year || '')}</span></div></div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-anime-card]').forEach((card, i) => {
      const item = items[i];
      card.addEventListener('click', e => { if (!e.target.closest('button')) showDetail(item); });
      card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); showDetail(item); }});
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => { e.stopPropagation(); window.roflixAnimePlayer?.play(item); });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => { e.stopPropagation(); showDetail(item); });
      card.querySelector('[data-rf-fav]')?.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(item.slug); });
    });
  }

  async function open(page = 1, options = {}) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    const seq = ++requestSeq;
    const search = text(options.search ?? '');
    const genre = text(options.genre ?? '');
    const year = Number(options.year || 0) || null;
    window.__ROFLIX_ANIME_MODE__ = true;
    if (typeof window.navigateTo === 'function') window.navigateTo('main-site');
    const title = document.getElementById('list-title');
    if (title) title.textContent = search ? `Anime: ${search}` : 'Anime';
    window.scrollTo({top:0, behavior:'smooth'});
    host.innerHTML = Array(12).fill(0).map(() => `<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('');
    try {
      let data;
      let items;
      try {
        data = await aniListRequest({page, perPage:PAGE_SIZE, search:search || null, genre:genre || null, year});
        items = (data.media || []).map(normalizeAni);
      } catch (aniErr) {
        console.warn('[RoFlix Anime Hub] AniList failed, using Jikan fallback', aniErr);
        const jk = await jikanRequest({page, search});
        items = (jk.data || []).map(normalizeJikan);
        data = { pageInfo: {
          currentPage: Number(jk?.pagination?.current_page || page),
          hasNextPage: Boolean(jk?.pagination?.has_next_page)
        }};
      }
      if (seq !== requestSeq) return;
      currentPage = page;
      totalPages = Number(data.pageInfo?.lastPage || 1);
      totalItems = Number(data.pageInfo?.total || items.length);
      const count = document.getElementById('movie-count'); if (count) count.textContent = String(totalItems);
      renderCards(items, seq);
      renderPagination(page, data.pageInfo || {});
    } catch (e) {
      console.error('[RoFlix Anime Hub] AniList catalog failed', e);
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Không tải được Anime</h3><p>AniList đang bận hoặc bị giới hạn truy cập. Thử lại sau.</p><button onclick="window.roflixAnime.open(${page})" class="mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white font-bold">Thử lại</button></div></div>`;
    }
  }

  function normalizeSearchTitle(v) {
    return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
      .replace(/\b(season|ss|part|phim|movie|anime|tv|series|special|ova|ona)\b/g,' ')
      .replace(/\b(19|20)\d{2}\b/g,' ')
      .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function titleTokens(v) {
    return new Set(normalizeSearchTitle(v).split(' ').filter(w => w.length > 1));
  }

  function sameSearchTitle(a, b) {
    const x = normalizeSearchTitle(a), y = normalizeSearchTitle(b);
    if (!x || !y) return false;
    if (x === y || x.includes(y) || y.includes(x)) return true;
    const A = titleTokens(x), B = titleTokens(y);
    if (!A.size || !B.size) return false;
    let common = 0;
    A.forEach(w => { if (B.has(w)) common++; });
    const overlap = common / Math.min(A.size, B.size);
    return overlap >= 0.8 && common >= 2;
  }

  async function searchResults(q) {
    const query = text(q);
    if (!query) return [];
    const [ani, jikan] = await Promise.allSettled([
      aniListRequest({page:1, perPage:50, search:query, genre:null, year:null}),
      jikanRequest({page:1, search:query})
    ]);
    const merged = [];
    const seen = new Set();
    if (ani.status === 'fulfilled') {
      for (const item of (ani.value.media || []).map(normalizeAni)) {
        const key = item.idMal ? 'mal:' + item.idMal : 'ani:' + item.id;
        if (!seen.has(key)) { seen.add(key); merged.push(item); }
      }
    }
    if (jikan.status === 'fulfilled') {
      for (const item of (jikan.value.data || []).map(normalizeJikan)) {
        const key = item.idMal ? 'mal:' + item.idMal : 'title:' + normalizeSearchTitle(item.name);
        if (seen.has(key)) continue;
        const dup = merged.some(existing => sameSearchTitle(existing.name, item.name) || sameSearchTitle(existing.origin_name, item.name));
        if (!dup) { seen.add(key); merged.push(item); }
      }
    }
    return merged;
  }

  function appendSearchResults(items) {
    const host = document.getElementById('movie-grid-container');
    if (!host || !items?.length) return 0;
    host.querySelectorAll('.empty-state').forEach(el => el.closest('.col-span-full')?.remove());

    const existing = new Set();
    host.querySelectorAll('[data-rf-title]').forEach(el => {
      const key = text(el.getAttribute('data-rf-title'));
      if (key) existing.add(key);
    });

    const unique = [];
    const seenAni = new Set();
    for (const item of items) {
      if (!item?.id || seenAni.has(item.id)) continue;
      seenAni.add(item.id);
      const names = [item.name, item.origin_name].filter(Boolean);
      let duplicate = false;
      for (const existingTitle of existing) {
        if (names.some(name => sameSearchTitle(name, existingTitle))) {
          duplicate = true;
          break;
        }
      }
      if (duplicate) continue;
      unique.push(item);
      names.forEach(name => existing.add(name));
    }
    if (!unique.length) return 0;

    const section = document.createElement('div');
    section.className = 'col-span-full mt-8 mb-2';
    section.innerHTML = '<div class="flex items-center gap-3"><span class="text-xl font-black text-white">Anime từ AniList</span><span class="px-2 py-1 rounded-full bg-violet-600/20 text-violet-300 text-xs font-bold">ANIList</span><span class="text-xs text-white/40">Không trùng các kết quả phía trên</span></div>';
    host.appendChild(section);

    const grid = document.createElement('div');
    grid.className = 'col-span-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4';
    grid.innerHTML = unique.map((item, i) => `
      <div class="movie-card-premium card-stagger" data-rf-anime-search-card="${i}" data-rf-title="${esc(item.name)}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(item.poster)}" alt="${esc(item.name)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions"><button data-rf-info title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button></div>
          </div>
          <div class="card-badges"><span class="src-chip">ANILIST</span><span class="badge" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff">ANIME</span><span class="badge eps">${item.episode_total ? esc(item.episode_total + ' Tập') : 'ON AIR'}</span></div>
        </div>
        <div class="card-info"><div class="card-title">${esc(item.name)}</div><div class="card-meta"><span class="rating"><i class="fa-solid fa-star"></i> ${esc(item.rating || 'N/A')}</span><span>${esc(item.year || '')}</span></div></div>
      </div>`;
    ).join('');

    host.appendChild(grid);
    grid.querySelectorAll('[data-rf-anime-search-card]').forEach((card, i) => {
      const item = unique[i];
      card.addEventListener('click', e => { if (!e.target.closest('button')) showDetail(item); });
      card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); showDetail(item); }});
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => { e.stopPropagation(); window.roflixAnimePlayer?.play(item); });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => { e.stopPropagation(); showDetail(item); });
    });
    return unique.length;
  }

  async function searchAndAppend(q) {
    try {
      const items = await searchResults(q);
      return appendSearchResults(items);
    } catch (e) {
      console.warn('[RoFlix Anime] AniList search bridge failed', e);
      return 0;
    }
  }

  function search(q) { return open(1, {search:q}); }
  function genre(g) { return open(1, {genre:g}); }
  function year(y) { return open(1, {year:y}); }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;
    const card = document.createElement('button');
    card.type = 'button'; card.id = 'rf-topic-anime'; card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Catalog AniList ›</span>';
    card.addEventListener('click', () => window.roflixAnime.open(1)); row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));
    const desktop = links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('.glass-premium') && !a.closest('#mobile-menu'));
    if (desktop && !document.getElementById('rf-genre-anime-desktop')) {
      const link = document.createElement('a'); link.href='#'; link.id='rf-genre-anime-desktop'; link.className=desktop.className; link.innerHTML='ANIME';
      link.addEventListener('click', e => { e.preventDefault(); window.roflixAnime.open(1); }); desktop.insertAdjacentElement('afterend', link);
    }
    const mobile = links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('#mobile-menu'));
    if (mobile && !document.getElementById('rf-genre-anime-mobile')) {
      const link = document.createElement('a'); link.href='#'; link.id='rf-genre-anime-mobile'; link.className=mobile.className; link.innerHTML='ANIME';
      link.addEventListener('click', e => { e.preventDefault(); window.closeMobileMenu?.(); window.roflixAnime.open(1); }); mobile.insertAdjacentElement('afterend', link);
    }
  }

  function css() {
    if (document.getElementById('rf-anime-hub-css')) return;
    const style = document.createElement('style'); style.id='rf-anime-hub-css';
    style.textContent = '#rf-topic-anime{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#7c3aed,#db2777)!important}#rf-topic-anime:hover{box-shadow:0 12px 28px rgba(124,58,237,.28)}#rf-genre-anime-desktop,#rf-genre-anime-mobile{font-weight:900}#rf-anime-detail button,#rf-anime-detail a{transition:transform .2s ease,background .2s ease}#rf-anime-detail button:hover,#rf-anime-detail a:hover{transform:translateY(-1px)}';
    document.head.appendChild(style);
  }

  function boot() {
    css(); addTopicCard(); addGenreLink();
    setTimeout(addTopicCard,300); setTimeout(addGenreLink,300); setTimeout(addTopicCard,1200); setTimeout(addGenreLink,1200);
  }

  window.roflixAnime = {open, search, genre, year, searchResults, searchAndAppend};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();