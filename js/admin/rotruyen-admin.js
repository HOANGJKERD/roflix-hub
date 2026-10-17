(function(){
'use strict';
const sb=window.rfSupabase;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={series:[],selected:null,chapters:[],ready:false};
function message(text,bad=false){const el=$('rt-admin-message');if(el){el.textContent=text;el.style.color=bad?'#fca5a5':'#a7f3d0';}}
async function authorized(){
 if(!sb)throw new Error('Supabase chưa sẵn sàng.');
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError)throw authError;if(!user)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập admin lại.');
 const {data,error}=await sb.from('profiles').select('role,account_status').eq('id',user.id).maybeSingle();
 if(error)throw error;if(data?.role!=='admin'||(data.account_status&&data.account_status!=='active'))throw new Error('Tài khoản hiện tại không có quyền quản trị.');
}
function filtered(){
 const q=($('rt-admin-search')?.value||'').trim().toLowerCase(),filter=$('rt-admin-published-filter')?.value||'all';
 return state.series.filter(s=>(!q||[s.title,s.author,s.slug,s.source_key].some(v=>String(v||'').toLowerCase().includes(q)))&&(filter==='all'||(filter==='published'?s.is_published:!s.is_published)));
}
function renderStats(){
 const total=state.series.length,pub=state.series.filter(x=>x.is_published).length,drafts=total-pub;
 $('rt-admin-stats').innerHTML=[
 ['📚','Tổng tác phẩm',total,'Catalog RoTruyện'],
 ['🌐','Đang xuất bản',pub,'Hiển thị cho độc giả'],
 ['📝','Bản nháp / chờ duyệt',drafts,'Chưa hiển thị công khai']
 ].map(x=>'<div class="card"><div class="stat-label">'+x[0]+' '+x[1]+'</div><div class="stat-value accent-amber">'+x[2].toLocaleString('vi-VN')+'</div><div class="stat-sub">'+x[3]+'</div></div>').join('');
}
function renderSeries(){
 const rows=filtered(),body=$('rt-admin-series-body');
 body.innerHTML=rows.length?rows.map(s=>'<tr><td><b>'+esc(s.title||'Chưa có tên')+'</b><br><span class="muted">'+esc(s.author||'Chưa rõ tác giả')+' · '+esc(s.slug||s.id)+'</span></td><td>'+esc(s.source_key||'manual')+'</td><td>'+esc(s.content_rating||'safe')+' · '+esc(s.status||'ongoing')+'</td><td><span class="pill '+(s.is_published?'pill-active':'pill-user')+'">'+(s.is_published?'Đã xuất bản':'Bản nháp')+'</span></td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-rt-action="chapters" data-id="'+esc(s.id)+'">Chương</button><button class="btn" data-rt-action="edit" data-id="'+esc(s.id)+'">Sửa</button><button class="btn '+(s.is_published?'btn-danger':'btn-primary')+'" data-rt-action="publish" data-id="'+esc(s.id)+'">'+(s.is_published?'Gỡ xuất bản':'Xuất bản')+'</button><button class="btn btn-danger" data-rt-action="delete" data-id="'+esc(s.id)+'">Xóa</button></div></td></tr>').join(''):'<tr><td colspan="5" class="empty">Không có tác phẩm phù hợp hoặc catalog chưa có dữ liệu.</td></tr>';
}
async function loadSeries(){
 if(!state.ready)return;
 $('rt-admin-series-body').innerHTML='<tr><td colspan="5" class="empty">Đang tải catalog RoTruyện...</td></tr>';
 const {data,error}=await sb.from('rotruyen_series').select('id,title,slug,synopsis,cover_url,author,source_key,content_rating,status,is_published,sort_order').order('sort_order',{ascending:true}).limit(500);
 if(error)throw error;state.series=data||[];renderStats();renderSeries();message('Đã tải '+state.series.length+' tác phẩm từ rotruyen_series.');
}
async function loadChapters(series){
 state.selected=series;
 $('rt-admin-create-chapter').hidden=false;
 $('rt-admin-create-chapter').dataset.seriesId=String(series.id);
 $('rt-admin-chapter-caption').textContent='Tác phẩm: '+(series.title||series.id);
 $('rt-admin-chapters-body').innerHTML='<tr><td colspan="5" class="empty">Đang tải chương...</td></tr>';
 const {data,error}=await sb.from('rotruyen_chapters').select('id,series_id,chapter_number,title,is_published,published_at,external_url,page_manifest').eq('series_id',series.id).order('chapter_number',{ascending:true}).limit(500);
 if(error)throw error;state.chapters=data||[];
 $('rt-new-chapter-number').value=String((Number(state.chapters.at(-1)?.chapter_number)||0)+1);
 $('rt-admin-chapters-body').innerHTML=state.chapters.length?state.chapters.map(c=>'<tr><td>'+esc(c.chapter_number)+'</td><td>'+esc(c.title||'Chương '+c.chapter_number)+'</td><td>'+esc(c.published_at?new Date(c.published_at).toLocaleDateString('vi-VN'):'—')+'</td><td><span class="pill '+(c.is_published?'pill-active':'pill-user')+'">'+(c.is_published?'Đã xuất bản':'Bản nháp')+'</span></td><td><button class="btn '+(c.is_published?'btn-danger':'btn-primary')+'" data-rt-chapter-action="publish" data-id="'+esc(c.id)+'">'+(c.is_published?'Gỡ xuất bản':'Xuất bản')+'</button> <button class="btn btn-danger" data-rt-chapter-action="delete" data-id="'+esc(c.id)+'">Xóa</button></td></tr>').join(''):'<tr><td colspan="5" class="empty">Tác phẩm này chưa có chương trong database.</td></tr>';
}
async function action(action,id){
 const s=state.series.find(x=>String(x.id)===String(id));if(!s)return;
 if(action==='chapters'){await loadChapters(s);return;}
 if(action==='publish'){
  const next=!s.is_published;if(!confirm((next?'Xuất bản':'Gỡ xuất bản')+' tác phẩm “'+s.title+'”?'))return;
  const patch={is_published:next};
  const {error}=await sb.from('rotruyen_series').update(patch).eq('id',s.id);if(error)throw error;
  message(next?'Đã gửi yêu cầu xuất bản tác phẩm.':'Đã gỡ xuất bản tác phẩm.');await loadSeries();if(state.selected?.id===s.id)await loadChapters(s);return;
 }
 if(action==='edit'){
  const title=prompt('Tên tác phẩm:',s.title||'');if(title===null)return;if(!title.trim())throw new Error('Tên tác phẩm không được để trống.');
  const author=prompt('Tác giả / bút danh:',s.author||'');if(author===null)return;
  const synopsis=prompt('Tóm tắt truyện:',s.synopsis||'');if(synopsis===null)return;
  const {error}=await sb.from('rotruyen_series').update({title:title.trim(),author:author.trim(),synopsis:synopsis.trim()}).eq('id',s.id);if(error)throw error;
  message('Đã cập nhật thông tin tác phẩm.');await loadSeries();return;
 }
 if(action==='delete'){
  if(!confirm('Xóa vĩnh viễn tác phẩm “'+s.title+'”? Nếu database không có cascade phù hợp, thao tác có thể bị từ chối.'))return;
  const {error}=await sb.from('rotruyen_series').delete().eq('id',s.id);if(error)throw error;
  if(state.selected?.id===s.id){state.selected=null;state.chapters=[];$('rt-admin-chapters-body').innerHTML='<tr><td colspan="5" class="empty">Chưa chọn tác phẩm.</td></tr>';$('rt-admin-chapter-caption').textContent='Chọn một tác phẩm để quản lý chương.';}
  message('Đã xóa tác phẩm.');await loadSeries();
 }
}
async function chapterAction(action,id){
 const c=state.chapters.find(x=>String(x.id)===String(id));if(!c||!state.selected)return;
 if(action==='publish'){
  const next=!c.is_published;if(!confirm((next?'Xuất bản':'Gỡ xuất bản')+' chương “'+(c.title||c.chapter_number)+'”?'))return;
  const patch={is_published:next};if(next)patch.published_at=new Date().toISOString();
  const {error}=await sb.from('rotruyen_chapters').update(patch).eq('id',c.id);if(error)throw error;
 }else if(action==='delete'){
  if(!confirm('Xóa chương này vĩnh viễn?'))return;
  const {error}=await sb.from('rotruyen_chapters').delete().eq('id',c.id);if(error)throw error;
 }
 await loadChapters(state.selected);message('Đã cập nhật chương.');
}
function slugify(value){
 return String(value||'truyen-moi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'truyen-moi';
}
function httpsUrl(value,label,optional=true){
 const v=String(value||'').trim();if(!v&&optional)return '';
 let u;try{u=new URL(v);}catch(_){throw new Error(label+' phải là URL hợp lệ.');}
 if(u.protocol!=='https:')throw new Error(label+' phải dùng HTTPS.');
 return u.href;
}
async function createSeries(event){
 event.preventDefault();await authorized();
 const form=$('rt-admin-create-series'),button=$('rt-new-save');button.disabled=true;
 try{
  const title=$('rt-new-title').value.trim();if(title.length<2)throw new Error('Tên truyện cần ít nhất 2 ký tự.');
  const cover=httpsUrl($('rt-new-cover').value,'Ảnh bìa');
  const payload={title,slug:slugify(title)+'-'+Date.now().toString(36).slice(-5),author:$('rt-new-author').value.trim()||'Chưa rõ tác giả',synopsis:$('rt-new-synopsis').value.trim(),cover_url:cover,source_key:'manual',genres:[$('rt-new-genre').value==='other'?'Khác':$('rt-new-genre').value],content_rating:$('rt-new-rating').value,status:$('rt-new-status').value,is_published:false,created_by:(await sb.auth.getUser()).data.user.id,sort_order:0};
  const {data,error}=await sb.from('rotruyen_series').insert(payload).select('id,title,slug,synopsis,cover_url,author,source_key,content_rating,status,is_published,sort_order').single();
  if(error)throw error;
  form.reset();message('Đã tạo bản nháp “'+data.title+'”. Chọn truyện trong danh sách để thêm chương, rồi xuất bản khi sẵn sàng.');
  await loadSeries();
 }finally{button.disabled=false;}
}
async function createChapter(event){
 event.preventDefault();await authorized();
 const form=$('rt-admin-create-chapter'),button=$('rt-new-chapter-save'),seriesId=form.dataset.seriesId;
 if(!seriesId||!state.selected)throw new Error('Hãy chọn tác phẩm trước khi thêm chương.');
 button.disabled=true;
 try{
  const chapterNumber=Number($('rt-new-chapter-number').value);
  if(!Number.isFinite(chapterNumber)||chapterNumber<0)throw new Error('Số chương không hợp lệ.');
  const type=$('rt-new-chapter-type').value,raw=$('rt-new-chapter-content').value.trim();
  if(!raw)throw new Error('Hãy nhập nội dung chương.');
  const publish=$('rt-new-chapter-publish').value==='published';
  const payload={series_id:seriesId,chapter_number:chapterNumber,title:$('rt-new-chapter-title').value.trim(),external_url:null,page_manifest:[],is_published:publish,published_at:publish?new Date().toISOString():null};
  if(type==='text'){
   payload.page_manifest=[{type:'text',text:raw}];
  }else if(type==='images'){
   const lines=raw.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
   if(!lines.length)throw new Error('Hãy nhập ít nhất một URL ảnh.');
   payload.page_manifest=lines.map((line,i)=>({url:httpsUrl(line,'Ảnh trang '+(i+1),false)}));
  }else{
   payload.external_url=httpsUrl(raw,'Liên kết chương',false);
  }
  const {error}=await sb.from('rotruyen_chapters').insert(payload);if(error)throw error;
  form.reset();$('rt-new-chapter-number').value=String(chapterNumber+1);
  $('rt-new-chapter-publish').value='draft';message('Đã thêm chương '+chapterNumber+' cho “'+state.selected.title+'”.');
  await loadChapters(state.selected);await loadSeries();
 }finally{button.disabled=false;}
}
function run(fn){fn().catch(e=>{console.error('[RoTruyen admin]',e);message(e?.message||'Thao tác thất bại.',true);});}
function init(){
 const nav=document.querySelector('#admin-nav [data-page="rotruyen"]');if(!nav)return;
 nav.addEventListener('click',()=>run(async()=>{await authorized();state.ready=true;await loadSeries();}));
 $('rt-admin-refresh')?.addEventListener('click',()=>run(async()=>{await authorized();state.ready=true;await loadSeries();if(state.selected)await loadChapters(state.selected);}));
 $('rt-admin-search')?.addEventListener('input',renderSeries);$('rt-admin-published-filter')?.addEventListener('change',renderSeries);
 $('rt-admin-create-series')?.addEventListener('submit',e=>run(()=>createSeries(e)));
 $('rt-admin-create-chapter')?.addEventListener('submit',e=>run(()=>createChapter(e)));
 $('rt-admin-series-body')?.addEventListener('click',e=>{const b=e.target.closest('[data-rt-action]');if(b)run(()=>action(b.dataset.rtAction,b.dataset.id));});
 $('rt-admin-chapters-body')?.addEventListener('click',e=>{const b=e.target.closest('[data-rt-chapter-action]');if(b)run(()=>chapterAction(b.dataset.rtChapterAction,b.dataset.id));});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();