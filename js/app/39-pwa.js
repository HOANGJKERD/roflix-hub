// ============================================================
// PWA + automatic Vercel update handling
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

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });

            // Ask the browser/Vercel for a fresh worker whenever the app opens.
            await registration.update();

            // Also check periodically while the app stays open.
            setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);

            // New service worker takes over immediately. Reload once so the new
            // HTML/JS/CSS from the latest Vercel deployment is displayed.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (window.__roflixSwReloaded) return;
                window.__roflixSwReloaded = true;
                window.location.reload();
            });
        } catch (err) {
            console.warn('RoFlix service worker registration failed', err);
        }
    });
}

registerServiceWorker();
