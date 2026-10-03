// ============================================================
// PROFILE UI RENDER
// ============================================================
function removeLeaderboardFromProfile() {
    document.querySelectorAll('.tab-btn[data-tab="leaderboard"], [data-tab="leaderboard"]').forEach(el => el.remove());
    const leaderboardTab = document.getElementById('tab-leaderboard');
    if (leaderboardTab) leaderboardTab.remove();
    const leaderboardList = document.getElementById('leaderboard-list');
    if (leaderboardList) {
        const parentTab = leaderboardList.closest('.tab-content');
        if (parentTab) parentTab.remove();
        else leaderboardList.remove();
    }
}

function renderProfile() {
    removeLeaderboardFromProfile();

    const profile = getProfile();
    const levelData = getLevelData();
    const gems = getGem();
    const stats = getStats();
    const cards = getCards();
    const achievements = getAchievements();
    const favorites = getFavorites();
    
    document.getElementById('profile-display-name').textContent = profile.name || 'Người dùng';
    document.getElementById('profile-level-badge').textContent = `Lv.${levelData.level}`;
    document.getElementById('profile-bio').textContent = profile.bio || 'Chưa có giới thiệu';
    document.getElementById('profile-join-date').textContent = profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('vi-VN') : '01/01/2026';
    document.getElementById('profile-gem').textContent = gems.toLocaleString();
    
    const expToNext = getExpToNextLevel(levelData.level);
    const expPercent = Math.min((levelData.exp / expToNext) * 100, 100);
    document.getElementById('profile-exp-bar').style.width = expPercent + '%';
    document.getElementById('profile-exp-text').textContent = `${levelData.exp} / ${expToNext} EXP`;
    
    document.getElementById('stat-movies').textContent = stats.totalMoviesWatched || 0;
    document.getElementById('stat-episodes').textContent = stats.totalEpisodesWatched || 0;
    document.getElementById('stat-gem').textContent = gems.toLocaleString();
    document.getElementById('stat-favorites').textContent = favorites.length || 0;
    document.getElementById('stat-comments').textContent = stats.totalComments || 0;
    document.getElementById('stat-achievements').textContent = achievements.length || 0;
    
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) {
        if (profile.avatar && profile.avatar !== 'default') avatarImg.src = profile.avatar;
        else avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f59e0b&color=000&size=120`;
    }
    
    const bannerImg = document.getElementById('banner-img');
    const bannerPlaceholder = document.getElementById('banner-placeholder');
    if (bannerImg && bannerPlaceholder) {
        if (profile.banner && profile.banner !== 'default' && profile.banner.startsWith('http')) {
            bannerImg.src = profile.banner;
            bannerImg.style.display = 'block';
            bannerPlaceholder.style.display = 'none';
        } else {
            bannerImg.style.display = 'none';
            bannerPlaceholder.style.display = 'flex';
        }
    }
    
    document.getElementById('profile-movie-count').textContent = stats.totalMoviesWatched || 0;
    document.getElementById('gacha-gem-count').textContent = gems;
    
    updateDailyQuest();
    if (typeof rfRenderGachaAlbum === 'function') rfRenderGachaAlbum();
    renderAchievements();
    renderFavoritesTab();
    renderHistoryTab();
}

function updateProfileUI() {
    renderProfile();
}
