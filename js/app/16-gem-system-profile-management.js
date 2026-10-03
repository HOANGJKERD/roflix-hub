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

function saveProfile(data) { localStorage.setItem('roflix-profile', JSON.stringify(data)); }
function getLevelData() { return JSON.parse(localStorage.getItem('roflix-level')) || { level: 1, exp: 0 }; }
function saveLevelData(data) { localStorage.setItem('roflix-level', JSON.stringify(data)); }
function getGem() { return Math.max(0, parseInt(localStorage.getItem('roflix-gem')) || 0); }
function setGem(value) { localStorage.setItem('roflix-gem', String(Math.max(0, Math.trunc(Number(value) || 0)))); }

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
    try { updateProfileUI(); } catch (_) {}
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
function saveStats(data) { localStorage.setItem('roflix-stats', JSON.stringify(data)); }
function getAchievements() { return JSON.parse(localStorage.getItem('roflix-achievements')) || []; }
function saveAchievements(data) { localStorage.setItem('roflix-achievements', JSON.stringify(data)); }
function getCards() { return JSON.parse(localStorage.getItem('roflix-cards')) || []; }
function saveCards(data) { localStorage.setItem('roflix-cards', JSON.stringify(data)); }
function getDailyQuest() {
    const today = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('roflix-daily'));
    if (saved && saved.date === today) return saved;
    return { date: today, tasks: { watch: { done: false, target: 2, current: 0 }, comment: { done: false, target: 1, current: 0 }, favorite: { done: false, target: 1, current: 0 }, login: { done: false } }, claimed: false };
}
function saveDailyQuest(data) { localStorage.setItem('roflix-daily', JSON.stringify(data)); }

// ============================================================
// 1 RoGem / 15 PHÚT THỜI GIAN XEM THỰC TẾ
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
        if (saved && Number.isFinite(Number(saved.seconds))) return { seconds: Math.max(0, Number(saved.seconds)), lastTick: Number(saved.lastTick) || Date.now() };
    } catch (_) {}
    return { seconds: 0, lastTick: Date.now() };
}
function rfSaveWatchRewardState(state) {
    localStorage.setItem(rfWatchRewardKey(), JSON.stringify({ seconds: Math.max(0, Number(state.seconds) || 0), lastTick: Number(state.lastTick) || Date.now() }));
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

// ============================================================
// PROFILE OVERRIDE: remove old Login Reward / Gem Rewards /
// Achievements and add Sell Card controls without touching HTML.
// ============================================================
const RF_CARD_SELL_VALUES = { common: 10, rare: 20, 'super-rare': 40, epic: 80, legendary: 150, secret: 300 };
function rfCardSellValue(card) { return RF_CARD_SELL_VALUES[card?.rarity] || 10; }
function rfRemoveOldRewardUI() {
    const blocked = ['achievement','achievements','daily','daily-quest','quest','quests','reward','rewards','login-reward','login-rewards','gem-reward','gem-rewards'];
    document.querySelectorAll('[data-tab]').forEach(el => {
        const tab = String(el.dataset.tab || '').toLowerCase();
        if (blocked.some(k => tab.includes(k))) el.remove();
    });
    document.querySelectorAll('[id]').forEach(el => {
        const id = String(el.id || '').toLowerCase();
        if (/(achievement|daily[-_]?quest|login[-_]?reward|gem[-_]?reward)/.test(id)) {
            const box = el.closest('.tab-content, section, .profile-card');
            (box || el).remove();
        }
    });
    document.querySelectorAll('h1,h2,h3,h4,h5,strong,span,p,button').forEach(el => {
        const text = String(el.textContent || '').trim().toLowerCase();
        if (['phần thưởng đăng nhập','phần thưởng kiếm gem','thành tựu','nhiệm vụ hằng ngày','nhiệm vụ hàng ngày'].includes(text)) {
            const box = el.closest('.tab-content, section, .profile-card, .glass-premium');
            (box || el).remove();
        }
    });
    const stat = document.getElementById('stat-achievements');
    if (stat) {
        const box = stat.closest('.stat-card, .profile-stat, [class*="stat"]');
        (box || stat).remove();
    }
}
function rfSellGachaCard(baseId) {
    const cards = getCards();
    const index = cards.findIndex(c => (c.baseId || c.id) === baseId);
    if (index < 0) return showToast('error','Không thể bán','Bạn không sở hữu thẻ này.');
    const card = cards[index];
    const reward = rfCardSellValue(card);
    cards.splice(index, 1);
    saveCards(cards);
    addGem(reward, true);
    showToast('success','Đã bán thẻ',`${card.name || 'Thẻ Gacha'} → +${reward} 💎`);
}
function rfInstallCardSellControls() {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
    const pool = typeof GACHA_POOL !== 'undefined' && Array.isArray(GACHA_POOL) ? GACHA_POOL : [];
    grid.querySelectorAll('.rf-gacha-card').forEach(cardEl => {
        if (cardEl.querySelector('.rf-card-sell') || cardEl.classList.contains('is-locked')) return;
        const name = cardEl.querySelector('.rf-gacha-name')?.textContent?.trim();
        const poolCard = pool.find(c => c.name === name);
        if (!poolCard) return;
        const sell = document.createElement('span');
        sell.className = 'rf-card-sell';
        sell.setAttribute('role','button');
        sell.setAttribute('tabindex','0');
        sell.textContent = `Bán +${rfCardSellValue(poolCard)} 💎`;
        sell.title = `Bán 1 thẻ ${poolCard.name}`;
        const act = e => { e.preventDefault(); e.stopPropagation(); rfSellGachaCard(poolCard.id); renderProfile(); };
        sell.addEventListener('click', act);
        sell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') act(e); });
        cardEl.appendChild(sell);
    });
}
function rfInstallSellStyle() {
    if (document.getElementById('rf-card-sell-style')) return;
    const style = document.createElement('style');
    style.id = 'rf-card-sell-style';
    style.textContent = `.rf-card-sell{position:absolute;z-index:20;left:7px;right:7px;bottom:7px;padding:6px 7px;border-radius:9px;background:rgba(0,0,0,.78);border:1px solid rgba(251,191,36,.35);color:#fbbf24;font-size:9px;font-weight:900;text-align:center;cursor:pointer;backdrop-filter:blur(7px)}.rf-card-sell:hover{background:#fbbf24;color:#111827}`;
    document.head.appendChild(style);
}
function rfHookProfileRenderer() {
    if (typeof renderProfile !== 'function' || renderProfile.__rfRewardPatched) return false;
    const original = renderProfile;
    function patchedRenderProfile() {
        const result = original.apply(this, arguments);
        setTimeout(() => { rfRemoveOldRewardUI(); rfInstallSellStyle(); rfInstallCardSellControls(); }, 50);
        return result;
    }
    patchedRenderProfile.__rfRewardPatched = true;
    window.renderProfile = patchedRenderProfile;
    return true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rfStartWatchGemReward, { once: true });
else rfStartWatchGemReward();

(function rfWaitForProfileRenderer(){
    if (rfHookProfileRenderer()) return;
    let tries = 0;
    const timer = setInterval(() => {
        if (rfHookProfileRenderer() || ++tries > 60) clearInterval(timer);
    }, 250);
})();

setInterval(() => {
    rfRemoveOldRewardUI();
    rfInstallSellStyle();
    rfInstallCardSellControls();
}, 1500);
