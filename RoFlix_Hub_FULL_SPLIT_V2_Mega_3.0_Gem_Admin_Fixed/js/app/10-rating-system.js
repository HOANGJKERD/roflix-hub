// ============================================================
        // RATING SYSTEM
        // ============================================================
        function getMovieRating(movieSlug) {
            const ratings = JSON.parse(localStorage.getItem('roflix-ratings') || '{}');
            return ratings[movieSlug] || { user: 0, total: 0, count: 0 };
        }

        function saveMovieRating(movieSlug, userRating) {
            const ratings = JSON.parse(localStorage.getItem('roflix-ratings') || '{}');
            if (!ratings[movieSlug]) ratings[movieSlug] = { user: 0, total: 0, count: 0 };
            if (ratings[movieSlug].user > 0) {
                ratings[movieSlug].total -= ratings[movieSlug].user;
                ratings[movieSlug].count -= 1;
            }
            ratings[movieSlug].user = userRating;
            ratings[movieSlug].total += userRating;
            ratings[movieSlug].count += 1;
            localStorage.setItem('roflix-ratings', JSON.stringify(ratings));
            updateRatingDisplay(movieSlug);
            showToast('success', '⭐ Đã đánh giá!', `Bạn đã cho ${userRating}⭐`);
            addExp(2);
        }

        function updateRatingDisplay(movieSlug) {
            const rating = getMovieRating(movieSlug);
            const avg = rating.count > 0 ? (rating.total / rating.count) : 0;
            
            const avgEl = document.getElementById(`rating-avg-value-${movieSlug}`);
            const countEl = document.getElementById(`rating-count-${movieSlug}`);
            const textEl = document.getElementById(`rating-text-${movieSlug}`);
            
            if (avgEl) avgEl.textContent = avg.toFixed(1);
            if (countEl) countEl.textContent = rating.count;
            if (textEl) textEl.textContent = rating.user > 0 ? `Bạn đã đánh giá ${rating.user}⭐` : 'Chưa đánh giá';
            
            document.querySelectorAll(`.stars[data-movie-id="${movieSlug}"] .star`).forEach(star => {
                const val = parseInt(star.dataset.value);
                star.classList.toggle('active', val <= rating.user);
            });
        }
