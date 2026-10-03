(function(){
'use strict';
const sb=window.rfSupabase;if(!sb)return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let editingId=null, editingBannerId=null;
const rarity=[['common','⭐ 1'],['rare','⭐⭐ 2'],['super-rare','⭐⭐⭐ 3'],['epic','⭐⭐⭐⭐ 4'],['legendary','⭐⭐⭐⭐⭐ 5'],['secret','🌈 Secret']];
async function isAdmin(){try{const {data:u}=await sb.auth.getUser();if(!u?.user)return false;const {data:p}=await sb.from('profiles').select('role').eq('id',u.user.id).maybeSingle();return p?.role==='admin'}catch{return false}}
function flash(msg,ok=true){try{if(typeof showToast==='function')showToast(ok?'success':'error',ok?'Gacha Studio': 'Gacha Studio',msg);else alert(msg)}catch{alert(msg)}}
function ensurePanel(){
 const page=$('game-center');if(!page||$('admin-gacha-cloud'))return;
 const box=document.createElement('div');box.id='admin-gacha-cloud';box.className='card';box.style.marginTop='16px';
 box.innerHTML=`<div class="page-title"><div><h2>🎴 Gacha 4.0 Cloud Studio</h2><p>Toàn bộ nhân vật, ảnh, tỷ lệ, giá, banner và pity lưu trực tiếp trên Supabase.</p></div><span class="pill pill-active">SERVER AUTHORITATIVE</span></div>
 <div class="grid two">
  <div><h3 class="section-title">🧑‍🎨 Nhân vật</h3>
   <div class="form-row"><label>ID</label><input class="input" id="gc-id" placeholder="character_001"></div>
   <div class="form-row"><label>Tên</label><input class="input" id="gc-name" placeholder="Tên nhân vật"></div>
   <div class="form-row"><label>Phim / Series</label><input class="input" id="gc-movie" placeholder="Anime / Movie"></div>
   <div class="form-row"><label>Độ hiếm</label><select class="input" id="gc-rarity">${rarity.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select></div>
   <div class="form-row"><label>Trọng số trong rarity</label><input class="input" id="gc-weight" type="number" min="0" step="0.1" value="1"></div>
   <div class="form-row"><label>Ảnh URL</label><input class="input" id="gc-image" placeholder="https://..."></div>
   <div class="form-row"><label>Upload ảnh</label><input class="input" id="gc-file" type="file" accept="image/png,image/jpeg,image/webp"></div>
   <div class="form-row"><label>Mô tả</label><textarea class="input" id="gc-desc" rows="3"></textarea></div>
   <label style="display:flex;gap:8px;align-items:center"><input id="gc-active" type="checkbox" checked> Đang xuất hiện trong Gacha</label>
   <div class="form-actions"><button class="btn btn-primary" id="gc-save">💾 Lưu lên Cloud</button><button class="btn" id="gc-reset">↺ Form mới</button></div>
  </div>
  <div><div id="gc-preview" style="max-width:260px;margin:auto"></div></div>
 </div>
 <div style="margin-top:20px"><h3 class="section-title">📚 Character Pool</h3><div id="gc-list"></div></div>
 <hr style="border-color:rgba(255,255,255,.08);margin:24px 0">
 <div class="grid two">
  <div><h3 class="section-title">🎪 Banner</h3>
   <div class="form-row"><label>Tên banner</label><input class="input" id="gb-name" placeholder="RoFlix Season 1"></div>
   <div class="form-row"><label>Mô tả</label><textarea class="input" id="gb-desc" rows="2"></textarea></div>
   <div class="form-row"><label>Banner image URL</label><input class="input" id="gb-image" placeholder="https://..."></div>
   <div class="grid two"><div class="form-row"><label>X1 Gem</label><input class="input" id="gb-x1" type="number" min="0" value="50"></div><div class="form-row"><label>X10 Gem</label><input class="input" id="gb-x10" type="number" min="0" value="500"></div></div>
   <div class="form-row"><label>Pity</label><input class="input" id="gb-pity" type="number" min="1" value="20"></div>
   <label style="display:flex;gap:8px;align-items:center"><input id="gb-active" type="checkbox" checked> Banner đang hoạt động</label>
   <div class="form-actions"><button class="btn btn-primary" id="gb-save">💾 Lưu Banner</button><button class="btn" id="gb-reset">↺ Banner mới</button></div>
  </div>
  <div><h3 class="section-title">🎯 Tỷ lệ</h3><div id="gb-rates"></div><div id="gb-rate-total" class="notice" style="margin-top:10px"></div></div>
 </div>
 <div style="margin-top:20px"><h3 class="section-title">🎪 Banner đang có</h3><div id="gb-list"></div></div>`;
 page.appendChild(box);
 $('gc-image').addEventListener('input',()=>preview($('gc-image').value));$('gc-file').addEventListener('change',uploadPreview);$('gc-save').onclick=saveCharacter;$('gc-reset').onclick=resetCharacter;
 $('gb-save').onclick=saveBanner;$('gb-reset').onclick=resetBanner;renderRateInputs();loadAll();
}
function renderRateInputs(values={common:42,rare:28,super_rare:16,epic:9,legendary:4,secret:1}){$('gb-rates').innerHTML=rarity.map(([r,label])=>{const key=r.replaceAll('-','_');return `<div class="form-row"><label>${label}%</label><input class="input gb-rate" data-rate="${key}" type="number" min="0" step="0.01" value="${Number(values[key]??0)}"></div>`}).join('');document.querySelectorAll('.gb-rate').forEach(x=>x.addEventListener('input',rateTotal));rateTotal()}
function rateTotal(){const total=[...document.querySelectorAll('.gb-rate')].reduce((s,e)=>s+(Number(e.value)||0),0);$('gb-rate-total').textContent=`Tổng tỷ lệ: ${total.toFixed(2)}% ${Math.abs(total-100)<.001?'✓ Hợp lệ':'⚠️ phải bằng 100%'}`;$('gb-rate-total').style.color=Math.abs(total-100)<.001?'#86efac':'#fca5a5'}
function preview(src){$('gc-preview').innerHTML=src?`<div style="aspect-ratio:2/3;border-radius:14px;overflow:hidden;background:#111"><img src="${esc(src)}" style="width:100%;height:100%;object-fit:cover"></div>`:'<div class="empty">Chưa có ảnh</div>'}
async function uploadPreview(e){const f=e.target.files?.[0];if(!f)return;if(f.size>8*1024*1024){flash('Ảnh tối đa 8MB.',false);e.target.value='';return}const ext=(f.name.split('.').pop()||'jpg').toLowerCase();const path=`characters/${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from('roflix-gacha').upload(path,f,{upsert:false,contentType:f.type});if(error){flash('Upload thất bại: '+error.message,false);return}const {data}=sb.storage.from('roflix-gacha').getPublicUrl(path);$('gc-image').value=data.publicUrl;preview(data.publicUrl);flash('Đã upload ảnh lên Supabase Storage.')}
function resetCharacter(){editingId=null;['gc-id','gc-name','gc-movie','gc-image','gc-desc'].forEach(id=>$(id).value='');$('gc-rarity').value='common';$('gc-weight').value=1;$('gc-active').checked=true;$('gc-file').value='';preview('')}
async function saveCharacter(){const id=$('gc-id').value.trim()||'character_'+Date.now(),name=$('gc-name').value.trim(),image=$('gc-image').value.trim();if(!name||!image){flash('Cần tên và ảnh.',false);return}const {error}=await sb.rpc('roflix_gacha_admin_upsert_character',{p_id:id,p_name:name,p_movie:$('gc-movie').value.trim(),p_rarity:$('gc-rarity').value,p_image_url:image,p_description:$('gc-desc').value.trim(),p_weight:Number($('gc-weight').value)||0,p_active:$('gc-active').checked});if(error){flash(error.message,false);return}flash('Đã lưu nhân vật lên Supabase.');resetCharacter();loadCharacters()}
async function loadCharacters(){const box=$('gc-list');if(!box)return;const {data,error}=await sb.from('roflix_gacha_characters').select('*').order('created_at',{ascending:false}).limit(500);if(error){box.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}box.innerHTML=data?.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Ảnh</th><th>Tên</th><th>Rarity</th><th>Tỷ trọng</th><th>Active</th><th>Thao tác</th></tr></thead><tbody>${data.map(c=>`<tr><td><img src="${esc(c.image_url)}" style="width:42px;height:62px;object-fit:cover;border-radius:7px"></td><td><b>${esc(c.name)}</b><br><small>${esc(c.id)}</small></td><td>${esc(c.rarity)}</td><td>${Number(c.weight).toFixed(2)}</td><td>${c.active?'🟢':'⚪'}</td><td><button class="btn" onclick='rfAdminGachaCloudEdit(${JSON.stringify(c).replace(/'/g,'&#39;')})'>Sửa</button> <button class="btn btn-danger" onclick="rfAdminGachaCloudDelete('${esc(c.id)}')">Xóa</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Chưa có nhân vật.</div>'}
function editCharacter(c){editingId=c.id;$('gc-id').value=c.id;$('gc-name').value=c.name||'';$('gc-movie').value=c.movie||'';$('gc-rarity').value=c.rarity||'common';$('gc-weight').value=c.weight??1;$('gc-image').value=c.image_url||'';$('gc-desc').value=c.description||'';$('gc-active').checked=!!c.active;preview(c.image_url)}
async function deleteCharacter(id){if(!confirm('Xóa nhân vật khỏi pool? Collection cũ của user vẫn được giữ.'))return;const {error}=await sb.rpc('roflix_gacha_admin_delete_character',{p_id:id});if(error)flash(error.message,false);else{flash('Đã xóa.');loadCharacters()}}
function resetBanner(){editingBannerId=null;['gb-name','gb-desc','gb-image'].forEach(id=>$(id).value='');$('gb-x1').value=50;$('gb-x10').value=500;$('gb-pity').value=20;$('gb-active').checked=true;renderRateInputs()}
async function saveBanner(){const vals={};document.querySelectorAll('.gb-rate').forEach(e=>vals[e.dataset.rate]=Number(e.value)||0);if(Math.abs(Object.values(vals).reduce((a,b)=>a+b,0)-100)>.001){flash('Tỷ lệ phải bằng đúng 100%.',false);return}const {data,error}=await sb.rpc('roflix_gacha_admin_upsert_banner',{p_id:editingBannerId,p_name:$('gb-name').value.trim()||'RoFlix Banner',p_description:$('gb-desc').value.trim(),p_image_url:$('gb-image').value.trim(),p_x1:Number($('gb-x1').value)||0,p_x10:Number($('gb-x10').value)||0,p_pity:Number($('gb-pity').value)||20,p_active:$('gb-active').checked,p_starts:null,p_ends:null,p_common:vals.common,p_rare:vals.rare,p_super_rare:vals.super_rare,p_epic:vals.epic,p_legendary:vals.legendary,p_secret:vals.secret});if(error){flash(error.message,false);return}flash('Đã lưu Banner + tỷ lệ + giá + pity lên Cloud.');editingBannerId=data;loadBanners()}
async function loadBanners(){const box=$('gb-list');if(!box)return;const {data,error}=await sb.from('roflix_gacha_banners').select('*,roflix_gacha_rates(*)').order('created_at',{ascending:false});if(error){box.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}box.innerHTML=data?.length?data.map(b=>{const r=b.roflix_gacha_rates?.[0]||{};return `<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#111522;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;margin:7px 0"><div><b>${esc(b.name)}</b><div class="muted">X1 ${b.x1_cost} 💎 · X10 ${b.x10_cost} 💎 · Pity ${b.pity_limit} · ${b.active?'🟢 Active':'⚪ Off'}</div><small>Rates: ${Number(r.common||0)} / ${Number(r.rare||0)} / ${Number(r.super_rare||0)} / ${Number(r.epic||0)} / ${Number(r.legendary||0)} / ${Number(r.secret||0)}</small></div><button class="btn" onclick='rfAdminGachaBannerEdit(${JSON.stringify({...b,...r}).replace(/'/g,'&#39;')})'>Sửa</button></div>`}).join(''):'<div class="empty">Chưa có banner.</div>'}
function editBanner(b){editingBannerId=b.id;$('gb-name').value=b.name||'';$('gb-desc').value=b.description||'';$('gb-image').value=b.image_url||'';$('gb-x1').value=b.x1_cost??50;$('gb-x10').value=b.x10_cost??500;$('gb-pity').value=b.pity_limit??20;$('gb-active').checked=!!b.active;renderRateInputs(b)}
function loadAll(){loadCharacters();loadBanners()}
window.rfAdminGachaCloudEdit=editCharacter;window.rfAdminGachaCloudDelete=deleteCharacter;window.rfAdminGachaBannerEdit=editBanner;window.rfAdminLoadGachaStudio=ensurePanel;
document.addEventListener('DOMContentLoaded',async()=>{if(await isAdmin())ensurePanel();const s=document.createElement('script');s.src='js/admin/cloud-suite.js';s.defer=true;document.head.appendChild(s)});
})();