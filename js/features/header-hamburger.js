/* RoFlix compact header menu
 * Moves secondary navigation into a 3-line hamburger menu.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_HEADER_HAMBURGER__) return;
  window.__ROFLIX_HEADER_HAMBURGER__ = true;

  const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  function findAction(patterns) {
    const nodes = [...document.querySelectorAll('header a, header button, header [role="button"]')];
    return nodes.find((el) => {
      if (el.closest('#rf-hamburger-menu, #rf-hamburger-button')) return false;
      const value = `${text(el)} ${el.getAttribute('onclick') || ''}`.toLowerCase();
      return patterns.some((p) => p.test(value));
    });
  }

  function trigger(patterns, fallback) {
    const target = findAction(patterns);
    if (target) {
      target.click();
      return;
    }
    if (typeof fallback === 'function') fallback();
  }

  function scrollToContinue() {
    const ids = ['continue-watching-section', 'continue-watching', 'watch-continue', 'section-continue'];
    const el = ids.map((id) => document.getElementById(id)).find(Boolean);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const target = [...document.querySelectorAll('section, div, h2, h3')].find((el) => /xem tiếp/i.test(text(el)) && el.offsetParent !== null);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideSecondaryHeaderItems() {
    const selectors = [
      'header a[onclick*="filterBy(\'rating\', 9)"]',
      'header a[onclick*="rating"]'
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => { el.dataset.rfHiddenSecondary = '1'; el.style.display = 'none'; });
    });

    const labels = [/^xem tiếp$/i, /^random$/i, /^ngẫu nhiên$/i, /^🎲\s*random$/i];
    document.querySelectorAll('header a, header button').forEach((el) => {
      if (el.closest('#rf-hamburger-menu, #rf-hamburger-button')) return;
      const label = text(el);
      if (labels.some((re) => re.test(label))) {
        el.dataset.rfHiddenSecondary = '1';
        el.style.display = 'none';
      }
    });
  }

  function buildMenu() {
    const header = document.querySelector('header.header-ios');
    if (!header || document.getElementById('rf-hamburger-button')) return;

    const inner = header.firstElementChild;
    if (!inner) return;

    const button = document.createElement('button');
    button.id = 'rf-hamburger-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Mở menu phụ');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span></span><span></span><span></span>';

    const menu = document.createElement('div');
    menu.id = 'rf-hamburger-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `
      <button type="button" data-rf-action="continue"><i class="fa-solid fa-clock-rotate-left"></i><span>Xem tiếp</span></button>
      <button type="button" data-rf-action="random"><i class="fa-solid fa-shuffle"></i><span>Random</span></button>
      <button type="button" data-rf-action="rating"><i class="fa-solid fa-ranking-star"></i><span>BXH</span></button>
    `;

    const anchor = inner.querySelector('div.flex.items-center.gap-6') || inner.firstElementChild;
    const actions = inner.lastElementChild;
    const host = actions || inner;
    host.insertBefore(button, host.firstChild);
    host.appendChild(menu);

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = menu.classList.toggle('is-open');
      button.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-rf-action]');
      if (!item) return;
      const action = item.dataset.rfAction;
      menu.classList.remove('is-open');
      button.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');

      if (action === 'continue') {
        trigger([/xem\s*tiếp/i, /continue/i], scrollToContinue);
      } else if (action === 'random') {
        trigger([/^\s*🎲?\s*random\s*$/i, /ngẫu\s*nhiên/i, /random/i], () => {
          ['randomMovie', 'playRandomMovie', 'showRandomMovie', 'openRandomMovie'].some((name) => {
            if (typeof window[name] === 'function') { window[name](); return true; }
            return false;
          });
        });
      } else if (action === 'rating') {
        trigger([/filterBy\(['\"]rating['\"]\s*,\s*9/i, /\bbxh\b/i], () => {
          if (typeof window.filterBy === 'function') window.filterBy('rating', 9);
        });
      }
    });

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) {
        menu.classList.remove('is-open');
        button.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      }
    });

    hideSecondaryHeaderItems();
  }

  function init() {
    buildMenu();
    hideSecondaryHeaderItems();
    setTimeout(buildMenu, 400);
    setTimeout(hideSecondaryHeaderItems, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
