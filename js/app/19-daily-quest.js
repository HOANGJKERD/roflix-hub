// ============================================================
        // DAILY QUEST
        // ============================================================
        function checkDailyLogin() {
            const daily = getDailyQuest();
            if (!daily.tasks.login.done) {
                daily.tasks.login.done = true;
                saveDailyQuest(daily);
                addGem(10, true);
                addExp(20);
                showToast('success', '🎯 Điểm danh', '+10 RoGem, +20 EXP');
            }
            updateDailyQuest();
        }

        function updateDailyQuestProgress(type) {
            const daily = getDailyQuest();
            if (daily.claimed) return;
            
            if (type === 'watch' && !daily.tasks.watch.done) {
                daily.tasks.watch.current = (daily.tasks.watch.current || 0) + 1;
                if (daily.tasks.watch.current >= daily.tasks.watch.target) {
                    daily.tasks.watch.done = true;
                }
            } else if (type === 'comment' && !daily.tasks.comment.done) {
                daily.tasks.comment.current = (daily.tasks.comment.current || 0) + 1;
                if (daily.tasks.comment.current >= daily.tasks.comment.target) {
                    daily.tasks.comment.done = true;
                }
            } else if (type === 'favorite' && !daily.tasks.favorite.done) {
                daily.tasks.favorite.current = (daily.tasks.favorite.current || 0) + 1;
                if (daily.tasks.favorite.current >= daily.tasks.favorite.target) {
                    daily.tasks.favorite.done = true;
                }
            }
            saveDailyQuest(daily);
            updateDailyQuest();
        }

        function updateDailyQuest() {
            const daily = getDailyQuest();
            const container = document.getElementById('daily-quest-list');
            if (!container) return;
            
            const tasks = [
                { key: 'watch', icon: '📺', label: `Xem ${daily.tasks.watch.target} tập hôm nay`, reward: 10 },
                { key: 'comment', icon: '💬', label: `Bình luận ${daily.tasks.comment.target} lần`, reward: 5 },
                { key: 'favorite', icon: '❤️', label: `Yêu thích ${daily.tasks.favorite.target} phim`, reward: 5 },
                { key: 'login', icon: '✅', label: 'Đăng nhập hôm nay', reward: 10 }
            ];
            
            let allDone = true;
            container.innerHTML = tasks.map(t => {
                const task = daily.tasks[t.key];
                const isDone = task.done || (t.key === 'watch' && task.current >= task.target) ||
                               (t.key === 'comment' && task.current >= task.target) ||
                               (t.key === 'favorite' && task.current >= task.target);
                if (!isDone) allDone = false;
                const progress = t.key === 'watch' ? `${task.current}/${task.target}` :
                                t.key === 'comment' ? `${task.current}/${task.target}` :
                                t.key === 'favorite' ? `${task.current}/${task.target}` : '';
                return `
                    <div class="quest-item">
                        <div class="quest-info">
                            <div class="quest-check ${isDone ? 'done' : ''}">
                                ${isDone ? '<i class="fa-solid fa-check"></i>' : ''}
                            </div>
                            <div class="quest-text">
                                ${isDone ? `<span style="text-decoration:line-through; opacity:0.5;">${t.icon} ${t.label}</span>` :
                                           `${t.icon} ${t.label}`}
                                ${progress ? `<span class="progress">(${progress})</span>` : ''}
                            </div>
                        </div>
                        <div class="quest-reward">+${t.reward} 💎</div>
                    </div>
                `;
            }).join('');
            
            const claimBtn = document.getElementById('claim-daily-btn');
            if (daily.claimed) {
                claimBtn.disabled = true;
                claimBtn.textContent = '✅ Đã nhận thưởng hôm nay';
            } else if (allDone) {
                claimBtn.disabled = false;
                claimBtn.textContent = `🎁 Nhận thưởng ${calculateDailyReward()} RoGem`;
            } else {
                claimBtn.disabled = true;
                claimBtn.textContent = '📋 Hoàn thành nhiệm vụ để nhận thưởng';
            }
            
            const resetTime = document.getElementById('quest-reset-time');
            if (resetTime) resetTime.textContent = `🔄 Reset lúc 00:00`;
        }

        function calculateDailyReward() {
            const daily = getDailyQuest();
            let total = 0;
            for (const key in daily.tasks) {
                const task = daily.tasks[key];
                if (task.done || (typeof task === 'object' && task.current >= task.target)) {
                    if (key === 'watch') total += 10;
                    else if (key === 'comment') total += 5;
                    else if (key === 'favorite') total += 5;
                    else if (key === 'login') total += 10;
                }
            }
            return total;
        }

        function claimDailyQuest() {
            const daily = getDailyQuest();
            if (daily.claimed) {
                showToast('info', 'Đã nhận', 'Bạn đã nhận thưởng hôm nay!');
                return;
            }
            
            const reward = calculateDailyReward();
            if (reward === 0) {
                showToast('info', 'Chưa hoàn thành', 'Hoàn thành nhiệm vụ trước khi nhận thưởng!');
                return;
            }
            
            daily.claimed = true;
            saveDailyQuest(daily);
            addGem(reward, true);
            addExp(reward * 2);
            showToast('success', '🎉 Nhận thưởng thành công!', `+${reward} RoGem, +${reward * 2} EXP`);
            updateDailyQuest();
            updateProfileUI();
        }
