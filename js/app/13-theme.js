// ============================================================
        // THEME
        // ============================================================
        function toggleTheme() {
            const isLight = document.body.classList.toggle('light-theme');
            document.documentElement.classList.toggle('dark', !isLight);
            localStorage.setItem('roflix-theme', isLight ? 'light' : 'dark');
            updateThemeIcon(isLight);
        }

        function updateThemeIcon(isLight) {
            const icon = document.getElementById('theme-icon');
            if (icon) {
                icon.className = isLight
                    ? 'fa-solid fa-sun text-sm text-yellow-500'
                    : 'fa-solid fa-moon text-sm text-yellow-400';
            }
        }
