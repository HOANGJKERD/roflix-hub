(() => {
'use strict';
const registry=window.RoBongSports||{},grid=document.getElementById('league-grid');
const sportTitle=document.getElementById('sport-title'),sportKicker=document.getElementById('sport-kicker'),leagueCount=document.getElementById('league-count');
const sportFilter=document.getElementById('sport-filter'),leagueFilter=document.getElementById('league-filter'),resourceFilter=document.getElementById('resource-filter');
const panel=document.getElementById('data-panel'),title=document.getElementById('data-title'),description=document.getElementById('data-description'),status=document.getElementById('data-status'),results=document.getElementById('data-results');
let currentSport='football',period='today',requestController=null;
const leagueMap={EPL:'eng.1',UCL:'uefa.champions',VLeague:'vietnam.1',LaLiga:'esp.1',SerieA:'ita.1',Bundesliga:'bl1',Ligue1:'fra.1',WorldCup:'fifa.world',NBA:'nba',NHL:'nhl'};
function renderSport(sport){
 const group=registry[sport];if(!group||!grid)return;currentSport=sport;
 sportTitle.textContent=group.label;sportKicker.textContent=group.kicker;leagueCount.textContent=String(group.competitions.length).padStart(2,'0')+' GIẢI ĐẤU';
 grid.replaceChildren();const fragment=document.createDocumentFragment();
 group.competitions.forEach(([id,name,meta,mark,tone])=>{
  const card=document.createElement('a');card.className='league-card';card.href='#scores';card.dataset.league=id;
  const symbol=document.createElement('span');symbol.className='league-symbol '+(tone||'green');symbol.textContent=mark;
  const copy=document.createElement('span'),heading=document.createElement('strong'),sub=document.createElement('small');
  heading.textContent=name;sub.textContent=meta;copy.append(heading,sub);
  const arrow=document.createElement('b');arrow.textContent='↗';card.append(symbol,copy,arrow);
  card.addEventListener('click',()=>{if(sportFilter)sportFilter.value=sport;if(leagueFilter)leagueFilter.value=id;loadData();});
  fragment.append(card);
 });
 grid.append(fragment);
 document.querySelectorAll('.sport-tab').forEach(button=>{const active=button.dataset.sport===sport;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
 if(sportFilter)sportFilter.value=sport;
 if(resourceFilter){
  if(sport==='motorsport')resourceFilter.value='sessions';
  else if(sport==='chess')resourceFilter.value='tournaments';
  else if(resourceFilter.value==='sessions'||resourceFilter.value==='tournaments')resourceFilter.value='matches';
 }
 if(leagueFilter){leagueFilter.replaceChildren(new Option('Tất cả giải đấu','all'));group.competitions.forEach(([id,name])=>leagueFilter.add(new Option(name,id)));}
}
function setPanel(heading,copy,state){
 if(title)title.textContent=heading;if(description)description.textContent=copy;if(status)status.textContent=state||'RO BONG UNIFIED API';if(results)results.replaceChildren();
}
function addRow(primary,secondary,meta){
 const item=document.createElement('div');item.className='data-item';
 const main=document.createElement('b'),sub=document.createElement('span'),small=document.createElement('small');
 main.textContent=primary||'Chưa có tên';sub.textContent=secondary||'';small.textContent=meta||'';
 item.append(main,sub,small);results.append(item);
}
function dateParam(){
 const now=new Date(),plus=period==='tomorrow'?1:0,start=new Date(now.getFullYear(),now.getMonth(),now.getDate()+plus);
 const fmt=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
 if(period==='week'){const end=new Date(start);end.setDate(end.getDate()+6);return fmt(start)+'-'+fmt(end);}return fmt(start);
}
function rowsFrom(data,sport,resource){
 if(Array.isArray(data))return data;
 if((sport==='football'||sport==='basketball')&&Array.isArray(data.events))return data.events;
 if(sport==='hockey'&&Array.isArray(data.games))return data.games;
 if(resource==='standings'){const d=data.data||data;if(Array.isArray(d.standings))return d.standings.flatMap(s=>s.entries||[]);if(Array.isArray(d))return d;if(Array.isArray(d.standings?.entries))return d.standings.entries;}
 if(resource==='teams'){const d=data.data||data;if(Array.isArray(d))return d;if(Array.isArray(d.sports?.[0]?.leagues?.[0]?.teams))return d.sports[0].leagues[0].teams;}
 if(resource==='tournaments'&&Array.isArray(data.data))return data.data;
 return [];
}
function renderRows(data,sport,resource){
 const rows=rowsFrom(data,sport,resource);
 if(!rows.length){setPanel('Nguồn đã phản hồi nhưng chưa có dữ liệu phù hợp','Không có bản ghi cho bộ lọc hiện tại. Hãy thử giải đấu hoặc khoảng thời gian khác.','UPSTREAM OK · 0 RECORDS');return;}
 setPanel('Dữ liệu đã đồng bộ',rows.length+' bản ghi được trả về từ nguồn dữ liệu.','CONNECTED · '+rows.length+' RECORDS');
 rows.slice(0,40).forEach(row=>{
  if(row.home&&row.away){
   const score=row.homeScore!=null||row.awayScore!=null?String(row.homeScore??'–')+' : '+String(row.awayScore??'–'):'Chưa có tỷ số';
   addRow(row.home+' vs '+row.away,score,(row.status||'')+' · '+(row.competition||row.source||''));return;
  }
  if(resource==='standings'&&row.team){
   addRow((row.rank?'#'+row.rank+' ':'')+row.team,(row.points!=null?'Điểm: '+row.points+' · ':'')+(row.played??'–')+' trận · '+(row.winRate!=null?'Tỷ lệ thắng '+(Number(row.winRate)*100).toFixed(1)+'%':''),(row.group?row.group+' · ':'')+'Thắng '+(row.wins??'–')+' · Hòa '+(row.draws??'–')+' · Thua '+(row.losses??'–')+(row.goalDifference!=null?' · Chênh lệch '+row.goalDifference:''));return;
  }
  if(row.team1&&row.team2){
   const result=(row.matchResults||[]).filter(x=>x.resultTypeID===2).slice(-1)[0]||(row.matchResults||[]).slice(-1)[0];
   addRow((row.team1.teamName||'')+' vs '+(row.team2.teamName||''),result?result.pointsTeam1+' : '+result.pointsTeam2:(row.matchIsFinished?'Đã kết thúc':'Chưa thi đấu'),row.leagueName||row.matchDateTime||'OpenLigaDB');return;
  }
  if(row.competitions){
   const c=row.competitions[0],home=c?.competitors?.find(x=>x.homeAway==='home'),away=c?.competitors?.find(x=>x.homeAway==='away');
   addRow((home?.team?.displayName||'Đội nhà')+' vs '+(away?.team?.displayName||'Đội khách'),home&&away?(home.score??'–')+' : '+(away.score??'–'):'Chưa có tỷ số',c?.status?.type?.detail||row.date||'ESPN');return;
  }
  if(row.homeTeam){
   addRow((row.awayTeam?.abbrev||'')+' vs '+(row.homeTeam?.abbrev||''),(row.awayTeam?.score??'–')+' : '+(row.homeTeam?.score??'–'),row.gameState||row.gameDate||'NHL');return;
  }
  if(sport==='motorsport'){addRow(row.session_name||row.session_type||'F1 Session',row.circuit_short_name||row.country_name||'',row.date_start||row.date_end||'OpenF1');return;}
  const name=row.name||row.teamName||row.displayName||row.fullName||row.team?.displayName||row.club||'Dữ liệu thể thao';
  const extra=row.points!=null?'Điểm: '+row.points:row.city||row.abbreviation||row.tricode||row.seasonDisplay||'';
  addRow(name,extra,row.country||row.rank?'Hạng '+(row.rank||''):'RoBong API');
 });
}
async function loadData(){
 if(!panel)return;if(requestController)requestController.abort();requestController=new AbortController();
 const sport=(sportFilter?.value&&sportFilter.value!=='all')?sportFilter.value:currentSport,resource=resourceFilter?.value||'matches';
 let league=leagueFilter?.value||'all';if(league==='all')league=sport==='basketball'?'NBA':sport==='hockey'?'NHL':sport==='football'?'EPL':'';
 const params=new URLSearchParams({sport,resource});
 if(league&&leagueMap[league])params.set('league',leagueMap[league]);
 
 if(resource==='matches'&&(sport==='football'||sport==='basketball'))params.set('date',dateParam());
 if(resource==='lineups')params.set('team','arsenal');
 if(resource==='players'&&sport==='football')params.set('team_id','359');
 if(resource==='players'&&sport==='basketball')params.set('team_id','13');
 if(resource==='players'&&sport==='hockey')params.set('team','TOR');
 if(resource==='sessions')params.set('year',String(new Date().getFullYear()-1));
 if(resource==='tournaments')params.set('limit','30');
 setPanel('Đang tải dữ liệu…','RoBong Unified API đang truy vấn '+sport+' / '+resource+'.','FETCHING / '+sport.toUpperCase());
 try{
  const response=await fetch('/api/robong?'+params.toString(),{headers:{Accept:'application/json'},signal:requestController.signal}),body=await response.json();
  if(!response.ok||!body.ok)throw new Error(body.error||'Nguồn dữ liệu hiện không khả dụng.');
  renderRows(Array.isArray(body.items)&&body.items.length?body.items:body.data,sport,resource);
  if(status)status.textContent='SOURCE: '+String(body.provider||'unified').toUpperCase()+' · UPDATED '+new Date(body.fetchedAt).toLocaleTimeString('vi-VN');
 }catch(error){if(error.name==='AbortError')return;setPanel('Chưa có nguồn dữ liệu phù hợp',error.message+' RoBong không tự tạo tỷ số hoặc thông tin thay thế.','SOURCE UNAVAILABLE · NO MOCK DATA');}
}
document.querySelectorAll('.sport-tab').forEach(button=>button.addEventListener('click',()=>{renderSport(button.dataset.sport);loadData();}));
if(sportFilter)sportFilter.addEventListener('change',()=>{const sport=sportFilter.value;if(sport!=='all'&&registry[sport])renderSport(sport);loadData();});
if(leagueFilter)leagueFilter.addEventListener('change',loadData);if(resourceFilter)resourceFilter.addEventListener('change',loadData);
document.querySelectorAll('.day-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.day-tabs button').forEach(b=>b.classList.toggle('selected',b===button));period=button.dataset.period;loadData();}));
const menu=document.getElementById('menu-toggle'),nav=document.getElementById('main-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';}));}
document.querySelectorAll('.nav a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a===link));}));
renderSport(currentSport);loadData();
})();