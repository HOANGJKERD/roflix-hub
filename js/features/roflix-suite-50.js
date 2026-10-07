/* RoFlix public shell integration.
 * Keep the three requested shortcuts inside the movie-source controls,
 * restore the original Cloud Center launcher, and keep a visible auth entry
 * in the main header. Do not create a floating shortcut toolbar.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_SUITE_50__) return;
  window.__ROFLIX_SUITE_50__ = true;

  function loadFeatureGates() {
    if (document.getElementById('rf-feature-gates-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-feature-gates-script';
    s.src = 'js/features/roflix-feature-gates.js?v=61';
    s.async = false;
    document.head.appendChild(s);
  }

  function loadMovieCuration() {
    if (document.getElementById('rf-movie-curation-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-movie-curation-script';
    s.src = 'js/features/movie-curation-client.js?v=20261006-1';
    s.async = false;
    document.head.appendChild(s);
  }

  function loadAnimeRestore() {
    if (document.getElementById('rf-anime-restore-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-anime-restore-script';
    s.src = 'js/features/anime-restore.js?v=20261006-2';
    s.async = false;
    document.head.appendChild(s);
  }

  function loadAnimePlayer() {
    if (document.getElementById('rf-anime-player-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-anime-player-script';
    s.src = 'js/features/anime-player.js?v=20261007-4';
    s.async = false;
    document.head.appendChild(s);
  }

  function loadAnimeCatalog() {
    loadAnimePlayer();
    if (document.getElementById('rf-anime-catalog-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-anime-catalog-script';
    s.src = 'js/features/anime-hub.js?v=20261007-7';
    s.async = false;
    document.head.appendChild(s);
  }

  function loadDanMyCatalog() {
    if (document.getElementById('rf-danmy-hub-script')) return;
    const s = document.createElement('script');
    s.id = 'rf-danmy-hub-script';
    s.src = 'js/features/danmy-hub.js?v=20261006-1';
    s.async = false;
    document.head.appendChild(s);
  }

  function css() {
    if (document.getElementById('rf-suite-placement-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-suite-placement-css';
    style.textContent = `
      #rf-source-shortcuts {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:7px;
        margin-left:8px;
      }
      #rf-source-shortcuts button,
      #rf-source-shortcuts a,
      #rf-header-login {
        appearance:none;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.045);
        color:#e5e7eb;
        border-radius:999px;
        padding:8px 12px;
        font:800 12px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        text-decoration:none;
        cursor:pointer;
        white-space:nowrap;
        transition:background .18s ease,border-color .18s ease,transform .18s ease;
      }
      #rf-source-shortcuts button:hover,
      #rf-source-shortcuts a:hover,
      #rf-header-login:hover {
        background:rgba(245,158,11,.13);
        border-color:rgba(245,158,11,.34);
        transform:translateY(-1px);
      }
      #rf-header-login {
        background:linear-gradient(135deg,#f59e0b,#fbbf24);
        color:#111827;
        border-color:rgba(251,191,36,.45);
      }
      @media(max-width:900px){
        #rf-source-shortcuts{width:100%;margin:5px 0 0 0}
      }
    `;
    document.head.appendChild(style);
  }

  function openCloudCenter() {
    const modal = document.getElementById('rf-cloud-modal');
    if (modal) {
      modal.classList.add('show');
      window.rfCloudCenterRender?.();
      return;
    }
    const opener = document.getElementById('rf-cloud-open');
    if (opener) {
      opener.click();
      return;
    }
    window.showToast?.('info', 'Cloud Center', 'Cloud Center chưa sẵn sàng.');
  }

  function installSecurityRealtime() {
    const sb = window.rfSupabase;
    if (!sb || window.__ROFLIX_ADMIN6_SECURITY_RT__) return;
    window.__ROFLIX_ADMIN6_SECURITY_RT__ = true;
    const start = async () => {
      try {
        const { data } = await sb.auth.getUser();
        const user = data?.user;
        if (!user) return;
        const { data: profile } = await sb.from('profiles')
          .select('id,account_status,security_version,suspended_until')
          .eq('id', user.id)
          .maybeSingle();
        const baseline = Number(profile?.security_version || 1);
        const enforce = async next => {
          const status = String(next?.account_status || 'active');
          const version = Number(next?.security_version || baseline);
          const expired = next?.suspended_until && new Date(next.suspended_until).getTime() <= Date.now();
          if (status === 'banned' || (status === 'suspended' && !expired) || version > baseline) {
            try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}
            window.showToast?.('warning', 'Phiên đăng nhập đã bị thu hồi', 'Vui lòng đăng nhập lại để tiếp tục.');
            setTimeout(() => location.reload(), 700);
          }
        };
        sb.channel('roflix-security-state-' + user.id)
          .on('postgres_changes', {
            event:'UPDATE', schema:'public', table:'profiles', filter:'id=eq.' + user.id
          }, payload => enforce(payload.new))
          .subscribe();
      } catch (_) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
  }

  function addSourceShortcuts() {
    const host = document.getElementById('source-switch');
    if (!host || document.getElementById('rf-source-shortcuts')) return;

    const wrap = document.createElement('span');
    wrap.id = 'rf-source-shortcuts';
    wrap.setAttribute('aria-label', 'Tiện ích RoFlix');
    wrap.innerHTML = `
      <button type="button" id="rf-shortcut-collection">📚 Bộ sưu tập</button>
      <button type="button" id="rf-shortcut-cloud">🔄 Đồng bộ thiết bị</button>
      <a href="admin.html" id="rf-shortcut-admin">🛠️ Quản trị</a>
    `;
    const note = host.querySelector('#source-note');
    if (note) note.insertAdjacentElement('afterend', wrap);
    else host.appendChild(wrap);

    document.getElementById('rf-shortcut-collection')?.addEventListener('click', () => {
      if (typeof window.showFavorites === 'function') window.showFavorites();
      else window.showToast?.('info', 'Bộ sưu tập', 'Bộ sưu tập chưa sẵn sàng.');
    });
    document.getElementById('rf-shortcut-cloud')?.addEventListener('click', openCloudCenter);
  }

  function addLoginButton() {
    if (document.getElementById('rf-header-login')) return;
    const search = document.querySelector('input[placeholder*="Tìm kiếm phim"]');
    if (!search) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'rf-header-login';
    button.textContent = '🔐 Đăng nhập';
    button.addEventListener('click', () => {
      if (typeof window.openAuthModal === 'function') window.openAuthModal('login');
      else window.showToast?.('info', 'Đăng nhập', 'Cửa sổ đăng nhập chưa sẵn sàng.');
    });

    const searchWrap = search.closest('.relative') || search.parentElement;
    if (searchWrap?.parentElement) searchWrap.parentElement.appendChild(button);
    else search.parentElement?.appendChild(button);
  }

  function render() {
    css();
    loadFeatureGates();
    loadMovieCuration();
    loadAnimeRestore();
    loadAnimeCatalog();
    loadDanMyCatalog();
    installSecurityRealtime();

    const oldToolbar = document.getElementById('roflix-upgrade-toolbar');
    if (oldToolbar) {
      oldToolbar.hidden = true;
      oldToolbar.setAttribute('aria-hidden', 'true');
      oldToolbar.style.display = 'none';
    }

    // Cloud Center owns its original fixed bottom-right launcher. Never hide it.
    addSourceShortcuts();
    addLoginButton();
  }

  function boot() {
    render();
    setTimeout(render, 300);
    setTimeout(render, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();