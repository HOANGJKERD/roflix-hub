/* RoFlix compact header menu. Single source of truth for secondary header items. */
(function () {
  'use strict';
  if (window.__ROFLIX_HEADER_HAMBURGER__) return;
  window.__ROFLIX_HEADER_HAMBURGER__ = true;

  const getText = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  function isSecondary(el) {
    if (!el || el.closest('#rf-hamburger-menu,#rf-hamburger-button')) return false;
    const text = getText(el);
    const onclick = el.getAttribute('onclick') || '';
    return /^xem\s*tiếp$/i.test(text)
      || /^random$/i.test(text)
      || /ngẫu\s*nhiên/i.test(text)
      || /filterBy\(['\"]rating['\"]\s*,\s*9/i.test(onclick)
      || /\bbxh\b/i.test(text);
  }

  /* Completely remove secondary items from the visible header layout.
     Do not only mark them with data attributes, because the old header
     still reserves space for them and can create duplicate "Xem tiếp". */
  function hideOldItems() {
    const header = document.querySelector('header.header-ios');
    if (!header) return;
    header.querySelectorAll('a,button').forEach(el => {
      if (!isSecondary(el)) return;
      el.dataset.rfSecondaryHidden = 'true';
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function findOriginal(patterns) {
    return [...document.querySelectorAll('header.header-ios a,header.header-ios button')].find(el => {
      if (el.closest('#rf-hamburger-menu,#rf-hamburger-button')) return false;
      const value = `${getText(el)} ${el.getAttribute('onclick') || ''}`;
      return patterns.some(re => re.test(value));
    });
  }

  function runAction(type) {
    if (type === 'continue') {
      const target = findOriginal([/xem\s*tiếp/i, /continue/i]);
      if (target) { target.click(); return; }
      const ids = ['continue-watching-section', 'continue-watching', 'watch-continue', 'section-continue'];
      const el = ids.map(id => document.getElementById(id)).find(Boolean);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (type === 'random') {
      const target = findOriginal([/^\s*🎲?\s*random\s*$/i, /ngẫu\s*nhiên/i, /random/i]);
      if (target) { target.click(); return; }
      for (const name of ['randomMovie', 'playRandomMovie', 'showRandomMovie', 'openRandomMovie']) {
        if (typeof window[name] === 'function') { window[name](); return; }
      }
      return;
    }
    const target = findOriginal([/filterBy\(['\"]rating['\"]\s*,\s*9/i, /\bbxh\b/i]);
    if (target) { target.click(); return; }
    if (typeof window.filterBy === 'function') window.filterBy('rating', 9);
  }

  function closeMenu() {
    const button = document.getElementById('rf-hamburger-button');
    const menu = document.getElementById('rf-hamburger-menu');
    if (!button || !menu) return;
    button.classList.remove('is-open');
    menu.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  }

  function init() {
    const header = document.querySelector('header.header-ios');
    if (!header || document.getElementById('rf-hamburger-button')) return;
    const inner = header.firstElementChild;
    if (!inner) return;
    const actions = inner.lastElementChild;
    if (!actions) return;

    actions.classList.add('rf-header-actions-host');

    const button = document.createElement('button');
    button.id = 'rf-hamburger-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Mở menu phụ');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span></span><span></span><span></span>';

    const menu = document.createElement('div');
    menu.id = 'rf-hamburger-menu';
    menu.innerHTML = '<button type="button" data-action="continue"><i class="fa-solid fa-clock-rotate-left"></i><span>Xem tiếp</span></button><button type="button" data-action="random"><i class="fa-solid fa-shuffle"></i><span>Random</span></button><button type="button" data-action="rating"><i class="fa-solid fa-ranking-star"></i><span>BXH</span></button>';

    actions.appendChild(button);
    actions.appendChild(menu);

    button.addEventListener('click', e => {
      e.stopPropagation();
      const open = !menu.classList.contains('is-open');
      if (open) menu.classList.add('is-open'); else menu.classList.remove('is-open');
      button.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', e => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      e.stopPropagation();
      const action = item.dataset.action;
      closeMenu();
      runAction(action);
    });

    document.addEventListener('click', e => {
      if (!header.contains(e.target)) closeMenu();
    });

    hideOldItems();
    /* Re-apply once after other header scripts finish rendering. */
    setTimeout(hideOldItems, 250);
    setTimeout(hideOldItems, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
