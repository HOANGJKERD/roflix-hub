// ============================================================
        // PARTICLES
        // ============================================================
        (function initParticles() {
            const canvas = document.getElementById('particles-canvas');
            if (!canvas) return;
            const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            // Mobile / reduce motion: tắt hẳn để trang mượt hơn
            if (prefersReduce || isMobile) { canvas.style.display = 'none'; return; }

            const start = () => {
            const ctx = canvas.getContext('2d', { alpha: true });
            let particles = [];
            let w = 0, h = 0;
            let running = true;
            let last = 0;
            const COUNT = 14;
            const TARGET_FPS = 24;
            const FRAME_MS = 1000 / TARGET_FPS;

            function resize() {
                const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
                w = window.innerWidth;
                h = window.innerHeight;
                canvas.width = Math.floor(w * dpr);
                canvas.height = Math.floor(h * dpr);
                canvas.style.width = w + 'px';
                canvas.style.height = h + 'px';
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(resize, 150);
            });
            resize();

            for (let i = 0; i < COUNT; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    size: Math.random() * 1.6 + 0.4,
                    vx: (Math.random() - 0.5) * 0.25,
                    vy: (Math.random() - 0.5) * 0.25,
                    opacity: Math.random() * 0.35 + 0.08,
                    color: Math.random() > 0.5 ? '#f59e0b' : '#8b5cf6'
                });
            }

            function tick(ts) {
                if (!running) return;
                requestAnimationFrame(tick);
                if (ts - last < FRAME_MS) return;
                last = ts;
                ctx.clearRect(0, 0, w, h);
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < 0 || p.x > w) p.vx *= -1;
                    if (p.y < 0 || p.y > h) p.vy *= -1;
                    ctx.globalAlpha = p.opacity;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            requestAnimationFrame(tick);

            document.addEventListener('visibilitychange', () => {
                running = document.visibilityState === 'visible';
                if (running) {
                    last = 0;
                    requestAnimationFrame(tick);
                }
            });
            }; // end start()

            if ('requestIdleCallback' in window) {
                requestIdleCallback(start, { timeout: 2000 });
            } else {
                setTimeout(start, 400);
            }
        })();
