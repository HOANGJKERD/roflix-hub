// ============================================================
// VidSrc — optional embed helper (tester style)
// Chỉ dùng khi user chọn / khi có IMDb hoặc TMDB ID
// Không thay thế playback KKPhim/VSMOV mặc định
// ============================================================
(function (w) {
  'use strict';

  var BASE = 'https://vidsrc.sh';

  function pickId(movie) {
    if (!movie) return null;
    return movie.imdbId || movie.tmdbId || movie.imdb_id || movie.tmdb_id || null;
  }

  function isTv(movie) {
    if (!movie) return false;
    if (movie.tmdbType === 'tv') return true;
    var t = String(movie.type || '').toLowerCase();
    if (t.indexOf('bộ') >= 0 || t.indexOf('hoạt') >= 0 || t === 'series' || t === 'tv') return true;
    return Number(movie.episode_total) > 1;
  }

  /** Build embed URL giống https://vidsrc.sh/#tester */
  function buildEmbedUrl(movie, season, episode) {
    var id = pickId(movie);
    if (!id) return null;
    if (isTv(movie)) {
      if (season != null && episode != null) {
        return BASE + '/embed/tv/' + encodeURIComponent(id) + '/' + season + '/' + episode;
      }
      // Series picker (như tester "Stranger Things")
      return BASE + '/embed/tv/' + encodeURIComponent(id);
    }
    return BASE + '/embed/movie/' + encodeURIComponent(id);
  }

  /** Gán iframe #movie-player = embed VidSrc */
  function loadIntoPlayer(movie, season, episode) {
    var url = buildEmbedUrl(movie, season, episode);
    if (!url) return false;
    var player = document.getElementById('movie-player');
    if (!player) return false;
    // Dừng anime player nếu đang chạy
    try { if (w.roflixAnimePlayer && w.roflixAnimePlayer.stop) w.roflixAnimePlayer.stop(); } catch (_) {}
    player.src = url;
    return true;
  }

  function hasIds(movie) {
    return !!pickId(movie);
  }

  w.RoflixVidSrc = {
    base: BASE,
    pickId: pickId,
    isTv: isTv,
    buildEmbedUrl: buildEmbedUrl,
    loadIntoPlayer: loadIntoPlayer,
    hasIds: hasIds
  };

  console.log('[RoFlix] VidSrc optional helper ready');
})(window);
