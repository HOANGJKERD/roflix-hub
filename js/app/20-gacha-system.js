// ============================================================
// ROFLIX GACHA 3.1
// Jikan character pool + album-style collection
// ============================================================

let GACHA_POOL = [
    { id: 'fallback_1', name: 'Neo', movie: 'The Matrix', rarity: 'common', image: 'https://placehold.co/400x600/252936/ffffff?text=Neo' },
    { id: 'fallback_2', name: 'Trinity', movie: 'The Matrix', rarity: 'rare', image: 'https://placehold.co/400x600/183b2a/ffffff?text=Trinity' },
    { id: 'fallback_3', name: 'Paul Atreides', movie: 'Dune', rarity: 'super-rare', image: 'https://placehold.co/400x600/233b68/ffffff?text=Paul' },
    { id: 'fallback_4', name: 'Chani', movie: 'Dune', rarity: 'epic', image: 'https://placehold.co/400x600/4a2f78/ffffff?text=Chani' },
    { id: 'fallback_5', name: 'Batman', movie: 'DC', rarity: 'legendary', image: 'https://placehold.co/400x600/72500d/ffffff?text=Batman' }
];

const RARITY_WEIGHTS = {
    common: 42,
    rare: 28,
    'super-rare': 16,
    epic: 9,
    legendary: 4,
    secret: 1
};

const RARITY_NAMES = {
    common: '★ Common',
    rare: '★★ Rare',
    'super-rare': '★★★ Super Rare',
    epic: '★★★★ Epic',
    legendary: '★★★★★ Legendary',
    secret: '🌈 Secret'
};

const RARITY_COLORS = {
    common: '#6b7280',
    rare: '#22c55e',
    'super-rare': '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b',
    secret: '#ec4899'
};

let roflixGachaPoolReady = false;
let roflixGachaPoolLoading = null;

function rfGachaInjectStyles() {
    if (document.getElementById('rf-gacha-collection-v31')) return;
    const style = document.createElement('style');
    style.id = 'rf-gacha-collection-v31';
    style.textContent = `
        .rf-gacha-shell{background:radial-gradient(circle at 50% -10%,rgba(124,58,237,.16),transparent 38%),linear-gradient(180deg,#080a12,#0b0d16);border:1px solid rgba(148,163,184,.12);border-radius:24px;padding:18px;margin-bottom:18px;box-shadow:0 20px 70px rgba(0,0,0,.25)}
        .rf-gacha-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}
        .rf-gacha-head h3{margin:0;color:#fff;font-size:1.1rem;font-weight:900;letter-spacing:.04em}
        .rf-gacha-sub{color:#8b95a7;font-size:.75rem;margin-top:4px}
        .rf-gacha-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}
        .rf-gacha-actions .gacha-btn{border:1px solid rgba(245,158,11,.35);border-radius:12px!important;padding:11px 15px!important;font-weight:900!important;background:linear-gradient(135deg,rgba(245,158,11,.18),rgba(124,58,237,.14))!important;color:#fff!important;box-shadow:none!important;transition:.2s!important}
        .rf-gacha-actions .gacha-btn:hover{transform:translateY(-1px);border-color:rgba(245,158,11,.7)}
        .rf-gacha-actions .rf-gacha-10{border-color:rgba(139,92,246,.45)!important;background:linear-gradient(135deg,rgba(139,92,246,.24),rgba(59,130,246,.12))!important}
        .rf-gacha-meta{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;color:#9ca3af;font-size:.75rem;margin-top:12px}
        .rf-gacha-meta b{color:#fbbf24}.rf-gacha-pity{padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
        .rf-gacha-filter{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:16px 0 10px}
        .rf-gacha-filter button{border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.035);color:#9ca3af;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer}
        .rf-gacha-filter button.active{color:#111827;background:#fbbf24;border-color:#fbbf24}
        .rf-gacha-album{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px!important}
        .rf-gacha-card{position:relative;min-width:0;aspect-ratio:2/3;overflow:hidden;border-radius:15px;background:#111522;border:1px solid rgba(255,255,255,.09);cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .2s,border-color .2s,box-shadow .2s}
        .rf-gacha-card:hover{transform:translateY(-4px);border-color:rgba(251,191,36,.5);box-shadow:0 18px 38px rgba(0,0,0,.35)}
        .rf-gacha-card img{width:100%;height:100%;display:block;object-fit:cover;background:#171a25}
        .rf-gacha-card.is-locked img{filter:brightness(.18) saturate(.2);transform:scale(1.02)}
        .rf-gacha-card::after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.94));pointer-events:none}
        .rf-gacha-rarity{position:absolute;z-index:2;top:7px;left:7px;padding:4px 7px;border-radius:8px;background:rgba(0,0,0,.65);backdrop-filter:blur(7px);font-size:9px;font-weight:900;color:#fff}
        .rf-gacha-lock{position:absolute;z-index:3;inset:0;display:flex;align-items:center;justify-content:center;font-size:29px;color:#fff;text-shadow:0 4px 18px #000}
        .rf-gacha-info{position:absolute;z-index:4;left:9px;right:9px;bottom:9px}
        .rf-gacha-name{font-size:12px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rf-gacha-origin{font-size:9px;color:#aeb7c6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rf-gacha-owned{position:absolute;z-index:5;right:7px;top:7px;background:#fbbf24;color:#111827;font-size:9px;font-weight:1000;border-radius:999px;padding:3px 6px;box-shadow:0 3px 12px rgba(0,0,0,.35)}
        .rf-gacha-progress{height:7px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden;margin-top:8px}.rf-gacha-progress>span{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#8b5cf6);border-radius:99px}
        .rf-gacha-loading{grid-column:1/-1;padding:38px;text-align:center;color:#8b95a7}
        .rf-gacha-empty{grid-column:1/-1;padding:35px;text-align:center;color:#8b95a7;border:1px dashed rgba(148,163,184,.15);border-radius:16px}
        .rf-gacha-results{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:12px}
        .rf-gacha-result-card{border-radius:11px;overflow:hidden;background:#10131d;border:1px solid rgba(255,255,255,.1)}
        .rf-gacha-result-card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}.rf-gacha-result-card div{padding:6px;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .rf-gacha-detail{position:fixed;inset:0;z-index:100001;background:rgba(3,5,10,.82);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:18px}.rf-gacha-detail.show{display:flex}
        .rf-gacha-detail-box{width:min(520px,100%);background:#111522;border:1px solid rgba(251,191,36,.22);border-radius:22px;overflow:hidden;box-shadow:0 30px 100px #000}
        .rf-gacha-detail-box img{width:100%;height:min(58vh,520px);object-fit:contain;background:#080a11}.rf-gacha-detail-body{padding:18px}.rf-gacha-detail-body h3{color:#fff;margin:0;font-size:1.25rem}.rf-gacha-detail-body p{color:#9ca3af;font-size:.8rem;margin:5px 0}.rf-gacha-detail-close{margin-top:12px;width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-weight:800;cursor:pointer}
        @media(max-width:900px){.rf-gacha-album{grid-template-columns:repeat(3,minmax(0,1fr))!important}.rf-gacha-results{grid-template-columns:repeat(5,minmax(0,1fr))}}
        @media(max-width:560px){.rf-gacha-album{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.rf-gacha-results{grid-template-columns:repeat(2,minmax(0,1fr))}.rf-gacha-card{border-radius:12px}.rf-gacha-head{align-items:flex-start}.rf-gacha-actions{width:100%}.rf-gacha-actions .gacha-btn{flex:1;min-width:145px}}
    `;
    document.head.appendChild(style);
}

function rfGachaCacheKey(){return 'roflix-jikan-gacha-pool-v31';}

function rfGachaMapRarity(index,total){
    const ratio = total > 1 ? index / (total - 1) : 0;
    if (ratio >= .96) return 'secret';
    if (ratio >= .82) return 'legendary';
    if (ratio >= .64) return 'epic';
    if (ratio >= .42) return 'super-rare';
    if (ratio >= .22) return 'rare';
    return 'common';
}

async function loadJikanGachaPool(force = false){
    if (roflixGachaPoolReady && !force) return GACHA_POOL;
    if (roflixGachaPoolLoading) return roflixGachaPoolLoading;
    rfGachaInjectStyles();

    roflixGachaPoolLoading = (async () => {
        const cacheKey = rfGachaCacheKey();
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (!force && cached?.savedAt && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000 && Array.isArray(cached.pool) && cached.pool.length >= 10) {
                GACHA_POOL = cached.pool;
                roflixGachaPoolReady = true;
                return GACHA_POOL;
            }
        } catch (_) {}

        try {
            const response = await fetch('https://api.jikan.moe/v4/top/characters?limit=25&page=1', { headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`Jikan HTTP ${response.status}`);
            const json = await response.json();
            const data = Array.isArray(json?.data) ? json.data : [];
            const pool = data.map((c, i) => ({
                id: `jikan_${c.mal_id}`,
                malId: c.mal_id,
                name: c.name || `Character ${i + 1}`,
                movie: 'Anime / Manga',
                rarity: rfGachaMapRarity(i, data.length),
                image: c.images?.webp?.image_url || c.images?.jpg?.large_image_url || c.images?.jpg?.image_url || '',
                url: c.url || (c.mal_id ? `https://myanimelist.net/character/${c.mal_id}` : '')
            })).filter(c => c.image);

            if (pool.length >= 10) {
                GACHA_POOL = pool;
                localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), pool }));
            }
        } catch (error) {
            console.warn('[RoFlix Gacha] Jikan unavailable, using fallback pool:', error.message);
        }

        roflixGachaPoolReady = true;
        roflixGachaPoolLoading = null;
        return GACHA_POOL;
    })();

    return roflixGachaPoolLoading;
}

function rollGacha(){
    const total = Object.values(RARITY_WEIGHTS).reduce((a,b)=>a+b,0);
    let roll = Math.random() * total;
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
        roll -= weight;
        if (roll <= 0) {
            const pool = GACHA_POOL.filter(c => c.rarity === rarity);
            if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
        }
    }
    return GACHA_POOL[Math.floor(Math.random() * GACHA_POOL.length)];
}

function rfGachaOwnedCount(baseId){
    return getCards().filter(c => (c.baseId || c.id) === baseId).length;
}

function rfGachaPity(){return Math.max(0, Number(localStorage.getItem('roflix-gacha-pity') || 0));}
function rfSetGachaPity(v){localStorage.setItem('roflix-gacha-pity', String(Math.max(0, Number(v)||0)));}

function rfRollWithPity(){
    let pity = rfGachaPity() + 1;
    let card = rollGacha();
    if (pity >= 20) {
        const high = GACHA_POOL.filter(c => ['epic','legendary','secret'].includes(c.rarity));
        if (high.length) card = high[Math.floor(Math.random()*high.length)];
        pity = 0;
    } else if (['epic','legendary','secret'].includes(card.rarity)) {
        pity = 0;
    }
    rfSetGachaPity(pity);
    return card;
}

function rfCloneCard(card){
    return { ...card, baseId: card.id, obtainedAt: new Date().toISOString() };
}

async function performGacha(){
    await loadJikanGachaPool();
    const cost = 50;
    const gems = getGem();
    if (gems < cost) {
        showToast('error','Không đủ RoGem',`Cần ${cost} 💎 để quay Gacha`);
        return;
    }
    addGem(-cost, false);
    const card = rfCloneCard(rfRollWithPity());
    const cards = getCards();
    cards.push(card);
    saveCards(cards);
    showGachaPull(card);
    updateProfileUI();
}

async function performGacha10(){
    await loadJikanGachaPool();
    const cost = 500;
    const gems = getGem();
    if (gems < cost) {
        showToast('error','Không đủ RoGem',`Cần ${cost} 💎 để quay 10 lần`);
        return;
    }
    addGem(-cost, false);
    const cards = getCards();
    const pulled = [];
    for(let i=0;i<10;i++) pulled.push(rfCloneCard(rfRollWithPity()));
    cards.push(...pulled);
    saveCards(cards);
    showGachaBatch(pulled);
    updateProfileUI();
}

function showGachaPull(card){
    const overlay=document.getElementById('gacha-pull-overlay');
    const pullCard=document.getElementById('gacha-pull-card');
    if(!overlay||!pullCard) return;
    document.getElementById('pull-rarity').textContent=RARITY_NAMES[card.rarity]||'✨ Common';
    document.getElementById('pull-rarity').style.background=RARITY_COLORS[card.rarity]||'#6b7280';
    document.getElementById('pull-rarity').style.color=card.rarity==='legendary'?'#111':'#fff';
    document.getElementById('pull-art').src=card.image;
    document.getElementById('pull-name').textContent=card.name;
    document.getElementById('pull-movie').textContent=`${card.movie || 'Anime / Manga'} · ${rfGachaOwnedCount(card.baseId)} sở hữu`;
    pullCard.classList.remove('show');
    overlay.classList.add('show');
    setTimeout(()=>pullCard.classList.add('show'),100);
}

function showGachaBatch(cards){
    const overlay=document.getElementById('gacha-pull-overlay');
    const pullCard=document.getElementById('gacha-pull-card');
    if(!overlay||!pullCard) return;
    const old = pullCard.innerHTML;
    pullCard.innerHTML = `
        <div class="pull-rarity" style="background:#7c3aed">🎰 10 PULL RESULTS</div>
        <div style="font-size:12px;color:#9ca3af;margin:8px 0 2px">Bạn vừa nhận được 10 nhân vật</div>
        <div class="rf-gacha-results">${cards.map(c=>`<div class="rf-gacha-result-card"><img src="${c.image}" alt="${c.name}"><div>${c.name}</div></div>`).join('')}</div>
        <button class="pull-close-btn" onclick="closeGachaPull()">Tuyệt vời! ✨</button>`;
    overlay.classList.add('show');
    pullCard.classList.add('show');
    pullCard.dataset.batchOld = old;
}

function closeGachaPull(){
    const overlay=document.getElementById('gacha-pull-overlay');
    const pullCard=document.getElementById('gacha-pull-card');
    if(!overlay||!pullCard) return;
    overlay.classList.remove('show');
    pullCard.classList.remove('show');
    if(pullCard.dataset.batchOld){
        pullCard.innerHTML=pullCard.dataset.batchOld;
        delete pullCard.dataset.batchOld;
    }
}

function rfOpenGachaDetail(card, owned){
    let modal=document.getElementById('rf-gacha-detail-modal');
    if(!modal){
        modal=document.createElement('div');
        modal.id='rf-gacha-detail-modal';
        modal.className='rf-gacha-detail';
        document.body.appendChild(modal);
    }
    modal.innerHTML=`<div class="rf-gacha-detail-box"><img src="${card.image}" alt="${card.name}"><div class="rf-gacha-detail-body"><h3>${card.name}</h3><p>${RARITY_NAMES[card.rarity]||'Common'} · ${card.movie||'Anime / Manga'}</p><p>${owned ? `Bạn đang sở hữu ×${owned}` : 'Chưa sở hữu'}</p>${card.url?`<p><a href="${card.url}" target="_blank" rel="noopener" style="color:#fbbf24">Xem hồ sơ nhân vật ↗</a></p>`:''}<button class="rf-gacha-detail-close" onclick="document.getElementById('rf-gacha-detail-modal').classList.remove('show')">Đóng</button></div></div>`;
    modal.classList.add('show');
}

// Warm up Jikan after the profile UI exists. The fallback remains usable offline.
rfGachaInjectStyles();
setTimeout(()=>{ loadJikanGachaPool().then(()=>{ try{ renderCollection(); }catch(_){} }); }, 350);
