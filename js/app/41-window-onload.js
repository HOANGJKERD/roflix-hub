// ============================================================
        // WINDOW ONLOAD
        // ============================================================
        window.onload = function () {
            if (localStorage.getItem('roflix-theme') === 'light') {
                document.body.classList.add('light-theme');
                document.documentElement.classList.remove('dark');
                updateThemeIcon(true);
            }

            bindRandomChips();
            updateSourceUi();

            // Critical path: danh sách phim trước
            renderMoviesFromAPI(1);

            // Secondary: hero sau 1 frame
            requestAnimationFrame(() => {
                initHeroSlider();
            });

            // Tertiary: boards + đề xuất khi rảnh
            const loadSecondary = () => {
                loadWeeklyPicks();
                renderBottomBoards();
                renderRecoPreferences();
                refreshRecommendations(false);
            };
            if ('requestIdleCallback' in window) {
                requestIdleCallback(loadSecondary, { timeout: 2500 });
            } else {
                setTimeout(loadSecondary, 500);
            }

            checkUserAuthStatus();
            checkDailyLogin();
            
            if (!localStorage.getItem('roflix-profile')) {
                const profile = {
                    name: 'Người dùng',
                    avatar: 'default',
                    bio: 'Chào mừng đến với RoFlix! 🎬',
                    banner: 'default',
                    country: 'Việt Nam',
                    favoriteMovie: '',
                    birthday: '',
                    joinDate: new Date().toISOString().split('T')[0]
                };
                localStorage.setItem('roflix-profile', JSON.stringify(profile));
            }
            
            if (!localStorage.getItem('roflix-level')) {
                localStorage.setItem('roflix-level', JSON.stringify({ level: 1, exp: 0 }));
            }
            
            if (!localStorage.getItem('roflix-gem')) {
                localStorage.setItem('roflix-gem', '0');
            }
            
            if (!localStorage.getItem('roflix-stats')) {
                localStorage.setItem('roflix-stats', JSON.stringify({
                    totalEpisodesWatched: 0,
                    totalMoviesWatched: 0,
                    totalFavorites: 0,
                    totalComments: 0,
                    totalGemEarned: 0,
                    mostWatchedMovie: null,
                    favoriteGenre: null,
                    watchTime: 0
                }));
            }
            
            if (!localStorage.getItem('roflix-achievements')) {
                localStorage.setItem('roflix-achievements', JSON.stringify([]));
            }
            
            if (!localStorage.getItem('roflix-cards')) {
                localStorage.setItem('roflix-cards', JSON.stringify([]));
            }
            
            renderLeaderboard();
            
            // Badge thông báo + panel
            try {
                if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
                if (typeof renderNotifications === 'function') renderNotifications();
            } catch (_) {}
            
            console.log('🔥 RoFlix Pro - Đã nâng cấp thành công!');
            console.log('📦 Nguồn dữ liệu: KKPhim (chính) + VSMOV (phụ)');
            console.log('✨ Tính năng: Lọc quốc gia, Xem tiếp, Thông báo, Phím tắt');
        };
