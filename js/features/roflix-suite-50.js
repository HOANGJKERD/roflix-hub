/* RoFlix suite labels: Cloud Sync 4.0, Schedule 3.0, Comments 3.0, Watch Party 3.0, Gacha 4.0, Admin 5.0, Mobile 3.0 */
(function () {
  'use strict';
  if (window.__ROFLIX_SUITE_50__) return;
  window.__ROFLIX_SUITE_50__ = true;
  function injectBar() {
    const host = document.getElementById('roflix-upgrade-toolbar');
    if (!host || document.getElementById('rf-suite-50')) return;
    const bar = document.createElement('div');
    bar.id = 'rf-suite-50';
    bar.className = 'rf-suite-bar';
    bar.innerHTML = [
      '☁️ Cloud Sync 4.0',
      '📅 Lịch phim 3.0',
      '💬 Comment realtime 3.0',
      '🎬 Watch Party 3.0',
      '🎴 Gacha 4.0',
      '🛡️ Admin 5.0',
      '🎨 Mobile 3.0'
    ].map(t => `<span class="rf-suite-chip">${t}</span>`).join('');
    host.prepend(bar);
  }
  function bumpAdmin() {
    const brand = document.querySelector('.sidebar .badge');
    if (brand) brand.textContent = '5.0';
    const title = document.getElementById('top-title');
    if (title && /Admin Center/.test(title.textContent || '')) title.textContent = 'RoFlix Admin Dashboard 5.0';
  }
  function boot() {
    injectBar();
    bumpAdmin();
    if (typeof window.rfCloudSync2 === 'function') {
      window.rfCloudSync4 = window.rfCloudSync2;
      window.rfCloudSync2();
    }
    if (typeof window.rfRenderSchedule2 === 'function') window.rfRenderSchedule2();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
