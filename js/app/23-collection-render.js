// ============================================================
        // COLLECTION RENDER
        // ============================================================
        function renderCollection() {
            const cards = getCards();
            const totalCards = GACHA_POOL.length;
            
            document.getElementById('collection-count').textContent = cards.length;
            document.getElementById('collection-total').textContent = totalCards;
            document.getElementById('collection-percent').textContent = totalCards > 0 ? Math.round((cards.length / totalCards) * 100) + '%' : '0%';
            
            const grid = document.getElementById('card-grid');
            if (!grid) return;
            
            if (cards.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full empty-state" style="padding:40px;">
                        <div class="empty-icon"><i class="fa-solid fa-layer-group"></i></div>
                        <h3>Chưa có thẻ nào</h3>
                        <p>Hãy quay Gacha để sưu tập nhân vật!</p>
                    </div>
                `;
                return;
            }
            
            const rarityNames = {
                common: 'Common',
                rare: 'Rare',
                'super-rare': 'Super Rare',
                epic: 'Epic',
                legendary: 'Legendary',
                secret: 'Secret'
            };
            
            grid.innerHTML = cards.map(card => `
                <div class="card-item">
                    <span class="card-rarity ${card.rarity}">${rarityNames[card.rarity] || 'Common'}</span>
                    <img class="card-art" src="${card.image}" alt="${card.name}">
                    <div class="card-name">${card.name}</div>
                    <div class="card-movie">${card.movie}</div>
                </div>
            `).join('');
        }
