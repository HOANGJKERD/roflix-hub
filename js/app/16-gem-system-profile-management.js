// ============================================================
// GEM SYSTEM - PROFILE MANAGEMENT
// ============================================================
function getProfile() {
    return JSON.parse(localStorage.getItem('roflix-profile')) || {
        name: 'Người dùng', avatar: 'default', bio: 'Chào mừng đến với RoFlix! 🎬',
        banner: 'default', country: 'Việt Nam', favoriteMovie: '', birthday: '',
        joinDate: new Date().toISOString().split('T')[0]
    };
}
function saveProfile(data) { localStorage.setItem('roflix-profile', JSON.stringify(data)); }
function getLevelData() { return JSON.parse(localStorage.getItem('roflix-level')) || { level: 1, exp: 0 }; }
function saveLevelData(data) { localStorage.setItem('roflix-level', JSON.stringify(data)); }
function getGem() { return Math.max(0, parseInt(localStorage.getItem('roflix-gem'), 10) || 0); }
function setGem(value) { localStorage.setItem('roflix-gem', String(Math.max(0, Math.trunc(Number(value) || 0)))); }

async function syncGemToCloud(delta) {
    const sb = window.rfSupabase;
    if (!sb || !delta) return null;
    try {
        const { data, error } = await sb.rpc('roflix_user_adjust_gem', { p_delta: Number(delta) });
        if (error) throw error;
        const balance = Number(data?.gems);
        if (!Number.isFinite(balance)) throw new Error('Invalid cloud Gem balance');
        setGem(balance);
        return balance;
    } catch (e) {
        console.debug('[RoFlix Gem] cloud sync failed:', e?.message || e);
        return null;
    }
}

function addGem(amount, showEffect = true) {
    const delta = Math.trunc(Number(amount) || 0);
    const next = Math.max(0, getGem() + delta);
    setGem(next);
    const stats = getStats();
    if (delta > 0) stats.totalGemEarned = (stats.totalGemEarned || 0) + delta;
    saveStats(stats);
    if (delta !== 0) {
        syncGemToCloud(delta).then(balance => {
            if (balance !== null) {
                setGem(balance);
                try { updateProfileUI(); } catch (_) {}
            }
        });
    }
    if (showEffect && delta > 0) {
        try { showGemFly(delta); } catch (_) {}
        try { showToast('success', `+${delta} RoGem`, `Bạn đã nhận được ${delta} 💎`); } catch (_) {}
    }
    try { updateProfileUI(); } catch (_) {}
    return next;
}

function getStats() {
    return JSON.parse(localStorage.getItem('roflix-stats')) || {
        totalEpisodesWatched: 0, totalMoviesWatched: 0, totalFavorites: 0,
        totalComments: 0, totalGemEarned: 0, mostWatchedMovie: null,
        favoriteGenre: null, watchTime: 0
    };
}
function saveStats(data) { localStorage.setItem('roflix-stats', JSON.stringify(data)); }

// ============================================================
function rfRemoveOldRewardUI() {
    const selectors = [
        '[data-tab="achievements"]', '.tab-btn[data-tab="achievements"]',
        '[data-tab="leaderboard"]', '.tab-btn[data-tab="leaderboard"]',
        '#tab-achievements', '#achievements-section', '#profile-achievements',
        '#achievement-list', '#achievements-list', '#stat-achievements',
        '#daily-quest', '#daily-quests', '#daily-reward', '#login-reward',
        '#login-rewards', '#gem-reward', '#gem-rewards'
    ];
    selectors.forEach(selector => document.querySelectorAll(selector).forEach(el => {
        const box = el.closest('.tab-content, section.profile-card, .profile-card');
        (box && box !== document.body ? box : el).remove();
    }));

    document.querySelectorAll('h1,h2,h3,h4,h5,strong,span,p,button,div').forEach(el => {
        if (el.children.length > 0) return;
        const text = String(el.textContent || '').trim().toLowerCase();
        if (!['phần thưởng đăng nhập','phần thưởng kiếm gem','thành tựu','nhiệm vụ hằng ngày','nhiệm vụ hàng ngày'].includes(text)) return;
        const box = el.closest('.tab-content, .profile-card');
        if (box && box.id !== 'profile-page' && box.id !== 'profile-view') box.remove();
        else el.remove();
    });
}

setInterval(rfRemoveOldRewardUI, 1500);
