// ============================================================
        // UTILITY
        // ============================================================
        
        function stripHtml(html) {
            if (html == null || html === '') return '';
            try {
                const tmp = document.createElement('div');
                tmp.innerHTML = String(html);
                return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
            } catch (_) {
                return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
        }

function escapeHtml(text) {
            if (!text) return '';
            const d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }

        function getCurrentUser() {
            try { return JSON.parse(localStorage.getItem('roflix-current-user') || 'null'); }
            catch (_) { return null; }
        }

        // Compatibility helper for the local leaderboard UI.
        // It never stores passwords or authentication secrets.
        function getUsersFromStorage() {
            const current = getCurrentUser();
            return current ? [current] : [];
        }
