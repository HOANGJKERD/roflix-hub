// ============================================================
// HÀM XỬ LÝ DỮ LIỆU PHIM
// ============================================================
function asNameList(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(v => {
            if (typeof v === 'string') return v.trim();
            if (v && typeof v === 'object') return String(v.name || v.original_name || '').trim();
            return '';
        }).filter(Boolean);
    }
    if (typeof val === 'string') return val.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    return [];
}

function mapMovieData(item) {
    const categories = Array.isArray(item.category)
        ? item.category.map(c => c.name || c).filter(Boolean)
        : [];

    let type = 'Phim Lẻ';
    const epCur = item.episode_current == null ? '' : String(item.episode_current);
    const typeRaw = String(item.type || '').toLowerCase();
    if (typeRaw === 'series' || typeRaw === 'hoathinh' || typeRaw === 'tvshows' || typeRaw === 'tv-shows'
        || Number(item.episode_total) > 1 || epCur.includes('Tập') || epCur.includes('Hoàn')) {
        type = typeRaw === 'hoathinh' ? 'Hoạt hình' : 'Phim Bộ';
    } else if (typeRaw === 'single' || typeRaw === 'phimle') {
        type = 'Phim Lẻ';
    }

    let status = 'Đang cập nhật';
    if (item.status === 'completed') status = 'Hoàn thành';
    else if (item.status === 'ongoing') status = 'Đang chiếu';
    else if (item.chieurap) status = 'Đang chiếu rạp';

    let ratingRaw = (item.tmdb && item.tmdb.vote_average) || (item.imdb && item.imdb.rating) || item.rating || 0;
    ratingRaw = parseFloat(ratingRaw) || 0;
    const rating = ratingRaw > 0 ? ratingRaw.toFixed(1) : 'N/A';
    const imdbId = (item.imdb && item.imdb.id) ? item.imdb.id : null;
    const tmdbId = (item.tmdb && item.tmdb.id) ? item.tmdb.id : null;
    const tmdbType = (item.tmdb && item.tmdb.type) ? item.tmdb.type : 'movie';
    const summaryRaw = item.content || '';
    const summary = (typeof stripHtml === 'function' ? stripHtml(summaryRaw) : String(summaryRaw).replace(/<[^>]*>/g, ' ')).trim() || 'Chưa có tóm tắt';

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
        summary: summary,
        episodes: item.episodes || [],
        quality: item.quality || 'HD',
        lang: item.lang || 'Vietsub',
        episode_total: item.episode_total || 0,
        actors: asNameList(item.actor),
        directors: asNameList(item.director),
        trailer: item.trailer_url || ''
    };
}
