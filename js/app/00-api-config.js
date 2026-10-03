// ============================================================
        // CẤU HÌNH API — KKPhim (chính) + VSMOV (phụ)
        // Tài liệu KKPhim: https://kkphim.com/api-document  (base: https://phimapi.com)
        // Bản quyền dữ liệu: VSMOV và KKPhim
        // ============================================================
        const SOURCES = {
            kkphim: {
                id: 'kkphim',
                name: 'KKPhim',
                listBase: 'https://phimapi.com/v1/api',
                detailBase: 'https://phimapi.com',
                cdn: 'https://phimimg.com'
            },
            vsmov: {
                id: 'vsmov',
                name: 'VSMOV',
                listBase: 'https://vsmov.com/api',
                detailBase: 'https://vsmov.com/api',
                cdn: ''
            }
        };
        let currentSourceId = (localStorage.getItem('roflix-source-v2') === 'vsmov') ? 'vsmov' : 'kkphim';

        function getSource(id) {
            return SOURCES[id] || SOURCES[currentSourceId] || SOURCES.kkphim;
        }
        function srcListUrl(path, sid) {
            if (!path.startsWith('/')) path = '/' + path;
            return getSource(sid || currentSourceId).listBase + path;
        }
        function srcDetailUrl(slug, sid) {
            return getSource(sid || currentSourceId).detailBase + '/phim/' + encodeURIComponent(slug);
        }
        const API_BASE = srcListUrl(''); // backward-compat getter-like string (updated in switchSource)

        function updateSourceUi() {
            document.querySelectorAll('#source-switch .source-pill').forEach(el => {
                el.classList.toggle('active', el.dataset.source === currentSourceId);
            });
            const note = document.getElementById('source-note');
            if (note) {
                note.textContent = currentSourceId === 'kkphim'
                    ? 'Dữ liệu từ KKPhim (nguồn chính)'
                    : 'Dữ liệu từ VSMOV (nguồn phụ)';
            }
        }

        function switchSource(id) {
            if (!SOURCES[id]) return;
            currentSourceId = id;
            try { localStorage.setItem('roflix-source-v2', id); } catch (_) {}
            updateSourceUi();
            if (typeof showToastPro === 'function') {
                showToastPro('info', 'Nguồn phim', id === 'kkphim' ? 'Đã chuyển sang KKPhim (chính)' : 'Đã chuyển sang VSMOV (phụ)');
            }
            if (typeof renderMoviesFromAPI === 'function') renderMoviesFromAPI(1);
            if (typeof initHeroSlider === 'function') initHeroSlider();
            if (typeof refreshRecommendations === 'function') refreshRecommendations(true);
            if (typeof loadWeeklyPicks === 'function') loadWeeklyPicks();
        }

        const ITEMS_PER_PAGE = 24;
        let currentPage = 1;
        let totalPages = 1;
        let searchKeyword = '';
        let currentSlug = '';
        let currentListEndpoint = 'phim-moi-cap-nhat';
        let currentGenreSlug = '';
        let currentCountrySlug = '';
        let homePriorityMode = true;
        let totalItems = 0;
        let searchTimeout = null;
        let currentEpisodeList = [];
        let currentMovieTitle = '';
let currentMovieData = null;
