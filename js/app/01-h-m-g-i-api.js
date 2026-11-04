// ============================================================
// HÀM GỌI API
// ============================================================
function isValidPosterUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

function absImage(url, sid) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url)) return url.startsWith('//') ? location.protocol + url : url;
    try {
        const source = getSource(sid || currentSourceId);
        // Resolve relative paths against the configured source origin only.
        // Never fabricate a separate CDN hostname for a source without one.
        // KKPhim dùng host ảnh riêng cho các đường dẫn poster tương đối.
        if (source.id === 'kkphim') return new URL(url.replace(/^\//, ''), 'https://phimimg.com/').href;
        const base = source.cdn || new URL(source.listBase).origin;
        return new URL(url, base.replace(/\/$/, '') + '/').href;
    } catch (_) { return ''; }
}

function pickPoster(item, sid) {
    const candidates = [item.poster_url, item.thumb_url, item.poster, item.thumb];
    for (const c of candidates) {
        const abs = absImage(c, sid || item._src);
        if (isValidPosterUrl(abs)) return abs;
    }
    return '';
}

function unwrapList(data) {
    const items = data.items || data.data?.items || data.result?.items || (Array.isArray(data.data) ? data.data : null) || data.movies || data.results || [];
    const pag = data.pagination
        || (data.data && data.data.params && data.data.params.pagination)
        || (data.params && data.params.pagination)
        || (data.paginate && { currentPage: data.paginate.current_page, totalPages: data.paginate.total_page, totalItems: data.paginate.total_items })
        || (data.data && data.data.paginate && { currentPage: data.data.paginate.current_page, totalPages: data.data.paginate.total_page, totalItems: data.data.paginate.total_items })
        || (data.paginate && { currentPage: data.paginate.current_page || data.paginate.currentPage, totalPages: data.paginate.total_page || data.paginate.totalPage || data.paginate.total_pages, totalItems: data.paginate.total_items || data.paginate.totalItems })
        || {};
    return { items: Array.isArray(items) ? items : [], pag };
}

function normalizeNguoncMovie(movie, episodes) {
    if (!movie || typeof movie !== 'object') return movie;
    movie.origin_name = movie.origin_name || movie.original_name || '';
    movie.content = movie.content || movie.description || '';
    movie.lang = movie.lang || movie.language || '';
    movie.episode_current = movie.episode_current || movie.current_episode || '';
    movie.episode_total = movie.episode_total || movie.total_episodes || '';
    movie.actor = movie.actor || (movie.casts ? String(movie.casts).split(/,\s*/) : []);
    const groups = Array.isArray(movie.category)
        ? movie.category
        : (movie.category && typeof movie.category === 'object' ? Object.values(movie.category) : []);
    const hasGroupedCategories = groups.some(group => group && Array.isArray(group.list));
    movie.nguonc_category_groups = hasGroupedCategories ? groups : [];
    const flatCategories = [];
    movie.country = Array.isArray(movie.country) ? movie.country : [];
    if (hasGroupedCategories) groups.forEach(group => {
        const groupName = String(group?.group?.name || '').trim().toLowerCase();
        const values = Array.isArray(group?.list) ? group.list : [];
        values.forEach(value => {
            const name = value?.name || value;
            if (!name) return;
            const normalized = String(name).trim().toLowerCase();
            const entry = {name: String(name).trim(), slug: value?.slug || ''};
            if (groupName.includes('năm')) {
                if (!movie.year) movie.year = entry.name;
                return;
            }
            if (groupName.includes('quốc gia') || groupName.includes('country')) {
                if (!movie.country.some(x => String(x.name || x).toLowerCase() === entry.name.toLowerCase())) movie.country.push(entry);
                return;
            }
            if (groupName.includes('định dạng') || groupName.includes('format') || groupName.includes('loại phim')) {
                if (normalized.includes('phim bộ') || normalized.includes('series')) movie.type = 'series';
                else if (normalized.includes('phim lẻ') || normalized.includes('movie')) movie.type = 'single';
                else if (normalized.includes('tv show')) movie.type = 'tvshows';
                else if (normalized.includes('hoạt hình')) movie.type = 'hoathinh';
                return;
            }
            if (groupName.includes('thể loại') || groupName.includes('genre') || !groupName) flatCategories.push(entry);
            if (normalized.includes('phim bộ')) movie.type = 'series';
            else if (normalized.includes('phim lẻ')) movie.type = 'single';
            else if (normalized.includes('tv show')) movie.type = 'tvshows';
            else if (normalized.includes('hoạt hình')) movie.type = 'hoathinh';
            if (normalized.includes('đang chiếu')) movie.status = 'ongoing';
        });
    });
    if (hasGroupedCategories) movie.category = flatCategories;
    else if (groups.length) movie.category = groups.map(value => ({
        name: String(value?.name || value || '').trim(),
        slug: String(value?.slug || '')
    })).filter(value => value.name);
    if (!movie.type && movie.tmdb && movie.tmdb.type) {
        const tmdbType = String(movie.tmdb.type).toLowerCase();
        if (tmdbType === 'tv') movie.type = 'series';
        else if (tmdbType === 'movie') movie.type = 'single';
    }
    const rawEpisodes = Array.isArray(movie.episodes) ? movie.episodes : (Array.isArray(episodes) ? episodes : []);
    movie.episodes = rawEpisodes.map(group => {
        if (Array.isArray(group.server_data)) return group;
        const items = Array.isArray(group.items) ? group.items : (Array.isArray(group.server_data) ? group.server_data : []);
        return {
            server_name: group.server_name || group.name || 'NguonC',
            server_data: items.map(ep => ({
                name: ep.name || ep.slug || 'Tập',
                slug: ep.slug || ep.name || '',
                filename: ep.filename || '',
                link_embed: ep.embed || ep.link_embed || '',
                link_m3u8: ep.m3u8 || ep.link_m3u8 || ''
            }))
        };
    });
    return movie;
}

function unwrapDetailPayload(data) {
    if (!data || typeof data !== 'object') return null;
    // NguonC: { status: 'success', movie: { ... } } and KKPhim-compatible payloads.
    const candidates = [data.movie, data.data && data.data.movie, data.data && data.data.item, data.item, data.data, data];
    const movie = candidates.find(item => item && typeof item === 'object'
        && (item.slug || item.name || item.origin_name));
    if (!movie) return null;

    // Episodes thuộc item là nguồn ưu tiên; một số API cũ đặt episodes ở root.
    const episodes = Array.isArray(movie.episodes) ? movie.episodes
        : (Array.isArray(data.episodes) ? data.episodes : []);
    return normalizeNguoncMovie(movie, episodes);
}

function mergeMovieLists(groups) {
    const seen = new Set();
    const out = [];
    const max = Math.max(0, ...groups.map(g => g.length));
    for (let i = 0; i < max; i++) {
        for (const g of groups) {
            const m = g[i];
            if (!m || !m.slug || seen.has(m.slug)) continue;
            seen.add(m.slug);
            out.push(m);
        }
    }
    return out;
}

// Cache nhẹ trong bộ nhớ để tránh gọi lại API khi quay lại trang/thể loại vừa xem.
// Có thêm timeout + dedupe request để 1 API chậm không treo UI và không tạo nhiều
// request trùng nhau khi người dùng bấm nhanh/chuyển trang liên tục.
const _apiCache = new Map();
const _apiInflight = new Map();
const API_CACHE_TTL = 180000; // 3 phút
const API_CACHE_STALE_TTL = 900000; // cho phép dùng cache cũ tối đa 15 phút khi API lỗi
const API_CACHE_MAX = 80;
const API_REQUEST_TIMEOUT = 10000;
const API_429_MAX_WAIT = 3000;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nguoncProxyUrl(url) {
    try {
        const parsed = new URL(url, 'https://roflix.invalid');
        if (parsed.hostname !== 'phim.nguonc.com' || !parsed.pathname.startsWith('/api/')) return '';
        return '/api/nguonc' + parsed.pathname.slice(4) + parsed.search;
    } catch (_) { return ''; }
}

async function fetchJson(url) {
    const proxied = nguoncProxyUrl(url);
    if (!proxied) return fetchJsonDirect(url);
    try {
        return await fetchJsonDirect(proxied);
    } catch (error) {
        const status = Number(error && error.status);
        if (status === 404 || status === 422) throw error;
        return fetchJsonDirect(url);
    }
}

async function fetchJsonDirect(url) {
    const hit = _apiCache.get(url);
    if (hit && (Date.now() - hit.time) < API_CACHE_TTL) return hit.data;
    const inflight = _apiInflight.get(url);
    if (inflight) return inflight;

    const request = (async () => {
        const staleHit = hit && (Date.now() - hit.time) < API_CACHE_STALE_TTL ? hit : null;
        try {
            for (let attempt = 0; attempt < 2; attempt++) {
                let controller = null;
                const timer = setTimeout(() => { try { controller?.abort(); } catch (_) {} }, API_REQUEST_TIMEOUT);
                try {
                    if (typeof AbortController !== 'undefined') controller = new AbortController();
                    const res = await fetch(url, {
                        headers: { Accept: 'application/json' },
                        signal: controller ? controller.signal : undefined
                    });
                    if (res.status === 429 && attempt === 0) {
                        const retryHeader = Number(res.headers.get('Retry-After'));
                        const waitMs = Math.min(API_429_MAX_WAIT, Math.max(500, Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader * 1000 : 1000));
                        await wait(waitMs);
                        continue;
                    }
                    if (!res.ok) {
                        const error = new Error('NguonC/API HTTP ' + res.status);
                        error.status = res.status;
                        throw error;
                    }
                    const type = res.headers.get('content-type') || '';
                    if (type && !/json/i.test(type)) throw new Error('API returned non-JSON response (' + type + ')');
                    const data = await res.json();
                    if (!data || typeof data !== 'object') throw new Error('API returned invalid JSON payload');
                    if (_apiCache.size >= API_CACHE_MAX) _apiCache.delete(_apiCache.keys().next().value);
                    _apiCache.set(url, { data, time: Date.now() });
                    return data;
                } finally {
                    clearTimeout(timer);
                }
            }
            const rateError = new Error('NguonC/API HTTP 429: rate limited after retry');
            rateError.status = 429;
            throw rateError;
        } catch (error) {
            // 404/422/429 là lỗi request/giới hạn: không che bằng dữ liệu cache cũ.
            const clientError = error && Number(error.status) >= 400 && Number(error.status) < 500;
            if (staleHit && !clientError) {
                console.warn('[RoFlix API] dùng cache cũ do lỗi mạng/server:', url, error);
                return staleHit.data;
            }
            if (error && error.name === 'AbortError') throw new Error('API timeout after ' + (API_REQUEST_TIMEOUT / 1000) + 's');
            throw error;
        } finally {
            _apiInflight.delete(url);
        }
    })();
    _apiInflight.set(url, request);
    return request;
}

function buildListPath(page) {
    if (searchKeyword) {
        return `/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&page=${page}`;
    }
    if (currentGenreSlug) return `/the-loai/${currentGenreSlug}?page=${page}`;
    if (currentCountrySlug) return `/quoc-gia/${currentCountrySlug}?page=${page}`;
    return `/danh-sach/${currentListEndpoint}?page=${page}`;
}

async function fetchMoviesFromSource(sid, page) {
    const data = await fetchJson(srcListUrl(buildListPath(page), sid));
    const { items, pag } = unwrapList(data);
    const movies = items
        .map(m => { normalizeNguoncMovie(m); m._src = sid; m._sources = [sid]; return m; })
        .filter(m => !!pickPoster(m, sid));

    return {
        source: sid,
        movies,
        pagination: {
            currentPage: pag.currentPage || page,
            totalPages: pag.totalPages || data.last_page || data.total_pages || 1,
            totalItems: pag.totalItems || data.total || movies.length
        }
    };
}

function applyListPagination(pagination, requestedPage, movieCount) {
    currentPage = requestedPage;
    totalPages = Math.max(1, Number(pagination && pagination.totalPages) || 1);
    totalItems = Number(pagination && pagination.totalItems) || movieCount || 0;
}

// Gọi 1 endpoint danh sách với tự động dự phòng: nếu nguồn đang chọn lỗi,
// tự chuyển sang nguồn còn lại (VSMOV <-> KKPhim) để trang không bị "trắng" khi 1 nguồn sập.
// path: đường dẫn KHÔNG kèm domain, ví dụ '/quoc-gia/au-my?page=1'
async function fetchListWithFallback(path) {
    // Các khu vực dùng danh sách phụ (hero, chủ đề/tuần này, gợi ý)
    // cũng phải gộp cả hai nhà cung cấp, không chỉ fallback tuần tự.
    const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['nguonc'];
    const settled = await Promise.allSettled(ids.map(async sid => {
        const data = await fetchJson(srcListUrl(path, sid));
        const wrapped = unwrapList(data);
        const items = wrapped.items.map(movie => {
            normalizeNguoncMovie(movie);
            movie._src = sid;
            movie._sources = [sid];
            return movie;
        }).filter(movie => movie && movie.slug && pickPoster(movie, sid));
        return { sid, data, items, pagination: wrapped.pag || {} };
    }));
    const successful = settled.filter(result => result.status === 'fulfilled').map(result => result.value);
    if (!successful.length) {
        const firstError = settled.find(result => result.status === 'rejected');
        throw (firstError && firstError.reason) || new Error('Both movie providers failed for ' + path);
    }
    const merged = mergeMovieListsByIdentity(successful.map(result => result.items));
    const pagination = successful.reduce((acc, result) => {
        acc.totalPages = Math.max(acc.totalPages, Number(result.pagination.totalPages) || 1);
        acc.totalItems += Number(result.pagination.totalItems) || result.items.length;
        return acc;
    }, { currentPage: 1, totalPages: 1, totalItems: 0 });
    return {
        data: { items: merged, pagination },
        sid: successful[0].sid
    };
}

function mapListResultItems(result, limit) {
    const items = unwrapList(result.data).items;
    const sliced = typeof limit === 'number' ? items.slice(0, limit) : items;
    return sliced.map(m => {
        m._src = m._src || result.sid;
        return mapMovieData(m);
    });
}

async function fetchMovies(page = 1) {
    try {
        const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['nguonc'];
        const settled = await Promise.allSettled(ids.map(sid => fetchMoviesFromSource(sid, page)));
        const groups = [];
        let maxPages = 1, sumItems = 0;
        settled.forEach((entry, index) => {
            if (entry.status !== 'fulfilled') {
                console.warn('[RoFlix] source failed:', ids[index], entry.reason);
                return;
            }
            groups.push(entry.value.movies);
            maxPages = Math.max(maxPages, Number(entry.value.pagination.totalPages) || 1);
            sumItems += Number(entry.value.pagination.totalItems) || entry.value.movies.length;
        });
        if (!groups.length) throw new Error('All movie providers failed (NguonC, KKPhim, VSMOV)');
        const merged = mergeMovieListsByIdentity(groups);
        applyListPagination({currentPage:page,totalPages:maxPages,totalItems:sumItems || merged.length},page,merged.length);
        return merged;
    } catch (error) {
        console.error('Lỗi tải phim:', error);
        showToast('error', 'Lỗi kết nối', 'Không thể tải danh sách phim từ NguonC, KKPhim hoặc VSMOV. Vui lòng thử lại!');
        return [];
    }
}

// Gộp hai nguồn, ưu tiên NguonC và loại trùng theo tên + năm.
// Giữ _src của từng phim để trang chi tiết gọi đúng API nguồn.
function mergeMovieListsByIdentity(groups) {
    const seen = new Map();
    const out = [];
    const max = Math.max(0, ...groups.map(group => group.length));
    const normalize = value => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (let i = 0; i < max; i++) {
        for (const group of groups) {
            const movie = group[i];
            if (!movie) continue;
            const name = normalize(movie.name || movie.title);
            const origin = normalize(movie.origin_name || movie.original_name);
            const year = String(movie.year || '').trim();
            const identity = name ? name + '|' + year + '|' + (year ? '' : origin) : String(movie._src || '') + '|' + String(movie.slug || '');
            const existing = seen.get(identity);
            if (existing) {
                existing._sources = [...new Set([...(existing._sources || [existing._src]), movie._src].filter(Boolean))];
                existing._sourceRefs = [...(existing._sourceRefs || [{source: existing._src, slug: existing.slug}]), {source: movie._src, slug: movie.slug}]
                    .filter((ref, index, all) => ref.source && ref.slug && all.findIndex(x => x.source === ref.source && x.slug === ref.slug) === index);
                if (!existing.poster_url && movie.poster_url) existing.poster_url = movie.poster_url;
                if (!existing.thumb_url && movie.thumb_url) existing.thumb_url = movie.thumb_url;
                if (!existing.content && movie.content) existing.content = movie.content;
                if (!existing.category?.length && movie.category?.length) existing.category = movie.category;
                if (!existing.year && movie.year) existing.year = movie.year;
                continue;
            }
            movie._sources = [...new Set([...(movie._sources || []), movie._src].filter(Boolean))];
            movie._sourceRefs = [{source: movie._src, slug: movie.slug}];
            seen.set(identity, movie);
            out.push(movie);
        }
    }
    return out;
}

async function fetchHomePriorityMovies(page = 1) {
    // Hero, đề xuất và các chủ đề dùng chung catalog hợp nhất với grid chính.
    const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['nguonc', 'kkphim', 'vsmov'];
    const settled = await Promise.allSettled(ids.map(sid => fetchMoviesFromSource(sid, page)));
    const groups = settled.filter(x => x.status === 'fulfilled').map(x => x.value.movies);
    if (!groups.length) throw new Error('All unified catalog providers failed');
    const merged = mergeMovieListsByIdentity(groups);
    const pages = settled.filter(x => x.status === 'fulfilled').map(x => Number(x.value.pagination.totalPages) || 1);
    applyListPagination({currentPage: page, totalPages: Math.max(1, ...pages), totalItems: merged.length}, page, merged.length);
    return merged;
}

async function fetchMovieDetail(slug, preferredSrc, titleHint) {
    const order = preferredSrc === 'nguonc' ? ['nguonc', 'kkphim', 'vsmov'] : (preferredSrc === 'kkphim' ? ['kkphim', 'nguonc', 'vsmov'] : (preferredSrc === 'vsmov' ? ['vsmov', 'nguonc', 'kkphim'] : ['nguonc', 'kkphim', 'vsmov']));
    let lastErr = null, bestMovie = null;
    const accept = (payload, sid) => {
        const movie = unwrapDetailPayload(payload);
        if (!movie || (!movie.slug && !movie.name)) return null;
        normalizeNguoncMovie(movie); movie._src = sid; return movie;
    };
    for (const sid of order) {
        try {
            const movie = accept(await fetchJson(srcDetailUrl(slug, sid)), sid);
            if (!movie) continue;
            if (Array.isArray(movie.episodes) && movie.episodes.some(group => Array.isArray(group.server_data) && group.server_data.length)) return movie;
            if (!bestMovie) bestMovie = movie;
        } catch (error) { lastErr = error; }
    }
    if (titleHint) {
        const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const wanted = normalize(titleHint);
        for (const sid of order) {
            try {
                const data = await fetchJson(srcListUrl('/tim-kiem?keyword=' + encodeURIComponent(titleHint) + '&page=1&limit=20', sid));
                const rows = unwrapList(data).items;
                const exact = rows.find(item => normalize(item.name || item.title) === wanted || normalize(item.origin_name || item.original_name) === wanted);
                if (!exact || !exact.slug) continue;
                const movie = accept(await fetchJson(srcDetailUrl(exact.slug, sid)), sid);
                if (!movie) continue;
                if (Array.isArray(movie.episodes) && movie.episodes.some(group => Array.isArray(group.server_data) && group.server_data.length)) return movie;
                if (!bestMovie) bestMovie = movie;
            } catch (error) { lastErr = error; }
        }
    }
    if (bestMovie) return bestMovie;
    console.error('[RoFlix] Không tải được chi tiết phim:', lastErr);
    showToast('error', 'Lỗi', 'Không thể tải thông tin phim từ các nhà cung cấp. Vui lòng thử lại.');
    return null;
}
async function loadUnifiedGenreTaxonomy(){
 const ids=activeSourceIds(),norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const menu=document.getElementById('roflix-unified-genre-menu'),staticMap=new Map();
 if(menu)menu.querySelectorAll('a[onclick*="filterByGenre"]').forEach(a=>{const value=a.getAttribute('onclick')||'',marker="filterByGenre('",at=value.indexOf(marker),finish=at>=0?value.indexOf("'",at+marker.length):-1;if(at>=0&&finish>at)staticMap.set(norm(a.textContent),value.slice(at+marker.length,finish))});
 const results=await Promise.allSettled(ids.map(async sid=>({sid,items:unwrapList(await fetchJson(srcListUrl('/the-loai',sid))).items})));
 const genres=new Map(),providerSlugs={};
 results.filter(x=>x.status==='fulfilled').forEach(x=>x.value.items.forEach(item=>{const name=String(item.name||item.title||'').trim(),slug=String(item.slug||'').trim();if(!name||!slug)return;const key=norm(name),canonical=staticMap.get(key)||slug;if(!genres.has(key))genres.set(key,{name,slug:canonical});(providerSlugs[canonical]??={})[x.value.sid]=slug}));
 window.RoFlixGenreProviderSlugs=providerSlugs;window.RoFlixUnifiedGenreMap=Object.fromEntries([...genres].map(([k,v])=>[k,v.slug]));
 const filter=document.querySelector('#rf-discovery #rf-filter-genre'),chips=document.querySelector('#rf-discovery #rf-genre-options');
 genres.forEach(({name,slug})=>{
  if(menu&&![...menu.querySelectorAll('a')].some(a=>norm(a.textContent)===norm(name))){const a=document.createElement('a');a.href='#';a.className='text-xs font-medium py-2 px-3 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 transition';a.textContent=name;a.addEventListener('click',e=>{e.preventDefault();if(typeof filterByGenre==='function')filterByGenre(slug,name)});menu.appendChild(a)}
  if(filter&&![...filter.options].some(o=>o.value===slug)){const o=document.createElement('option');o.value=slug;o.textContent=name;filter.appendChild(o)}
  if(chips&&![...chips.querySelectorAll('[data-genre]')].some(b=>b.dataset.genre===slug)){const b=document.createElement('button');b.type='button';b.className='rf-chip';b.dataset.genre=slug;b.textContent=name;chips.appendChild(b)}
 });
 const ctx=document.getElementById('rf-filter-context');if(ctx&&genres.size)ctx.textContent='Thể loại đã hợp nhất từ '+results.filter(x=>x.status==='fulfilled').length+'/3 nhà cung cấp.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(loadUnifiedGenreTaxonomy,0));else setTimeout(loadUnifiedGenreTaxonomy,0);
