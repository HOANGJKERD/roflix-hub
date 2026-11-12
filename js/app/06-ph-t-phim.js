// ============================================================
// PHÁT PHIM
// Nguồn phát catalog duy nhất: NguonC. VidSrc chỉ là trình phát ngoài do người dùng chủ động chọn.
// ============================================================

// Danh sách phim không có nguồn phát được ẩn trên trình duyệt hiện tại.
function getRoFlixUnavailableSlugs() {
    // Clear legacy false-positive hides created by the old aggressive link checker.
    try { localStorage.removeItem('roflix-unavailable-movies'); } catch (_) {}
    return new Set();
}

function markRoFlixMovieUnavailable(slug) {
    const key = String(slug || '').trim();
    if (!key) return;
    try {
        const values = getRoFlixUnavailableSlugs();
        values.add(key);
        localStorage.setItem('roflix-unavailable-movies', JSON.stringify(Array.from(values)));
    } catch (_) {}
    document.querySelectorAll('[data-rf-card][data-rf-slug]').forEach(card => {
        if (card.dataset.rfSlug === key) card.remove();
    });
}

// Load helper VidSrc nếu chưa có (không cần sửa index.html)
(function ensureVidSrcHelper() {
    if (window.RoflixVidSrc) return;
    if (document.querySelector('script[src*="00b-vidsrc"]')) return;
    var s = document.createElement('script');
    s.src = 'js/app/00b-vidsrc.js';
    s.async = true;
    (document.head || document.documentElement).appendChild(s);
})();

async function playMovie(slug, preferredSrc, titleHint) {
    if (window.rfWatchPartyBlocksControl && window.rfWatchPartyBlocksControl()) {
        showToast('warning', 'Phòng xem chung', 'Chỉ host được đổi phim. Bạn đang xem theo host.');
        return;
    }
    try {
        // Nếu người xem vừa mở trang chi tiết phim này, tái sử dụng dữ liệu/tập đã tải.
        // Tái sử dụng dữ liệu chi tiết nếu người xem vừa mở đúng phim này.
        const alreadyLoaded = currentSlug === slug
            && currentMovieData
            && Array.isArray(currentEpisodeList)
            && currentEpisodeList.length > 0;
        if (!alreadyLoaded) {
            currentEpisodeList = [];
            currentMovieData = null;
            await viewMovieDetail(slug, preferredSrc, titleHint);
        }
        let tries = 0;
        while (currentEpisodeList.length === 0 && tries < 15) {
            await new Promise(r => setTimeout(r, 120));
            tries++;
        }
        if (currentEpisodeList.length > 0) {
            playMovieByIndex(0);
        } else {
            // Do not classify a temporary/unsupported provider response as a deleted source.
            // Keep the detail page visible so the user can retry without losing the catalog item.
            showToast('warning', 'Chưa lấy được nguồn phát', 'Thông tin phim đã tải nhưng chưa đọc được danh sách tập. Hãy thử mở lại chi tiết sau ít phút.');
        }
    } catch (e) {
        console.error(e);
        if (typeof showToastPro === 'function') showToastPro('error', 'Lỗi', 'Không mở được phim');
    }
}

function renderPlayEpisodeGrid(activeIndex) {
    const grid = document.getElementById('episode-list-grid');
    if (!grid) return;
    if (!currentEpisodeList.length) {
        grid.innerHTML = '<p class="col-span-full text-xs text-gray-500 text-center py-4">Không có danh sách tập</p>';
        return;
    }
    grid.innerHTML = currentEpisodeList.map((ep, idx) => {
        const active = idx === activeIndex;
        const cls = active
            ? 'bg-amber-500 text-black font-bold'
            : 'bg-gray-800 hover:bg-amber-500/20 text-white border border-gray-700';
        return `<button onclick="playMovieByIndex(${idx})" class="py-2 px-1 text-xs rounded-lg text-center transition ${cls}">Tập ${escapeHtml(ep.name)}</button>`;
    }).join('');

    // Thanh chọn server (Mặc định / VidSrc) — inject cạnh danh sách tập
    renderPlayerServerBar();
}

function renderPlayerServerBar() {
    let bar = document.getElementById('rf-player-server-bar');
    const grid = document.getElementById('episode-list-grid');
    if (!grid || !grid.parentElement) return;

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'rf-player-server-bar';
        bar.className = 'flex flex-wrap gap-2 mb-3';
        grid.parentElement.insertBefore(bar, grid);
    }

    bar.innerHTML =
        `<span class="text-[10px] text-gray-500 self-center mr-1">Server:</span>` +
        `<button type="button" onclick="playMovieByIndex(window.__RF_LAST_EP_INDEX__||0)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black">Mặc định</button>` +
        `<button type="button" onclick="window.rfVidsrcCompatibilityMode && window.rfVidsrcCompatibilityMode()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-200 border border-gray-700">VidSrc: chế độ tương thích</button>`;
}

/** Phát bằng embed VidSrc (giống tester https://vidsrc.sh/#tester) */
function playOnVidSrc(season, episode) {
    if (window.rfWatchPartyBlocksControl && window.rfWatchPartyBlocksControl()) {
        showToast('warning', 'Phòng xem chung', 'Chỉ host được đổi nguồn phát.');
        return;
    }
    const warning = 'Cảnh báo: VidSrc là trình phát bên thứ ba và có thể mở tab quảng cáo, chuyển hướng hoặc trang cài ứng dụng. RoFlix không kiểm soát được popup bên trong trình phát này. Chỉ tiếp tục nếu bạn chấp nhận rủi ro; không tải ứng dụng lạ và không nhập thông tin cá nhân.';
    if (!window.__RF_VIDSRC_WARNING_ACCEPTED__) {
        const accepted = window.confirm(warning + '\n\nBạn có muốn tiếp tục mở VidSrc không?');
        if (!accepted) return;
        window.__RF_VIDSRC_WARNING_ACCEPTED__ = true;
    }
    if (typeof showToastPro === 'function') {
        showToastPro('warning', 'Cảnh báo quảng cáo', 'VidSrc có thể bật popup/chuyển hướng. Đóng tab lạ, không tải ứng dụng hoặc nhập thông tin cá nhân.');
    } else if (typeof showToast === 'function') {
        showToast('warning', 'Cảnh báo quảng cáo', 'VidSrc có thể bật popup/chuyển hướng. Đóng tab lạ, không tải ứng dụng hoặc nhập thông tin cá nhân.');
    }
    if (!window.RoflixVidSrc) {
        if (typeof showToast === 'function') showToast('error', 'VidSrc', 'Helper chưa tải xong, thử lại sau 1 giây.');
        return;
    }
    const movie = currentMovieData;
    if (!movie || !window.RoflixVidSrc.hasIds(movie)) {
        if (typeof showToast === 'function') showToast('error', 'VidSrc', 'Phim này không có IMDb/TMDB ID.');
        return;
    }

    const title = currentMovieTitle || movie.title || 'Đang phát';
    const titleEl = document.getElementById('playing-title');
    if (titleEl) titleEl.textContent = title + ' (VidSrc)';

    navigateTo('play-page');
    renderPlayerServerBar();

    const ok = window.RoflixVidSrc.loadIntoPlayer(movie, season, episode);
    window.rfVidsrcCompatibilityMode = function () {
        const frame = document.getElementById('movie-player');
        if (!frame || !frame.dataset.rfVidsrcSandboxed) {
            if (typeof showToast === 'function') showToast('warning', 'VidSrc', 'Hãy mở VidSrc trước khi bật chế độ tương thích.');
            return;
        }
        const src = frame.src;
        frame.removeAttribute('sandbox');
        frame.dataset.rfVidsrcSandboxed = '0';
        frame.src = src;
        if (typeof showToastPro === 'function') showToastPro('warning', 'Chế độ tương thích', 'Đã bỏ giới hạn popup. Chỉ dùng nếu player bị lỗi ở chế độ an toàn.');
        else if (typeof showToast === 'function') showToast('warning', 'Chế độ tương thích', 'Đã bỏ giới hạn popup. Chỉ dùng nếu player bị lỗi ở chế độ an toàn.');
    };
    if (!ok) {
        if (typeof showToast === 'function') showToast('error', 'VidSrc', 'Không tạo được link embed.');
        return;
    }

    try {
        if (window.rfAnalytics) {
            window.rfAnalytics.track('movie_view', {
                movieSlug: slugSnapshot,
                movieTitle: title,
                metadata: { player: 'vidsrc' }
            });
        }
    } catch (_) {}
}

let rfCatalogHlsInstance = null;
let rfCatalogVideoElement = null;

function cleanupCatalogVideo() {
    if (rfCatalogHlsInstance) {
        try { rfCatalogHlsInstance.destroy(); } catch (_) {}
        rfCatalogHlsInstance = null;
    }
    if (rfCatalogVideoElement) {
        try { rfCatalogVideoElement.pause(); rfCatalogVideoElement.removeAttribute('src'); rfCatalogVideoElement.load(); } catch (_) {}
        rfCatalogVideoElement.remove();
        rfCatalogVideoElement = null;
    }
    const frame = document.getElementById('movie-player');
    if (frame) frame.style.display = '';
}

async function playCatalogHls(url, title) {
    const frame = document.getElementById('movie-player');
    if (!frame || !frame.parentElement) throw new Error('Không tìm thấy vùng phát phim.');
    cleanupCatalogVideo();
    const video = document.createElement('video');
    video.id = 'rf-catalog-video';
    video.controls = false;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', title || 'RoFlix Player');
    video.style.cssText = 'display:block;width:100%;height:100%;min-height:240px;max-height:75vh;background:#000;object-fit:contain;';
    frame.style.display = 'none';
    frame.parentElement.appendChild(video);
    rfCatalogVideoElement = video;
    video.controls = true;

    const isHlsSource = /\.m3u8(?:[?#]|$)/i.test(url);
    if (!isHlsSource) {
        // MP4/WebM phải đi thẳng vào HTMLMediaElement, không nạp qua hls.js.
        video.src = url;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
    } else {
        if (!window.Hls) {
            let script = document.getElementById('rf-catalog-hls-js');
            if (!script) {
                script = document.createElement('script');
                script.id = 'rf-catalog-hls-js';
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
                document.head.appendChild(script);
            }
            await new Promise((resolve, reject) => {
                if (window.Hls) return resolve();
                script.addEventListener('load', resolve, { once: true });
                script.addEventListener('error', () => reject(new Error('Không tải được thư viện HLS.')), { once: true });
            });
        }
        if (!window.Hls || !window.Hls.isSupported()) throw new Error('Trình duyệt không hỗ trợ phát HLS.');
        rfCatalogHlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: false });
        rfCatalogHlsInstance.on(window.Hls.Events.ERROR, (_event, data) => {
            if (data && data.fatal) {
                console.error('[RoFlix HLS]', data.type, data.details);
                showToast('error', 'Nguồn phim gặp lỗi', 'Không tải được luồng video. Hãy thử tập khác.');
            }
        });
        rfCatalogHlsInstance.loadSource(url);
        rfCatalogHlsInstance.attachMedia(video);
    }

    video.addEventListener('error', () => {
        const code = video.error && video.error.code;
        console.error('[RoFlix video] media error', code);
        showToast('error', 'Không phát được video', 'Nguồn HLS có thể đã hết hạn hoặc máy chủ từ chối kết nối.');
    }, { once: true });
    try { await video.play(); } catch (_) {}
}

function clearPlayerError() {
    const note = document.getElementById('rf-player-error');
    if (note) note.hidden = true;
}

function showPlayerError(message) {
    const frame = document.getElementById('movie-player');
    if (frame) frame.removeAttribute('src');
    const host = frame && frame.parentElement;
    if (!host) return;
    let note = document.getElementById('rf-player-error');
    if (!note) {
        note = document.createElement('div');
        note.id = 'rf-player-error';
        note.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#f8f5ff;background:#080610;font-size:14px;line-height:1.6;z-index:2';
        host.appendChild(note);
    }
    note.hidden = false;
    note.textContent = message;
}

function safePlayUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
        return parsed.href;
    } catch (_) { return ''; }
}

function episodesFromPayload(movie) {
    const epList = [];
    const groups = movie && Array.isArray(movie.episodes) ? movie.episodes : [];
    groups.forEach(group => {
        const rows = group && Array.isArray(group.server_data) ? group.server_data : [];
        rows.forEach(ep => {
            const embed = safePlayUrl(ep.link_embed);
            const hls = safePlayUrl(ep.link_m3u8);
            const link = embed || hls;
            const b2Key = String(ep.b2_key || ep.storage_key || ep.object_key || ep.b2Key || '').trim();
            if (!link && !b2Key) return;
            epList.push({
                name: String(ep.name || ep.slug || 'Full'),
                link,
                b2Key,
                linkType: embed ? 'embed' : 'hls',
                sources: { embed, hls },
                activeSource: embed ? 'embed' : 'hls'
            });
        });
    });
    return epList;
}

async function kkphimStreamAlive(link) {
    let file = '';
    try {
        const parsed = new URL(link);
        if (!(parsed.hostname === 'phimapi.com' || parsed.hostname.endsWith('.phimapi.com'))) return true;
        file = parsed.searchParams.get('url') || '';
    } catch (_) { return true; }
    if (!String(file).startsWith('https://')) return false;
    try {
        const response = await fetch('/api/source-status?u=' + encodeURIComponent(file));
        if (!response.ok) return true;
        const data = await response.json();
        return data.exists !== false;
    } catch (_) { return true; }
}

async function useKkphimPlayback(slug, title) {
    const base = 'https://phimapi.com';
    const take = payload => {
        const movie = typeof unwrapDetailPayload === 'function' ? unwrapDetailPayload(payload) : payload;
        const episodes = episodesFromPayload(movie);
        if (!movie || !episodes.length) return false;
        currentEpisodeList = episodes;
        currentMovieTitle = movie.name || movie.title || title || currentMovieTitle;
        currentMovieData = Object.assign({}, movie, { _src: 'kkphim' });
        return true;
    };
    try {
        const response = await fetch(base + '/phim/' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } });
        if (response.ok && take(await response.json())) return true;
    } catch (error) { console.warn('[RoFlix KKPhim] detail by slug failed:', error); }
    if (!title) return false;
    try {
        const url = base + '/v1/api/tim-kiem?keyword=' + encodeURIComponent(title) + '&page=1&limit=10';
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) return false;
        const payload = await response.json();
        const rows = payload.items || payload.data?.items || payload.data?.data?.items || payload.results || [];
        const wanted = String(title).toLowerCase().replace(/\s+/g, ' ').trim();
        const exact = rows.find(item => [item.name, item.title, item.origin_name].some(value =>
            String(value || '').toLowerCase().replace(/\s+/g, ' ').trim() === wanted));
        const candidate = exact || (rows.length === 1 ? rows[0] : null);
        if (!candidate?.slug) return false;
        const detail = await fetch(base + '/phim/' + encodeURIComponent(candidate.slug), { headers: { Accept: 'application/json' } });
        if (!detail.ok) return false;
        return take(await detail.json());
    } catch (error) {
        console.warn('[RoFlix KKPhim] fallback failed:', error);
        return false;
    }
}

async function useVsmovPlayback(slug, title) {
    const base = 'https://vsmov.com/api';
    const take = movie => {
        const episodes = episodesFromPayload(movie);
        if (!episodes.length) return false;
        currentEpisodeList = episodes;
        currentMovieTitle = (movie && (movie.name || movie.title)) || title || currentMovieTitle;
        currentMovieData = Object.assign({}, movie, { _src: 'vsmov' });
        return true;
    };
    // Thử slug trực tiếp trước, sau đó tìm đúng tên phim để xử lý slug khác nhau giữa hai API.
    try {
        const response = await fetch(base + '/phim/' + encodeURIComponent(slug), { headers: { Accept: 'application/json' } });
        if (response.ok) {
            const payload = await response.json();
            const movie = typeof unwrapDetailPayload === 'function' ? unwrapDetailPayload(payload) : payload;
            if (take(movie)) return true;
        }
    } catch (error) { console.warn('[RoFlix VSMOV] detail by slug failed:', error); }
    if (!title) return false;
    try {
        const response = await fetch(base + '/tim-kiem?keyword=' + encodeURIComponent(title) + '&page=1&limit=8', { headers: { Accept: 'application/json' } });
        if (!response.ok) return false;
        const payload = await response.json();
        const rows = payload.items || payload.data?.items || payload.results || [];
        const wanted = String(title).toLowerCase().replace(/\s+/g, ' ').trim();
        const exact = rows.find(item => String(item.name || item.title || '').toLowerCase().replace(/\s+/g, ' ').trim() === wanted);
        const candidate = exact || (rows.length === 1 ? rows[0] : null);
        if (!candidate?.slug) return false;
        const detailResponse = await fetch(base + '/phim/' + encodeURIComponent(candidate.slug), { headers: { Accept: 'application/json' } });
        if (!detailResponse.ok) return false;
        const detailPayload = await detailResponse.json();
        const movie = typeof unwrapDetailPayload === 'function' ? unwrapDetailPayload(detailPayload) : detailPayload;
        return take(movie);
    } catch (error) {
        console.warn('[RoFlix VSMOV] fallback failed:', error);
        return false;
    }
}

async function requestRoFlixB2PlaybackUrl(objectKey) {
    // B2 playback is intentionally public at the application level.
    // The bucket remains private; the API returns a short-lived signed URL.
    const response = await fetch('/api/b2-playback?key=' + encodeURIComponent(objectKey), {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) {
        const messages = {
            invalid_or_disallowed_object_key: 'Đường dẫn file không nằm trong vùng lưu trữ được phép.',
            b2_configuration_missing: 'Vercel chưa cấu hình đủ biến B2.',
            b2_signing_failed: 'Không thể ký URL truy cập B2.'
        };
        throw new Error(messages[payload.error] || 'Không lấy được URL phát video Private (HTTP ' + response.status + ').');
    }
    return payload.url;
}

async function playB2Object(objectKey, title = 'RoFlix Private Storage') {
    currentMovieTitle = title;
    currentSlug = 'b2-private-storage';
    currentEpisodeList = [{ name: 'Private B2', b2Key: objectKey }];
    currentMovieData = { title, _src: 'b2-private' };
    await playMovieByIndex(0, { skipSourceCheck: true });
}

(function bootB2PrivatePlaybackFromQuery() {
    try {
        const params = new URLSearchParams(window.location.search);
        const key = params.get('b2');
        if (!key) return;
        const title = params.get('title') || 'RoFlix Private Storage';
        window.addEventListener('DOMContentLoaded', () => {
            playB2Object(key, title).catch(error => {
                console.error('[RoFlix B2]', error);
                showToast('error', 'B2 Private', error.message || 'Không mở được video Private.');
            });
        }, { once: true });
    } catch (_) {}
})();

function rfResetPlaybackSession() {
    window.__RF_PLAY_REQUEST_ID__ = (window.__RF_PLAY_REQUEST_ID__ || 0) + 1;
    try { cleanupCatalogVideo(); } catch (_) {}
    const frame = document.getElementById('movie-player');
    if (frame) {
        frame.removeAttribute('src');
        frame.src = 'about:blank';
        frame.style.display = '';
        frame.removeAttribute('sandbox');
        frame.removeAttribute('referrerpolicy');
        frame.dataset.rfVidsrcSandboxed = '0';
    }
    const title = document.getElementById('playing-title');
    if (title) title.textContent = 'Đang tải phim...';
    const grid = document.getElementById('episode-list-grid');
    if (grid) grid.innerHTML = '<p class="col-span-full text-xs text-gray-500 text-center py-4">Đang tải danh sách tập...</p>';
    window.__RF_LAST_EP_INDEX__ = 0;
}
window.rfResetPlaybackSession = rfResetPlaybackSession;

async function playMovieByIndex(index, options = {}) {
    const playRequestId = window.__RF_PLAY_REQUEST_ID__ = (window.__RF_PLAY_REQUEST_ID__ || 0) + 1;
    const episodeSnapshot = Array.isArray(currentEpisodeList) ? currentEpisodeList.slice() : [];
    const movieSnapshot = currentMovieData;
    const titleSnapshot = currentMovieTitle || 'Đang phát';
    const slugSnapshot = currentSlug || '';
    const sourceSnapshot = currentSourceId || '';
    const isCurrentRequest = () => playRequestId === window.__RF_PLAY_REQUEST_ID__;
    if ((!options || !options.fromParty) && window.rfWatchPartyBlocksControl && window.rfWatchPartyBlocksControl()) {
        showToast('warning', 'Phòng xem chung', 'Chỉ host được đổi tập. Bạn đang xem theo host.');
        return;
    }
    const ep = episodeSnapshot[index];
    if (!ep) { showToast('error', 'Lỗi', 'Không có tập này!'); return; }
    window.__RF_LAST_EP_INDEX__ = index;

    if (!ep.link && !ep.b2Key) {
        cleanupCatalogVideo();
        showToast('warning', 'Chưa có link phát', 'Tập này chưa trả về đường dẫn phát hợp lệ. Phim vẫn được giữ trong danh sách, bạn có thể thử tải lại chi tiết.');
        return;
    }
    if (!options.skipSourceCheck && ep.link.includes('player.phimapi.com')) {
        const alive = await kkphimStreamAlive(ep.link);
        if (!isCurrentRequest()) return;
        if (!alive) {
            cleanupCatalogVideo();
            showToast('warning', 'Link tập không còn tồn tại', 'Máy chủ xác nhận link tập trả về 404/410. RoFlix vẫn giữ phim trong danh sách; hãy chọn tập hoặc nguồn khác.');
            // A failed probe is not proof that the media was deleted.
            // Continue to the player instead of hiding the title.
            return;
        }
    }
    clearPlayerError();

    let resolvedLink = ep.link || '';
    if (ep.b2Key) {
        try {
            if (/\.m3u8(?:[?#]|$)/i.test(ep.b2Key)) {
                throw new Error('HLS Private cần HLS Gateway để ký cả playlist và từng segment. Hiện tại chỉ bật MP4/WebM Private.');
            }
            resolvedLink = await requestRoFlixB2PlaybackUrl(ep.b2Key);
            if (!isCurrentRequest()) return;
        } catch (error) {
            showToast('error', 'B2 Private', error.message || 'Không lấy được URL phát.');
            return;
        }
    }

    const title = titleSnapshot;
    try {
        currentMovieData = movieSnapshot || {
            title, origin_name: '', summary: '', _src: currentSourceId, poster: ''
        };
    } catch (_) {}

    if (!isCurrentRequest()) return;
    const player = document.getElementById('movie-player');
    const titleEl = document.getElementById('playing-title');
    if (titleEl) titleEl.textContent = `${title} - ${ep.name}`;
    renderPlayEpisodeGrid(index);
    navigateTo('play-page');

    // Embed dùng iframe; HLS/MP4 dùng video element tương thích.
    if (player) {
        try {
            cleanupCatalogVideo();
            player.src = 'about:blank';
            player.removeAttribute('sandbox');
            delete player.dataset.rfVidsrcSandboxed;
            player.removeAttribute('referrerpolicy');
            player.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        } catch (_) {}
        const isHls = !ep.b2Key && (ep.linkType === 'hls' || /\.m3u8(?:[?#]|$)/i.test(resolvedLink));
        const isDirectVideo = /\.(mp4|m4v|webm|ogg)(?:[?#]|$)/i.test(resolvedLink);
        if (isHls || isDirectVideo) {
            try { await playCatalogHls(resolvedLink, `${title} - ${ep.name}`); }
            catch (error) {
                console.error('[RoFlix HLS] setup failed', error);
                showToast('error', 'Không khởi tạo được trình phát', error?.message || 'Nguồn HLS không khả dụng.');
            }
        } else {
            cleanupCatalogVideo();
            player.src = resolvedLink;
        }
    }

    try { if (window.rfAnalytics) window.rfAnalytics.movie('movie_play', slugSnapshot, title); } catch (_) {}
    try {
        if (window.rfAnalytics) {
            window.rfAnalytics.track('movie_view', {
                movieSlug: currentSlug || '',
                movieTitle: title,
                metadata: { episode: ep.name || '', index, player: 'default' }
            });
        }
    } catch (_) {}

    const detailPoster = document.querySelector('#detail-content-container img');
    saveWatchHistory(slugSnapshot || 'unknown', index, 0, {
        episodeName: ep.name || '',
        poster: detailPoster ? detailPoster.src : undefined,
        title: title,
        sourceId: sourceSnapshot
    });

    try {
        if (typeof window.rfWatchPartyBroadcast === 'function' && (!options || !options.fromParty)) {
            window.rfWatchPartyBroadcast({ type: 'episode_change' });
        }
    } catch (_) {}
}

function playMovieByLink(link, title, epName) {
    if (!link) {
        showToast('error', 'Lỗi', 'Không có link phát cho tập này!');
        return;
    }
    const idx = currentEpisodeList.findIndex(e => e.link === link);
    if (idx >= 0) {
        playMovieByIndex(idx);
        return;
    }
    currentEpisodeList = [{ name: epName || 'Full', link }];
    currentMovieTitle = title || currentMovieTitle;
    playMovieByIndex(0);
}

function goBackFromPlay() {
    cleanupCatalogVideo();
    const player = document.getElementById('movie-player');
    if (player) player.src = '';
    navigateTo('detail-page');
}

function openFullscreen() {
    const player = document.getElementById('movie-player');
    if (player.requestFullscreen) {
        player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
    }
}
