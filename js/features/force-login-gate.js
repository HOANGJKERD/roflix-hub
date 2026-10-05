/* RoFlix force-login gate: email/password only. Google disabled. */
(function () {
  'use strict';
  if (window.__RF_FORCE_LOGIN_GATE__) return;
  window.__RF_FORCE_LOGIN_GATE__ = true;
  const sb = window.rfSupabase;
  let settings = { force_site_login: true, lock_18_plus: true, force_login_for_locked: true };

  async function loadSettings() {
    if (!sb) return settings;
    try {
      const r = await sb.from('roflix_movie_settings').select('force_site_login,lock_18_plus,force_login_for_locked').eq('id', true).maybeSingle();
      if (r.data) settings = Object.assign(settings, r.data);
    } catch (_) {}
    return settings;
  }
  async function currentUser() {
    try {
      const r = await sb?.auth?.getUser?.();
      return r?.data?.user || null;
    } catch (_) { return null; }
  }
  function overlay() {
    let el = document.getElementById('rf-login-gate');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'rf-login-gate';
    el.innerHTML = `<div class="rf-login-gate-card">
      <div class="rf-login-gate-mark"><i class="fa-solid fa-lock"></i></div>
      <h2>Đăng nhập để xem RoFlix</h2>
      <p>Tạo tài khoản email/mật khẩu hoặc đăng nhập. Google đã tắt.</p>
      <div class="rf-login-gate-actions">
        <button type="button" class="rf-login-gate-btn" data-mode="login">Đăng nhập</button>
        <button type="button" class="rf-login-gate-btn ghost" data-mode="register">Tạo tài khoản</button>
      </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof openAuthModal === 'function') openAuthModal(btn.dataset.mode);
      });
    });
    return el;
  }
  async function enforce(force) {
    await loadSettings();
    const need = force || settings.force_site_login !== false;
    const user = await currentUser();
    const gate = overlay();
    if (need && !user) {
      gate.classList.add('open');
      document.body.classList.add('rf-login-required');
      return false;
    }
    gate.classList.remove('open');
    document.body.classList.remove('rf-login-required');
    return true;
  }
  window.rfRequireAccount = enforce;
  window.rfHasAccount = async () => !!(await currentUser());

  const nav = window.navigateTo;
  if (typeof nav === 'function' && !nav.__rfLoginGate) {
    window.navigateTo = async function (id) {
      if (id === 'main-site' || id === 'detail-page' || id === 'play-page' || id === 'profile-page') {
        const ok = await enforce();
        if (!ok) {
          if (typeof openAuthModal === 'function') openAuthModal('login');
          return;
        }
      }
      return nav.apply(this, arguments);
    };
    window.navigateTo.__rfLoginGate = true;
  }

  window.mockGoogleAuth = async function () {
    if (typeof showToast === 'function') showToast('info', 'Google đã tắt', 'Hãy đăng nhập bằng email và mật khẩu.');
    if (typeof openAuthModal === 'function') openAuthModal('login');
    return false;
  };

  function boot() {
    loadSettings().then(() => enforce());
    sb?.auth?.onAuthStateChange?.(() => enforce());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
