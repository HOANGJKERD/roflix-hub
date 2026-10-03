/* RoFlix: watch-time Gem rewards are intentionally disabled. */
(function(){
  'use strict';
  function disable(){
    try {
      if (window.rfGemWatchTimer) {
        clearInterval(window.rfGemWatchTimer);
        window.rfGemWatchTimer = null;
      }
    } catch(_) {}
    try { window.rfGrantWatchGem = function(){}; } catch(_) {}
    try { window.rfWatchRewardTick = function(){}; } catch(_) {}
    try { window.rfStartWatchGemReward = function(){}; } catch(_) {}
  }
  disable();
  setTimeout(disable,50);
  setTimeout(disable,250);
  setTimeout(disable,1000);
})();
