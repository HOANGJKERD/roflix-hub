// ============================================================
        // HÀM XỬ LÝ DỮ LIỆU PHIM
        // ============================================================
        function mapMovieData(item) {
            const categories = Array.isArray(item.category) 
                ? item.category.map(c => c.name || c).filter(Boolean)
                : [];
            
            let type = 'Phim Lẻ';
            if (item.type === 'series' || item.episode_total > 1 || item.episode_current?.includes('Tập')) {
                type = 'Phim Bộ';
            }
            
            let status = 'Đang cập nhật';
            if (item.status === 'completed') status = 'Hoàn thành';
            else if (item.status === 'ongoing') status = 'Đang chiếu';
            else if (item.chieurap) status = 'Đang chiếu rạp';
            
            let ratingRaw = item.tmdb?.vote_average || item.imdb?.rating || item.rating || 0;
            ratingRaw = parseFloat(ratingRaw) || 0;
            const rating = ratingRaw > 0 ? ratingRaw.toFixed(1) : 'N/A';
            const imdbId = (item.imdb && item.imdb.id) ? item.imdb.id : null;
            const tmdbId = (item.tmdb && item.tmdb.id) ? item.tmdb.id : null;
            const tmdbType = (item.tmdb && item.tmdb.type) ? item.tmdb.type : 'movie';
            
            return {
                slug: item.slug || '',
                title: item.name || 'Không có tiêu đề',
                origin_name: item.origin_name || '',
                type: type,
                genre: categories,
                year: item.year || 'N/A',
                rating: rating,
                imdbId: imdbId,
                tmdbId: tmdbId,
                tmdbType: tmdbType,
                views: item.view || '0',
                status: status,
                _src: item._src || currentSourceId,
                poster: pickPoster(item, item._src) || 'https://placehold.co/300x400/1a1a1a/666?text=No+Image',
                thumb: absImage(item.thumb_url, item._src) || pickPoster(item, item._src),
                summary: item.content || 'Chưa có tóm tắt',
                episodes: item.episodes || [],
                quality: item.quality || 'HD',
                lang: item.lang || 'Vietsub',
                episode_total: item.episode_total || 0,
                actors: item.actor || [],
                directors: item.director || [],
                trailer: item.trailer_url || ''
            };
        }
