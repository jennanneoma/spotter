/* Gymnazo: going back, and the search box */

/* ---------- Going back ----------
   Every time you move to a new page we save a small "snapshot" of where you were.
   The back button just pops the last snapshot and puts you there again.
   These are the bits of ui that decide which page you're looking at. */
const PAGE_KEYS=['view','clientId','tab','repClient','repTab','olEx','rowId','dayDraft'];
const snapPage=()=>Object.fromEntries(PAGE_KEYS.map(k=>[k,ui[k]]));
// Two snapshots are the same page if these match (we only care if a day editor is open, not what's in it)
const pageId=p=>JSON.stringify(PAGE_KEYS.map(k=>k==='dayDraft'?!!p[k]:p[k]??null));
ui.hist=[];

// Called after every tap. If the tap moved you to a different page, remember where you came from.
function trackPage(before){
  const now=snapPage();if(pageId(now)===pageId(before))return;
  const top=ui.hist[ui.hist.length-1];
  // Saving or cancelling an editor drops you back on the page you came from, so count it as going back
  if(top&&pageId(top)===pageId(now)){ui.hist.pop();return}
  ui.hist.push(before);if(ui.hist.length>40)ui.hist.shift();
  // also tell the browser, so the phone's own back gesture works too
  try{history.pushState({gymnazo:ui.hist.length},'');pushedStates++}catch(e){}
}
let pushedStates=0,skipPop=false;
function goBack(fallback){
  const prev=ui.hist.pop();
  if(prev)Object.assign(ui,prev);else if(fallback)fallback();
  ui.confirm=null;scrollTo(0,0);
}
addEventListener('popstate',()=>{
  if(skipPop){skipPop=false;return}
  pushedStates=Math.max(0,pushedStates-1);
  if(ui.hist.length){goBack();closeSheets()}
});

// What to call the page you'd go back to, e.g. "‹ Jennifer" or "‹ Reports"
function pageName(p){
  const names={clients:'Clients',invites:'Invites',reports:'Reports',templates:'Templates',exercises:'Exercises',settings:'Settings',today:'Today',routine:'Routine',calendar:'Calendar',progress:'Progress',chat:'Chat',exercise:'Workout'};
  if(p.view==='client'&&p.clientId){const c=client(p.clientId);if(c)return first(c.name)}
  if(p.view==='reports'&&p.repClient){const c=client(p.repClient);if(c)return first(c.name)}
  return names[p.view]||'Back';
}
// A back button. If there's no history yet (fresh page load) it goes to `to` instead.
function backBtn(to,label,fb=''){
  const prev=ui.hist[ui.hist.length-1];
  return `<button class="back" data-act="back" data-v="${to}" ${fb?`data-fb="${fb}"`:''}>‹ ${esc(prev?pageName(prev):label)}</button>`;
}

/* ---------- Search ----------
   One box that finds clients, exercises, templates, messages and any page or setting.
   Each result is a button that runs a normal app action, so search never needs its own screens. */
const SEARCH_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
const CHAT_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
const GO_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

// Pages and settings you can jump to. `k` is extra words people might type for it.
function searchPages(){
  if(ui.user.role==='coach')return[
    {t:'Clients',k:'home people list',to:'nav',v:'clients'},
    {t:'Invite a client',k:'invites new add join code',to:'nav',v:'invites'},
    {t:'Reports',k:'weekly summary progress stats',to:'nav',v:'reports'},
    {t:'Templates',k:'routines saved plans',to:'nav',v:'templates'},
    {t:'Exercise library',k:'exercises videos animations moves',to:'nav',v:'exercises'},
    {t:'Notifications',k:'alerts bell',to:'notif-open'},
    {t:'Switch mode',k:'individual coach mode change',to:'mode-open',s:'Settings'},
    {t:'Settings',k:'preferences options profile',to:'settings-open'},
    {t:'Profile and logo',k:'business name brand',to:'settings-open',s:'Settings'},
    {t:'Theme',k:'colour color dark light look',to:'theme-open',s:'Settings'},
    {t:'Check-in day',k:'weekly check-ins reminder',to:'settings-open',s:'Settings'},
    {t:'Default rest time',k:'rest timer seconds',to:'settings-open',s:'Settings'},
    {t:'Past clients',k:'archived old finished',to:'show-past',v:'clients'},
    {t:'Download a backup',k:'export data save file',to:'export-data',s:'Settings'},
    {t:'Add to home screen',k:'install app phone',to:'install-open',s:'Settings'},
  ];
  const solo=isSolo(client(ui.user.id));
  return[
    {t:'Today',k:'home workout train',to:'nav',v:'today'},
    ...(solo?[{t:'Routine',k:'plan program build edit days exercises',to:'nav',v:'routine'}]:[]),
    {t:'Calendar',k:'history past workouts done missed days month report',to:'nav',v:'calendar'},
    ...(solo?[{t:'Log this week',k:'weight sleep stress weekly log',to:'nav',v:'progress',s:'Progress'}]:[{t:'Weekly check-in',k:'checkin weight sleep stress',to:'nav',v:'progress',s:'Progress'},{t:'Form checks',k:'video film technique',to:'nav',v:'progress',s:'Progress'}]),
    {t:'Progress',k:'weight measurements photos lifts',to:'nav',v:'progress'},
    ...(solo?[]:[{t:'Chat with your coach',k:'messages message talk',to:'nav',v:'chat'}]),
    {t:'Notifications',k:'alerts bell',to:'notif-open'},
    {t:'Switch mode',k:'individual coach mode change',to:'mode-open',s:'Settings'},
    {t:'Settings',k:'preferences options',to:'settings-open'},
    {t:'Workout reminders',k:'alarm notify time',to:'rem-open',s:'Settings'},
    {t:'Theme',k:'colour color dark light look',to:'theme-open',s:'Settings'},
    {t:'Check-in reminder',k:'remind weekly checkin nudge',to:'settings-open',s:'Settings'},
    {t:'Download my data',k:'export backup file',to:'export-data',s:'Settings'},
    {t:'Add to home screen',k:'install app phone',to:'install-open',s:'Settings'},
  ];
}
// Sections inside a client's page, so "lifts" can also offer "Jennifer · Lifts"
const CLIENT_TABS=[['workouts','Workouts','routine plan days'],['report','Report','lifts strength progress overload body weight calendar history'],['progress','Check-ins','checkin weight photos form'],['chat','Chat','messages message']];

// true if every word typed shows up somewhere in the text
const hit=(text,q)=>{const t=text.toLowerCase();return q.split(/\s+/).every(w=>t.includes(w))};
// wraps the matching part in <mark> so it stands out
function mark(text,q){const s=esc(text),w=q.split(/\s+/)[0];if(!w)return s;const i=s.toLowerCase().indexOf(w);return i<0?s:`${s.slice(0,i)}<mark>${s.slice(i,i+w.length)}</mark>${s.slice(i+w.length)}`}

function searchGroups(q){
  q=q.trim().toLowerCase();const groups=[],add=(title,items)=>{if(items.length)groups.push([title,items])};
  const coachSide=ui.user.role==='coach';
  const mine=coachSide?S.clients.filter(c=>c.coachId===ui.user.id&&!c.archived&&!isInvited(c)):[];
  const me=coachSide?null:client(ui.user.id);

  // nothing typed yet: show a few handy shortcuts
  if(!q){
    if(coachSide)add('Clients',mine.slice(0,4).map(c=>({t:c.name,s:c.goal||'',to:'open-client',id:c.id,ic:'av',av:avatarOf(c)})));
    add('Jump to',searchPages().filter(p=>!p.s).slice(0,coachSide?5:6));
    return groups;
  }
  if(coachSide){
    add('Clients',mine.filter(c=>hit(c.name+' '+(c.goal||''),q)).map(c=>({t:c.name,s:c.goal||'',to:'open-client',id:c.id,ic:'av',av:avatarOf(c)})));
    // typed a section name? offer that section for each client
    const tab=CLIENT_TABS.find(([,l,k])=>hit(l+' '+k,q));
    if(tab)add(tab[1],mine.slice(0,5).map(c=>({t:`${first(c.name)} · ${tab[1]}`,s:'',...(tab[0]==='report'?{to:'open-report'}:{to:'open-client',then:`tab=${tab[0]}`}),id:c.id,ic:'av',av:avatarOf(c)})));
  }
  add('Pages and settings',searchPages().filter(p=>hit(p.t+' '+p.k+' '+(p.s||''),q)));
  // exercises: the coach sees the whole library, a client only what's in their plan
  const pool=coachSide?S.exercises:[...new Set((me.plan?me.plan.days:[]).flatMap(d=>d.exercises.map(r=>r.exId)))].map(exById);
  add('Exercises',pool.filter(e=>hit(e.name+' '+e.group,q)).slice(0,6).map(e=>({t:e.name,s:e.group,to:'preview-ex',id:e.id,ic:'ex',ex:e})));
  if(coachSide)add('Templates',S.templates.filter(t=>t.coachId===ui.user.id&&hit(t.name+' '+(t.desc||''),q)).map(t=>({t:t.name,s:`${t.days.filter(d=>!d.rest).length} training days`,to:'nav',v:'templates',then:`tplOpen=${t.id}`})));
  // chat messages that mention what you typed (newest first)
  const msgs=[];
  for(const c of coachSide?mine:[me])for(const m of c.messages.slice().reverse())if(m.text&&hit(m.text,q)&&msgs.length<5)
    msgs.push({t:m.text,s:`${coachSide?first(c.name)+' · ':''}${fmtShort(new Date(m.ts).toISOString().slice(0,10))}`,to:coachSide?'open-client':'nav',id:c.id,v:'chat',then:coachSide?'tab=chat':'',ic:'chat'});
  add('Messages',msgs);
  return groups;
}

function appSearchResults(q){
  const groups=searchGroups(q);
  if(!groups.length)return `<p class="gs-empty">Nothing matches “${esc(q.trim())}”.</p>`;
  const icon=r=>r.ic==='av'?r.av:r.ic==='ex'?thumb(r.ex):`<span class="gs-ic">${r.ic==='chat'?CHAT_ICON:GO_ICON}</span>`;
  const qq=q.trim().toLowerCase();
  return groups.map(([title,items])=>`<section class="gs-group"><h4>${title}</h4>${items.map(r=>`<button class="gs-row" data-act="gs-go" data-to="${r.to}" ${r.id?`data-id="${r.id}"`:''} ${r.v?`data-v="${r.v}"`:''} ${r.then?`data-then="${r.then}"`:''}>${icon(r)}<span class="gs-txt"><b>${mark(r.t,qq)}</b>${r.s?`<small>${esc(r.s)}</small>`:''}</span></button>`).join('')}</section>`).join('');
}
function searchSheet(){
  return `<div class="card hud sheetcard searchcard" role="dialog" aria-label="Search">
    <div class="gs-bar">${SEARCH_ICON}<input type="search" id="gs-q" data-gsearch placeholder="${ui.user.role==='coach'?'Search clients, exercises, settings…':'Search workouts, exercises, settings…'}" value="${esc(ui.sq||'')}" autocomplete="off" aria-label="Search"><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <div class="gs-results" id="gs-results">${appSearchResults(ui.sq||'')}</div></div>`;
}
