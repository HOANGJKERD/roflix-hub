/* RoFlix compact header menu. Single source of truth for secondary header items. */
(function () {
  'use strict';
  if (window.__ROFLIX_HEADER_HAMBURGER__) return;
  window.__ROFLIX_HEADER_HAMBURGER__ = true;

  const getText = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  let originalActions = { continue: null, random: null, rating: null };

  function getActionType(el) {
    if (!el || el.closest('#rf-hamburger-menu,#rf-hamburger-button')) return null;
    const text = getText(el);
    const onclick = el.getAttribute('onclick') || '';
    if (/^xem\s*tiếp$/i.test(text) || /continue/i.test(onclick)) return 'continue';
    if (/^random$/i.test(text) || /ngẫu\s*nhiên/i.test(text) || /random/i.test(onclick)) return 'random';
    if (/filterBy\(['\"]rating['\"]\s*,\s*9/i.test(onclick) || /\bbxh\b/i.test(text)) return 'rating';
    return null;
  }

  function hideOldItems() {
    const header = document.querySelector('header.header-ios');
    if (!header) return;

    header.querySelectorAll('a,button').forEach(el => {
      const type = getActionType(el);
      if (!type) return;

      if (!originalActions[type]) {
        originalActions[type] = () => {
          try {
            el.click();
          } catch (_) {}
        };
      }

      /* Keep the original handler available, but remove the old control from
         the visual/header layout so the hamburger is the only visible copy. */
      el.dataset.rfSecondaryHidden = 'true';
      el.setAttribute('aria-hidden', 'true');
      el.hidden = true;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function runAction(type) {
    const original = originalActions[type];
    if (original) {
      original();
      return;
    }

    if (type === 'continue') {
      const ids = ['continue-watching-section', 'continue-watching', 'watch-continue', 'section-continue'];
      const el = ids.map(id => document.getElementById(id)).find(Boolean);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (type === 'random') {
      for (const name of ['randomMovie', 'playRandomMovie', 'showRandomMovie', 'openRandomMovie']) {
        if (typeof window[name] === 'function') {
          window[name]();
          return;
        }
      }
      return;
    }

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
      hideOldItems();
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
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

    /* Header items can be re-rendered by other UI modules. Keep the header
       single-source-of-truth even when another script inserts the old links. */
    const observer = new MutationObserver(() => hideOldItems());
    observer.observe(header, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
