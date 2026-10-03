// ============================================================
        // ACHIEVEMENTS SYSTEM
        // ============================================================
        const ACHIEVEMENTS = [
            { id: 'first_watch', name: '🎬 Khởi đầu', desc: 'Xem tập phim đầu tiên', icon: '🎬', condition: (stats) => stats.totalEpisodesWatched >= 1 },
            { id: 'watch_10', name: '🎖️ Tân binh', desc: 'Xem 10 tập phim', icon: '🎖️', condition: (stats) => stats.totalEpisodesWatched >= 10 },
            { id: 'watch_50', name: '🏅 Cinephile', desc: 'Xem 50 tập phim', icon: '🏅', condition: (stats) => stats.totalEpisodesWatched >= 50 },
            { id: 'watch_100', name: '🏆 Movie Master', desc: 'Xem 100 tập phim', icon: '🏆', condition: (stats) => stats.totalEpisodesWatched >= 100 },
            { id: 'favorite_5', name: '❤️ Người yêu phim', desc: 'Yêu thích 5 phim', icon: '❤️', condition: (stats) => stats.totalFavorites >= 5 },
            { id: 'favorite_10', name: '💕 Collector', desc: 'Yêu thích 10 phim', icon: '💕', condition: (stats) => stats.totalFavorites >= 10 },
            { id: 'comment_10', name: '💬 Người nói nhiều', desc: 'Viết 10 bình luận', icon: '💬', condition: (stats) => stats.totalComments >= 10 },
            { id: 'gem_100', name: '💰 Nhà sưu tập', desc: 'Sở hữu 100 RoGem', icon: '💰', condition: (stats) => stats.totalGemEarned >= 100 },
            { id: 'gem_500', name: '💎 Đại gia', desc: 'Sở hữu 500 RoGem', icon: '💎', condition: (stats) => stats.totalGemEarned >= 500 },
        ];

        function checkAchievements(stats) {
            const unlocked = getAchievements();
            const newUnlocked = [];
            ACHIEVEMENTS.forEach(ach => {
                if (!unlocked.find(u => u.id === ach.id) && ach.condition(stats)) {
                    unlocked.push({ id: ach.id, unlockedAt: new Date().toISOString() });
                    newUnlocked.push(ach);
                    showToast('success', `🏆 Thành tựu mới!`, `${ach.icon} ${ach.name}`);
                    addGem(10, true);
                }
            });
            if (newUnlocked.length > 0) {
                saveAchievements(unlocked);
            }
            return newUnlocked;
        }
