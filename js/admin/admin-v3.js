(function(){
  'use strict';
  const sb=window.rfSupabase; if(!sb)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n||0).toLocaleString('vi-VN');
  const date=v=>v?new Date(v).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'';
  async function game(){
    const stats=await sb.rpc('roflix_admin_game_stats');
    if(stats.error){$('game-stats-cards').innerHTML='<div class="card danger-text">'+esc(stats.error.message)+'<br><small>Chạy supabase/mega_upgrade.sql.</small></div>';return;}
    const s=stats.data||{};
    $('game-stats-cards').innerHTML=[['👥','Người chơi',s.players],['🎰','Lượt Gacha',s.total_gacha_pulls],['📺','Tập đã xem',s.total_episodes],['💎','RoGem đang giữ',s.total_gems],['📚','Watchlist',s.watchlist_items]].map(x=>`<div class="card"><div class="stat-label">${x[0]} ${x[1]}</div><div class="stat-value accent-amber">${fmt(x[2])}</div></div>`).join('');
    const lb=await sb.rpc('roflix_leaderboard',{p_limit:50});
    $('game-leaderboard-body').innerHTML=lb.data?.length?lb.data.map(x=>`<tr><td><b>${x.rank}</b></td><td><b>${esc(x.display_name||'Người dùng')}</b></td><td>Lv.${x.level||1}</td><td>${fmt(x.exp)}</td><td>💎 ${fmt(x.gems)}</td><td>${fmt(x.episodes_watched)}</td><td>${fmt(x.gacha_pulls)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Chưa có dữ liệu.</td></tr>';
    const feed=s.recent_gacha||[];$('game-gacha-feed').innerHTML=feed.length?feed.map(x=>`<div class="event"><div class="event-top"><b>🎴 ${esc(x.name)}</b><span class="pill pill-active">${esc(x.rarity)}</span></div><small>${esc(x.display_name||'Người dùng')} · ${esc(x.movie||'')} · ${date(x.obtained_at)}</small></div>`).join(''):'<div class="empty">Chưa có lượt Gacha.</div>';
  }
  let gemSelectedUser=null;
  async function loadGemUsers(){
    const box=$('gem-user-results'); if(!box)return;
    const q=($('gem-user-search')?.value||'').trim();
    box.innerHTML='<div class="muted">Đang tìm tài khoản...</div>';
    const r=await sb.rpc('roflix_admin_find_game_users',{p_query:q,p_limit:50});
    if(r.error){box.innerHTML='<div class="danger-text">'+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    box.innerHTML=rows.length?`<table class="table"><thead><tr><th>Tài khoản</th><th>Role</th><th>Level</th><th>RoGem</th><th>EXP</th><th></th></tr></thead><tbody>${rows.map(u=>`<tr><td><b>${esc(u.display_name||'Người dùng')}</b><br><small class="muted">${esc(u.email||u.user_id)}</small></td><td>${esc(u.role||'user')}</td><td>Lv.${u.level||1}</td><td><b>💎 ${fmt(u.gems)}</b></td><td>${fmt(u.exp)}</td><td><button class="btn" onclick='rfAdminSelectGemUser(${JSON.stringify(u)})'>Chọn</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Không tìm thấy tài khoản.</div>';
  }
  async function loadGemHistory(){
    const box=$('gem-history'); if(!box)return;
    if(!gemSelectedUser){box.innerHTML='<div class="muted">Chọn tài khoản để xem lịch sử.</div>';return;}
    const r=await sb.from('roflix_gem_transactions').select('id,action,delta,balance_before,balance_after,reason,created_at,admin_id').eq('target_user_id',gemSelectedUser.user_id).order('created_at',{ascending:false}).limit(30);
    if(r.error){box.innerHTML='<div class="danger-text">'+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    box.innerHTML=rows.length?rows.map(x=>{const sign=Number(x.delta)>=0?'+':'';return `<div class="event"><div class="event-top"><b>${x.action==='set'?'🎯 Đặt số Gem':x.delta>=0?'➕ Cộng Gem':'➖ Trừ Gem'}</b><span class="pill ${x.delta>=0?'pill-active':'pill-banned'}">${sign}${fmt(x.delta)}</span></div><small>💎 ${fmt(x.balance_before)} → <b>${fmt(x.balance_after)}</b> · ${esc(x.reason||'Không ghi lý do')} · ${date(x.created_at)}</small></div>`}).join(''):'<div class="empty">Chưa có lịch sử Gem.</div>';
  }
  window.rfAdminSelectGemUser=async function(user){
    gemSelectedUser=user;
    $('gem-selected-user').innerHTML=`<div style="font-size:18px"><b>${esc(user.display_name||'Người dùng')}</b></div><div class="muted">${esc(user.email||user.user_id)}</div><div style="margin-top:8px;font-size:22px"><b>💎 ${fmt(user.gems)}</b></div><small class="muted">User ID: ${esc(user.user_id)}</small>`;
    $('gem-actions').style.display='block';
    await loadGemHistory();
  };
  window.rfAdminAdjustGem=async function(delta){
    if(!gemSelectedUser)return alert('Hãy chọn tài khoản trước.');
    const amount=Math.abs(Number(delta||0)); if(!amount)return;
    const reason=($('gem-reason')?.value||'').trim();
    const signed=delta<0?-amount:amount;
    if(!confirm(`${signed>0?'Cộng':'Trừ'} ${fmt(amount)} RoGem cho ${gemSelectedUser.display_name||gemSelectedUser.email}?`))return;
    const r=await sb.rpc('roflix_admin_adjust_gem',{p_user_id:gemSelectedUser.user_id,p_delta:signed,p_reason:reason});
    if(r.error){alert(r.error.message);return;}
    gemSelectedUser.gems=Number(r.data?.gems||0);
    $('gem-selected-user').querySelector('div[style*="font-size:22px"]').innerHTML='<b>💎 '+fmt(gemSelectedUser.gems)+'</b>';
    $('gem-reason').value='';
    await Promise.all([loadGemUsers(),loadGemHistory(),game()]);
  };
  window.rfAdminSetGem=async function(){
    if(!gemSelectedUser)return alert('Hãy chọn tài khoản trước.');
    const value=Number($('gem-amount')?.value); if(!Number.isSafeInteger(value)||value<0)return alert('Số Gem phải là số nguyên không âm.');
    const reason=($('gem-reason')?.value||'').trim();
    if(!confirm(`Đặt RoGem của ${gemSelectedUser.display_name||gemSelectedUser.email} thành ${fmt(value)}?`))return;
    const r=await sb.rpc('roflix_admin_set_gem',{p_user_id:gemSelectedUser.user_id,p_balance:value,p_reason:reason});
    if(r.error){alert(r.error.message);return;}
    gemSelectedUser.gems=Number(r.data?.gems||value);
    $('gem-selected-user').querySelector('div[style*="font-size:22px"]').innerHTML='<b>💎 '+fmt(gemSelectedUser.gems)+'</b>';
    $('gem-reason').value='';
    await Promise.all([loadGemUsers(),loadGemHistory(),game()]);
  };
  async function comments(){
    const {data,error}=await sb.from('movie_comments').select('id,movie_slug,movie_title,display_name,body,status,created_at').order('created_at',{ascending:false}).limit(250);
    if(error){$('live-comments-body').innerHTML='<tr><td colspan="6" class="danger-text">'+esc(error.message)+'</td></tr>';return;}
    const rows=data||[];$('live-comments-total').textContent=fmt(rows.length);$('live-comments-movies').textContent=fmt(new Set(rows.map(x=>x.movie_slug)).size);$('live-comments-visible').textContent=fmt(rows.filter(x=>x.status==='visible').length);
    $('live-comments-body').innerHTML=rows.length?rows.map(c=>`<tr><td><b>${esc(c.movie_title||c.movie_slug)}</b><br><small class="muted">${esc(c.movie_slug)}</small></td><td>${esc(c.display_name)}</td><td style="max-width:430px;white-space:pre-wrap">${esc(c.body)}</td><td><span class="pill ${c.status==='visible'?'pill-active':'pill-banned'}">${esc(c.status)}</span></td><td>${date(c.created_at)}</td><td><button class="btn" onclick="rfAdminCommentToggle('${c.id}','${c.status==='visible'?'hidden':'visible'}')">${c.status==='visible'?'Ẩn':'Hiện'}</button> <button class="btn btn-danger" onclick="rfAdminCommentDelete('${c.id}')">Xóa</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Chưa có bình luận.</td></tr>';
  }
  window.rfAdminCommentToggle=async(id,status)=>{const {error}=await sb.from('movie_comments').update({status}).eq('id',id);if(error)alert(error.message);else comments();};
  window.rfAdminCommentDelete=async(id)=>{if(!confirm('Xóa bình luận này?'))return;const {error}=await sb.from('movie_comments').delete().eq('id',id);if(error)alert(error.message);else comments();};
  async function sources(){
    const arr=[['KKPhim · chính','https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1'],['VSMOV · phụ','https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1']];
    $('content-source-health').innerHTML=arr.map(x=>`<div id="src-${x[0].startsWith('KK')?'kk':'vs'}" style="padding:12px 0;border-bottom:1px solid #252a39"><b>${x[0]}</b><span class="pill" style="float:right">checking</span></div>`).join('');
    await Promise.all(arr.map(async x=>{const id=x[0].startsWith('KK')?'src-kk':'src-vs';try{const r=await fetch(x[1],{cache:'no-store'});$(id).querySelector('.pill').textContent=r.ok?'ONLINE':'HTTP '+r.status;$(id).querySelector('.pill').classList.add(r.ok?'pill-active':'pill-banned');}catch(e){$(id).querySelector('.pill').textContent='OFFLINE';$(id).querySelector('.pill').classList.add('pill-banned');}}));
    const r=await sb.rpc('roflix_admin_schedule_stats');if(!r.error){const n=r.data?.next_release;$('content-release-stats').innerHTML=`<p>🟡 Sắp chiếu: <b>${fmt(r.data?.scheduled)}</b></p><p>🟢 Đã ra: <b>${fmt(r.data?.released)}</b></p>${n?`<p style="margin-top:10px">🎬 Tiếp theo: <b>${esc(n.title)}</b><br><span class="muted">${date(n.release_at)}</span></p>`:'<p class="muted">Chưa có lịch tiếp theo.</p>'}`;}else $('content-release-stats').innerHTML='<p class="danger-text">'+esc(r.error.message)+'</p>';
  }
  window.rfAdminLoadGameCenter=async function(){await game(); if($('gem-user-search')) await loadGemUsers();};window.rfAdminLoadLiveComments=comments;window.rfAdminLoadContentTools=sources;window.rfAdminCheckSources=sources;
  let channel;
  document.addEventListener('DOMContentLoaded',()=>{
    $('gem-user-search-btn')?.addEventListener('click',loadGemUsers);
    $('gem-user-search')?.addEventListener('keydown',e=>{if(e.key==='Enter')loadGemUsers();});
    channel=sb.channel('roflix-admin-v3-live').on('postgres_changes',{event:'*',schema:'public',table:'movie_comments'},()=>{if(document.getElementById('live-comments')?.classList.contains('active'))comments();}).on('postgres_changes',{event:'*',schema:'public',table:'roflix_game_stats'},()=>{if(document.getElementById('game-center')?.classList.contains('active'))game();}).on('postgres_changes',{event:'*',schema:'public',table:'roflix_gacha_inventory'},()=>{if(document.getElementById('game-center')?.classList.contains('active'))game();}).subscribe();
  });
})();
