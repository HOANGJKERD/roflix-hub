// ============================================================
        // RENDER DANH SÁCH PHIM
        // ============================================================
        let listFetchGen = 0;
        async function renderMoviesFromAPI(page = 1) {
            const gen = ++listFetchGen;
            const container = document.getElementById('movie-grid-container');
            if (!container) return;
            
            container.innerHTML = Array(12).fill(0).map(() => `
                <div class="skeleton-card-premium">
                    <div class="skeleton-poster"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `).join('');
            
            const movies = await fetchMovies(page);
            if (gen !== listFetchGen) return;
            currentPage = page;
            
            if (!movies || movies.length === 0) {
                const isSearch = !!searchKeyword;
                container.innerHTML = isSearch ? `
                    <div class="col-span-full">
                        <div class="empty-state">
                            <div class="empty-icon"><i class="fa-solid fa-film"></i></div>
                            <h3>Không tìm thấy phim</h3>
                            <p>Không có kết quả cho "${searchKeyword}"</p>
                            <button onclick="clearSearch()" class="empty-btn">Xem tất cả</button>
                        </div>
                    </div>
                ` : `
                    <div class="api-error-box">
                        <h3>😕 Không tải được danh sách phim</h3>
                        <p>Mạng yếu, API đang bận, hoặc chưa có dữ liệu. Thử lại nhé.</p>
                        <button type="button" onclick="renderMoviesFromAPI(${page})">
                            <i class="fa-solid fa-rotate-right"></i> Thử lại
                        </button>
                    </div>
                `;
                const ce = document.getElementById('movie-count');
                if (ce) ce.textContent = '0';
                totalPages = 1;
                totalItems = 0;
                if (typeof updatePagination === 'function') updatePagination();
                return;
            }
            
            const mappedMovies = movies
                .map(item => mapMovieData(item))
                .filter(m => isValidPosterUrl(m.poster));
            
            const countEl = document.getElementById('movie-count');
            if (countEl) {
                countEl.textContent = totalItems > 0
                    ? `${mappedMovies.length} / ${totalItems.toLocaleString('vi-VN')}`
                    : String(mappedMovies.length);
            }
            
            container.innerHTML = mappedMovies.map((m, index) => `
                <div onclick="viewMovieDetail('${m.slug}', '${m._src || ''}')" class="movie-card-premium card-stagger" data-rf-title="${escapeHtml(m.title + " " + (m.origin_name || ""))}">
                    <div class="card-poster">
                        <img src="${m.poster}" alt="${escapeHtml(m.title)}" loading="lazy" decoding="async"
                             onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=No+Image'">
                        <div class="card-overlay">
                            <button class="watch-btn btn-ripple" onclick="event.stopPropagation(); playMovie('${m.slug}', '${m._src || ''}')">
                                <i class="fa-solid fa-play"></i> Xem Ngay
                            </button>
                            <div class="card-actions">
                                <button onclick="event.stopPropagation(); toggleFavorite('${m.slug}')" title="Yêu thích">
                                    <i class="fa-${isFavorite(m.slug) ? 'solid' : 'regular'} fa-heart"></i>
                                </button>
                                <button onclick="event.stopPropagation(); viewMovieDetail('${m.slug}')" title="Chi tiết">
                                    <i class="fa-solid fa-circle-info"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-badges">
                            <span class="src-chip">${escapeHtml((m._src || '').toUpperCase())}</span>
                            ${parseFloat(m.rating) >= 8 ? '<span class="badge hot">🔥 Hot</span>' : ''}
                            ${(m.genre||[]).some(g=>/18\s*\+|hentai|người lớn/i.test(String(g))) ? '<span class="badge" style="background:#ef4444;color:#fff">🔒 18+</span>' : ''}
                            ${m.episode_total > 1 ? `<span class="badge eps">${m.episode_total} Tập</span>` : '<span class="badge eps">HD</span>'}
                            ${m.status === 'Hoàn thành' ? '<span class="badge" style="background: #10b981; color: white;">✅ Full</span>' : ''}
                        </div>
                    </div>
                    <div class="card-info">
                        <div class="card-title">${escapeHtml(m.title)}</div>
                        <div class="card-meta">
                            <span class="rating"><i class="fa-solid fa-star"></i> ${m.rating || 'N/A'}${m.imdbId ? ` · <a href="https://www.imdb.com/title/${m.imdbId}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="text-amber-400/80 hover:underline text-[10px]">IMDb</a>` : ''}</span>
                            <span>${m.year}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('movie-count').textContent = mappedMovies.length;
            updatePagination();
        }
