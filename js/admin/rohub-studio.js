(function(){
  'use strict';
  const root=document.getElementById('rohub-studio');
  if(!root)return;
  const $=id=>document.getElementById(id);
  const defaults={accent:'#ffb20d',bg:'#090a0f',panel:'#15161d',radius:16,density:'comfortable'};
  const controls={accent:$('rh-accent'),bg:$('rh-bg'),panel:$('rh-panel'),radius:$('rh-radius'),density:$('rh-density')};
  function safeHex(v,fallback){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):fallback}
  function readConfig(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{try{resolve(JSON.parse(String(reader.result)))}catch(e){reject(new Error('Tệp JSON không hợp lệ.'))}};reader.onerror=()=>reject(new Error('Không đọc được tệp.'));reader.readAsText(file)})}
  function config(){return {schemaVersion:1,name:'RoHub Admin Amber',accent:safeHex(controls.accent.value,defaults.accent),background:safeHex(controls.bg.value,defaults.bg),panel:safeHex(controls.panel.value,defaults.panel),radius:Math.max(4,Math.min(28,Number(controls.radius.value)||16)),density:controls.density.value==='compact'?'compact':'comfortable'}}
  function apply(data){
    controls.accent.value=safeHex(data.accent,defaults.accent);
    controls.bg.value=safeHex(data.background||data.bg,defaults.bg);
    controls.panel.value=safeHex(data.panel,defaults.panel);
    controls.radius.value=String(Math.max(4,Math.min(28,Number(data.radius)||16)));
    controls.density.value=data.density==='compact'?'compact':'comfortable';
    render();
  }
  function render(){
    const c=config();
    const card=$('rh-preview-card');
    card.style.setProperty('--rh-accent',c.accent);card.style.setProperty('--rh-bg',c.background);card.style.setProperty('--rh-panel',c.panel);card.style.setProperty('--rh-radius',c.radius+'px');
    if(c.density==='compact'){card.querySelector('.studio-preview-body').style.padding='18px';card.querySelector('.studio-preview-stat-row').style.marginTop='16px'}
    else{card.querySelector('.studio-preview-body').style.padding='clamp(20px,4vw,34px)';card.querySelector('.studio-preview-stat-row').style.marginTop='26px'}
    $('rh-accent-value').textContent=c.accent;$('rh-bg-value').textContent=c.background;$('rh-panel-value').textContent=c.panel;$('rh-radius-value').textContent=c.radius+'px';
    $('rh-theme-status').textContent='Đang xem trước. Cấu hình chưa được lưu lên máy chủ.';
  }
  Object.values(controls).forEach(el=>el.addEventListener('input',render));
  $('rh-theme-reset').addEventListener('click',()=>apply(defaults));
  $('rh-export-theme').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(config(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='rohub-theme.json';a.click();URL.revokeObjectURL(url);
    $('rh-theme-status').textContent='Đã xuất cấu hình JSON để lưu hoặc chuyển sang môi trường khác.';
  });
  $('rh-import-theme').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    try{const data=await readConfig(file);apply(data);$('rh-theme-status').textContent='Đã nạp cấu hình vào bản xem trước. Chưa áp dụng lên website.'}
    catch(err){$('rh-theme-status').textContent=err.message||'Không thể nạp cấu hình.'}
    e.target.value='';
  });
  render();
})();