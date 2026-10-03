// ============================================================
// ROFLIX GACHA COLLECTION ALBUM 3.2
// ============================================================
function rfEscapeAttr(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');
}
function rfGachaImageFallback(card) {
    const source = String(card?.image || '').trim();
    return source ? `https://images.weserv.nl/?url=${encodeURIComponent(source)}` : 'https://placehold.co/400x600/171a25/9ca3af?text=No+Image';
}
function rfPreloadGachaImages(pool) {
    if (!Array.isArray(pool)) return;
    pool.slice(0,50).forEach(card => { if (card?.image) { const img = new Image(); img.src = card.image; } });
}

function renderCollection() {
    if (typeof rfGachaInjectStyles === 'function') rfGachaInjectStyles();
    const cards = typeof getCards === 'function' ? getCards() : [];
    const pool = typeof GACHA_POOL !== 'undefined' && Array.isArray(GACHA_POOL) ? GACHA_POOL : [];
    const countEl = document.getElementById('collection-count');
    const totalEl = document.getElementById('collection-total');
    const percentEl = document.getElementById('collection-percent');
    const uniqueOwned = new Set(cards.map(c => String(c.baseId || c.id)));
    const ownedUniqueCount = pool.filter(c => uniqueOwned.has(String(c.id))).length;
    const percent = pool.length ? Math.round(ownedUniqueCount / pool.length * 100) : 0;
    if (countEl) countEl.textContent = ownedUniqueCount;
    if (totalEl) totalEl.textContent = pool.length;
    if (percentEl) percentEl.textContent = percent + '%';

    const grid = document.getElementById('card-grid');
    if (!grid) return;
    grid.className = 'card-grid rf-gacha-album';
    const filter = grid.dataset.rarityFilter || 'all';
    if (!pool.length) { grid.innerHTML = '<div class="rf-gacha-loading">🎴 Đang tải ảnh nhân vật...</div>'; return; }
    const visiblePool = filter === 'all' ? pool : pool.filter(c => c.rarity === filter);
    if (!visiblePool.length) { grid.innerHTML = '<div class="rf-gacha-empty">Chưa có nhân vật trong bộ lọc này.</div>'; return; }

    grid.innerHTML = visiblePool.map(card => {
        const baseId = String(card.id);
        const owned = cards.filter(c => String(c.baseId || c.id) === baseId).length;
        const locked = owned < 1;
        const name = rfEscapeAttr(card.name || 'Unknown');
        const image = rfEscapeAttr(card.image || '');
        const fallback = rfEscapeAttr(rfGachaImageFallback(card));
        const rarityColor = typeof RARITY_COLORS !== 'undefined' ? (RARITY_COLORS[card.rarity] || '#6b7280') : '#6b7280';
        const rarityName = typeof RARITY_NAMES !== 'undefined' ? (RARITY_NAMES[card.rarity] || '★ Common') : '★ Common';
        return `<div class="rf-gacha-card ${locked ? 'is-locked' : ''}" data-gacha-id="${rfEscapeAttr(baseId)}" data-owned="${owned}" title="${name}">
            <button type="button" class="rf-gacha-card-open" aria-label="Xem ${name}" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;padding:0;cursor:pointer;z-index:6" onclick='rfOpenGachaDetail(${JSON.stringify(card).replace(/'/g,'&#39;')},${owned})'>
                <img src="${image}" alt="${name}" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">
                <span class="rf-gacha-rarity" style="border:1px solid ${rarityColor}66">${rarityName}</span>
                ${locked ? '<span class="rf-gacha-lock">🔒</span>' : `<span class="rf-gacha-owned">×${owned}</span>`}
                <span class="rf-gacha-info"><span class="rf-gacha-name">${name}</span><span class="rf-gacha-origin">${rfEscapeAttr(card.movie || 'Anime / Manga')}</span></span>
            </button>
        </div>`;
    }).join('');

    if (typeof rfInstallSellStyle === 'function') rfInstallSellStyle();
    if (typeof rfInstallCardSellControls === 'function') rfInstallCardSellControls();
    const bar = document.getElementById('rf-gacha-progress-bar');
    if (bar) bar.style.width = percent + '%';
}

function rfRenderGachaAlbum() {
    const wrap = document.getElementById('tab-collection');
    if (!wrap) return;
    const shell = wrap.querySelector('.gacha-container');
    if (!shell) return;
    if (!shell.querySelector('.rf-gacha-head')) {
        shell.classList.add('rf-gacha-shell');
        shell.insertAdjacentHTML('afterbegin', `<div class="rf-gacha-head"><div><h3>🎴 RoFlix Character Collection</h3><div class="rf-gacha-sub">Mở khóa nhân vật và quản lý bộ sưu tập.</div></div></div>
        <div class="rf-gacha-filter" id="rf-gacha-rarity-filter">
            <button class="active" data-rarity="all">Tất cả</button><button data-rarity="common">★</button><button data-rarity="rare">★★</button><button data-rarity="super-rare">★★★</button><button data-rarity="epic">★★★★</button><button data-rarity="legendary">★★★★★</button><button data-rarity="secret">🌈</button>
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
    if (stats) stats.innerHTML = `<div style="color:var(--ro-text-secondary)">Đã mở khóa: <strong id="collection-count">0</strong> / <strong id="collection-total">0</strong> · <span id="collection-percent">0%</span></div><div class="rf-gacha-progress"><span id="rf-gacha-progress-bar" style="width:0%"></span></div>`;
    const grid = document.getElementById('card-grid');
    if (grid && !grid.dataset.rarityFilter) grid.dataset.rarityFilter = 'all';
    renderCollection();
    if (typeof loadJikanGachaPool === 'function') {
        loadJikanGachaPool().then(pool => { rfPreloadGachaImages(pool); renderCollection(); }).catch(error => { console.warn('[RoFlix Gacha] pool failed:', error); renderCollection(); });
    }
}
const _rfOriginalRenderCollection = renderCollection;
