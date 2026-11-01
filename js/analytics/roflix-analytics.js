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

  async function track(eventType, extra = {}) {
    try { const { error } = await sb.rpc('roflix_track_event', { p_event_type: eventType, p_session_id: sessionId, p_page: extra.page ?? current.page, p_movie_slug: extra.movieSlug ?? current.movieSlug, p_movie_title: extra.movieTitle ?? current.movieTitle, p_metadata: extra.metadata || {} }); if (error && error.code !== 'PGRST301') console.debug('[RoFlix Analytics] track skipped:', error.message); }
    catch (error) { console.debug('[RoFlix Analytics] track skipped:', error?.message || error); }
  }
  async function heartbeat() {
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

  // Measure actual playback only for same-origin HTML5 video elements.
  // Cross-origin provider iframes are deliberately not guessed as watched time.
  const videoState = new WeakMap();
  function attachVideo(video){
    if(videoState.has(video))return;
    const state={last:0,lastSent:0};videoState.set(video,state);
    video.addEventListener('playing',()=>{state.last=Number(video.currentTime)||0;state.lastSent=Date.now();});
    video.addEventListener('pause',()=>{state.last=Number(video.currentTime)||0;});
    video.addEventListener('ended',()=>{const d=Number(video.duration);const delta=Math.max(0,Math.min(30,(Number(video.currentTime)||0)-state.last));sendProgress(video,delta,d);state.last=Number(video.currentTime)||0;});
  }
  async function sendProgress(video,seconds,duration){
    if(!current.movieSlug||seconds<=0)return;
    try{const {error}=await sb.rpc('roflix_record_watch_progress',{p_session_id:sessionId,p_movie_slug:current.movieSlug,p_movie_title:current.movieTitle,p_seconds:Math.min(30,Math.round(seconds)),p_duration_seconds:Number.isFinite(duration)&&duration>0?Math.round(duration):null});if(error)console.debug('[RoFlix Analytics] progress skipped:',error.message);}catch(e){console.debug('[RoFlix Analytics] progress skipped:',e?.message||e);}
  }
  function scanVideos(root=document){if(root.matches?.('video'))attachVideo(root);root.querySelectorAll?.('video').forEach(attachVideo);}
  scanVideos();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)scanVideos(node);}))).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{
    if(document.hidden)return;
    document.querySelectorAll('video').forEach(video=>{
      const s=videoState.get(video);if(!s||video.paused||video.ended||!Number.isFinite(video.currentTime))return;
      const now=Date.now(),position=Number(video.currentTime)||0,delta=Math.max(0,Math.min(30,position-s.last));
      if(delta>=1&&now-s.lastSent>=10000){s.last=position;s.lastSent=now;sendProgress(video,delta,Number(video.duration));}
      else if(delta>0)s.last=position;
    });
  },5000);

  const originalNavigate = window.navigateTo;
  if (typeof originalNavigate === 'function') {
    window.navigateTo = function (target) { const result = originalNavigate.apply(this, arguments); trackPage(target || 'unknown'); return result; };
  }
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN') track('login'); if (event === 'SIGNED_OUT') track('logout'); if (event === 'USER_UPDATED') heartbeat(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });
  trackPage('landing-page');
  heartbeat();
  setInterval(heartbeat, 30000);

  // Production runtime loader. It is intentionally after the Supabase client and analytics setup.
  if (!document.querySelector('script[data-roflix-production]')) {
    const s = document.createElement('script');
    s.src = 'js/features/roflix-production.js?v=1';
    s.dataset.roflixProduction = '1';
    s.async = false;
    document.head.appendChild(s);
  }
})();
