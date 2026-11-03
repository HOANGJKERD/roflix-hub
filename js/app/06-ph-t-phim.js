// ============================================================
// PHÁT PHIM
// Mặc định: KKPhim/VSMOV (ep.link)
// Tùy chọn: VidSrc embed khi user bấm (cần IMDb/TMDB)
// ============================================================

// Load helper VidSrc nếu chưa có (không cần sửa index.html)
(function ensureVidSrcHelper() {
    if (window.RoflixVidSrc) return;
    if (document.querySelector('script[src*="00b-vidsrc"]')) return;
    var s = document.createElement('script');
    s.src = 'js/app/00b-vidsrc.js';
    s.async = true;
    (document.head || document.documentElement).appendChild(s);
})();

async function playMovie(slug, preferredSrc) {
    if (window.rfWatchPartyBlocksControl && window.rfWatchPartyBlocksControl()) {
        showToast('warning', 'Phòng xem chung', 'Chỉ host được đổi phim. Bạn đang xem theo host.');
        return;
    }
    window.__ROFLIX_ANIME_MODE__ = false;
    try {
        // Nếu người xem vừa mở trang chi tiết phim này, tái sử dụng dữ liệu/tập đã tải.
        // Trước đây playMovie luôn gọi viewMovieDetail lần nữa, tạo request chi tiết
        // trùng lặp và có thể gọi AniMapper metadata lần thứ hai trước khi phát.
        const alreadyLoaded = currentSlug === slug
            && currentMovieData
            && Array.isArray(currentEpisodeList)
            && currentEpisodeList.length > 0;
        if (!alreadyLoaded) {
            await viewMovieDetail(slug, preferredSrc);
        }
        let tries = 0;
        while (currentEpisodeList.length === 0 && tries < 15) {
            await new Promise(r => setTimeout(r, 120));
            tries++;
        }
        if (currentEpisodeList.length > 0) {
            playMovieByIndex(0);
        } else {
            if (typeof showToastPro === 'function') {
                showToastPro('error', 'Chưa có tập', 'Phim này chưa có link phát trên API.');
            } else {
                showToast('error', 'Chưa có tập', 'Phim này chưa có link phát trên API.');
            }
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
                movieSlug: currentSlug || '',
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

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
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
                const idx = Number(window.__RF_LAST_EP_INDEX__) || 0;
                const ep = currentEpisodeList[idx];
                if (!ep || !rfTryAlternateEpisodeSource(ep, idx, new Error(data.details || 'HLS fatal error'))) {
                    showPlayerError('Luồng HLS gặp lỗi (' + (data.details || data.type || 'không rõ') + ').');
                }
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


function rfShowPlayerStatus(message, state) {
    let el = document.getElementById('rf-player-status');
    const host = document.getElementById('movie-player')?.parentElement;
    if (!host) return;
    if (!el) {
        el = document.createElement('div');
        el.id = 'rf-player-status';
        el.style.cssText = 'padding:12px;color:#e5e7eb;background:#111827;border:1px solid #374151;border-radius:10px;margin-top:8px;font-size:13px;';
        host.appendChild(el);
    }
    el.dataset.state = state || 'info';
    el.textContent = message;
    el.style.display = 'block';
}
function showPlayerError(message) {
    rfShowPlayerStatus('Không thể phát phim: ' + message, 'error');
    const el = document.getElementById('rf-player-status');
    if (el) {
        el.innerHTML = '';
        const text = document.createElement('span');
        text.textContent = 'Không thể phát phim: ' + message + ' ';
        const retry = document.createElement('button');
        retry.type = 'button'; retry.textContent = 'Thử lại nguồn khác';
        retry.style.cssText = 'margin-left:8px;padding:6px 10px;border-radius:7px;background:#f59e0b;color:#111;font-weight:700;';
        retry.onclick = rfTryCurrentEpisodeAlternate;
        el.append(text, retry);
    }
}
function rfTryAlternateEpisodeSource(ep, index, error) {
    const sources = ep.sources || {};
    const current = ep.activeSource || (ep.linkType === 'hls' ? 'hls' : 'embed');
    const alternate = current === 'embed' ? 'hls' : 'embed';
    const url = sources[alternate];
    if (!url || ep.__rfTriedSources.includes(alternate)) return false;
    ep.activeSource = alternate;
    ep.link = url;
    ep.linkType = alternate;
    console.warn('[RoFlix] switching episode source', current, '->', alternate, error);
    playMovieByIndex(index, { sourceFallback: true });
    return true;
}
function rfMarkEmbedLoaded() {
    clearTimeout(window.__RF_EMBED_WAIT_TIMER__);
    const status = document.getElementById('rf-player-status');
    if (!status) return;
    status.dataset.state = 'uncertain';
    status.textContent = 'Đã mở trang nguồn. RoFlix không thể xác nhận video bên trong iframe khác domain. Nếu màn hình vẫn đen, ';
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Thử nguồn còn lại';
    button.style.cssText = 'margin-left:8px;padding:6px 10px;border-radius:7px;background:#f59e0b;color:#111;font-weight:700;';
    button.onclick = rfTryCurrentEpisodeAlternate;
    status.appendChild(button);
}
function rfTryCurrentEpisodeAlternate() {
    const index = Number(window.__RF_LAST_EP_INDEX__) || 0;
    const ep = currentEpisodeList[index];
    if (!ep) return;
    ep.__rfTriedSources = ep.__rfTriedSources || [];
    if (!rfTryAlternateEpisodeSource(ep, index, new Error('Người xem yêu cầu đổi nguồn'))) {
        showPlayerError('Không còn nguồn thay thế cho tập này.');
    }
}

async function playMovieByIndex(index, options = {}) {
    if ((!options || !options.fromParty) && window.rfWatchPartyBlocksControl && window.rfWatchPartyBlocksControl()) {
        showToast('warning', 'Phòng xem chung', 'Chỉ host được đổi tập. Bạn đang xem theo host.');
        return;
    }
    const ep = currentEpisodeList[index];
    if (!ep) { showToast('error', 'Lỗi', 'Không có tập này!'); return; }
    window.__RF_LAST_EP_INDEX__ = index;
    const playerStatus = document.getElementById('rf-player-status');
    if (playerStatus) { playerStatus.style.display = 'none'; playerStatus.dataset.state = ''; }
    clearTimeout(window.__RF_EMBED_WAIT_TIMER__);

    if (!ep.link && ep.__rfAniMapper && window.roflixAnimePlayer?.resolveEpisode) {
        try {
            const resolved = await window.roflixAnimePlayer.resolveEpisode(
                ep.__rfAniMapper.mediaId,
                ep.__rfAniMapper.provider,
                ep.__rfAniMapper.episode,
                ep.__rfAniMapper.index
            );
            ep.link = resolved.url;
            ep.__rfAniSource = resolved;
        } catch (error) {
            console.warn('[RoFlix Anime] episode source failed', error);
        }
    }
    if (!ep.link) { showToast('error', 'Lỗi', 'Không có link phát cho tập này!'); return; }

    const title = currentMovieTitle || 'Đang phát';
    try {
        currentMovieData = currentMovieData || { title, origin_name: '', summary: '', _src: currentSourceId, poster: '' };
    } catch (_) {}

    // Reset per-attempt state and retain both provider URLs for controlled fallback.
    ep.__rfTriedSources = ep.__rfTriedSources || [];
    const player = document.getElementById('movie-player');
    const titleEl = document.getElementById('playing-title');
    if (titleEl) titleEl.textContent = `${title} - ${ep.name}`;
    renderPlayEpisodeGrid(index);
    navigateTo('play-page');

    // Mặc định: embed dùng iframe; HLS/MP4 dùng video element tương thích.
    if (ep.__rfAniMapper && window.roflixAnimePlayer?.mount) {
        try {
            cleanupCatalogVideo();
            await window.roflixAnimePlayer.mount(ep.link, `${title} - ${ep.name}`, ep.__rfAniSource?.type);
        } catch (error) {
            console.warn('[RoFlix Anime] custom mount failed', error);
            showToast('error', 'Lỗi phát Anime', error?.message || 'Nguồn phát không mở được.');
            return;
        }
    } else if (player) {
        try {
            player.removeAttribute('sandbox');
            delete player.dataset.rfVidsrcSandboxed;
            player.removeAttribute('referrerpolicy');
            player.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        } catch (_) {}
        const playUrl = ep.link;
        const isHls = ep.linkType === 'hls' || /\.m3u8(?:[?#]|$)/i.test(playUrl);
        const isDirectVideo = /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(playUrl);
        if (isHls || isDirectVideo) {
            try {
                ep.__rfTriedSources.push(ep.activeSource || 'hls');
                await playCatalogHls(playUrl, `${title} - ${ep.name}`);
            } catch (error) {
                console.error('[RoFlix HLS] setup failed', error);
                if (!rfTryAlternateEpisodeSource(ep, index, error)) showPlayerError(error?.message || 'Nguồn video không khả dụng.');
            }
        } else {
            cleanupCatalogVideo();
            player.onload = null;
            player.onerror = () => {
                if (!rfTryAlternateEpisodeSource(ep, index, new Error('Không tải được trang phát.'))) showPlayerError('Nhà cung cấp không tải được trình phát.');
            };
            player.onload = rfMarkEmbedLoaded;
            ep.__rfTriedSources.push(ep.activeSource || 'embed');
            player.src = playUrl;
            // iframe load không chứng minh video chạy; timeout chỉ báo trạng thái,
            // không tự kết luận provider lỗi vì cross-origin không cho kiểm tra playback.
            clearTimeout(window.__RF_EMBED_WAIT_TIMER__);
            window.__RF_EMBED_WAIT_TIMER__ = setTimeout(() => {
                const status = document.getElementById('rf-player-status');
                if (status && status.dataset.state === 'loading') {
                    status.textContent = 'Nguồn đã mở nhưng chưa xác nhận video. Nếu vẫn đen, hãy thử nguồn còn lại.';
                    status.dataset.state = 'uncertain';
                    status.innerHTML += ' <button type="button" onclick="rfTryCurrentEpisodeAlternate()">Thử nguồn còn lại</button>';
                }
            }, 12000);
            rfShowPlayerStatus('Đang kết nối nguồn phát…', 'loading');
        }
    }

    try { if (window.rfAnalytics) window.rfAnalytics.movie('movie_play', currentSlug || '', title); } catch (_) {}
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
    saveWatchHistory(currentSlug || 'unknown', index, 0, {
        episodeName: ep.name || '',
        poster: detailPoster ? detailPoster.src : undefined,
        title: title,
        sourceId: currentSourceId
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
    window.roflixAnimePlayer?.stop?.();
    const player = document.getElementById('movie-player');
    if (player) player.src = '';
    navigateTo('detail-page');
}

function openFullscreen() {
    if (window.roflixAnimePlayer?.fullscreen && window.__ROFLIX_ANIME_MODE__) {
        window.roflixAnimePlayer.fullscreen();
        return;
    }
    const player = document.getElementById('movie-player');
    if (player.requestFullscreen) {
        player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
    }
}
