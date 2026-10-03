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

// ============================================================
// ROFLIX WATCH-TIME GEM REWARD
// 1 RoGem for every 15 minutes of real viewing time.
// The counter uses elapsed wall-clock time between ticks, so a
// refresh does not reset already accumulated seconds.
// ============================================================
const RF_GEM_WATCH_INTERVAL = 15 * 60;
let rfGemWatchTimer = null;

function rfWatchRewardKey() {
    const userId = window.rfSupabaseCurrentUser?.id || window.currentUser?.id || 'guest';
    return `roflix-watch-gem-timer:${userId}`;
}

function rfGetWatchRewardState() {
    try {
        const saved = JSON.parse(localStorage.getItem(rfWatchRewardKey()) || 'null');
        if (saved && Number.isFinite(Number(saved.seconds))) {
            return { seconds: Math.max(0, Number(saved.seconds)), lastTick: Number(saved.lastTick) || Date.now() };
        }
    } catch (_) {}
    return { seconds: 0, lastTick: Date.now() };
}

function rfSaveWatchRewardState(state) {
    localStorage.setItem(rfWatchRewardKey(), JSON.stringify({
        seconds: Math.max(0, Number(state.seconds) || 0),
        lastTick: Number(state.lastTick) || Date.now()
    }));
}

function rfElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function rfIsActivelyWatching() {
    if (document.hidden) return false;

    const playingVideo = Array.from(document.querySelectorAll('video')).some(v => !v.paused && !v.ended && rfElementVisible(v));
    if (playingVideo) return true;

    // Most RoFlix providers are embedded in cross-origin iframes, so their
    // internal play/pause state cannot be read by the parent page. In that
    // case, count time only while a visible player iframe is on the watch view.
    const visiblePlayer = Array.from(document.querySelectorAll('iframe[src]')).some(frame => {
        if (!rfElementVisible(frame)) return false;
        const src = String(frame.getAttribute('src') || '').toLowerCase();
        return /embed|player|stream|video|movie|watch|vsmov|kkphim/.test(src);
    });
    return visiblePlayer;
}

function rfGrantWatchGem() {
    addGem(1, true);
    const state = rfGetWatchRewardState();
    state.seconds = Math.max(0, state.seconds - RF_GEM_WATCH_INTERVAL);
    state.lastTick = Date.now();
    rfSaveWatchRewardState(state);
}

function rfWatchRewardTick() {
    const state = rfGetWatchRewardState();
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(60, (now - state.lastTick) / 1000));
    state.lastTick = now;

    if (rfIsActivelyWatching()) {
        state.seconds += elapsed;
        while (state.seconds >= RF_GEM_WATCH_INTERVAL) rfGrantWatchGem();
    }

    rfSaveWatchRewardState(state);
}

function rfStartWatchGemReward() {
    if (rfGemWatchTimer) return;
    rfGemWatchTimer = setInterval(rfWatchRewardTick, 1000);
    document.addEventListener('visibilitychange', () => {
        const state = rfGetWatchRewardState();
        state.lastTick = Date.now();
        rfSaveWatchRewardState(state);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rfStartWatchGemReward, { once: true });
} else {
    rfStartWatchGemReward();
}
