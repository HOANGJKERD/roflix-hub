// ============================================================
// CẤU HÌNH API — KKPhim (chính) · VSMOV (dự phòng cuối)
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

let sourceMode = localStorage.getItem('roflix-source-mode') || 'kkphim';
if (sourceMode !== 'vsmov' && sourceMode !== 'kkphim') sourceMode = 'kkphim';
let currentSourceId = sourceMode === 'vsmov' ? 'vsmov' : 'kkphim';

function activeSourceIds() {
    if (sourceMode === 'vsmov') return ['vsmov'];
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
        el.classList.toggle('active', el.dataset.source === currentSourceId);
    });
    const note = document.getElementById('source-note');
    if (note) {
        note.textContent = currentSourceId === 'vsmov'
            ? 'Đang dùng VSMOV (dự phòng)'
            : 'Ưu tiên KKPhim · VSMOV chỉ khi KKPhim lỗi/trống';
    }
}

function switchSource(id) {
    if (!SOURCES[id]) return;
    sourceMode = id;
    currentSourceId = id;
    try { localStorage.setItem('roflix-source-mode', id); } catch (_) {}
    try { localStorage.setItem('roflix-source-v2', id); } catch (_) {}
    updateSourceUi();
    if (typeof showToastPro === 'function') {
        showToastPro('info', 'Nguồn phim', id === 'kkphim'
            ? 'KKPhim là nguồn chính. VSMOV chỉ dùng khi KKPhim lỗi.'
            : 'Đang xem riêng VSMOV.');
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
