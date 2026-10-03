// ============================================================
// PWA + automatic Vercel update handling
// ============================================================
let deferredPWAPrompt = null;
let roflixPwaRegistration = null;
let roflixUpdateBanner = null;

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

function createRoFlixUpdateBanner() {
    if (roflixUpdateBanner) return roflixUpdateBanner;

    const banner = document.createElement('div');
    banner.id = 'roflix-update-banner';
    banner.innerHTML = `
        <div class="roflix-update-icon">🚀</div>
        <div class="roflix-update-copy">
            <strong>RoFlix đã có phiên bản mới</strong>
            <span>Đang cập nhật để bạn dùng bản mới nhất...</span>
        </div>
        <button type="button" id="roflix-update-now" aria-label="Cập nhật RoFlix">Cập nhật</button>
    `;
    document.body.appendChild(banner);

    banner.querySelector('#roflix-update-now').addEventListener('click', () => {
        roflixApplyUpdate();
    });

    roflixUpdateBanner = banner;
    requestAnimationFrame(() => banner.classList.add('show'));
    return banner;
}

function roflixShowUpdateNotice() {
    const banner = createRoFlixUpdateBanner();
    const copy = banner.querySelector('.roflix-update-copy span');
    if (copy) copy.textContent = 'Đang cập nhật để bạn dùng bản mới nhất...';
}

function roflixApplyUpdate() {
    if (!roflixPwaRegistration || !roflixPwaRegistration.waiting) {
        window.location.reload();
        return;
    }

    const button = document.getElementById('roflix-update-now');
    if (button) {
        button.disabled = true;
        button.textContent = 'Đang cập nhật...';
    }

    roflixPwaRegistration.waiting.postMessage({ type: 'ROFLIX_SKIP_WAITING' });
}

function watchForRoFlixUpdate(registration) {
    roflixPwaRegistration = registration;

    if (registration.waiting) {
        roflixShowUpdateNotice();
    }

    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                roflixShowUpdateNotice();
            }
        });
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
            watchForRoFlixUpdate(registration);

            // Ask the browser/Vercel for a fresh worker whenever the app opens.
            await registration.update();

            // Also check periodically while the app stays open.
            setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);

            // New service worker takes over immediately after the user accepts.
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
