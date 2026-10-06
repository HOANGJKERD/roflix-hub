/* RoFlix Admin Manual Verification 1.0
 * Adds a real database-backed pending -> active approval flow without email verification.
 * Uses the existing admin RPC roflix_admin_set_status.
 */
(function () {
  'use strict';

  const sb = window.rfSupabase;
  if (!sb) return;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function addPendingFilter() {
    const select = document.getElementById('user-status-filter');
    if (!select || select.querySelector('option[value="pending"]')) return;
    const option = document.createElement('option');
    option.value = 'pending';
    option.textContent = '🟡 Chờ xác minh';
    select.insertBefore(option, select.firstChild.nextSibling);
  }

  async function verifyUser(id, name) {
    if (!confirm(`Xác minh tài khoản "${name}"?\n\nTài khoản sẽ chuyển sang ACTIVE và có thể đăng nhập.`)) return;

    const { error } = await sb.rpc('roflix_admin_set_status', {
      p_user_id: id,
      p_status: 'active'
    });

    if (error) {
      alert('Không thể xác minh: ' + error.message);
      return;
    }

    if (typeof window.showToast === 'function') {
      window.showToast('success', 'Đã xác minh', `${name} đã được kích hoạt.`);
    }

    if (typeof window.loadUsers === 'function') {
      await window.loadUsers();
    } else {
      location.reload();
    }
  }

  function decorateRows() {
    const body = document.getElementById('users-body');
    if (!body) return;

    body.querySelectorAll('tr').forEach(row => {
      if (row.dataset.rfVerifyDecorated === '1') return;
      const status = row.querySelector('.pill')?.textContent?.trim().toLowerCase();
      if (status !== 'pending') return;

      const manageButton = row.querySelector('button');
      if (!manageButton) return;

      const onclick = manageButton.getAttribute('onclick') || '';
      const match = onclick.match(/rfOpenUser\('([^']+)'\)/);
      const id = match?.[1];
      if (!id) return;

      const name = row.querySelector('td b')?.textContent?.trim() || 'tài khoản này';
      const wrap = manageButton.parentElement;
      if (!wrap) return;

      const verifyButton = document.createElement('button');
      verifyButton.className = 'btn btn-primary';
      verifyButton.type = 'button';
      verifyButton.textContent = '✅ Verify';
      verifyButton.title = 'Admin xác minh tài khoản';
      verifyButton.addEventListener('click', () => verifyUser(id, name));
      wrap.style.display = 'flex';
      wrap.style.gap = '6px';
      wrap.style.flexWrap = 'wrap';
      wrap.appendChild(verifyButton);
      row.dataset.rfVerifyDecorated = '1';
    });
  }

  function injectStyles() {
    if (document.getElementById('rf-verification-admin-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-verification-admin-css';
    style.textContent = `
      #users-body .pill-pending { background: rgba(245,158,11,.14); color:#fbbf24; border:1px solid rgba(245,158,11,.28); }
      #users-body .btn.btn-primary { white-space:nowrap; }
    `;
    document.head.appendChild(style);
  }

  function init() {
    addPendingFilter();
    injectStyles();
    decorateRows();

    const body = document.getElementById('users-body');
    if (body) {
      const observer = new MutationObserver(() => {
        addPendingFilter();
        decorateRows();
      });
      observer.observe(body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
