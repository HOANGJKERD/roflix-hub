/* RoFlix realtime movie comments. Supabase is the shared source of truth. */
(function(){
  'use strict';
  const sb = window.rfSupabase;
  if (!sb || window.__RF_COMMENTS_REALTIME__) return;
  window.__RF_COMMENTS_REALTIME__ = true;
  const esc = s => String(s ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const user = async () => { try { const {data}=await sb.auth.getUser(); return data?.user || null; } catch(_) { return null; } };

  async function fetchComments(slug, limit=100){
    if(!slug) return [];
    const {data,error}=await sb.from('roflix_movie_comments').select('id,movie_slug,movie_title,user_id,username,display_name,body,created_at,parent_id,status').eq('movie_slug',slug).order('created_at',{ascending:false}).limit(limit);
    if(error) { console.debug('[RoFlix comments] read:',error.message); return null; }
    return Array.isArray(data) ? data.filter(c => c.status !== 'hidden') : [];
  }

  function formatTime(value){
    try { return new Date(value).toLocaleString('vi-VN'); } catch(_) { return String(value || ''); }
  }

  function renderMovie(slug, comments){
    const box=document.getElementById('comments-container');
    if(!box) return;
    const rows=Array.isArray(comments)?comments:[];
    box.innerHTML=rows.length ? rows.map(c=>`<div class="border-b border-gray-800 pb-4 last:border-0"><div class="flex justify-between text-xs text-amber-500 font-bold mb-1"><span><i class="fa-regular fa-user mr-1"></i>${esc(c.username||c.display_name||'Khán Giả')}</span><span class="font-normal text-[11px] text-gray-500">${esc(formatTime(c.created_at))}</span></div><p class="text-sm mt-1 text-gray-300">${esc(c.body||'')}</p></div>`).join('') : '<div class="text-center text-gray-500 py-8">Chưa có bình luận. Hãy là người đầu tiên!</div>';
  }

  async function renderMovieComments(slug){
    if(typeof window.rfRenderCommentThread2==='function'){
      await window.rfRenderCommentThread2(slug);
      return [];
    }
    const rows=await fetchComments(slug);
    if(rows===null){
      renderMovie(slug,[]);
      return [];
    }
    renderMovie(slug,rows);
    return rows;
  }

  async function renderBottom(){
    const el=document.getElementById('bb-comment-list');
    if(!el) return;
    const {data,error}=await sb.from('roflix_movie_comments').select('id,movie_slug,movie_title,username,body,created_at').order('created_at',{ascending:false}).limit(4);
    const rows = error ? [] : (data||[]);
    el.innerHTML=rows.length ? rows.map(c=>{const avatar=`https://ui-avatars.com/api/?name=${encodeURIComponent(c.username||'Khán giả')}&background=f59e0b&color=000&size=64`;const click=c.movie_slug?`onclick="viewMovieDetail('${String(c.movie_slug).replace(/'/g,"\\'")}')"`:'';return `<div class="bb-comment" ${click}><img class="bb-avatar" src="${avatar}" alt=""><div class="bb-c-body"><div class="bb-c-user">${esc(c.username||'Khán giả')} <span class="badge-inf">∞</span></div><div class="bb-c-text">${esc(c.body||'')}</div><div class="bb-c-movie"><i class="fa-solid fa-play" style="font-size:0.55rem"></i> ${esc(c.movie_title||c.movie_slug||'Phim')}</div></div></div>`;}).join('') : '<div class="text-center text-gray-500 py-8">Chưa có bình luận nào.</div>';
  }

  window.rfMovieCommentsRender = renderMovieComments;
  window.renderBbComments = renderBottom;

  window.submitComment = async function(slug){
    const userEl=document.getElementById('comment-user');
    const inputEl=document.getElementById('comment-input');
    const text=inputEl?.value.trim() || '';
    if(!text){ if(typeof showToast==='function') showToast('error','Lỗi','Vui lòng nhập bình luận!'); return; }
    const u=await user();
    if(!u){ if(typeof showToastPro==='function') showToastPro('info','Đăng nhập để bình luận','Hãy đăng nhập để bình luận được lưu trên mọi thiết bị.'); else showToast('info','Đăng nhập','Hãy đăng nhập để bình luận.'); return; }
    const username=(userEl?.value.trim() || u.user_metadata?.display_name || u.email?.split('@')[0] || 'Khán Giả').slice(0,80);
    const movieTitle=(typeof window.currentMovieTitle!=='undefined'&&window.currentMovieTitle) || slug;
    const {error}=await sb.rpc('roflix_movie_comment_create',{p_movie_slug:slug,p_movie_title:movieTitle,p_body:text.slice(0,3000),p_parent_id:null});
    if(error){ if(typeof showToast==='function') showToast('error','Lỗi','Không lưu được bình luận: '+error.message); return; }
    if(inputEl) inputEl.value='';
    await renderMovieComments(slug); await renderBottom();
    try { const stats=getStats(); stats.totalComments=(stats.totalComments||0)+1; saveStats(stats); updateDailyQuestProgress('comment'); checkAchievements(stats); } catch(_) {}
    if(typeof showToast==='function') showToast('success','Đã đăng','Bình luận đã được đồng bộ realtime.');
  };

  function subscribe(){
    sb.channel('roflix-movie-comments-live').on('postgres_changes',{event:'*',schema:'public',table:'roflix_movie_comments'},()=>{
      renderBottom();
      const slug=window.currentSlug || (typeof currentSlug!=='undefined'?currentSlug:'');
      if(slug) renderMovieComments(slug);
    }).subscribe();
  }

  async function boot(){
    const slug=window.currentSlug || (typeof currentSlug!=='undefined'?currentSlug:'');
    if(slug) await renderMovieComments(slug);
    await renderBottom();
    subscribe();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300),{once:true}); else setTimeout(boot,300);
})();
