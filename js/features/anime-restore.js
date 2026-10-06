/* RoFlix Anime restore layer.
 * Restores the public Anime topic card and Anime genre entry without
 * changing the movie API or playback pipeline.
 * Anime playback/filtering uses the existing Hoạt Hình provider route.
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIME_RESTORE__) return;
  window.__ROFLIX_ANIME_RESTORE__ = true;

  function openAnime() {
    if (typeof window.filterByGenre === 'function') {
      window.filterByGenre('hoat-hinh', 'Anime');
      return;
    }
    window.showToast?.('info', 'Anime', 'Bộ lọc Anime chưa sẵn sàng.');
  }

  function addTopicCard() {
    const row = document.querySelector('.topics-row');
    if (!row || document.getElementById('rf-topic-anime')) return;

    const card = document.createElement('button');
    card.type = 'button';
    card.id = 'rf-topic-anime';
    card.className = 'topic-card';
    card.style.background = 'linear-gradient(135deg,#7c3aed 0%,#db2777 100%)';
    card.innerHTML = '<h3>ANIME</h3><span>Xem chủ đề ›</span>';
    card.addEventListener('click', openAnime);
    row.appendChild(card);
  }

  function addGenreLink() {
    const links = Array.from(document.querySelectorAll('a'));

    const desktop = links.find(a =>
      a.textContent.trim() === 'Hoạt Hình' &&
      a.closest('.glass-premium') &&
      !a.closest('#mobile-menu')
    );
    if (desktop && !document.getElementById('rf-genre-anime-desktop')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-anime-desktop';
      link.className = desktop.className;
      link.textContent = 'ANIME';
      link.addEventListener('click', e => {
        e.preventDefault();
        openAnime();
      });
      desktop.insertAdjacentElement('afterend', link);
    }

    const mobile = links.find(a =>
      a.textContent.trim() === 'Hoạt Hình' &&
      a.closest('#mobile-menu')
    );
    if (mobile && !document.getElementById('rf-genre-anime-mobile')) {
      const link = document.createElement('a');
      link.href = '#';
      link.id = 'rf-genre-anime-mobile';
      link.className = mobile.className;
      link.textContent = 'ANIME';
      link.addEventListener('click', e => {
        e.preventDefault();
        window.closeMobileMenu?.();
        openAnime();
      });
      mobile.insertAdjacentElement('afterend', link);
    }
  }

  function css() {
    if (document.getElementById('rf-anime-restore-css')) return;
    const style = document.createElement('style');
    style.id = 'rf-anime-restore-css';
    style.textContent = `
      #rf-topic-anime {
        border:1px solid rgba(255,255,255,.12);
        background:linear-gradient(135deg,#7c3aed,#db2777)!important;
      }
      #rf-topic-anime:hover {
        box-shadow:0 12px 28px rgba(124,58,237,.28);
      }
      #rf-genre-anime-desktop,
      #rf-genre-anime-mobile {
        font-weight:900;
      }
    `;
    document.head.appendChild(style);
  }

  function boot() {
    css();
    addTopicCard();
    addGenreLink();
    setTimeout(addTopicCard, 300);
    setTimeout(addGenreLink, 300);
    setTimeout(addTopicCard, 1200);
    setTimeout(addGenreLink, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();
