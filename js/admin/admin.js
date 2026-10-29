(function(){
  'use strict';
  const sb = window.rfSupabase;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = v => v ? new Date(v).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}) : 'Chưa có';
  const fmtNum = v => Number(v||0).toLocaleString('vi-VN');
  const state = {user:null,stats:null,users:[],audit:[],charts:{visitors:null,analytics:null},currentPage:'dashboard',refreshTimer:null,realtime:null,realtimeTimer:null,loadingAll:false};

  function showAccess(title,text,icon='🔐'){
    const login=title==='Chưa đăng nhập';
    $('access').innerHTML=login
      ? `<div class="card access-card admin-login-card"><div class="admin-login-mark">🔐</div><p class="admin-login-kicker">ROHUB ADMIN CENTER</p><h2>Đăng nhập quản trị</h2><p class="muted">Đăng nhập trực tiếp tại đây bằng tài khoản RoFlix có quyền <b>admin</b>. Không cần quay về trang RoFlix.</p><form id="admin-login-form" class="admin-login-form"><div class="form-row"><label for="admin-login-email">Email</label><input class="input" id="admin-login-email" name="email" type="email" autocomplete="username" required placeholder="Email quản trị"></div><div class="form-row"><label for="admin-login-password">Mật khẩu</label><input class="input" id="admin-login-password" name="password" type="password" autocomplete="current-password" required placeholder="Nhập mật khẩu"></div><p id="admin-login-error" class="admin-login-error" role="status" aria-live="polite"></p><button class="btn btn-primary admin-login-submit" id="admin-login-submit" type="submit">Đăng nhập Admin <span aria-hidden="true">→</span></button></form><p class="muted admin-login-foot">Phiên đăng nhập sử dụng Supabase Auth chung với RoFlix.</p></div>`
      : `<div class="card access-card"><div style="font-size:46px">${icon}</div><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><p style="margin-top:16px"><button class="btn" type="button" id="admin-access-retry">Kiểm tra lại quyền</button> <a class="btn" href="index.html">Về RoHub</a></p></div>`;
    $('access').style.display='grid'; document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    $('admin-access-retry')?.addEventListener('click',()=>loadAll());
  }
  function hideAccess(){ $('access').style.display='none'; }
  function setTopTitle(t){ $('top-title').textContent=t; }
  async function getUser(){if(!sb)return null;const {data,error}=await sb.auth.getUser();if(error)throw error;return data?.user||null;}

  async function ensureAdmin(){
    if(!sb){showAccess('Supabase chưa sẵn sàng','Kiểm tra js/config/supabase.config.js.');return false;}
    const user=await getUser();
    if(!user){$('admin-login-open').style.display='inline-flex';$('logout-btn').style.display='none';$('admin-email').textContent='Chưa đăng nhập';showAccess('Chưa đăng nhập','Hãy đăng nhập tài khoản RoFlix có quyền admin trước.');return false;}
    const {data,error}=await sb.from('profiles').select('id,display_name,role,account_status').eq('id',user.id).maybeSingle();
    if(error){showAccess('Không đọc được quyền','Chạy setup.sql + admin_analytics.sql + v2_release_comments_realtime.sql rồi thử lại.');return false;}
    if(data?.role!=='admin'){showAccess('Không có quyền Admin','Tài khoản hiện tại không có role admin.','⛔');return false;}
    if(data?.account_status && data.account_status!=='active'){showAccess('Tài khoản bị hạn chế','Tài khoản admin hiện không ở trạng thái active.','🚫');return false;}
    state.user=user;$('admin-email').textContent=user.email||user.id;$('admin-login-open').style.display='none';$('logout-btn').style.display='inline-flex';hideAccess();return true;
  }

  function renderStats(s){
    const cards=[
      ['👥','Tài khoản',s.users_total,'Toàn bộ profile','accent-amber'],
      ['🛡️','Admin',s.admins_total,'Tài khoản quản trị','accent-purple'],
      ['🌐','Truy cập hôm nay',s.visitors_today,'Session duy nhất','accent-blue'],
      ['👀','Viewer hôm nay',s.registered_viewers_today,'User đã đăng nhập','accent-green'],
      ['🎬','Lượt xem phim',s.movie_views_today,'Movie view events','accent-amber'],
      ['▶️','Lượt phát',s.movie_plays_today,'Movie play events','accent-purple'],
      ['🟢','Đang online',s.active_now,'Heartbeat trong 5 phút','accent-green'],
      ['🚫','Bị hạn chế',Number(s.suspended_total||0)+Number(s.banned_total||0),'Suspended + banned','accent-red']
    ];
    $('stats-cards').innerHTML=cards.map(x=>`<div class="card"><div class="stat-label">${x[0]} ${x[1]}</div><div class="stat-value ${x[4]}">${fmtNum(x[2])}</div><div class="stat-sub">${x[3]}</div></div>`).join('');
    $('last-updated').textContent='Cập nhật '+new Date().toLocaleTimeString('vi-VN');
    $('active-summary').innerHTML=`<div style="font-size:36px;font-weight:900;color:#4ade80">${fmtNum(s.active_now)}</div><p class="muted">${fmtNum(s.active_authenticated_now)} người đã đăng nhập</p><p class="muted">Realtime + heartbeat 5 phút.</p>`;
    $('today-metrics').innerHTML=`<p>🌐 Truy cập: <b>${fmtNum(s.visitors_today)}</b></p><p>👀 Viewer đăng nhập: <b>${fmtNum(s.registered_viewers_today)}</b></p><p>🎬 Movie view: <b>${fmtNum(s.movie_views_today)}</b></p><p>▶️ Play: <b>${fmtNum(s.movie_plays_today)}</b></p><p>⚡ Events: <b>${fmtNum(s.events_today)}</b></p>`;
    $('thirty-day-metrics').innerHTML=`<p>🎬 Top phim: 30 ngày gần nhất.</p><p>🧾 Tổng event: <b>${fmtNum(s.events_total)}</b></p><p>🚫 Suspended: <b>${fmtNum(s.suspended_total)}</b></p><p>⛔ Banned: <b>${fmtNum(s.banned_total)}</b></p>`;
    renderTopMovies(s.top_movies||[]);renderRecentEvents(s.recent_events||[]);renderVisitorsChart(s.daily_visitors||[]);
  }
  function renderTopMovies(rows){const max=Math.max(1,...rows.map(x=>Number(x.views)||0));$('top-movies').innerHTML=rows.length?rows.map((x,i)=>`<div class="movie-rank"><span class="rank">#${i+1}</span><div><b>${esc(x.movie_title||x.movie_slug||'Không tên')}</b><div class="bar"><span style="width:${Math.max(4,Math.round((Number(x.views)||0)/max*100))}%"></span></div></div><strong>${fmtNum(x.views)}</strong></div>`).join(''):'<div class="empty">Chưa có dữ liệu xem phim.</div>';}
  function renderRecentEvents(rows){const labels={page_view:'Mở trang',movie_view:'Xem phim',movie_play:'Phát phim',movie_detail:'Chi tiết phim',search:'Tìm kiếm',login:'Đăng nhập',signup:'Đăng ký',logout:'Đăng xuất',heartbeat:'Heartbeat'};$('recent-events').innerHTML=rows.length?rows.map(x=>`<div class="event"><div class="event-top"><b>${esc(labels[x.event_type]||x.event_type)}</b><span class="muted">${fmtDate(x.created_at)}</span></div><small>${esc(x.movie_title||x.page||x.session_id||'')}</small></div>`).join(''):'<div class="empty">Chưa có event.</div>';}
  function chartCommon(){return {responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8'}}},scales:{x:{ticks:{color:'#64748b'},grid:{color:'#202434'}},y:{ticks:{color:'#64748b'},grid:{color:'#202434'},beginAtZero:true}}};}
  function renderVisitorsChart(rows){
    const labels=rows.map(x=>new Date(x.day).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}));
    const data=rows.map(x=>Number(x.visitors)||0);
    const ctx=$('visitors-chart')?.getContext('2d');if(!ctx)return;
    if(state.charts.visitors){
      state.charts.visitors.data.labels=labels;state.charts.visitors.data.datasets[0].data=data;state.charts.visitors.update('none');
    }else state.charts.visitors=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Visitors',data,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.12)',fill:true,tension:.35}]},options:chartCommon()});
    const ctx2=$('analytics-chart')?.getContext('2d');if(!ctx2)return;
    if(state.charts.analytics){
      state.charts.analytics.data.labels=labels;state.charts.analytics.data.datasets[0].data=data;state.charts.analytics.update('none');
    }else state.charts.analytics=new Chart(ctx2,{type:'bar',data:{labels,datasets:[{label:'Visitors',data,backgroundColor:'#8b5cf6',borderRadius:7}]},options:chartCommon()});
  }
  async function fetchMovieCounts(){const sources=[{name:'KKPhim · chính',url:'https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1'},{name:'VSMOV · phụ',url:'https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1'}];const results=await Promise.all(sources.map(async s=>{try{const r=await fetch(s.url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();const p=d.pagination||(d.data&&d.data.params&&d.data.params.pagination)||(d.params&&d.params.pagination)||{};return {...s,total:p.totalItems||d.total||d.totalItems||d.data?.total||0,status:'online'};}catch(e){return {...s,total:0,status:'offline'};}}));$('movie-sources').innerHTML=results.map(r=>`<div style="padding:10px 0;border-bottom:1px solid #252a39"><div style="display:flex;justify-content:space-between"><b>${esc(r.name)}</b><span class="pill ${r.status==='online'?'pill-active':'pill-banned'}">${r.status}</span></div><div style="font-size:26px;font-weight:900;color:#fbbf24;margin-top:4px">${fmtNum(r.total)}</div><div class="muted" style="font-size:11px">${r.status==='online'?'Tổng phim API báo về':'Không lấy được tổng từ API'}</div></div>`).join('');}
  async function loadRoTruyenOverview(){
    const el=$('rotruyen-admin-overview');if(!el||!sb)return;
    try{
      const [all,published]=await Promise.all([
        sb.from('rotruyen_series').select('id',{count:'exact',head:true}),
        sb.from('rotruyen_series').select('id',{count:'exact',head:true}).eq('is_published',true)
      ]);
      if(all.error)throw all.error;if(published.error)throw published.error;
      el.querySelector('p').textContent=(all.count||0).toLocaleString('vi-VN')+' tác phẩm trong catalog · '+(published.count||0).toLocaleString('vi-VN')+' đã xuất bản · '+((all.count||0)-(published.count||0)).toLocaleString('vi-VN')+' bản nháp / chờ duyệt.';
    }catch(e){const p=el.querySelector('p');if(p)p.textContent='Chưa lấy được số liệu RoTruyện: '+(e.message||'kiểm tra quyền database');}
  }
  async function loadDashboard(){
    const healthHost=$('dashboard-health-summary'),portalHost=$('dashboard-portal-status');
    if(portalHost&&!portalHost.children.length)portalHost.innerHTML='<div class="card dashboard-status-card"><span class="muted">Đang kiểm tra…</span></div>'.repeat(3);
    const results=await Promise.allSettled([
      sb.from('profiles').select('id',{count:'exact',head:true}),
      sb.rpc('roflix_admin_stats'),
      sb.from('rotruyen_series').select('id',{count:'exact',head:true}),
      sb.from('rotruyen_chapters').select('id',{count:'exact',head:true})
    ]);
    const val=i=>results[i].status==='fulfilled'?results[i].value:{error:results[i].reason};
    const profile=val(0),stats=val(1),series=val(2),chapters=val(3);
    if(!stats.error){state.stats=stats.data||{};renderStats(state.stats);await Promise.allSettled([fetchMovieCounts(),loadLiveViewers()]);}
    else $('stats-cards').innerHTML='<div class="card danger-text">Không tải được số liệu RoFlix: '+esc(stats.error.message||'Lỗi không xác định')+'<br><small>Kiểm tra RPC roflix_admin_stats và quyền quản trị.</small></div>';
    const portals=[
      {name:'RoFlix',icon:'🎬',state:!stats.error?'ok':'fail',detail:stats.error?'Không đọc được thống kê quản trị':fmtNum(state.stats?.movie_views_today)+' lượt xem hôm nay · '+fmtNum(state.stats?.users_total)+' tài khoản',target:'movie-control',label:'Mở quản lý phim'},
      {name:'RoTruyen',icon:'📚',state:!series.error?'ok':'fail',detail:series.error?'Không truy cập được catalog':fmtNum(series.count)+' tác phẩm · '+(chapters.error?'chưa đọc được số chương':fmtNum(chapters.count)+' chương'),target:'rotruyen',label:'Mở quản lý truyện'},
      {name:'RoEdu',icon:'🎓',state:'warn',detail:'Chưa kết nối CRUD sách/chương vào database',target:'roedu',label:'Mở khu RoEdu'}
    ];
    if(portalHost)portalHost.innerHTML=portals.map(p=>'<article class="card dashboard-status-card"><div class="dashboard-status-top"><span class="dashboard-portal-icon">'+p.icon+'</span><span class="dashboard-status-pill dashboard-'+p.state+'">'+(p.state==='ok'?'● Đang kết nối':p.state==='warn'?'! Chưa hoàn thiện':'× Cần kiểm tra')+'</span></div><h3>'+p.name+'</h3><p>'+esc(p.detail)+'</p><button type="button" class="btn" data-dashboard-go="'+p.target+'">'+p.label+' →</button></article>').join('');
    portalHost?.querySelectorAll('[data-dashboard-go]').forEach(button=>button.addEventListener('click',()=>switchPage(button.dataset.dashboardGo)));
    document.querySelectorAll('[data-dashboard-go]').forEach(button=>{if(button.dataset.dashboardBound)return;button.dataset.dashboardBound='1';button.addEventListener('click',()=>switchPage(button.dataset.dashboardGo));});
    const checks=[
      {name:'Supabase · profiles',ok:!profile.error,detail:profile.error?profile.error.message:fmtNum(profile.count)+' hồ sơ đọc được'},
      {name:'RoFlix · thống kê',ok:!stats.error,detail:stats.error?stats.error.message:'RPC roflix_admin_stats phản hồi thành công'},
      {name:'RoTruyen · catalog',ok:!series.error,detail:series.error?series.error.message:fmtNum(series.count)+' tác phẩm'},
      {name:'RoTruyen · chương',ok:!chapters.error,detail:chapters.error?chapters.error.message:fmtNum(chapters.count)+' chương'},
      {name:'RoEdu · dữ liệu quản trị',ok:false,warning:true,detail:'Chưa có CRUD sách/chương kết nối database; không đánh dấu hoạt động giả.'}
    ];
    if(healthHost)healthHost.innerHTML=checks.map(x=>'<div class="dashboard-health-row"><span class="dashboard-health-dot dashboard-'+(x.ok?'ok':x.warning?'warn':'fail')+'"></span><div><b>'+esc(x.name)+'</b><small>'+esc(x.detail)+'</small></div><span class="dashboard-health-tag dashboard-'+(x.ok?'ok':x.warning?'warn':'fail')+'">'+(x.ok?'Đạt':x.warning?'Chưa hoàn thiện':'Lỗi')+'</span></div>').join('');
    const failed=checks.filter(x=>!x.ok&&!x.warning).length,warnings=checks.filter(x=>x.warning).length;
    const dot=$('live-dot');if(dot)dot.style.background=failed?'#f87171':warnings?'#fbbf24':'#4ade80';
    loadRoTruyenOverview();
  }

  function filteredUsers(){const q=($('user-search').value||'').toLowerCase(),role=$('user-role-filter').value,status=$('user-status-filter').value;return state.users.filter(u=>(!q||`${u.email||''} ${u.display_name||''}`.toLowerCase().includes(q))&&(!role||u.role===role)&&(!status||u.account_status===status));}
  function renderUsers(){const rows=filteredUsers();$('users-body').innerHTML=rows.length?rows.map(u=>{const role=u.role==='admin'?'<span class="pill pill-admin">admin</span>':'<span class="pill pill-user">user</span>';const st=u.account_status||'active';return `<tr><td><b>${esc(u.display_name||'Không tên')}</b><br><span class="muted">${esc(u.email||u.id)}</span></td><td>${fmtDate(u.created_at)}</td><td>${role}</td><td><span class="pill pill-${st}">${esc(st)}</span></td><td>${fmtDate(u.last_seen_at)}</td><td><button class="btn" onclick="window.rfOpenUser('${u.id}')">Quản lý</button></td></tr>`;}).join(''):'<tr><td colspan="6" class="empty">Không có tài khoản phù hợp.</td></tr>';}
  async function loadUsers(){const {data,error}=await sb.rpc('roflix_admin_users');if(error){$('users-body').innerHTML=`<tr><td colspan="6" class="danger-text">${esc(error.message)}</td></tr>`;return;}state.users=data||[];renderUsers();renderPermissionSummary();}
  window.rfOpenUser=function(id){const u=state.users.find(x=>x.id===id);if(!u)return;$('modal-title').textContent='Quản lý · '+(u.email||u.display_name||u.id);$('modal-body').innerHTML=`<div class="notice"><b>${esc(u.display_name||'Không tên')}</b><br><span class="muted">${esc(u.email||'')}</span><br><span class="muted">UUID: ${esc(u.id)}</span></div><div class="form-row"><label>Quyền hạn</label><select class="input" id="edit-role"><option value="user" ${u.role==='user'?'selected':''}>User</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></div><div class="form-row"><label>Trạng thái</label><select class="input" id="edit-status"><option value="active" ${u.account_status==='active'?'selected':''}>Active</option><option value="suspended" ${u.account_status==='suspended'?'selected':''}>Suspended</option><option value="banned" ${u.account_status==='banned'?'selected':''}>Banned</option></select></div><div class="form-actions"><button class="btn" onclick="window.rfCloseUser()">Hủy</button><button class="btn btn-primary" onclick="window.rfSaveUser('${u.id}')">Lưu thay đổi</button></div>`;$('user-modal').classList.add('open');};
  window.rfCloseUser=function(){$('user-modal').classList.remove('open');};
  window.rfSaveUser=async function(id){const role=$('edit-role').value,status=$('edit-status').value;if(!confirm('Xác nhận thay đổi quyền/trạng thái?'))return;let res=await sb.rpc('roflix_admin_set_role',{p_user_id:id,p_role:role});if(res.error){alert(res.error.message);return;}res=await sb.rpc('roflix_admin_set_status',{p_user_id:id,p_status:status});if(res.error){alert(res.error.message);return;}window.rfCloseUser();await Promise.all([loadUsers(),loadDashboard(),loadAudit()]);};
  function renderPermissionSummary(){const a=state.users.filter(u=>u.role==='admin').length,users=state.users.filter(u=>u.role==='user').length;$('permission-summary').innerHTML=`<div class="stat-value accent-purple">${fmtNum(a)}</div><p class="muted">Admin</p><div class="stat-value" style="margin-top:14px">${fmtNum(users)}</div><p class="muted">User</p><p class="footer-note">Quyền Admin được kiểm tra tại database.</p>`;}

  async function loadModeration(){const {data,error}=await sb.from('community_posts').select('id,movie_title,body,display_name,status,created_at').order('created_at',{ascending:false}).limit(200);if(error){$('community-body').innerHTML=`<tr><td colspan="6" class="danger-text">${esc(error.message)}</td></tr>`;return;}const rows=data||[];$('community-body').innerHTML=rows.length?rows.map(p=>`<tr><td><b>${esc(p.movie_title)}</b></td><td>${esc(p.display_name||'RoFlix user')}</td><td style="max-width:360px;white-space:pre-wrap">${esc(String(p.body||'').slice(0,420))}</td><td><span class="pill ${p.status==='visible'?'pill-active':'pill-banned'}">${esc(p.status)}</span></td><td>${fmtDate(p.created_at)}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" onclick="window.rfTogglePost('${p.id}','${p.status==='visible'?'hidden':'visible'}')">${p.status==='visible'?'Ẩn':'Hiện'}</button><button class="btn btn-danger" onclick="window.rfDeletePost('${p.id}')">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Chưa có bài cộng đồng.</td></tr>';const visible=rows.filter(x=>x.status==='visible').length,hidden=rows.length-visible;$('moderation-status-summary').innerHTML=`<span class="pill pill-active">${fmtNum(visible)} visible</span> <span class="pill pill-banned">${fmtNum(hidden)} hidden</span>`;await loadMovieComments();}
  window.rfTogglePost=async function(id,status){const {error}=await sb.from('community_posts').update({status}).eq('id',id);if(error)alert(error.message);else await loadModeration();};
  window.rfDeletePost=async function(id){if(!confirm('Xóa vĩnh viễn bài cộng đồng này?'))return;const {error}=await sb.from('community_posts').delete().eq('id',id);if(error)alert(error.message);else await loadModeration();};
  async function loadMovieComments(){const body=$('movie-comments-body');if(!body)return;const {data,error}=await sb.from('roflix_movie_comments').select('id,movie_slug,movie_title,username,display_name,body,status,created_at').order('created_at',{ascending:false}).limit(200);if(error){body.innerHTML=`<tr><td colspan="6" class="danger-text">${esc(error.message)}</td></tr>`;return;}body.innerHTML=data?.length?data.map(c=>`<tr><td><b>${esc(c.movie_title||c.movie_slug)}</b><br><small class="muted">${esc(c.movie_slug)}</small></td><td>${esc(c.username||c.display_name||'Khán Giả')}</td><td style="max-width:400px;white-space:pre-wrap">${esc(String(c.body||'').slice(0,500))}</td><td><span class="pill ${c.status==='visible'?'pill-active':'pill-banned'}">${esc(c.status||'visible')}</span></td><td>${fmtDate(c.created_at)}</td><td><button class="btn" onclick="window.rfToggleMovieComment('${c.id}','${c.status==='visible'?'hidden':'visible'}')">${c.status==='visible'?'Ẩn':'Hiện'}</button> <button class="btn btn-danger" onclick="window.rfDeleteMovieComment('${c.id}')">Xóa</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Chưa có bình luận phim.</td></tr>';}
  window.rfToggleMovieComment=async function(id,status){const {error}=await sb.rpc('roflix_admin_movie_comment_status',{p_id:String(id),p_status:status});if(error)alert(error.message);else loadMovieComments();};
  window.rfDeleteMovieComment=async function(id){if(!confirm('Xóa bình luận này?'))return;const {error}=await sb.rpc('roflix_admin_movie_comment_delete',{p_id:String(id)});if(error)alert(error.message);else loadMovieComments();};

  async function loadActiveSessions(){const {data,error}=await sb.rpc('roflix_admin_live_viewers');if(error){$('active-sessions').innerHTML=`<p class="danger-text">${esc(error.message)}</p>`;return;}const live=data||[];$('active-sessions').innerHTML=live.length?live.map(x=>`<div class="event"><div class="event-top"><b>${x.is_authenticated?'👤 Đã đăng nhập':'🌐 Khách'}</b><span class="pill pill-active">online</span></div><small>${esc(x.movie_title||x.page||'RoFlix')} · ${fmtDate(x.last_seen_at)}</small></div>`).join(''):'<div class="empty">Hiện chưa có session active.</div>';renderLiveTable(live);}
  function renderLiveTable(live){const body=$('live-viewers-body');if(!body)return;body.innerHTML=live.length?live.map(x=>`<tr><td>${x.is_authenticated?'👤 User':'🌐 Guest'}</td><td><small>${esc(x.user_id||x.session_id)}</small></td><td>${esc(x.page||'')}</td><td><b>${esc(x.movie_title||'Không xem phim')}</b><br><small class="muted">${esc(x.movie_slug||'')}</small></td><td>${fmtDate(x.last_seen_at)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Chưa có người xem realtime.</td></tr>';const mini=$('live-viewers-mini');if(mini)mini.innerHTML=live.slice(0,5).map(x=>`<div class="event"><b>${x.is_authenticated?'👤':'🌐'}</b> ${esc(x.movie_title||x.page||'RoFlix')}<br><small class="muted">${fmtDate(x.last_seen_at)}</small></div>`).join('')||'<div class="empty">Chưa có người online.</div>';}
  async async function loadAudit(){
    const {data,error}=await sb.from('roflix_admin_audit_logs').select('id,admin_id,action,target_user_id,details,created_at').order('created_at',{ascending:false}).limit(100);
    const host=$('dashboard-admin-activity');
    if(error){$('audit-body').innerHTML='<tr><td colspan="5" class="danger-text">'+esc(error.message)+'</td></tr>';if(host)host.innerHTML='<div class="dashboard-empty">Không tải được nhật ký: '+esc(error.message)+'</div>';return;}
    state.audit=data||[];
    $('audit-body').innerHTML=state.audit.length?state.audit.map(x=>'<tr><td>'+fmtDate(x.created_at)+'</td><td><small>'+esc(x.admin_id||'')+'</small></td><td><b>'+esc(x.action)+'</b></td><td><small>'+esc(x.target_user_id||'')+'</small></td><td><code>'+esc(JSON.stringify(x.details||{}))+'</code></td></tr>').join(''):'<tr><td colspan="5" class="empty">Chưa có thao tác quản trị.</td></tr>';
    if(host){host.innerHTML=state.audit.length?state.audit.slice(0,6).map(x=>'<div class="dashboard-audit-item"><span class="dashboard-audit-mark">↳</span><div><b>'+esc(x.action||'Thao tác quản trị')+'</b><small>'+esc(x.admin_id||'Admin')+' · '+fmtDate(x.created_at)+'</small><p>'+esc(JSON.stringify(x.details||{}).slice(0,180))+'</p></div></div>').join(''):'<div class="dashboard-empty">Chưa có thao tác quản trị được ghi nhận.</div>';}
  }

  function scheduleRefresh(){clearTimeout(state.realtimeTimer);state.realtimeTimer=setTimeout(()=>{loadDashboard();if(state.currentPage==='analytics')loadActiveSessions();if(state.currentPage==='moderation')loadModeration();if(state.currentPage==='schedule'&&window.rfLoadAdminSchedule)window.rfLoadAdminSchedule();},900);}
  function subscribeRealtime(){if(!sb||state.realtime)return;state.realtime=sb.channel('roflix-admin-live-v2').on('postgres_changes',{event:'*',schema:'public',table:'roflix_active_sessions'},scheduleRefresh).on('postgres_changes',{event:'INSERT',schema:'public',table:'roflix_site_events'},scheduleRefresh).on('postgres_changes',{event:'*',schema:'public',table:'roflix_movie_comments'},scheduleRefresh).on('postgres_changes',{event:'*',schema:'public',table:'roflix_release_schedule'},scheduleRefresh).subscribe();}
  function switchPage(page){state.currentPage=page;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('#admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const titles={dashboard:'Dashboard 5.0',users:'Quản lý tài khoản','movie-control':'Quản lý phim 5.0',analytics:'Truy cập & người xem realtime',schedule:'Lịch ra phim 3.0',moderation:'Kiểm duyệt & quyền',audit:'Nhật ký quản trị','game-center':'Gacha 4.0','live-comments':'Comment realtime 3.0','content-tools':'Content Tools',rotruyen:'RoTruyện · Quản trị nội dung',roedu:'RoEdu · Quản trị học tập','system-health':'System Health Center'};setTopTitle('RoHub Admin · '+(titles[page]||page));if(page==='analytics')loadActiveSessions();if(page==='users')loadUsers();if(page==='moderation')loadModeration();if(page==='schedule'&&window.rfLoadAdminSchedule)window.rfLoadAdminSchedule();if(page==='game-center'&&window.rfAdminLoadGameCenter)window.rfAdminLoadGameCenter();if(page==='live-comments'&&window.rfAdminLoadLiveComments)window.rfAdminLoadLiveComments();if(page==='content-tools'&&window.rfAdminLoadContentTools)window.rfAdminLoadContentTools();if(page==='system-health'&&window.rfRunSystemHealth)window.rfRunSystemHealth();}
  async function loadAll(){if(state.loadingAll)return;state.loadingAll=true;try{if(!(await ensureAdmin()))return;await Promise.allSettled([loadDashboard(),loadUsers(),loadActiveSessions(),loadAudit(),loadModeration()]);subscribeRealtime();}catch(error){console.error('[RoHub Admin] Không tải được dashboard:',error);showAccess('Không tải được khu quản trị',error?.message||'Lỗi không xác định. Hãy thử tải lại trang.','⚠️');}finally{state.loadingAll=false;}}

  $('roedu-admin-open-reader')?.addEventListener('click',()=>{const grade=$('roedu-admin-grade')?.value||'10';const subject=$('roedu-admin-subject')?.value||'Toán học';location.href='roedu-reader?grade='+encodeURIComponent(grade)+'&subject='+encodeURIComponent(subject);});
  $('access').addEventListener('submit',async e=>{
    if(e.target.id!=='admin-login-form')return;
    e.preventDefault();
    const button=$('admin-login-submit'),error=$('admin-login-error');
    const email=$('admin-login-email').value.trim(),password=$('admin-login-password').value;
    if(!sb){error.textContent='Supabase chưa sẵn sàng. Hãy tải lại trang sau ít phút.';return;}
    button.disabled=true;button.textContent='Đang xác thực…';error.textContent='';
    try{
      const {error:signInError}=await sb.auth.signInWithPassword({email,password});
      if(signInError)throw signInError;
      const ok=await ensureAdmin();
      if(ok){switchPage('dashboard');await loadAll();}
    }catch(err){
      error.textContent=err?.message==='Invalid login credentials'?'Email hoặc mật khẩu chưa chính xác.':(err?.message||'Đăng nhập thất bại. Vui lòng thử lại.');
    }finally{
      const b=$('admin-login-submit');if(b){b.disabled=false;b.innerHTML='Đăng nhập Admin <span aria-hidden="true">→</span>';}
    }
  });
  document.querySelectorAll('#admin-nav button').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.page)));
  $('refresh-btn').addEventListener('click',loadAll);$('dashboard-refresh-btn')?.addEventListener('click',loadAll);
  $('admin-login-open')?.addEventListener('click',async()=>{try{const ok=await ensureAdmin();if(ok){switchPage('dashboard');await loadAll();return;}}catch(error){showAccess('Không kiểm tra được phiên đăng nhập',error?.message||'Hãy tải lại trang rồi thử lại.','⚠️');} $('access').scrollIntoView({behavior:'smooth',block:'start'});$('admin-login-email')?.focus();});
  $('logout-btn').addEventListener('click',async()=>{await sb.auth.signOut();location.href='index.html';});
  $('modal-close').addEventListener('click',window.rfCloseUser);$('user-modal').addEventListener('click',e=>{if(e.target.id==='user-modal')window.rfCloseUser();});
  $('user-search').addEventListener('input',renderUsers);$('user-role-filter').addEventListener('change',renderUsers);$('user-status-filter').addEventListener('change',renderUsers);
  sb?.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN')loadAll();if(event==='SIGNED_OUT'){state.user=null;showAccess('Đã đăng xuất','Hãy đăng nhập lại bằng tài khoản admin.');}});
  (async()=>{try{const ok=await ensureAdmin();if(ok){switchPage('dashboard');await loadAll();state.refreshTimer=setInterval(()=>{if(state.loadingAll)return;loadDashboard();loadActiveSessions();if(state.currentPage==='users')loadUsers();if(state.currentPage==='moderation')loadModeration();if(state.currentPage==='schedule'&&window.rfLoadAdminSchedule)window.rfLoadAdminSchedule();},30000);}}catch(error){console.error('[RoHub Admin] Lỗi xác thực ban đầu:',error);showAccess('Không xác thực được phiên',error?.message||'Kiểm tra kết nối rồi thử lại.','⚠️');}})();
})();
