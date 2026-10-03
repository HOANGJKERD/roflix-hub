// ============================================================
        // FAVORITES
        // ============================================================
        function getFavorites() {
            return JSON.parse(localStorage.getItem('roflix-favs') || '[]');
        }

        function isFavorite(slug) {
            return getFavorites().includes(slug);
        }

        function toggleFavorite(slug) {
            let favs = getFavorites();
            if (favs.includes(slug)) {
                favs = favs.filter(id => id !== slug);
                showToast('info', 'Đã xóa', 'Đã xóa khỏi danh sách yêu thích');
            } else {
                favs.push(slug);
                showToast('success', 'Đã thêm', 'Đã thêm vào danh sách yêu thích! +2 RoGem');
                addGem(2, true);
                addExp(2);
                updateDailyQuestProgress('favorite');
            }
            localStorage.setItem('roflix-favs', JSON.stringify(favs));
            const stats = getStats();
            stats.totalFavorites = favs.length;
            saveStats(stats);
            renderMoviesFromAPI(currentPage);
        }

        function showFavorites() {
            const favIds = getFavorites();
            document.getElementById('list-title').textContent = 'Danh Sách Yêu Thích';
            if (favIds.length === 0) {
                document.getElementById('movie-grid-container').innerHTML = `
                    <div class="col-span-full">
                        <div class="empty-state">
                            <div class="empty-icon"><i class="fa-regular fa-heart"></i></div>
                            <h3>Chưa có phim yêu thích</h3>
                            <p>Hãy thêm phim vào danh sách yêu thích của bạn!</p>
                        </div>
                    </div>
                `;
                document.getElementById('movie-count').textContent = '0';
                return;
            }
            
            fetchMovies(1).then(movies => {
                const filtered = movies.filter(m => favIds.includes(m.slug));
                const mapped = filtered.map(m => mapMovieData(m));
                renderMovies(mapped);
                document.getElementById('movie-count').textContent = mapped.length;
                document.getElementById('pagination-container').innerHTML = '';
            });
            navigateTo('main-site');
        }

        function showAllMovies() {
            searchKeyword = '';
            currentGenreSlug = '';
            currentCountrySlug = '';
            homePriorityMode = true;
            currentListEndpoint = 'phim-moi-cap-nhat';
            showSecondarySections();
            document.getElementById('list-title').textContent = 'Phim Âu Mỹ & Hàn nổi bật';
            document.getElementById('search-input').value = '';
            document.getElementById('search-input-mobile').value = '';
            renderMoviesFromAPI(1);
            navigateTo('main-site');
        }
