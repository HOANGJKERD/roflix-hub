// ============================================================
        // RANDOM PHIM
        // ============================================================
        let randomQuickMovie = null;
        const randomState = { type: '', country: '', genre: '', count: 5 };

        function openRandomPanel() {
            navigateTo('main-site');
            setTimeout(() => {
                const el = document.getElementById('random-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
            if (!randomQuickMovie) randomQuick();
        }

        function bindRandomChips() {
            const bind = (id, key, multi = false) => {
                const box = document.getElementById(id);
                if (!box) return;
                box.querySelectorAll('.chip').forEach(btn => {
                    btn.addEventListener('click', () => {
                        box.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        randomState[key] = btn.getAttribute('data-v') || '';
                        if (key === 'count') randomState.count = parseInt(btn.getAttribute('data-v') || '5', 10) || 5;
                    });
                });
            };
            bind('rand-type', 'type');
            bind('rand-country', 'country');
            bind('rand-genre', 'genre');
            bind('rand-count', 'count');
        }

        async function fetchRandomPool(opts = {}) {
            const page = opts.page || (1 + Math.floor(Math.random() * 5));
            let path;
            if (opts.genre) {
                path = `/the-loai/${opts.genre}?page=${page}`;
            } else if (opts.country) {
                path = `/quoc-gia/${opts.country}?page=${page}`;
            } else if (opts.type) {
                path = `/danh-sach/${opts.type}?page=${page}`;
            } else {
                const modes = [
                    `/danh-sach/phim-moi-cap-nhat?page=${page}`,
                    `/quoc-gia/au-my?page=${page}`,
                    `/quoc-gia/han-quoc?page=${page}`,
                    `/danh-sach/phim-bo?page=${page}`,
                    `/danh-sach/phim-le?page=${page}`
                ];
                path = modes[Math.floor(Math.random() * modes.length)];
            }
            const res = await fetchListWithFallback(path);
            return mapListResultItems(res).filter(m => m.slug && isValidPosterUrl(m.poster));
        }

        function shuffle(arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        async function randomQuick() {
            const box = document.getElementById('random-quick');
            const watchBtn = document.getElementById('random-quick-watch');
            if (box) box.innerHTML = '<p class="meta">Đang quay...</p>';
            if (watchBtn) watchBtn.style.display = 'none';
            try {
                let pool = await fetchRandomPool({});
                if (pool.length < 5) {
                    const more = await fetchRandomPool({ page: 1 + Math.floor(Math.random() * 3) });
                    pool = [...pool, ...more];
                }
                if (!pool.length) {
                    if (box) box.innerHTML = '<p class="meta">Không lấy được phim. Thử lại.</p>';
                    return;
                }
                const m = pool[Math.floor(Math.random() * pool.length)];
                randomQuickMovie = m;
                if (box) {
                    box.innerHTML = `
                        <img src="${m.poster}" alt="" onclick="viewMovieDetail('${m.slug}')"
                             onerror="this.src='https://placehold.co/160x240/1a1a1a/666?text=No'">
                        <div class="title">${escapeHtml(m.title)}</div>
                        <div class="meta"><i class="fa-solid fa-star text-amber-400"></i> ${m.rating || 'N/A'} · ${escapeHtml(m.year || '')} · ${escapeHtml(m.type || 'Phim')}</div>
                    `;
                }
                if (watchBtn) watchBtn.style.display = '';
            } catch (e) {
                console.error(e);
                if (box) box.innerHTML = '<p class="meta">Lỗi mạng. Bấm quay lại.</p>';
            }
        }

        function randomQuickWatch() {
            if (!randomQuickMovie) return;
            playMovie(randomQuickMovie.slug);
        }

        async function randomAdvanced() {
            const grid = document.getElementById('random-advanced-grid');
            if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:#9ca3af;font-size:0.85rem">Đang quay...</div>';
            try {
                const need = randomState.count || 5;
                let pool = [];
                // lấy 2-3 page để đủ random
                for (let i = 0; i < 3 && pool.length < need * 3; i++) {
                    const batch = await fetchRandomPool({
                        type: randomState.type,
                        country: randomState.country,
                        genre: randomState.genre,
                        page: 1 + Math.floor(Math.random() * 6)
                    });
                    const map = new Map(pool.map(m => [m.slug, m]));
                    batch.forEach(m => map.set(m.slug, m));
                    pool = [...map.values()];
                }
                const picked = shuffle(pool).slice(0, need);
                if (!picked.length) {
                    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:#9ca3af">Không có kết quả với bộ lọc này.</div>';
                    return;
                }
                if (grid) {
                    grid.innerHTML = picked.map(m => `
                        <div class="item" onclick="viewMovieDetail('${m.slug}')">
                            <img src="${m.poster}" alt="" loading="lazy" decoding="async"
                                 onerror="this.src='https://placehold.co/150x225/1a1a1a/666?text=No'">
                            <div class="cap">${escapeHtml(m.title)}</div>
                        </div>
                    `).join('');
                }
                // nếu count=1 cũng cập nhật quick
                if (picked.length === 1) {
                    randomQuickMovie = picked[0];
                    const box = document.getElementById('random-quick');
                    const watchBtn = document.getElementById('random-quick-watch');
                    const m = picked[0];
                    if (box) {
                        box.innerHTML = `
                            <img src="${m.poster}" alt="" onclick="viewMovieDetail('${m.slug}')">
                            <div class="title">${escapeHtml(m.title)}</div>
                            <div class="meta"><i class="fa-solid fa-star text-amber-400"></i> ${m.rating || 'N/A'} · ${escapeHtml(m.year || '')}</div>
                        `;
                    }
                    if (watchBtn) watchBtn.style.display = '';
                }
            } catch (e) {
                console.error(e);
                if (grid) grid.innerHTML = '<div style="grid-column:1/-1;color:#9ca3af">Lỗi tải. Thử lại.</div>';
            }
        }

        // Phím R = random nhanh (không khi đang gõ input)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                const tag = (e.target && e.target.tagName) || '';
                if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                randomQuick();
            }
        });
