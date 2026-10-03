// ============================================================
        // HISTORY TAB
        // ============================================================
        function renderHistoryTab() {
            const container = document.getElementById('history-list');
            if (!container) return;
            const history = getWatchHistory().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (!history.length) {
                container.innerHTML = `<div class="empty-state" style="padding:40px;"><div class="empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div><h3>Chưa có lịch sử xem</h3><p>Hãy xem phim để lịch sử xuất hiện ở đây!</p></div>`;
                return;
            }
            container.innerHTML = `<div class="flex justify-end mb-3"><button onclick="clearWatchHistory()" class="text-xs text-red-400 hover:text-red-300 font-bold"><i class="fa-solid fa-trash mr-1"></i>Xóa toàn bộ lịch sử</button></div>` + history.slice(0, 50).map(item => {
                const title = escapeHtml(item.title || item.slug || 'Phim');
                const episode = escapeHtml(item.episodeName || `Tập ${(Number(item.episode) || 0) + 1}`);
                const progress = Math.round((Number(item.progress) || 0) * 100);
                const poster = item.poster || 'https://placehold.co/90x130/12141d/f59e0b?text=RF';
                const date = item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : '';
                return `<div class="history-item" style="cursor:pointer" onclick="resumeWatchHistory('${String(item.slug).replace(/'/g, '&#39;')}')">
                    <img class="history-poster" src="${poster}" alt="${title}" onerror="this.src='https://placehold.co/90x130/12141d/f59e0b?text=RF'">
                    <div class="history-info"><div class="history-title">${title}</div><div class="history-meta">${episode} · ${date}</div><div class="mt-2 h-1.5 rounded-full bg-gray-800 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300" style="width:${progress}%"></div></div><div class="text-[10px] text-gray-500 mt-1">Đã lưu tập và lần xem gần nhất</div></div>
                    <button title="Xóa khỏi lịch sử" onclick="event.stopPropagation();clearWatchHistory('${String(item.slug).replace(/'/g, '&#39;')}')" class="text-gray-500 hover:text-red-400 px-2"><i class="fa-solid fa-xmark"></i></button>
                </div>`;
            }).join('');
        }
