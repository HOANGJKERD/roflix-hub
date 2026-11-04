// ============================================================
// CẤU HÌNH API: NGUONC + KKPHIM + VSMOV, GỘP TỰ ĐỘNG
// ============================================================
const SOURCES = {
    nguonc: {
        id: 'nguonc', name: 'NguonC',
        listBase: 'https://phim.nguonc.com/api',
        detailBase: 'https://phim.nguonc.com/api', cdn: ''
    },
    kkphim: {
        id: 'kkphim', name: 'KKPhim',
        listBase: 'https://phimapi.com',
        detailBase: 'https://phimapi.com', cdn: ''
    },
    vsmov: {
        id: 'vsmov', name: 'VSMOV',
        listBase: 'https://vsmov.com/api',
        detailBase: 'https://vsmov.com/api', cdn: ''
    }
};

let sourceMode = 'auto';
let currentSourceId = 'nguonc';
try {
    localStorage.setItem('roflix-source-mode', 'auto');
    localStorage.setItem('roflix-source-v2', 'nguonc');
} catch (_) {}

function activeSourceIds() { return ['nguonc', 'kkphim', 'vsmov']; }
function getSource(id) { return SOURCES[id] || SOURCES.nguonc; }

function srcListUrl(path, sid) {
    if (!path.startsWith('/')) path = '/' + path;
    const source = getSource(sid || currentSourceId);
    if (source.id === 'nguonc') {
        const base = source.listBase;
        if (path.startsWith('/tim-kiem')) return base + path.replace('/tim-kiem', '/films/search');
        if (path.startsWith('/danh-sach/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/danh-sach/phim-moi-cap-nhat'.length);
        if (path.startsWith('/danh-sach/')) return base + path.replace('/danh-sach/', '/films/danh-sach/');
        if (path.startsWith('/the-loai/')) return base + path.replace('/the-loai/', '/films/the-loai/');
        if (path.startsWith('/quoc-gia/')) return base + path.replace('/quoc-gia/', '/films/quoc-gia/');
        if (path.startsWith('/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/phim-moi-cap-nhat'.length);
    }
    if (source.id === 'kkphim' && path.startsWith('/tim-kiem')) {
        return source.listBase + '/v1/api/tim-kiem' + path.slice('/tim-kiem'.length);
    }
    return source.listBase + path;
}
function srcDetailUrl(slug, sid) {
    const source = getSource(sid || currentSourceId);
    return source.detailBase + (source.id === 'nguonc' ? '/film/' : '/phim/') + encodeURIComponent(slug);
}
function srcDetailUrls(slug, sid) { return [srcDetailUrl(slug, sid)]; }

const API_BASE = srcListUrl('');
function updateSourceUi() {
    const box = document.getElementById('source-switch');
    if (box) box.innerHTML = '<span class="src-label">Nguồn phim</span><span class="source-pill active" data-source="auto">NguonC + KKPhim + VSMOV</span>';
    const note = document.getElementById('source-note');
    if (note) note.textContent = 'Đang gộp NguonC + KKPhim + VSMOV';
}
function switchSource(id) {
    if (id === 'vidsrc') {
        if (window.RoflixVidSrc && typeof window.RoflixVidSrc.openTester === 'function') window.RoflixVidSrc.openTester();
        return;
    }
    if (id !== 'auto' && id !== 'nguonc' && id !== 'vsmov') return;
    sourceMode = 'auto';
    currentSourceId = 'nguonc';
    try { localStorage.setItem('roflix-source-mode', 'auto'); localStorage.setItem('roflix-source-v2', 'nguonc'); } catch (_) {}
    updateSourceUi();
    if (typeof renderMoviesFromAPI === 'function') renderMoviesFromAPI(1);
    if (typeof initHeroSlider === 'function') initHeroSlider();
    if (typeof refreshRecommendations === 'function') refreshRecommendations(true);
    if (typeof loadWeeklyPicks === 'function') loadWeeklyPicks();
}
function loadOptionalSource(src, flag) {
    if (window[flag] || document.querySelector('script[src*="' + src.split('/').pop() + '"]')) return;
    const script = document.createElement('script'); script.src = src; script.async = true;
    script.onload = updateSourceUi;
    (document.head || document.documentElement).appendChild(script);
}
loadOptionalSource('js/app/00b-vidsrc.js', 'RoflixVidSrc');
const ITEMS_PER_PAGE = 24;
let currentPage = 1, totalPages = 1, searchKeyword = '', currentSlug = '';
let currentListEndpoint = 'phim-moi-cap-nhat', currentGenreSlug = '', currentCountrySlug = '';
let homePriorityMode = false, totalItems = 0, searchTimeout = null;
let currentEpisodeList = [], currentMovieTitle = '', currentMovieData = null;
