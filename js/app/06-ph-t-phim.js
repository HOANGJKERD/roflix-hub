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
    window.__ROFLIX_ANIME_MODE__ = false;
    try {
        await viewMovieDetail(slug, preferredSrc);
        let tries = 0;
        while (currentEpisodeList.length === 0 && tries < 15) {
            await new Promise(r => setTimeout(r, 120));
            tries++;
        }
        if (currentEpisodeList.length > 0) {
            playMovieByIndex(0);
        } else if (window.RoflixVidSrc && window.RoflixVidSrc.hasIds(currentMovieData)) {
            // Không có link KKPhim/VSMOV nhưng có ID → cho mở VidSrc (user vẫn có lối ra)
            playOnVidSrc();
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

    const canVid = window.RoflixVidSrc && window.RoflixVidSrc.hasIds(currentMovieData);
    bar.innerHTML =
        `<span class="text-[10px] text-gray-500 self-center mr-1">Server:</span>` +
        `<button type="button" onclick="playMovieByIndex(window.__RF_LAST_EP_INDEX__||0)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black">Mặc định</button>` +
        (canVid
            ? `<button type="button" onclick="playOnVidSrc()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white">VidSrc</button>`
            : `<button type="button" disabled class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-500 cursor-not-allowed" title="Cần IMDb/TMDB">VidSrc</button>`);
}

/** Phát bằng embed VidSrc (giống tester https://vidsrc.sh/#tester) */
function playOnVidSrc(season, episode) {
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

async function playMovieByIndex(index, options = {}) {
    const ep = currentEpisodeList[index];
    if (!ep) { showToast('error', 'Lỗi', 'Không có tập này!'); return; }
    window.__RF_LAST_EP_INDEX__ = index;

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
        currentMovieData = currentMovieData || {
            title, origin_name: '', summary: '', _src: currentSourceId, poster: ''
        };
    } catch (_) {}

    const player = document.getElementById('movie-player');
    const titleEl = document.getElementById('playing-title');
    if (titleEl) titleEl.textContent = `${title} - ${ep.name}`;
    renderPlayEpisodeGrid(index);
    navigateTo('play-page');

    // Mặc định: link KKPhim/VSMOV (không auto VidSrc)
    if (ep.__rfAniMapper && window.roflixAnimePlayer?.mount) {
        try {
            await window.roflixAnimePlayer.mount(ep.link, `${title} - ${ep.name}`, ep.__rfAniSource?.type);
        } catch (error) {
            console.warn('[RoFlix Anime] custom mount failed', error);
            showToast('error', 'Lỗi phát Anime', 'Nguồn phát không mở được.');
            return;
        }
    } else if (player) {
        player.src = ep.link;
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
