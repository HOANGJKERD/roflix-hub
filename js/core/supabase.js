(function () {
  const cfg = window.ROFLIX_SUPABASE;
  if (!cfg || !window.supabase?.createClient) {
    console.error('[RoFlix] Supabase JS chưa sẵn sàng.');
    return;
  }
  window.rfSupabase = window.supabase.createClient(cfg.url, cfg.publishableKey);
})();
