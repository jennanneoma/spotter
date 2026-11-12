/* app.js: where it all comes together.
   1. load the saved data (or make fresh sample data)
   2. render(): draw the whole page from that data
   3. ACT: a list of every button action, by name. A button with data-act="open-client" runs ACT['open-client']
   4. listeners at the bottom that catch taps, typing and form sends, and call the right action
   The pattern is always the same: change the data, then render() again. */
const KEY='spotter-demo-v14';
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||S.v!==14||S.seededOn!==today())S=seed();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("This browser couldn't keep your changes. They last until you close the page.")}}

/* ---------- demo switcher ----------
   Only for the prototype: lets you jump between the coach and each client to see both sides.
   It lives behind the "viewing as" button in the top bar (see demoSheet below). */
function demoSheet(){
  const me=`${ui.user.role}:${ui.user.id}`;
  const row=(v,name,sub)=>`<button class="demo-row ${v===me?'on':''}" data-act="demo-as" data-v="${v}" ${v===me?'aria-current="true"':''}>${v.startsWith('client')&&client(v.slice(7))?avatarOf(client(v.slice(7)),'dim'):`<span class="avatar">${initials(name)}</span>`}<span class="gs-txt"><b>${esc(name)}</b>${sub?`<small>${sub}</small>`:''}</span>${v===me?'<span class="demo-tick" aria-hidden="true">✓</span>':''}</button>`;
  const groups=S.coaches.map(co=>`<section class="gs-group"><h4>${esc(co.business||co.name)}</h4>
    ${row(`coach:${co.id}`,co.name,co.onboarded===false?'Coach · first login':'Coach')}
    ${S.clients.filter(c=>c.coachId===co.id).map(c=>row(`client:${c.id}`,c.name,c.archived?'Past client':isInvited(c)?'Invited':'')).join('')}</section>`).join('');
  return `<div class="card hud sheetcard demosheet" role="dialog" aria-label="Viewing as"><div class="section-hd"><h2>Viewing as</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <div class="demo-list">${groups}</div>
    <div class="demo-foot"><div class="optrow"><span><b>Client's phone</b></span><span class="whenseg" role="group" aria-label="Client phone connection"><button class="${S.online?'on':''}" data-act="online" data-v="1">Online</button><button class="${S.online?'':'on'}" data-act="online" data-v="0">Offline</button></span></div>
    <button class="btn ghost sm" data-act="reset">Reset sample data</button></div></div>`;
}
// the round button in the top bar that opens the switcher: shows the initials of who you're viewing as
const demoBtn=()=>{const who=ui.user.role==='coach'?coach(ui.user.id):client(ui.user.id);return `<button class="barbtn whobtn" data-act="demo-open" aria-label="Viewing as ${esc(who?who.name:'')}. Switch" title="Viewing as"><span>${who&&who.avatar?`<img src="${who.avatar}" alt="">`:initials(who?(ui.user.role==='coach'?who.name:myName(who)):'?')}</span></button>`};
// switch to another person (coach or client) and start them on their home page
function switchUser(role,id){
  ui.user={role,id};ui.hist=[];ui.view=role==='coach'?'clients':'today';
  Object.assign(ui,{chooser:null,preview:null,olEx:null,finishing:null,confirm:null,swapRow:null,remSheet:false,themeSheet:false,notifSheet:false,installSheet:false,demoSheet:false,searchSheet:false,ci:null,dayDraft:null,ciOpen:null,showMeas:false,showPhotos:false,invite:null,ob:null,obStep:1,join:null,repClient:null});
  stopTimer();scrollTo(0,0);
}
// draws the whole app again from the data. Simple, and fast enough for an app this size
function render(){
  applyTheme();
  const html=ui.user.role==='coach'?coachApp():clientApp();
  // pages without the top bar (first login, invite) still get the switcher, as a small floating button
  $('#app').innerHTML=(html.includes('class="appbar"')?'':`<div class="demo-float">${demoBtn()}</div>`)+html;
  hydrateVideos();
  const m=$('#msgs');if(m)m.scrollTop=m.scrollHeight;
  if(ui.focus){const el=document.getElementById(ui.focus);if(el)el.focus();ui.focus=null}
  renderSheet();
}
// pop-ups ("sheets") sit on top of the page. Only one shows at a time
function renderSheet(){
  const sh=$('#sheet');
  if(ui.crop){if(!$('#cropbox')){sh.innerHTML=cropSheet()}cropLayout();return}
  if(ui.demoSheet){sh.innerHTML=demoSheet();return}
  if(ui.clientSheet&&ui.user.role==='coach'){sh.innerHTML=clientSheet(client(ui.clientSheet));return}
  if(ui.searchSheet){if(!$('#gs-q')){sh.innerHTML=searchSheet();const q=$('#gs-q');if(q)q.focus()}return}
  if(ui.themeSheet){sh.innerHTML=themeSheet();return}
  if(ui.installSheet){sh.innerHTML=installSheet();return}
  if(ui.notifSheet){sh.innerHTML=notifSheet();return}
  if(ui.finishing&&ui.user.role==='client'){sh.innerHTML=finishSheet(client(ui.user.id));return}
  if(ui.swapRow&&ui.user.role==='client'){sh.innerHTML=swapSheet(client(ui.user.id));return}
  if(ui.remSheet&&ui.user.role==='client'){sh.innerHTML=reminderSheet(client(ui.user.id));return}
  if(ui.nameSheet&&ui.user.role==='client'){sh.innerHTML=nameSheet(client(ui.user.id));return}
  if(!ui.preview){sh.innerHTML='';return}
  const e=exById(ui.preview);
  sh.innerHTML=`<div class="card hud sheetcard" role="dialog" aria-label="${esc(e.name)}"><div class="section-hd"><div><h2>${esc(e.name)}</h2><p class="hint">${esc(e.group)} · ${e.video?'your video':'animation'}</p></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
  <div class="demo hud">${anim(e)}<span class="scan" aria-hidden="true"></span></div>
  <label class="btn" for="vid-${e.id}">${e.video?'Replace video':'Use my own video instead'}<input type="file" id="vid-${e.id}" data-vid="${e.id}" accept="video/mp4,video/webm,video/quicktime" hidden></label>
  ${e.video&&!e.custom?`<button class="btn ghost" data-act="clear-video" data-id="${e.id}">Go back to the animation</button>`:''}
  ${e.custom?`<button class="btn ghost" data-act="del-ex" data-id="${e.id}">Delete this exercise</button>`:''}</div>`;
}
/* low energy today: longer breaks so every rep can still be finished */
function restBonus(c){const r=c.readiness[today()];if(!r||!pref(c,'extraRest'))return 0;const sc=readyScore(r);return sc<55?60:sc<75?30:0}
function closeSheets(){ui.crop=null;ui.demoSheet=false;if(ui.clientSheet)ui.confirm=null;ui.clientSheet=null;ui.searchSheet=false;ui.sq='';ui.preview=null;ui.finishing=null;ui.swapRow=null;ui.remSheet=false;ui.nameSheet=false;ui.themeSheet=false;ui.notifSheet=false;ui.installSheet=false;render()}
function newClient(o){return{id:uid(),logs:[],weights:[],photos:[],messages:[],notes:[],plan:null,session:null,readiness:{},progressions:[],planHistory:[],swaps:{},swapFeed:[],measures:[],checkins:[],formChecks:[],dayEdits:{},reminder:{on:false,time:'07:00'},coachRead:0,notesSeen:0,status:'active',...o}}
function shrinkImage(file,max,done,type='image/png'){const img=new Image();img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(img.src);done(cv.toDataURL(type,.82))};img.onerror=()=>toast("That file couldn't be read as an image. Try a JPG or PNG.");img.src=URL.createObjectURL(file)}
let toastT;
// the little message that pops up at the bottom for a few seconds
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3400)}

/* rest timer + session clock */
let timer=null;
function startTimer(sec,label){if(!sec){stopTimer();return}timer={end:Date.now()+sec*1000,total:sec,label,over:false};tickTimer()}
function stopTimer(){timer=null;$('#timer').hidden=true}
function tickTimer(){
  const el=$('#elapsed');if(el&&ui.user.role==='client'){const c=client(ui.user.id);if(c.session&&c.session.startedAt)el.textContent=elapsed(c.session.startedAt)}
  const t=$('#timer');if(!timer){t.hidden=true;return}
  const left=Math.max(0,Math.ceil((timer.end-Date.now())/1000));
  if(left===0&&!timer.over){timer.over=true;timer.overAt=Date.now();try{if(ui.user.role!=='client'||pref(client(ui.user.id),'vibrate'))navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
  if(timer.over&&Date.now()-timer.overAt>4000){stopTimer();return}
  t.hidden=false;t.className=timer.over?'over':'';
  const pct=timer.over?100:100*(1-(timer.end-Date.now())/(timer.total*1000));
  t.innerHTML=`<span class="t mono">${timer.over?'GO':left>=60?fmtRest(left):left+'s'}</span><span class="tl"><span>${timer.over?'Rest is over. Next set.':'Resting · '+esc(timer.label)}</span><span class="bar"><i style="width:${pct}%"></i></span></span>${timer.over?'':'<button data-act="timer-add">+15s</button>'}<button data-act="timer-skip">${timer.over?'Close':'Skip'}</button>`;
}
setInterval(tickTimer,250);

/* the little celebration when someone sets a personal best (PR) */
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=$('#fx'),ctx=cv.getContext('2d'),W=cv.width=innerWidth,H=cv.height=innerHeight,col=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const ps=Array.from({length:140},()=>({x:W/2,y:H*.4,vx:(Math.random()-.5)*14,vy:-Math.random()*14-4,s:2+Math.random()*4,r:Math.random()*6,c:Math.random()<.75?col:'#ffffff'}));
  const t0=performance.now();cv.hidden=false;
  (function f(t){ctx.clearRect(0,0,W,H);ps.forEach(p=>{p.vy+=.45;p.x+=p.vx;p.y+=p.vy;p.r+=.2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.s,-p.s/2,p.s*2,p.s);ctx.restore()});if(t-t0<1800)requestAnimationFrame(f);else{ctx.clearRect(0,0,W,H);cv.hidden=true}})(t0);
}

/* ---------- actions ----------
   Every button in the app has data-act="something". When it's tapped, ACT.something runs.
   After it runs the page redraws, unless the action returns 'skip' (when it already updated the bit it needed). */
const curDraft=()=>ui.drafts[ui.clientId];
const findDay=id=>{const dd=ui.dayDraft;if(dd&&dd.day.id===id)return dd.day;return curDraft().days.find(d=>d.id===id)};
// a weekly routine draft, or the one-date edit (which has no draft of its own)
const draftPlan=()=>curDraft()||(client(ui.clientId)||{}).plan;
const draftIsNew=()=>!!(curDraft()||{}).isNew;
const sinceMon=()=>ui.dayDraft?mondayOf(ui.dayDraft.date):mondayOf(today());
function move(a,i,j){if(j<0||j>=a.length)return;const[x]=a.splice(i,1);a.splice(j,0,x)}
function notify(c,text,go='today'){c.notes.unshift({id:uid(),text,go,ts:Date.now()})}
function newDay(name,rest=false){return{id:uid(),name:rest?'':name,rest,exercises:[]}}
function freshIds(days){days=clone(days);days.forEach(d=>{d.id=uid();delete d._ex;delete d._name;d.exercises.forEach(r=>r.id=uid())});return days}
function nextMonday(){const t=today(),m=mondayOf(t);return m===t?t:addDays(m,7)}
const ACT={
  'open-report'(el){ui.view='reports';ui.repClient=el.dataset.id;ui.repTab=el.dataset.tab||'overview';ui.cal=null;ui.strAll=false;scrollTo(0,0)},
  nav(el){if(el.dataset.v==='reports')ui.repClient=null;ui.view=el.dataset.v;ui.chooser=null;ui.preview=null;ui.olEx=null;ui.confirm=null;scrollTo(0,0)},
  'open-client'(el){ui.view='client';ui.clientId=el.dataset.id;ui.tab='workouts';ui.olEx=null;ui.confirm=null;scrollTo(0,0)},
  tab(el){ui.tab=el.dataset.v;ui.olEx=null},
  'show-past'(el){ui.view='clients';ui.showPast=true;scrollTo(0,0)},
  'toggle-past'(){ui.showPast=!ui.showPast;ui.confirm=null},
  // "Remove client" asks first, inside the same client sheet
  'ask-archive'(el){ui.clientSheet=el.dataset.id;ui.confirm={id:el.dataset.id,kind:'archive'};renderSheet();return'skip'},
  // the gear on a client's page: their details and the remove button, in one sheet
  'client-set'(el){ui.clientSheet=el.dataset.id;renderSheet();return'skip'},
  // "+ Note" under an exercise in the routine editor
  'note-open'(el){ui.noteOpen=el.dataset.row;ui.focus='rn-'+el.dataset.row},
  // save the square you can see in the crop pop-up as the profile picture
  'crop-save'(){const c=ui.crop,box=$('#cropbox');if(!c)return'skip';cropLayout();const B=c.B||(box?box.getBoundingClientRect().width:280),s=B/Math.min(c.w,c.h)*c.zoom;
    const im=new Image();im.onload=()=>{const logo=c.for!=='avatar',cv=document.createElement('canvas');cv.width=cv.height=320;cv.getContext('2d').drawImage(im,c.w/2+(-B/2-c.x)/s,c.h/2+(-B/2-c.y)/s,B/s,B/s,0,0,320,320);
      const out=logo?cv.toDataURL('image/png'):cv.toDataURL('image/jpeg',.85);ui.crop=null; // logos stay PNG so see-through parts stay see-through
      if(c.for==='avatar'){client(ui.user.id).avatar=out;toast('Profile picture saved.')}else if(c.for==='logo'){coach(ui.user.id).logo=out;toast('Logo saved.')}else ui.ob.logo=out;
      save();render()};im.src=c.src;return'skip'},
  'pic-remove'(){const c=client(ui.user.id);delete c.avatar;save();toast('Profile picture removed.')},
  'ask-delete'(el){ui.confirm={id:el.dataset.id,kind:'delete'};if(ui.clientSheet){renderSheet();return'skip'}},
  'cancel-confirm'(){ui.confirm=null;if(ui.clientSheet){renderSheet();return'skip'}},
  'archive-client'(el){const c=client(el.dataset.id);c.archived=true;c.archivedAt=today();ui.confirm=null;ui.clientSheet=null;ui.view='clients';ui.showPast=true;save();toast(`${c.name} moved to past clients. You can restore them anytime.`)},
  'restore-client'(el){const c=client(el.dataset.id);c.archived=false;delete c.archivedAt;save();toast(`${c.name} is active again.`)},
  'delete-client'(el){const c=client(el.dataset.id);S.clients=S.clients.filter(x=>x.id!==c.id);ui.confirm=null;ui.clientSheet=null;ui.view='clients';if(ui.user.id===c.id)ui.user={role:'coach',id:c.coachId};save();toast(`${c.name} and their history were deleted.`)},
  'new-plan'(){ui.chooser=ui.clientId},
  'close-chooser'(){ui.chooser=null},
  'plan-blank'(){ui.drafts[ui.clientId]={isNew:true,name:'New routine',startDate:nextMonday(),days:WK.map((_,i)=>newDay('',![0,2,4].includes(i)))};ui.openDay=null;ui.chooser=null},
  'plan-template'(el){const t=S.templates.find(x=>x.id===el.dataset.id);ui.drafts[ui.clientId]={isNew:true,name:t.name,startDate:nextMonday(),days:toWeek(freshIds(t.days))};ui.chooser=null;toast(`Loaded “${t.name}”. Adjust weights for this client, then save.`)},
  'plan-copy'(el){const o=client(el.dataset.id);ui.drafts[ui.clientId]={isNew:true,name:o.plan.name,startDate:nextMonday(),days:toWeek(freshIds(o.plan.days))};ui.chooser=null;toast(`Copied ${first(o.name)}'s plan. Adjust weights, then save.`)},
  "edit-plan"(){const c=client(ui.clientId),d={...clone(c.plan),isNew:false};d.days=toWeek(d.days);for(const day of d.days)for(const r of day.exercises)if(progOf(r).type==="weekly"&&hasW(r.weight)){r.weight=setWeight(r,0,today(),c.plan);r.since=mondayOf(today())}ui.drafts[c.id]=d;ui.openDay=null},
  "prog-type"(el){const r=findDay(el.dataset.day).exercises.find(x=>x.id===el.dataset.row);r.prog={...progOf(r),type:el.dataset.v};if(el.dataset.v==="weekly")r.since=draftIsNew()?undefined:sinceMon()},
  discard(){delete ui.drafts[ui.clientId];ui.saveWhen=null},
  'open-day'(el){ui.openDay=el.dataset.day===openDayId()?'':el.dataset.day},
  'add-day'(){const d=curDraft();d.days.push(newDay(`Day ${d.days.filter(x=>!x.rest).length+1}`));ui.openDay=d.days[d.days.length-1].id;ui.focus='dn-'+ui.openDay},
  'add-rest'(){const d=curDraft();d.days.push(newDay('',true));ui.openDay=d.days[d.days.length-1].id},
  'toggle-rest'(el){const day=findDay(el.dataset.day);day.rest=!day.rest;if(day.rest){day._ex=day.exercises;day.exercises=[];day._name=day.name;day.name=''}else{day.exercises=day._ex||[];day.name=day._name||'';delete day._ex;delete day._name;ui.focus='dn-'+day.id}},
  'copy-day-to'(el){const d=curDraft(),i=d.days.findIndex(x=>x.id===el.dataset.day),to=+el.dataset.to,cp=freshIds([d.days[i]])[0];d.days[to]=cp;toast(`${WKL[i]} copied to ${WKL[to]}.`)},
  'copy-day'(el){const d=curDraft(),i=d.days.findIndex(x=>x.id===el.dataset.day),cp=freshIds([d.days[i]])[0];if(!cp.rest)cp.name+=' (copy)';d.days.splice(i+1,0,cp);ui.openDay=cp.id;toast('Day copied. Rename it and adjust the exercises.')},
  'del-day'(el){const d=curDraft();if(d.days.length===1){toast('A plan needs at least one day.');return}d.days=d.days.filter(x=>x.id!==el.dataset.day)},
  'day-up'(el){const d=curDraft(),i=d.days.findIndex(x=>x.id===el.dataset.day);move(d.days,i,i-1)},
  'day-down'(el){const d=curDraft(),i=d.days.findIndex(x=>x.id===el.dataset.day);move(d.days,i,i+1)},
  'row-up'(el){const day=findDay(el.dataset.day),i=day.exercises.findIndex(r=>r.id===el.dataset.row);move(day.exercises,i,i-1)},
  'row-down'(el){const day=findDay(el.dataset.day),i=day.exercises.findIndex(r=>r.id===el.dataset.row);move(day.exercises,i,i+1)},
  'row-del'(el){const day=findDay(el.dataset.day);day.exercises=day.exercises.filter(r=>r.id!==el.dataset.row)},
  'add-ex'(el){const day=findDay(el.dataset.day),c=client(ui.clientId)||TPL_CLIENT,h=exHistory(c,el.dataset.ex),last=h[h.length-1];day.exercises.push({id:uid(),exId:el.dataset.ex,sets:3,reps:'10',rest:pref(coach(ui.user.id),'defaultRest'),weight:last&&last.top!=null?last.top:"",prog:{type:"none",step:2.5,every:1},note:""});ui.focus='s-'+day.id},
  'add-typed'(el){const inp=document.getElementById('s-'+el.dataset.day),q=(inp&&inp.value||'').trim(),ql=q.toLowerCase();
    if(!q){if(inp)inp.focus();toast('Type an exercise name, then tap +.');return 'skip'}
    const m=S.exercises.filter(e=>e.name.toLowerCase().includes(ql)||e.group.toLowerCase()===ql),hit=S.exercises.find(e=>e.name.toLowerCase()===ql)||(m.length===1?m[0]:null);
    if(hit)return ACT['add-ex']({dataset:{day:el.dataset.day,ex:hit.id}});
    if(m.length){toast('Pick one from the list, or add it as a new exercise.');return 'skip'}
    return ACT['add-new-ex']({dataset:{day:el.dataset.day,name:q}})},
  'add-new-ex'(el){const name=el.dataset.name.trim(),e={id:'u'+uid(),name,group:'Yours',pattern:'curl',noAnim:true,load:null,custom:true,coachId:ui.user.id};S.exercises.push(e);save();const day=findDay(el.dataset.day);day.exercises.push({id:uid(),exId:e.id,sets:3,reps:'10',rest:pref(coach(ui.user.id),'defaultRest'),weight:"",prog:{type:"none",step:2.5,every:1},note:""});ui.focus="s-"+day.id;toast(`Added “${name}”. Tap its name to add your own video.`)},
  'save-plan'(){const c=client(ui.clientId),d=curDraft();if(!d.startDate){toast('Pick a start date first.');return}
    // only ask "this week or next week?" once a routine is actually running
    const running=c.plan&&(!(c.plan.activeFrom>today())||(c.planHistory||[]).length);
    if(running)return ACT['save-plan-when']({dataset:{v:ui.saveWhen||'this'}});
    const updating=!!c.plan,{isNew,...plan}=clone(d);plan.id=uid();plan.days.forEach(x=>{delete x._ex;delete x._name});plan.activeFrom=mondayOf(plan.startDate);c.plan=plan;
    notify(c,updating?`${first(coach(c.coachId).name)} changed your routine. It starts ${fmtDate(plan.activeFrom)}.`:`${first(coach(c.coachId).name)} set up your new routine: ${plan.name}. It starts ${fmtDate(plan.activeFrom)}.`);
    delete ui.drafts[c.id];ui.saveWhen=null;save();scrollTo(0,0);toast(`Routine saved. It starts ${fmtDate(plan.activeFrom)}.`)},
  'routine-when'(el){ui.saveWhen=el.dataset.v},
  'save-plan-when'(el){const c=client(ui.clientId),d=curDraft(),mon=mondayOf(today()),from=el.dataset.v==='next'?addDays(mon,7):mon;
    c.planHistory=c.planHistory||[];
    const old=c.plan,oldFrom=old.activeFrom||mondayOf(old.startDate);
    if(oldFrom<from)c.planHistory.push({from:oldFrom,until:addDays(from,-1),plan:clone(old)});
    c.planHistory=c.planHistory.map(h=>h.until>=from?{...h,until:addDays(from,-1)}:h).filter(h=>h.from<=h.until);
    const{isNew,...plan}=clone(d);plan.id=uid();plan.days.forEach(x=>{delete x._ex;delete x._name});plan.startDate=old.startDate;plan.activeFrom=from;plan.days.forEach(x=>x.exercises.forEach(r=>{if(progOf(r).type==='weekly'&&!r.since)r.since=from}));c.plan=plan;
    const wn=weekName(c,from),cn=first(coach(c.coachId).name);
    notify(c,el.dataset.v==='next'?`${cn} set your new routine. It starts ${fmtDate(from)}.`:`${cn} changed your routine for this week.`);
    ui.saveWhen=null;delete ui.drafts[c.id];save();
    scrollTo(0,0);toast(el.dataset.v==='next'?`Routine saved. It starts ${fmtDate(from)}${wn?` (${wn})`:''}.`:`Routine saved for this week${wn?` (${wn})`:''}.`)},
  'plan-from-history'(el){const c=client(ui.clientId),h=c.planHistory[+el.dataset.i];ui.drafts[c.id]={isNew:false,name:h.plan.name,startDate:c.plan.startDate,days:freshIds(h.plan.days)};ui.openDay=null;scrollTo(0,0);toast(`Loaded “${h.plan.name}”. Change it, then save it for this week or next.`)},
  // one date only
  'strip-week'(el){const m0=mondayOf(today()),cur=ui.stripMon&&ui.stripMon>=m0?ui.stripMon:m0;ui.stripMon=addDays(cur,7*+el.dataset.v)},
  'day-edit'(el){const c=client(ui.clientId),d=el.dataset.v,inf=dayAt(c,d);if(!inf.day)return'skip';
    // same ids as the routine day, so a workout already started today keeps its logged sets
    const day=clone(inf.day);day.exercises.forEach((r,k)=>{const r0=inf.day.exercises[k];if(progOf(r0).type==='weekly'&&hasW(r0.weight)){r.weight=setWeight(r0,0,d,inf.plan);r.since=mondayOf(d)}});
    ui.dayDraft={cid:c.id,date:d,day};ui.openDay=day.id;scrollTo(0,0)},
  'cal-change'(el){ui.view='client';ui.clientId=el.dataset.id;ui.tab='workouts';ui.olEx=null;ui.confirm=null;return ACT['day-edit'](el)},
  // going back and searching (see ui-search.js)
  back(el){
    goBack(()=>{const fb=el.dataset.fb;if(fb&&ACT[fb])ACT[fb](el);else ACT.nav(el)});
    // keep the browser's own history in step so its back button doesn't jump twice
    if(pushedStates>0){pushedStates--;skipPop=true;try{history.back()}catch(e){skipPop=false}}
  },
  'demo-open'(){ui.demoSheet=true;renderSheet();return'skip'},
  'demo-as'(el){const[role,id]=el.dataset.v.split(':');switchUser(role,id)},
  'search-open'(){ui.searchSheet=true;ui.sq='';renderSheet();return'skip'},
  'gs-go'(el){
    ui.searchSheet=false;ui.sq='';$('#sheet').innerHTML='';
    ACT[el.dataset.to](el);
    // some results need one more step, like opening a client on their Check-ins tab
    for(const pair of (el.dataset.then||'').split(',').filter(Boolean)){const[k,v]=pair.split('=');ui[k]=v}
  },
  // saves everything this person can see as a .json file
  'export-data'(){
    const coachSide=ui.user.role==='coach',data=coachSide?{coach:coach(ui.user.id),clients:S.clients.filter(c=>c.coachId===ui.user.id),templates:S.templates.filter(t=>t.coachId===ui.user.id)}:{you:client(ui.user.id)};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`spotter-${coachSide?'backup':'my-data'}-${today()}.json`;document.body.appendChild(a);a.click();a.remove();
    toast('Downloaded. Keep it somewhere safe.');return'skip'},
  'recent-all'(){ui.recentAll=!ui.recentAll},
  'day-scope'(el){ui.dayDraft.all=el.dataset.v==='all'},
  'day-edit-cancel'(){ui.dayDraft=null;scrollTo(0,0)},
  'day-edit-save'(){const c=client(ui.clientId),{date,day}=ui.dayDraft,cp=clone(day);delete cp._ex;delete cp._name;
    if(!cp.rest&&!cp.exercises.length){toast('Add an exercise, or make it a rest day.');return'skip'}
    c.dayEdits=c.dayEdits||{};
    if(ui.dayDraft.all&&canApplyAll(c,date)){// change the routine itself from this week on; earlier weeks keep the old version
      const p=c.plan,i=weekIdx(date),from=mondayOf(date),pFrom=p.activeFrom||mondayOf(p.startDate),plan=clone(p),W=WKL[i];
      plan.id=uid();plan.days[i]={...cp,id:p.days[i].id};
      if(pFrom<from){c.planHistory=c.planHistory||[];c.planHistory.push({from:pFrom,until:addDays(from,-1),plan:clone(p)});plan.activeFrom=from}
      c.plan=plan;Object.keys(c.dayEdits).forEach(k=>{if(k>=date&&weekIdx(k)===i)delete c.dayEdits[k]});
      notify(c,`${first(coach(c.coachId).name)} changed your ${W} workout, from ${fmtDate(date)} on.`);
      ui.dayDraft=null;save();scrollTo(0,0);toast(`Saved. Every ${W} from ${fmtDate(date)} follows this.`);return}
    c.dayEdits[date]=cp;notify(c,`${first(coach(c.coachId).name)} changed your workout for ${fmtDate(date)}.`);
    ui.dayDraft=null;save();scrollTo(0,0);toast(`Saved. Only ${fmtDate(date)} changes.`)},
  'day-edit-reset'(){const c=client(ui.clientId),{date}=ui.dayDraft;delete c.dayEdits[date];notify(c,`${first(coach(c.coachId).name)} put ${fmtDate(date)} back to your usual routine.`);
    ui.dayDraft=null;save();scrollTo(0,0);toast(`${fmtDate(date)} is back to the usual routine.`)},
  'save-template'(){const d=curDraft();S.templates.push({id:uid(),coachId:ui.user.id,name:d.name,days:toWeek(freshIds(d.days))});save();toast(`Saved “${d.name}” as a template. Find it in the Templates tab.`)},
  // templates tab
  'tpl-new'(){const k=tplKey();ui.drafts[k]={isNew:true,tplId:null,name:'',desc:'',days:WK.map((_,i)=>newDay('',![0,2,4].includes(i)))};ui.clientId=k;ui.openDay=null;ui.tplUse=null;ui.tplDel=null;ui.focus='tpl-name';scrollTo(0,0)},
  'tpl-edit'(el){const t=S.templates.find(x=>x.id===el.dataset.id),k=tplKey(t.id);ui.drafts[k]={isNew:true,tplId:t.id,name:t.name,desc:t.desc||'',days:toWeek(clone(t.days))};ui.clientId=k;ui.openDay=null;scrollTo(0,0)},
  'tpl-dup'(el){const t=S.templates.find(x=>x.id===el.dataset.id),cp={id:uid(),coachId:t.coachId,name:t.name+' (copy)',desc:t.desc||'',days:toWeek(freshIds(t.days))};S.templates.splice(S.templates.indexOf(t)+1,0,cp);ui.tplOpen=cp.id;save();toast(`Made a copy: “${cp.name}”. Tap Edit to change it.`)},
  'tpl-del-ask'(el){ui.tplDel=el.dataset.id||null;ui.tplUse=null},
  'tpl-del'(el){S.templates=S.templates.filter(t=>t.id!==el.dataset.id);ui.tplDel=null;save();toast('Template deleted.')},
  'tpl-open'(el){ui.tplOpen=ui.tplOpen===el.dataset.id?null:el.dataset.id;ui.tplUse=null;ui.tplDel=null},
  'tpl-use'(el){ui.tplUse=el.dataset.id||null;ui.tplDel=null},
  'tpl-apply'(el){const t=S.templates.find(x=>x.id===el.dataset.id),c=client(el.dataset.client);ui.drafts[c.id]={isNew:true,name:t.name,startDate:nextMonday(),days:toWeek(freshIds(t.days))};ui.tplUse=null;ui.view='client';ui.clientId=c.id;ui.tab='workouts';ui.openDay=null;scrollTo(0,0);toast(`Loaded “${t.name}” for ${c.name}. Set their weights, then save.`)},
  'tpl-cancel'(){delete ui.drafts[ui.clientId];ui.clientId=null;ui.view='templates'},
  'tpl-save'(){const k=ui.clientId,d=ui.drafts[k];if(!d)return;const name=(d.name||'').trim();if(!name){toast('Give the template a name first.');ui.focus='tpl-name';return}
    const days=toWeek(clone(d.days));days.forEach(x=>{delete x._ex;delete x._name});
    if(d.tplId){const t=S.templates.find(x=>x.id===d.tplId);Object.assign(t,{name,desc:(d.desc||'').trim(),days})}else S.templates.push({id:uid(),coachId:ui.user.id,name,desc:(d.desc||'').trim(),days});
    delete ui.drafts[k];ui.clientId=null;save();toast(d.tplId?`Template “${name}” updated. Clients already using it keep their routine.`:`Template “${name}” created.`)},
  'del-template-old'(el){S.templates=S.templates.filter(t=>t.id!==el.dataset.id);save();toast('Template deleted.')},
  'ol-ex'(el){ui.olEx=el.dataset.id;scrollTo(0,0)},
  'ol-back'(){ui.olEx=null},
  'rep-range'(el){ui.repRange=+el.dataset.v},
  'rep-tab'(el){ui.repTab=el.dataset.v},
  'str-all'(){ui.strAll=!ui.strAll},
  'lifts-all'(){ui.liftsAll=!ui.liftsAll},
  'rep-week'(el){ui.repTab='history';ui.cal={month:monthOf(el.dataset.v),day:null,week:el.dataset.v};scrollTo(0,0)},
  'cal-month'(el){ui.cal.month=shiftMonth(ui.cal.month,+el.dataset.v);ui.cal.day=null;ui.cal.week=null},
  'cal-day'(el){ui.cal.day=el.dataset.v;ui.cal.week=null;ui.cal.month=monthOf(el.dataset.v)},
  'cal-week'(el){ui.cal.week=ui.cal.week===el.dataset.v?null:el.dataset.v;ui.cal.day=null},
  // library
  'lib-group'(el){ui.libGroup=el.dataset.v},
  'preview-ex'(el){ui.preview=el.dataset.id;renderSheet();return'skip'},
  'close-sheet'(){closeSheets();return'skip'},
  'clear-video'(el){const e=exById(el.dataset.id);delete e.video;save();renderSheet();toast('Back to the built-in animation.');return'skip'},
  'del-ex'(el){if(S.clients.some(c=>c.plan&&c.plan.days.some(d=>d.exercises.some(r=>r.exId===el.dataset.id)))){toast("This exercise is in a client's plan. Remove it from the plan first.");return'skip'}S.exercises=S.exercises.filter(e=>e.id!==el.dataset.id);ui.preview=null;save();toast('Exercise deleted.')},
  // onboarding + invites
  'ob-next'(){if((ui.obStep||1)===1&&!(ui.ob&&ui.ob.name.trim()))return'skip';ui.obStep=(ui.obStep||1)+1;scrollTo(0,0)},
  'ob-back'(){ui.obStep=Math.max(1,(ui.obStep||1)-1)},
  'ob-finish'(el){const co=coach(ui.user.id),d=ui.ob;
    if(!el.dataset.skip&&!d.cname.trim()){toast("Add your client's name, or tap Skip for now.");return'skip'}
    co.name=d.name.trim()||co.name;co.business=d.business.trim();co.logo=d.logo||null;co.onboarded=true;
    if(!el.dataset.skip){const c=newClient({coachId:co.id,name:d.cname.trim(),goal:d.cgoal.trim(),status:'invited',inviteCode:newCode(),invitedAt:today()});S.clients.push(c);ui.invOpen=c.id}
    ui.ob=null;ui.obStep=1;ui.view=el.dataset.skip?'clients':'invites';save();toast(`You're all set, ${first(co.name)}.`)},
  'inv-open'(el){ui.invOpen=ui.invOpen===el.dataset.id?null:el.dataset.id;ui.confirm=null},
  'inv-go'(el){ui.clientSheet=null;ui.view='invites';ui.invOpen=el.dataset.id;scrollTo(0,0)},
  'inv-ask-cancel'(el){ui.confirm={id:el.dataset.id,kind:'cancelinv'}},
  'inv-cancel'(el){const c=client(el.dataset.id);S.clients=S.clients.filter(x=>x.id!==c.id);ui.confirm=null;ui.invOpen=null;save();toast(`Invite for ${c.name} cancelled.`)},
  'copy-invite'(el){const c=client(el.dataset.id),txt=el.dataset.msg?inviteMsg(c,coach(c.coachId)):inviteLink(c);
    const fallback=()=>{const s=$('#link-'+c.id);if(s){const r=document.createRange();r.selectNodeContents(s);const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}toast('Copying is blocked here. The link is selected, so copy it yourself.')};
    try{navigator.clipboard.writeText(txt).then(()=>toast(el.dataset.msg?'Message copied. Paste it into WhatsApp or a text.':'Link copied.'),fallback)}catch(x){fallback()}return'skip'},
  'new-invite'(el){const c=client(el.dataset.id);c.inviteCode=newCode();c.invitedAt=today();save();toast('New link made. The old link no longer works.')},
  // reminders, swaps, measurements, summary
  'rem-open'(){ui.remSheet=true;renderSheet();return'skip'},
  'swap-open'(el){ui.swapRow=el.dataset.row;renderSheet();return'skip'},
  'do-swap'(el){const c=client(ui.user.id),T=today(),r=dayAt(c,T).day.exercises.find(x=>x.id===el.dataset.row);
    c.swaps=c.swaps||{};c.swaps[T]=c.swaps[T]||{};c.swaps[T][r.id]=el.dataset.ex;if(c.session&&c.session.sets)delete c.session.sets[r.id];
    c.swapFeed=(c.swapFeed||[]).filter(x=>!(x.date===T&&x.rowId===r.id));c.swapFeed.push({id:uid(),date:T,rowId:r.id,from:r.exId,to:el.dataset.ex,ts:Date.now(),synced:S.online});
    ui.swapRow=null;save();toast(`Swapped to ${exById(el.dataset.ex).name} for today. ${first(coach(c.coachId).name)} will see it.`)},
  'undo-swap'(el){const c=client(ui.user.id),T=today();if(c.swaps&&c.swaps[T])delete c.swaps[T][el.dataset.row];if(c.session&&c.session.sets)delete c.session.sets[el.dataset.row];
    c.swapFeed=(c.swapFeed||[]).filter(x=>!(x.date===T&&x.rowId===el.dataset.row));ui.swapRow=null;save();toast('Back to the original exercise.')},
  'notif-open'(){const o=notifOwner();ui.notifPrev=o.notifRead||0;o.notifRead=Date.now();save();ui.notifSheet=true;render();return'skip'},
  'notif-go'(el){const x=notifications()[+el.dataset.i];ui.notifSheet=false;if(ui.user.role==='client')ui.view=x.go;else{ui.view='client';ui.clientId=x.id;ui.tab=x.tab;ui.olEx=null}scrollTo(0,0)},
  'settings-open'(){if(ui.view!=='settings')ui.setBack=ui.view;ui.view='settings';scrollTo(0,0)},
  'settings-back'(){ui.view=ui.setBack||(ui.user.role==='coach'?'clients':'today');scrollTo(0,0)},
  'theme-open'(){ui.themeSheet=true;renderSheet();return'skip'},
  'theme-set'(el){setTheme(el.dataset.v);renderSheet();return'skip'},
  'meas-pick'(el){ui.measure=el.dataset.v},
  // check-ins, form checks, install
  'ci-set'(el){ui.ci={...(ui.ci||{}),[el.dataset.k]:+el.dataset.v}},
  'ci-edit'(){const ci=ciOf(client(ui.user.id),mondayOf(today()));ui.ci={kg:kg(ci.kg),sleep:ci.sleep,stress:ci.stress,note:ci.note||''}},
  'ci-cancel'(){ui.ci=null;ui.showMeas=false;ui.showPhotos=false},
  'toggle-photos'(){ui.showPhotos=!ui.showPhotos},
  'ci-open'(el){ui.ciOpen=ui.ciOpen===el.dataset.id?'':el.dataset.id},
  'ci-all'(){ui.ciAll=!ui.ciAll},
  'install-open'(){ui.installSheet=true;renderSheet();return'skip'},
  'install-go'(){if(installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;renderSheet()})}return'skip'},
  'join-seen'(el){client(el.dataset.id).joinSeen=true;save()},
  'edit-myname'(){ui.nameSheet=true;renderSheet();return'skip'},
  'toggle-meas'(){ui.showMeas=!ui.showMeas},
  'sum-week'(el){ui.sumWeek=el.dataset.v},
  'sum-open'(el){ui.sumOpen=ui.sumOpen===el.dataset.id?null:el.dataset.id},
  // client
  'dismiss-note'(el){const c=client(ui.user.id);c.notes=c.notes.filter(n=>n.id!==el.dataset.id);save()},
  'ready-set'(el){ui.ready={...(ui.ready||{}),[el.dataset.k]:+el.dataset.v}},
  'ready-save'(){const c=client(ui.user.id);c.readiness[today()]={...ui.ready,synced:S.online};ui.ready=null;save()},
  'open-ex'(el){ui.view='exercise';ui.rowId=el.dataset.row;scrollTo(0,0)},
  'set-done'(el){const c=client(ui.user.id),inf=dayAt(c,today()),r=inf.day.exercises.find(x=>x.id===el.dataset.row),s=getSets(c,r)[+el.dataset.i];s.done=!s.done;if(s.done&&!c.session.startedAt)c.session.startedAt=Date.now();save();
    if(s.done){const all=inf.day.exercises.every(x=>{const ss=getSets(c,x,false);return ss&&ss.every(y=>y.done)});if(all){stopTimer();toast('All sets done. Head back and tap Finish workout.')}else if(pref(c,'autoTimer'))startTimer(+r.rest+restBonus(c),`${exById(effRow(c,r).exId).name}, set ${+el.dataset.i+1} done`)}},
  'finish-open'(){ui.finishing={rpe:null};renderSheet();return'skip'},
  rpe(el){ui.finishing.rpe=+el.dataset.v;renderSheet();return'skip'},
  finish(){const c=client(ui.user.id),inf=dayAt(c,today()),f=finishSummary(c),T=today();
    c.logs.push({id:uid(),date:T,dayId:inf.day.id,dayName:dayLabel(weekIdx(T),inf.day),entries:f.entries,rpe:ui.finishing.rpe,durationMin:f.mins||1,prs:f.prs,note:(ui.finishing.note||'').trim(),finishedAt:Date.now(),synced:S.online});
    // "when reps are hit": every set at or above its target weight and at the top of the rep range
    const ups=[];
    for(const r of inf.day.exercises){const e=f.entries.find(x=>x.rowId===r.id),p=progOf(r);if(!e||p.type!=='earned'||!hasW(r.weight))continue;const top=topReps(r.reps);
      if(e.sets.length>=r.sets&&e.sets.every((s,i)=>hasW(s.w)&&+s.w>=setWeight(r,i,T,c.plan)&&(+s.r||0)>=(top||0))){const from=+r.weight;r.weight=+(from+(+p.step||0)).toFixed(2);c.progressions.push({date:T,exId:r.exId,from,to:r.weight,synced:S.online});ups.push(`${exById(r.exId).name} → ${kg(r.weight)} kg`)}}
    c.session=null;ui.finishing=null;stopTimer();save();
    if(f.prs.length)confetti();
    const cn=first(coach(c.coachId).name);
    toast((ups.length?`Next time: ${ups.join(', ')}. `:'')+(S.online?`Saved. ${cn} can see it now.`:`Saved on this phone. ${cn} sees it when you're back online.`))},
  'timer-add'(){if(timer){timer.end+=15000;timer.total+=15}tickTimer();return'skip'},
  'timer-skip'(){stopTimer();return'skip'},
  // demo bar
  online(el){const on=el.dataset.v==='1';if(on===S.online)return'skip';S.online=on;if(on){const n=syncAll();toast(n?`Back online. Synced ${n} change${n>1?'s':''}.`:'Back online.')}else toast("Client's phone is offline. Logging still works.");save()},
  reset(){try{localStorage.removeItem(KEY)}catch(e){}S=seed();ui.hist=[];Object.assign(ui,{dayDraft:null,ci:null,drafts:{},chooser:null,preview:null,confirm:null,olEx:null,finishing:null,ready:null,swapRow:null,remSheet:false,invite:null,ob:null,obStep:1,join:null});stopTimer();if(!(ui.user.role==='coach'?coach(ui.user.id):client(ui.user.id)))ui.user={role:'coach',id:'co1'};ui.view=ui.user.role==='coach'?'clients':'today';save();ui.demoSheet=false;toast('Sample data reset.')},
};
/* ---------- listening for taps, typing and forms ----------
   One listener for the whole page. It finds the nearest data-act and runs that action. */
document.addEventListener('click',e=>{
  if(e.target.id==='sheet'){if(ui.crop&&Date.now()-cropMovedAt<500)return;closeSheets();return}
  const el=e.target.closest('[data-act]');if(!el)return;
  const fn=ACT[el.dataset.act];if(!fn)return;e.preventDefault();
  const before=snapPage(); // remember where we were, for the back button
  const r=fn(el,e);
  if(el.dataset.act!=='back')trackPage(before);
  if(r!=='skip')render();
});
document.addEventListener('input',e=>{
  const t=e.target,ds=t.dataset;
  if(ds.cropzoom!==undefined&&ui.crop){cropZoomTo(+t.value);return}
  if(ds.gsearch!==undefined){ui.sq=t.value;$('#gs-results').innerHTML=appSearchResults(t.value);return}
  if(ds.pf){curDraft()[ds.pf]=t.value;const h=$('#cycle-hint');if(h)h.textContent=cycleHint(curDraft());return}
  if(ds.df){findDay(ds.day)[ds.df]=t.value;return}
  if(ds.rf){const r=findDay(ds.day).exercises.find(x=>x.id===ds.row),f=ds.rf;
    if(f==='sets'||f==='rest')r[f]=Math.max(f==='sets'?1:0,parseInt(t.value)||0);
    else if(f==='weight')r.weight=t.value.trim()===''?'':+String(t.value).replace(',','.')||'';
    else r[f]=t.value;
    if(f==='weight'&&progOf(r).type==='weekly'&&!draftIsNew())r.since=sinceMon();
    const pp=$('#pp-'+r.id);if(pp){pp.textContent=progOf(r).type==='none'?'':progSentence(r,draftPlan());pp.hidden=!pp.textContent}return}
  if(ds.pg){const r=findDay(ds.day).exercises.find(x=>x.id===ds.row),v=+String(t.value).replace(',','.').replace('−','-');
    if(!isNaN(v)){r.prog={...progOf(r),[ds.pg]:ds.pg==='every'?Math.max(1,Math.round(v)||1):v};if(ds.pg==='step'&&progOf(r).type==='weekly'&&!draftIsNew())r.since=sinceMon()}
    const pp=$('#pp-'+r.id);if(pp){pp.textContent=progOf(r).type==='none'?'':progSentence(r,draftPlan());pp.hidden=!pp.textContent}return}
  if(ds.ob){ui.ob[ds.ob]=t.value;const b=$('#ob-go1');if(b)b.disabled=!ui.ob.name.trim();return}
  if(ds.xnote){const c=client(ui.user.id);if(c.session){c.session.notes=c.session.notes||{};c.session.notes[ds.xnote]=t.value;save()}return}
  if(ds.fnote!==undefined){if(ui.finishing)ui.finishing.note=t.value;return}
  if(ds.rem==='time'){const c=client(ui.user.id);c.reminder={...(c.reminder||{on:true}),time:t.value||'07:00'};save();return}
  if(ds.search){$('#r-'+ds.search).innerHTML=exerciseSearchResults(ds.search,t.value);return}
  if(ds.ci){ui.ci=ui.ci||{};ui.ci[ds.ci]=t.value;return}
  if(ds.fcnote){const x=(client(ui.user.id).formChecks||[]).find(y=>y.id===ds.fcnote);if(x){x.note=t.value;save()}return}
  if(ds.libsearch!==undefined){ui.libQ=t.value;$('#lib-list').innerHTML=libItems();return}
  if(ds.sf){const c=client(ui.user.id),r=dayAt(c,today()).day.exercises.find(x=>x.id===ds.row);getSets(c,r)[+ds.i][ds.sf]=t.value;save();return}
});
document.addEventListener('keydown',e=>{
  // Ctrl+K or Cmd+K opens search, Enter picks the top result
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();ACT['search-open']();return}
  if(e.key==='Enter'&&e.target.id==='gs-q'){e.preventDefault();const b=$('#gs-results .gs-row');if(b)b.click();return}
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.search){e.preventDefault();const b=$('#r-'+e.target.dataset.search+' button');if(b)b.click()}
  if(e.key==='Escape'&&(ui.demoSheet||ui.searchSheet||ui.preview||ui.finishing||ui.swapRow||ui.remSheet||ui.nameSheet||ui.themeSheet||ui.notifSheet||ui.installSheet))closeSheets();
});
function readVideo(file,done){
  if(file.size>3*1024*1024){toast('That video is over 3 MB. Trim it to a few seconds so it loads fast and works offline.');return}
  const rd=new FileReader();rd.onload=()=>done(rd.result);rd.readAsDataURL(file);
}
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.pref){const o=notifOwner();o.prefs=o.prefs||{};o.prefs[t.dataset.pref]=t.type==='checkbox'?t.checked:+t.value;save();return}
  if(t.dataset.pf==='startDate'){render();return}
  if(t.dataset.rem==='on'){const c=client(ui.user.id);c.reminder={...(c.reminder||{time:'07:00'}),on:t.checked};save();renderSheet();toast(t.checked?'Reminders on.':'Reminders off.');return}
  if(t.dataset.rem==='time'){renderSheet();return}
  if(t.dataset.rf==="weight"){const sel=t.closest(".exrow").querySelector("[data-pgtype]");if(sel&&sel.disabled===(t.value.trim()!==""))render();return}
  // the "Weight" dropdown under each exercise: same as tapping one of the old buttons
  if(t.dataset.pgtype!==undefined){ACT['prog-type']({dataset:{day:t.dataset.day,row:t.dataset.row,v:t.value}});render();return}
  // a client picking their own profile picture
  // a photo or logo was picked: open the crop pop-up so it can be moved and zoomed first
  const pickFor=t.dataset.mypic!==undefined?'avatar':t.dataset.setlogo!==undefined?'logo':t.dataset.oblogo!==undefined?'oblogo':null;
  if(pickFor&&t.files[0]){openCrop(t.files[0],pickFor);t.value='';return}
  if(t.dataset.vid&&t.files[0]){readVideo(t.files[0],src=>{exById(t.dataset.vid).video=src;save();renderSheet();toast('Video saved. Clients see it instead of the animation.')});return}
  if(t.dataset.fcfile&&t.files[0]){const c=client(ui.user.id),file=t.files[0],cn=first(coach(c.coachId).name);
    if(file.size>150*1024*1024){toast('That video is very long. Film one set, about 10 to 30 seconds.');return}
    const id=uid();VDB.put(id,file).then(()=>{vURL[id]=URL.createObjectURL(file);c.formChecks=c.formChecks||[];c.formChecks.push({id,date:today(),exId:t.dataset.fcfile,note:'',ts:Date.now(),synced:S.online,reply:null});save();render();toast(S.online?`Sent to ${cn}. Add a note if you like.`:`Saved on this phone. It sends when you're back online.`)})
      .catch(()=>toast("This browser couldn't save the video. Try a shorter clip."));return}
  if(t.dataset.photo&&t.files[0]){
    const c=client(ui.user.id),angle=t.dataset.photo,img=new Image();
    img.onload=()=>{const W=360,H=Math.round(img.height*W/img.width),cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.getContext('2d').drawImage(img,0,0,W,H);
      const src=cv.toDataURL('image/jpeg',.72);URL.revokeObjectURL(img.src);c.photos=c.photos.filter(p=>!(p.date===today()&&p.angle===angle));c.photos.push({id:uid(),date:today(),angle,src,synced:S.online});save();render();toast(`${angle[0].toUpperCase()+angle.slice(1)} photo saved.`)};
    img.onerror=()=>toast("That file couldn't be read as a photo. Try a JPG or PNG.");
    img.src=URL.createObjectURL(t.files[0]);
  }
});
// forms (like sending a message or a check-in) all come through here, picked by data-form
document.addEventListener('submit',e=>{
  const f=e.target,k=f.dataset.form;if(!k)return;e.preventDefault();const fd=new FormData(f);
  if(k==='add-client'){const name=fd.get('name').trim();if(!name)return;const c=newClient({coachId:ui.user.id,name,goal:fd.get('goal').trim(),status:'invited',inviteCode:newCode(),invitedAt:today()});S.clients.push(c);ui.invOpen=c.id;ui.view='invites';save();render();scrollTo(0,0);toast(`Invite ready for ${c.name}. Send them the link.`);return}
  if(k==='coach-profile'){const o=coach(ui.user.id),n=String(fd.get('name')||'').trim();if(!n){toast('Enter your name.');return}o.name=n;o.business=String(fd.get('business')||'').trim();save();render();toast('Profile saved.');return}
  if(k==='edit-client'){const c=client(ui.clientId),n=String(fd.get('name')||'').trim();if(!n){toast('Enter a name.');return}c.name=n;c.goal=String(fd.get('goal')||'').trim();ui.clientSheet=null;save();render();renderSheet();toast('Client details saved.');return}
  if(k==='my-name'){const c=client(ui.user.id),n=String(fd.get('name')||'').trim();if(!n){toast('Enter a name.');return}c.selfName=n;ui.nameSheet=false;save();render();toast(`Got it, ${first(n)}.`);return}
  if(k==='join'){const c=client(ui.user.id);if(String(fd.get('pw')).length<8){toast('Use at least 8 characters for your password.');return}const nm=String(fd.get('name')||'').trim();c.invitedAs=c.name;if(nm){c.name=nm;c.selfName=nm}c.status='active';c.joinedTs=Date.now();c.joinSeen=false;c.joinedAt=today();ui.join=null;c.notes.unshift({id:uid(),text:`Welcome! You're now connected to ${coach(c.coachId).name}. Your plan shows here as soon as it's ready.`,ts:Date.now()});save();render();toast('Welcome to Spotter.');return}
  if(k==='send'){const text=fd.get('text').trim();if(!text)return;const role=ui.user.role,c=role==='coach'?client(ui.clientId):client(ui.user.id);c.messages.push({from:role,text,ts:Date.now(),synced:role==='coach'?true:S.online});if(role==='coach')c.coachRead=Date.now();save();ui.focus='msg-input';render();return}
  if(k==='checkin'){const c=client(ui.user.id),v=ui.ci||{},T=today(),mon=mondayOf(T),cn=first(coach(c.coachId).name),w=parseFloat(String(v.kg||'').replace(',','.'));
    if(!(w>20&&w<400)){toast('Enter your weight in kilograms, for example 78.4.');ui.focus='ci-kg';render();return}
    if(!v.sleep||!v.stress){toast('Tap a number for sleep and for stress.');return}
    const mm={};MEAS.forEach(([m])=>{const x=parseFloat(String(v['m_'+m]||'').replace(',','.'));if(x>10&&x<300)mm[m]=Math.round(x*10)/10});
    if(Object.keys(mm).length){c.measures=(c.measures||[]).filter(x=>x.date!==T);c.measures.push({id:uid(),date:T,...mm,synced:S.online})}
    const kgv=Math.round(w*10)/10;c.weights=c.weights.filter(x=>x.date!==T);c.weights.push({id:uid(),date:T,kg:kgv,synced:S.online});
    const old=ciOf(c,mon);c.checkins=(c.checkins||[]).filter(x=>x.week!==mon);
    c.checkins.push({id:old?old.id:uid(),week:mon,date:T,kg:kgv,sleep:v.sleep,stress:v.stress,note:String(v.note||'').trim(),ts:Date.now(),synced:S.online,reply:old?old.reply:null});
    ui.ci=null;ui.showMeas=false;ui.showPhotos=false;save();render();scrollTo(0,0);toast(S.online?`Check-in sent. ${cn} will reply here.`:"Saved on this phone. It sends when you're back online.");return}
  if(k==='ci-reply'||k==='fc-reply'){const c=client(ui.clientId),text=String(fd.get('text')||'').trim();if(!text){toast('Write a reply first.');return}
    const x=(k==='ci-reply'?c.checkins:c.formChecks).find(y=>y.id===f.dataset.id);x.reply={text,ts:Date.now()};const cn=first(coach(c.coachId).name);
    notify(c,k==='ci-reply'?`${cn} replied to your weekly check-in.`:`${cn} replied to your ${exById(x.exId).name} form check.`,'progress');save();render();toast(`Reply sent to ${first(c.name)}.`);return}
  if(k==='add-ex'){const like=exById(fd.get('like')),name=fd.get('name').trim(),file=fd.get('video');
    const done=video=>{S.exercises.push({id:'u'+uid(),name,group:fd.get('group'),pattern:like.pattern,load:like.load,custom:true,coachId:ui.user.id,video:video||undefined});save();ui.libGroup='Yours';ui.libQ='';render();toast(`Added “${name}”.`)};
    if(file&&file.size)readVideo(file,done);else done(null)}
});
/* drag to reorder exercises within a day (handle only) */
let drag=null;
document.addEventListener('pointerdown',e=>{const g=e.target.closest('.grip');if(g)g.closest('.exrow').draggable=true});
document.addEventListener('dragstart',e=>{const li=e.target.closest&&e.target.closest('.exrow');if(!li)return;drag={day:li.dataset.day,row:li.dataset.row};li.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',li.dataset.row)}catch(x){}});
document.addEventListener('dragover',e=>{const li=e.target.closest&&e.target.closest('.exrow');if(!drag||!li||li.dataset.day!==drag.day)return;e.preventDefault();document.querySelectorAll('.exrow.drop').forEach(x=>x!==li&&x.classList.remove('drop'));li.classList.add('drop')});
document.addEventListener('drop',e=>{const li=e.target.closest&&e.target.closest('.exrow');if(!drag||!li||li.dataset.day!==drag.day)return;e.preventDefault();const day=findDay(drag.day);move(day.exercises,day.exercises.findIndex(r=>r.id===drag.row),day.exercises.findIndex(r=>r.id===li.dataset.row));drag=null;render()});
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.exrow').forEach(x=>{x.draggable=false;x.classList.remove('dragging','drop')})});

render();
SpotterAnim.start();
// installed app: keep working offline (only where the page is its own site, not inside a preview frame)
if('serviceWorker' in navigator&&location.protocol==='https:'&&window.top===window)navigator.serviceWorker.register('sw.js').catch(()=>{});


/* ---------- moving and zooming a profile picture before saving it ----------
   ui.crop = {src, w, h, zoom, x, y}. x and y are how far the photo's centre sits from the
   centre of the square, in screen pixels. Drag with one finger (or the mouse) to move it,
   pinch with two fingers, use the slider, or scroll the mouse wheel to zoom. */
let cropMovedAt=0;const cropPts=new Map();
// logos may zoom out until the whole logo fits inside the circle; photos always fill it
const cropMin=c=>c.for==='avatar'?1:Math.min(c.w,c.h)/Math.hypot(c.w,c.h);
function openCrop(file,target){shrinkImage(file,1600,src=>{const im=new Image();im.onload=()=>{ui.crop={for:target,src,w:im.width,h:im.height,zoom:1,x:0,y:0};if(target!=='avatar')ui.crop.zoom=cropMin(ui.crop);renderSheet()};im.src=src},target==='avatar'?'image/jpeg':'image/png')}
function cropLayout(){
  const c=ui.crop,box=$('#cropbox'),img=$('#crop-img');if(!c||!box||!img)return;
  const B=box.getBoundingClientRect().width||280,s=B/Math.min(c.w,c.h)*c.zoom,W=c.w*s,H=c.h*s;
  // never let the photo slide so far that an empty edge shows inside the square
  const mx=Math.abs(W-B)/2,my=Math.abs(H-B)/2;c.x=Math.max(-mx,Math.min(mx,c.x));c.y=Math.max(-my,Math.min(my,c.y));c.B=B;
  img.style.width=W+'px';img.style.height=H+'px';img.style.transform=`translate(${c.x-W/2}px,${c.y-H/2}px)`;
  const z=$('#crop-zoom');if(z&&+z.value!==c.zoom)z.value=c.zoom;
}
function cropZoomTo(z){const c=ui.crop;z=Math.max(cropMin(c),Math.min(4,z));c.x*=z/c.zoom;c.y*=z/c.zoom;c.zoom=z;cropLayout()}
document.addEventListener('pointerdown',e=>{
  if(!ui.crop||!e.target.closest||!e.target.closest('#cropbox'))return;
  e.preventDefault();try{e.target.closest('#cropbox').setPointerCapture(e.pointerId)}catch(err){}
  cropPts.set(e.pointerId,{x:e.clientX,y:e.clientY});
});
document.addEventListener('pointermove',e=>{
  const c=ui.crop,p=cropPts.get(e.pointerId);if(!c||!p)return;
  const others=[...cropPts].filter(([id])=>id!==e.pointerId).map(([,v])=>v);
  if(others.length){ // two fingers: pinch to zoom, and move with the middle point
    const o=others[0],d0=Math.hypot(p.x-o.x,p.y-o.y)||1,d1=Math.hypot(e.clientX-o.x,e.clientY-o.y)||1;
    c.x+=(e.clientX-p.x)/2;c.y+=(e.clientY-p.y)/2;cropZoomTo(c.zoom*d1/d0);
  }else{c.x+=e.clientX-p.x;c.y+=e.clientY-p.y;cropLayout()}
  cropPts.set(e.pointerId,{x:e.clientX,y:e.clientY});cropMovedAt=Date.now();
});
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,e=>cropPts.delete(e.pointerId)));
document.addEventListener('wheel',e=>{if(!ui.crop||!e.target.closest||!e.target.closest('#cropbox'))return;e.preventDefault();cropZoomTo(ui.crop.zoom*Math.exp(-e.deltaY*.002))},{passive:false});
