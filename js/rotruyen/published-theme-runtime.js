/* Published Theme Runtime for RoTruyen. Drafts are never queried. */
(function(){
'use strict';
const SUPABASE_URL=window.SUPABASE_URL||window.RF_SUPABASE_URL||window.supabaseUrl||'';
const SUPABASE_KEY=window.SUPABASE_ANON_KEY||window.RF_SUPABASE_ANON_KEY||window.supabaseAnonKey||'';
function getClient(){
 if(window.rfSupabase)return window.rfSupabase;
 if(window.supabaseClient)return window.supabaseClient;
 if(window.supabase&&typeof window.supabase.from==='function')return window.supabase;
 if(window.supabase&&typeof window.supabase.createClient==='function'&&SUPABASE_URL&&SUPABASE_KEY)return window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
 return null;
}
function color(value,fallback){return typeof value==='string'&&/^#[0-9a-f]{3,8}$/i.test(value)?value:fallback}
function text(el,value){if(el&&typeof value==='string'&&value.trim())el.textContent=value}
function apply(theme){
 const config=theme.config&&typeof theme.config==='object'?theme.config:{},tokens=config.theme||{},layout=config.layout||{},components=config.components||{};
 const root=document.documentElement,body=document.body;
 root.style.setProperty('--blue',color(tokens.accent,'#ffb20d'));
 root.style.setProperty('--accent',color(tokens.accent,'#ffb20d'));
 root.style.setProperty('--bg',color(tokens.background,'#090a0f'));
 root.style.setProperty('--panel',color(tokens.panel,'#15161d'));
 root.style.setProperty('--radius',Math.max(0,Math.min(32,Number(tokens.radius)||16))+'px');
 if(layout.maxWidth)root.style.setProperty('--rt-runtime-max-width',Math.max(320,Math.min(1800,Number(layout.maxWidth)))+'px');
 if(layout.contentGap)root.style.setProperty('--rt-runtime-gap',Math.max(0,Math.min(64,Number(layout.contentGap)))+'px');
 const header=body.querySelector('.rt-site-header'),footer=body.querySelector('.rt-site-footer,.rt-footer');
 if(components.header?.enabled===false&&header)header.hidden=true;
 if(components.header?.enabled!==false&&header)header.hidden=false;
 if(components.footer?.enabled===false&&footer)footer.hidden=true;
 if(components.footer?.enabled!==false&&footer)footer.hidden=false;
 if(components.hero?.enabled===false)body.querySelector('.hero')?.setAttribute('hidden','');
 else body.querySelector('.hero')?.removeAttribute('hidden');
 if(components.hero?.enabled!==false&&components.hero){
  const hero=body.querySelector('.hero'),h=hero?.querySelector('h1'),p=hero?.querySelector('p'),cta=hero?.querySelector('.btn');
  text(h,components.hero.title);text(p,components.hero.description);text(cta,components.hero.buttonText);
 }
 const sections=Array.isArray(config.sections)?config.sections:[];
 sections.forEach(section=>{
  const type=section.type||section.kind;
  if(type==='banner'){
   const hero=body.querySelector('.hero');if(!hero)return;
   text(hero.querySelector('h1'),section.title);text(hero.querySelector('p'),section.description);text(hero.querySelector('.btn'),section.buttonText);
   if(section.enabled===false)hero.hidden=true;
   if(section.accent)hero.style.setProperty('--rt-section-accent',color(section.accent,'#ffb20d'));
  }
  if(type==='series-grid'){
   const catalog=body.querySelector('.catalog');if(!catalog)return;
   text(catalog.querySelector('.section-heading h2'),section.title);
   text(catalog.querySelector('.section-heading p'),section.description);
   if(section.enabled===false)catalog.hidden=true;
   if(section.accent)catalog.style.setProperty('--rt-section-accent',color(section.accent,'#ffb20d'));
  }
 });
 body.dataset.rohubTheme=theme.slug||'published';
 body.dataset.rohubThemeVersion=String(theme.template_version||'');
 window.dispatchEvent(new CustomEvent('rohub:theme-applied',{detail:{slug:theme.slug,version:theme.template_version}}));
}
async function boot(){
 const client=getClient();if(!client)return;
 try{
  const {data,error}=await client.from('rohub_published_themes').select('slug,name,config,template_version,published_at').eq('target_app','rotruyen').eq('template_type','homepage').maybeSingle();
  if(error||!data)return;
  apply(data);
 }catch(e){console.warn('[RoHub Theme Runtime] Giữ giao diện mặc định vì không tải được theme đã xuất bản.',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
