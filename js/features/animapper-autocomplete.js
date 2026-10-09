/* AniMapper Autocomplete integration for RoFlix Hub.
 * Docs: https://animapper.net/docs/api/api-autocomplete/
 * Suggestions are for anime titles; selecting one uses RoFlix's existing search flow.
 */
(function () {
  'use strict';

  const API = 'https://api.animapper.net/api/v1/autocomplete';
  const INPUTS = [
    { id: 'search-input', handler: 'handleSearch' },
    { id: 'search-input-mobile', handler: 'handleSearchMobile' }
  ];
  const timers = new WeakMap();
  const controllers = new WeakMap();
  const cache = new Map();

  const style = document.createElement('style');
  style.textContent = `
    .rf-anime-suggest-wrap{position:relative!important}
    .rf-anime-suggestions{position:absolute;z-index:10000;top:calc(100% + 8px);left:0;right:0;display:none;max-height:320px;overflow:auto;background:#11131f;border:1px solid #34384c;border-radius:14px;box-shadow:0 18px 50px #0009;padding:6px}
    .rf-anime-suggestions.open{display:block}
    .rf-anime-suggestion{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:9px;background:transparent;color:#f3f4f6;text-align:left;cursor:pointer}
    .rf-anime-suggestion:hover,.rf-anime-suggestion:focus{background:#292d40;outline:none}
    .rf-anime-suggestion .rf-as-title{font-size:13px;font-weight:750;line-height:1.35}
    .rf-anime-suggestion .rf-as-tag{margin-left:auto;flex:none;font-size:10px;color:#fbbf24;border:1px solid #7c5b1c;border-radius:999px;padding:3px 6px}
    .rf-anime-suggest-status{padding:10px 12px;color:#9ca3af;font-size:12px}
  `;
  document.head.appendChild(style);

  function safeText(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function setup(input, handlerName) {
    if (!input || input.dataset.rfAutocompleteReady) return;
    input.dataset.rfAutocompleteReady = '1';
    const parent = input.parentElement;
    if (!parent) return;
    parent.classList.add('rf-anime-suggest-wrap');

    const panel = document.createElement('div');
    panel.className = 'rf-anime-suggestions';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Gợi ý anime');
    parent.appendChild(panel);

    function close() {
      panel.classList.remove('open');
      input.setAttribute('aria-expanded', 'false');
    }
    function showStatus(message) {
      panel.innerHTML = '<div class="rf-anime-suggest-status">' + safeText(message) + '</div>';
      panel.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
    }
    function choose(item) {
      input.value = item.title;
      close();
      const otherId = input.id === 'search-input' ? 'search-input-mobile' : 'search-input';
      const other = document.getElementById(otherId);
      if (other) other.value = item.title;
      if (typeof window[handlerName] === 'function') window[handlerName]();
      else input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function render(items) {
      if (!items.length) { close(); return; }
      panel.innerHTML = items.map((item, i) =>
        '<button type="button" class="rf-anime-suggestion" role="option" data-index="' + i + '">' +
          '<span aria-hidden="true">🎌</span><span class="rf-as-title">' + safeText(item.title) + '</span>' +
          '<span class="rf-as-tag">ANIME</span></button>'
      ).join('');
      panel.querySelectorAll('.rf-anime-suggestion').forEach((button, i) => {
        button.addEventListener('click', () => choose(items[i]));
      });
      panel.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
    }
    async function lookup(query) {
      const key = query.toLocaleLowerCase();
      if (cache.has(key)) { render(cache.get(key)); return; }
      const old = controllers.get(input);
      if (old) old.abort();
      const controller = new AbortController();
      controllers.set(input, controller);
      showStatus('Đang tìm gợi ý anime…');
      try {
        const url = API + '?q=' + encodeURIComponent(query) + '&mediaType=ANIME&locale=vi&limit=7';
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions.filter(x => x && x.title && x.mediaType === 'ANIME').slice(0, 7)
          : [];
        cache.set(key, suggestions);
        if (input.value.trim() === query) render(suggestions);
      } catch (error) {
        if (error.name !== 'AbortError') close();
      }
    }

    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', () => {
      clearTimeout(timers.get(input));
      const query = input.value.trim();
      if (query.length < 2) { close(); return; }
      timers.set(input, setTimeout(() => lookup(query), 220));
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowDown' && panel.classList.contains('open')) {
        const first = panel.querySelector('button');
        if (first) { event.preventDefault(); first.focus(); }
      }
    });
    input.addEventListener('focus', () => {
      const query = input.value.trim();
      if (query.length >= 2 && cache.has(query.toLocaleLowerCase())) render(cache.get(query.toLocaleLowerCase()));
    });
    document.addEventListener('click', event => {
      if (!parent.contains(event.target)) close();
    });
  }

  function init() {
    INPUTS.forEach(item => setup(document.getElementById(item.id), item.handler));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  const observer = new MutationObserver(init);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
