// ============================================================
// CẤU HÌNH API — KKPhim + VSMOV (mặc định gộp tự động)
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

let sourceMode = localStorage.getItem('roflix-source-mode') || 'auto';
if (sourceMode !== 'vsmov' && sourceMode !== 'kkphim' && sourceMode !== 'auto') sourceMode = 'auto';
let currentSourceId = (localStorage.getItem('roflix-source-v2') === 'vsmov') ? 'vsmov' : 'kkphim';

function activeSourceIds() {
    if (sourceMode === 'vsmov') return ['vsmov'];
    if (sourceMode === 'kkphim') return ['kkphim'];
    return ['kkphim', 'vsmov'];
}

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
function srcDetailUrls(slug, sid) {
    const src = getSource(sid);
    const enc = encodeURIComponent(slug);
    if (sid === 'kkphim') {
        return [src.detailBase + '/phim/' + enc, src.listBase + '/phim/' + enc];
    }
    return [src.detailBase + '/phim/' + enc];
}
const API_BASE = srcListUrl('');

function updateSourceUi() {
    document.querySelectorAll('#source-switch .source-pill').forEach(el => {
        el.classList.toggle('active', el.dataset.source === sourceMode);
    });
    const note = document.getElementById('source-note');
    if (note) {
        note.textContent = sourceMode === 'auto'
            ? 'Đang gộp KKPhim + VSMOV, không cần chuyển tay'
            : (sourceMode === 'kkphim' ? 'Chỉ KKPhim' : 'Chỉ VSMOV');
    }
}

function switchSource(id) {
    if (id !== 'auto' && !SOURCES[id]) return;
    sourceMode = id;
    if (id === 'vsmov' || id === 'kkphim') currentSourceId = id;
    try { localStorage.setItem('roflix-source-mode', id); } catch (_) {}
    if (id === 'vsmov' || id === 'kkphim') {
        try { localStorage.setItem('roflix-source-v2', id); } catch (_) {}
    }
    updateSourceUi();
    if (typeof showToastPro === 'function') {
        const msg = id === 'auto'
            ? 'Đang lấy phim từ cả KKPhim và VSMOV'
            : ('Chỉ dùng ' + getSource(id).name);
        showToastPro('info', 'Nguồn phim', msg);
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
