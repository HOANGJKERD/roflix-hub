(function(){
'use strict';
const sb=window.rfSupabase;if(!sb)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='roflix-admin-gacha-custom';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
function ensurePanel(){
 const page=$('game-center');if(!page||$('admin-gacha-manager'))return;
 const box=document.createElement('div');box.id='admin-gacha-manager';box.className='card';box.style.marginTop='16px';
 box.innerHTML=`<div class="page-title"><div><h2>🎴 Gacha Studio</h2><p>Tạo thẻ nhân vật, ảnh, rarity và thông tin hiển thị trực tiếp cho RoFlix.</p></div><span class="pill pill-active">ADMIN ONLY</span></div>
 <div class="grid two">
 <div><div class="form-row"><label>ID thẻ</label><input class="input" id="ga-id" placeholder="waifu_001"></div>
 <div class="form-row"><label>Tên nhân vật</label><input class="input" id="ga-name" placeholder="Tên nhân vật"></div>
 <div class="form-row"><label>Cấp độ</label><input class="input" id="ga-level" type="number" min="1" max="999" value="1"></div>
 <div class="form-row"><label>Độ hiếm</label><select class="input" id="ga-rarity"><option value="common">Common ⭐</option><option value="rare">Rare ⭐⭐</option><option value="super-rare">Super Rare ⭐⭐⭐</option><option value="epic">Epic ⭐⭐⭐⭐</option><option value="legendary">Legendary ⭐⭐⭐⭐⭐</option><option value="secret">Secret ✦</option></select></div>
 <div class="form-row"><label>Tên phim / series</label><input class="input" id="ga-movie" placeholder="Anime / Movie"></div>
 <div class="form-row"><label>Ảnh bằng URL</label><input class="input" id="ga-image" placeholder="https://...jpg"></div>
 <div class="form-row"><label>Hoặc chọn file ảnh</label><input class="input" id="ga-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div>
 <div class="form-row"><label>Mô tả</label><textarea class="input" id="ga-desc" rows="3" placeholder="Mô tả nhân vật..."></textarea></div>
 <div class="form-actions"><button class="btn btn-primary" id="ga-save">💾 Tạo / cập nhật thẻ</button><button class="btn" id="ga-reset">↺ Xóa form</button></div></div>
 <div><div id="ga-preview" style="max-width:260px;margin:auto"></div></div></div>
 <div style="margin-top:18px"><h3 class="section-title">📚 Thẻ tùy biến</h3><div id="ga-list"></div></div>`;
 page.appendChild(box);
 $('ga-image').addEventListener('input',preview);$('ga-file').addEventListener('change',filePreview);$('ga-save').addEventListener('click',save);$('ga-reset').addEventListener('click',reset);render();
}
function currentImage(){return $('ga-image')?.value.trim()||''}
function preview(src){src=src||currentImage();$('ga-preview').innerHTML=src?`<div style="aspect-ratio:2/3;border-radius:14px;overflow:hidden;background:#111"><img src="${esc(src)}" style="width:100%;height:100%;object-fit:cover"></div>`:'<div class="empty">Chưa có ảnh</div>'}
function filePreview(e){const f=e.target.files?.[0];if(!f)return;if(f.size>2*1024*1024){alert('Ảnh file tối đa 2MB để tránh làm nặng trình duyệt.');e.target.value='';return}const r=new FileReader();r.onload=()=>{ $('ga-image').value=r.result;preview(r.result)};r.readAsDataURL(f)}
function reset(){['ga-id','ga-name','ga-movie','ga-image','ga-desc'].forEach(id=>$(id).value='');$('ga-level').value=1;$('ga-rarity').value='common';$('ga-file').value='';$('ga-preview').innerHTML='';$('ga-save').dataset.edit=''}
function save(){const id=$('ga-id').value.trim()||'custom_'+Date.now();const name=$('ga-name').value.trim();const image=$('ga-image').value.trim();if(!name||!image)return alert('Cần nhập tên nhân vật và ảnh.');const rows=read();const card={id,name,level:Math.max(1,Number($('ga-level').value)||1),rarity:$('ga-rarity').value,movie:$('ga-movie').value.trim(),image,description:$('ga-desc').value.trim(),source:'admin',updatedAt:new Date().toISOString()};const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]=card;else rows.unshift(card);write(rows);render();alert(i>=0?'Đã cập nhật thẻ.':'Đã tạo thẻ.');}
function edit(c){$('ga-id').value=c.id;$('ga-name').value=c.name||'';$('ga-level').value=c.level||1;$('ga-rarity').value=c.rarity||'common';$('ga-movie').value=c.movie||'';$('ga-image').value=c.image||'';$('ga-desc').value=c.description||'';preview(c.image)}
function del(id){if(!confirm('Xóa thẻ này khỏi Gacha Studio?'))return;write(read().filter(x=>x.id!==id));render()}
function render(){const box=$('ga-list');if(!box)return;const rows=read();box.innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Ảnh</th><th>Tên</th><th>Rarity</th><th>Lv</th><th>Phim</th><th>Thao tác</th></tr></thead><tbody>${rows.map(c=>`<tr><td><img src="${esc(c.image)}" style="width:42px;height:62px;object-fit:cover;border-radius:7px"></td><td><b>${esc(c.name)}</b><br><small>${esc(c.id)}</small></td><td>${esc(c.rarity)}</td><td>Lv.${c.level}</td><td>${esc(c.movie||'')}</td><td><button class="btn" onclick='rfAdminGachaEdit(${JSON.stringify(c).replace(/'/g,'&#39;')})'>Sửa</button> <button class="btn btn-danger" onclick="rfAdminGachaDelete('${esc(c.id)}')">Xóa</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Chưa có thẻ tự tạo. Hãy tạo thẻ đầu tiên ở trên.</div>'}
window.rfAdminGachaEdit=edit;window.rfAdminGachaDelete=del;
document.addEventListener('DOMContentLoaded',ensurePanel);window.rfAdminLoadGachaStudio=ensurePanel;
})();