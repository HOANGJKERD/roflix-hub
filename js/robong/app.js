(() => {
'use strict';
const menu=document.querySelector('.rb-menu'),nav=document.querySelector('.rb-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}));}
const registry=window.RoBongSports||{},sportSelect=document.getElementById('match-sport'),leagueSelect=document.getElementById('match-league');
const footballGrid=document.getElementById('rb-football-grid'),esportsGrid=document.getElementById('rb-esports-grid');
function populateCompetitions(sport){
 const group=registry[sport];if(!group||!leagueSelect)return;
 leagueSelect.replaceChildren(new Option('Tất cả giải đấu','all'));
 group.competitions.forEach(([id,name])=>leagueSelect.add(new Option(name,id)));
}
function renderEsports(){
 if(!esportsGrid||!registry.esports)return;
 const fragment=document.createDocumentFragment();
 registry.esports.competitions.forEach(([id,name,meta,mark])=>{
  const card=document.createElement('a');card.className='rb-league-card';card.href='#matches';card.dataset.sport='esports';card.dataset.league=id;
  const symbol=document.createElement('span');symbol.className='rb-league-symbol esports';symbol.textContent=mark;
  const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent=name;const small=document.createElement('small');small.textContent=meta;copy.append(strong,small);
  const arrow=document.createElement('b');arrow.textContent='↗';card.append(symbol,copy,arrow);card.addEventListener('click',()=>{if(sportSelect){sportSelect.value='esports';populateCompetitions('esports');}if(leagueSelect)leagueSelect.value=id;});fragment.append(card);
 });
 esportsGrid.replaceChildren(fragment);
}
function setSport(sport){
 const selected=registry[sport]?sport:'football';
 if(sportSelect)sportSelect.value=selected;
 populateCompetitions(selected);
 if(footballGrid)footballGrid.hidden=selected!=='football';
 if(esportsGrid)esportsGrid.hidden=selected!=='esports';
 document.querySelectorAll('[data-sport-tab]').forEach(button=>{const active=button.dataset.sportTab===selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
renderEsports();setSport('football');
if(sportSelect)sportSelect.addEventListener('change',()=>setSport(sportSelect.value));
document.querySelectorAll('[data-sport-tab]').forEach(button=>button.addEventListener('click',()=>{setSport(button.dataset.sportTab);const target=document.getElementById('matches');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});}));
document.querySelectorAll('.rb-date-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.rb-date-tabs button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});const state=document.querySelector('.rb-data-state');if(state)state.dataset.selectedDay=button.dataset.day||'today';}));
document.querySelectorAll('.rb-nav a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.rb-nav a').forEach(item=>item.classList.toggle('active',item===link));}));
})();