// ============================================================
// CẤU HÌNH API — NguonC (thay KKPhim tạm thời) · VSMOV (dự phòng)
// ============================================================
const SOURCES = {
    kkphim: {
        id: 'kkphim',
        name: 'NguonC',
        listBase: 'https://phim.nguonc.com/api',
        detailBase: 'https://phim.nguonc.com/api',
        cdn: ''
    },
    vsmov: {
        id: 'vsmov',
        name: 'VSMOV',
        listBase: 'https://vsmov.com/api',
        detailBase: 'https://vsmov.com/api',
        cdn: ''
    }
};

let sourceMode = 'kkphim';
try { sourceMode = localStorage.getItem('roflix-source-mode') || 'kkphim'; } catch (_) {}
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
    const sourceId = sid || currentSourceId;
    if (sourceId === 'kkphim') {
        const base = getSource(sourceId).listBase;
        if (path.startsWith('/tim-kiem')) return base + path.replace('/tim-kiem', '/films/search');
        if (path.startsWith('/danh-sach/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/danh-sach/phim-moi-cap-nhat'.length);
        if (path.startsWith('/danh-sach/')) return base + path.replace('/danh-sach/', '/films/danh-sach/');
        if (path.startsWith('/the-loai/')) return base + path.replace('/the-loai/', '/films/the-loai/');
        if (path.startsWith('/quoc-gia/')) return base + path.replace('/quoc-gia/', '/films/quoc-gia/');
        if (path.startsWith('/phim-moi-cap-nhat')) return base + '/films/phim-moi-cap-nhat' + path.slice('/phim-moi-cap-nhat'.length);
    }
    return getSource(sourceId).listBase + path;
}
function srcDetailUrl(slug, sid) {
    const sourceId = sid || currentSourceId;
    return getSource(sourceId).detailBase + (sourceId === 'kkphim' ? '/film/' : '/phim/') + encodeURIComponent(slug);
}
function srcDetailUrls(slug, sid) {
    const src = getSource(sid);
    const enc = encodeURIComponent(slug);
    if (sid === 'kkphim') {
        // KKPhim khuyến nghị endpoint chi tiết v1; API cũ chỉ là fallback tương thích.\n        return [src.detailBase + '/film/' + enc];
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
            : 'Ưu tiên NguonC · VSMOV tự dự phòng khi NguonC lỗi/trống';
    }
    try {
        if (window.RoflixVidSrc && typeof window.RoflixVidSrc.injectSourcePill === 'function') {
            window.RoflixVidSrc.injectSourcePill();
        }
    } catch (_) {}
}

function switchSource(id) {
    if (id === 'vidsrc') {
        if (window.RoflixVidSrc && typeof window.RoflixVidSrc.openTester === 'function') {
            window.RoflixVidSrc.openTester();
        } else if (typeof showToast === 'function') {
            showToast('info', 'VidSrc', 'Đang tải trang phát...');
        }
        return;
    }
    if (!SOURCES[id]) return;
    sourceMode = id;
    currentSourceId = id;
    try { localStorage.setItem('roflix-source-mode', id); } catch (_) {}
    try { localStorage.setItem('roflix-source-v2', id); } catch (_) {}
    updateSourceUi();
    if (typeof showToastPro === 'function') {
        showToastPro('info', 'Nguồn phim', id === 'kkphim'
            ? 'NguonC là nguồn chính tạm thời thay KKPhim. VSMOV tự dự phòng khi cần.'
            : 'Đang xem riêng VSMOV.');
    }
    if (typeof renderMoviesFromAPI === 'function') renderMoviesFromAPI(1);
    if (typeof initHeroSlider === 'function') initHeroSlider();
    if (typeof refreshRecommendations === 'function') refreshRecommendations(true);
    if (typeof loadWeeklyPicks === 'function') loadWeeklyPicks();
}

function loadOptionalSource(src, flag) {
    if (window[flag]) return;
    if (document.querySelector('script[src*="' + src.split('/').pop() + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = function () {
        try { updateSourceUi(); } catch (_) {}
    };
    (document.head || document.documentElement).appendChild(s);
}

loadOptionalSource('js/app/00b-vidsrc.js', 'RoflixVidSrc');

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
