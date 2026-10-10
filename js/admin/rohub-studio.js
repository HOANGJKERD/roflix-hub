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

/* Visual editor: section-based drag/drop canvas backed by the same persisted JSON config. */
const visualState={sections:[],selectedId:null,device:'desktop',dragId:null};
const blockDefaults={
 header:{type:'header',title:'RoTruyện',subtitle:'Khám phá thế giới truyện',enabled:true,showLogo:true,showSearch:true,showNavigation:true,background:'#090a0f',accent:'#ffb20d'},
 banner:{type:'banner',title:'Thế giới truyện trong tầm tay',description:'Khám phá truyện mới, truyện nổi bật và những chương vừa cập nhật.',buttonText:'Khám phá ngay',enabled:true,background:'#15161d',accent:'#ffb20d'},
 'series-grid':{type:'series-grid',title:'Truyện nổi bật',description:'Những bộ truyện được cộng đồng quan tâm.',columns:4,cardStyle:'poster',limit:8,enabled:true,background:'#090a0f',accent:'#ffb20d'},
 'content-card':{type:'content-card',title:'Tiếp tục hành trình của bạn',description:'Khám phá những câu chuyện mới mỗi ngày.',buttonText:'Xem thêm',enabled:true,background:'#15161d',accent:'#ffb20d'},
 footer:{type:'footer',title:'RoTruyện',description:'Không gian dành cho người yêu truyện.',copyright:'© 2026 RoTruyện',showLinks:true,enabled:true,background:'#090a0f',accent:'#ffb20d'}
};
function visualConfig(){
 try{return parseConfig()}catch(e){return {}}
}
function normalizeSections(config){
 let sections=Array.isArray(config.sections)?config.sections:null;
 if(!sections){
  const comps=config.components||{};
  sections=['header','banner','series-grid','content-card','footer'].filter(t=>comps[t]?.enabled!==false).map((t,i)=>({...JSON.parse(JSON.stringify(blockDefaults[t])),...(comps[t]||{}),id:(comps[t]?.id||'section-'+(i+1))}));
 }
 return sections.map((s,i)=>({id:s.id||('section-'+(i+1)+'-'+Math.random().toString(36).slice(2,6)),...s,type:s.type||s.kind||'content-card'}));
}
function syncVisualToJson(){
 const config=visualConfig();config.schemaVersion=config.schemaVersion||1;config.sections=visualState.sections.map(s=>({...s}));
 config.components=config.components||{};
 visualState.sections.forEach(s=>{config.components[s.type]={...(config.components[s.type]||{}),...s,enabled:s.enabled!==false}});
 $('rh-template-config').value=JSON.stringify(config,null,2);
}
function safeColor(c,fallback){return /^#[0-9a-f]{3,8}$/i.test(c||'')?c:fallback}
function previewBlock(s,index){
 const accent=safeColor(s.accent,'#ffb20d'),bg=safeColor(s.background,s.type==='banner'||s.type==='content-card'?'#15161d':'#090a0f');
 let body='';
 if(s.type==='header')body='<div class="rh-live-brand"><span class="rh-live-logo">▶</span><strong>'+esc(s.title||'RoTruyện')+'</strong></div><div class="rh-live-nav">'+(s.showNavigation!==false?'<span>Trang chủ</span><span>Thể loại</span><span>BXH</span>':'')+(s.showSearch!==false?'<span class="rh-live-search">⌕ Tìm truyện...</span>':'')+'</div>';
 else if(s.type==='banner')body='<div class="rh-live-banner-copy"><span class="rh-live-eyebrow">KHÁM PHÁ MỖI NGÀY</span><h2>'+esc(s.title||'Banner')+'</h2><p>'+esc(s.description||'')+'</p>'+(s.buttonText?'<span class="rh-live-cta">'+esc(s.buttonText)+' →</span>':'')+'</div><div class="rh-live-banner-art">漫</div>';
 else if(s.type==='series-grid')body='<div class="rh-live-section-title"><div><h3>'+esc(s.title||'Danh sách truyện')+'</h3><p>'+esc(s.description||'')+'</p></div><span>Xem tất cả →</span></div><div class="rh-live-book-grid" style="--rh-live-cols:'+Math.max(2,Math.min(6,Number(s.columns)||4))+'">'+Array.from({length:Math.max(2,Math.min(8,Number(s.limit)||4))},(_,i)=>'<div class="rh-live-book"><div class="rh-live-cover" style="background:linear-gradient(145deg,'+accent+'55,#25243a,'+(i%2?'#7537a8':'#214a67')+')"><span>漫</span></div><b>'+esc(['Hành trình mới','Kiếm sĩ cuối cùng','Thành phố ánh trăng','Bí mật học viện','Vùng đất xa xăm','Ngày mai rực rỡ','Kẻ du hành','Mùa sao rơi'][i])+'</b><small>Chương '+(i+12)+'</small></div>').join('')+'</div>';
 else if(s.type==='footer')body='<div class="rh-live-footer-brand"><strong>'+esc(s.title||'RoTruyện')+'</strong><p>'+esc(s.description||'')+'</p></div><div class="rh-live-footer-links">'+(s.showLinks!==false?'<span>Giới thiệu</span><span>Điều khoản</span><span>Liên hệ</span>':'')+'</div><small>'+esc(s.copyright||'© 2026')+'</small>';
 else body='<div class="rh-live-content-card"><span class="rh-live-eyebrow">GỢI Ý DÀNH CHO BẠN</span><h3>'+esc(s.title||'Thẻ nội dung')+'</h3><p>'+esc(s.description||'')+'</p>'+(s.buttonText?'<span class="rh-live-cta">'+esc(s.buttonText)+' →</span>':'')+'</div>';
 return '<section class="rh-live-section '+(s.enabled===false?'is-disabled':'')+(visualState.selectedId===s.id?' is-selected':'')+'" data-live-section="'+esc(s.id)+'" draggable="true" style="--rh-block-accent:'+accent+';--rh-block-bg:'+bg+'"><div class="rh-live-block-tools"><span><i class="fa-solid fa-grip-vertical"></i> '+esc(s.type)+'</span><span><button type="button" data-section-edit="'+esc(s.id)+'" title="Cấu hình"><i class="fa-solid fa-sliders"></i></button><button type="button" data-section-toggle="'+esc(s.id)+'" title="Ẩn/hiện"><i class="fa-solid '+(s.enabled===false?'fa-eye':'fa-eye-slash')+'"></i></button><button type="button" data-section-delete="'+esc(s.id)+'" title="Xóa khối"><i class="fa-solid fa-trash"></i></button></span></div><div class="rh-live-section-body">'+body+'</div></section>';
}
function renderVisual(){
 const canvas=$('rh-template-preview');if(!canvas)return;
 const width=visualState.device==='mobile'?'390px':visualState.device==='tablet'?'768px':'100%';
 canvas.style.maxWidth=width;
 canvas.innerHTML='<div class="rh-live-page-top"><span>◉ ROFLIX STYLE PREVIEW</span><span>✦</span></div>'+visualState.sections.map(previewBlock).join('')+'<div class="rh-live-preview-end">Cuối bản xem trước</div>';
 canvas.querySelectorAll('[data-section-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();selectVisualBlock(b.dataset.sectionEdit)}));
 canvas.querySelectorAll('[data-live-section]').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('button'))return;selectVisualBlock(el.dataset.liveSection)});el.addEventListener('dragstart',e=>{visualState.dragId=el.dataset.liveSection;e.dataTransfer.setData('text/plain',visualState.dragId);e.dataTransfer.effectAllowed='move';el.classList.add('is-dragging')});el.addEventListener('dragend',()=>el.classList.remove('is-dragging'));el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('is-drop-target')});el.addEventListener('dragleave',()=>el.classList.remove('is-drop-target'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('is-drop-target');const from=e.dataTransfer.getData('text/plain')||visualState.dragId,to=el.dataset.liveSection;if(!from||from===to)return;const a=visualState.sections.findIndex(s=>s.id===from),b=visualState.sections.findIndex(s=>s.id===to);if(a<0||b<0)return;const [item]=visualState.sections.splice(a,1);visualState.sections.splice(b,0,item);syncVisualToJson();renderVisual()})});
 canvas.querySelectorAll('[data-section-toggle]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const s=visualState.sections.find(x=>x.id===b.dataset.sectionToggle);if(s){s.enabled=s.enabled===false;syncVisualToJson();renderVisual();selectVisualBlock(s.id)}}));
 canvas.querySelectorAll('[data-section-delete]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const s=visualState.sections.find(x=>x.id===b.dataset.sectionDelete);if(!s)return;if(!confirm('Xóa khối '+(s.title||s.type)+' khỏi template?'))return;visualState.sections=visualState.sections.filter(x=>x.id!==s.id);visualState.selectedId=null;syncVisualToJson();renderVisual();renderInspector(null)}));
}
function selectVisualBlock(id){visualState.selectedId=id;renderVisual();renderInspector(visualState.sections.find(s=>s.id===id))}
function renderInspector(s){
 const root=$('rh-block-inspector-content');if(!root)return;if(!s){root.innerHTML='<div class="rh-inspector-empty">Chọn một khối trong bản xem trước để chỉnh sửa.</div>';return}
 const fields=[['title','Tiêu đề','text'],['description','Mô tả','textarea'],['buttonText','Nhãn nút','text'],['columns','Số cột (2-6)','number'],['limit','Số thẻ (2-8)','number'],['copyright','Dòng bản quyền','text'],['background','Màu nền','color'],['accent','Màu nhấn','color']];
 let allowed= s.type==='header'?['title','background','accent']:s.type==='banner'?['title','description','buttonText','background','accent']:s.type==='series-grid'?['title','description','columns','limit','background','accent']:s.type==='footer'?['title','description','copyright','background','accent']:['title','description','buttonText','background','accent'];
 root.innerHTML='<div class="rh-inspector-type"><span class="rh-inspector-icon"><i class="fa-solid '+({header:'fa-bars',banner:'fa-panorama','series-grid':'fa-grip',footer:'fa-grip-lines','content-card':'fa-id-card'}[s.type]||'fa-cube')+'"></i></span><div><b>'+esc(s.type)+'</b><small>Kéo khối để sắp xếp</small></div></div>'+fields.filter(f=>allowed.includes(f[0])).map(f=>'<label class="rh-inspector-field"><span>'+f[1]+'</span>'+(f[2]==='textarea'?'<textarea data-inspect="'+f[0]+'" rows="3">'+esc(s[f[0]]||'')+'</textarea>':'<input data-inspect="'+f[0]+'" type="'+f[2]+'" value="'+esc(s[f[0]]??(f[2]==='color'?'#ffb20d':''))+'" '+(f[2]==='number'?'min="'+(f[0]==='columns'?2:2)+'" max="'+(f[0]==='columns'?6:8)+'"':'')+'>')+'</label>').join('')+'<label class="rh-inspector-check"><input type="checkbox" data-inspect="enabled" '+(s.enabled===false?'':'checked')+'> Hiển thị khối</label><button type="button" class="btn btn-primary" id="rh-inspector-apply">Áp dụng thay đổi</button><p class="muted">Thay đổi được đồng bộ vào cấu hình JSON. Nhấn “Lưu vào Supabase” để lưu vĩnh viễn.</p>';
 $('rh-inspector-apply').addEventListener('click',()=>{root.querySelectorAll('[data-inspect]').forEach(input=>{const k=input.dataset.inspect;s[k]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value});syncVisualToJson();renderVisual();renderInspector(s);message('Đã cập nhật bản xem trước. Nhấn Lưu vào Supabase để lưu dữ liệu.')});
}
function initVisual(){
 if(!$('rh-template-preview'))return;
 $('rh-template-config').addEventListener('input',()=>{try{visualState.sections=normalizeSections(parseConfig());renderVisual()}catch(e){}});
 document.querySelectorAll('[data-add-block]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.addBlock;const s={...JSON.parse(JSON.stringify(blockDefaults[type])),id:'section-'+Date.now().toString(36)};visualState.sections.push(s);visualState.selectedId=s.id;syncVisualToJson();renderVisual();renderInspector(s);message('Đã thêm khối '+type+'. Nhấn Lưu vào Supabase để lưu.')}));
 document.querySelectorAll('[data-preview-width]').forEach(b=>b.addEventListener('click',()=>{visualState.device=b.dataset.previewWidth;document.querySelectorAll('[data-preview-width]').forEach(x=>x.classList.toggle('is-active',x===b));$('rh-preview-size-label').textContent=({desktop:'Desktop · 100%',tablet:'Tablet · 768px',mobile:'Mobile · 390px'})[visualState.device];renderVisual()}));
 const oldReset=resetForm;
 resetForm=function(){oldReset();visualState.selectedId=null;visualState.sections=normalizeSections(defaults);syncVisualToJson();renderVisual();renderInspector(null)};
 const oldLoad=loadIntoForm;
 loadIntoForm=function(row){oldLoad(row);visualState.selectedId=null;visualState.sections=normalizeSections(row.config||{});renderVisual();renderInspector(null)};
 visualState.sections=normalizeSections(defaults);syncVisualToJson();renderVisual();
}
\nfunction init(){
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
 initVisual();resetForm();refresh(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();