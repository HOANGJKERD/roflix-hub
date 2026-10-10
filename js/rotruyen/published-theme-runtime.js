(function(){
'use strict';
const sb=window.rfSupabase;
const safeHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:null;
async function applyPublishedTheme(){
 if(!sb)return;
 try{
  const target=location.pathname.toLowerCase().includes('rotruyen')?'rotruyen':'roflix';
  const {data,error}=await sb.from('rohub_theme_versions').select('config,target,version_number,published_at').eq('status','published').in('target',['both',target]).order('version_number',{ascending:false}).limit(20);
  if(error)throw error;
  const row=(data||[]).find(x=>x.target===target||x.target==='both');
  if(!row||!row.config)return;
  const c=row.config,root=document.documentElement;
  const accent=safeHex(c.accent),bg=safeHex(c.background),card=safeHex(c.card);
  if(accent){root.style.setProperty('--amber',accent);root.style.setProperty('--rt-accent',accent)}
  if(bg){root.style.setProperty('--bg',bg);root.style.setProperty('--rt-bg',bg);document.body.style.backgroundColor=bg}
  if(card){root.style.setProperty('--panel',card);root.style.setProperty('--panel2',card);root.style.setProperty('--rt-card',card)}
  if(Number.isFinite(Number(c.radius))&&Number(c.radius)>=4&&Number(c.radius)<=28)root.style.setProperty('--rt-radius',Number(c.radius)+'px');
  if(c.density==='compact')root.style.setProperty('--rt-density','8px');
  else if(c.density==='spacious')root.style.setProperty('--rt-density','24px');
  else root.style.setProperty('--rt-density','16px');
  root.dataset.rohubThemeVersion=String(row.version_number||'');
 }catch(err){console.warn('[RoHub Theme Runtime] Giữ giao diện mặc định do chưa đọc được theme published:',err.message)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPublishedTheme,{once:true});else applyPublishedTheme();
window.rohubRefreshPublishedTheme=applyPublishedTheme;
})();