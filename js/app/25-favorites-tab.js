// ============================================================
        // FAVORITES TAB
        // ============================================================
        function renderFavoritesTab() {
            const container = document.getElementById('favorites-grid');
            if (!container) return;
            
            const favIds = getFavorites();
            if (favIds.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full empty-state" style="padding:40px;">
                        <div class="empty-icon"><i class="fa-regular fa-heart"></i></div>
                        <h3>Chưa có phim yêu thích</h3>
                        <p>Hãy thêm phim vào danh sách yêu thích của bạn!</p>
                    </div>
                `;
                return;
            }
            
            fetchMovies(1).then(movies => {
                const favMovies = movies.filter(m => favIds.includes(m.slug));
                if (favMovies.length === 0) {
                    container.innerHTML = `
                        <div class="col-span-full empty-state" style="padding:40px;">
                            <div class="empty-icon"><i class="fa-regular fa-heart"></i></div>
                            <h3>Không tìm thấy phim yêu thích</h3>
                            <p>Có thể phim đã bị xóa hoặc thay đổi.</p>
                        </div>
                    `;
                    return;
                }
                container.innerHTML = favMovies.map(m => {
                    const poster = m.poster_url || m.thumb_url || 'https://placehold.co/300x400';
                    return `
                        <div onclick="viewMovieDetail('${m.slug}')" class="glass-panel rounded-2xl overflow-hidden cursor-pointer card-hover-effect">
                            <div class="relative aspect-[2/3]">
                                <img src="${poster}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}" loading="lazy">
                            </div>
                            <div class="p-3">
                                <h4 class="font-bold text-sm truncate text-white">${escapeHtml(m.name)}</h4>
                            </div>
                        </div>
                    `;
                }).join('');
            });
        }
