// ============================================================
// PROFILE UI RENDER
// ============================================================
function removeAchievementsFromProfile() {
    document.querySelectorAll('[data-tab="achievements"], .tab-btn[data-tab="achievements"]').forEach(el => el.remove());
    ['tab-achievements','achievements-section','profile-achievements','achievement-list','achievements-list','stat-achievements'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const box = el.closest('.tab-content, .profile-card');
        (box || el).remove();
    });
}

function renderProfile() {
    removeAchievementsFromProfile();

    const profile = getProfile();
    const levelData = getLevelData();
    const gems = getGem();
    const stats = getStats();
    const favorites = getFavorites();

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('profile-display-name', profile.name || 'Người dùng');
    setText('profile-level-badge', `Lv.${levelData.level}`);
    setText('profile-bio', profile.bio || 'Chưa có giới thiệu');
    setText('profile-join-date', profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('vi-VN') : '01/01/2026');
    setText('profile-gem', gems.toLocaleString());

    const expToNext = getExpToNextLevel(levelData.level);
    const expPercent = Math.min((levelData.exp / expToNext) * 100, 100);
    const expBar = document.getElementById('profile-exp-bar');
    if (expBar) expBar.style.width = expPercent + '%';
    setText('profile-exp-text', `${levelData.exp} / ${expToNext} EXP`);

    setText('stat-movies', stats.totalMoviesWatched || 0);
    setText('stat-episodes', stats.totalEpisodesWatched || 0);
    setText('stat-gem', gems.toLocaleString());
    setText('stat-favorites', favorites.length || 0);
    setText('stat-comments', stats.totalComments || 0);

    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) {
        avatarImg.src = profile.avatar && profile.avatar !== 'default'
            ? profile.avatar
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=f59e0b&color=000&size=120`;
    }

    const bannerImg = document.getElementById('banner-img');
    const bannerPlaceholder = document.getElementById('banner-placeholder');
    if (bannerImg && bannerPlaceholder) {
        if (profile.banner && profile.banner !== 'default' && /^https?:\/\//i.test(profile.banner)) {
            bannerImg.src = profile.banner;
            bannerImg.style.display = 'block';
            bannerPlaceholder.style.display = 'none';
        } else {
            bannerImg.style.display = 'none';
            bannerPlaceholder.style.display = 'flex';
        }
    }

    setText('profile-movie-count', stats.totalMoviesWatched || 0);
    setText('gacha-gem-count', gems);

    // Daily/login reward UI has intentionally been removed. Do not call the old quest renderer.
    if (typeof rfRenderGachaAlbum === 'function') rfRenderGachaAlbum();
    if (typeof renderFavoritesTab === 'function') renderFavoritesTab();
    if (typeof renderHistoryTab === 'function') renderHistoryTab();
}

function updateProfileUI() {
    try { renderProfile(); } catch (error) { console.warn('[RoFlix Profile] render error:', error); }
}
