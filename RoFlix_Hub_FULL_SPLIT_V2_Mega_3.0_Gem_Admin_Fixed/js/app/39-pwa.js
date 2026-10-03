// ============================================================
        // PWA
        // ============================================================
        let deferredPWAPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPWAPrompt = e;
            if (localStorage.getItem('roflix-pwa-dismiss') === '1') return;
            const banner = document.getElementById('pwa-banner');
            if (banner) banner.classList.add('show');
        });

        async function installPWA() {
            const banner = document.getElementById('pwa-banner');
            if (!deferredPWAPrompt) {
                if (banner) banner.classList.remove('show');
                if (typeof showToastPro === 'function') {
                    showToastPro('info', 'Cài app', 'Trên iPhone: Share → Thêm vào Màn hình chính');
                }
                return;
            }
            deferredPWAPrompt.prompt();
            try { await deferredPWAPrompt.userChoice; } catch (_) {}
            deferredPWAPrompt = null;
            if (banner) banner.classList.remove('show');
        }

        function dismissPWA() {
            localStorage.setItem('roflix-pwa-dismiss', '1');
            const banner = document.getElementById('pwa-banner');
            if (banner) banner.classList.remove('show');
        }

        function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.warn('SW register fail', err);
                });
            });
        }
        registerServiceWorker();
