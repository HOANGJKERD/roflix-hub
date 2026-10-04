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
            if (/^https?:\/\//i.test(url)) return url;
            const cdn = getSource(sid || currentSourceId).cdn;
            if (!cdn) return '';
            return cdn.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
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
            let movie = null;
            let episodes = Array.isArray(data.episodes) ? data.episodes : [];
            if (data.movie && typeof data.movie === 'object') movie = data.movie;
            else if (data.data && data.data.item && typeof data.data.item === 'object') movie = data.data.item;
            else if (data.data && (data.data.slug || data.data.name)) movie = data.data;
            else if (data.item && (data.item.slug || data.item.name)) movie = data.item;
            else if (data.slug || data.name) movie = data;
            if (!movie) return null;
            if (Array.isArray(movie.episodes) && movie.episodes.length) episodes = movie.episodes;
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

        // Cache nhẹ trong bộ nhớ để tránh gọi lại API khi quay lại trang/thể loại vừa xem
        const _apiCache = new Map();
        const API_CACHE_TTL = 120000; // 2 phút
        const API_CACHE_MAX = 60; // tránh phình bộ nhớ khi lướt nhiều trang
        async function fetchJson(url) {
            const hit = _apiCache.get(url);
            if (hit && (Date.now() - hit.time) < API_CACHE_TTL) {
                return hit.data;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (_apiCache.size >= API_CACHE_MAX) {
                const oldestKey = _apiCache.keys().next().value;
                _apiCache.delete(oldestKey);
            }
            _apiCache.set(url, { data, time: Date.now() });
            return data;
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
            totalPages = pag.totalPages || data.last_page || data.total_pages || 1;
            totalItems = pag.totalItems || data.total || movies.length;
            currentPage = pag.currentPage || page;
            return movies;
        }

        // Gọi 1 endpoint danh sách với tự động dự phòng: nếu nguồn đang chọn lỗi,
        // tự chuyển sang nguồn còn lại (VSMOV <-> KKPhim) để trang không bị "trắng" khi 1 nguồn sập.
        // path: đường dẫn KHÔNG kèm domain, ví dụ '/quoc-gia/au-my?page=1'
        async function fetchListWithFallback(path) {
            const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : [currentSourceId, currentSourceId === 'kkphim' ? 'vsmov' : 'kkphim'];
            const settled = await Promise.allSettled(
                ids.map(sid => fetchJson(srcListUrl(path, sid)).then(data => ({ data, sid })))
            );
            const ok = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
            if (!ok.length) throw new Error('all sources failed for ' + path);
            const groups = ok.map(r => unwrapList(r.data).items.map(m => { m._src = r.sid; return m; }));
            const items = mergeMovieLists(groups);
            const pag = unwrapList(ok[0].data).pag || {};
            return { data: { items, pagination: pag }, sid: ok[0].sid };
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
                const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : [currentSourceId];
                const settled = await Promise.allSettled(ids.map(sid => fetchMoviesFromSource(sid, page)));
                const lists = [];
                let maxPages = 1;
                let sumItems = 0;
                settled.forEach(s => {
                    if (s.status !== 'fulfilled') return;
                    lists.push(s.value);
                    maxPages = Math.max(maxPages, totalPages || 1);
                    sumItems += totalItems || s.value.length;
                });
                if (!lists.length) throw new Error('all sources failed');
                const merged = mergeMovieLists(lists);
                totalPages = maxPages;
                totalItems = sumItems || merged.length;
                currentPage = page;
                return merged;
            } catch (error) {
                console.error('Lỗi tải phim:', error);
                showToast('error', 'Lỗi kết nối', 'Không thể tải danh sách phim. Vui lòng thử lại!');
                return [];
            }
        }

        async function fetchHomePriorityMovies(page = 1) {
            const ids = (typeof activeSourceIds === 'function') ? activeSourceIds() : [currentSourceId];
            const jobs = [];
            ids.forEach(sid => {
                jobs.push(fetch(srcListUrl(`/quoc-gia/au-my?page=${page}`, sid)).then(r => ({ r, sid, kind: 'au' })));
                jobs.push(fetch(srcListUrl(`/quoc-gia/han-quoc?page=${page}`, sid)).then(r => ({ r, sid, kind: 'kr' })));
            });
            const settled = await Promise.allSettled(jobs);
            const auGroups = [];
            const krGroups = [];
            let maxPages = 1;
            let sumItems = 0;
            for (const s of settled) {
                if (s.status !== 'fulfilled') continue;
                const { r, sid, kind } = s.value;
                const data = r.ok ? await r.json() : { items: [], pagination: {} };
                const wrap = unwrapList(data);
                const list = wrap.items.map(m => { m._src = sid; return m; }).filter(m => pickPoster(m, sid));
                maxPages = Math.max(maxPages, (wrap.pag && wrap.pag.totalPages) || 1);
                sumItems += (wrap.pag && wrap.pag.totalItems) || list.length;
                if (kind === 'au') auGroups.push(list); else krGroups.push(list);
            }
            const au = mergeMovieLists(auGroups);
            const kr = mergeMovieLists(krGroups);
            const merged = [];
            let i = 0, j = 0;
            while (i < au.length || j < kr.length) {
                if (i < au.length) merged.push(au[i++]);
                if (i < au.length) merged.push(au[i++]);
                if (j < kr.length) merged.push(kr[j++]);
            }
            totalPages = maxPages;
            totalItems = sumItems;
            currentPage = page;
            if (!merged.length) throw new Error('home priority fetch failed');
            return merged;
        }

        async function mergeHomePriority(auRes, krRes, page, sid) {
            const auData = auRes.ok ? await auRes.json() : { items: [], pagination: {} };
            const krData = krRes.ok ? await krRes.json() : { items: [], pagination: {} };
            const auWrap = unwrapList(auData);
            const krWrap = unwrapList(krData);

            const au = auWrap.items.map(m => { m._src = sid; return m; }).filter(m => pickPoster(m, sid));
            const kr = krWrap.items.map(m => { m._src = sid; return m; }).filter(m => pickPoster(m, sid));

            const merged = [];
            let i = 0, j = 0;
            while (i < au.length || j < kr.length) {
                if (i < au.length) merged.push(au[i++]);
                if (i < au.length) merged.push(au[i++]);
                if (j < kr.length) merged.push(kr[j++]);
            }

            const auPages = (auWrap.pag && auWrap.pag.totalPages) || 1;
            const krPages = (krWrap.pag && krWrap.pag.totalPages) || 1;
            totalPages = Math.max(auPages, krPages);
            totalItems = ((auWrap.pag && auWrap.pag.totalItems) || 0)
                + ((krWrap.pag && krWrap.pag.totalItems) || 0);
            currentPage = page;
            return merged;
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
