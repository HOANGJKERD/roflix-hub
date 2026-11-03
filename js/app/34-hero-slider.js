// ============================================================
        // HERO SLIDER
        // ============================================================
        let heroSlides = [];
        let heroIndex = 0;
        let heroTimer = null;
        const HERO_INTERVAL = 7000;

        const heroImageCache = new Map();
        function warmHeroImage(url) {
            if (!url || heroImageCache.has(url)) return heroImageCache.get(url) || Promise.resolve();
            const task = new Promise(resolve => {
                const img = new Image();
                img.decoding = 'async';
                img.fetchPriority = 'high';
                img.onload = async () => { try { if (img.decode) await img.decode(); } catch (_) {} resolve(true); };
                img.onerror = () => resolve(false);
                img.src = url;
            });
            heroImageCache.set(url, task);
            if (heroImageCache.size > 12) heroImageCache.delete(heroImageCache.keys().next().value);
            return task;
        }

        async function initHeroSlider() {
            try {
                const res1 = await fetchListWithFallback('/quoc-gia/au-my?page=1');
                heroSlides = mapListResultItems(res1)
                    .filter(m => m.slug && isValidPosterUrl(m.banner))
                    .slice(0, 8);

                // Không dùng poster dọc làm ảnh thay thế cho hero ngang.

                if (!heroSlides.length) return;
                renderHeroDots();
                const firstImage = heroSlides[0].banner;
                await warmHeroImage(firstImage);
                showHeroSlide(0, false);
                startHeroAutoplay();

                // Tải trước slide kế tiếp ở nền, không chặn nội dung đầu trang.
                if (heroSlides[1]) warmHeroImage(heroSlides[1].banner);
                const section = document.getElementById('hero-section');
                if (section) {
                    section.addEventListener('mouseenter', stopHeroAutoplay, {passive:true});
                    section.addEventListener('mouseleave', startHeroAutoplay, {passive:true});
                }
            } catch (e) {
                console.error('Hero slider error:', e);
                const descEl = document.getElementById('hero-desc');
                if (descEl) descEl.textContent = 'Không tải được phim đề xuất. Kéo xuống để xem danh sách.';
            }
        }

        function renderHeroDots() {
            const dots = document.getElementById('hero-dots');
            if (!dots) return;
            dots.innerHTML = heroSlides.map((_, i) =>
                `<button type="button" class="dot ${i === heroIndex ? 'active' : ''}" onclick="heroGoTo(${i})" aria-label="Slide ${i + 1}"></button>`
            ).join('');
        }

        function showHeroSlide(index, animate = true) {
            if (!heroSlides.length) return;
            heroIndex = (index + heroSlides.length) % heroSlides.length;
            const m = heroSlides[heroIndex];
            const box = document.getElementById('hero-content-box');
            const bg = document.getElementById('hero-background');

            const apply = () => {
                const poster = m.banner;
                if (bg && poster) {
                    bg.style.backgroundImage = `
                        linear-gradient(135deg, rgba(9,10,15,0.92) 0%, rgba(18,20,29,0.72) 45%, rgba(9,10,15,0.92) 100%),
                        url('${poster}')`;
                    bg.style.backgroundSize = 'cover';
                    bg.style.backgroundPosition = 'center';
                }

                const ratingEl = document.getElementById('hero-rating');
                if (ratingEl) ratingEl.innerHTML = `<i class="fa-solid fa-star"></i> ${m.rating || 'N/A'}`;

                const hotEl = document.getElementById('hero-hot');
                if (hotEl) {
                    const hot = parseFloat(m.rating) >= 7.5;
                    hotEl.style.display = hot ? '' : 'none';
                }

                const title = m.title || 'Phim nổi bật';
                const parts = title.split(/\s[-–—]\s/);
                const mainEl = document.getElementById('hero-title-main');
                const subEl = document.getElementById('hero-title-sub');
                if (parts.length > 1) {
                    if (mainEl) mainEl.textContent = parts[0];
                    if (subEl) subEl.textContent = ' - ' + parts.slice(1).join(' - ');
                } else {
                    if (mainEl) mainEl.textContent = title;
                    if (subEl) subEl.textContent = m.year && m.year !== 'N/A' ? ` (${m.year})` : '';
                }

                // Gắn nút TRƯỚC (tránh lỗi mô tả làm mất onclick)
                const slugSafe = String(m.slug || '').replace(/'/g, "\'");
                const btnDetail = document.getElementById('hero-btn-detail');
                const btnPlay = document.getElementById('hero-btn-play');
                if (btnDetail) {
                    btnDetail.onclick = slugSafe ? () => viewMovieDetail(m.slug, m._src || currentSourceId) : null;
                    btnDetail.disabled = !slugSafe;
                }
                if (btnPlay) {
                    btnPlay.onclick = slugSafe ? () => playMovie(m.slug, m._src || currentSourceId) : null;
                    btnPlay.disabled = !slugSafe;
                }

                const descEl = document.getElementById('hero-desc');
                if (descEl) {
                    let desc = '';
                    try {
                        desc = (typeof stripHtml === 'function'
                            ? stripHtml(m.summary || m.origin_name || '')
                            : String(m.summary || m.origin_name || '').replace(/<[^>]*>/g, ' ')).trim();
                    } catch (_) { desc = ''; }
                    if (!desc || desc === 'Chưa có tóm tắt') {
                        desc = m.origin_name
                            ? `${m.origin_name}${m.year && m.year !== 'N/A' ? ' · ' + m.year : ''} · ${m.type || 'Phim'}`
                            : (m.year && m.year !== 'N/A' ? `Năm ${m.year} · Phim nổi bật trên RoFlix` : 'Phim nổi bật trên RoFlix.');
                    }
                    if (desc.length > 180) desc = desc.slice(0, 177) + '...';
                    descEl.textContent = desc;
                }

                renderHeroDots();
                if (box) {
                    box.classList.remove('is-fading');
                    box.classList.add('is-visible');
                }
            };

            const nextUrl = m.banner;
            const applyWhenReady = () => {
                if (animate && box) {
                    box.classList.add('is-fading');
                    box.classList.remove('is-visible');
                    requestAnimationFrame(() => requestAnimationFrame(apply));
                } else apply();
                const next = heroSlides[(heroIndex + 1) % heroSlides.length];
                if (next && next !== m) warmHeroImage(next.banner);
            };
            if (nextUrl && heroImageCache.has(nextUrl)) {
                warmHeroImage(nextUrl).then(applyWhenReady);
            } else {
                warmHeroImage(nextUrl).then(applyWhenReady);
            }
        }

        function heroNext() {
            showHeroSlide(heroIndex + 1);
            startHeroAutoplay();
        }
        function heroPrev() {
            showHeroSlide(heroIndex - 1);
            startHeroAutoplay();
        }
        function heroGoTo(i) {
            showHeroSlide(i);
            startHeroAutoplay();
        }
        function startHeroAutoplay() {
            stopHeroAutoplay();
            if (heroSlides.length < 2) return;
            heroTimer = setInterval(() => showHeroSlide(heroIndex + 1), HERO_INTERVAL);
        }
        function stopHeroAutoplay() {
            if (heroTimer) {
                clearInterval(heroTimer);
                heroTimer = null;
            }
        }
