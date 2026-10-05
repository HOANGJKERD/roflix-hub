/* RoFlix public-access compatibility shim.
 *
 * Public browsing and playback must NOT require an account.
 * Authentication is required only by the 18+ movie gate in movie-lock-ui.js.
 * Keep this file because index.html still loads it in deployed builds, but
 * intentionally remove the old site-wide login overlay/navigation blocker.
 */
(function () {
  'use strict';

  if (window.__RF_PUBLIC_ACCESS_SHIM__) return;
  window.__RF_PUBLIC_ACCESS_SHIM__ = true;

  // Legacy callers may still invoke this helper. Public pages are always allowed.
  window.rfRequireAccount = async function () {
    return true;
  };

  window.rfHasAccount = async function () {
    try {
      const user = await window.rfSupabase?.auth?.getUser?.();
      return !!user?.data?.user;
    } catch (_) {
      return false;
    }
  };
})();
