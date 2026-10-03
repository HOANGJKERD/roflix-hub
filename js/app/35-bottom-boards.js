// ============================================================
        // BOTTOM BOARDS
        // ============================================================
        async function renderBottomBoards() {
            await Promise.all([
                renderBbHot(),
                renderBbFav(),
                renderBbGenres(),
                renderBbComments()
            ]);
        }

        function bbMovieRow(m, rank, trendUp = true) {
            const poster = m.poster || m.thumb || 'https://placehold.co/34x48/1a1a1a/666?text=-';
            const trend = trendUp
                ? '<i class="fa-solid fa-arrow-trend-up bb-trend"></i>'
                : '<i class="fa-solid fa-arrow-trend-down bb-trend down"></i>';
            return `<li class="bb-item" onclick="viewMovieDetail('${m.slug}')">
                <span class="bb-rank">${rank}</span>
                ${trend}
                <img class="bb-thumb" src="${poster}" alt="" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/34x48/1a1a1a/666?text=-'">
                <span class="bb-name">${escapeHtml(m.title || m.name || 'Phim')}</span>
            </li>`;
        }

        async function renderBbHot() {
            const el = document.getElementById('bb-hot-list');
            if (!el) return;
            try {
                const res = await fetchListWithFallback('/quoc-gia/au-my?page=1');
                const items = mapListResultItems(res, 5);
                if (!items.length) {
                    el.innerHTML = '<li class="text-xs text-gray-500 px-2">Chưa có dữ liệu</li>';
                    return;
                }
                el.innerHTML = items.map((m, i) => bbMovieRow(m, i + 1, true)).join('');
            } catch (e) {
                el.innerHTML = '<li class="text-xs text-gray-500 px-2">Không tải được</li>';
            }
        }

        async function renderBbFav() {
            const el = document.getElementById('bb-fav-list');
            if (!el) return;
            try {
                const favIds = getFavorites();
                let items = [];
                if (favIds.length) {
                    const res = await fetchListWithFallback('/quoc-gia/au-my?page=1');
                    const all = mapListResultItems(res);
                    items = all.filter(m => favIds.includes(m.slug)).slice(0, 5);
                    for (const slug of favIds) {
                        if (items.length >= 5) break;
                        if (items.find(x => x.slug === slug)) continue;
                        try {
                            const d = await fetchMovieDetail(slug);
                            if (d) items.push(mapMovieData(d));
                        } catch (_) {}
                    }
                }
                if (items.length < 5) {
                    const res2 = await fetchListWithFallback('/danh-sach/phim-bo?page=1');
                    const more = mapListResultItems(res2);
                    for (const m of more) {
                        if (items.length >= 5) break;
                        if (!items.find(x => x.slug === m.slug)) items.push(m);
                    }
                }
                if (!items.length) {
                    el.innerHTML = '<li class="text-xs text-gray-500 px-2">Chưa có phim yêu thích</li>';
                    return;
                }
                el.innerHTML = items.slice(0, 5).map((m, i) => bbMovieRow(m, i + 1, i % 2 === 0)).join('');
            } catch (e) {
                el.innerHTML = '<li class="text-xs text-gray-500 px-2">Không tải được</li>';
            }
        }

        function renderBbGenres() {
            const el = document.getElementById('bb-genre-list');
            if (!el) return;
            const hotGenres = [
                { name: 'Chính kịch', slug: 'chinh-kich', color: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
                { name: 'Tâm Lý', slug: null, color: 'linear-gradient(135deg,#2563eb,#60a5fa)', keyword: 'Tâm Lý' },
                { name: 'Tình Cảm', slug: null, color: 'linear-gradient(135deg,#7c3aed,#c084fc)', keyword: 'Tình Cảm' },
                { name: 'Hài Hước', slug: 'hai', color: 'linear-gradient(135deg,#65a30d,#a3e635)' },
                { name: 'Phiêu Lưu', slug: 'phieu-luu', color: 'linear-gradient(135deg,#b45309,#fbbf24)' }
            ];
            el.innerHTML = hotGenres.map((g, i) => {
                const onclick = g.slug
                    ? `filterByGenre('${g.slug}','${g.name}')`
                    : `filterBy('genre','${g.keyword || g.name}')`;
                return `<button type="button" class="bb-genre-pill" style="background:${g.color}" onclick="${onclick}">
                    <span class="rank-ico">${i + 1}.</span>
                    <i class="fa-solid fa-arrow-trend-up" style="font-size:0.65rem"></i>
                    ${g.name}
                </button>`;
            }).join('');
        }

        function renderBbComments() {
            const el = document.getElementById('bb-comment-list');
            if (!el) return;
            let all = [];
            try {
                const raw = JSON.parse(localStorage.getItem('roflix-comments') || '{}');
                Object.keys(raw).forEach(slug => {
                    (raw[slug] || []).forEach(c => {
                        all.push({
                            slug,
                            user: c.user || c.username || 'Khán giả',
                            text: c.text || c.content || '',
                            movie: c.movieTitle || slug,
                            time: c.time || c.timestamp || 0
                        });
                    });
                });
            } catch (_) {}
            all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            all = all.slice(0, 4);

            if (!all.length) {
                all = [
                    { user: 'RoFlix Fan', text: 'Phim hay quá!', movie: 'Chào mừng đến RoFlix', slug: '' },
                ];
            }

            el.innerHTML = all.map(c => {
                const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user)}&background=f59e0b&color=000&size=64`;
                const click = c.slug ? `onclick="viewMovieDetail('${c.slug}')"` : '';
                return `<div class="bb-comment" ${click}>
                    <img class="bb-avatar" src="${avatar}" alt="">
                    <div class="bb-c-body">
                        <div class="bb-c-user">${escapeHtml(c.user)} <span class="badge-inf">∞</span></div>
                        <div class="bb-c-text">${escapeHtml(c.text)}</div>
                        <div class="bb-c-movie"><i class="fa-solid fa-play" style="font-size:0.55rem"></i> ${escapeHtml(c.movie)}</div>
                    </div>
                </div>`;
            }).join('');
        }
