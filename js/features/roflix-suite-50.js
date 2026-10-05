/* RoFlix public UI cleanup.
 *
 * The public movie page should not show an unsolicited feature/upgrade
 * toolbar. Keep this legacy entrypoint for deployment compatibility, but hide
 * the old toolbar container if another legacy module creates it.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_SUITE_50__) return;
  window.__ROFLIX_SUITE_50__ = true;

  function hideLegacyToolbar() {
    const host = document.getElementById('roflix-upgrade-toolbar');
    if (!host) return;
    host.hidden = true;
    host.setAttribute('aria-hidden', 'true');
    host.style.display = 'none';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideLegacyToolbar, { once: true });
  } else {
    hideLegacyToolbar();
  }
})();
