// ============================================================
        // GEM FLY EFFECT
        // ============================================================
        function showGemFly(amount) {
            const container = document.getElementById('gem-fly-container');
            const el = document.createElement('div');
            el.className = 'gem-fly';
            el.textContent = `+${amount} 💎`;
            el.style.left = (window.innerWidth / 2 - 50) + 'px';
            el.style.top = (window.innerHeight / 2) + 'px';
            el.style.fontSize = '2.5rem';
            el.style.fontWeight = '900';
            el.style.color = '#f59e0b';
            el.style.textShadow = '0 0 40px rgba(245,158,11,0.5)';
            container.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
