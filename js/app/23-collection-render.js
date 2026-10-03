// ============================================================
// ROFLIX GACHA COLLECTION ALBUM 3.1
// ============================================================
function rfEscapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;');
}

function rfGachaImageFallback(card) {
    const source = String(card?.image || '').trim();
    if (!source) return 'https://placehold.co/400x600/171a25/9ca3af?text=No+Image';
    return `https://images.weserv.nl/?url=${encodeURIComponent(source)}`;
}

function rfPreloadGachaImages(pool) {
    if (!Array.isArray(pool)) return;
    pool.slice(0, 25).forEach(card => {
        if (!card?.image) return;
        const img = new Image();
        img.src = card.image;
    });
}

function renderCollection() {
    // Gacha is optional. Never let its renderer break the account/profile page.
    if (typeof rfGachaInjectStyles === 'function') rfGachaInjectStyles();

    const cards = typeof getCards === 'function' ? getCards() : [];
    const pool = typeof GACHA_POOL !== 'undefined' && Array.isArray(GACHA_POOL) ? GACHA_POOL : [];
    const totalCards = pool.length;

    const countEl = document.getElementById('collection-count');
    const totalEl = document.getElementById('collection-total');
    const percentEl = document.getElementById('collection-percent');

    const uniqueOwned = new Set(cards.map(c => c.baseId || c.id));
    const ownedUniqueCount = pool.filter(c => uniqueOwned.has(c.id)).length;
    const percent = totalCards ? Math.round((ownedUniqueCount / totalCards) * 100) : 0;
    if (countEl) countEl.textContent = ownedUniqueCount;
    if (totalEl) totalEl.textContent = totalCards;
    if (percentEl) percentEl.textContent = percent + '%';

    const grid = document.getElementById('card-grid');
    if (!grid) return;

    const oldFilter = grid.dataset.rarityFilter || 'all';
    grid.className = 'card-grid rf-gacha-album';

    if (!pool.length) {
        grid.innerHTML = '<div class="rf-gacha-loading">🎴 Đang tải ảnh nhân vật...</div>';
        return;
    }

    const visiblePool = oldFilter === 'all' ? pool : pool.filter(c => c.rarity === oldFilter);
    if (!visiblePool.length) {
        grid.innerHTML = '<div class="rf-gacha-empty">Chưa có nhân vật trong bộ lọc này.</div>';
        return;
    }

    grid.innerHTML = visiblePool.map(card => {
        const owned = cards.filter(c => (c.baseId || c.id) === card.id).length;
        const locked = !owned;
        const safeName = rfEscapeAttr(card.name || 'Unknown');
        const image = rfEscapeAttr(card.image || '');
        const fallback = rfEscapeAttr(rfGachaImageFallback(card));
        const safeCardJson = JSON.stringify(card)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, '&#39;')
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e');
        const rarityColor = typeof RARITY_COLORS !== 'undefined' ? (RARITY_COLORS[card.rarity] || '#6b7280') : '#6b7280';
        const rarityName = typeof RARITY_NAMES !== 'undefined' ? (RARITY_NAMES[card.rarity] || '★ Common') : '★ Common';
        return `
            <button type="button" class="rf-gacha-card ${locked ? 'is-locked' : ''}" onclick='rfOpenGachaDetail(${safeCardJson},${owned})' title="${safeName}">
                <img src="${image}" alt="${safeName}" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">
                <span class="rf-gacha-rarity" style="border:1px solid ${rarityColor}66">${rarityName}</span>
                ${locked ? '<span class="rf-gacha-lock">🔒</span>' : `<span class="rf-gacha-owned">×${owned}</span>`}
                <span class="rf-gacha-info"><span class="rf-gacha-name">${safeName}</span><span class="rf-gacha-origin">${rfEscapeAttr(card.movie || 'Anime / Manga')}</span></span>
            </button>`;
    }).join('');
}

function rfRenderGachaAlbum() {
    const wrap = document.getElementById('tab-collection');
    if (!wrap) return;
    const shell = wrap.querySelector('.gacha-container');
    if (!shell) return;

    if (!shell.querySelector('.rf-gacha-head')) {
        shell.classList.add('rf-gacha-shell');
        shell.insertAdjacentHTML('afterbegin', `
            <div class="rf-gacha-head">
                <div><h3>🎴 RoFlix Character Collection</h3><div class="rf-gacha-sub">Mở khóa nhân vật và hoàn thành album của bạn.</div></div>
            </div>
            <div class="rf-gacha-filter" id="rf-gacha-rarity-filter">
                <button class="active" data-rarity="all">Tất cả</button>
                <button data-rarity="common">★</button>
                <button data-rarity="rare">★★</button>
                <button data-rarity="super-rare">★★★</button>
                <button data-rarity="epic">★★★★</button>
                <button data-rarity="legendary">★★★★★</button>
                <button data-rarity="secret">🌈</button>
            </div>`);
        const filter = shell.querySelector('#rf-gacha-rarity-filter');
        filter?.addEventListener('click', e => {
            const btn = e.target.closest('button[data-rarity]');
            if (!btn) return;
            filter.querySelectorAll('button').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
            const grid = document.getElementById('card-grid');
            if (grid) grid.dataset.rarityFilter = btn.dataset.rarity;
            renderCollection();
        });
    }

    const stats = document.getElementById('collection-stats');
    if (stats) stats.innerHTML = `
        <div style="color:var(--ro-text-secondary)">Đã mở khóa: <strong id="collection-count">0</strong> / <strong id="collection-total">0</strong> · <span id="collection-percent">0%</span></div>
        <div class="rf-gacha-progress"><span id="rf-gacha-progress-bar" style="width:0%"></span></div>`;

    const grid = document.getElementById('card-grid');
    if (grid && !grid.dataset.rarityFilter) grid.dataset.rarityFilter = 'all';

    renderCollection();

    // The old version rendered before Jikan finished loading, leaving the album with only fallback cards.
    // Load the real character pool when the profile opens, then repaint the album with real portrait images.
    if (typeof loadJikanGachaPool === 'function') {
        loadJikanGachaPool().then(pool => {
            rfPreloadGachaImages(pool);
            renderCollection();
            const pct = Number(document.getElementById('collection-percent')?.textContent?.replace('%','') || 0);
            const bar = document.getElementById('rf-gacha-progress-bar');
            if (bar) bar.style.width = pct + '%';
        }).catch(error => {
            console.warn('[RoFlix Gacha] Character image pool failed:', error);
            renderCollection();
        });
    }

    const pct = Number(document.getElementById('collection-percent')?.textContent?.replace('%','') || 0);
    const bar = document.getElementById('rf-gacha-progress-bar');
    if (bar) bar.style.width = pct + '%';
}

const _rfOriginalRenderCollection = renderCollection;
