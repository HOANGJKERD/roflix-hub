// ============================================================
        // CHI TIẾT PHIM
        // ============================================================
        async function viewMovieDetail(slug, preferredSrc) {
            if (!slug) {
                showToast('error', 'Lỗi', 'Không tìm thấy phim!');
                return;
            }
            
            const movieData = await fetchMovieDetail(slug, preferredSrc);
            if (!movieData) return;
            
            const movie = mapMovieData(movieData);
            currentSlug = slug;
            const rating = getMovieRating(slug);
            const avg = rating.count > 0 ? (rating.total / rating.count) : 0;
            const isFav = isFavorite(slug);
            
            let episodesHTML = '';
            let epList = [];
            const episodeByName = new Map();
            if (movie.episodes && movie.episodes.length > 0) {
                movie.episodes.forEach(epGroup => {
                    if (epGroup.server_data && epGroup.server_data.length > 0) {
                        epGroup.server_data.forEach(ep => {
                            const embed = String(ep.link_embed || '').trim();
                            const hls = String(ep.link_m3u8 || '').trim();
                            const link = embed || hls;
                            if (!link) return;
                            const name = String(ep.name || ep.slug || 'Full').trim();
                            const key = name.toLowerCase().replace(/\s+/g, ' ');
                            const candidate = { name, link, isHls: !embed && /^https?:\/\/.+\.m3u8(?:$|\?)/i.test(hls) };
                            const existingIndex = episodeByName.get(key);
                            if (existingIndex == null) {
                                episodeByName.set(key, epList.length);
                                epList.push(candidate);
                            } else if (epList[existingIndex]?.isHls && !candidate.isHls) {
                                // Prefer an embeddable player URL when several API servers
                                // expose the same episode, instead of showing duplicate episodes.
                                epList[existingIndex] = candidate;
                            }
                        });
                    }
                });
            }
            currentEpisodeList = epList;
            currentMovieTitle = movie.title || '';
            currentMovieData = movie;
            try { if (window.rfAnalytics) window.rfAnalytics.movie('movie_detail', slug, currentMovieTitle); } catch (_) {}
            
            if (epList.length > 0) {
                episodesHTML = `
                    <div>
                        <h4 class="text-sm font-bold text-gray-400 mb-2">📺 Danh sách tập (${epList.length}):</h4>
                        <div class="flex flex-wrap gap-2">
                            ${epList.map((ep, idx) => `
                                <button onclick="playMovieByIndex(${idx})" 
                                        class="px-4 py-2 bg-gray-800 hover:bg-amber-500 hover:text-black rounded-xl text-xs font-bold transition">
                                    Tập ${escapeHtml(ep.name)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            const actorsHTML = movie.actors && movie.actors.length > 0 
                ? `<div class="flex flex-wrap gap-1 mt-1"><span class="text-gray-500">Diễn viên:</span> ${movie.actors.slice(0, 10).map(a => `<span class="text-xs bg-gray-800 px-2 py-1 rounded-full">${a}</span>`).join(' ')}</div>`
                : '';
            
            const directorsHTML = movie.directors && movie.directors.length > 0
                ? `<div class="flex flex-wrap gap-1"><span class="text-gray-500">Đạo diễn:</span> ${movie.directors.map(d => `<span class="text-xs bg-gray-800 px-2 py-1 rounded-full">${d}</span>`).join(' ')}</div>`
                : '';
            
            document.getElementById('detail-content-container').innerHTML = `
                <div class="glass-premium p-5 md:p-8 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <div class="aspect-[2/3] rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                            <img src="${movie.poster}" class="w-full h-full object-cover" alt="${escapeHtml(movie.title)}" 
                                 onerror="this.src='https://placehold.co/300x400/1a1a1a/666?text=No+Image'">
                        </div>
                        ${epList.length ? `<button onclick="playMovie('${slug}', '${movie._src || ''}')" class="rf-detail-watch-btn"><i class="fa-solid fa-play"></i> Xem phim</button>` : ''}
                    </div>
                    <div class="md:col-span-3 flex flex-col justify-between space-y-5">
                        <div>
                            <div class="flex justify-between items-start gap-3 flex-wrap">
                                <div>
                                    <h1 class="text-2xl md:text-3xl font-black text-white">${escapeHtml(movie.title)}</h1>
                                    <p class="text-sm mt-1 text-gray-400">${escapeHtml(movie.origin_name || '')}</p>
                                </div>
                                <button onclick="toggleFavorite('${slug}')" class="text-xs px-4 py-2.5 rounded-xl border border-gray-800 flex items-center gap-2 transition ${isFav ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' : 'bg-gray-900/60 text-gray-300 hover:border-amber-500'} btn-ripple">
                                    <i class="fa-${isFav ? 'solid' : 'regular'} fa-bookmark"></i>
                                    <span>${isFav ? 'Đã Yêu Thích' : 'Yêu Thích'}</span>
                                </button>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-300">
                                <span class="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold px-3 py-1 rounded-lg"><i class="fa-solid fa-star"></i> ${movie.rating || 'N/A'}</span>
                                ${movie.imdbId ? `<a href="https://www.imdb.com/title/${movie.imdbId}" target="_blank" rel="noopener" class="text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold">IMDb</a>` : ''}
                                ${movie.tmdbId ? `<a href="https://www.themoviedb.org/${movie.tmdbType === 'tv' ? 'tv' : 'movie'}/${movie.tmdbId}" target="_blank" rel="noopener" class="text-xs px-2.5 py-1 rounded-lg border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 font-bold">TMDB</a>` : ''}
                                <span>Dạng: <strong class="text-white">${movie.type}</strong></span>
                                <span>Năm: <strong class="text-white">${movie.year}</strong></span>
                                <span class="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-[10px] font-bold">${movie.episode_total || 0} Tập</span>
                                ${movie.quality ? `<span class="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold">${movie.quality}</span>` : ''}
                                ${movie.lang ? `<span class="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold">${movie.lang}</span>` : ''}
                            </div>
                            
                            <div class="rating-system mt-3" id="rating-system-${slug}">
                                <div class="stars" data-movie-id="${slug}">
                                    ${[1,2,3,4,5].map(v => `<span class="star ${rating.user >= v ? 'active' : ''}" data-value="${v}">★</span>`).join('')}
                                </div>
                                <span class="rating-text" id="rating-text-${slug}">
                                    ${rating.user > 0 ? `Bạn đã đánh giá ${rating.user}⭐` : 'Chưa đánh giá'}
                                </span>
                                <span class="rating-avg">
                                    <i class="fa-solid fa-star"></i> <span id="rating-avg-value-${slug}">${avg.toFixed(1)}</span> (<span id="rating-count-${slug}">${rating.count}</span>)
                                </span>
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="text-sm font-bold text-gray-400 mb-1">Tóm tắt:</h3>
                            <p class="text-sm leading-relaxed text-gray-300">${escapeHtml(movie.summary || 'Chưa có tóm tắt')}</p>
                        </div>
                        
                        ${directorsHTML}
                        ${actorsHTML}
                        
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t border-gray-800 pt-4">
                            <div><p class="text-gray-500">Trạng thái</p><p class="text-amber-500 font-bold mt-1">${movie.status}</p></div>
                            <div><p class="text-gray-500">Số tập</p><p class="font-bold text-white mt-1">${movie.episode_total || 0}</p></div>
                            <div><p class="text-gray-500">Lượt xem</p><p class="font-bold text-white mt-1">${movie.views}</p></div>
                            <div><p class="text-gray-500">Chất lượng</p><p class="font-bold text-white mt-1">${movie.quality}</p></div>
                        </div>
                        
                        ${episodesHTML}
                        
                        ${movie.trailer ? `
                            <div>
                                <h4 class="text-sm font-bold text-gray-400 mb-2">🎬 Trailer:</h4>
                                <a href="${movie.trailer}" target="_blank" class="text-amber-500 hover:underline text-sm">Xem trailer</a>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="glass-premium p-5 md:p-8 rounded-3xl space-y-6 mt-8">
                    <h3 class="text-lg font-bold flex items-center space-x-2 text-white">
                        <span class="w-1.5 h-5 bg-gradient-to-b from-amber-500 to-purple-500 rounded-full"></span>
                        <span>Bình Luận</span>
                    </h3>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <input id="comment-user" type="text" value="${escapeHtml(getCurrentUser()?.name || '')}" placeholder="Tên của bạn..." class="bg-gray-900 border border-gray-800 text-sm px-4 py-3 rounded-xl sm:w-1/4 focus:outline-none focus:border-amber-500 text-white">
                        <input id="comment-input" type="text" placeholder="Nhập nội dung bình luận..." class="bg-gray-900 border border-gray-800 text-sm px-4 py-3 rounded-xl flex-1 focus:outline-none focus:border-amber-500 text-white">
                        <button onclick="submitComment('${slug}')" class="bg-amber-500 text-black font-extrabold px-7 py-3 rounded-xl hover:bg-amber-600 transition btn-ripple">Đăng</button>
                    </div>
                    <div id="comments-container" class="space-y-4 pt-3"></div>
                </div>
            `;
            
            navigateTo('detail-page');
            setTimeout(() => updateRatingDisplay(slug), 100);
            renderComments(slug);
        }
