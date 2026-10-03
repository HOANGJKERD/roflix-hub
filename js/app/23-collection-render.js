// ============================================================
// ROFLIX GACHA COLLECTION ALBUM 3.1
// ============================================================
function renderCollection() {
    rfGachaInjectStyles?.();
    const cards = getCards();
    const pool = Array.isArray(GACHA_POOL) ? GACHA_POOL : [];
    const totalCards = pool.length;

    const uniqueOwned = new Set(cards.map(c => c.baseId || c.id));
    const ownedUniqueCount = pool.filter(c => uniqueOwned.has(c.id)).length;
    const percent = totalCards ? Math.round((ownedUniqueCount / totalCards) * 100) : 0;

    const countEl = document.getElementById('collection-count');
    const totalEl = document.getElementById('collection-total');
    const percentEl = document.getElementById('collection-percent');
    if (countEl) countEl.textContent = ownedUniqueCount;
    if (totalEl) totalEl.textContent = totalCards;
    if (percentEl) percentEl.textContent = percent + '%';

    const grid = document.getElementById('card-grid');
    if (!grid) return;

    const oldFilter = grid.dataset.rarityFilter || 'all';
    grid.className = 'card-grid rf-gacha-album';

    const visiblePool = oldFilter === 'all' ? pool : pool.filter(c => c.rarity === oldFilter);
    if (!visiblePool.length) {
        grid.innerHTML = '<div class="rf-gacha-empty">Chưa có nhân vật trong bộ lọc này.</div>';
        return;
    }

    grid.innerHTML = visiblePool.map(card => {
        const owned = cards.filter(c => (c.baseId || c.id) === card.id).length;
        const locked = !owned;
        const safeName = String(card.name || 'Unknown').replace(/"/g, '&quot;');
        return `
            <button type="button" class="rf-gacha-card ${locked ? 'is-locked' : ''}" onclick='rfOpenGachaDetail(${JSON.stringify(card).replace(/'/g,"&#39;")},${owned})' title="${safeName}">
                <img src="${card.image}" alt="${safeName}" loading="lazy" onerror="this.src='https://placehold.co/400x600/171a25/9ca3af?text=No+Image'">
                <span class="rf-gacha-rarity" style="border:1px solid ${RARITY_COLORS?.[card.rarity] || '#6b7280'}66">${RARITY_NAMES?.[card.rarity] || '★ Common'}</span>
                ${locked ? '<span class="rf-gacha-lock">🔒</span>' : `<span class="rf-gacha-owned">×${owned}</span>`}
                <span class="rf-gacha-info"><span class="rf-gacha-name">${safeName}</span><span class="rf-gacha-origin">${String(card.movie || 'Anime / Manga').replace(/</g,'&lt;')}</span></span>
            </button>`;
    }).join('');
}

function rfRenderGachaAlbum() {
    const wrap = document.getElementById('tab-collection');
    if (!wrap) return;
    const shell = wrap.querySelector('.gacha-container');
    if (shell && !shell.querySelector('.rf-gacha-head')) {
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
            </div>`;
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
    const pct = Number(document.getElementById('collection-percent')?.textContent?.replace('%','') || 0);
    const bar = document.getElementById('rf-gacha-progress-bar');
    if (bar) bar.style.width = pct + '%';
}

const _rfOriginalRenderCollection = renderCollection;
