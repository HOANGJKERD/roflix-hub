tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#fffbe1',
                            100: '#fff3b8',
                            200: '#ffe685',
                            300: '#ffd247',
                            400: '#ffbc1a',
                            500: '#f59e0b',
                            600: '#d97706',
                            700: '#b45309',
                            800: '#92400e',
                            900: '#78350f',
                        },
                        dark: {
                            main: '#090a0f',
                            card: '#12141d',
                            header: 'rgba(15, 17, 26, 0.92)',
                            border: '#1e2235',
                            hover: '#262b42'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
                    }
                }
            }
        }

// ============================================================
// ROFLIX CLOUD ACCOUNT SYNC
// Profile + Gem + Gacha collection + Watch History
// Uses the app's existing authenticated Supabase client.
// ============================================================
(function rfCloudAccountSyncInstall() {
    if (window.__RF_CLOUD_ACCOUNT_SYNC__) return;
    window.__RF_CLOUD_ACCOUNT_SYNC__ = true;

    let client = null;
    let activeUserId = null;
    let bootedUserId = null;
    let pulling = false;
    let lastPush = 0;
    let sellPatched = false;

    const safeJson = (value, fallback) => {
        try { return JSON.parse(value); } catch (_) { return fallback; }
    };

    function ensureClient() {
        if (client) return client;
        if (window.rfSupabase?.auth) {
            client = window.rfSupabase;
            return client;
        }
        return null;
    }

    async function getUser() {
        const sb = ensureClient();
        if (!sb?.auth?.getUser) return null;
        try {
            const { data } = await sb.auth.getUser();
            return data?.user || null;
        } catch (_) { return null; }
    }

    function setCurrentUser(user) {
        if (!user?.id) return;
        activeUserId = String(user.id);
        try {
            localStorage.setItem('roflix-current-user', JSON.stringify({
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.display_name || user.user_metadata?.name || (user.email || '').split('@')[0]
            }));
        } catch (_) {}
    }

    function getLocalHistory(userId) {
        const key = `roflix-watch-history:user:${userId}`;
        const data = safeJson(localStorage.getItem(key) || '[]', []);
        return Array.isArray(data) ? data : [];
    }

    function saveLocalHistory(userId, items) {
        const key = `roflix-watch-history:user:${userId}`;
        try { localStorage.setItem(key, JSON.stringify(items.slice(-50))); } catch (_) {}
    }

    function mergeHistory(local, cloud) {
        const map = new Map();
        [...(Array.isArray(cloud) ? cloud : []), ...(Array.isArray(local) ? local : [])].forEach(item => {
            if (!item?.slug) return;
            const old = map.get(item.slug);
            if (!old || Number(item.timestamp || 0) >= Number(old.timestamp || 0)) map.set(item.slug, item);
        });
        return [...map.values()].sort((a,b) => Number(a.timestamp||0) - Number(b.timestamp||0)).slice(-50);
    }

    function getLocalCards() {
        const cards = safeJson(localStorage.getItem('roflix-cards') || '[]', []);
        return Array.isArray(cards) ? cards : [];
    }

    function cardKey(card) {
        return String(card?.cloudKey || `${card?.baseId || card?.id || ''}|${card?.obtainedAt || ''}`);
    }

    function mergeCards(local, cloud) {
        const map = new Map();
        [...(Array.isArray(cloud) ? cloud : []), ...(Array.isArray(local) ? local : [])].forEach(card => {
            if (!card?.baseId && !card?.id) return;
            map.set(cardKey(card), card);
        });
        return [...map.values()].sort((a,b) => String(a.obtainedAt||'').localeCompare(String(b.obtainedAt||'')));
    }

    async function pullCloudForUser(userId) {
        if (!client || pulling || !userId) return;
        pulling = true;
        try {
            const [gemRes, profileRes, cardsRes, historyRes] = await Promise.all([
                client.rpc('roflix_user_get_gem'),
                client.rpc('roflix_profile_get'),
                client.rpc('roflix_gacha_get'),
                client.rpc('roflix_watch_history_get')
            ]);

            if (!gemRes.error && Number.isFinite(Number(gemRes.data?.gems))) {
                localStorage.setItem('roflix-gem', String(Math.max(0, Number(gemRes.data.gems))));
            }

            const profile = profileRes.data?.profile_data;
            if (!profileRes.error && profile && typeof profile === 'object' && Object.keys(profile).length) {
                const current = safeJson(localStorage.getItem('roflix-profile') || '{}', {});
                localStorage.setItem('roflix-profile', JSON.stringify({...current, ...profile}));
            }

            if (!cardsRes.error && Array.isArray(cardsRes.data)) {
                const merged = mergeCards(getLocalCards(), cardsRes.data);
                localStorage.setItem('roflix-cards', JSON.stringify(merged));
            }

            if (!historyRes.error && Array.isArray(historyRes.data)) {
                const merged = mergeHistory(getLocalHistory(userId), historyRes.data);
                saveLocalHistory(userId, merged);
            }

            try { if (typeof updateProfileUI === 'function') updateProfileUI(); } catch (_) {}
            try { if (typeof renderCollection === 'function') renderCollection(); } catch (_) {}
            try { if (typeof renderContinueWatching === 'function') renderContinueWatching(); } catch (_) {}
        } catch (error) {
            console.debug('[RoFlix Cloud] pull failed:', error?.message || error);
        } finally {
            pulling = false;
        }
    }

    async function pushCloudForUser(userId) {
        if (!client || !userId || Date.now() - lastPush < 5000) return;
        lastPush = Date.now();
        try {
            const cards = getLocalCards().map(card => ({...card, cloudKey: cardKey(card)}));
            if (cards.length) await client.rpc('roflix_gacha_merge', { p_cards: cards });

            const history = getLocalHistory(userId);
            if (history.length) await client.rpc('roflix_watch_history_sync', { p_items: history });

            const profile = safeJson(localStorage.getItem('roflix-profile') || '{}', {});
            if (profile && typeof profile === 'object' && Object.keys(profile).length) {
                await client.rpc('roflix_profile_sync', { p_profile: profile });
            }
        } catch (error) {
            console.debug('[RoFlix Cloud] push failed:', error?.message || error);
        }
    }

    function patchGachaSell() {
        if (sellPatched || typeof window.rfSellGachaCard !== 'function' || !client) return;
        const original = window.rfSellGachaCard;
        window.rfSellGachaCard = async function(baseId) {
            const cards = getLocalCards();
            const index = cards.findIndex(c => String(c.baseId || c.id) === String(baseId));
            if (index < 0) return original(baseId);
            const card = cards[index];
            const key = cardKey(card);
            try {
                const { data, error } = await client.rpc('roflix_gacha_sell', { p_card_key: key });
                if (error) throw error;
                cards.splice(index, 1);
                localStorage.setItem('roflix-cards', JSON.stringify(cards));
                if (Number.isFinite(Number(data?.gems))) localStorage.setItem('roflix-gem', String(data.gems));
                try { showToast('success', 'Đã bán thẻ', `${card.name || 'Thẻ Gacha'} → +${data?.reward || 0} 💎`); } catch (_) {}
                try { renderCollection(); } catch (_) {}
                try { updateProfileUI(); } catch (_) {}
                return true;
            } catch (error) {
                console.debug('[RoFlix Cloud] secure sell failed, using local fallback:', error?.message || error);
                return original(baseId);
            }
        };
        sellPatched = true;
    }

    async function boot() {
        const sb = ensureClient();
        if (!sb) return;
        const user = await getUser();
        if (!user?.id) {
            activeUserId = null;
            bootedUserId = null;
            return;
        }
        setCurrentUser(user);
        if (bootedUserId !== user.id) {
            bootedUserId = user.id;
            await pullCloudForUser(user.id);
        }
        patchGachaSell();
        await pushCloudForUser(user.id);
    }

    setInterval(boot, 8000);
    setTimeout(boot, 1500);

    const authHook = setInterval(() => {
        const sb = ensureClient();
        if (!sb?.auth?.onAuthStateChange || window.__RF_CLOUD_AUTH_HOOK__) return;
        window.__RF_CLOUD_AUTH_HOOK__ = true;
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                activeUserId = null;
                bootedUserId = null;
                return;
            }
            if (session?.user?.id) {
                bootedUserId = null;
                setTimeout(boot, 250);
            }
        });
        clearInterval(authHook);
    }, 500);

    window.rfCloudAccountSync = {
        boot,
        pull: () => activeUserId && pullCloudForUser(activeUserId),
        push: () => activeUserId && pushCloudForUser(activeUserId)
    };
})();
