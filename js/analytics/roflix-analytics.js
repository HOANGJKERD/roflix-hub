(function () {
  'use strict';

  const sb = window.rfSupabase;
  if (!sb) {
    console.warn('[RoFlix Analytics] Supabase client chưa sẵn sàng.');
    return;
  }

  const SESSION_KEY = 'roflix-analytics-session-id';
  const makeId = () => {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'rf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
  };

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) { sessionId = makeId(); localStorage.setItem(SESSION_KEY, sessionId); }
  let current = { page: 'main-site', movieSlug: null, movieTitle: null };
  let lastPageEvent = '';
  let lastMovieEvent = '';

  let authenticated = false;
  async function refreshAuth() {
    try { const result = await sb.auth.getSession(); authenticated = !!result?.data?.session?.user; }
    catch (_) { authenticated = false; }
    return authenticated;
  }
  async function track(eventType, extra = {}) {
    if (!(await refreshAuth())) return; // analytics RPCs are intentionally not exposed to anon
    try { const { error } = await sb.rpc('roflix_track_event', { p_event_type: eventType, p_session_id: sessionId, p_page: extra.page ?? current.page, p_movie_slug: extra.movieSlug ?? current.movieSlug, p_movie_title: extra.movieTitle ?? current.movieTitle, p_metadata: extra.metadata || {} }); if (error && error.code !== 'PGRST301') console.debug('[RoFlix Analytics] track skipped:', error.message); }
    catch (error) { console.debug('[RoFlix Analytics] track skipped:', error?.message || error); }
  }
  async function heartbeat() {
    if (!(await refreshAuth())) return; // avoid expected 401 for signed-out visitors
    try { const { error } = await sb.rpc('roflix_heartbeat', { p_session_id: sessionId, p_page: current.page, p_movie_slug: current.movieSlug, p_movie_title: current.movieTitle }); if (error && error.code !== 'PGRST301') console.debug('[RoFlix Analytics] heartbeat skipped:', error.message); }
    catch (error) { console.debug('[RoFlix Analytics] heartbeat skipped:', error?.message || error); }
  }
  function trackPage(page) {
    current.page = page || current.page;
    const key = current.page + '|' + location.pathname;
    if (key !== lastPageEvent) { lastPageEvent = key; track('page_view', { page: current.page }); }
    heartbeat();
  }
  function trackMovie(type, slug, title) {
    current.movieSlug = slug || current.movieSlug; current.movieTitle = title || current.movieTitle;
    const key = type + '|' + (slug || '') + '|' + sessionId;
    if (key !== lastMovieEvent) { lastMovieEvent = key; track(type, { movieSlug: slug, movieTitle: title }); }
    heartbeat();
  }

  window.rfAnalytics = { sessionId, track, heartbeat, page: trackPage, movie: trackMovie };
  const originalNavigate = window.navigateTo;
  if (typeof originalNavigate === 'function') {
    window.navigateTo = function (target) { const result = originalNavigate.apply(this, arguments); trackPage(target || 'unknown'); return result; };
  }
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN') track('login'); if (event === 'SIGNED_OUT') track('logout'); if (event === 'USER_UPDATED') heartbeat(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });
  trackPage('landing-page');
  heartbeat();
  setInterval(heartbeat, 60000);

  // Production runtime loader. It is intentionally after the Supabase client and analytics setup.
  if (!document.querySelector('script[data-roflix-production]')) {
    const s = document.createElement('script');
    s.src = 'js/features/roflix-production.js?v=1';
    s.dataset.roflixProduction = '1';
    s.async = false;
    document.head.appendChild(s);
  }
})();
