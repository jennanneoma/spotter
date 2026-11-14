/* ui-coach.js: everything the coach sees.
   coachApp() picks the right page, then each function below draws one part of it:
   the clients list, a client's page and tabs, the routine editor and the lifts tab. */
// picks which coach page to show based on ui.view, and adds the top bar and tab bar
function coachApp(){
  const co=coach(ui.user.id);let body;
  if(co.onboarded===false)return onboardingView(co);
  if(ui.view==='client')body=coachClient(co);
  else if(ui.view==='exercises')body=libraryView();
  else if(ui.view==='templates')body=templatesView(co);
  else if(ui.view==='reports')body=reportsView(co);
  else if(ui.view==='invites')body=invitesView(co);
  else if(ui.view==='settings')body=settingsView();
  else body=clientsView(co);
  return appBar(co)+`<main class="screen">${body}</main>`+tabbar([["clients","Clients"],["invites","Invites"],["reports","Reports"],["templates","Templates"]],ui.view==='client'?'clients':ui.view);
}
// the small coloured tags on a client card, like "7 days since last workout"
function alertsFor(c,st,ol){
  const a=[];
  if(st.missed)a.push(`<span class="pill bad">${st.missedLabel}</span>`);
  if(st.ready!=null&&st.ready<55)a.push(`<span class="pill bad">Low energy today ${st.ready}/100</span>`);
  if(!c.plan)a.push('<span class="pill acc">Needs a routine</span>');
  const nn=newNotes(c).length,ns=newSwaps(c).length;
  if(nn)a.push(`<span class="pill warn">${nn} new note${nn>1?'s':''}</span>`);
  if(ns)a.push(`<span class="pill warn">${ns} exercise swap${ns>1?'s':''}</span>`);
  const ta=toAnswer(c);if(ta)a.push(`<span class="pill acc">${ta} check-in${ta>1?'s':''} to answer</span>`);
  return a;
}
// the Clients page: summary at the top, then a card for each client
function clientsView(co){
  const mine=S.clients.filter(c=>c.coachId===co.id);
  const invited=mine.filter(c=>!c.archived&&isInvited(c)),fresh=ui.invite&&mine.find(c=>c.id===ui.invite&&isInvited(c));
  const LW=weekSummary(co,addDays(mondayOf(today()),-7));
  const active=mine.filter(c=>!c.archived&&!isInvited(c)).map(c=>{const st=stats(c),ol=overloadSummary(c);return{c,st,ol,al:alertsFor(c,st,ol)}}).sort((a,b)=>(b.st.missed-a.st.missed)||(b.al.length-a.al.length)||a.c.name.localeCompare(b.c.name));
  const past=mine.filter(c=>c.archived);
  const attention=active.filter(x=>x.al.length&&x.c.plan).length,trained=active.filter(x=>x.st.week>0).length;
  return `<header class="hd"><p class="eyebrow">${fmtLong(today())}</p><h1>Clients</h1></header>
  ${active.length&&pref(co,'showSummary')?`<button class="sumbanner hud" data-act="nav" data-v="reports"><span><span class="eyebrow">Last week's summary</span><b>${esc(funSummary(LW,'last'))}</b></span><span class="chev" aria-hidden="true">›</span></button>`:''}

  <ul class="clist">${active.map(({c,st,al})=>{
    const unread=c.messages.filter(m=>m.from==='client'&&m.synced!==false&&m.ts>c.coachRead).length;
    return `<li><button class="ccard ${st.missed?'miss':''}" data-act="open-client" data-id="${c.id}">
    <div class="ccard-top">${avatarOf(c)}<span class="cname">${esc(c.name)}<small>${esc(c.goal||'')}</small></span>${unread?`<span class="pill acc">${unread} new</span>`:''}</div>
    <dl class="cstats"><div><dt>Last workout</dt><dd>${st.last?rel(st.last):'None yet'}</dd></div><div><dt>This week</dt><dd class="mono">${st.week}<span class="of">/${st.planned}</span></dd></div><div><dt>Body weight</dt><dd><span class="mono">${st.wt?kg(st.wt):'–'}</span>${st.trend?` <span class="trend ${st.trendCls}">${st.trend}</span>`:''}</dd>${spark(st.wts)}</div></dl>
    ${(()=>{const chips=al.filter(x=>!x.includes('since last workout')&&!x.includes('No workouts in'));return chips.length||(st.ready!=null&&st.ready>=55)?`<div class="chips-row">${st.ready!=null&&st.ready>=55?readyPill(st.ready):''}${chips.join('')}</div>`:''})()}
  </button></li>`}).join('')||'<li class="hint">No active clients yet. Invite your first one below.</li>'}</ul>
  <button class="invlink" data-act="nav" data-v="invites"><span>${invited.length?`${invited.length} invite${invited.length>1?'s':''} pending`:'Invite a new client'}</span><span class="chev" aria-hidden="true">›</span></button>
  ${past.length?`<section class="past"><button class="linkbtn" data-act="toggle-past" aria-expanded="${ui.showPast}">${ui.showPast?'Hide':'Show'} past clients (${past.length})</button>
  ${ui.showPast?`<ul class="pastlist">${past.map(c=>`<li>${avatarOf(c,'dim')}<span class="cname">${esc(c.name)}<small>Archived ${fmtDate(c.archivedAt)} · ${c.logs.length} workouts logged</small></span>
    ${ui.confirm&&ui.confirm.id===c.id&&ui.confirm.kind==='delete'?`<span class="confirm-inline"><span class="bad-t">Delete forever?</span><button class="btn danger sm" data-act="delete-client" data-id="${c.id}">Delete</button><button class="btn ghost sm" data-act="cancel-confirm">Keep</button></span>`
    :`<span class="btnrow"><button class="btn sm" data-act="restore-client" data-id="${c.id}">Restore</button><button class="icon-btn" data-act="ask-delete" data-id="${c.id}">Delete</button></span>`}</li>`).join('')}</ul>`:''}</section>`:''}`;
}
// one client's page: their name, tags, and the tabs (Workouts, Check-ins, Chat, plus a link to their Report)
function coachClient(co){
  const c=client(ui.clientId);
  if(!c||c.coachId!==co.id||c.archived){ui.view='clients';return clientsView(co)}
  const st=stats(c);
  if(ui.tab==='chat'){c.coachRead=Date.now();save()}
  if(ui.tab==='workouts'&&(newNotes(c).length||newSwaps(c).length)){ui.seenBefore={id:c.id,t:c.notesSeen||0};c.notesSeen=Date.now();save()}
  const unread=c.messages.filter(m=>m.from==='client'&&m.synced!==false&&m.ts>c.coachRead).length;
  const tabs=isInvited(c)?[['workouts','Workouts']]:[['workouts','Workouts'],['progress','Check-ins'+(toAnswer(c)?` (${toAnswer(c)})`:'')],['chat','Chat'+(unread?` (${unread})`:'')]];
  if(!tabs.some(t=>t[0]===ui.tab))ui.tab='workouts';
  let body='';
  if(ui.tab==='workouts')body=coachWorkouts(c);
  else if(ui.tab==='report')body=reportView(c);
  // lifts, body weight, measurements and photos all live in the client's Report now, so nothing is shown twice
  else if(ui.tab==='progress')body=coachCheckins(c);
  else body=chatView(c,'coach');
  return `<div class="exbar">${backBtn('clients','Clients')}<button class="iconbtn" data-act="client-set" data-id="${c.id}" aria-label="${esc(first(c.name))}'s settings" title="Client settings">${GEAR}</button></div>
  ${isInvited(c)?`<div class="note-banner"><p>${esc(first(c.name))} hasn't joined yet. Build their routine now, and it'll be ready when they do.</p></div>`:''}
  <div class="chead">${avatarOf(c,'big')}<h1>${esc(c.name)}</h1><p class="sub">${esc(c.goal||'No goal set')}</p></div>
  <div class="chips-row">${readyPill(st.ready)}${alertsFor(c,st,overloadSummary(c)).join('')}</div>
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${k===ui.tab}" class="${k===ui.tab?'on':''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}${isInvited(c)?'':`<button role="tab" aria-selected="false" data-act="open-report" data-id="${c.id}">Report ›</button>`}</div>
  ${body}`;
}
// the Workouts tab: the current routine, the "change one day" dates, and recent workouts
// small icons for the routine buttons: a plus for "new", a pen for "edit"
const PLUS_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const PEN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
function coachWorkouts(c){
  const d=ui.drafts[c.id];if(d)return planEditor(c,d);
  if(ui.dayDraft&&ui.dayDraft.cid===c.id)return dayEditView(c);
  let out='';
  if(ui.chooser===c.id)out+=planChooser(c);
  else if(!c.plan)out+=`<div class="card hud empty"><h2>No routine yet</h2><p class="muted">${isSolo(c)?'Build your week day by day.':`Build ${esc(first(c.name))}'s routine day by day, start from a template, or copy another client's routine.`}</p><button class="btn primary" data-act="new-plan">New routine</button></div>`;
  if(c.plan&&ui.chooser!==c.id){
    const inf=dayAt(c,today());
    const T=today(),wkNow=progWeek(c,T),from=c.plan.activeFrom||mondayOf(c.plan.startDate),future=from>T;
    if(inf.plan!==c.plan)inf.idx=-1;
    if(future){const cur=planAt(c,T),wn=weekName(c,from);out+=`<div class="note-banner"><p>${cur?`This week ${isSolo(c)?"you're":`${esc(first(c.name))} is`} still on <b>${esc(cur.name)}</b>. `:''}The routine below starts on <b>${fmtDate(from)}</b>${wn?` (${wn})`:''}.</p></div>`}
    out+=`<div class="routine-hd"><div><p class="eyebrow">${future?`Starts ${fmtDate(from)}`:wkNow>=1?`Routine · Week ${wkNow}`:'Routine'}</p><h2>${esc(c.plan.name)}</h2></div><div class="routine-btns"><button class="iconbtn" data-act="new-plan" aria-label="New routine" title="New routine">${PLUS_ICON}</button><button class="iconbtn primary" data-act="edit-plan" aria-label="Edit routine" title="Edit routine">${PEN_ICON}</button></div></div>
    ${dateStrip(c)}
    <ol class="plan-days">${c.plan.days.map((day,i)=>`<li class="${inf.idx===i?'today':''}"><span class="dn mono">${WK[i].toUpperCase()}</span><span class="dd"><b>${esc(dayTitle(day))}${inf.idx===i?' <span class="pill acc">Today</span>':''}</b>${day.rest?'':day.exercises.map(r=>`<span class="pl-ex">${thumb(exById(r.exId))}<span class="pl-txt"><b>${esc(exById(r.exId).name)}</b><small>${repsText(r.sets,r.reps,unitOf(r.exId))}${weightText(r,today(),c.plan)?` · ${weightText(r,today(),c.plan)}`:""}${progTag(r)?` <i class="auto">${progTag(r)}</i>`:""}</small></span></span>`).join('')||'<small>No exercises yet</small>'}</span></li>`).join('')}</ol>`;
  }
  const hist=(c.planHistory||[]).map((h,i)=>({...h,i})).reverse();
  if(c.plan&&ui.chooser!==c.id&&hist.length)out+=`<section class="rsec"><h2>Past routines</h2><p class="hint">Earlier routines, kept exactly as they were. Tap one to see what ${isSolo(c)?'you':esc(first(c.name))} did each day of the week.</p>
  <div class="logs">${hist.map(h=>{const n=visLogs(c).filter(l=>l.date>=h.from&&l.date<=h.until).length;let planned=0;for(let d=h.from;d<=h.until&&d<=today();d=addDays(d,1)){const inf=dayAt(c,d);if(inf.day&&!inf.day.rest)planned++}
    return `<details class="log pastr"><summary><span class="pr-when"><span class="pill acc">${weekSpan(c,h.from,h.until)}</span><span class="hint">${fmtShort(h.from)} – ${fmtShort(h.until)} · did ${n} of ${planned} planned workouts</span></span><span class="pr-name"><b>${esc(h.plan.name)}</b><small>${h.plan.days.map((d,i)=>d.rest?'':`${WK[i]} ${esc(dayTitle(d))}`).filter(Boolean).join(' · ')}</small></span></summary>
    <div class="weektable">${h.plan.days.map((d,i)=>`<div class="wkrow ${d.rest?'rest':''}"><span class="wk mono">${WK[i].toUpperCase()}</span><span class="wt"><b>${esc(dayTitle(d))}</b>${d.rest?'':`<small>${d.exercises.map(r=>esc(exById(r.exId).name)).join(' · ')}</small>`}</span></div>`).join('')}</div>
    <button class="btn sm" style="align-self:flex-start;margin:4px 18px 18px" data-act="plan-from-history" data-i="${h.i}">Copy into a new routine</button></details>`}).join('')}</div></section>`;
  return out+(isSolo(c)?'':recentWorkouts(c)); // on your own, the Calendar tab already shows past workouts
}
function planChooser(c){
  // on your own: templates come from your Coach mode (if you use it), and there are no other clients to copy from
  const solo=isSolo(c),others=solo?[]:S.clients.filter(x=>x.coachId===c.coachId&&x.id!==c.id&&x.plan);
  const tpls=S.templates.filter(t=>t.coachId===(solo?c.asCoachId:c.coachId)&&t.coachId);
  const tplBlock=`<div><h3>From a template</h3><div class="choice-list">${tpls.length?tpls.map(t=>`<button class="choice" data-act="plan-template" data-id="${t.id}"><span><b>${esc(t.name)}</b><br><small>${t.days.length} days · ${t.days.reduce((n,d)=>n+d.exercises.length,0)} exercises</small></span><span>›</span></button>`).join(''):'<p class="hint">No templates yet. Save any plan as a template to reuse it.</p>'}</div></div>`;
  const copyBlock=`<div><h3>Copy another client's routine</h3><div class="choice-list">${others.length?others.map(o=>`<button class="choice" data-act="plan-copy" data-id="${o.id}"><span><b>${esc(o.name)}</b><br><small>${esc(o.plan.name)} · ${o.plan.days.length} days</small></span><span>›</span></button>`).join(''):'<p class="hint">None of your other clients have a plan yet.</p>'}</div></div>`;
  return `<div class="card hud chooser"><div class="section-hd"><h2>New routine</h2><button class="icon-btn" data-act="close-chooser" aria-label="Close">✕</button></div>
  <button class="choice" data-act="plan-blank"><span><b>Start from scratch</b><br><small>Add days and exercises yourself</small></span><span>›</span></button>
  ${solo&&!tpls.length?'':tplBlock}
  ${solo?'':copyBlock}</div>`;
}
function recentWorkouts(c){
  const all=visLogs(c).slice().sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,6),logs=ui.recentAll?all:all.slice(0,3),more=all.length-3;
  if(!all.length)return'';
  return `<div class="section-hd"><h2>Recent workouts</h2><button class="linkbtn" data-act="open-report" data-id="${c.id}" data-tab="history">Open calendar ›</button></div><div class="logs">${logs.map((l,i)=>{const fresh=Date.now()-l.finishedAt<36e5;return `<details class="log" ${i===0&&fresh?'open':''}><summary><span><b>${esc(l.dayName)}</b><br><span class="hint">${fmtDate(l.date)} · ${fmtClock(l.finishedAt)}${l.durationMin?` · ${l.durationMin} min`:''}${l.rpe?` · effort ${l.rpe}/10`:''}</span>${hasNotes(l)?`<br><span class="notetag">${ui.seenBefore&&ui.seenBefore.id===c.id&&l.finishedAt>ui.seenBefore.t?'NEW · ':''}Note from ${esc(first(c.name))}</span>`:''}</span><span class="hint right">${fresh?'<span class="new-badge">JUST NOW</span><br>':''}${l.prs&&l.prs.length?`<span class="pill ok">${l.prs.length} PR</span>`:`${l.entries.reduce((n,e)=>n+e.sets.length,0)} sets`}</span></summary>
  <div class="lbody">${l.entries.map(e=>`<div><span class="exn">${thumb(exById(e.exId))}<span>${esc(exById(e.exId).name)}${swappedLabel(e)}</span>${l.prs&&l.prs.includes(e.exId)?' <i class="auto">PR</i>':''}</span><span class="mono">${setsText(e.sets,unitOf(e.exId))}</span></div>`).join('')}${logNotes(l)}</div></details>`}).join('')}</div>${more>0?`<button class="morebtn" data-act="recent-all" aria-expanded="${!!ui.recentAll}">${ui.recentAll?'Show fewer ▴':`Show ${more} more ▾`}</button>`:''}`;
}
const cycleHint=d=>{const t=d.days.filter(x=>!x.rest).length;return `${t} training day${t===1?'':'s'} a week, Monday to Sunday. Starts the week of ${d.startDate?fmtDate(mondayOf(d.startDate)):'the start date'}.`};
// the routine editor: name, start week, and one card per day of the week
function planEditor(c,d){
  return `<section class="editor">
  <div class="ed-hd"><p class="eyebrow">${!c.plan?'First routine':weekName(c,today())?`Now in ${weekName(c,today())}`:'Not started yet'}</p><h2>${d.isNew?'New routine':'Edit routine'}</h2></div>
  <div class="card hud"><div class="row2"><label>Routine name<input id="pf-name" data-pf="name" value="${esc(d.name)}"></label>${c.plan&&(!(c.plan.activeFrom>today())||(c.planHistory||[]).length)?`<label>Starts<input id="pf-from" type="date" data-savefrom min="${today()}" value="${ui.saveFrom&&ui.saveFrom>=today()?ui.saveFrom:today()}"></label>`:`<label>Start date<input id="pf-start" type="date" data-pf="startDate" value="${d.startDate}"></label>`}</div>${c.plan&&(!(c.plan.activeFrom>today())||(c.planHistory||[]).length)?'':`<p class="hint" id="cycle-hint">${cycleHint(d)}</p>`}</div>
  
  ${d.days.map((day,i)=>dayEditor(c,day,i)).join('')}
  <div class="savebar"><button class="btn ghost" data-act="discard">Discard</button>${isSolo(c)?'':'<button class="btn" data-act="save-template">Save as template</button>'}<button class="btn primary" data-act="save-plan">Save routine</button></div></section>`;
}
function openDayId(){const d=curDraft();if(!d)return null;if(ui.openDay===''||d.days.some(x=>x.id===ui.openDay))return ui.openDay;const t=d.days.find(x=>!x.rest)||d.days[0];return t&&t.id}
// one day inside the editor: its exercises with sets, reps, weight and rest
function dayEditor(c,day,i,one){
  const tools=`<div class="day-tools"><button class="${day.rest?'btn sm':'icon-btn'}" data-act="toggle-rest" data-day="${day.id}">${day.rest?'Make it a training day':'Make it a rest day'}</button>${day.rest||one?'':`<span class="copyto-inline"><span class="hint">Copy to</span>${WK.map((w,j)=>j===i?'':`<button class="chip" data-act="copy-day-to" data-day="${day.id}" data-to="${j}">${w}</button>`).join('')}</span>`}</div>`;
  const hd=`<div class="day-hd"><span class="daynum mono">${WK[i].toUpperCase()}</span><span class="dh-name">${day.rest?'<small>Rest day</small>':`<input class="dayname" id="dn-${day.id}" data-df="name" data-day="${day.id}" value="${esc(day.name)}" placeholder="Name this day, e.g. Upper body" aria-label="What is trained on ${WKL[i]}">`}</span>${one?'':`<button class="icon-btn chev-btn" data-act="open-day" data-day="" aria-expanded="true" aria-label="Collapse ${WKL[i]}">▴</button>`}</div>`;
  if(!one&&openDayId()!==day.id){
    const sum=day.rest?'Rest day':day.exercises.length?`${day.exercises.length} exercise${day.exercises.length>1?'s':''} · ${day.exercises.slice(0,3).map(r=>esc(exById(r.exId).name)).join(', ')}${day.exercises.length>3?'…':''}`:'No exercises yet';
    return `<section class="day collapsed ${day.rest?'rest':''}"><button class="dayhead" data-act="open-day" data-day="${day.id}" aria-expanded="false"><span class="daynum mono">${WK[i].toUpperCase()}</span><span class="dh-name"><b>${WKL[i]}${!day.rest&&day.name?` · ${esc(day.name)}`:''}</b><small>${sum}</small></span><span class="chev" aria-hidden="true">▾</span></button></section>`;
  }
  if(day.rest)return `<section class="day rest open">${hd}${tools}</section>`;
  return `<section class="day open">${hd}<ol class="exlist">${day.exercises.map(r=>{const ex=exById(r.exId),h=exHistory(c,r.exId),last=h[h.length-1],a=`data-day="${day.id}" data-row="${r.id}"`;return `<li class="exrow" ${a}>
    <div class="ex-hd"><span class="grip" title="Drag to reorder">⠿</span><button class="thumbbtn" data-act="preview-ex" data-id="${ex.id}" aria-label="Watch ${esc(ex.name)}">${thumb(ex)}</button><span class="exname"><button class="exlink" data-act="preview-ex" data-id="${ex.id}" title="Watch the animation or add your own video">${esc(ex.name)}</button><small>${last?`Last ${setsText(last.sets,unitOf(ex.id))}`:esc(ex.group)}${last?` ${statusPill(overload(h))}`:''}</small></span><span class="rowbtns"><button class="icon-btn" data-act="row-up" ${a} aria-label="Move up">↑</button><button class="icon-btn" data-act="row-down" ${a} aria-label="Move down">↓</button><button class="icon-btn" data-act="row-del" ${a} aria-label="Remove ${esc(ex.name)}">✕</button></span></div>
    <div class="ex-fields"><label>Sets<input id="rs-${r.id}" type="number" min="1" inputmode="numeric" data-rf="sets" ${a} value="${r.sets}"></label><label>${UNIT_LABEL[unitOf(r.exId)]}<input id="rr-${r.id}" data-rf="reps" ${a} value="${esc(r.reps)}"></label><label>Kg<input id="rw-${r.id}" inputmode="decimal" data-rf="weight" ${a} value="${kg(r.weight)}" placeholder="–" aria-label="${progOf(r).type==="weekly"&&!one?"This week's weight in kg":progOf(r).type==="sets"?"First set weight in kg":"Weight in kg"}"></label><label>Rest s<input id="rt-${r.id}" type="number" min="0" step="15" inputmode="numeric" data-rf="rest" ${a} value="${r.rest}"></label></div>
    ${progEditor(c,r,a)}
    ${r.note||ui.noteOpen===r.id?`<input class="note" id="rn-${r.id}" data-rf="note" ${a} value="${esc(r.note)}" placeholder="${isSolo(c)?'Note to self':'Note for the client'}">`:''}
  </li>`}).join('')}</ol>
  <div class="adder"><div class="adder-row"><input type="search" id="s-${day.id}" data-search="${day.id}" placeholder="Search exercises or type a new one" autocomplete="off" aria-label="Add exercise to ${esc(day.name)}"><button class="addbtn" data-act="add-typed" data-day="${day.id}" aria-label="Add exercise" title="Add exercise">+</button></div><div class="results" id="r-${day.id}"></div></div>${tools}</section>`;
}
// the "how should the weight change?" choice under each exercise
function progEditor(c,r,a){
  const p=progOf(r),plan=curDraft()||c.plan,bw=!hasW(r.weight);
  const num=(f,v,label,w='')=>`<input class="mini mono ${w}" id="pg${f}-${r.id}" inputmode="decimal" data-pg="${f}" ${a} value="${esc(v)}" aria-label="${label}">`;
  let line='';
  if(p.type==='weekly')line=`Add ${num('step',kg(p.step),'Kilograms to add')} kg every ${num('every',p.every||1,'Weeks between increases')} week${(p.every||1)>1?'s':''}`;
  else if(p.type==='earned')line=`When every set reaches ${topReps(r.reps)??'the top'} reps, add ${num('step',kg(p.step),'Kilograms to add')} kg for the next workout`;
  else if(p.type==='sets')line=`Each set is ${num('step',kg(p.step),'Kilograms per set')} kg heavier than the last <span class="hint">(use − to go lighter, for drop sets)</span>`;
  const noteBtn=r.note||ui.noteOpen===r.id?'':`<button class="linkbtn" data-act="note-open" ${a}>+ Note</button>`;
  return `<div class="progbox"><div class="progtop"><label class="progsel"><span>Weight</span><select id="pt-${r.id}" data-pgtype ${a} ${bw?'disabled title="Set a weight first"':''} aria-label="How should the weight change?">${PROG_TYPES.map(([k,l])=>`<option value="${k}" ${p.type===k?'selected':''}>${l}</option>`).join('')}</select></label>${noteBtn}</div>
    ${line&&!bw?`<div class="progrow">${line}</div>`:''}
    <p class="progline" id="pp-${r.id}" ${p.type!=='none'&&progSentence(r,plan)?'':'hidden'}>${p.type!=='none'?progSentence(r,plan):''}</p></div>`;
}
// results for the "search exercises or type a new one" box in the editor
function exerciseSearchResults(dayId,q){
  q=q.trim();if(!q)return'';const ql=q.toLowerCase();
  const m=S.exercises.filter(e=>e.name.toLowerCase().includes(ql)||e.group.toLowerCase()===ql).sort((a,b)=>a.name.toLowerCase().indexOf(ql)-b.name.toLowerCase().indexOf(ql)).slice(0,6);
  const exact=S.exercises.some(e=>e.name.toLowerCase()===ql);
  return m.map(e=>`<button data-act="add-ex" data-day="${dayId}" data-ex="${e.id}"><span class="exn">${thumb(e)}<span>${esc(e.name)}</span></span><small>${esc(e.group)}</small></button>`).join('')+(exact?'':`<button class="new" data-act="add-new-ex" data-day="${dayId}" data-name="${esc(q)}">+ Add “${esc(q)}” as a new exercise</button>`);
}
// the Lifts tab: is each exercise going up, staying the same or going down
function overloadView(c,role){
  const o=overloadSummary(c);
  if(!o.items.length)return `<p class="hint">No lifts to track yet. Add a routine first.</p>`;
  if(ui.olEx&&o.items.some(x=>x.id===ui.olEx))return overloadDetail(c,ui.olEx);
  const progs=c.progressions.filter(p=>role==='client'||p.synced!==false).slice(-5).reverse();
  const row=r=>{const ex=exById(r.id),last=r.h[r.h.length-1],ss=sinceStart(r.h),pr=planRow(c,r.id);return `<li><button class="olrow" data-act="ol-ex" data-id="${r.id}">${thumb(ex)}<span class="olname"><span class="oltop"><b>${esc(ex.name)}</b>${statusPill(r.st)}</span><small>${last?`Last time: ${setsText(last.sets,unitOf(r.id))}`:'Not done yet'}</small>${ss?`<small class="up-t">Since start: ${ss.replace(/ since .*$/,'')}</small>`:''}${pr&&hasW(pr.weight)?`<small>Next workout: ${weightText(pr,today(),c.plan)}</small>`:''}</span></button></li>`};
  const order={pr:0,up:1,same:2,down:3,new:4};
  return `<div class="hudrow"><div class="tile hud"><small>Personal bests</small><b class="mono">${o.pr}</b></div><div class="tile hud"><small>Going up</small><b class="mono">${o.up}</b></div><div class="tile hud"><small>Same or lower</small><b class="mono">${o.same+o.down}</b></div></div>
  
  ${progs.length?`<div class="card hud feed"><span class="eyebrow">Weight increases</span>${progs.map(p=>`<div class="feeditem"><span>${esc(exById(p.exId).name)}</span><span class="mono">${kg(p.from)} → <b>${kg(p.to)} kg</b></span><small>${rel(p.date)}</small></div>`).join('')}</div>`:''}
  <ul class="olist">${o.items.sort((a,b)=>order[a.st.key]-order[b.st.key]).map(row).join('')}</ul>`;
}
function planRow(c,exId){if(c.plan)for(const d of c.plan.days)for(const r of d.exercises)if(r.exId===exId)return r;return null}
function overloadDetail(c,exId){
  const ex=exById(exId),h=exHistory(c,exId,ui.user.role==='client'),pr=planRow(c,exId),st=overload(h),weighted=h.some(x=>x.top!=null),ss=sinceStart(h);
  let best=-1;const pts=h.map(x=>{const v=weighted?(x.top??0):x.reps,isPr=v>best;if(isPr)best=v;return{date:x.date,v,pr:isPr&&h.length>1}});
  return `${backBtn('','All lifts','ol-back')}
  <div class="section-hd"><div><h2>${esc(ex.name)}</h2><p class="hint">${pr?targetsLine(pr,c):""}</p></div>${statusPill(st)}</div>
  ${pr&&hasW(pr.weight)?`<p class="progline">${progSentence(pr,c.plan,ui.user.role)}</p>`:''}
  ${ss?`<p class="bigstat"><b class="mono">${ss.split(' since ')[0]}</b><span>since ${ss.split(' since ')[1]}</span></p>`:''}
  <div class="olgraph">${anim(ex,'olanim')}</div>
  <p class="eyebrow">${weighted?'Heaviest set each session (kg)':`Total ${unitOf(exId)} each session`} · filled dots are personal bests</p>
  ${lineChart(pts,{unit:weighted?'kg':unitOf(exId),label:ex.name+' progress'})}
  <div class="logs"><div class="log"><div class="lbody" style="padding-top:10px">${h.slice().reverse().map(x=>`<div><span>${fmtDate(x.date)}</span><span class="mono">${setsText(x.sets,unitOf(exId))}</span></div>`).join('')}</div></div></div>`;
}
/* One date only: a slim row of dates above the routine; tapping one edits just that day (saved in c.dayEdits) */
function dateStrip(c){
  const T=today(),m0=mondayOf(T),mon=ui.stripMon&&ui.stripMon>=m0?ui.stripMon:m0,max=addDays(m0,7*8),edits=c.dayEdits||{};
  const chips=Array.from({length:7},(_,i)=>{const d=addDays(mon,i),inf=dayAt(c,d),ok=d>=T&&!!inf.day,kind=edits[d]?'changed':inf.day?(inf.day.rest?'rest':'train'):'';
    return `<button class="wchip ${d===T?'today':''} ${edits[d]?'edited':''}" ${ok?`data-act="day-edit" data-v="${d}"`:'disabled'} aria-label="${fmtDate(d)}${inf.day?`: ${esc(dayTitle(inf.day))}`:''}${edits[d]?', changed for this day':''}"><span>${WK[i]}</span><b class="mono">${+d.slice(8)}</b><i class="ds-dot ${kind}" aria-hidden="true"></i></button>`}).join('');
  return `<div class="datestrip"><div class="ds-hd"><span class="ds-title"><span class="eyebrow">Change one day</span></span><span class="ds-nav"><button class="icon-btn" data-act="strip-week" data-v="-1" ${mon<=m0?'disabled':''} aria-label="Earlier week">‹</button><span class="mono">${weekRange(mon)}</span><button class="icon-btn" data-act="strip-week" data-v="1" ${mon>=max?'disabled':''} aria-label="Later week">›</button></span></div><div class="weekchips">${chips}</div></div>`;
}
// "Every Saturday" only makes sense for a weekly routine that is the one running on that date
const canApplyAll=(c,d)=>!!(c.plan&&c.plan.days.length===7&&planAt(c,d)===c.plan);
function dayEditView(c){
  const dd=ui.dayDraft,d=dd.date,i=weekIdx(d),had=!!(c.dayEdits||{})[d],base=dayAt(c,d,true).day,wn=weekName(c,d),can=canApplyAll(c,d),all=can&&dd.all,W=WKL[i];
  const hint=all?`Every ${W} from ${fmtDate(d)} on. Earlier ${W}s stay as they were.`:`Only this date changes. Other ${W}s stay ${base?esc(dayTitle(base)):'as they are'}.`;
  const scope=can?`<div class="whenbox scopebox"><span class="whenlabel">Apply to</span><div class="whenseg" role="group" aria-label="Which days this change applies to">${[['one','Only this day'],['all',`Every ${W}`]].map(([v,l])=>`<button class="${(all?'all':'one')===v?'on':''}" data-act="day-scope" data-v="${v}" aria-pressed="${(all?'all':'one')===v}">${l}</button>`).join('')}</div></div>`:'';
  return `<section class="editor"><button class="back" data-act="day-edit-cancel">‹ Routine</button>
  <div class="ed-hd"><p class="eyebrow">${wn||'One day only'}</p><h2>${fmtDate(d)}</h2><p class="hint">${hint}</p></div>
  ${dayEditor(c,dd.day,i,true)}
  ${scope}
  <div class="savebar"><button class="btn ghost" data-act="day-edit-cancel">Cancel</button>${had&&!all?'<button class="btn" data-act="day-edit-reset">Undo change</button>':''}<button class="btn primary" data-act="day-edit-save">${all?`Save every ${W}`:'Save this day'}</button></div></section>`;
}
