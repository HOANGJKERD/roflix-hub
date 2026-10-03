// ============================================================
        // NAVIGATION
        // ============================================================
        function navigateTo(targetId) {
            const viewMap = {
                'landing-page': 'view-landing-page',
                'main-site': 'view-main-site',
                'detail-page': 'view-detail-page',
                'play-page': 'view-play-page',
                'profile-page': 'view-profile-page'
            };

            const targetViewId = viewMap[targetId] || targetId;
            const targetViewEl = document.getElementById(targetViewId);
            if (!targetViewEl) return;

            let currentViewEl = null;
            for (const [key, id] of Object.entries(viewMap)) {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden-view')) {
                    currentViewEl = el;
                    break;
                }
            }

            if (currentViewEl) {
                currentViewEl.classList.add('hidden-view');
            }
            targetViewEl.classList.remove('hidden-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function navigateToProfile() {
            renderProfile();
            navigateTo('profile-page');
        }
