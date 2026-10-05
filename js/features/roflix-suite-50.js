/* RoFlix public UI cleanup.
 *
 * This legacy file used to inject an unsolicited "suite" toolbar into the
 * public movie page and mutate admin labels. Keep the script entrypoint for
 * deployment compatibility, but do not inject UI or trigger feature bootstraps.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_SUITE_50__) return;
  window.__ROFLIX_SUITE_50__ = true;
})();
