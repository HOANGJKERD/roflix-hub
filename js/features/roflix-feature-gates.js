/* RoFlix Feature Gates 6.1
 * Client-side enforcement for Admin 6 feature flags.
 * This is a UX/safety layer only. Sensitive authorization remains server-side.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_FEATURE_GATES_61__) return;
  window.__ROFLIX_FEATURE_GATES_61__ = true;

  const sb = window.rfSupabase;
  const FLAGS = ['maintenance_mode','playback_enabled','comments_enabled','gacha_enabled','registration_enabled','watch_party_enabled','cloud_sync_enabled'];
  const state = Object.fromEntries(FLAGS.map(k => [k, true]));
  let channel = null;
  let overlay = null;

  function isAdminPage() { return /(^|\/)admin\.html(?:$|[?#])/i.test(location.pathname); }
  function toast(message) { window.showToast?.('warning', 'RoFlix', message); }

  function ensureOverlay() {
    if (overlay || isAdminPage()) return;
    const style = document.createElement('style');
    style.id = 'rf-feature-gates-style';
    style.textContent = `
      #rf-maintenance-gate{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(5,7,12,.94);backdrop-filter:blur(18px)}
      #rf-maintenance-gate.show{display:flex}#rf-maintenance-gate .card{max-width:520px;text-align:center;padding:32px;border:1px solid rgba(245,158,11,.25);border-radius:24px;background:rgba(17,21,33,.94);box-shadow:0 30px 100px rgba(0,0,0,.55);color:#fff;font-family:system-ui,-apple-system,sans-serif}
      #rf-maintenance-gate h2{font-size:28px;margin:0 0 10px;font-weight:900}#rf-maintenance-gate p{color:#94a3b8;line-height:1.6;margin:0}
      [data-roflix-feature-disabled="1"]{display:none!important}
    `;
    document.head.appendChild(style);
    overlay = document.createElement('div');
    overlay.id = 'rf-maintenance-gate';
    overlay.innerHTML = '<div class="card"><div style="font-size:44px">🛠️</div><h2>RoFlix đang bảo trì</h2><p id="rf-maintenance-message">Hệ thống tạm thời bảo trì. Vui lòng quay lại sau.</p></div>';
    document.body.appendChild(overlay);
  }

  function setHidden(selector, disabled) {
    document.querySelectorAll(selector).forEach(el => {
      el.dataset.roflixFeatureDisabled = disabled ? '1' : '0';
      if (!disabled) el.removeAttribute('data-roflix-feature-disabled');
    });
  }

  function apply() {
    if (isAdminPage()) return;
    ensureOverlay();
    if (overlay) {
      overlay.classList.toggle('show', state.maintenance_mode === false);
      const msg = overlay.querySelector('#rf-maintenance-message');
      if (msg && state.maintenance_message) msg.textContent = state.maintenance_message;
    }
    setHidden('#gacha-btn,.rf-gacha-10,.gacha-btn', state.gacha_enabled === false);
    setHidden('#rf-cloud-open,#rf-shortcut-cloud', state.cloud_sync_enabled === false);
    setHidden('[data-watch-party],#watch-party-btn,#watch-party-open', state.watch_party_enabled === false);
    setHidden('[data-comment-feature],#comments-section,#movie-comments,#community-comments', state.comments_enabled === false);
    setHidden('[data-register],#register-btn,#register-button', state.registration_enabled === false);
    if (state.playback_enabled === false) {
      document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (_) {} });
      setHidden('[data-playback-control],#play-btn,#play-button', true);
    } else {
      setHidden('[data-playback-control],#play-btn,#play-button', false);
    }
  }

  async function load() {
    if (!sb || isAdminPage()) return;
    const r = await sb.from('roflix_admin_feature_flags').select('key,enabled,config').in('key', FLAGS);
    if (r.error) return;
    (r.data || []).forEach(x => {
      state[x.key] = !!x.enabled;
      if (x.key === 'maintenance_mode') state.maintenance_message = x.config?.message || 'RoFlix đang bảo trì. Vui lòng quay lại sau.';
    });
    apply();
  }

  function subscribe() {
    if (!sb || isAdminPage() || channel) return;
    channel = sb.channel('roflix-feature-gates-61')
      .on('postgres_changes', {event:'*', schema:'public', table:'roflix_admin_feature_flags'}, payload => {
        const row = payload.new || {};
        if (!FLAGS.includes(row.key)) return;
        state[row.key] = !!row.enabled;
        if (row.key === 'maintenance_mode') state.maintenance_message = row.config?.message || 'RoFlix đang bảo trì. Vui lòng quay lại sau.';
        apply();
        if (state[row.key] === false && row.key !== 'maintenance_mode') toast(`Tính năng ${row.key} vừa được Admin tắt.`);
      })
      .subscribe();
  }

  const observer = new MutationObserver(() => apply());
  function start() {
    ensureOverlay();
    load();
    subscribe();
    observer.observe(document.body, {childList:true, subtree:true});
    window.roflixFeatureFlags = state;
    window.roflixFeatureEnabled = key => state[key] !== false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
