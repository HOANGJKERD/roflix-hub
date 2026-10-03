// ============================================================
        // ACHIEVEMENTS RENDER
        // ============================================================
        function renderAchievements() {
            const grid = document.getElementById('achievement-grid');
            if (!grid) return;
            
            const unlocked = getAchievements();
            
            grid.innerHTML = ACHIEVEMENTS.map(ach => {
                const isUnlocked = unlocked.find(u => u.id === ach.id);
                return `
                    <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="ach-icon">${ach.icon}</div>
                        <div class="ach-name">${ach.name}</div>
                        <div class="ach-desc">${ach.desc}</div>
                        ${isUnlocked ? '<div style="color:#10b981; font-size:0.7rem; margin-top:4px;">✓ Đã đạt</div>' : ''}
                    </div>
                `;
            }).join('');
        }
