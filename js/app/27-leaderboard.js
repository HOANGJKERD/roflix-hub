// ============================================================
        // LEADERBOARD
        // ============================================================
        function getLeaderboardData() {
            const users = getUsersFromStorage();
            const leaderboard = [];
            
            users.forEach(user => {
                const levelData = JSON.parse(localStorage.getItem('roflix-level') || '{"level":1,"exp":0}');
                const gem = parseInt(localStorage.getItem('roflix-gem') || '0');
                
                leaderboard.push({
                    name: user.name || 'Người dùng',
                    email: user.email,
                    level: levelData.level || 1,
                    exp: levelData.exp || 0,
                    gem: gem
                });
            });
            
            leaderboard.sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                if (b.exp !== a.exp) return b.exp - a.exp;
                return b.gem - a.gem;
            });
            
            return leaderboard;
        }

        function renderLeaderboard() {
            const container = document.getElementById('leaderboard-list');
            const countEl = document.getElementById('lb-user-count');
            if (!container) return;
            
            const data = getLeaderboardData();
            if (countEl) countEl.textContent = data.length;
            
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:40px;">
                        <div class="empty-icon"><i class="fa-solid fa-ranking-star"></i></div>
                        <h3>Chưa có người dùng</h3>
                        <p>Hãy đăng ký để tham gia bảng xếp hạng!</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = data.map((user, index) => {
                const rank = index + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'top1';
                else if (rank === 2) rankClass = 'top2';
                else if (rank === 3) rankClass = 'top3';
                
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f59e0b&color=000&size=30`;
                
                return `
                    <div class="lb-item">
                        <span class="lb-rank ${rankClass}">#${rank}</span>
                        <div class="lb-user">
                            <img class="lb-avatar" src="${avatarUrl}" alt="${escapeHtml(user.name)}">
                            <span class="lb-name">${escapeHtml(user.name)}</span>
                        </div>
                        <span class="lb-level">Lv.${user.level}</span>
                        <span class="lb-gem">${user.gem.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
        }
