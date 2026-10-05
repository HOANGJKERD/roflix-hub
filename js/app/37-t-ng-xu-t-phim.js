// ============================================================
        // TỰ ĐỘNG ĐỀ XUẤT PHIM
        // ============================================================
        let recoCache = [];
        let recoSeed = Date.now();

        const RECO_GENRES = ['Hành Động','Tình Cảm','Hài Hước','Kinh Dị','Viễn Tưởng','Phiêu Lưu','Hoạt Hình','Tâm Lý','Cổ Trang','Chiến Tranh','Gia Đình','Hình Sự','Bí Ẩn','Tài Liệu'];
        function getRecoPreferences() {
            try { const v = JSON.parse(localStorage.getItem('roflix-reco-preferences') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
        }
        function renderRecoPreferences() {
            const el = document.getElementById('reco-preference-chips'); if (!el) return;
            const selected = new Set(getRecoPreferences());
            el.innerHTML = RECO_GENRES.map(g => `<button type="button" aria-pressed="${selected.has(g)}" onclick="toggleRecoPreference('${g}',this)" class="rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected.has(g) ? 'border-amber-400 bg-amber-500 text-black' : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-amber-500'}">${g}</button>`).join('');
        }
        function toggleRecoPreference(genre, btn) {
            let selected = getRecoPreferences();
            selected = selected.includes(genre) ? selected.filter(x => x !== genre) : [...selected, genre];
            try { localStorage.setItem('roflix-reco-preferences', JSON.stringify(selected)); } catch (_) {}
            renderRecoPreferences(); refreshRecommendations(false);
        }
        function resetRecoPreferences() {
            try { localStorage.removeItem('roflix-reco-preferences'); } catch (_) {}
            renderRecoPreferences(); refreshRecommendations(false);
        }
        function getRecoSignals() {
            let history = [];
            history = (typeof getWatchHistory === 'function') ? getWatchHistory() : [];
            history = Array.isArray(history) ? history : [];
            history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            const favs = (typeof getFavorites === 'function') ? getFavorites() : [];
            const watched = new Set(history.map(h => h.slug).filter(Boolean));
            favs.forEach(s => watched.add(s));
            const genreWeights = {};
            // Phim đã lưu kèm thể loại sẽ có trọng số theo độ gần đây.
            history.forEach((h, i) => (h.genres || h.genre || []).forEach(g => {
                const name = String(typeof g === 'object' ? (g.name || '') : g).toLowerCase();
                if (name) genreWeights[name] = (genreWeights[name] || 0) + Math.max(1, 8 - Math.min(i, 7));
            }));
            const preferences = getRecoPreferences();
            preferences.forEach(g => genreWeights[g.toLowerCase()] = (genreWeights[g.toLowerCase()] || 0) + 14);
            return { history, favs, watched, genreWeights, preferences };
        }

        function scoreMovie(m, signals) {
            let score = 0;
            const rating = parseFloat(m.rating) || 0;
            score += Math.min(rating, 10) * 3;
            const year = parseInt(m.year, 10);
            if (!isNaN(year)) { if (year >= 2023) score += 8; else if (year >= 2018) score += 4; else if (year >= 2010) score += 1; }
            if (signals.watched.has(m.slug)) score -= 50;
            if ((m.episode_total || 0) > 1) score += 2;
            const genres = (m.genre || []).map(g => String(typeof g === 'object' ? (g.name || '') : g).toLowerCase());
            genres.forEach(g => {
                Object.entries(signals.genreWeights).forEach(([wanted, weight]) => {
                    if (g.includes(wanted) || wanted.includes(g)) score += weight * 1.8;
                });
            });
            score += (Math.abs(hashStr(m.slug + recoSeed)) % 100) / 20;
            return score;
        }

        function hashStr(s) {
            let h = 0;
            for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
            return h;
        }

        // Đề xuất gộp song song cả VSMOV và KKPhim, không phụ thuộc nguồn đang chọn ở giao diện.
        // Mỗi phim giữ _src để khi bấm vào sẽ mở đúng API nguồn đã cung cấp phim đó.
        async function fetchRecoPool() {
            const paths = [
                '/danh-sach/phim-moi-cap-nhat?page=1',
                '/danh-sach/phim-bo?page=1',
                '/quoc-gia/au-my?page=1',
                '/quoc-gia/han-quoc?page=1'
            ];
            const bySlug = new Map();
            async function ingest(sid) {
                for (const path of paths) {
                    try {
                        const data = await fetchJson(srcListUrl(path, sid));
                        unwrapList(data).items.forEach(item => {
                            item._src = sid;
                            const m = mapMovieData(item);
                            if (!m.slug || !isValidPosterUrl(m.poster) || bySlug.has(m.slug)) return;
                            bySlug.set(m.slug, m);
                        });
                    } catch (_) {}
                }
            }
            await ingest('kkphim');
            if (bySlug.size < 24) await ingest('vsmov');
            return [...bySlug.values()];
        }

        function whyText(m, signals) {
            const rating = parseFloat(m.rating) || 0;
            if (signals.history.length && rating >= 7.5) return 'Gợi ý theo gu xem gần đây';
            if (rating >= 8) return 'Đánh giá cao';
            if ((parseInt(m.year, 10) || 0) >= 2024) return 'Mới cập nhật';
            if ((m.episode_total || 0) > 1) return 'Phù hợp xem dài tập';
            return 'Đề xuất hôm nay';
        }

        function renderRecoTonight(m) {
            const box = document.getElementById('reco-tonight');
            if (!box) return;
            if (!m) { box.style.display = 'none'; return; }
            box.style.display = 'grid';
            box.onclick = () => viewMovieDetail(m.slug, m._src);
            box.innerHTML = `
                <img src="${m.poster}" alt="" onerror="this.src='https://placehold.co/120x72/1a1a1a/666?text=RoFlix'">
                <div>
                    <div class="tag">🎬 Tối nay coi gì?</div>
                    <p class="name">${escapeHtml(m.title)}</p>
                    <p class="meta"><i class="fa-solid fa-star text-amber-400"></i> ${m.rating || 'N/A'} · ${escapeHtml(m.year || '')} · ${escapeHtml(m.type || 'Phim')} · ${escapeHtml((m._src || '').toUpperCase())}</p>
                </div>
                <button type="button" class="go" onclick="event.stopPropagation(); playMovie('${m.slug}', '${m._src || ''}')">
                    <i class="fa-solid fa-play"></i> Xem ngay
                </button>
            `;
        }

        function renderRecoRow(list, signals) {
            const row = document.getElementById('reco-row');
            if (!row) return;
            if (!list.length) {
                row.className = 'reco-row reco-empty';
                row.textContent = 'Chưa lấy được đề xuất. Bấm “Đổi đề xuất” thử lại.';
                return;
            }
            row.className = 'reco-row';
            row.innerHTML = list.map(m => `
                <div class="reco-card" onclick="viewMovieDetail('${m.slug}', '${m._src || ''}')">
                    <img src="${m.poster}" alt="" loading="lazy" onerror="this.src='https://placehold.co/140x210/1a1a1a/666?text=No'">
                    <div class="body">
                        <p class="t">${escapeHtml(m.title)}</p>
                        <p class="s"><i class="fa-solid fa-star text-amber-400"></i> ${m.rating || 'N/A'} · ${escapeHtml(m.year || '')} · ${escapeHtml((m._src || '').toUpperCase())}</p>
                        <span class="reco-why">${escapeHtml(whyText(m, signals))}</span>
                    </div>
                </div>
            `).join('');
        }

        async function refreshRecommendations(shuffle = false) {
            const row = document.getElementById('reco-row');
            if (row) {
                row.className = 'reco-row reco-empty';
                row.textContent = 'Đang tổng hợp đề xuất từ KKPhim + VSMOV...';
            }
            if (shuffle) recoSeed = Date.now();
            try {
                if (!recoCache.length || shuffle) {
                    recoCache = await fetchRecoPool();
                }
                const signals = getRecoSignals();
                const ranked = recoCache
                    .map(m => ({ m, s: scoreMovie(m, signals) }))
                    .sort((a, b) => b.s - a.s)
                    .map(x => x.m)
                    .filter(m => !signals.watched.has(m.slug));

                const pool = ranked.length ? ranked : recoCache;
                const tonight = pool[0] || null;
                const rowList = pool.slice(tonight ? 1 : 0, (tonight ? 1 : 0) + 12);
                renderRecoTonight(tonight);
                renderRecoRow(rowList, signals);
            } catch (e) {
                console.error('Reco error', e);
                if (row) {
                    row.className = 'reco-row reco-empty';
                    row.textContent = 'Không tải được đề xuất. Kiểm tra mạng và thử lại.';
                }
            }
        }
