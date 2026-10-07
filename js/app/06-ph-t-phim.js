// ============================================================
        // PHÁT PHIM
        // ============================================================
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
            if (!ep) { showToast('error', 'Lỗi', 'Không có tập này!'); return; }
            if (!ep.link && ep.__rfAniMapper && window.roflixAnimePlayer?.resolveEpisode) {
                try { ep.link = (await window.roflixAnimePlayer.resolveEpisode(ep.__rfAniMapper.mediaId, ep.__rfAniMapper.episode, ep.__rfAniMapper.index)).url; }
                catch (error) { console.warn('[RoFlix Anime] episode source failed', error); }
            }
            if (!ep.link) { showToast('error', 'Lỗi', 'Không có link phát cho tập này!'); return; }
            const title = currentMovieTitle || 'Đang phát';
            try { currentMovieData = currentMovieData || { title, origin_name: '', summary: '', _src: currentSourceId, poster: '' }; } catch (_) {}
            const player = document.getElementById('movie-player');
            const titleEl = document.getElementById('playing-title');
            if (titleEl) titleEl.textContent = `${title} - ${ep.name}`;
            renderPlayEpisodeGrid(index);
            navigateTo('play-page');
            if (ep.__rfAniMapper && window.roflixAnimePlayer?.mount) {
                try { await window.roflixAnimePlayer.mount(ep.link, `${title} - ${ep.name}`); }
                catch (error) { console.warn('[RoFlix Anime] custom mount failed', error); showToast('error', 'Lỗi phát Anime', 'Nguồn phát không mở được.'); return; }
            } else if (player) player.src = ep.link;
            try { if (window.rfAnalytics) window.rfAnalytics.movie('movie_play', currentSlug || '', title); } catch (_) {}
            try { if (window.rfAnalytics) window.rfAnalytics.track('movie_view', { movieSlug: currentSlug || '', movieTitle: title, metadata: { episode: ep.name || '', index } }); } catch (_) {}
            const detailPoster = document.querySelector('#detail-content-container img');
            saveWatchHistory(currentSlug || 'unknown', index, 0, { episodeName: ep.name || '', poster: detailPoster ? detailPoster.src : undefined, title: title, sourceId: currentSourceId });
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
            window.roflixAnimePlayer?.stop?.();
            document.getElementById('movie-player').src = '';
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
