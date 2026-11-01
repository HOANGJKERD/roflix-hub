/* RoFlix Google Drive custom movie manager */
(function(){
'use strict';
const sb=window.rfSupabase;if(!sb||window.__RF_DRIVE_MOVIES__)return;window.__RF_DRIVE_MOVIES__=true;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=id=>($(id)?.value||'').trim();let editing=null;
function toast(m,t='info'){if(window.showToastPro)window.showToastPro(t,'Google Drive',m);else alert(m)}
function parseLink(raw){try{const u=new URL(raw);if(u.hostname!=='drive.google.com'&&!u.hostname.endsWith('.drive.google.com'))return null;const m=u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/)||u.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);const id=m?.[1]||u.searchParams.get('id');return id&&/^[A-Za-z0-9_-]{10,}$/.test(id)?id:null}catch(_){return null}}
function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)}
async function isAdmin(){const u=await sb.auth.getUser();if(!u.data?.user)return false;const p=await sb.from('profiles').select('role,account_status').eq('id',u.data.user.id).maybeSingle();return p.data?.role==='admin'&&p.data?.account_status==='active'}
function build(){
 const nav=$('admin-nav'),content=document.querySelector('.content');if(!nav||!content||$('rf-drive-movies-page'))return;
 const btn=document.createElement('button');btn.type='button';btn.dataset.page='drive-movies';btn.textContent='Google Drive';nav.appendChild(btn);
 const sec=document.createElement('section');sec.id='rf-drive-movies-page';sec.className='page';
 sec.innerHTML=`<div class="page-title"><div><h1>Google Drive · Thư viện phim</h1><p>Thêm phim bằng link chia sẻ Drive. KKPhim và VSMOV vẫn giữ nguyên.</p></div><span class="pill pill-admin">ADMIN ONLY</span></div>
 <div class="card"><div class="notice">Google Drive → Chia sẻ → Quyền truy cập chung → <b>Bất kỳ ai có đường liên kết · Người xem</b>. RoFlix dùng Drive Preview, chất lượng do Google tự điều chỉnh. Chưa bật Google Drive API nên trạng thái quyền chia sẻ không thể tự xác minh tại Admin.</div>
 <form id="rf-drive-form" class="grid two" style="gap:12px;margin-top:16px">
 <div class="form-row"><label for="rf-drive-title">Tên phim *</label><input class="input" id="rf-drive-title" required maxlength="180"></div>
 <div class="form-row"><label for="rf-drive-origin">Tên gốc</label><input class="input" id="rf-drive-origin" maxlength="180"></div>
 <div class="form-row" style="grid-column:1/-1"><label for="rf-drive-link">Link chia sẻ Google Drive *</label><input class="input" id="rf-drive-link" type="url" required placeholder="https://drive.google.com/file/d/.../view?usp=sharing"></div>
 <div class="form-row"><label for="rf-drive-poster">Poster URL (HTTPS)</label><input class="input" id="rf-drive-poster" type="url" placeholder="https://..."></div>
 <div class="form-row"><label for="rf-drive-backdrop">Backdrop URL (HTTPS)</label><input class="input" id="rf-drive-backdrop" type="url" placeholder="https://..."></div>
 <div class="form-row"><label for="rf-drive-year">Năm</label><input class="input" id="rf-drive-year" type="number" min="1888" max="2100"></div>
 <div class="form-row"><label for="rf-drive-lang">Ngôn ngữ</label><input class="input" id="rf-drive-lang" value="Vietsub"></div>
 <div class="form-row"><label for="rf-drive-quality">Chất lượng</label><select class="input" id="rf-drive-quality"><option value="AUTO">Tự động (Drive)</option><option value="HD">HD · nhãn</option><option value="Full HD">Full HD · nhãn</option><option value="4K">4K · nhãn</option></select></div>
 <div class="form-row"><label for="rf-drive-categories">Thể loại</label><input class="input" id="rf-drive-categories" placeholder="Hành động, Phiêu lưu"></div>
 <div class="form-row" style="grid-column:1/-1"><label for="rf-drive-summary">Tóm tắt</label><textarea class="input" id="rf-drive-summary" rows="4" maxlength="5000"></textarea></div>
 <div class="form-row" style="grid-column:1/-1"><label for="rf-drive-note">Ghi chú Admin</label><textarea class="input" id="rf-drive-note" rows="2"></textarea></div>
 <div class="form-row"><label><input id="rf-drive-locked" type="checkbox"> 🔒 Yêu cầu đăng nhập</label></div><div class="form-row"><label><input id="rf-drive-published" type="checkbox"> Xuất bản ngay</label></div>
 <div class="form-actions" style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" type="submit" id="rf-drive-save">Lưu phim Drive</button><button class="btn" type="button" id="rf-drive-preview">Mở thử link</button><button class="btn" type="button" id="rf-drive-reset">Làm mới form</button></div><p id="rf-drive-status" class="muted" style="grid-column:1/-1" role="status"></p></form></div>
 <div class="card" style="margin-top:16px"><div class="page-title"><div><h2>Danh sách phim Google Drive</h2><p>Chỉ phim đã xuất bản mới xuất hiện ở RoFlix.</p></div><button class="btn" id="rf-drive-refresh" type="button">↻ Tải lại</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Phim</th><th>Drive file</th><th>Chất lượng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody id="rf-drive-rows"><tr><td colspan="5" class="empty">Đang tải...</td></tr></tbody></table></div></div>`;
 content.appendChild(sec);
 btn.onclick=()=>{document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p===sec));nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn))};
 $('rf-drive-form').onsubmit=save;$('rf-drive-preview').onclick=preview;$('rf-drive-reset').onclick=reset;$('rf-drive-refresh').onclick=load;
}
function preview(){const id=parseLink(val('rf-drive-link'));if(!id)return toast('Link Drive không hợp lệ. Hãy dùng link tệp, không phải thư mục.','warning');window.open('https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview','_blank','noopener,noreferrer')}
function reset(){editing=null;$('rf-drive-form').reset();$('rf-drive-lang').value='Vietsub';$('rf-drive-quality').value='AUTO';$('rf-drive-published').checked=false;$('rf-drive-status').textContent='Đã làm mới form.'}
async function save(e){
 e.preventDefault();if(!(await isAdmin()))return toast('Không có quyền Admin.','error');
 const title=val('rf-drive-title'),link=val('rf-drive-link'),fileId=parseLink(link);if(!title||!fileId)return toast('Cần tên phim và link tệp Google Drive hợp lệ.','warning');
 const year=Number(val('rf-drive-year'))||null;
 const payload={p_id:editing,p_slug:slugify(title),p_title:title,p_origin_name:val('rf-drive-origin'),p_summary:val('rf-drive-summary'),p_poster_url:val('rf-drive-poster'),p_backdrop_url:val('rf-drive-backdrop'),p_year:year,p_quality:val('rf-drive-quality')||'AUTO',p_lang:val('rf-drive-lang')||'Vietsub',p_categories:JSON.stringify(val('rf-drive-categories').split(',').map(x=>x.trim()).filter(Boolean)),p_drive_file_id:fileId,p_drive_share_url:link,p_locked:$('rf-drive-locked').checked,p_lock_reason:$('rf-drive-locked').checked?'Admin yêu cầu đăng nhập':'',p_published:$('rf-drive-published').checked,p_admin_note:val('rf-drive-note')};
 $('rf-drive-save').disabled=true;$('rf-drive-status').textContent='Đang lưu...';
 try{const r=await sb.rpc('roflix_admin_drive_movie_upsert',payload);if(r.error)throw r.error;editing=r.data;$('rf-drive-status').textContent='Đã lưu. Hãy thử preview bằng cửa sổ ẩn danh để chắc chắn file được chia sẻ công khai.';toast('Đã lưu phim Google Drive.','success');await load()}catch(err){$('rf-drive-status').textContent=err.message||'Không thể lưu';toast(err.message||'Lỗi lưu phim','error')}finally{$('rf-drive-save').disabled=false}
}
async function load(){
 if(!$('rf-drive-rows'))return;$('rf-drive-rows').innerHTML='<tr><td colspan="5" class="empty">Đang tải...</td></tr>';
 const r=await sb.from('roflix_custom_movies').select('id,slug,title,drive_file_id,quality,published').eq('source_provider','google_drive').order('updated_at',{ascending:false}).limit(100);
 if(r.error){$('rf-drive-rows').innerHTML='<tr><td colspan="5" class="danger-text">'+esc(r.error.message)+'</td></tr>';return}
 $('rf-drive-rows').innerHTML=(r.data||[]).map(m=>'<tr><td><b>'+esc(m.title)+'</b><br><small>'+esc(m.slug)+'</small></td><td><code>'+esc(m.drive_file_id||'')+'</code></td><td>'+esc(m.quality||'AUTO')+'</td><td>'+(m.published?'<span class="pill pill-active">Đã xuất bản</span>':'<span class="pill">Bản nháp</span>')+'</td><td><button class="btn" data-edit="'+m.id+'">Sửa</button> <button class="btn" data-open="'+m.id+'">Preview</button> <button class="btn btn-danger" data-delete="'+m.id+'">Xóa</button></td></tr>').join('')||'<tr><td colspan="5" class="empty">Chưa có phim Drive.</td></tr>';
 $('rf-drive-rows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
 $('rf-drive-rows').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const m=(r.data||[]).find(x=>x.id===b.dataset.open);if(m?.drive_file_id)window.open('https://drive.google.com/file/d/'+encodeURIComponent(m.drive_file_id)+'/preview','_blank','noopener,noreferrer')});
 $('rf-drive-rows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));
}
async function edit(id){
 const r=await sb.from('roflix_custom_movies').select('*').eq('id',id).maybeSingle();if(r.error||!r.data)return toast(r.error?.message||'Không tìm thấy phim','error');
 const m=r.data;editing=m.id;$('rf-drive-title').value=m.title||'';$('rf-drive-origin').value=m.origin_name||'';$('rf-drive-link').value=m.drive_share_url||'';$('rf-drive-poster').value=m.poster_url||'';$('rf-drive-backdrop').value=m.backdrop_url||'';$('rf-drive-year').value=m.year||'';$('rf-drive-lang').value=m.lang||'Vietsub';$('rf-drive-quality').value=m.quality||'AUTO';$('rf-drive-categories').value=(m.categories||[]).join(', ');$('rf-drive-summary').value=m.summary||'';$('rf-drive-note').value=m.admin_note||'';$('rf-drive-locked').checked=!!m.locked;$('rf-drive-published').checked=!!m.published;$('rf-drive-status').textContent='Đang chỉnh sửa: '+m.title;$('rf-drive-form').scrollIntoView({behavior:'smooth',block:'start'});
}
async function remove(id){if(!confirm('Xóa phim Drive này khỏi catalog RoFlix?'))return;const r=await sb.rpc('roflix_admin_custom_movie_delete',{p_id:id});if(r.error)return toast(r.error.message,'error');if(editing===id)reset();toast('Đã xóa phim.','success');load()}
function boot(){build();if($('rf-drive-rows'))load();else setTimeout(boot,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();