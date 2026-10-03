// ============================================================
        // TOAST SYSTEM
        // ============================================================
        function showToast(type, title, message) {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                info: 'fa-info-circle'
            };

            const toast = document.createElement('div');
            toast.className = `toast-ios show`;
            toast.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="toast-icon ${type}">
                        <i class="fa-solid ${icons[type] || icons.info}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-white">${escapeHtml(title)}</h4>
                        <p class="text-xs text-gray-400 mt-0.5">${escapeHtml(message)}</p>
                    </div>
                    <button onclick="this.closest('.toast-ios').remove()" class="text-gray-500 hover:text-white transition flex-shrink-0">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.remove('show');
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        }
