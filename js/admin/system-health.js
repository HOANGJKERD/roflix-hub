(function(){
'use strict';
const $=id=>document.getElementById(id), client=()=>window.rfSupabase;
const state={running:false,lastRun:null,results:[]};
const checks={startedAt:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=v=>v?new Date(v).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'medium'}):'Chưa chạy';
function paintSummary(){
 const counts={ok:0,warn:0,fail:0};state.results.forEach(x=>counts[x.status]++);
 const host=$('health-summary');if(!host)return;
 host.innerHTML=[['Đạt',counts.ok,'ok'],['Cảnh báo',counts.warn,'warn'],['Lỗi',counts.fail,'fail']].map(x=>'<div class="health-metric"><span>'+x[0]+'</span><strong class="health-'+x[2]+'">'+x[1]+'</strong></div>').join('');
 $('health-last-run').textContent='Lần kiểm tra gần nhất: '+stamp(state.lastRun);
 $('health-progress').textContent=state.running?'Đang kiểm tra…':state.results.length+' hạng mục đã kiểm tra';
}
function render(){
 const host=$('health-results');if(!host)return;
 if(!state.results.length)host.innerHTML='<div class="health-empty">Chưa chạy kiểm tra. Bấm “Chạy kiểm tra” để bắt đầu.</div>';
 else host.innerHTML=state.results.map(x=>'<article class="health-result health-result-'+x.status+'"><span class="health-status">'+(x.status==='ok'?'✓':x.status==='warn'?'!':'×')+'</span><div class="health-result-copy"><div class="health-result-title">'+esc(x.title)+'</div><p>'+esc(x.detail)+'</p>'+(x.meta?'<small>'+esc(x.meta)+'</small>':'')+'</div><span class="health-tag">'+(x.status==='ok'?'Đạt':x.status==='warn'?'Cần xem':'Lỗi')+'</span></article>').join('');
 paintSummary();
}
function add(title,status,detail,meta){state.results.push({title,status,detail,meta:meta||'',checkedAt:new Date().toISOString()});render();}
async function fetchTimed(url,ms){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms||7000);
 try{return await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json, text/plain, */*'}});}
 finally{clearTimeout(timer);}
}
async function checkAsset(path){
 try{const r=await fetchTimed(new URL(path,location.href).href,6000);if(r.ok)add('Tệp giao diện: '+path,'ok','HTTP '+r.status,'Tài nguyên tĩnh');else add('Tệp giao diện: '+path,'fail','Máy chủ trả HTTP '+r.status,'Kiểm tra tên tệp, đường dẫn và cấu hình deploy');}
 catch(e){add('Tệp giao diện: '+path,'fail',e.name==='AbortError'?'Hết thời gian chờ tải tệp':e.message,'Không thể xác minh tài nguyên trên máy chủ hiện tại');}
}
async function checkApi(name,url,validator){
 const started=performance.now();
 try{
  const r=await fetchTimed(url,8000),type=r.headers.get('content-type')||'',elapsed=Math.round(performance.now()-started);
  if(!r.ok){add(name,'warn','HTTP '+r.status+' · '+elapsed+' ms','Endpoint phản hồi nhưng không trả mã thành công');return;}
  let detail='HTTP '+r.status+' · '+elapsed+' ms'+(type?' · '+type.split(';')[0]:'');
  if(type.includes('json')){
   let payload;try{payload=await r.clone().json();}catch(_){add(name,'warn',detail,'Content-Type JSON nhưng không phân tích được JSON hợp lệ');return;}
   if(validator&&!validator(payload)){add(name,'warn',detail,'JSON hợp lệ nhưng thiếu cấu trúc dữ liệu mong đợi');return;}
   add(name,'ok',detail,'Đã xác minh phản hồi JSON cơ bản, chưa xác minh luồng phát/xem end-to-end');
  }else add(name,'warn',detail,'Phản hồi không khai báo JSON; có thể là CORS, trang chặn hoặc thay đổi API');
 }catch(e){add(name,'warn',e.name==='AbortError'?'Hết thời gian chờ.':e instanceof TypeError?'Trình duyệt không đọc được endpoint (có thể do CORS, mạng hoặc máy chủ).':e.message,'Không đủ căn cứ kết luận máy chủ nguồn đã ngừng hoạt động');}
}
async function checkTable(db,table){
 try{const result=await db.from(table).select('*',{head:true,count:'exact'});if(result.error){add('Bảng Supabase: '+table,'fail',result.error.message,'Kiểm tra migration, tên bảng và quyền RLS');return;}add('Bảng Supabase: '+table,'ok','Truy vấn metadata thành công'+(Number.isFinite(result.count)?' · '+result.count+' bản ghi nhìn thấy':''),'Số bản ghi phản ánh quyền của phiên hiện tại');}
 catch(e){add('Bảng Supabase: '+table,'fail',e.message,'Lỗi truy vấn không mong đợi');}
}
async function run(){
 if(state.running)return;state.running=true;state.results=[];state.lastRun=new Date().toISOString();checks.startedAt=performance.now();const runButton=$('health-run-btn');if(runButton){runButton.disabled=true;runButton.textContent='Đang kiểm tra…';}render();
 const db=client();
 if(!db){add('Supabase client','fail','window.rfSupabase chưa được khởi tạo.','Kiểm tra CDN, cấu hình Supabase và js/core/supabase.js');state.running=false;render();return;}
 add('Supabase client','ok','Client JavaScript đã được khởi tạo.','Chưa đồng nghĩa backend đã truy cập được');
 try{
  const auth=await db.auth.getUser();
  if(auth.error)throw auth.error;
  if(!auth.data||!auth.data.user)add('Phiên đăng nhập','fail','Không tìm thấy người dùng đang đăng nhập.','Đăng nhập bằng tài khoản quản trị rồi thử lại');
  else{
   add('Phiên đăng nhập','ok','Đã đọc được người dùng hiện tại.',auth.data.user.email||auth.data.user.id);
   const profile=await db.from('profiles').select('role,account_status').eq('id',auth.data.user.id).maybeSingle();
   if(profile.error)add('Quyền quản trị','fail',profile.error.message,'Không xác minh được role từ bảng profiles');
   else if(!profile.data||profile.data.role!=='admin')add('Quyền quản trị','fail','Tài khoản hiện tại không có role admin.','Chỉ quản trị viên mới được chạy chẩn đoán quản trị');
   else if(profile.data.account_status&&profile.data.account_status!=='active')add('Quyền quản trị','fail','Tài khoản admin không ở trạng thái active.','Kiểm tra account_status');
   else add('Quyền quản trị','ok','Role admin và trạng thái tài khoản đã được xác minh.');
  }
 }catch(e){add('Phiên đăng nhập / quyền','fail',e.message,'Kiểm tra kết nối Supabase và chính sách RLS');}
 const permission=state.results.find(x=>x.title==='Quyền quản trị');
 const signedIn=state.results.find(x=>x.title==='Phiên đăng nhập');
 if(!permission||permission.status!=='ok'||!signedIn||signedIn.status!=='ok'){
  add('Kiểm tra bị giới hạn','warn','Đã dừng các truy vấn sâu vì không xác minh được phiên admin.','Không chạy truy vấn bảng hoặc kiểm tra API khi chưa xác thực admin.');
  state.running=false;state.lastRun=new Date().toISOString();if(runButton){runButton.disabled=false;runButton.textContent='▶ Chạy kiểm tra';}render();return;
 }
 await Promise.all(['profiles','rohub_theme_versions','rotruyen_series','rotruyen_chapters','roflix_active_sessions','roflix_admin_audit_logs'].map(t=>checkTable(db,t)));
 await Promise.all(['js/config/supabase.config.js','js/core/supabase.js','js/admin/admin.js','js/admin/rotruyen-admin.js','js/admin/rohub-studio.js','js/rotruyen/published-theme-runtime.js'].map(checkAsset));
 await Promise.all([
  checkApi('Nguồn phim KKPhim','https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1',p=>!!p&&(Array.isArray(p.data)||Array.isArray(p.items)||Array.isArray(p.items?.data))),
  checkApi('Nguồn phim VSMOV','https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1',p=>!!p&&(Array.isArray(p.data)||Array.isArray(p.items)||Array.isArray(p.results))),
  checkApi('Nguồn truyện MangaDex qua RoHub','/api/mangadex/manga?limit=1&includes%5B%5D=cover_art',p=>!!p&&Array.isArray(p.data))
 ]);
 add('Hiệu năng kiểm tra','ok','Hoàn tất '+Math.round(performance.now()-checks.startedAt)+' ms.','Thời gian phía trình duyệt, không phải SLA máy chủ');
 state.running=false;state.lastRun=new Date().toISOString();if(runButton){runButton.disabled=false;runButton.textContent='▶ Chạy kiểm tra';}render();
}
function exportReport(){
 const report={product:'RoHub System Health Center',generatedAt:state.lastRun,summary:{passed:state.results.filter(x=>x.status==='ok').length,warnings:state.results.filter(x=>x.status==='warn').length,failed:state.results.filter(x=>x.status==='fail').length},checks:state.results};
 const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='rohub-system-health-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function init(){if(!$('health-results'))return;$('health-run-btn').addEventListener('click',run);$('health-export-btn').addEventListener('click',exportReport);render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.rfRunSystemHealth=run;
})();