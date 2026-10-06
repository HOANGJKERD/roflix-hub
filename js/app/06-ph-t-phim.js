// ============================================================
// PHÁT PHIM
// ============================================================
function rfIsHlsUrl(url) {
    return /^https?:\/\/.+\.m3u8(?:$|[?#])/i.test(String(url || '').trim());
}

function rfLoadHlsJs() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (window.__ROFLIX_HLS_PROMISE__) return window.__ROFLIX_HLS_PROMISE__;
    window.__ROFLIX_HLS_PROMISE__ = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-roflix-hls]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.Hls));
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js';
        script.async = true;
        script.dataset.roflixHls = '1';
        script.onload = () => resolve(window.Hls);
        script.onerror = () => reject(new Error('Không tải được HLS player'));
        document.head.appendChild(script);
    });
    return window.__ROFLIX_HLS_PROMISE__;
}

function rfGetPlayer() {
    return document.getElementById('movie-player');
}

function rfUseIframePlayer(link) {
    let player = rfGetPlayer();
    if (!player || player.tagName !== 'IFRAME') {
        const old = player;
        player = document.createElement('iframe');
        player.id = 'movie-player';
        player.className = 'w-full h-full';
        player.setAttribute('frameborder', '0');
        player.setAttribute('allowfullscreen', '');
        player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        old?.replaceWith(player);
    }
    player.src = link;
    return player;
}

async function rfUseHlsPlayer(link) {
    let player = rfGetPlayer();
    if (!player || player.tagName !== 'VIDEO') {
        const old = player;
        player = document.createElement('video');
        player.id = 'movie-player';
        player.className = 'w-full h-full object-contain bg-black';
        player.controls = true;
        player.playsInline = true;
        player.autoplay = true;
        player.setAttribute('webkit-playsinline', '');
        old?.replaceWith(player);
    }
    if (player._roflixHls) {
        try { player._roflixHls.destroy(); } catch (_) {}
        player._roflixHls = null;
    }

    // Safari/iOS can play HLS natively. Other modern browsers use hls.js.
    if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = link;
        try { await player.play(); } catch (_) {}
        return player;
    }
    try {
        const Hls = await rfLoadHlsJs();
        if (!Hls || !Hls.isSupported()) throw new Error('Trình duyệt không hỗ trợ HLS');
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        player._roflixHls = hls;
        hls.loadSource(link);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { player.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data?.fatal) {
                showToast('error', 'Lỗi phát HLS', 'Nguồn phát HLS không khả dụng hoặc đã hết hạn.');
            }
        });
        return player;
    } catch (e) {
        console.error('[RoFlix] HLS playback failed', e);
        showToast('error', 'Không phát được', e?.message || 'Trình duyệt không hỗ trợ nguồn HLS này.');
        return null;
    }
}

async function rfSetPlayerSource(link) {
    if (rfIsHlsUrl(link)) return rfUseHlsPlayer(link);
    return rfUseIframePlayer(link);
}

async function playMovie(slug, preferredSrc) {
    try {
        await viewMovieDetail(slug, preferredSrc);
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
}

async function playMovieByIndex(index, options = {}) {
    const ep = currentEpisodeList[index];
    if (!ep || !ep.link) {
        showToast('error', 'Lỗi', 'Không có link phát cho tập này!');
        return;
    }
    const title = currentMovieTitle || 'Đang phát';
    try { currentMovieData = currentMovieData || { title, origin_name: '', summary: '', _src: currentSourceId, poster: '' }; } catch (_) {}
    const titleEl = document.getElementById('playing-title');
    await rfSetPlayerSource(ep.link);
    if (titleEl) titleEl.textContent = `${title} - ${ep.name}`;
    renderPlayEpisodeGrid(index);
    navigateTo('play-page');
    try { if (window.rfAnalytics) window.rfAnalytics.movie('movie_play', currentSlug || '', title); } catch (_) {}
    try { if (window.rfAnalytics) window.rfAnalytics.track('movie_view', { movieSlug: currentSlug || '', movieTitle: title, metadata: { episode: ep.name || '', index } }); } catch (_) {}
    const detailPoster = document.querySelector('#detail-content-container img');
    saveWatchHistory(currentSlug || 'unknown', index, 0, {
        episodeName: ep.name || '',
        poster: detailPoster ? detailPoster.src : undefined,
        title: title,
        sourceId: currentSourceId
    });
    try { if (typeof window.rfWatchPartyBroadcast === 'function' && (!options || !options.fromParty)) window.rfWatchPartyBroadcast({ type: 'episode_change' }); } catch (_) {}
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
    const player = rfGetPlayer();
    if (player) {
        if (player._roflixHls) {
            try { player._roflixHls.destroy(); } catch (_) {}
            player._roflixHls = null;
        }
        if (player.tagName === 'VIDEO') {
            try { player.pause(); } catch (_) {}
            player.removeAttribute('src');
            player.load();
        } else {
            player.src = '';
        }
    }
    navigateTo('detail-page');
}

function openFullscreen() {
    const player = rfGetPlayer();
    if (!player) return;
    if (player.requestFullscreen) {
        player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
    }
}
