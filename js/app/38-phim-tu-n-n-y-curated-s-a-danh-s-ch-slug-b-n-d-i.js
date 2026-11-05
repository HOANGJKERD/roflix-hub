// ============================================================
        // PHIM TUẦN NÀY (curated — sửa danh sách slug bên dưới)
        // ============================================================
        // Thêm/bớt phim bằng slug VSMOV (xem trên URL chi tiết hoặc API)
        const WEEKLY_PICKS = [
            // Ví dụ — đổi thành slug bạn muốn highlight tuần này:
            // 'ten-slug-phim-1',
            // 'ten-slug-phim-2',
        ];

        // Fallback: nếu WEEKLY_PICKS trống → lấy top Âu Mỹ + Hàn
        async function loadWeeklyPicks() {
            const row = document.getElementById('weekly-row');
            if (!row) return;
            row.innerHTML = '<div class="text-sm text-gray-500 py-2">Đang tải phim tuần này...</div>';
            try {
                let movies = [];
                const slugs = WEEKLY_PICKS.filter(Boolean);
                if (slugs.length) {
                    const results = await Promise.all(
                        slugs.slice(0, 10).map(async (slug) => {
                            try {
                                const d = await fetchMovieDetail(slug);
                                return d ? mapMovieData(d) : null;
                            } catch (_) { return null; }
                        })
                    );
                    movies = results.filter(m => m && m.slug && isValidPosterUrl(m.poster));
                }
                if (!movies.length) {
                    const [auRes, krRes] = await Promise.allSettled([
                        fetchListWithFallback('/quoc-gia/au-my?page=1'),
                        fetchListWithFallback('/quoc-gia/han-quoc?page=1')
                    ]);
                    const pool = [
                        ...(auRes.status === 'fulfilled' ? mapListResultItems(auRes.value) : []),
                        ...(krRes.status === 'fulfilled' ? mapListResultItems(krRes.value) : [])
                    ].filter(m => m.slug && isValidPosterUrl(m.poster));
                    // chọn 8 phim rating cao
                    movies = pool
                        .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
                        .slice(0, 8);
                }
                if (!movies.length) {
                    row.innerHTML = '<div class="text-sm text-gray-500 py-2">Chưa có phim tuần này.</div>';
                    return;
                }
                row.innerHTML = movies.map((m, i) => `
                    <div class="weekly-card" onclick="viewMovieDetail('${m.slug}')">
                        <span class="weekly-badge">#${i + 1} TUẦN NÀY</span>
                        <img src="${m.poster}" alt="" loading="lazy" decoding="async"
                             onerror="this.src='https://placehold.co/150x225/1a1a1a/666?text=No'">
                        <div class="body">
                            <p class="t">${escapeHtml(m.title)}</p>
                            <p class="s"><i class="fa-solid fa-star text-amber-400"></i> ${m.rating || 'N/A'} · ${escapeHtml(m.year || '')} · ${escapeHtml((m._src || '').toUpperCase())}</p>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                console.error(e);
                row.innerHTML = `<div class="text-sm text-gray-500 py-2">Lỗi tải.
                    <button type="button" onclick="loadWeeklyPicks()" class="text-amber-400 underline ml-1">Thử lại</button></div>`;
            }
        }
