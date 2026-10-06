/* Cloud comments for the player page. Canonical source: roflix_movie_comments. */
(function () {
  'use strict';
  const sb = window.rfSupabase;
  if (!sb) return;
  const esc = s => String(s ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => v ? new Date(v).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}) : '';

  async function render(slug) {
    const box = document.getElementById('rf-player-comments-list');
    if (!box || !slug) return;
    box.innerHTML = '<div class="rf-loading-line">Đang tải bình luận...</div>';
    const {data,error} = await sb.from('roflix_movie_comments')
      .select('id,movie_slug,movie_title,username,display_name,body,created_at,parent_id,status')
      .eq('movie_slug',slug)
      .order('created_at',{ascending:false})
      .limit(20);
    if (error) { box.innerHTML = `<div class="rf-empty-state">Không tải được bình luận: ${esc(error.message)}</div>`; return; }
    const rows = (data || []).filter(c => c.status !== 'hidden');
    box.innerHTML = rows.length ? rows.map(c => {
      const name = c.username || c.display_name || 'RoFlix user';
      return `
      <article class="rf-comment-card">
        <div class="rf-comment-avatar">${esc((name || 'R').slice(0,1).toUpperCase())}</div>
        <div class="rf-comment-body"><div class="rf-comment-head"><strong>${esc(name)}</strong><span>${fmt(c.created_at)}</span></div><p>${esc(c.body)}</p></div>
      </article>
    `;
    }).join('') : '<div class="rf-empty-state">Chưa có bình luận nào. Hãy là người đầu tiên!</div>';
  }

  async function submit() {
    const slug = window.currentSlug || '';
    const title = window.currentMovieTitle || '';
    const input = document.getElementById('rf-player-comment-input');
    if (!slug || !input) return;
    const body = input.value.trim();
    if (!body) return;
    const {data:userData} = await sb.auth.getUser();
    const user = userData?.user;
    if (!user) {
      if (typeof showToastPro === 'function') showToastPro('warning','Đăng nhập','Bạn cần đăng nhập để bình luận.');
      else alert('Bạn cần đăng nhập để bình luận.');
      return;
    }
    const {error} = await sb.rpc('roflix_movie_comment_create', {
      p_movie_slug: slug,
      p_movie_title: title,
      p_body: body.slice(0,3000),
      p_parent_id: null
    });
    if (error) { alert(error.message); return; }
    input.value = '';
    await render(slug);
    if (typeof window.renderBbComments === 'function') await window.renderBbComments();
  }
  window.rfPlayerCommentsRender = render;
  if (typeof window.rfSubmitMovieComment !== 'function') window.rfSubmitMovieComment = submit;
})();
