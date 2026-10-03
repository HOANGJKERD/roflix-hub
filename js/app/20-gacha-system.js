// ============================================================
        // GACHA SYSTEM
        // ============================================================
        const GACHA_POOL = [
            { id: 'common_1', name: 'Neo', movie: 'Ma trận', rarity: 'common', image: 'https://via.placeholder.com/150/6b7280/fff?text=Neo' },
            { id: 'common_2', name: 'Trinity', movie: 'Ma trận', rarity: 'common', image: 'https://via.placeholder.com/150/6b7280/fff?text=Trinity' },
            { id: 'common_3', name: 'Morpheus', movie: 'Ma trận', rarity: 'common', image: 'https://via.placeholder.com/150/6b7280/fff?text=Morpheus' },
            { id: 'common_4', name: 'Paul Atreides', movie: 'Dune', rarity: 'common', image: 'https://via.placeholder.com/150/6b7280/fff?text=Paul' },
            { id: 'common_5', name: 'Chani', movie: 'Dune', rarity: 'common', image: 'https://via.placeholder.com/150/6b7280/fff?text=Chani' },
            { id: 'rare_1', name: 'Jake Sully', movie: 'Avatar', rarity: 'rare', image: 'https://via.placeholder.com/150/22c55e/fff?text=Jake' },
            { id: 'rare_2', name: 'Neytiri', movie: 'Avatar', rarity: 'rare', image: 'https://via.placeholder.com/150/22c55e/fff?text=Neytiri' },
            { id: 'rare_3', name: 'Batman', movie: 'The Batman', rarity: 'rare', image: 'https://via.placeholder.com/150/22c55e/fff?text=Batman' },
            { id: 'rare_4', name: 'Catwoman', movie: 'The Batman', rarity: 'rare', image: 'https://via.placeholder.com/150/22c55e/fff?text=Catwoman' },
            { id: 'sr_1', name: 'Oppenheimer', movie: 'Oppenheimer', rarity: 'super-rare', image: 'https://via.placeholder.com/150/3b82f6/fff?text=Oppenheimer' },
            { id: 'sr_2', name: 'John Wick', movie: 'John Wick', rarity: 'super-rare', image: 'https://via.placeholder.com/150/3b82f6/fff?text=Wick' },
            { id: 'sr_3', name: 'Caine', movie: 'John Wick', rarity: 'super-rare', image: 'https://via.placeholder.com/150/3b82f6/fff?text=Caine' },
            { id: 'epic_1', name: 'Duke Leto', movie: 'Dune', rarity: 'epic', image: 'https://via.placeholder.com/150/8b5cf6/fff?text=Leto' },
            { id: 'epic_2', name: 'Lady Jessica', movie: 'Dune', rarity: 'epic', image: 'https://via.placeholder.com/150/8b5cf6/fff?text=Jessica' },
            { id: 'leg_1', name: 'Feyd-Rautha', movie: 'Dune', rarity: 'legendary', image: 'https://via.placeholder.com/150/f59e0b/000?text=Feyd' },
            { id: 'leg_2', name: 'Stilgar', movie: 'Dune', rarity: 'legendary', image: 'https://via.placeholder.com/150/f59e0b/000?text=Stilgar' },
            { id: 'sec_1', name: '🔥 Movie God', movie: 'RoFlix', rarity: 'secret', image: 'https://via.placeholder.com/150/ec4899/fff?text=MovieGod' },
        ];

        const RARITY_WEIGHTS = {
            common: 40,
            rare: 25,
            'super-rare': 18,
            epic: 10,
            legendary: 5,
            secret: 2
        };

        function rollGacha() {
            const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
            let roll = Math.random() * total;
            for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
                roll -= weight;
                if (roll <= 0) {
                    const pool = GACHA_POOL.filter(c => c.rarity === rarity);
                    return pool[Math.floor(Math.random() * pool.length)];
                }
            }
            return GACHA_POOL[0];
        }

        function performGacha() {
            const cost = 50;
            const gems = getGem();
            if (gems < cost) {
                showToast('error', 'Không đủ RoGem', `Cần ${cost} 💎 để quay Gacha`);
                return;
            }
            
            addGem(-cost, false);
            
            const card = rollGacha();
            const cards = getCards();
            card.obtainedAt = new Date().toISOString();
            card.id = card.id + '_' + Date.now();
            cards.push(card);
            saveCards(cards);
            
            showGachaPull(card);
            updateProfileUI();
            renderCollection();
        }

        function showGachaPull(card) {
            const overlay = document.getElementById('gacha-pull-overlay');
            const pullCard = document.getElementById('gacha-pull-card');
            const rarityNames = {
                common: '⚪ Common',
                rare: '🟢 Rare',
                'super-rare': '🔵 Super Rare',
                epic: '🟣 Epic',
                legendary: '🟠 Legendary',
                secret: '🌈 Secret'
            };
            const rarityColors = {
                common: '#6b7280',
                rare: '#22c55e',
                'super-rare': '#3b82f6',
                epic: '#8b5cf6',
                legendary: '#f59e0b',
                secret: '#ec4899'
            };
            
            document.getElementById('pull-rarity').textContent = rarityNames[card.rarity] || '✨ Common';
            document.getElementById('pull-rarity').style.background = rarityColors[card.rarity] || '#6b7280';
            document.getElementById('pull-rarity').style.color = card.rarity === 'legendary' ? 'black' : 'white';
            document.getElementById('pull-art').src = card.image;
            document.getElementById('pull-name').textContent = card.name;
            document.getElementById('pull-movie').textContent = `Từ: ${card.movie}`;
            
            pullCard.classList.remove('show');
            overlay.classList.add('show');
            setTimeout(() => pullCard.classList.add('show'), 100);
        }

        function closeGachaPull() {
            const overlay = document.getElementById('gacha-pull-overlay');
            overlay.classList.remove('show');
            document.getElementById('gacha-pull-card').classList.remove('show');
        }
