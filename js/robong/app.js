(() => {
'use strict';
const registry=window.RoBongSports||{},grid=document.getElementById('league-grid'),sportTitle=document.getElementById('sport-title'),sportKicker=document.getElementById('sport-kicker'),leagueCount=document.getElementById('league-count'),sportFilter=document.getElementById('sport-filter'),leagueFilter=document.getElementById('league-filter');
let currentSport='football';
function renderSport(sport){
 const group=registry[sport];if(!group||!grid)return;currentSport=sport;
 sportTitle.textContent=group.label;sportKicker.textContent=group.kicker;leagueCount.textContent=String(group.competitions.length).padStart(2,'0')+' GIẢI ĐẤU';
 grid.replaceChildren();
 const fragment=document.createDocumentFragment();
 group.competitions.forEach(([id,name,meta,mark,tone])=>{
  const card=document.createElement('a');card.className='league-card';card.href='#scores';card.dataset.league=id;
  const symbol=document.createElement('span');symbol.className='league-symbol '+(tone||'green');symbol.textContent=mark;
  const copy=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent=name;sub.textContent=meta;copy.append(title,sub);
  const arrow=document.createElement('b');arrow.textContent='↗';card.append(symbol,copy,arrow);
  card.addEventListener('click',()=>{if(sportFilter)sportFilter.value=sport;if(leagueFilter)leagueFilter.value=id;});
  fragment.append(card);
 });
 grid.append(fragment);
 document.querySelectorAll('.sport-tab').forEach(button=>{const active=button.dataset.sport===sport;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
 if(sportFilter)sportFilter.value=sport;
 if(leagueFilter){leagueFilter.replaceChildren(new Option('Tất cả giải đấu','all'));group.competitions.forEach(([id,name])=>leagueFilter.add(new Option(name,id)));}
}
document.querySelectorAll('.sport-tab').forEach(button=>button.addEventListener('click',()=>renderSport(button.dataset.sport)));
if(sportFilter)sportFilter.addEventListener('change',()=>{const s=sportFilter.value;if(s==='all'){if(leagueFilter)leagueFilter.replaceChildren(new Option('Tất cả giải đấu','all'));return;}renderSport(s);});
if(leagueFilter)leagueFilter.addEventListener('change',()=>{const id=leagueFilter.value;if(id==='all')return;const card=grid?.querySelector('[data-league="'+CSS.escape(id)+'"]');if(card)card.scrollIntoView({behavior:'smooth',block:'center'});});
document.querySelectorAll('.day-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.day-tabs button').forEach(b=>b.classList.toggle('selected',b===button));const panel=document.querySelector('.data-panel');if(panel)panel.dataset.period=button.dataset.period;}));
const menu=document.getElementById('menu-toggle'),nav=document.getElementById('main-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}));}
document.querySelectorAll('.nav a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a===link));}));
renderSport(currentSport);
})();