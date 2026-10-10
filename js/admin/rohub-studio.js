(function(){
'use strict';
const sb=window.rfSupabase;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults={schemaVersion:1,theme:{accent:'#ffb20d',background:'#090a0f',panel:'#15161d',radius:16,density:'comfortable'},layout:{maxWidth:1280,contentGap:16,sidebar:true},components:{header:{enabled:true,sticky:true},footer:{enabled:true},hero:{enabled:true},card:{radius:16,hover:'lift'}}};
const state={user:null,rows:[],selected:null,loading:false};
function message(text,error=false){const el=$('rh-template-message');el.textContent=text;el.style.color=error?'#fb7185':'#a1a1aa'}
function slugify(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function statusLabel(s){return s==='published'?'Đã xuất bản':s==='archived'?'Lưu trữ':'Bản nháp'}
function appLabel(s){return s==='both'?'RoFlix + RoTruyện':s==='roflix'?'RoFlix':'RoTruyện'}
function typeLabel(s){return ({homepage:'Trang chủ',header:'Header',footer:'Footer',page:'Trang nội dung',series:'Chi tiết',reader:'Trình đọc',login:'Đăng nhập',register:'Đăng ký',search:'Tìm kiếm',category:'Danh mục',tag:'Thẻ',author:'Tác giả','404':'Trang 404'})[s]||s}
function renderList(){
 const q=$('rh-template-search').value.trim().toLowerCase(), app=$('rh-template-app-filter').value;
 const rows=state.rows.filter(r=>(!app||r.target_app===app)&&(!q||(r.name+' '+r.slug+' '+r.description).toLowerCase().includes(q)));
 $('rh-template-list').innerHTML=rows.length?rows.map(r=>'<button type="button" class="rh-template-item '+(state.selected===r.id?'is-selected':'')+'" data-template-id="'+esc(r.id)+'"><span class="rh-template-item-top"><strong>'+esc(r.name)+'</strong><span class="rh-template-status status-'+esc(r.status)+'">'+esc(statusLabel(r.status))+'</span></span><span class="rh-template-item-meta">'+esc(appLabel(r.target_app))+' · '+esc(typeLabel(r.template_type))+'</span><span class="rh-template-item-foot"><code>'+esc(r.slug)+'</code><span>v'+Number(r.version||1)+'</span></span></button>').join(''):'<div class="empty">Chưa có template phù hợp. Hãy tạo template đầu tiên.</div>';
 $('rh-template-list').querySelectorAll('[data-template-id]').forEach(el=>el.addEventListener('click',()=>loadIntoForm(state.rows.find(r=>r.id===el.dataset.templateId))));
}
function resetForm(){
 state.selected=null;$('rh-template-form').reset();$('rh-template-id').value='';$('rh-template-editor-title').textContent='Tạo template mới';$('rh-template-version').textContent='Bản nháp';$('rh-template-config').value=JSON.stringify(defaults,null,2);$('rh-template-status').value='draft';$('rh-template-app').value='both';$('rh-template-type').value='homepage';$('rh-template-delete').disabled=true;renderList();message('Sẵn sàng tạo template.');}
function loadIntoForm(row){
 if(!row)return;state.selected=row.id;$('rh-template-id').value=row.id;$('rh-template-name').value=row.name;$('rh-template-slug').value=row.slug;$('rh-template-app').value=row.target_app;$('rh-template-type').value=row.template_type;$('rh-template-description').value=row.description||'';$('rh-template-status').value=row.status;$('rh-template-config').value=JSON.stringify(row.config||{},null,2);$('rh-template-editor-title').textContent='Chỉnh sửa template';$('rh-template-version').textContent='v'+row.version+' · '+statusLabel(row.status);$('rh-template-delete').disabled=false;renderList();message('Đã tải template từ Supabase.');}
async function currentAdmin(){
 if(!sb)throw new Error('Supabase chưa khởi tạo. Kiểm tra cấu hình Supabase.');
 const {data,error}=await sb.auth.getUser();if(error)throw error;
 if(!data.user)throw new Error('Bạn cần đăng nhập tài khoản admin.');
 const {data:profile,error:pe}=await sb.from('profiles').select('role,account_status').eq('id',data.user.id).maybeSingle();
 if(pe)throw pe;if(profile?.role!=='admin'||(profile.account_status&&profile.account_status!=='active'))throw new Error('Tài khoản hiện tại không có quyền quản trị.');
 state.user=data.user;
}
async function refresh(keepSelection=true){
 if(!sb){$('rh-template-list').innerHTML='<div class="empty">Supabase chưa sẵn sàng.</div>';return}
 $('rh-template-list').innerHTML='<div class="empty">Đang tải dữ liệu thật...</div>';
 try{await currentAdmin();const {data,error}=await sb.from('rohub_templates').select('*').order('updated_at',{ascending:false});if(error)throw error;state.rows=data||[];renderList();if(keepSelection&&state.selected){const row=state.rows.find(r=>r.id===state.selected);if(row)loadIntoForm(row);else resetForm()}message('Đã đồng bộ '+state.rows.length+' template từ Supabase.')}
 catch(e){$('rh-template-list').innerHTML='<div class="empty">Không thể tải template: '+esc(e.message||e)+'</div>';message(e.message||'Không tải được dữ liệu.',true)}
}
function parseConfig(){let c;try{c=JSON.parse($('rh-template-config').value)}catch(e){throw new Error('JSON không hợp lệ: '+e.message)}if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('Cấu hình phải là một object JSON.');return c}
async function save(e){
 e.preventDefault();
 try{
 await currentAdmin();const name=$('rh-template-name').value.trim();const slug=slugify($('rh-template-slug').value);
 if(!name)throw new Error('Vui lòng nhập tên template.');if(!slug)throw new Error('Slug không hợp lệ.');
 const config=parseConfig(), id=$('rh-template-id').value||null;
 const payload={name,slug,target_app:$('rh-template-app').value,template_type:$('rh-template-type').value,description:$('rh-template-description').value.trim(),config,status:$('rh-template-status').value,updated_by:state.user.id};
 if(id){const {data,error}=await sb.from('rohub_templates').update(payload).eq('id',id).select('*').single();if(error)throw error;state.selected=data.id;message('Đã cập nhật template trong Supabase.')}
 else{payload.created_by=state.user.id;const {data,error}=await sb.from('rohub_templates').insert(payload).select('*').single();if(error)throw error;state.selected=data.id;message('Đã tạo và lưu template mới trong Supabase.')}
 await refresh(true);
 }catch(e){message(e.message||'Không lưu được template.',true)}
}
async function removeSelected(){
 const id=$('rh-template-id').value;if(!id)return;
 const row=state.rows.find(r=>r.id===id);if(!row)return;
 if(!confirm('Xóa template "'+row.name+'"? Thao tác này không thể hoàn tác.'))return;
 try{await currentAdmin();const {error}=await sb.from('rohub_templates').delete().eq('id',id);if(error)throw error;state.rows=state.rows.filter(r=>r.id!==id);resetForm();renderList();message('Đã xóa template khỏi Supabase.')}catch(e){message(e.message||'Không thể xóa template.',true)}
}
function downloadJson(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importJson(file){try{const text=await file.text();const data=JSON.parse(text);if(data.template){const t=data.template;$('rh-template-name').value=t.name||'';$('rh-template-slug').value=t.slug||slugify(t.name);$('rh-template-app').value=t.target_app||'both';$('rh-template-type').value=t.template_type||'homepage';$('rh-template-description').value=t.description||'';$('rh-template-status').value=t.status||'draft';$('rh-template-config').value=JSON.stringify(t.config||{},null,2)}else $('rh-template-config').value=JSON.stringify(data,null,2);message('Đã nạp JSON vào form. Nhấn Lưu vào Supabase để lưu thật.')}catch(e){message('Không đọc được JSON: '+e.message,true)}}
function init(){
 $('rh-template-new').addEventListener('click',resetForm);$('rh-template-form').addEventListener('submit',save);$('rh-template-delete').addEventListener('click',removeSelected);
 $('rh-template-search').addEventListener('input',renderList);$('rh-template-app-filter').addEventListener('change',renderList);
 $('rh-template-name').addEventListener('input',()=>{if(!$('rh-template-id').value&&!$('rh-template-slug').dataset.touched)$('rh-template-slug').value=slugify($('rh-template-name').value)});
 $('rh-template-slug').addEventListener('input',()=>{$('rh-template-slug').dataset.touched='1'});
 $('rh-template-format').addEventListener('click',()=>{try{$('rh-template-config').value=JSON.stringify(parseConfig(),null,2);message('JSON đã được định dạng.')}catch(e){message(e.message,true)}});
 $('rh-template-insert-theme').addEventListener('click',()=>{const c={schemaVersion:1,theme:{accent:$('rh-accent').value,background:$('rh-bg').value,panel:$('rh-panel').value,radius:Number($('rh-radius').value),density:$('rh-density').value}};$('rh-template-config').value=JSON.stringify(c,null,2);message('Đã lấy design tokens từ theme preview. Hãy lưu để ghi vào Supabase.')});
 $('rh-template-export').addEventListener('click',()=>{try{downloadJson({schemaVersion:1,template:{id:$('rh-template-id').value||null,name:$('rh-template-name').value,slug:slugify($('rh-template-slug').value),target_app:$('rh-template-app').value,template_type:$('rh-template-type').value,description:$('rh-template-description').value,status:$('rh-template-status').value,config:parseConfig()}},(slugify($('rh-template-name').value)||'rohub-template')+'.json')}catch(e){message(e.message,true)}});
 $('rh-template-import').addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await importJson(f);e.target.value=''});
 $('rh-template-duplicate').addEventListener('click',()=>{const old=$('rh-template-name').value.trim();$('rh-template-id').value='';state.selected=null;$('rh-template-name').value=old?old+' (bản sao)':'';$('rh-template-slug').value=slugify($('rh-template-name').value)+'-'+Date.now().toString().slice(-5);$('rh-template-status').value='draft';$('rh-template-editor-title').textContent='Nhân bản template';$('rh-template-version').textContent='Bản nháp mới';$('rh-template-delete').disabled=true;message('Bản sao chưa được lưu. Nhấn Lưu vào Supabase để tạo bản ghi mới.')});
 $('rh-template-status').addEventListener('change',()=>{if($('rh-template-status').value==='published')message('Khi lưu, trạng thái sẽ chuyển thành Đã xuất bản trong database. Cần tích hợp runtime để áp dụng ra giao diện người dùng.')});
 resetForm();refresh(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();