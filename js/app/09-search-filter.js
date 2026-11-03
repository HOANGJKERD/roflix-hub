// ============================================================
        // SEARCH & FILTER
        // ============================================================

        function showSecondarySections() {
            document.querySelectorAll('#weekly-section, #random-panel-wrap, #reco-section').forEach(el => {
                if (el) el.style.display = '';
            });
        }

        function scrollToMovieList() {
            const el = document.getElementById('movie-list-section') || document.getElementById('movie-grid-container');
            if (!el) return;
            el.classList.remove('ro-filter-focus');
            requestAnimationFrame(() => {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
                    el.classList.add('ro-filter-focus');
                    setTimeout(() => el.classList.remove('ro-filter-focus'), 650);
                }, 60);
            });
        }

        async function handleSearch() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const val = (document.getElementById('search-input')?.value || '').trim();
                searchKeyword = val;
                currentGenreSlug = '';
                currentCountrySlug = '';
                homePriorityMode = !val;
                currentListEndpoint = 'phim-moi-cap-nhat';
                const titleEl = document.getElementById('list-title');
                if (titleEl) {
                    titleEl.textContent = val ? `Kết quả tìm kiếm: "${val}"` : 'Phim Âu Mỹ & Hàn nổi bật';
                }
                // Ẩn nhẹ khu phụ khi đang tìm để kết quả nổi lên trước
                document.querySelectorAll('#weekly-section, #random-panel-wrap, #reco-section').forEach(el => {
                    if (el) el.style.display = val ? 'none' : '';
                });
                navigateTo('main-site');
                await renderMoviesFromAPI(1);
            }, 400);
        }

        async function handleSearchMobile() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const val = (document.getElementById('search-input-mobile')?.value || '').trim();
                searchKeyword = val;
                currentGenreSlug = '';
                currentGenreSlug = '';
                currentCountrySlug = '';
                homePriorityMode = !val;
                currentListEndpoint = 'phim-moi-cap-nhat';
                const titleEl = document.getElementById('list-title');
                if (titleEl) {
                    titleEl.textContent = val ? `Kết quả tìm kiếm: "${val}"` : 'Phim Âu Mỹ & Hàn nổi bật';
                }
                document.querySelectorAll('#weekly-section, #random-panel-wrap, #reco-section').forEach(el => {
                    if (el) el.style.display = val ? 'none' : '';
                });
                navigateTo('main-site');
                closeMobileMenu();
                await renderMoviesFromAPI(1);
            }, 400);
        }

        function clearSearch() {
            searchKeyword = '';
            currentGenreSlug = '';
            currentCountrySlug = '';
            homePriorityMode = true;
            currentListEndpoint = 'phim-moi-cap-nhat';
            document.getElementById('search-input').value = '';
            document.getElementById('search-input-mobile').value = '';
            const titleEl = document.getElementById('list-title');
            if (titleEl) titleEl.textContent = 'Phim Âu Mỹ & Hàn nổi bật';
            renderMoviesFromAPI(1);
        }

        // Danh mục dùng đúng slug endpoint được NguonC hỗ trợ.
        const LIST_ENDPOINTS = {
            'phim-moi': 'phim-moi-cap-nhat',
            'phim-moi-cap-nhat': 'phim-moi-cap-nhat',
            'phim-le': 'phim-le',
            'phim-bo': 'phim-bo',
            'hoat-hinh': 'hoat-hinh',
            'tv-shows': 'tv-shows'
        };

        async function filterByList(endpointKey, title) {
            searchKeyword = '';
            currentGenreSlug = '';
            currentCountrySlug = '';
            homePriorityMode = false;
            currentListEndpoint = LIST_ENDPOINTS[endpointKey] || endpointKey || 'phim-moi-cap-nhat';
            const titleEl = document.getElementById('list-title');
            if (titleEl) titleEl.textContent = title || 'Danh sách phim';
            const si = document.getElementById('search-input');
            const sm = document.getElementById('search-input-mobile');
            if (si) si.value = '';
            if (sm) sm.value = '';
            navigateTo('main-site');
            await renderMoviesFromAPI(1);
            scrollToMovieList();
        }

        // Chuẩn hóa thể loại theo slug mà API VSMOV/KKPhim sử dụng.
        // Tránh gửi các slug tự đặt/không tồn tại khiến API trả danh sách rỗng.
        // Slug thể loại theo taxonomy NguonC, không dùng slug từ KKPhim/OPhim.
        const GENRE_ALIASES = {
            'dam-my':'dam-my', 'đam mỹ':'dam-my',
            'hanh-dong':'hanh-dong', 'hành động':'hanh-dong', 'action':'hanh-dong',
            'phieu-luu':'phieu-luu', 'phiêu lưu':'phieu-luu', 'adventure':'phieu-luu',
            'hoat-hinh':'hoat-hinh', 'hoạt hình':'hoat-hinh', 'animation':'hoat-hinh',
            'phim-hai':'phim-hai', 'hai':'phim-hai', 'hài':'phim-hai', 'hai-huoc':'phim-hai', 'hài hước':'phim-hai', 'comedy':'phim-hai',
            'hinh-su':'hinh-su', 'hình sự':'hinh-su', 'crime':'hinh-su',
            'tai-lieu':'tai-lieu', 'tài liệu':'tai-lieu', 'documentary':'tai-lieu',
            'chinh-kich':'chinh-kich', 'chính kịch':'chinh-kich', 'drama':'chinh-kich',
            'gia-dinh':'gia-dinh', 'gia đình':'gia-dinh', 'family':'gia-dinh',
            'gia-tuong':'gia-tuong', 'giả tưởng':'gia-tuong', 'fantasy':'gia-tuong',
            'lich-su':'lich-su', 'lịch sử':'lich-su', 'history':'lich-su',
            'kinh-di':'kinh-di', 'kinh dị':'kinh-di', 'horror':'kinh-di',
            'phim-nhac':'phim-nhac', 'âm nhạc':'phim-nhac', 'am-nhac':'phim-nhac', 'music':'phim-nhac',
            'bi-an':'bi-an', 'bí ẩn':'bi-an', 'mystery':'bi-an',
            'lang-man':'lang-man', 'lãng mạn':'lang-man', 'romance':'lang-man',
            'khoa-hoc-vien-tuong':'khoa-hoc-vien-tuong', 'khoa học viễn tưởng':'khoa-hoc-vien-tuong', 'sci-fi':'khoa-hoc-vien-tuong',
            'gay-can':'gay-can', 'gây cấn':'gay-can', 'thriller':'gay-can',
            'chien-tranh':'chien-tranh', 'chiến tranh':'chien-tranh', 'war':'chien-tranh',
            'tam-ly':'tam-ly', 'tâm lý':'tam-ly', 'psychological':'tam-ly',
            'tinh-cam':'tinh-cam', 'tình cảm':'tinh-cam', 'romantic':'tinh-cam',
            'co-trang':'co-trang', 'cổ trang':'co-trang', 'period':'co-trang',
            'mien-tay':'mien-tay', 'miền tây':'mien-tay', 'western':'mien-tay',
            'phim-18':'phim-18', 'phim 18+':'phim-18', '18+':'phim-18'
        };
        function resolveGenreSlug(value, title) {
            const raw = String(value || '').trim().toLowerCase();
            const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
            return GENRE_ALIASES[raw] || GENRE_ALIASES[normalized] || normalized;
        }

        async function filterByGenre(slug, title) {
            searchKeyword = '';
            currentGenreSlug = resolveGenreSlug(slug, title);
            currentCountrySlug = '';
            homePriorityMode = false;
            currentListEndpoint = 'phim-moi-cap-nhat';
            const titleEl = document.getElementById('list-title');
            if (titleEl) titleEl.textContent = 'Thể loại: ' + (title || slug);
            const si = document.getElementById('search-input');
            const sm = document.getElementById('search-input-mobile');
            if (si) si.value = '';
            if (sm) sm.value = '';
            navigateTo('main-site');
            await renderMoviesFromAPI(1);
            scrollToMovieList();
        }

        function filterBy(key, value) {
            if (key === 'type') {
                if (value === 'Phim Lẻ') return filterByList('phim-le', 'Phim Lẻ');
                if (value === 'Phim Bộ') return filterByList('phim-bo', 'Phim Bộ');
            }
            if (key === 'list') return filterByList(value, arguments[2] || value);
            if (key === 'genre') {
                const normalized = String(value || '').trim().toLowerCase();
                if (['chiếu rạp','chieu rap'].includes(normalized)) {
                    return filterByList('phim-le', 'Chiếu Rạp · Phim lẻ');
                }
                // Phim 18+ là một thể loại NguonC riêng, không phải danh mục Phim lẻ.
                return filterByGenre(value, value);
            }
            if (key === 'rating') {
                searchKeyword = '';
                currentGenreSlug = '';
                currentCountrySlug = '';
                homePriorityMode = false;
                currentListEndpoint = 'phim-moi-cap-nhat';
                const titleEl = document.getElementById('list-title');
                if (titleEl) titleEl.textContent = 'BXH / Đánh giá cao';
                renderMoviesFromAPI(1).then(scrollToMovieList);
                navigateTo('main-site');
                return;
            }
            searchKeyword = String(value || '');
            currentGenreSlug = '';
            currentCountrySlug = '';
            homePriorityMode = false;
            currentListEndpoint = 'phim-moi-cap-nhat';
            const titleEl = document.getElementById('list-title');
            if (titleEl) titleEl.textContent = String(value || 'Kết quả');
            renderMoviesFromAPI(1).then(scrollToMovieList);
            navigateTo('main-site');
        }