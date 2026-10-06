// ============================================================
        // BÌNH LUẬN
        // ============================================================
        function getComments(movieSlug) {
            const allComments = JSON.parse(localStorage.getItem('roflix-comments') || '{}');
            return allComments[movieSlug] || [];
        }

        function saveComment(movieSlug, username, text) {
            const allComments = JSON.parse(localStorage.getItem('roflix-comments') || '{}');
            if (!allComments[movieSlug]) allComments[movieSlug] = [];
            allComments[movieSlug].unshift({
                user: username || 'Khán Giả',
                text: text,
                time: new Date().toLocaleString('vi-VN'),
                timestamp: Date.now(),
                movieTitle: (typeof currentMovieTitle !== 'undefined' && currentMovieTitle) ? currentMovieTitle : movieSlug
            });
            localStorage.setItem('roflix-comments', JSON.stringify(allComments));
            const stats = getStats();
            stats.totalComments = (stats.totalComments || 0) + 1;
            saveStats(stats);
            updateDailyQuestProgress('comment');
            checkAchievements(stats);
            if (typeof renderBbComments === 'function') renderBbComments();
        }

        function renderComments(movieSlug) {
            const container = document.getElementById('comments-container');
            if (!container) return;
            const comments = getComments(movieSlug);
            container.innerHTML = comments.length > 0 ? comments.map(c => `
                <div class="border-b border-gray-800 pb-4 last:border-0">
                    <div class="flex justify-between text-xs text-amber-500 font-bold mb-1">
                        <span><i class="fa-regular fa-user mr-1"></i>${escapeHtml(c.user)}</span>
                        <span class="font-normal text-[11px] text-gray-500">${escapeHtml(c.time)}</span>
                    </div>
                    <p class="text-sm mt-1 text-gray-300">${escapeHtml(c.text)}</p>
                </div>
            `).join('') : `<div class="text-center text-gray-500 py-8">Chưa có bình luận. Hãy là người đầu tiên!</div>`;
        }

        async function submitComment(slug) {
            const userEl = document.getElementById('comment-user');
            const inputEl = document.getElementById('comment-input');
            const username = userEl.value.trim() || 'Khán Giả';
            const text = inputEl.value.trim();
            if (!text) { showToast('error', 'Lỗi', 'Vui lòng nhập bình luận!'); return; }
            if (window.rfSupabase) {
                showToast('info', 'Đăng nhập', 'Bình luận được lưu trên tài khoản, không cộng Gem cục bộ.');
            }
            saveComment(slug, username, text);
            renderComments(slug);
            inputEl.value = '';
            showToast('success', 'Đã đăng', 'Bình luận thành công');
        }
