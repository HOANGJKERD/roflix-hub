/* RoFlix public shortcut bar.
 * Keep the public movie UI clean while restoring the three user-requested
 * shortcuts: Collection, Device Sync, and Admin.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_SUITE_50__) return;
  window.__ROFLIX_SUITE_50__ = true;

  function css() {
    if (document.getElementById('rf-public-shortcuts-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-public-shortcuts-css';
    style.textContent = `
      #rf-public-shortcuts {
        position: fixed;
        top: 14px;
        right: 18px;
        z-index: 99980;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 999px;
        background: rgba(15,18,27,.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 0 12px 36px rgba(0,0,0,.28);
      }
      /* cloud-center.js owns its legacy launcher; this bar is the only public launcher. */
      #rf-cloud-open { display: none !important; }
      #rf-public-shortcuts button,
      #rf-public-shortcuts a {
        appearance: none;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.045);
        color: #e5e7eb;
        border-radius: 999px;
        padding: 9px 13px;
        font: 800 13px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-decoration: none;
        cursor: pointer;
        white-space: nowrap;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }
      #rf-public-shortcuts button:hover,
      #rf-public-shortcuts a:hover {
        background: rgba(245,158,11,.13);
        border-color: rgba(245,158,11,.34);
        transform: translateY(-1px);
      }
      @media (max-width: 700px) {
        #rf-public-shortcuts {
          top: 10px;
          right: 10px;
          left: 10px;
          justify-content: center;
          gap: 5px;
          padding: 5px;
        }
        #rf-public-shortcuts button,
        #rf-public-shortcuts a {
          padding: 8px 9px;
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function openCloudCenter() {
    const modal = document.getElementById('rf-cloud-modal');
    if (modal) {
      modal.classList.add('show');
      if (typeof window.rfCloudCenterRender === 'function') window.rfCloudCenterRender();
      return;
    }
    const opener = document.getElementById('rf-cloud-open');
    if (opener) {
      opener.click();
      return;
    }
    window.showToast?.('info', 'Đồng bộ thiết bị', 'Cloud Center chưa sẵn sàng.');
  }

  function render() {
    css();

    const oldToolbar = document.getElementById('roflix-upgrade-toolbar');
    if (oldToolbar) {
      oldToolbar.hidden = true;
      oldToolbar.setAttribute('aria-hidden', 'true');
      oldToolbar.style.display = 'none';
    }

    if (document.getElementById('rf-public-shortcuts')) return;

    const bar = document.createElement('nav');
    bar.id = 'rf-public-shortcuts';
    bar.setAttribute('aria-label', 'Phím tắt RoFlix');
    bar.innerHTML = `
      <button type="button" id="rf-shortcut-collection">📚 Bộ sưu tập</button>
      <button type="button" id="rf-shortcut-cloud">🔄 Đồng bộ thiết bị</button>
      <a href="admin.html" id="rf-shortcut-admin">🛠️ Quản trị</a>
    `;
    document.body.appendChild(bar);

    document.getElementById('rf-shortcut-collection').addEventListener('click', () => {
      if (typeof window.showFavorites === 'function') {
        window.showFavorites();
      } else {
        window.showToast?.('info', 'Bộ sưu tập', 'Bộ sưu tập chưa sẵn sàng.');
      }
    });

    document.getElementById('rf-shortcut-cloud').addEventListener('click', openCloudCenter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render, { once: true });
  } else {
    render();
  }
})();
