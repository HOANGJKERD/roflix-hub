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
function getCards() { return JSON.parse(localStorage.getItem('roflix-cards')) || []; }
function saveCards(data) { localStorage.setItem('roflix-cards', JSON.stringify(data)); }

// ============================================================
// GACHA SELL-BACK
// ============================================================
const RF_CARD_SELL_VALUES = { common: 10, rare: 20, 'super-rare': 40, epic: 80, legendary: 150, secret: 300 };
function rfCardSellValue(card) { return RF_CARD_SELL_VALUES[card?.rarity] || 10; }
function rfSellGachaCard(baseId) {
    const cards = getCards();
    const index = cards.findIndex(c => String(c.baseId || c.id) === String(baseId));
    if (index < 0) {
        try { showToast('error', 'Không thể bán', 'Bạn không sở hữu thẻ này.'); } catch (_) {}
        return false;
    }
    const card = cards[index];
    const reward = rfCardSellValue(card);
    cards.splice(index, 1);
    saveCards(cards);
    addGem(reward, true);
    try { showToast('success', 'Đã bán thẻ', `${card.name || 'Thẻ Gacha'} → +${reward} 💎`); } catch (_) {}
    try { renderCollection(); } catch (_) {}
    try { updateProfileUI(); } catch (_) {}
    return true;
}

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

function rfInstallSellStyle() {
    if (document.getElementById('rf-card-sell-style')) return;
    const style = document.createElement('style');
    style.id = 'rf-card-sell-style';
    style.textContent = `.rf-card-sell{position:absolute;z-index:20;left:7px;right:7px;bottom:7px;padding:6px 7px;border-radius:9px;background:rgba(0,0,0,.82);border:1px solid rgba(251,191,36,.4);color:#fbbf24;font-size:9px;font-weight:900;text-align:center;cursor:pointer;backdrop-filter:blur(7px)}.rf-card-sell:hover{background:#fbbf24;color:#111827}`;
    document.head.appendChild(style);
}
function rfInstallCardSellControls() {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
    grid.querySelectorAll('.rf-gacha-card:not(.is-locked)').forEach(cardEl => {
        if (cardEl.querySelector('.rf-card-sell')) return;
        const baseId = cardEl.dataset.gachaId;
        if (!baseId) return;
        const owned = Number(cardEl.dataset.owned || 0);
        if (owned < 1) return;
        const card = getCards().find(c => String(c.baseId || c.id) === String(baseId));
        if (!card) return;
        const sell = document.createElement('span');
        sell.className = 'rf-card-sell';
        sell.setAttribute('role', 'button');
        sell.setAttribute('tabindex', '0');
        sell.textContent = `Bán +${rfCardSellValue(card)} 💎`;
        const act = e => { e.preventDefault(); e.stopPropagation(); rfSellGachaCard(baseId); };
        sell.addEventListener('click', act);
        sell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') act(e); });
        cardEl.appendChild(sell);
    });
}

setInterval(() => {
    rfRemoveOldRewardUI();
    rfInstallSellStyle();
    rfInstallCardSellControls();
}, 1500);
