// ============================================================
        // PHÂN TRANG
        // ============================================================
        function updatePagination() {
            const container = document.getElementById('pagination-container');
            if (!container) return;
            
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }
            
            let html = `<div class="flex items-center justify-center gap-2 flex-wrap">`;
            if (currentPage > 1) {
                html += `<button onclick="changePage(${currentPage - 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">‹</button>`;
            }
            
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
            
            if (startPage > 1) {
                html += `<button onclick="changePage(1)" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">1</button>`;
                if (startPage > 2) html += `<span class="px-2 text-gray-500">...</span>`;
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button onclick="changePage(${i})" class="px-4 py-2 rounded-xl ${i === currentPage ? 'bg-amber-500 text-black font-bold' : 'bg-gray-800 hover:bg-gray-700 text-white'} text-sm transition">${i}</button>`;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<span class="px-2 text-gray-500">...</span>`;
                html += `<button onclick="changePage(${totalPages})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">${totalPages}</button>`;
            }
            
            if (currentPage < totalPages) {
                html += `<button onclick="changePage(${currentPage + 1})" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm transition">›</button>`;
            }
            html += `</div>`;
            container.innerHTML = html;
        }

        async function changePage(page) {
            if (page < 1 || page > totalPages || page === currentPage) return;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            await renderMoviesFromAPI(page);
        }
