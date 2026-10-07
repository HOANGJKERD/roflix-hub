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
                if (val) await window.roflixAnime?.searchAndAppend?.(val);
                if (val) scrollToMovieList();
            }, 350);
        }

                async function handleSearchMobile() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const val = (document.getElementById('search-input-mobile')?.value || '').trim();
                searchKeyword = val;
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
                if (val) await window.roflixAnime?.searchAndAppend?.(val);
                if (val) scrollToMovieList();
            }, 350);
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

        const LIST_ENDPOINTS = {
            'phim-moi': 'phim-moi-cap-nhat',
            'phim-le': 'phim-le',
            'phim-bo': 'phim-bo',
            'dang-chieu': 'dang-chieu',
            '4k': '4k',
            'long-tieng': 'long-tieng',
            'thuyet-minh': 'thuyet-minh',
            'subteam': 'subteam'
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
        const GENRE_ALIASES = {
            'chinh-kich':'chinh-kich', 'drama':'chinh-kich', 'tam-ly':'tam-ly', 'psychological':'tam-ly',
            'hai':'hai-huoc', 'hai-huoc':'hai-huoc', 'hai-hước':'hai-huoc', 'comedy':'hai-huoc',
            'bi-an':'bi-an', 'mystery':'bi-an', 'gia-dinh':'gia-dinh', 'family':'gia-dinh',
            'hanh-dong':'hanh-dong', 'action':'hanh-dong', 'vien-tuong':'vien-tuong', 'sci-fi':'vien-tuong',
            'khoa-hoc-vien-tuong':'khoa-hoc-vien-tuong', 'khoa-hoc':'khoa-hoc-vien-tuong',
            'hinh-su':'hinh-su', 'crime':'hinh-su', 'kinh-di':'kinh-di', 'horror':'kinh-di',
            'phieu-luu':'phieu-luu', 'adventure':'phieu-luu', 'co-trang':'co-trang', 'period':'co-trang',
            'vo-thuat':'vo-thuat', 'martial-arts':'vo-thuat', 'lang-man':'tinh-cam', 'tinh-cam':'tinh-cam', 'romance':'tinh-cam',
            'gia-tuong':'than-thoai', 'than-thoai':'than-thoai', 'fantasy':'than-thoai',
            'chien-tranh':'chien-tranh', 'war':'chien-tranh', 'hoc-duong':'hoc-duong', 'school':'hoc-duong',
            'hoat-hinh':'hoat-hinh', 'animation':'hoat-hinh', 'tai-lieu':'tai-lieu', 'documentary':'tai-lieu',
            'am-nhac':'am-nhac', 'music':'am-nhac', 'the-thao':'the-thao', 'sports':'the-thao',
            'kinh-dien':'kinh-dien', 'classic':'kinh-dien', 'lich-su':'lich-su', 'history':'lich-su',
            'mien-tay':'mien-tay', 'western':'mien-tay'
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
                if (['chiếu rạp','chieu rap','phim 18+','18+'].includes(normalized)) {
                    return filterByList('phim-le', value === 'Chiếu Rạp' ? 'Chiếu Rạp · Phim lẻ' : value);
                }
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
