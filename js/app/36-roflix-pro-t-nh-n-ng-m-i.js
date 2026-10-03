// ============================================================
        // ROFLIX PRO - TÍNH NĂNG MỚI
        // ============================================================

        // ===== 1. FILTER THEO QUỐC GIA =====
        let currentCountry = '';

        async function filterByCountry(slug, title) {
            currentCountry = slug || '';
            
            document.querySelectorAll('.country-pill').forEach(el => {
                el.classList.toggle('active', (el.dataset.country || '') === (slug || ''));
            });
            
            searchKeyword = '';
            currentGenreSlug = '';
            currentCountrySlug = slug || '';
            homePriorityMode = !slug;
            currentListEndpoint = 'phim-moi-cap-nhat';
            
            const flags = {
                'au-my': '🇺🇸',
                'han-quoc': '🇰🇷',
                'trung-quoc': '🇨🇳',
                'nhat-ban': '🇯🇵',
                'thai-lan': '🇹🇭',
                'an-do': '🇮🇳',
                'viet-nam': '🇻🇳'
            };
            const titleEl = document.getElementById('list-title');
            if (titleEl) {
                titleEl.textContent = slug
                    ? `${flags[slug] || '🌍'} ${title || slug}`
                    : 'Phim Âu Mỹ & Hàn nổi bật';
            }
            const si = document.getElementById('search-input');
            const sm = document.getElementById('search-input-mobile');
            if (si) si.value = '';
            if (sm) sm.value = '';
            
            navigateTo('main-site');
            await renderMoviesFromAPI(1);
            scrollToMovieList();
        }

        // ===== 2. XEM TIẾP (CONTINUE WATCHING) =====
        async function showContinueWatching() {
            if (!getRoFlixCurrentUserId()) {
                showToastPro('info', 'Đăng nhập để xem tiếp', 'Mỗi tài khoản có lịch sử xem riêng.');
                return;
            }
            const history = getWatchHistory().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (!history.length) {
                showToastPro('info', 'Chưa có phim', 'Bạn chưa xem phim nào, hãy bắt đầu ngay!');
                return;
            }
            const last = history[0];
            if (!last || !last.slug) {
                showToastPro('error', 'Lỗi', 'Không tìm thấy phim đã xem');
                return;
            }
            await resumeWatchHistory(last.slug);
        }


        // ===== 3. THÔNG BÁO (NOTIFICATION) =====
        let notifications = JSON.parse(localStorage.getItem('roflix-notifications') || '[]');

        function addNotification(title, message, type = 'info') {
            const icons = { success: '✅', error: '❌', info: '📢', warning: '⚠️' };
            notifications.unshift({
                id: Date.now(),
                title: title,
                message: message,
                type: type,
                icon: icons[type] || '📢',
                time: new Date().toISOString(),
                read: false
            });
            if (notifications.length > 50) notifications = notifications.slice(0, 50);
            localStorage.setItem('roflix-notifications', JSON.stringify(notifications));
            updateNotificationBadge();
            renderNotifications();
            showToastPro(type, title, message);
        }

        function updateNotificationBadge() {
            const unread = notifications.filter(n => !n.read).length;
            const badge = document.getElementById('notif-badge');
            if (badge) {
                if (unread > 0) {
                    badge.textContent = unread > 9 ? '9+' : unread;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            const countEl = document.getElementById('notif-count');
            if (countEl) countEl.textContent = unread > 0 ? `${unread} chưa đọc` : '0';
        }

        function renderNotifications() {
            const list = document.getElementById('notification-list');
            if (!list) return;
            if (notifications.length === 0) {
                list.innerHTML = '<div class="notif-empty">📭 Chưa có thông báo</div>';
                return;
            }
            list.innerHTML = notifications.slice(0, 15).map(n => `
                <div class="notif-item ${n.read ? '' : 'border-amber-500/20 bg-amber-500/5'}" onclick="markNotificationRead('${n.id}')">
                    <div class="flex items-start gap-2">
                        <span class="text-base">${n.icon || '📢'}</span>
                        <div class="flex-1 min-w-0">
                            <div class="notif-msg">${escapeHtml(n.message)}</div>
                            <div class="notif-time">${new Date(n.time).toLocaleString('vi-VN')}</div>
                        </div>
                        ${!n.read ? '<span class="notif-dot"></span>' : ''}
                    </div>
                </div>
            `).join('');
        }

        function markNotificationRead(id) {
            const notif = notifications.find(n => String(n.id) === String(id));
            if (notif) notif.read = true;
            localStorage.setItem('roflix-notifications', JSON.stringify(notifications));
            updateNotificationBadge();
            renderNotifications();
        }

        function toggleNotification() {
            const panel = document.getElementById('notification-panel');
            if (panel) {
                panel.classList.toggle('open');
                if (panel.classList.contains('open')) {
                    notifications.forEach(n => n.read = true);
                    localStorage.setItem('roflix-notifications', JSON.stringify(notifications));
                    updateNotificationBadge();
                    renderNotifications();
                }
            }
        }

        document.addEventListener('click', function(e) {
            const panel = document.getElementById('notification-panel');
            const btn = e.target.closest('[onclick="toggleNotification()"]') || e.target.closest('.fa-bell')?.parentElement;
            if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !btn) {
                panel.classList.remove('open');
            }
        });

        // ===== 4. TOAST PRO =====
        function showToastPro(type, title, message) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            
            const colors = {
                success: 'bg-green-500/20 text-green-400',
                error: 'bg-red-500/20 text-red-400',
                info: 'bg-blue-500/20 text-blue-400',
                warning: 'bg-yellow-500/20 text-yellow-400'
            };
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle'
            };
            
            const toast = document.createElement('div');
            toast.className = 'toast-pro show';
            toast.innerHTML = `
                <div class="toast-icon ${colors[type] || colors.info}">
                    <i class="fa-solid ${icons[type] || icons.info}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-white">${escapeHtml(title)}</div>
                    <div class="text-xs text-gray-400">${escapeHtml(message)}</div>
                </div>
                <button onclick="this.closest('.toast-pro').remove()" class="text-gray-500 hover:text-white transition flex-shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        }

        // ===== 5. KIỂM TRA PHIM MỚI =====
        let checkedSlugs = new Set();
        let newMoviesSeeded = false;

        async function checkNewMovies() {
            try {
                const res = await fetchListWithFallback('/danh-sach/phim-moi-cap-nhat?page=1');
                const movies = unwrapList(res.data).items;
                const slugs = movies.map(m => m.slug || m._id || '').filter(Boolean);

                // Lần đầu: chỉ seed, không bắn thông báo spam
                if (!newMoviesSeeded) {
                    slugs.forEach(s => checkedSlugs.add(s));
                    newMoviesSeeded = true;
                    try { localStorage.setItem('roflix-checked-slugs', JSON.stringify([...checkedSlugs])); } catch (_) {}
                    return;
                }

                const brandNew = slugs.filter(s => !checkedSlugs.has(s));
                brandNew.forEach(s => checkedSlugs.add(s));
                if (brandNew.length > 0) {
                    addNotification('🎬 Phim mới!', `Có ${brandNew.length} bộ phim mới vừa cập nhật.`, 'success');
                    try { localStorage.setItem('roflix-checked-slugs', JSON.stringify([...checkedSlugs])); } catch (_) {}
                }
            } catch (e) {}
        }

        // Khôi phục slug đã biết (tránh báo lại sau F5)
        try {
            const saved = JSON.parse(localStorage.getItem('roflix-checked-slugs') || '[]');
            if (Array.isArray(saved) && saved.length) {
                saved.forEach(s => checkedSlugs.add(s));
                newMoviesSeeded = true;
            }
        } catch (_) {}

        // ===== 6. SAVE WATCH HISTORY =====
        // Lịch sử xem được tách theo Supabase user ID.
        // Không dùng một key localStorage chung nữa, tránh tài khoản B nhìn thấy
        // "Xem tiếp" của tài khoản A trên cùng trình duyệt.
        const ROFLIX_WATCH_HISTORY_PREFIX = 'roflix-watch-history:user:';

        function getRoFlixCurrentUserId() {
            try {
                const raw = localStorage.getItem('roflix-current-user');
                if (!raw) return null;
                const user = JSON.parse(raw);
                return user && user.id ? String(user.id) : null;
            } catch (_) { return null; }
        }

        function getWatchHistoryStorageKey() {
            const userId = getRoFlixCurrentUserId();
            return userId ? ROFLIX_WATCH_HISTORY_PREFIX + userId : null;
        }

        function getWatchHistory() {
            const key = getWatchHistoryStorageKey();
            if (!key) return [];
            try {
                const data = JSON.parse(localStorage.getItem(key) || '[]');
                return Array.isArray(data) ? data : [];
            } catch (_) { return []; }
        }

        function saveWatchHistory(slug, episode, progress, extra = {}) {
            if (!slug || slug === 'unknown') return;
            const safeEpisode = Number.isFinite(Number(episode)) ? Math.max(0, Number(episode)) : 0;
            const safeProgress = Number.isFinite(Number(progress)) ? Math.max(0, Math.min(1, Number(progress))) : 0;
            let history = getWatchHistory().filter(h => h.slug !== slug);
            const previous = getWatchHistory().find(h => h.slug === slug) || {};
            history.push({
                ...previous,
                ...extra,
                slug,
                episode: safeEpisode,
                episodeName: extra.episodeName || (currentEpisodeList[safeEpisode] && currentEpisodeList[safeEpisode].name) || previous.episodeName || '',
                progress: safeProgress,
                timestamp: Date.now(),
                title: (typeof currentMovieTitle !== 'undefined' ? currentMovieTitle : '') || previous.title || slug,
                sourceId: currentSourceId || previous.sourceId || 'vsmov',
                genres: extra.genres || (typeof currentMovieData !== 'undefined' && currentMovieData && currentMovieData.genre) || previous.genres || []
            });
            history.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            if (history.length > 50) history = history.slice(-50);
            const storageKey = getWatchHistoryStorageKey();
            if (!storageKey) return;
            try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (e) {
                console.warn('Không thể lưu lịch sử xem:', e);
            }
            if (typeof renderContinueWatching === 'function') renderContinueWatching();
        }

        function clearWatchHistory(slug) {
            let history = getWatchHistory();
            history = slug ? history.filter(item => item.slug !== slug) : [];
            const storageKey = getWatchHistoryStorageKey();
            if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (_) {} }
            if (typeof renderContinueWatching === 'function') renderContinueWatching();
            if (typeof renderHistoryTab === 'function') renderHistoryTab();
            if (typeof showToastPro === 'function') showToastPro('success', 'Lịch sử xem', slug ? 'Đã xóa phim khỏi lịch sử.' : 'Đã xóa toàn bộ lịch sử xem.');
        }

        function renderContinueWatching() {
            const section = document.getElementById('continue-watching-section');
            const row = document.getElementById('continue-watching-row');
            if (!section || !row) return;
            const history = getWatchHistory().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);
            if (!history.length) {
                section.classList.add('hidden');
                row.innerHTML = '';
                return;
            }
            section.classList.remove('hidden');
            row.innerHTML = history.map(item => {
                const title = escapeHtml(item.title || item.slug || 'Phim');
                const episodeLabel = escapeHtml(item.episodeName || `Tập ${(Number(item.episode) || 0) + 1}`);
                const progress = Math.round((Number(item.progress) || 0) * 100);
                const poster = item.poster || 'https://placehold.co/300x450/12141d/f59e0b?text=RoFlix';
                return `<article class="movie-card-premium" role="button" tabindex="0" onclick="resumeWatchHistory('${String(item.slug).replace(/'/g, '&#39;')}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();resumeWatchHistory('${String(item.slug).replace(/'/g, '&#39;')}')}">
                    <div class="card-poster"><img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://placehold.co/300x450/12141d/f59e0b?text=RoFlix'">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/35"><span class="rounded-full w-12 h-12 flex items-center justify-center bg-amber-500 text-black shadow-xl"><i class="fa-solid fa-play"></i></span></div>
                        <div class="card-progress"><div class="progress-bar" style="width:${progress}%"></div></div>
                    </div>
                    <div class="card-info"><h3 class="card-title">${title}</h3><div class="card-meta"><span>${episodeLabel}</span><span>${progress}%</span></div></div>
                </article>`;
            }).join('');
        }

        async function resumeWatchHistory(slug) {
            if (!getRoFlixCurrentUserId()) {
                if (typeof showToastPro === 'function') showToastPro('info', 'Đăng nhập để xem tiếp', 'Lịch sử xem được lưu riêng cho từng tài khoản.');
                return;
            }
            const item = getWatchHistory().find(h => h.slug === slug);
            if (!item) return;
            try {
                await viewMovieDetail(slug);
                let tries = 0;
                while (!currentEpisodeList.length && tries < 25) {
                    await new Promise(resolve => setTimeout(resolve, 120));
                    tries++;
                }
                if (!currentEpisodeList.length) {
                    showToastPro('warning', 'Chưa có tập', 'Không lấy được danh sách tập để tiếp tục.');
                    return;
                }
                const idx = Math.min(Math.max(0, Number(item.episode) || 0), currentEpisodeList.length - 1);
                playMovieByIndex(idx, {resume: true});
            } catch (e) {
                console.error(e);
                showToastPro('error', 'Lỗi', 'Không thể tiếp tục phim này.');
            }
        }


        // Ghi nhận lần gần nhất khi tab ẩn/đóng. Với iframe cross-origin, RoFlix không thể đọc currentTime;
        // do đó phiên bản này lưu chính xác phim/tập và mốc thời gian lưu, chưa lưu được giây phát bên trong player.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && currentSlug && document.getElementById('view-play-page') && !document.getElementById('view-play-page').classList.contains('hidden-view')) {
                const idx = currentEpisodeList.findIndex(ep => ep && ep.link === (document.getElementById('movie-player') || {}).src);
                const saved = getWatchHistory().find(h => h.slug === currentSlug);
                saveWatchHistory(currentSlug, idx >= 0 ? idx : (saved ? saved.episode : 0), saved ? saved.progress : 0);
            }
        });
        window.addEventListener('pagehide', () => {
            if (!currentSlug) return;
            const saved = getWatchHistory().find(h => h.slug === currentSlug);
            if (saved) saveWatchHistory(currentSlug, saved.episode, saved.progress);
        });
        document.addEventListener('DOMContentLoaded', renderContinueWatching);
        setTimeout(renderContinueWatching, 0);

        // ===== 7. KEYBOARD SHORTCUT =====
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const search = document.getElementById('search-input');
                if (search) search.focus();
            }
            if (e.key === 'Escape') {
                const panel = document.getElementById('notification-panel');
                if (panel) panel.classList.remove('open');
            }
        });

        // ===== 8. INIT - KIỂM TRA PHIM MỚI =====
        setInterval(checkNewMovies, 600000);
        setTimeout(checkNewMovies, 45000);
