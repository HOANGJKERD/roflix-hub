(() => {
'use strict';
const menu=document.querySelector('.rb-menu'),nav=document.querySelector('.rb-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}));}
const select=document.getElementById('match-league');
document.querySelectorAll('.rb-league-card[data-league]').forEach(card=>card.addEventListener('click',()=>{if(select)select.value=card.dataset.league==='Other'?'all':card.dataset.league;}));
document.querySelectorAll('.rb-date-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.rb-date-tabs button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});const state=document.querySelector('.rb-data-state');if(state)state.dataset.selectedDay=button.dataset.day||'today';}));
document.querySelectorAll('.rb-nav a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.rb-nav a').forEach(item=>item.classList.toggle('active',item===link));}));
})();