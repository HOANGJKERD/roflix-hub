(function(){
'use strict';
const $=id=>document.getElementById(id), sb=()=>window.rfSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeSeries=null, activeChapter=null, mangaResults=[];
const style = document.createElement('style');
style.textContent = '.rt-deep-overlay{position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,.82);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px}.rt-deep-modal{width:min(1050px,100%);max-height:92vh;overflow:auto;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:18px;padding:22px;box-shadow:0 25px 90px #0009}.rt-deep-modal h2{margin:0 0 8px}.rt-deep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rt-deep-field{display:flex;flex-direction:column;gap:6px;min-width:0}.rt-deep-field.full{grid-column:1/-1}.rt-deep-field label{font-size:12px;color:#cbd5e1;font-weight:700}.rt-deep-field input,.rt-deep-field select,.rt-deep-field textarea{width:100%;box-sizing:border-box;background:#020617;color:#f8fafc;border:1px solid #475569;border-radius:9px;padding:10px;font:inherit}.rt-deep-field textarea{min-height:85px;resize:vertical}.rt-deep-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;justify-content:flex-end}.rt-deep-hint{font-size:12px;color:#94a3b8;line-height:1.6}.rt-md-results{display:grid;gap:8px;margin-top:10px}.rt-md-item{display:flex;gap:10px;align-items:center;border:1px solid #334155;padding:10px;border-radius:10px}.rt-md-item img{width:48px;height:66px;object-fit:cover;border-radius:5px}.rt-md-item>div{flex:1;min-width:0}.rt-deep-error{color:#fca5a5}.rt-deep-ok{color:#86efac}@media(max-width:650px){.rt-deep-grid{grid-template-columns:1fr}.rt-deep-field.full{grid-column:auto}.rt-deep-modal{padding:15px}}';
document.head.appendChild(style);
function field(label,id,value='',type='text',full=false,extra=''){return '<div class="rt-deep-field'+(full?' full':'')+'"><label for="'+id+'">'+label+'</label>'+ (type==='textarea'?'<textarea id="'+id+'" '+extra+'>'+esc(value)+'</textarea>':'<input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>')+'</div>';}
function selectField(label,id,value,options,full=false){return '<div class="rt-deep-field'+(full?' full':'')+'"><label for="'+id+'">'+label+'</label><select id="'+id+'">'+options.map(o=>'<option value="'+esc(o[0])+'" '+(o[0]===value?'selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select></div>';}
function overlay(title,body,buttons){const old=$('rt-deep-overlay');if(old)old.remove();const el=document.createElement('div');el.id='rt-deep-overlay';el.className='rt-deep-overlay';el.innerHTML='<section class="rt-deep-modal" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h2>'+title+'</h2><p class="rt-deep-hint">Trình chỉnh sửa nâng cao · thay đổi lưu trực tiếp vào Supabase.</p></div><button class="btn" type="button" data-close>✕</button></div>'+body+'<div class="rt-deep-actions">'+buttons+'</div></section>';el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]'))el.remove();});document.body.appendChild(el);return el;}
async function admin(){const db=sb();if(!db)throw Error('Supabase chưa sẵn sàng.');const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user)throw Error('Vui lòng đăng nhập lại.');const p=await db.from('profiles').select('role,account_status').eq('id',user.id).maybeSingle();if(p.error)throw p.error;if(p.data?.role!=='admin'||(p.data.account_status&&p.data.account_status!=='active'))throw Error('Tài khoản không có quyền admin.');return db;}
function showMessage(text,bad=false){const el=$('rt-admin-message');if(el){el.textContent=text;el.style.color=bad?'#fca5a5':'#86efac';}}
function seriesEditor(s){
 activeSeries=s;
 const body='<form id="rt-deep-series-form"><div class="rt-deep-grid">'+
 field('Tên hiển thị *','rt-deep-title',s.title||'')+
 field('Slug / đường dẫn','rt-deep-slug',s.slug||'')+
 field('Tác giả / nhóm dịch','rt-deep-author',s.author||'')+
 field('URL ảnh bìa HTTPS','rt-deep-cover',s.cover_url||'','url')+
 field('Nguồn dữ liệu','rt-deep-source',s.source_key||'manual')+
 field('ID nguồn ngoài (MangaDex UUID, ... )','rt-deep-sourceid',s.source_id||'')+
 selectField('Tình trạng','rt-deep-status',s.status||'ongoing',[['ongoing','Đang ra'],['completed','Hoàn thành'],['hiatus','Tạm ngưng'],['cancelled','Đã hủy']])+
 selectField('Phân loại độ tuổi','rt-deep-rating',s.content_rating||'safe',[['safe','Phù hợp mọi lứa tuổi'],['suggestive','Có yếu tố trưởng thành nhẹ'],['erotica','18+ / người trưởng thành']])+
 field('Thứ tự ưu tiên','rt-deep-sort',String(s.sort_order??0),'number')+
 field('Thể loại (mỗi dòng một thể loại)','rt-deep-genres',(Array.isArray(s.genres)?s.genres:[]).join('\n'),'textarea',true)+
 field('Tóm tắt / mô tả','rt-deep-synopsis',s.synopsis||'','textarea',true)+
 field('MangaDex: tìm theo tên','rt-md-query',s.title||'','text',true)+
 '<div class="rt-deep-field full"><button type="button" class="btn" id="rt-md-search">🔎 Tìm trên MangaDex</button><div id="rt-md-status" class="rt-deep-hint">Tìm tác phẩm để tự điền ID, tên, mô tả, thể loại và bìa nếu API cung cấp.</div><div id="rt-md-results" class="rt-md-results"></div></div>'+
 '<div class="rt-deep-field full"><button type="button" class="btn btn-primary" id="rt-md-import-chapters">⬇ Nhập chapter MangaDex + tự lấy ảnh trang</button><div id="rt-md-import-status" class="rt-deep-hint">Cần ID MangaDex. Chỉ nhập các chapter tiếng Việt, tự bỏ qua chapter đã có. Ảnh trang lưu dưới dạng manifest để trình đọc tải tự động.</div><div id="rt-md-import-progress" class="rt-md-results"></div></div>'+
 selectField('Trạng thái hiển thị','rt-deep-published',s.is_published?'true':'false',[['false','Bản nháp / ẩn'],['true','Đã xuất bản']])+
 '</div><p class="rt-deep-hint">Lưu ý: ID MangaDex chỉ liên kết metadata. Việc đọc chapter MangaDex cần endpoint/luồng chapter tương ứng; không tự sao chép ảnh chương chỉ bằng UUID.</p></form>';
 const el=overlay('🛠️ Chỉnh sửa sâu: '+esc(s.title||'Tác phẩm'),body,'<button type="button" class="btn" data-close>Hủy</button><button type="submit" form="rt-deep-series-form" class="btn btn-primary" id="rt-deep-save">Lưu toàn bộ thay đổi</button>');
 $('rt-md-search').addEventListener('click',()=>searchMangaDex($('rt-md-query').value));
 $('rt-md-import-chapters').addEventListener('click',importMangaDexChapters);
 $('rt-deep-series-form').addEventListener('submit',saveSeries);
}
async function searchMangaDex(q){
 const status=$('rt-md-status'),host=$('rt-md-results');status.textContent='Đang tìm trên MangaDex…';host.innerHTML='';
 try{
  const url='/api/mangadex/manga?limit=10&includes%5B%5D=cover_art&title='+encodeURIComponent(q.trim());
  const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw Error('MangaDex trả HTTP '+res.status);
  const json=await res.json();mangaResults=Array.isArray(json.data)?json.data:[];
  if(!mangaResults.length){status.textContent='Không tìm thấy kết quả. Thử tên tiếng Anh hoặc tên gốc.';return;}
  status.textContent='Chọn kết quả phù hợp để điền metadata vào biểu mẫu. Chưa lưu cho đến khi bấm Lưu.';
  host.innerHTML=mangaResults.map((m,i)=>{const attrs=m.attributes||{},rels=m.relationships||[],cover=rels.find(r=>r.type==='cover_art'),file=cover?.attributes?.fileName;const title=attrs.title?.en||Object.values(attrs.title||{})[0]||'Untitled';const desc=attrs.description?.en||Object.values(attrs.description||{})[0]||'';return '<article class="rt-md-item"><div style="flex:1"><b>'+esc(title)+'</b><div class="rt-deep-hint">'+esc((attrs.year||'')+' · '+(attrs.status||'')+' · '+m.id)+'</div><div class="rt-deep-hint">'+esc(desc.slice(0,160))+'</div></div><button type="button" class="btn btn-primary" data-md-select="'+i+'">Dùng metadata</button></article>';}).join('');
  host.querySelectorAll('[data-md-select]').forEach(b=>b.addEventListener('click',()=>applyMangaDex(mangaResults[Number(b.dataset.mdSelect)])));
 }catch(e){status.textContent='Không lấy được dữ liệu MangaDex: '+e.message;status.className='rt-deep-hint rt-deep-error';}
}
function applyMangaDex(m){
 const a=m.attributes||{},title=a.title?.en||Object.values(a.title||{})[0]||activeSeries.title;
 const desc=a.description?.en||Object.values(a.description||{})[0]||'';
 const rel=m.relationships||[],cover=rel.find(r=>r.type==='cover_art'),file=cover?.attributes?.fileName;
 $('rt-deep-title').value=title;$('rt-deep-source').value='mangadex';$('rt-deep-sourceid').value=m.id;
 if(desc)$('rt-deep-synopsis').value=desc;
 if(file)$('rt-deep-cover').value='https://uploads.mangadex.org/covers/'+m.id+'/'+file+'.256.jpg';
 const tags=(a.tags||[]).map(t=>t.attributes?.name?.en).filter(Boolean);
 if(tags.length)$('rt-deep-genres').value=[...new Set(tags)].join('\n');
 const status=$('rt-md-status');status.textContent='Đã điền metadata cho '+title+'. Bấm “Lưu toàn bộ thay đổi” để ghi vào catalog.';status.className='rt-deep-hint rt-deep-ok';
}
async function saveSeries(e){
 e.preventDefault();const button=$('rt-deep-save');button.disabled=true;button.textContent='Đang lưu…';
 try{
  const db=await admin(),title=$('rt-deep-title').value.trim(),slug=$('rt-deep-slug').value.trim();
  if(title.length<2)throw Error('Tên tác phẩm cần ít nhất 2 ký tự.');
  if(!slug)throw Error('Slug không được để trống.');
  const cover=$('rt-deep-cover').value.trim();if(cover&&new URL(cover).protocol!=='https:')throw Error('Ảnh bìa phải dùng HTTPS.');
  const genres=$('rt-deep-genres').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const payload={title,slug,author:$('rt-deep-author').value.trim(),cover_url:cover||null,source_key:$('rt-deep-source').value.trim()||'manual',source_id:$('rt-deep-sourceid').value.trim()||null,status:$('rt-deep-status').value,content_rating:$('rt-deep-rating').value,sort_order:Number($('rt-deep-sort').value)||0,genres,synopsis:$('rt-deep-synopsis').value.trim(),is_published:$('rt-deep-published').value==='true'};
  const {error}=await db.from('rotruyen_series').update(payload).eq('id',activeSeries.id);if(error)throw error;
  $('rt-deep-overlay').remove();showMessage('Đã lưu chi tiết tác phẩm: '+title);$('rt-admin-refresh')?.click();
 }catch(err){showMessage(err.message||'Lưu thất bại.',true);button.disabled=false;button.textContent='Lưu toàn bộ thay đổi';}
}
function chapterEditor(c){
 activeChapter=c;
 const body='<form id="rt-deep-chapter-form"><div class="rt-deep-grid">'+
 field('Số chương / chap *','rt-deep-ch-number',String(c.chapter_number??0),'number')+
 field('Tên chương / chap','rt-deep-ch-title',c.title||'')+
 field('URL chapter ngoài','rt-deep-ch-url',c.external_url||'','url',true)+
 selectField('Trạng thái','rt-deep-ch-pub',c.is_published?'true':'false',[['false','Bản nháp / ẩn'],['true','Đã xuất bản']])+
 field('Ngày xuất bản ISO (để trống = tự động)','rt-deep-ch-date',c.published_at||'','text')+
 field('Danh sách trang / nội dung (JSON page_manifest)','rt-deep-ch-manifest',JSON.stringify(c.page_manifest??[],null,2),'textarea',true)+
 '</div><p class="rt-deep-hint">page_manifest là JSON có cấu trúc. Truyện chữ thường dùng [{ "type": "text", "text": "..." }], truyện tranh có thể dùng [{ "url": "https://..." }]. Không nhập URL ảnh mà bạn không có quyền sử dụng.</p></form>';
 const el=overlay('📖 Chỉnh sửa chapter / chap',body,'<button type="button" class="btn" data-close>Hủy</button><button type="submit" form="rt-deep-chapter-form" class="btn btn-primary" id="rt-deep-ch-save">Lưu chapter</button>');
 $('rt-deep-chapter-form').addEventListener('submit',saveChapter);
}
async function saveChapter(e){
 e.preventDefault();const button=$('rt-deep-ch-save');button.disabled=true;
 try{
  const db=await admin(),num=Number($('rt-deep-ch-number').value);if(!Number.isFinite(num)||num<0)throw Error('Số chapter không hợp lệ.');
  let manifest;try{manifest=JSON.parse($('rt-deep-ch-manifest').value||'[]');}catch(_){throw Error('page_manifest không phải JSON hợp lệ.');}
  if(!Array.isArray(manifest))throw Error('page_manifest phải là một mảng JSON.');
  const url=$('rt-deep-ch-url').value.trim();if(url&&new URL(url).protocol!=='https:')throw Error('URL chapter phải dùng HTTPS.');
  const pub=$('rt-deep-ch-pub').value==='true',rawDate=$('rt-deep-ch-date').value.trim();
  const patch={chapter_number:num,title:$('rt-deep-ch-title').value.trim(),external_url:url||null,page_manifest:manifest,is_published:pub,published_at:pub?(rawDate||new Date().toISOString()):null};
  const {error}=await db.from('rotruyen_chapters').update(patch).eq('id',activeChapter.id).eq('series_id',activeChapter.series_id);if(error)throw error;
  $('rt-deep-overlay').remove();showMessage('Đã cập nhật chapter '+num+'.');$('rt-admin-refresh')?.click();
 }catch(err){showMessage(err.message||'Không thể lưu chapter.',true);button.disabled=false;}
}
async function importMangaDexChapters(){
 const button=$('rt-md-import-chapters'),status=$('rt-md-import-status'),progress=$('rt-md-import-progress');
 const mangaId=$('rt-deep-sourceid').value.trim()||activeSeries.source_id;
 if(!mangaId){status.textContent='Chưa có MangaDex UUID. Hãy tìm và chọn tác phẩm MangaDex trước.';status.className='rt-deep-hint rt-deep-error';return;}
 button.disabled=true;progress.innerHTML='';
 try{
  const db=await admin();
  status.textContent='Đang tải danh sách chapter tiếng Việt từ MangaDex…';
  const res=await fetch('/api/mangadex/chapters?manga='+encodeURIComponent(mangaId),{headers:{Accept:'application/json'}});
  const json=await res.json();if(!res.ok)throw Error(json.error||('MangaDex HTTP '+res.status));
  const chapters=Array.isArray(json.data)?json.data:[];
  if(!chapters.length)throw Error('MangaDex không trả chapter tiếng Việt. Có thể truyện chưa có bản dịch tiếng Việt.');
  const {data:existing,error:existingError}=await db.from('rotruyen_chapters').select('chapter_number').eq('series_id',activeSeries.id).limit(1000);
  if(existingError)throw existingError;
  const numbers=new Set((existing||[]).map(x=>Number(x.chapter_number)));
  const candidates=chapters.filter(ch=>{const n=Number(ch.attributes?.chapter);return Number.isFinite(n)&&!numbers.has(n);});
  if(!candidates.length){status.textContent='Không có chapter mới. Các số chapter trả về đã tồn tại trong Supabase.';status.className='rt-deep-hint rt-deep-ok';return;}
  let done=0,failed=0;const batch=[];
  for(const ch of candidates){
   const a=ch.attributes||{},rawNum=a.chapter,chapterNum=Number(rawNum);
   try{
    const atRes=await fetch('/api/mangadex/at-home?chapter='+encodeURIComponent(ch.id),{headers:{Accept:'application/json'}});
    const at=await atRes.json();if(!atRes.ok)throw Error(at.error||'Không lấy được server ảnh');
    const base=at.baseUrl,hash=at.chapter?.hash,files=at.chapter?.dataSaver?.length?at.chapter.dataSaver:at.chapter?.data;
    if(!base||!hash||!Array.isArray(files)||!files.length)throw Error('Manifest ảnh rỗng');
    const pages=files.map((file,index)=>({url:window.location.origin+'/api/mangadex-image?host='+encodeURIComponent(new URL(base).hostname)+'&path='+encodeURIComponent('/'+(at.chapter?.dataSaver?.length?'data-saver':'data')+'/'+hash+'/'+file),alt:'Chapter '+rawNum+' · trang '+(index+1),source:'mangadex',page:index+1}));
    batch.push({series_id:activeSeries.id,chapter_number:chapterNum,title:a.title||('Chapter '+rawNum),external_url:'https://mangadex.org/chapter/'+ch.id,page_manifest:pages,is_published:false,published_at:null});
   }catch(err){failed++;console.warn('[RoTruyen MangaDex import]',ch.id,err);}
   done++;status.textContent='Đang lấy ảnh trang: '+done+'/'+candidates.length+' · chuẩn bị lưu '+batch.length+' · lỗi '+failed;
   progress.innerHTML='<div class="rt-deep-hint">Đã phân tích '+done+'/'+candidates.length+' chapter. Chương được nhập ở trạng thái bản nháp để admin kiểm tra trước khi xuất bản.</div>';
  }
  if(batch.length){
   const {error}=await db.from('rotruyen_chapters').insert(batch);if(error)throw error;
   const {error:logError}=await db.from('rotruyen_audit_logs').insert({actor_id:(await db.auth.getUser()).data.user.id,action:'mangadex_chapters_imported',entity_type:'rotruyen_series',entity_id:String(activeSeries.id),details:{manga_id:mangaId,imported:batch.length,failed}});
   if(logError)console.warn('[RoTruyen audit]',logError.message);
  }
  status.textContent='Hoàn tất: đã nhập '+batch.length+' chapter với dữ liệu ảnh trang tự động'+(failed?' · lỗi lấy ảnh '+failed:'')+'. Tất cả để bản nháp.';
  status.className='rt-deep-hint '+(batch.length?'rt-deep-ok':'rt-deep-error');
  if(batch.length){showMessage('Đã nhập '+batch.length+' chapter MangaDex và manifest ảnh vào Supabase. Hãy kiểm tra rồi xuất bản.');$('rt-admin-refresh')?.click();}
 }catch(err){status.textContent='Nhập chapter thất bại: '+(err.message||err);status.className='rt-deep-hint rt-deep-error';}
 finally{button.disabled=false;}
}
function install(){
 const seriesBody=$('rt-admin-series-body'),chaptersBody=$('rt-admin-chapters-body');if(!seriesBody||!chaptersBody)return;
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-rt-action="edit"]');if(b){e.preventDefault();e.stopImmediatePropagation();const row=(window.__rtDeepSeriesCache||[]).find(s=>String(s.id)===String(b.dataset.id));if(row){seriesEditor(row);return;}loadSeriesForEdit(b.dataset.id).catch(err=>showMessage(err.message,true));}
 },true);
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-rt-chapter-action="edit-deep"]');if(b){e.preventDefault();e.stopImmediatePropagation();const c=(window.__rtDeepChapterCache||[]).find(x=>String(x.id)===String(b.dataset.id));if(c)chapterEditor(c);}
 },true);
 const watch=new MutationObserver(()=>{syncCache();installChapterEditButtonsOnce();});watch.observe(seriesBody,{childList:true,subtree:true});watch.observe(chaptersBody,{childList:true,subtree:true});syncCache();installChapterEditButtonsOnce();
 // Replace row rendering with a supplementary edit button while preserving existing controls.
 const oldChapterRender=window.rfRenderRoTruyenChapters;
}
async function loadSeriesForEdit(id){const db=await admin(),{data,error}=await db.from('rotruyen_series').select('id,title,slug,synopsis,cover_url,author,source_key,source_id,genres,content_rating,status,is_published,sort_order').eq('id',id).single();if(error)throw error;seriesEditor(data);}
function syncCache(){
 const sbody=$('rt-admin-series-body'),cbody=$('rt-admin-chapters-body');if(!sbody||!cbody)return;
 const series=(window.__rtDeepSeriesCache||[]); // obtain IDs and fetch only on edit, avoiding duplicate privileged reads.
 window.__rtDeepSeriesCache=series;
}
let chapterObserverInstalled=false;
function installChapterEditButtonsOnce(){
 const body=$('rt-admin-chapters-body');if(!body||chapterObserverInstalled)return;chapterObserverInstalled=true;
 const observer=new MutationObserver(()=>{
  const buttons=[...body.querySelectorAll('[data-rt-chapter-action="publish"]')];
  if(!buttons.length)return;
  const seriesId=document.querySelector('#rt-admin-create-chapter')?.dataset.seriesId;if(!seriesId)return;
  admin().then(async db=>{
   const {data,error}=await db.from('rotruyen_chapters').select('id,series_id,chapter_number,title,is_published,published_at,external_url,page_manifest').eq('series_id',seriesId).order('chapter_number',{ascending:true}).limit(1000);if(error)throw error;
   window.__rtDeepChapterCache=data||[];
   for(const b of buttons){const row=b.closest('tr'),id=b.dataset.id;if(row&&!row.querySelector('[data-rt-chapter-action="edit-deep"]')){const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Chỉnh sâu';edit.dataset.rtChapterAction='edit-deep';edit.dataset.id=id;row.lastElementChild.append(' ',edit);}}
  }).catch(err=>console.warn('[RoTruyen deep admin]',err));
 });observer.observe(body,{childList:true,subtree:true});
}
function installChapterEditButtons(){
 const body=$('rt-admin-chapters-body');if(!body)return;
 const observer=new MutationObserver(async()=>{
  if(!body.querySelector('[data-rt-chapter-action="edit-deep"]')){
   const buttons=[...body.querySelectorAll('[data-rt-chapter-action]')].filter(b=>b.dataset.rtChapterAction==='publish');
   if(!buttons.length)return;
   try{
    const db=await admin(),seriesId=document.querySelector('#rt-admin-create-chapter')?.dataset.seriesId;if(!seriesId)return;
    const {data,error}=await db.from('rotruyen_chapters').select('id,series_id,chapter_number,title,is_published,published_at,external_url,page_manifest').eq('series_id',seriesId).order('chapter_number',{ascending:true}).limit(500);if(error)throw error;
    window.__rtDeepChapterCache=data||[];
    for(const b of buttons){const row=b.closest('tr'),id=b.dataset.id;if(row&&!row.querySelector('[data-rt-chapter-action="edit-deep"]')){const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='Chỉnh sâu';edit.dataset.rtChapterAction='edit-deep';edit.dataset.id=id;row.lastElementChild.append(' ',edit);}}
   }catch(err){console.warn('[RoTruyen deep admin]',err);}
  }
 });observer.observe(body,{childList:true,subtree:true});
}
document.addEventListener('DOMContentLoaded',()=>{install();});
})();