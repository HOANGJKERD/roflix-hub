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
    movie.nguonc_category_groups = groups;
    const flatCategories = [];
    groups.forEach(group => {
        const groupName = String(group?.group?.name || '').toLowerCase();
        const values = Array.isArray(group?.list) ? group.list : [];
        values.forEach(value => {
            const name = value?.name || value;
            if (!name) return;
            if (groupName.includes('năm') && !movie.year) movie.year = name;
            else if (groupName.includes('quốc gia')) {
                movie.country = (movie.country || []).concat([{name, slug:value?.slug || ''}]);
            } else if (!groupName.includes('năm')) flatCategories.push({name,slug:value?.slug || ''});
            const normalized = String(name).toLowerCase();
            if (normalized.includes('phim bộ')) movie.type = 'series';
            else if (normalized.includes('phim lẻ')) movie.type = 'single';
            else if (normalized.includes('tv show')) movie.type = 'tvshows';
            else if (normalized.includes('hoạt hình')) movie.type = 'hoathinh';
            if (normalized.includes('đang chiếu')) movie.status = 'ongoing';
        });
    });
    if (groups.length) movie.category = flatCategories;
    if (!movie.type && movie.tmdb && movie.tmdb.type) {
        const tmdbType = String(movie.tmdb.type).toLowerCase();
        if (tmdbType === 'tv') movie.type = 'series';
        else if (tmdbType === 'movie') movie.type = 'single';
    }
    const rawEpisodes = Array.isArray(episodes) ? episodes : (Array.isArray(movie.episodes) ? movie.episodes : []);
    movie.episodes = rawEpisodes.map(group => {
        if (Array.isArray(group.server_data)) return group;
        const items = Array.isArray(group.items) ? group.items : [];
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
    const candidates = [
        data.movie,
        data.data && data.data.movie,
        data.data && data.data.item,
        data.item,
        data.movie,
        data.data && data.data.movie,
        data.data,
        data
    ];
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
        .map(m => { if (sid === 'kkphim') normalizeNguoncMovie(m); m._src = sid; return m; })
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
    const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['kkphim', 'vsmov'];
    let lastErr = null;
    for (const sid of ids) {
        try {
            const data = await fetchJson(srcListUrl(path, sid));
            const items = unwrapList(data).items.map(m => { if (sid === 'kkphim') normalizeNguoncMovie(m); m._src = sid; return m; });
            if (items.length || sid === ids[ids.length - 1]) {
                return { data: { items, pagination: unwrapList(data).pag || {} }, sid };
            }
        } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    throw new Error('all sources failed for ' + path);
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
        if (homePriorityMode && !searchKeyword && !currentGenreSlug && !currentCountrySlug
            && currentListEndpoint === 'phim-moi-cap-nhat') {
            return await fetchHomePriorityMovies(page);
        }
        const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['kkphim', 'vsmov'];
        let lastErr = null;
        let lastEmpty = null;
        for (const sid of ids) {
            try {
                const result = await fetchMoviesFromSource(sid, page);
                if (result.movies.length || sid === ids[ids.length - 1]) {
                    applyListPagination(result.pagination, page, result.movies.length);
                    return result.movies;
                }
                lastEmpty = result;
            } catch (e) { lastErr = e; }
        }
        if (lastEmpty) {
            applyListPagination(lastEmpty.pagination, page, lastEmpty.movies.length);
            return lastEmpty.movies;
        }
        if (lastErr) throw lastErr;
        applyListPagination({ currentPage: page, totalPages: 1, totalItems: 0 }, page, 0);
        return [];
    } catch (error) {
        console.error('Lỗi tải phim:', error);
        showToast('error', 'Lỗi kết nối', 'Không thể tải danh sách phim. Vui lòng thử lại!');
        return [];
    }
}

async function fetchHomePriorityMovies(page = 1) {
    // Một request catalog duy nhất để có nội dung đầu tiên nhanh nhất.
    // Banner/đề xuất được tải riêng ở nền sau khi grid đã có dữ liệu.
    const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : ['kkphim', 'vsmov'];
    let lastErr = null;
    for (const sid of ids) {
        try {
            const path = sid === 'vsmov'
                ? `/danh-sach/phim-moi-cap-nhat?page=${page}`
                : `/danh-sach/phim-moi-cap-nhat?page=${page}`;
            const data = await fetchJson(srcListUrl(path, sid));
            const wrapped = unwrapList(data);
            const movies = wrapped.items.map(m => { if (sid === 'kkphim') normalizeNguoncMovie(m); m._src = sid; return m; }).filter(m => pickPoster(m, sid));
            if (movies.length || sid === ids[ids.length - 1]) {
                applyListPagination({
                    currentPage: page,
                    totalPages: wrapped.pag.totalPages || data.last_page || data.total_pages || 1,
                    totalItems: wrapped.pag.totalItems || data.total || movies.length
                }, page, movies.length);
                return movies;
            }
        } catch (error) { lastErr = error; }
    }
    if (lastErr) throw lastErr;
    throw new Error('home catalog fetch failed');
}

async function fetchMovieDetail(slug, preferredSrc) {
    const first = preferredSrc || currentSourceId;
    const other = first === 'kkphim' ? 'vsmov' : 'kkphim';
    const order = [first];
    if (other !== first) order.push(other);
    let lastErr = null;
    for (const sid of order) {
        const urls = (typeof srcDetailUrls === 'function') ? srcDetailUrls(slug, sid) : [srcDetailUrl(slug, sid)];
        for (const url of urls) {
            try {
                const data = await fetchJson(url);
                const movie = unwrapDetailPayload(data);
                if (!movie || (!movie.slug && !movie.name)) continue;
                movie._src = sid;
                return movie;
            } catch (e) {
                lastErr = e;
            }
        }
    }
    console.error('Lỗi tải chi tiết phim:', lastErr);
    showToast('error', 'Lỗi', 'Không thể tải thông tin phim!');
    return null;
}
