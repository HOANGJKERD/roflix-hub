// ============================================================
        // GEM SYSTEM - PROFILE MANAGEMENT
        // ============================================================
        function getProfile() {
            return JSON.parse(localStorage.getItem('roflix-profile')) || {
                name: 'Người dùng',
                avatar: 'default',
                bio: 'Chào mừng đến với RoFlix! 🎬',
                banner: 'default',
                country: 'Việt Nam',
                favoriteMovie: '',
                birthday: '',
                joinDate: new Date().toISOString().split('T')[0]
            };
        }

        function saveProfile(data) {
            localStorage.setItem('roflix-profile', JSON.stringify(data));
        }

        function getLevelData() {
            return JSON.parse(localStorage.getItem('roflix-level')) || { level: 1, exp: 0 };
        }

        function saveLevelData(data) {
            localStorage.setItem('roflix-level', JSON.stringify(data));
        }

        function getGem() {
            return Math.max(0, parseInt(localStorage.getItem('roflix-gem')) || 0);
        }

        function setGem(value) {
            localStorage.setItem('roflix-gem', String(Math.max(0, Math.trunc(Number(value) || 0))));
        }

        // Cloud is the source of truth when the user is logged in.
        // localStorage is kept only as a fast UI cache/offline fallback.
        async function syncGemToCloud(delta) {
            const sb = window.rfSupabase;
            if (!sb || !delta) return null;
            try {
                const { data: updated, error } = await sb.rpc('roflix_user_adjust_gem', { p_delta: Number(delta) });
                if (error) throw error;
                const balance = Number(updated?.gems);
                if (!Number.isFinite(balance)) throw new Error('Invalid cloud Gem balance');
                setGem(balance);
                return balance;
            } catch (e) {
                console.debug('[RoFlix Gem] cloud sync failed', e.message);
                return null;
            }
        }

        function addGem(amount, showEffect = true) {
            const current = getGem();
            const newValue = Math.max(0, current + Number(amount || 0));
            setGem(newValue);

            const stats = getStats();
            if (Number(amount) > 0) stats.totalGemEarned = (stats.totalGemEarned || 0) + Number(amount);
            saveStats(stats);

            // Do not let a stale local value overwrite an admin-issued cloud balance.
            syncGemToCloud(Number(amount || 0)).then(cloudBalance => {
                if (cloudBalance !== null) {
                    setGem(cloudBalance);
                    try { updateProfileUI(); } catch (_) {}
                }
            });

            if (showEffect && amount > 0) {
                showGemFly(amount);
                showToast('success', `+${amount} RoGem`, `Bạn đã nhận được ${amount} 💎`);
            }
            updateProfileUI();
            return newValue;
        }

        function getStats() {
            return JSON.parse(localStorage.getItem('roflix-stats')) || {
                totalEpisodesWatched: 0,
                totalMoviesWatched: 0,
                totalFavorites: 0,
                totalComments: 0,
                totalGemEarned: 0,
                mostWatchedMovie: null,
                favoriteGenre: null,
                watchTime: 0
            };
        }

        function saveStats(data) {
            localStorage.setItem('roflix-stats', JSON.stringify(data));
        }

        function getAchievements() {
            return JSON.parse(localStorage.getItem('roflix-achievements')) || [];
        }

        function saveAchievements(data) {
            localStorage.setItem('roflix-achievements', JSON.stringify(data));
        }

        function getCards() {
            return JSON.parse(localStorage.getItem('roflix-cards')) || [];
        }

        function saveCards(data) {
            localStorage.setItem('roflix-cards', JSON.stringify(data));
        }

        function getDailyQuest() {
            const today = new Date().toISOString().split('T')[0];
            const saved = JSON.parse(localStorage.getItem('roflix-daily'));
            if (saved && saved.date === today) return saved;
            return {
                date: today,
                tasks: {
                    watch: { done: false, target: 2, current: 0 },
                    comment: { done: false, target: 1, current: 0 },
                    favorite: { done: false, target: 1, current: 0 },
                    login: { done: false }
                },
                claimed: false
            };
        }

        function saveDailyQuest(data) {
            localStorage.setItem('roflix-daily', JSON.stringify(data));
        }
