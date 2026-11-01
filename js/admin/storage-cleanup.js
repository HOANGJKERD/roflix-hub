(function(){
'use strict';
const $=id=>document.getElementById(id),db=()=>window.rfSupabase;
const state={items:[],summary:null,offset:0,limit:100,total:0,loading:false,filter:'all',search:'',selected:new Set()};
const fmt=n=>{n=Number(n)||0;return n>=1073741824?(n/1073741824).toFixed(2)+' GB':n>=1048576?(n/1048576).toFixed(1)+' MB':(n/1024).toFixed(0)+' KB';};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function publicUrl(name){return db().storage.from('rotruyen-pages').getPublicUrl(name).data.publicUrl;}
function notify(msg,bad=false){const n=$('storage-cleanup-status');if(n){n.textContent=msg;n.dataset.error=bad?'true':'false';}}
async function scan(reset=false){
 if(state.loading)return;if(reset)state.offset=0;state.loading=true;
 const btn=$('storage-cleanup-scan');if(btn){btn.disabled=true;btn.textContent='Đang quét…';}
 try{const {data,error}=await db().rpc('rohub_storage_cleanup_scan',{p_limit:state.limit,p_offset:state.offset});if(error)throw error;
 state.items=data?.items||[];state.summary=data?.summary||{};state.total=Number(state.summary.total_objects)||0;state.selected.clear();render();notify('Đã quét Storage. Không có tệp nào bị thay đổi.');
 }catch(e){console.error('[Storage Cleanup]',e);notify(e.message||'Không thể quét Storage.',true);}
 finally{state.loading=false;if(btn){btn.disabled=false;btn.textContent='↻ Quét lại';}}
}
function render(){
 const s=state.summary||{};
 $('storage-cleanup-stats').innerHTML=[['Tổng đối tượng',s.total_objects||0,fmt(s.total_bytes)],['Ảnh mồ côi',s.orphan_objects||0,fmt(s.orphan_bytes)+' ứng viên'],['Ảnh trùng nội dung',s.duplicate_objects||0,fmt(s.duplicate_reclaimable_bytes)+' có thể tiết kiệm'],['Có tham chiếu',Math.max(0,(s.total_objects||0)-(s.orphan_objects||0)),'Không cho phép xóa']].map(x=>'<article class="sc-stat"><span>'+x[0]+'</span><strong>'+Number(x[1]).toLocaleString('vi-VN')+'</strong><small>'+x[2]+'</small></article>').join('');
 let list=state.items.filter(x=>state.filter==='all'||x.status===state.filter);if(state.search)list=list.filter(x=>(x.name||'').toLowerCase().includes(state.search));
 $('storage-cleanup-list').innerHTML=list.length?list.map(x=>{
 const canDelete=x.status==='orphan'&&Number(x.reference_count)===0;
 return '<article class="sc-item"><label class="sc-check">'+(canDelete?'<input type="checkbox" data-sc-select="'+esc(x.id)+'" '+(state.selected.has(x.id)?'checked':'')+'>':'<span class="sc-protected">🔒</span>')+'</label><button class="sc-thumb" type="button" data-sc-preview="'+esc(x.id)+'"><img loading="lazy" src="'+esc(publicUrl(x.name))+'" alt="" onerror="this.closest(\'.sc-thumb\').classList.add(\'sc-broken\')"><span>⌕ Xem ảnh</span></button><div class="sc-info"><strong title="'+esc(x.name)+'">'+esc(x.name.split('/').pop())+'</strong><small>'+esc(x.name)+'</small><div class="sc-meta"><span>'+fmt(x.size_bytes)+'</span><span>'+esc(x.mimetype||'Không rõ định dạng')+'</span><span>'+Number(x.reference_count||0)+' tham chiếu</span><span class="sc-tag '+esc(x.status)+'">'+(x.status==='orphan'?'Mồ côi':x.status==='duplicate'?'Trùng ETag':'Đang dùng')+'</span></div></div><div class="sc-actions">'+(canDelete?'<button class="btn btn-danger" data-sc-delete="'+esc(x.id)+'">Xóa an toàn</button>':'<span class="muted">Được bảo vệ</span>')+'</div></article>';
 }).join(''):'<div class="sc-empty">Không có ảnh phù hợp trong trang này.</div>';
 $('storage-cleanup-page').textContent='Đang xem '+(state.offset+1)+'–'+Math.min(state.offset+state.items.length,state.total)+' / '+state.total;
 $('storage-cleanup-prev').disabled=state.offset<=0;$('storage-cleanup-next').disabled=state.offset+state.limit>=state.total;
 $('storage-cleanup-delete-selected').disabled=state.selected.size===0;$('storage-cleanup-selection-count').textContent=state.selected.size+' đã chọn';
}
function preview(item){const modal=$('storage-cleanup-preview');$('storage-cleanup-preview-img').src=publicUrl(item.name);$('storage-cleanup-preview-img').alt=item.name;$('storage-cleanup-preview-title').textContent=item.name;$('storage-cleanup-preview-meta').textContent=fmt(item.size_bytes)+' · '+(item.mimetype||'Không rõ')+' · '+item.reference_count+' tham chiếu · '+(item.status==='orphan'?'Mồ côi':item.status==='duplicate'?'Trùng ETag':'Đang dùng');modal.hidden=false;}
function closePreview(){$('storage-cleanup-preview').hidden=true;$('storage-cleanup-preview-img').src='';}
async function safeDelete(items){
 if(!items.length)return;if(items.some(x=>x.status!=='orphan'||Number(x.reference_count)!==0)){notify('Từ chối xóa: danh sách có ảnh còn được tham chiếu.',true);return;}
 const total=items.reduce((n,x)=>n+Number(x.size_bytes||0),0);if(!confirm('Xác nhận xóa '+items.length+' ảnh mồ côi ('+fmt(total)+')? Hệ thống quét lại và kiểm tra từng URL trước khi xóa.'))return;
 try{
 notify('Đang xác minh lại từng ảnh trước khi xóa…');
 const {data,error}=await db().rpc('rohub_storage_cleanup_scan',{p_limit:200,p_offset:0});if(error)throw error;
 for(const item of items){
  let current=(data?.items||[]).find(x=>x.id===item.id)||null,offset=200,totalCount=Number(data?.summary?.total_objects)||0;
  while(!current&&offset<totalCount){const page=await db().rpc('rohub_storage_cleanup_scan',{p_limit:200,p_offset:offset});if(page.error)throw page.error;current=(page.data?.items||[]).find(x=>x.id===item.id)||null;offset+=200;}
  if(!current||current.status!=='orphan'||Number(current.reference_count)!==0)throw Error('Ảnh '+item.name+' không còn đủ điều kiện xóa. Đã dừng.');
  const head=await fetch(publicUrl(current.name),{method:'HEAD',cache:'no-store'});if(!head.ok)throw Error('Không thể xác minh ảnh '+current.name+' (HTTP '+head.status+'). Đã dừng.');
  const removed=await db().storage.from('rotruyen-pages').remove([current.name]);if(removed.error)throw removed.error;
 }
 state.selected.clear();notify('Đã xóa '+items.length+' ảnh đã xác minh. Đang cập nhật số liệu…');await scan(true);
 }catch(e){console.error('[Storage Cleanup delete]',e);notify('Đã dừng thao tác an toàn: '+(e.message||'Lỗi xóa'),true);await scan(true);}
}
function init(){
 if(!$('storage-cleanup-list')||!db())return;
 $('storage-cleanup-scan').addEventListener('click',()=>scan(true));$('storage-cleanup-filter').addEventListener('change',e=>{state.filter=e.target.value;render();});$('storage-cleanup-search').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();render();});
 $('storage-cleanup-prev').addEventListener('click',()=>{state.offset=Math.max(0,state.offset-state.limit);scan();});$('storage-cleanup-next').addEventListener('click',()=>{state.offset+=state.limit;scan();});
 $('storage-cleanup-list').addEventListener('change',e=>{const id=e.target.dataset.scSelect;if(id){e.target.checked?state.selected.add(id):state.selected.delete(id);render();}});
 $('storage-cleanup-list').addEventListener('click',e=>{const p=e.target.closest('[data-sc-preview]'),d=e.target.closest('[data-sc-delete]');if(p){const item=state.items.find(x=>x.id===p.dataset.scPreview);if(item)preview(item);}if(d){const item=state.items.find(x=>x.id===d.dataset.scDelete);if(item)safeDelete([item]);}});
 $('storage-cleanup-delete-selected').addEventListener('click',()=>safeDelete(state.items.filter(x=>state.selected.has(x.id))));$('storage-cleanup-preview-close').addEventListener('click',closePreview);$('storage-cleanup-preview').addEventListener('click',e=>{if(e.target.id==='storage-cleanup-preview')closePreview();});
 $('storage-cleanup-export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({generated_at:new Date().toISOString(),summary:state.summary,items:state.items},null,2)],{type:'application/json'}),a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download='rohub-storage-cleanup-audit.json';a.click();URL.revokeObjectURL(u);});
 scan(true);
}
document.addEventListener('DOMContentLoaded',init,{once:true});window.rfStorageCleanupScan=()=>scan(true);
})();