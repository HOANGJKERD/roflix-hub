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
            const primary = currentSourceId;
            const secondary = primary === 'kkphim' ? 'vsmov' : 'kkphim';
            try {
                const data = await fetchJson(srcListUrl(path, primary));
                return { data, sid: primary };
            } catch (e1) {
                try {
                    const data = await fetchJson(srcListUrl(path, secondary));
                    return { data, sid: secondary };
                } catch (e2) {
                    throw e2;
                }
            }
        }

        // Map nhanh danh sách item trả về từ fetchListWithFallback, gán đúng _src cho từng phim
        // (để lấy đúng CDN ảnh của nguồn đã thực sự trả dữ liệu, tránh lệch nguồn).
        function mapListResultItems(result, limit) {
            const items = unwrapList(result.data).items;
            const sliced = typeof limit === 'number' ? items.slice(0, limit) : items;
            return sliced.map(m => { m._src = result.sid; return mapMovieData(m); });
        }

        async function fetchMovies(page = 1) {
            try {
                if (homePriorityMode && !searchKeyword && !currentGenreSlug && !currentCountrySlug
                    && currentListEndpoint === 'phim-moi-cap-nhat') {
                    return await fetchHomePriorityMovies(page);
                }
                const primary = currentSourceId;
                const secondary = primary === 'kkphim' ? 'vsmov' : 'kkphim';
                try {
                    const primaryMovies = await fetchMoviesFromSource(primary, page);
                    // Với thể loại/quốc gia/danh mục, một số nguồn trả HTTP 200 nhưng danh sách rỗng
                    // do taxonomy khác nhau. Thử nguồn còn lại trước khi hiển thị trạng thái rỗng.
                    if (primaryMovies.length || (!currentGenreSlug && !currentCountrySlug)) return primaryMovies;
                    console.warn(primary + ' trả danh sách rỗng, thử nguồn ' + secondary);
                    const backupMovies = await fetchMoviesFromSource(secondary, page);
                    return backupMovies.length ? backupMovies : primaryMovies;
                } catch (e1) {
                    console.warn(primary + ' fail, fallback ' + secondary, e1);
                    const movies = await fetchMoviesFromSource(secondary, page);
                    if (typeof showToastPro === 'function') {
                        showToastPro('warning', 'Nguồn phụ', getSource(primary).name + ' lỗi — đang dùng ' + getSource(secondary).name);
                    } else {
                        showToast('error', 'Nguồn phụ', 'Đã chuyển sang ' + getSource(secondary).name);
                    }
                    return movies;
                }
            } catch (error) {
                console.error('Lỗi tải phim:', error);
                showToast('error', 'Lỗi kết nối', 'Không thể tải danh sách phim. Vui lòng thử lại!');
                return [];
            }
        }

        async function fetchHomePriorityMovies(page = 1) {
            const sid = currentSourceId;
            const other = sid === 'kkphim' ? 'vsmov' : 'kkphim';
            const [auRes, krRes] = await Promise.all([
                fetch(srcListUrl(`/quoc-gia/au-my?page=${page}`, sid)),
                fetch(srcListUrl(`/quoc-gia/han-quoc?page=${page}`, sid))
            ]);
            if (!auRes.ok && !krRes.ok) {
                const [au2, kr2] = await Promise.all([
                    fetch(srcListUrl(`/quoc-gia/au-my?page=${page}`, other)),
                    fetch(srcListUrl(`/quoc-gia/han-quoc?page=${page}`, other))
                ]);
                if (!au2.ok && !kr2.ok) throw new Error('home priority fetch failed');
                return mergeHomePriority(au2, kr2, page, other);
            }
            const primaryMovies = await mergeHomePriority(auRes, krRes, page, sid);
            if (primaryMovies.length) return primaryMovies;
            const [au2, kr2] = await Promise.all([
                fetch(srcListUrl(`/quoc-gia/au-my?page=${page}`, other)),
                fetch(srcListUrl(`/quoc-gia/han-quoc?page=${page}`, other))
            ]);
            if (!au2.ok && !kr2.ok) return primaryMovies;
            return mergeHomePriority(au2, kr2, page, other);
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
            const order = [];
            const first = preferredSrc || currentSourceId;
            order.push(first);
            const other = first === 'kkphim' ? 'vsmov' : 'kkphim';
            if (!order.includes(other)) order.push(other);
            let lastErr = null;
            for (const sid of order) {
                try {
                    const data = await fetchJson(srcDetailUrl(slug, sid));
                    const movie = data.movie || data.data || data;
                    if (!movie || (!movie.slug && !movie.name)) continue;
                    if (data.episodes && !movie.episodes) movie.episodes = data.episodes;
                    movie._src = sid;
                    return movie;
                } catch (e) {
                    lastErr = e;
                }
            }
            console.error('Lỗi tải chi tiết phim:', lastErr);
            showToast('error', 'Lỗi', 'Không thể tải thông tin phim!');
            return null;
        }
