(function(){
'use strict';
const $=id=>document.getElementById(id), sb=window.rfSupabase;
const state={user:null,series:[],chapters:[],settings:new Map(),editing:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>d?new Date(d).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'—';
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('visible'),3000);}
function errorText(e){return e?.message||String(e||'Lỗi không xác định');}
function showLogin(message=''){ $('login-panel').hidden=false;$('admin-panel').hidden=true;$('logout').hidden=true;$('login-error').textContent=message;}
function showAdmin(){ $('login-panel').hidden=true;$('admin-panel').hidden=false;$('logout').hidden=false;$('admin-user').textContent=state.user.email||state.user.id;}
async function requireAdmin(){
 if(!sb){showLogin('Supabase chưa sẵn sàng. Kiểm tra cấu hình client.');return false;}
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user){showLogin('Hãy đăng nhập tài khoản quản trị.');return false;}
 const {data,error:profileError}=await sb.from('profiles').select('id,role,account_status').eq('id',user.id).maybeSingle();
 if(profileError){showLogin('Không xác minh được quyền. Hãy áp dụng migration RoTruyen và kiểm tra bảng profiles.');return false;}
 if(data?.role!=='admin'||(data.account_status&&data.account_status!=='active')){await sb.auth.signOut();showLogin('Tài khoản không có quyền admin đang hoạt động.');return false;}
 state.user=user;showAdmin();return true;
}
async function audit(action,type,id,details={}){
 const {error}=await sb.from('rotruyen_audit_logs').insert({actor_id:state.user.id,action,entity_type:type,entity_id:id?String(id):null,details});
 if(error)console.warn('[RoTruyen admin] Audit log write failed:',error.message);
}
async function loadSeries(){
 $('series-body').innerHTML='<tr><td colspan="6">Đang tải…</td></tr>';
 const {data,error}=await sb.from('rotruyen_series').select('*').order('updated_at',{ascending:false}).limit(500);
 if(error){$('series-body').innerHTML='<tr><td colspan="6">Không tải được dữ liệu: '+esc(error.message)+'</td></tr>';return;}
 state.series=data||[];renderSeries();updateStats();fillSeriesSelect();
}
function filteredSeries(){
 const q=$('series-search').value.trim().toLocaleLowerCase('vi'), status=$('series-status').value, source=$('series-source').value;
 return state.series.filter(s=>(!q||[s.title,s.slug,s.author].some(v=>String(v||'').toLocaleLowerCase('vi').includes(q)))&&(status==='all'||(status==='published'?s.is_published:!s.is_published))&&(source==='all'||s.source_key===source));
}
function renderSeries(){
 const rows=filteredSeries();
 $('series-body').innerHTML=rows.length?rows.map(s=>'<tr><td><b>'+esc(s.title)+'</b><small>'+esc(s.slug)+'</small></td><td>'+esc(s.source_key)+(s.source_id?'<small>'+esc(s.source_id)+'</small>':'')+'</td><td>'+esc((s.genres||[]).join(', ')||'Chưa phân loại')+'<small>'+esc(s.content_rating)+'</small></td><td><span class="pill '+(s.is_published?'good':'warn')+'">'+(s.is_published?'Đã xuất bản':'Bản nháp')+'</span></td><td>'+fmt(s.updated_at)+'</td><td class="actions"><button data-edit="'+s.id+'">Sửa</button><button data-toggle="'+s.id+'">'+(s.is_published?'Ẩn':'Xuất bản')+'</button><button class="danger" data-delete="'+s.id+'">Xóa</button></td></tr>').join(''):'<tr><td colspan="6">Chưa có tác phẩm. Thêm mới hoặc áp dụng bộ lọc khác.</td></tr>';
}
function updateStats(){
 $('stat-series').textContent=state.series.length;
 $('stat-published').textContent=state.series.filter(x=>x.is_published).length;
 $('stat-chapters').textContent=state.chapters.length;
 const settings=state.settings.get('public.sources')||{};
 $('stat-sources').textContent=Number(!!settings.mangadex?.enabled)+Number(!!settings.longbook?.enabled);
}
function fillSeriesSelect(){
 const el=$('chapter-series-filter'), previous=el.value;
 el.innerHTML='<option value="">Chọn tác phẩm</option>'+state.series.map(s=>'<option value="'+s.id+'">'+esc(s.title)+'</option>').join('');
 if(state.series.some(s=>s.id===previous))el.value=previous;
}
function openEditor(s=null){
 state.editing=s?.id||null;$('series-form').reset();$('editor-error').textContent='';
 $('editor-title').textContent=s?'Chỉnh sửa tác phẩm':'Thêm tác phẩm';
 $('f-id').value=s?.id||'';$('f-title').value=s?.title||'';$('f-slug').value=s?.slug||'';$('f-author').value=s?.author||'';
 $('f-source').value=s?.source_key||'manual';$('f-cover').value=s?.cover_url||'';$('f-synopsis').value=s?.synopsis||'';
 $('f-genres').value=(s?.genres||[]).join(', ');$('f-rating').value=s?.content_rating||'safe';$('f-status').value=s?.status||'ongoing';
 $('f-source-id').value=s?.source_id||'';$('f-order').value=s?.sort_order||0;$('f-published').checked=!!s?.is_published;
 $('editor').hidden=false;$('f-title').focus();
}
function closeEditor(){$('editor').hidden=true;}
async function saveSeries(e){
 e.preventDefault();$('editor-error').textContent='';
 const title=$('f-title').value.trim(),slug=$('f-slug').value.trim().toLowerCase();
 if(!title||!slug){$('editor-error').textContent='Tên và slug là bắt buộc.';return;}
 const payload={title,slug,author:$('f-author').value.trim(),source_key:$('f-source').value,cover_url:$('f-cover').value.trim(),synopsis:$('f-synopsis').value.trim(),genres:$('f-genres').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30),content_rating:$('f-rating').value,status:$('f-status').value,source_id:$('f-source-id').value.trim()||null,sort_order:Number($('f-order').value)||0,is_published:$('f-published').checked,created_by:state.user.id};
 const id=$('f-id').value;const q=id?sb.from('rotruyen_series').update(payload).eq('id',id):sb.from('rotruyen_series').insert(payload).select('id').single();
 const {data,error}=await q;
 if(error){$('editor-error').textContent=error.message;return;}
 const entityId=id||data?.id;await audit(id?'update':'create','series',entityId,{title,slug,is_published:payload.is_published});
 closeEditor();toast('Đã lưu tác phẩm.');await loadSeries();await loadAudit();
}
async function togglePublish(id){
 const s=state.series.find(x=>x.id===id);if(!s)return;
 const {error}=await sb.from('rotruyen_series').update({is_published:!s.is_published}).eq('id',id);
 if(error){toast('Không thể đổi trạng thái: '+error.message);return;}
 await audit(s.is_published?'unpublish':'publish','series',id,{title:s.title});toast(s.is_published?'Đã ẩn tác phẩm.':'Đã xuất bản tác phẩm.');await loadSeries();await loadAudit();
}
async function deleteSeries(id){
 const s=state.series.find(x=>x.id===id);if(!s||!confirm('Xóa vĩnh viễn "'+s.title+'" và toàn bộ chương liên quan?'))return;
 const {error}=await sb.from('rotruyen_series').delete().eq('id',id);
 if(error){toast('Xóa thất bại: '+error.message);return;}
 await audit('delete','series',id,{title:s.title});toast('Đã xóa tác phẩm và chương liên quan.');await loadSeries();await loadAudit();
}
async function loadChapters(){
 const sid=$('chapter-series-filter').value;if(!sid){$('chapters-body').innerHTML='<tr><td colspan="5">Chọn tác phẩm để xem chương.</td></tr>';state.chapters=[];updateStats();return;}
 $('chapters-body').innerHTML='<tr><td colspan="5">Đang tải…</td></tr>';
 const {data,error}=await sb.from('rotruyen_chapters').select('*').eq('series_id',sid).order('chapter_number',{ascending:true}).limit(1000);
 if(error){$('chapters-body').innerHTML='<tr><td colspan="5">'+esc(error.message)+'</td></tr>';return;}
 state.chapters=data||[];const title=state.series.find(s=>s.id===sid)?.title||'';
 $('chapters-body').innerHTML=state.chapters.length?state.chapters.map(c=>'<tr><td>'+esc(title)+'</td><td>'+esc(c.chapter_number)+'</td><td>'+esc(c.title||'—')+'<small>'+esc(c.external_url||'Không có URL ngoài')+'</small></td><td><span class="pill '+(c.is_published?'good':'warn')+'">'+(c.is_published?'Đã xuất bản':'Bản nháp')+'</span></td><td class="actions"><button data-chapter-edit="'+c.id+'">Sửa</button><button data-chapter-toggle="'+c.id+'">'+(c.is_published?'Ẩn':'Xuất bản')+'</button><button class="danger" data-chapter-delete="'+c.id+'">Xóa</button></td></tr>').join(''):'<tr><td colspan="5">Chưa có chương.</td></tr>';
 updateStats();
}
async function editChapter(id=null){
 const old=state.chapters.find(c=>c.id===id),sid=$('chapter-series-filter').value;
 if(!old&&!sid){toast('Hãy chọn tác phẩm trước.');return;}
 const seriesId=old?.series_id||sid;
 const number=prompt('Số chương:',old?.chapter_number??'1');if(number===null)return;
 const n=Number(number);if(!Number.isFinite(n)||n<0){toast('Số chương không hợp lệ.');return;}
 const title=prompt('Tên chương:',old?.title||'');if(title===null)return;
 const url=prompt('URL chương (chỉ dùng nguồn có quyền):',old?.external_url||'');if(url===null)return;
 const published=confirm('OK để xuất bản chương ngay, Cancel để lưu bản nháp.');
 const payload={series_id:seriesId,chapter_number:n,title:title.trim(),external_url:url.trim(),is_published:published,published_at:published?(old?.published_at||new Date().toISOString()):null};
 const q=old?sb.from('rotruyen_chapters').update(payload).eq('id',id):sb.from('rotruyen_chapters').insert(payload).select('id').single();
 const {data,error}=await q;if(error){toast('Lưu chương thất bại: '+error.message);return;}
 await audit(old?'update':'create','chapter',id||data?.id,{series_id:seriesId,chapter_number:n,is_published:published});toast('Đã lưu chương.');await loadChapters();await loadAudit();
}
async function toggleChapter(id){
 const c=state.chapters.find(x=>x.id===id);if(!c)return;const publish=!c.is_published;
 const {error}=await sb.from('rotruyen_chapters').update({is_published:publish,published_at:publish?new Date().toISOString():null}).eq('id',id);
 if(error){toast(error.message);return;}await audit(publish?'publish':'unpublish','chapter',id,{chapter_number:c.chapter_number});await loadChapters();await loadAudit();
}
async function deleteChapter(id){
 const c=state.chapters.find(x=>x.id===id);if(!c||!confirm('Xóa chương '+c.chapter_number+'?'))return;
 const {error}=await sb.from('rotruyen_chapters').delete().eq('id',id);if(error){toast(error.message);return;}
 await audit('delete','chapter',id,{chapter_number:c.chapter_number});toast('Đã xóa chương.');await loadChapters();await loadAudit();
}
async function loadSetting(){
 const key=$('setting-key').value;const {data,error}=await sb.from('rotruyen_settings').select('key,value').eq('key',key).maybeSingle();
 if(error){toast('Không tải được cấu hình: '+error.message);return;}
 const value=data?.value||{};state.settings.set(key,value);$('setting-value').value=JSON.stringify(value,null,2);
 if(key==='public.sources')renderSourceForm(value);updateStats();
}
async function saveSetting(key,value){
 const {error}=await sb.from('rotruyen_settings').upsert({key,value,updated_by:state.user.id},{onConflict:'key'});
 if(error){toast('Lưu cấu hình thất bại: '+error.message);return false;}
 state.settings.set(key,value);await audit('update','setting',key,{keys:Object.keys(value)});toast('Đã lưu cấu hình.');await loadAudit();updateStats();return true;
}
function renderSourceForm(v){$('source-mangadex').checked=!!v.mangadex?.enabled;$('priority-mangadex').value=v.mangadex?.priority||1;$('source-longbook').checked=!!v.longbook?.enabled;$('longbook-url').value=v.longbook?.baseUrl||'';}
async function saveSources(){
 const v={mangadex:{enabled:$('source-mangadex').checked,priority:Math.max(1,Math.min(99,Number($('priority-mangadex').value)||1))},longbook:{enabled:$('source-longbook').checked,baseUrl:$('longbook-url').value.trim()}};
 if(v.longbook.enabled&&!/^https:\/\/[^/]+/i.test(v.longbook.baseUrl)){toast('LongBook cần URL HTTPS hợp lệ trước khi bật.');return;}
 if(v.longbook.enabled) {if(!confirm('Bạn đã triển khai và kiểm tra bảo mật LongBook API chưa? Chỉ bật khi có quyền sử dụng nguồn này.'))return;}
 await saveSetting('public.sources',v);$('setting-key').value='public.sources';$('setting-value').value=JSON.stringify(v,null,2);
}
async function loadAudit(){
 const {data,error}=await sb.from('rotruyen_audit_logs').select('*').order('created_at',{ascending:false}).limit(150);
 if(error){$('audit-body').innerHTML='<tr><td colspan="5">Không tải được nhật ký: '+esc(error.message)+'</td></tr>';return;}
 $('audit-body').innerHTML=(data||[]).map(x=>'<tr><td>'+fmt(x.created_at)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.entity_type)+'</td><td>'+esc(x.entity_id||'—')+'</td><td><code>'+esc(JSON.stringify(x.details||{}))+'</code></td></tr>').join('')||'<tr><td colspan="5">Chưa có nhật ký.</td></tr>';
}
function switchTab(name){
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
 document.querySelectorAll('.tab-page').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
 if(name==='chapters')loadChapters();if(name==='settings')loadSetting();if(name==='public.sources')loadSettingByKey('public.sources');if(name==='audit')loadAudit();
}
async function loadSettingByKey(key){$('setting-key').value=key;await loadSetting();}
function bind(){
 $('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').textContent='';if(!sb){showLogin('Supabase client chưa sẵn sàng.');return;}
 const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){showLogin(error.message);return;}
 if(await requireAdmin()){await loadSeries();await loadSettingByKey('public.sources');await loadAudit();}});
 $('logout').addEventListener('click',async()=>{await sb?.auth.signOut();state.user=null;showLogin('Bạn đã đăng xuất.');});
 $('new-series').addEventListener('click',()=>openEditor());$('editor-close').addEventListener('click',closeEditor);$('cancel-editor').addEventListener('click',closeEditor);$('editor').addEventListener('click',e=>{if(e.target===$('editor'))closeEditor();});
 $('series-form').addEventListener('submit',saveSeries);$('series-search').addEventListener('input',renderSeries);$('series-status').addEventListener('change',renderSeries);$('series-source').addEventListener('change',renderSeries);$('refresh-series').addEventListener('click',loadSeries);
 $('series-body').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit)openEditor(state.series.find(s=>s.id===b.dataset.edit));if(b.dataset.toggle)togglePublish(b.dataset.toggle);if(b.dataset.delete)deleteSeries(b.dataset.delete);});
 $('new-chapter').addEventListener('click',()=>editChapter());$('refresh-chapters').addEventListener('click',loadChapters);$('chapter-series-filter').addEventListener('change',loadChapters);
 $('chapters-body').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.chapterEdit)editChapter(b.dataset.chapterEdit);if(b.dataset.chapterToggle)toggleChapter(b.dataset.chapterToggle);if(b.dataset.chapterDelete)deleteChapter(b.dataset.chapterDelete);});
 $('setting-key').addEventListener('change',loadSetting);$('load-setting').addEventListener('click',loadSetting);
 $('settings-form').addEventListener('submit',async e=>{e.preventDefault();let value;try{value=JSON.parse($('setting-value').value);}catch(_){toast('JSON không hợp lệ.');return;}if(!value||Array.isArray(value)||typeof value!=='object'){toast('Cấu hình phải là một JSON object.');return;}await saveSetting($('setting-key').value,value);if($('setting-key').value==='public.sources')renderSourceForm(value);});
 $('save-sources').addEventListener('click',saveSources);$('refresh-audit').addEventListener('click',loadAudit);
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
}
bind();
(async()=>{if(await requireAdmin()){await loadSeries();await loadSettingByKey('public.sources');await loadAudit();}})();
})();