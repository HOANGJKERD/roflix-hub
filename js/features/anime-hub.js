/* RoFlix Anime Catalog 3.0
 * Shell/layout stays untouched.
 * Playback source: KKPhim + VSMOV only.
 * Metadata enrichment: AniList + Jikan.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIME_HUB__) return;
  window.__ROFLIX_ANIME_HUB__ = true;

  const PAGE_SIZE = 24;
  const SOURCE_IDS = ['kkphim', 'vsmov'];
  const ANILIST_URL = 'https://graphql.anilist.co';
  const JIKAN_URL = 'https://api.jikan.moe/v4';
  const providerState = new Map();
  const metadataCache = new Map();
  const catalog = [];
  const seen = new Set();
  let jikanNextAt = 0;

  const ANILIST_QUERY = `
    query ($search:String) {
      Page(page:1, perPage:6) {
        media(search:$search, type:ANIME, isAdult:false, sort:SEARCH_MATCH) {
          id
          idMal
          title { romaji english native userPreferred }
          format
          status
          episodes
          averageScore
          genres
          countryOfOrigin
          seasonYear
          description(asHtml:false)
          coverImage { large extraLarge }
          siteUrl
        }
      }
    }
  `;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
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

  function isAnimeItem(movie) {
    const cats = rawNames(movie, ['category', 'categories']);
    const countries = rawNames(movie, ['country', 'countries', 'region', 'regions']);
    const keywords = rawNames(movie, ['keyword', 'keywords', 'tags']);
    const type = normalize(movie?.type);
    const tmdbType = normalize(movie?.tmdb?.type);
    const animation = cats.some(v => v.includes('hoat hinh') || v === 'anime') || type === 'hoathinh' || tmdbType === 'animation';
    if (!animation) return false;
    return keywords.some(v => v.includes('anime')) || countries.some(v => /nhat ban|trung quoc|han quoc|dai loan/.test(v));
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
      if (!item?.slug || !isAnimeItem(item)) continue;
      item._src = sid;
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key); catalog.push(item); added++;
    }
    return added;
  }

  async function fetchProviderPage(sid, page) {
    const key = sid + ':' + page;
    if (providerState.has(key)) return providerState.get(key);
    const promise = (async () => {
      try {
        const data = await fetchJson(srcListUrl(`/the-loai/hoat-hinh?page=${page}`, sid));
        const wrapped = unwrapList(data);
        const pagination = wrapped.pag || {};
        return {
          sid, page, items: Array.isArray(wrapped.items) ? wrapped.items : [],
          totalPages: Number(pagination.totalPages || data.last_page || data.total_pages || 1) || 1,
          ok: true
        };
      } catch (error) {
        console.warn('[RoFlix Anime 3.0] provider failed', sid, page, error);
        return { sid, page, items:[], totalPages:page, ok:false };
      }
    })();
    providerState.set(key, promise);
    return promise;
  }

  async function ensureCatalog(targetCount) {
    let page = 1, stalled = 0;
    while (catalog.length < targetCount && page <= 60) {
      const results = await Promise.all(SOURCE_IDS.map(sid => fetchProviderPage(sid, page)));
      let added = 0, anyMore = false;
      for (const result of results) {
        added += addRawMovies(result.items, result.sid);
        if (result.page < result.totalPages) anyMore = true;
      }
      stalled = added ? 0 : stalled + 1;
      if (!anyMore || stalled >= 4) break;
      page++;
    }
    return { hasMore: page <= 60 && SOURCE_IDS.some(sid => !providerState.has(sid + ':' + page)) };
  }

  function animeTitle(item) { return text(item?.name || item?.origin_name || item?.slug); }

  function titleVariants(item) {
    return [...new Set([item?.name, item?.origin_name, item?.slug].map(text).filter(Boolean))];
  }

  function scoreMatch(provider, ani) {
    const p = normalize(provider?.name || provider?.origin_name || provider?.slug);
    if (!p || !ani) return -1;
    const titles = [ani.title?.userPreferred, ani.title?.english, ani.title?.romaji, ani.title?.native].map(normalize).filter(Boolean);
    let score = 0;
    for (const t of titles) {
      if (p === t) score = Math.max(score, 100);
      else if (p.includes(t) || t.includes(p)) score = Math.max(score, 82);
      else {
        const a = new Set(p.split(' ')), b = new Set(t.split(' '));
        let common = 0; a.forEach(w => { if (w.length > 1 && b.has(w)) common++; });
        score = Math.max(score, Math.min(72, common * 12));
      }
    }
    const py = Number(provider?.year || 0), ay = Number(ani?.seasonYear || 0);
    if (py && ay) score += py === ay ? 18 : Math.abs(py - ay) === 1 ? 7 : -15;
    return score;
  }

  async function anilistSearch(provider) {
    const cacheKey = 'al:' + normalize(animeTitle(provider));
    if (metadataCache.has(cacheKey)) return metadataCache.get(cacheKey);
    const queryTitle = titleVariants(provider)[0];
    if (!queryTitle) return null;
    try {
      const r = await fetch(ANILIST_URL, {
        method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({query:ANILIST_QUERY, variables:{search:queryTitle}})
      });
      if (!r.ok) throw new Error('AniList ' + r.status);
      const json = await r.json();
      const candidates = json?.data?.Page?.media || [];
      const best = candidates.map(a => ({a, score:scoreMatch(provider,a)})).sort((x,y) => y.score-x.score)[0];
      const value = best && best.score >= 65 ? best.a : null;
      metadataCache.set(cacheKey, value);
      return value;
    } catch (e) {
      console.warn('[RoFlix Anime 3.0] AniList metadata failed', e);
      return null;
    }
  }

  async function jikanGet(malId) {
    if (!malId) return null;
    const wait = Math.max(0, jikanNextAt - Date.now());
    if (wait) await sleep(wait);
    jikanNextAt = Date.now() + 360;
    try {
      const r = await fetch(`${JIKAN_URL}/anime/${encodeURIComponent(malId)}/full`, {headers:{'Accept':'application/json'}});
      if (!r.ok) throw new Error('Jikan ' + r.status);
      const json = await r.json();
      return json?.data || null;
    } catch (e) {
      console.warn('[RoFlix Anime 3.0] Jikan metadata failed', e);
      return null;
    }
  }

  async function enrich(provider) {
    const key = dedupeKey(provider);
    if (metadataCache.has('meta:' + key)) return metadataCache.get('meta:' + key);
    const ani = await anilistSearch(provider);
    const mal = await jikanGet(ani?.idMal);
    const value = {ani, mal};
    metadataCache.set('meta:' + key, value);
    return value;
  }

  const ANIMAPPER_URL = 'https://api.animapper.net/api/v1';

  async function aniMapperJson(path) {
    const r = await fetch(ANIMAPPER_URL + path, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('AniMapper ' + r.status);
    return r.json();
  }

  function firstValue(obj, keys) {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of keys) if (obj[key] != null && String(obj[key]).trim()) return String(obj[key]).trim();
    return '';
  }

  function findMediaId(data) {
    const list = Array.isArray(data) ? data : (data?.data || data?.results || data?.items || data?.media || []);
    const item = Array.isArray(list) ? list[0] : null;
    return firstValue(item, ['id','mediaId','aniId','anilistId','malId']) || firstValue(data, ['id','mediaId']);
  }

  function findEpisodeList(data) {
    const list = Array.isArray(data) ? data : (data?.data || data?.results || data?.episodes || data?.items || []);
    return Array.isArray(list) ? list : [];
  }

  function episodeIdOf(ep) {
    return firstValue(ep, ['episodeId','id','episode_id','numberId','episodeData']);
  }

  function sourceUrlOf(data) {
    const candidates = [];
    const walk = value => {
      if (!value || candidates.length > 20) return;
      if (typeof value === 'string') {
        if (/^https?:\\/\\//i.test(value)) candidates.push(value);
        return;
      }
      if (Array.isArray(value)) return value.forEach(walk);
      if (typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk(data);
    return candidates.find(u => /\\.(html?|php)(?:[?#]|$)/i.test(u)) || candidates.find(u => !/\\.(m3u8|mp4)(?:[?#]|$)/i.test(u)) || '';
  }

  async function playAnimeViaAniMapper(item) {
    const title = animeTitle(item);
    if (!title) throw new Error('Anime không có tiêu đề');
    const search = await aniMapperJson('/search?title=' + encodeURIComponent(title) + '&mediaType=ANIME');
    let mediaId = findMediaId(search);
    if (!mediaId) throw new Error('AniMapper không tìm thấy anime');

    let episodeData = '';
    try {
      const meta = await aniMapperJson('/metadata?id=' + encodeURIComponent(mediaId));
      const metaId = firstValue(meta?.data || meta, ['id','mediaId']) || mediaId;
      const providers = meta?.providers || meta?.data?.providers || [];
      const provider = Array.isArray(providers) ? providers.find(p => /ANIMEVIETSUB/i.test(firstValue(p, ['name','id','provider']))) : null;
      if (provider) mediaId = firstValue(provider, ['mediaId','id']) || mediaId;
      void metaId;
    } catch (_) {}

    const epJson = await aniMapperJson('/stream/episodes?id=' + encodeURIComponent(mediaId) + '&provider=ANIMEVIETSUB');
    const episodes = findEpisodeList(epJson);
    const firstEp = episodes[0];
    const rawEp = episodeIdOf(firstEp);
    if (!rawEp) throw new Error('AnimeVietSub chưa có tập trên AniMapper');
    episodeData = String(rawEp).includes('
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const b = [];
    if (page > 1) b.push(`<button onclick="window.roflixAnime.open(${page-1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`);
    b.push(`<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">${page}</button>`);
    if (hasMore) {
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page+1}</button>`);
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`);
    }
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${b.join('')}</div>`;
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!movies.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-film"></i></div><h3>Chưa có Anime phù hợp</h3><p>Không tìm thấy Anime trong KKPhim/VSMOV.</p></div></div>`;
      return;
    }
    const mapped = movies.map(item => mapMovieData(item)).filter(m => isValidPosterUrl(m.poster));
    host.innerHTML = mapped.map((m, i) => `
      <div class="movie-card-premium card-stagger" data-rf-anime-card="${i}" data-rf-slug="${esc(m.slug)}" data-rf-src="${esc(m._src || '')}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch="1"><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions">
              <button data-rf-fav="1" title="Yêu thích"><i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i></button>
              <button data-rf-info="1" title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button>
            </div>
          </div>
          <div class="card-badges">
            <span class="src-chip">${esc((m._src || '').toUpperCase())}</span>
            <span class="badge" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff">ANIME</span>
            <span class="badge eps" data-rf-eps>${Number(m.episode_total) > 1 ? esc(m.episode_total + ' Tập') : 'HD'}</span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title" data-rf-title>${esc(m.title)}</div>
          <div class="card-meta"><span class="rating" data-rf-rating><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')}</span><span data-rf-year>${esc(m.year)}</span></div>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-anime-card]').forEach((card, i) => {
      const sourceItem = movies[i];
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        viewMovieDetail(sourceItem.slug, sourceItem._src || '');
      });
      card.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); }
      });
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => { e.stopPropagation(); playAnimeViaAniMapper(sourceItem).catch(err => { console.warn('[RoFlix Anime] AniMapper playback failed, fallback provider', err); playMovie(sourceItem.slug, sourceItem._src || ''); }); });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => { e.stopPropagation(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); });
      card.querySelector('[data-rf-fav]')?.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(sourceItem.slug); });
      enrich(sourceItem).then(meta => {
        if (!meta) return;
        const title = meta.ani?.title?.userPreferred || meta.ani?.title?.english || meta.ani?.title?.romaji;
        const score = meta.ani?.averageScore ? Number(meta.ani.averageScore) / 10 : Number(meta.mal?.score || 0);
        const year = meta.ani?.seasonYear || meta.mal?.year;
        if (title) card.querySelector('[data-rf-title]').textContent = title;
        if (score) card.querySelector('[data-rf-rating]').innerHTML = `<i class="fa-solid fa-star"></i> ${score.toFixed(1)} <span class="text-[9px] opacity-60">AL</span>`;
        if (year) card.querySelector('[data-rf-year]').textContent = String(year);
      }).catch(() => {});
    });
  }

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = ''; currentGenreSlug = ''; currentCountrySlug = ''; homePriorityMode = false; currentListEndpoint = 'phim-moi-cap-nhat'; currentPage = page;
    const title = document.getElementById('list-title'); if (title) title.textContent = 'Anime';
    document.getElementById('search-input')?.setAttribute('value','');
    const si = document.getElementById('search-input'); const sm = document.getElementById('search-input-mobile'); if (si) si.value=''; if (sm) sm.value='';
    navigateTo('main-site'); window.scrollTo({top:0, behavior:'smooth'});
    host.innerHTML = Array(12).fill(0).map(() => `<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('');
    const result = await ensureCatalog(page * PAGE_SIZE + 1);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);
    totalItems = catalog.length; totalPages = result.hasMore ? page + 1 : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));
    const count = document.getElementById('movie-count'); if (count) count.textContent = String(catalog.length);
    renderCards(movies); renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;
    const card = document.createElement('button');
    card.type = 'button'; card.id = 'rf-topic-anime'; card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
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
    style.textContent = `#rf-topic-anime{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#7c3aed,#db2777)!important}#rf-topic-anime:hover{box-shadow:0 12px 28px rgba(124,58,237,.28)}#rf-genre-anime-desktop,#rf-genre-anime-mobile{font-weight:900}`;
    document.head.appendChild(style);
  }

  function boot() {
    css(); addTopicCard(); addGenreLink();
    setTimeout(addTopicCard,300); setTimeout(addGenreLink,300); setTimeout(addTopicCard,1200); setTimeout(addGenreLink,1200);
  }

  window.roflixAnime = {open};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
) ? String(rawEp) : String(mediaId) + '
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const b = [];
    if (page > 1) b.push(`<button onclick="window.roflixAnime.open(${page-1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`);
    b.push(`<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">${page}</button>`);
    if (hasMore) {
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page+1}</button>`);
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`);
    }
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${b.join('')}</div>`;
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!movies.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-film"></i></div><h3>Chưa có Anime phù hợp</h3><p>Không tìm thấy Anime trong KKPhim/VSMOV.</p></div></div>`;
      return;
    }
    const mapped = movies.map(item => mapMovieData(item)).filter(m => isValidPosterUrl(m.poster));
    host.innerHTML = mapped.map((m, i) => `
      <div class="movie-card-premium card-stagger" data-rf-anime-card="${i}" data-rf-slug="${esc(m.slug)}" data-rf-src="${esc(m._src || '')}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch="1"><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions">
              <button data-rf-fav="1" title="Yêu thích"><i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i></button>
              <button data-rf-info="1" title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button>
            </div>
          </div>
          <div class="card-badges">
            <span class="src-chip">${esc((m._src || '').toUpperCase())}</span>
            <span class="badge" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff">ANIME</span>
            <span class="badge eps" data-rf-eps>${Number(m.episode_total) > 1 ? esc(m.episode_total + ' Tập') : 'HD'}</span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title" data-rf-title>${esc(m.title)}</div>
          <div class="card-meta"><span class="rating" data-rf-rating><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')}</span><span data-rf-year>${esc(m.year)}</span></div>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-anime-card]').forEach((card, i) => {
      const sourceItem = movies[i];
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        viewMovieDetail(sourceItem.slug, sourceItem._src || '');
      });
      card.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); }
      });
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => { e.stopPropagation(); playMovie(sourceItem.slug, sourceItem._src || ''); });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => { e.stopPropagation(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); });
      card.querySelector('[data-rf-fav]')?.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(sourceItem.slug); });
      enrich(sourceItem).then(meta => {
        if (!meta) return;
        const title = meta.ani?.title?.userPreferred || meta.ani?.title?.english || meta.ani?.title?.romaji;
        const score = meta.ani?.averageScore ? Number(meta.ani.averageScore) / 10 : Number(meta.mal?.score || 0);
        const year = meta.ani?.seasonYear || meta.mal?.year;
        if (title) card.querySelector('[data-rf-title]').textContent = title;
        if (score) card.querySelector('[data-rf-rating]').innerHTML = `<i class="fa-solid fa-star"></i> ${score.toFixed(1)} <span class="text-[9px] opacity-60">AL</span>`;
        if (year) card.querySelector('[data-rf-year]').textContent = String(year);
      }).catch(() => {});
    });
  }

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = ''; currentGenreSlug = ''; currentCountrySlug = ''; homePriorityMode = false; currentListEndpoint = 'phim-moi-cap-nhat'; currentPage = page;
    const title = document.getElementById('list-title'); if (title) title.textContent = 'Anime';
    document.getElementById('search-input')?.setAttribute('value','');
    const si = document.getElementById('search-input'); const sm = document.getElementById('search-input-mobile'); if (si) si.value=''; if (sm) sm.value='';
    navigateTo('main-site'); window.scrollTo({top:0, behavior:'smooth'});
    host.innerHTML = Array(12).fill(0).map(() => `<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('');
    const result = await ensureCatalog(page * PAGE_SIZE + 1);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);
    totalItems = catalog.length; totalPages = result.hasMore ? page + 1 : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));
    const count = document.getElementById('movie-count'); if (count) count.textContent = String(catalog.length);
    renderCards(movies); renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;
    const card = document.createElement('button');
    card.type = 'button'; card.id = 'rf-topic-anime'; card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
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
    style.textContent = `#rf-topic-anime{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#7c3aed,#db2777)!important}#rf-topic-anime:hover{box-shadow:0 12px 28px rgba(124,58,237,.28)}#rf-genre-anime-desktop,#rf-genre-anime-mobile{font-weight:900}`;
    document.head.appendChild(style);
  }

  function boot() {
    css(); addTopicCard(); addGenreLink();
    setTimeout(addTopicCard,300); setTimeout(addGenreLink,300); setTimeout(addTopicCard,1200); setTimeout(addGenreLink,1200);
  }

  window.roflixAnime = {open};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
 + String(rawEp);

    const source = await aniMapperJson('/stream/source?episodeData=' + encodeURIComponent(episodeData) + '&provider=ANIMEVIETSUB&server=HDX');
    const embed = sourceUrlOf(source);
    if (!embed) throw new Error('AniMapper không trả về EMBED URL');
    currentEpisodeList = episodes.map((ep, i) => ({ name: firstValue(ep, ['number','episodeNumber','title']) || String(i + 1), link: i === 0 ? embed : '' }));
    currentMovieTitle = title;
    playMovieByLink(embed, title, firstValue(firstEp, ['number','episodeNumber','title']) || '1');
  }

  function renderPagination(page, hasMore) {
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const b = [];
    if (page > 1) b.push(`<button onclick="window.roflixAnime.open(${page-1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">‹</button>`);
    b.push(`<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">${page}</button>`);
    if (hasMore) {
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">${page+1}</button>`);
      b.push(`<button onclick="window.roflixAnime.open(${page+1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm">›</button>`);
    }
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${b.join('')}</div>`;
  }

  function renderCards(movies) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    if (!movies.length) {
      host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-film"></i></div><h3>Chưa có Anime phù hợp</h3><p>Không tìm thấy Anime trong KKPhim/VSMOV.</p></div></div>`;
      return;
    }
    const mapped = movies.map(item => mapMovieData(item)).filter(m => isValidPosterUrl(m.poster));
    host.innerHTML = mapped.map((m, i) => `
      <div class="movie-card-premium card-stagger" data-rf-anime-card="${i}" data-rf-slug="${esc(m.slug)}" data-rf-src="${esc(m._src || '')}" tabindex="0" role="button">
        <div class="card-poster">
          <img src="${esc(m.poster)}" alt="${esc(m.title)}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-watch="1"><i class="fa-solid fa-play"></i> Xem Ngay</button>
            <div class="card-actions">
              <button data-rf-fav="1" title="Yêu thích"><i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i></button>
              <button data-rf-info="1" title="Chi tiết"><i class="fa-solid fa-circle-info"></i></button>
            </div>
          </div>
          <div class="card-badges">
            <span class="src-chip">${esc((m._src || '').toUpperCase())}</span>
            <span class="badge" style="background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff">ANIME</span>
            <span class="badge eps" data-rf-eps>${Number(m.episode_total) > 1 ? esc(m.episode_total + ' Tập') : 'HD'}</span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-title" data-rf-title>${esc(m.title)}</div>
          <div class="card-meta"><span class="rating" data-rf-rating><i class="fa-solid fa-star"></i> ${esc(m.rating || 'N/A')}</span><span data-rf-year>${esc(m.year)}</span></div>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-rf-anime-card]').forEach((card, i) => {
      const sourceItem = movies[i];
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        viewMovieDetail(sourceItem.slug, sourceItem._src || '');
      });
      card.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); }
      });
      card.querySelector('[data-rf-watch]')?.addEventListener('click', e => { e.stopPropagation(); playMovie(sourceItem.slug, sourceItem._src || ''); });
      card.querySelector('[data-rf-info]')?.addEventListener('click', e => { e.stopPropagation(); viewMovieDetail(sourceItem.slug, sourceItem._src || ''); });
      card.querySelector('[data-rf-fav]')?.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(sourceItem.slug); });
      enrich(sourceItem).then(meta => {
        if (!meta) return;
        const title = meta.ani?.title?.userPreferred || meta.ani?.title?.english || meta.ani?.title?.romaji;
        const score = meta.ani?.averageScore ? Number(meta.ani.averageScore) / 10 : Number(meta.mal?.score || 0);
        const year = meta.ani?.seasonYear || meta.mal?.year;
        if (title) card.querySelector('[data-rf-title]').textContent = title;
        if (score) card.querySelector('[data-rf-rating]').innerHTML = `<i class="fa-solid fa-star"></i> ${score.toFixed(1)} <span class="text-[9px] opacity-60">AL</span>`;
        if (year) card.querySelector('[data-rf-year]').textContent = String(year);
      }).catch(() => {});
    });
  }

  async function open(page = 1) {
    page = Math.max(1, Number(page) || 1);
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = ''; currentGenreSlug = ''; currentCountrySlug = ''; homePriorityMode = false; currentListEndpoint = 'phim-moi-cap-nhat'; currentPage = page;
    const title = document.getElementById('list-title'); if (title) title.textContent = 'Anime';
    document.getElementById('search-input')?.setAttribute('value','');
    const si = document.getElementById('search-input'); const sm = document.getElementById('search-input-mobile'); if (si) si.value=''; if (sm) sm.value='';
    navigateTo('main-site'); window.scrollTo({top:0, behavior:'smooth'});
    host.innerHTML = Array(12).fill(0).map(() => `<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`).join('');
    const result = await ensureCatalog(page * PAGE_SIZE + 1);
    const start = (page - 1) * PAGE_SIZE;
    const movies = catalog.slice(start, start + PAGE_SIZE);
    totalItems = catalog.length; totalPages = result.hasMore ? page + 1 : Math.max(page, Math.ceil(catalog.length / PAGE_SIZE));
    const count = document.getElementById('movie-count'); if (count) count.textContent = String(catalog.length);
    renderCards(movies); renderPagination(page, result.hasMore || start + PAGE_SIZE < catalog.length);
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;
    const card = document.createElement('button');
    card.type = 'button'; card.id = 'rf-topic-anime'; card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
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
    style.textContent = `#rf-topic-anime{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#7c3aed,#db2777)!important}#rf-topic-anime:hover{box-shadow:0 12px 28px rgba(124,58,237,.28)}#rf-genre-anime-desktop,#rf-genre-anime-mobile{font-weight:900}`;
    document.head.appendChild(style);
  }

  function boot() {
    css(); addTopicCard(); addGenreLink();
    setTimeout(addTopicCard,300); setTimeout(addGenreLink,300); setTimeout(addTopicCard,1200); setTimeout(addGenreLink,1200);
  }

  window.roflixAnime = {open};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
