// ============================================================
// CẤU HÌNH API — NGUONC DUY NHẤT
// ============================================================
const SOURCES = {
    nguonc: {
        id: 'nguonc',
        name: 'NguonC',
        listBase: 'https://phim.nguonc.com/api',
        detailBase: 'https://phim.nguonc.com/api',
        cdn: ''
    }
};

let sourceMode = 'nguonc';
let currentSourceId = 'nguonc';
try {
    localStorage.setItem('roflix-source-mode', 'nguonc');
    localStorage.setItem('roflix-source-v2', 'nguonc');
} catch (_) {}

function activeSourceIds() { return ['nguonc']; }
function getSource(id) { return SOURCES.nguonc; }

function srcListUrl(path) {
    if (!path.startsWith('/')) path = '/' + path;
    const base = SOURCES.nguonc.listBase;
    if (path.startsWith('/tim-kiem')) return base + path.replace('/tim-kiem', '/films/search');
    if (path.startsWith('/danh-sach/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/danh-sach/phim-moi-cap-nhat'.length);
    if (path.startsWith('/danh-sach/')) return base + path.replace('/danh-sach/', '/films/danh-sach/');
    if (path.startsWith('/the-loai/')) return base + path.replace('/the-loai/', '/films/the-loai/');
    if (path.startsWith('/quoc-gia/')) return base + path.replace('/quoc-gia/', '/films/quoc-gia/');
    if (path.startsWith('/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/phim-moi-cap-nhat'.length);
    return base + path;
}
function srcDetailUrl(slug) {
    return SOURCES.nguonc.detailBase + '/film/' + encodeURIComponent(slug);
}
function srcDetailUrls(slug) { return [srcDetailUrl(slug)]; }

const API_BASE = srcListUrl('');
function updateSourceUi() {
    const box = document.getElementById('source-switch');
    if (box) box.innerHTML = '<span class="src-label">Nguồn phim</span><span class="source-pill active" data-source="nguonc">NguonC · nguồn duy nhất</span>';
    const note = document.getElementById('source-note');
    if (note) note.textContent = 'Đang sử dụng API NguonC';
}
function switchSource(id) {
    if (id === 'vidsrc') {
        if (window.RoflixVidSrc && typeof window.RoflixVidSrc.openTester === 'function') window.RoflixVidSrc.openTester();
        return;
    }
    if (id !== 'nguonc') return;
    currentSourceId = sourceMode = 'nguonc';
    updateSourceUi();
    if (typeof renderMoviesFromAPI === 'function') renderMoviesFromAPI(1);
}
function loadOptionalSource(src, flag) {
    if (window[flag] || document.querySelector('script[src*="' + src.split('/').pop() + '"]')) return;
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = updateSourceUi;
    (document.head || document.documentElement).appendChild(s);
}
loadOptionalSource('js/app/00b-vidsrc.js', 'RoflixVidSrc');
const ITEMS_PER_PAGE = 24;
let currentPage = 1, totalPages = 1, searchKeyword = '', currentSlug = '';
let currentListEndpoint = 'phim-moi-cap-nhat', currentGenreSlug = '', currentCountrySlug = '';
let homePriorityMode = false, totalItems = 0, searchTimeout = null;
let currentEpisodeList = [], currentMovieTitle = '', currentMovieData = null;
