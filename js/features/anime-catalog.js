/* RoFlix Anime Catalog 2.0
 * Additive only: the normal RoFlix movie shell and movie APIs stay untouched.
 * AniList supplies the anime catalog/metadata. KKPhim + VSMOV are used only
 * when the user asks to resolve a playable title. No YouTube playback is used.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIME_CATALOG__) return;
  window.__ROFLIX_ANIME_CATALOG__ = true;

  const AL_ENDPOINT = 'https://graphql.anilist.co';
  const PER_PAGE = 48;
  const cache = new Map();
  const resolveCache = new Map();
  let requestSeq = 0;

  const MEDIA_QUERY = `
    query ($page:Int, $perPage:Int, $sort:[MediaSort]) {
      Page(page:$page, perPage:$perPage) {
        pageInfo { currentPage lastPage hasNextPage total }
        media(
          type:ANIME,
          isAdult:false,
          sort:$sort
        ) {
          id
          idMal
          title { romaji english native userPreferred }
          format
          status
          episodes
          duration
          averageScore
          popularity
          genres
          countryOfOrigin
          season
          seasonYear
          startDate { year month day }
          endDate { year month day }
          description(asHtml:false)
          coverImage { large extraLarge color }
          bannerImage
          siteUrl
        }
      }
    }
  `;

  function text(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function esc(v) {
    if (typeof escapeHtml === 'function') return escapeHtml(text(v));
    return text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function titleOf(a) {
    return text(a?.title?.userPreferred || a?.title?.english || a?.title?.romaji || a?.title?.native || 'Anime');
  }
  function titleVariants(a) {
    return [...new Set([
      a?.title?.english, a?.title?.romaji, a?.title?.native, a?.title?.userPreferred
    ].map(text).filter(Boolean))];
  }
  function formatLabel(f) {
    return ({TV:'TV',TV_SHORT:'TV ngắn',MOVIE:'Movie',SPECIAL:'Special',OVA:'OVA',ONA:'ONA',MUSIC:'Music'}[f] || text(f));
  }
  function statusLabel(s) {
    return ({FINISHED:'Hoàn thành',RELEASING:'Đang phát sóng',NOT_YET_RELEASED:'Sắp chiếu',CANCELLED:'Đã hủy',HIATUS:'Tạm ngưng'}[s] || text(s));
  }

  async function aniList(variables) {
    const key = JSON.stringify(variables);
    if (cache.has(key)) return cache.get(key);
    const promise = fetch(AL_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({query: MEDIA_QUERY, variables})
    }).then(async r => {
      if (!r.ok) throw new Error('AniList HTTP ' + r.status);
      const json = await r.json();
      if (json.errors?.length) throw new Error(json.errors[0].message || 'AniList error');
      return json.data?.Page || {media:[],pageInfo:{}};
    }).finally(() => {
      setTimeout(() => cache.delete(key), 5 * 60 * 1000);
    });
    cache.set(key, promise);
    return promise;
  }

  async function loadPage(page) {
    return aniList({page, perPage:PER_PAGE, sort:['POPULARITY_DESC','SCORE_DESC']});
  }

  function poster(a) {
    return text(a?.coverImage?.extraLarge || a?.coverImage?.large);
  }

  function animeCard(a) {
    const title = esc(titleOf(a));
    const score = Number(a.averageScore || 0) ? (Number(a.averageScore) / 10).toFixed(1) : 'N/A';
    const year = text(a.seasonYear || a.startDate?.year || 'N/A');
    const type = esc(formatLabel(a.format));
    const status = esc(statusLabel(a.status));
    const eps = Number(a.episodes || 0) > 0 ? `${Number(a.episodes)} Tập` : type;
    const image = esc(poster(a));
    const id = Number(a.id);
    return `
      <div class="movie-card-premium card-stagger rf-anime-card" data-anime-id="${id}" tabindex="0" role="button" aria-label="${title}">
        <div class="card-poster">
          <img src="${image}" alt="${title}" loading="lazy" decoding="async"
               onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=Anime'">
          <div class="card-overlay">
            <button class="watch-btn btn-ripple" data-rf-anime-watch="${id}">
              <i class="fa-solid fa-play"></i> Xem Ngay
            </button>
            <div class="card-actions">
              <button data-rf-anime-info="${id}" title="Chi tiết Anime"><i class="fa-solid fa-circle-info"></i></button>
              <a href="${esc(a.siteUrl || '#')}" target="_blank" rel="noopener" title="AniList" onclick="event.stopPropagation()">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            </div>
          </div>
          <div class="card-badges">
            <span class="badge" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff">ANIME</span>
            <span class="badge eps">${esc(eps)}</span>
            ${Number(a.averageScore || 0) >= 80 ? '<span class="badge hot">🔥 Hot</span>' : ''}
            ${a.countryOfOrigin === 'CN' ? '<span class="badge" style="background:#ef4444;color:#fff">DONGHUA</span>' : ''}
          </div>
        </div>
        <div class="card-info">
          <div class="card-title">${title}</div>
          <div class="card-meta">
            <span class="rating"><i class="fa-solid fa-star"></i> ${score}</span>
            <span>${year}</span>
            <span>${status}</span>
          </div>
        </div>
      </div>`;
  }

  function renderEmpty(message) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    host.innerHTML = `<div class="col-span-full"><div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-film"></i></div><h3>Anime chưa sẵn sàng</h3><p>${esc(message)}</p></div></div>`;
  }

  function renderPage(page, result) {
    const host = document.getElementById('movie-grid-container');
    if (!host) return;
    const items = Array.isArray(result.media) ? result.media.filter(Boolean) : [];
    if (!items.length) return renderEmpty('AniList không trả về Anime ở trang này.');
    host.innerHTML = items.map(animeCard).join('');
    const byId = new Map(items.map(a => [Number(a.id), a]));
    host.querySelectorAll('[data-rf-anime-id]').forEach(card => {
      const id = Number(card.dataset.animeId);
      const anime = byId.get(id);
      card.addEventListener('click', e => {
        if (e.target.closest('button,a')) return;
        showAnimeInfo(anime);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAnimeInfo(anime); }
      });
    });
    host.querySelectorAll('[data-rf-anime-watch]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation(); watchAnime(byId.get(Number(btn.dataset.rfAnimeWatch)));
    }));
    host.querySelectorAll('[data-rf-anime-info]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation(); showAnimeInfo(byId.get(Number(btn.dataset.rfAnimeInfo)));
    }));

    const info = result.pageInfo || {};
    const count = document.getElementById('movie-count');
    if (count) count.textContent = String(info.total || '');
    renderPagination(page, Boolean(info.hasNextPage), Number(info.lastPage || page));
  }

  function renderPagination(page, hasNext, lastPage) {
    const host = document.getElementById('pagination-container');
    if (!host) return;
    const buttons = [];
    if (page > 1) buttons.push(`<button class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm" data-rf-anime-page="${page-1}">‹</button>`);
    buttons.push(`<button class="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-sm">${page}</button>`);
    if (hasNext) buttons.push(`<button class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm" data-rf-anime-page="${page+1}">${page+1}</button>`);
    if (hasNext) buttons.push(`<button class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm" data-rf-anime-page="${page+1}">›</button>`);
    host.innerHTML = `<div class="flex items-center justify-center gap-2 flex-wrap">${buttons.join('')}</div>`;
    host.querySelectorAll('[data-rf-anime-page]').forEach(btn => btn.addEventListener('click', () => open(Number(btn.dataset.rfAnimePage))));
    void lastPage;
  }

  function providerCandidates(data) {
    const items = unwrapList(data).items || [];
    return items.filter(x => x && x.slug);
  }

  function unwrapList(data) {
    const items = data?.items || data?.data?.items || data?.data || data?.movies || [];
    const pag = data?.pagination || data?.data?.params?.pagination || data?.params?.pagination || {};
    return {items:Array.isArray(items) ? items : [], pag};
  }

  function providerAnimeLike(item) {
    const cats = Array.isArray(item?.category) ? item.category.map(x => norm(x?.name || x)) : [norm(item?.category)];
    const type = norm(item?.type);
    const countries = Array.isArray(item?.country) ? item.country.map(x => norm(x?.name || x)) : [norm(item?.country)];
    return cats.some(x => x.includes('hoat hinh')) || type === 'hoathinh' ||
      countries.some(x => x.includes('nhat ban') || x.includes('trung quoc') || x.includes('han quoc'));
  }

  function providerTitle(item) { return norm(item?.name || item?.origin_name || item?.slug); }

  function candidateScore(anime, item) {
    const aTitles = titleVariants(anime).map(norm).filter(Boolean);
    const b = providerTitle(item);
    if (!b) return -1;
    let score = 0;
    for (const a of aTitles) {
      if (a === b) score = Math.max(score, 100);
      else if (b.includes(a) || a.includes(b)) score = Math.max(score, 78);
      else {
        const aw = new Set(a.split(' '));
        const bw = new Set(b.split(' '));
        let common = 0; aw.forEach(w => { if (w.length > 1 && bw.has(w)) common++; });
        score = Math.max(score, Math.min(70, common * 12));
      }
    }
    const year = Number(anime?.seasonYear || anime?.startDate?.year || 0);
    const itemYear = Number(item?.year || 0);
    if (year && itemYear) {
      if (year === itemYear) score += 18;
      else if (Math.abs(year - itemYear) === 1) score += 8;
      else if (Math.abs(year - itemYear) > 4) score -= 18;
    }
    if (providerAnimeLike(item)) score += 10;
    return score;
  }

  async function searchProvider(sid, keyword) {
    const path = sid === 'kkphim'
      ? `/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`
      : `/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`;
    try {
      const data = await fetchJson(srcListUrl(path, sid));
      return providerCandidates(data).map(item => { item._src = sid; return item; });
    } catch (e) {
      console.warn('[RoFlix Anime] provider search failed', sid, e);
      return [];
    }
  }

  async function resolvePlayable(anime) {
    if (!anime?.id) return null;
    const key = String(anime.id);
    if (resolveCache.has(key)) return resolveCache.get(key);
    const promise = (async () => {
      const all = [];
      const titles = titleVariants(anime).slice(0, 3);
      for (const keyword of titles) {
        const results = await Promise.all(['kkphim','vsmov'].map(sid => searchProvider(sid, keyword)));
        results.flat().forEach(x => all.push(x));
        const ranked = all.map(item => ({item, score:candidateScore(anime, item)})).sort((a,b) => b.score-a.score);
        const best = ranked.find(x => x.score >= 88);
        if (best) {
          try {
            const detail = await fetchMovieDetail(best.item.slug, best.item._src);
            if (detail?.episodes?.length) return {item:detail, sid:best.item._src, score:best.score};
          } catch (_) {}
        }
      }
      const ranked = all.map(item => ({item, score:candidateScore(anime, item)})).sort((a,b) => b.score-a.score);
      for (const hit of ranked.slice(0, 4)) {
        if (hit.score < 55) continue;
        try {
          const detail = await fetchMovieDetail(hit.item.slug, hit.item._src);
          if (detail?.episodes?.length) return {item:detail, sid:hit.item._src, score:hit.score};
        } catch (_) {}
      }
      return null;
    })();
    resolveCache.set(key, promise);
    return promise;
  }

  async function watchAnime(anime) {
    if (!anime) return;
    if (typeof showToastPro === 'function') showToastPro('info', 'Đang tìm nguồn phát', titleOf(anime));
    const resolved = await resolvePlayable(anime);
    if (!resolved) {
      showAnimeInfo(anime, 'RoFlix chưa tìm thấy nguồn phát phù hợp trong KKPhim/VSMOV. Anime vẫn được giữ trong catalog.');
      return;
    }
    currentSlug = resolved.item.slug;
    currentSourceId = resolved.sid;
    if (typeof playMovie === 'function') await playMovie(resolved.item.slug, resolved.sid);
  }

  async function showAnimeInfo(anime, notice) {
    if (!anime) return;
    const host = document.getElementById('detail-content-container');
    if (!host) return;
    const score = Number(anime.averageScore || 0) ? (Number(anime.averageScore) / 10).toFixed(1) : 'N/A';
    const genres = Array.isArray(anime.genres) ? anime.genres.slice(0,8).map(g => `<span class="text-xs bg-gray-800 px-2 py-1 rounded-full">${esc(g)}</span>`).join(' ') : '';
    const desc = text(anime.description).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() || 'Chưa có mô tả.';
    host.innerHTML = `
      <div class="glass-premium p-5 md:p-8 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div class="aspect-[2/3] rounded-2xl overflow-hidden border border-gray-800 shadow-xl"><img src="${esc(poster(anime))}" class="w-full h-full object-cover" alt="${esc(titleOf(anime))}"></div>
          <button id="rf-anime-detail-watch" class="rf-detail-watch-btn"><i class="fa-solid fa-play"></i> Tìm nguồn & Xem phim</button>
        </div>
        <div class="md:col-span-3 flex flex-col justify-between space-y-5">
          <div>
            <div class="flex justify-between items-start gap-3 flex-wrap"><div><h1 class="text-2xl md:text-3xl font-black text-white">${esc(titleOf(anime))}</h1><p class="text-sm mt-1 text-gray-400">${esc(anime.title?.native || anime.title?.romaji || '')}</p></div><span class="badge" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff">ANIME</span></div>
            <div class="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-300"><span class="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold px-3 py-1 rounded-lg"><i class="fa-solid fa-star"></i> ${score}</span><span>Dạng: <strong class="text-white">${esc(formatLabel(anime.format))}</strong></span><span>Năm: <strong class="text-white">${esc(anime.seasonYear || anime.startDate?.year || 'N/A')}</strong></span><span>${esc(statusLabel(anime.status))}</span><span>${Number(anime.episodes || 0) || '?'} Tập</span></div>
          </div>
          <div><h3 class="text-sm font-bold text-gray-400 mb-1">Thể loại:</h3><div class="flex flex-wrap gap-1">${genres}</div></div>
          <div><h3 class="text-sm font-bold text-gray-400 mb-1">Tóm tắt:</h3><p class="text-sm leading-relaxed text-gray-300">${esc(desc)}</p></div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-gray-800 pt-4"><div><p class="text-gray-500">Nguồn catalog</p><p class="font-bold text-white mt-1">AniList</p></div><div><p class="text-gray-500">MAL ID</p><p class="font-bold text-white mt-1">${esc(anime.idMal || 'N/A')}</p></div><div><p class="text-gray-500">Quốc gia</p><p class="font-bold text-white mt-1">${esc(anime.countryOfOrigin || 'N/A')}</p></div><div><p class="text-gray-500">Nguồn phát</p><p class="font-bold text-amber-500 mt-1">KKPhim / VSMOV</p></div></div>
          ${notice ? `<div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">${esc(notice)}</div>` : ''}
          <a href="${esc(anime.siteUrl || '#')}" target="_blank" rel="noopener" class="text-sm text-amber-400 hover:underline">Mở trang AniList ↗</a>
        </div>
      </div>`;
    navigateTo('detail-page');
    document.getElementById('rf-anime-detail-watch')?.addEventListener('click', () => watchAnime(anime));
  }

  async function open(page) {
    page = Math.max(1, Number(page) || 1);
    const seq = ++requestSeq;
    window.__ROFLIX_ANIME_MODE__ = true;
    searchKeyword = '';
    currentGenreSlug = '';
    currentCountrySlug = '';
    homePriorityMode = false;
    currentListEndpoint = 'phim-moi-cap-nhat';
    currentPage = page;
    const titleEl = document.getElementById('list-title');
    if (titleEl) titleEl.textContent = 'Anime';
    document.getElementById('search-input')?.value && (document.getElementById('search-input').value = '');
    document.getElementById('search-input-mobile')?.value && (document.getElementById('search-input-mobile').value = '');
    navigateTo('main-site');
    window.scrollTo({top:0, behavior:'smooth'});
    const host = document.getElementById('movie-grid-container');
    if (host) host.innerHTML = Array(12).fill(0).map(() => '<div class="skeleton-card-premium"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>').join('');
    try {
      const result = await loadPage(page);
      if (seq !== requestSeq) return;
      renderPage(page, result);
      totalItems = Number(result.pageInfo?.total || 0);
      totalPages = Number(result.pageInfo?.lastPage || page);
    } catch (e) {
      console.error('[RoFlix Anime] catalog failed', e);
      renderEmpty('Không kết nối được AniList. Hãy thử lại sau.');
    }
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;
    const card = document.createElement('button');
    card.type = 'button'; card.id = 'rf-topic-anime'; card.className = 'topic-card';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
    card.addEventListener('click', () => open(1));
    row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));
    const desktop = links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('.glass-premium') && !a.closest('#mobile-menu'));
    if (desktop && !document.getElementById('rf-genre-anime-desktop')) {
      const a = document.createElement('a'); a.href='#'; a.id='rf-genre-anime-desktop'; a.className=desktop.className; a.textContent='ANIME';
      a.addEventListener('click', e => { e.preventDefault(); open(1); }); desktop.insertAdjacentElement('afterend', a);
    }
    const mobile = links.find(a => a.textContent.trim() === 'Hoạt Hình' && a.closest('#mobile-menu'));
    if (mobile && !document.getElementById('rf-genre-anime-mobile')) {
      const a = document.createElement('a'); a.href='#'; a.id='rf-genre-anime-mobile'; a.className=mobile.className; a.textContent='ANIME';
      a.addEventListener('click', e => { e.preventDefault(); window.closeMobileMenu?.(); open(1); }); mobile.insertAdjacentElement('afterend', a);
    }
  }

  function css() {
    if (document.getElementById('rf-anime-catalog-css')) return;
    const s = document.createElement('style'); s.id='rf-anime-catalog-css'; s.textContent=`
      #rf-topic-anime{border:1px solid rgba(255,255,255,.12);background:linear-gradient(135deg,#7c3aed,#db2777)!important}
      #rf-topic-anime:hover{box-shadow:0 12px 28px rgba(124,58,237,.28)}
      #rf-genre-anime-desktop,#rf-genre-anime-mobile{font-weight:900}
      .rf-anime-card{outline:none}.rf-anime-card:focus-visible{box-shadow:0 0 0 2px rgba(245,158,11,.8)}
    `; document.head.appendChild(s);
  }

  function boot() {
    css(); addTopicCard(); addGenreLink();
    setTimeout(addTopicCard,300); setTimeout(addGenreLink,300);
    setTimeout(addTopicCard,1200); setTimeout(addGenreLink,1200);
  }

  window.roflixAnime = {open, watch:watchAnime, info:showAnimeInfo, resolve:resolvePlayable};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
