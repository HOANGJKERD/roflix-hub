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
    const items = data.items || (data.data && data.data.items) || data.data || data.movies || [];
    const pag = data.pagination
        || (data.data && data.data.params && data.data.params.pagination)
        || (data.params && data.params.pagination)
        || {};
    return { items: Array.isArray(items) ? items : [], pag };
}

function unwrapDetailPayload(data) {
    if (!data || typeof data !== 'object') return null;
    // KKPhim v1: { data: { item: { ..., episodes: [...] } } }
    const candidates = [
        data.data && data.data.item,
        data.item,
        data.movie,
        data.data,
        data
    ];
    const movie = candidates.find(item => item && typeof item === 'object'
        && (item.slug || item.name || item.origin_name));
    if (!movie) return null;

    // Episodes thuộc item là nguồn ưu tiên; một số API cũ đặt episodes ở root.
    const episodes = Array.isArray(movie.episodes) ? movie.episodes
        : (Array.isArray(data.episodes) ? data.episodes : []);
    movie.episodes = episodes;
    return movie;
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
const API_REQUEST_TIMEOUT = 5000; // giới hạn mỗi request, không để chuỗi fallback kéo dài

async function fetchJson(url) {
    const hit = _apiCache.get(url);
    if (hit && (Date.now() - hit.time) < API_CACHE_TTL) return hit.data;

    const inflight = _apiInflight.get(url);
    if (inflight) return inflight;

    const request = (async () => {
        let staleHit = hit && (Date.now() - hit.time) < API_CACHE_STALE_TTL ? hit : null;
        let timer = null;
        let controller = null;
        try {
            if (typeof AbortController !== 'undefined') controller = new AbortController();
            timer = setTimeout(() => {
                try { if (controller) controller.abort(); } catch (_) {}
            }, API_REQUEST_TIMEOUT);

            const options = controller ? { signal: controller.signal } : undefined;
            const res = await fetch(url, options);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (_apiCache.size >= API_CACHE_MAX) {
                const oldestKey = _apiCache.keys().next().value;
                _apiCache.delete(oldestKey);
            }
            _apiCache.set(url, { data, time: Date.now() });
            return data;
        } catch (error) {
            if (staleHit) {
                console.warn('[RoFlix API] dùng cache cũ do request lỗi:', url, error);
                return staleHit.data;
            }
            if (error && error.name === 'AbortError') throw new Error('API timeout after ' + (API_REQUEST_TIMEOUT / 1000) + 's');
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
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
        .map(m => { m._src = sid; return m; })
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
            const items = unwrapList(data).items.map(m => { m._src = sid; return m; });
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
            const movies = wrapped.items.map(m => { m._src = sid; return m; }).filter(m => pickPoster(m, sid));
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
