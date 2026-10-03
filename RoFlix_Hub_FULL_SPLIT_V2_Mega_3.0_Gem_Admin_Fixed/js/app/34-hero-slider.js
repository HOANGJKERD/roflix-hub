// ============================================================
        // HERO SLIDER
        // ============================================================
        let heroSlides = [];
        let heroIndex = 0;
        let heroTimer = null;
        const HERO_INTERVAL = 7000;

        async function initHeroSlider() {
            try {
                const res1 = await fetchListWithFallback('/quoc-gia/au-my?page=1');
                heroSlides = mapListResultItems(res1)
                    .filter(m => m.slug && isValidPosterUrl(m.poster))
                    .slice(0, 8);

                if (heroSlides.length < 4) {
                    try {
                        const res2 = await fetchListWithFallback('/tim-kiem?keyword=2024&page=1');
                        const more = mapListResultItems(res2).filter(m => m.slug);
                        heroSlides = [...heroSlides, ...more].slice(0, 8);
                    } catch (_) {}
                }

                if (!heroSlides.length) return;

                renderHeroDots();
                showHeroSlide(0, false);
                startHeroAutoplay();

                const section = document.getElementById('hero-section');
                if (section) {
                    section.addEventListener('mouseenter', stopHeroAutoplay);
                    section.addEventListener('mouseleave', startHeroAutoplay);
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
                const poster = m.thumb || m.poster;
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
                    btnDetail.onclick = slugSafe ? () => viewMovieDetail(m.slug) : null;
                    btnDetail.disabled = !slugSafe;
                }
                if (btnPlay) {
                    btnPlay.onclick = slugSafe ? () => playMovie(m.slug) : null;
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

            if (animate && box) {
                box.classList.add('is-fading');
                box.classList.remove('is-visible');
                setTimeout(apply, 280);
            } else {
                apply();
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
