// ============================================================
        // RESET PROFILE
        // ============================================================
        function resetProfile() {
            if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác!')) return;
            
            localStorage.removeItem('roflix-profile');
            localStorage.removeItem('roflix-level');
            localStorage.removeItem('roflix-gem');
            localStorage.removeItem('roflix-stats');
            localStorage.removeItem('roflix-achievements');
            localStorage.removeItem('roflix-cards');
            localStorage.removeItem('roflix-daily');
            localStorage.removeItem('roflix-ratings');
            localStorage.removeItem('roflix-favs');
            localStorage.removeItem('roflix-comments');
            if (typeof getWatchHistoryStorageKey === 'function') {
                const historyKey = getWatchHistoryStorageKey();
                if (historyKey) localStorage.removeItem(historyKey);
            }
            
            showToast('success', '🗑️ Đã xóa!', 'Toàn bộ dữ liệu đã được xóa.');
            setTimeout(() => window.location.reload(), 1000);
        }
