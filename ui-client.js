/* ui-client.js: everything the client sees.
   clientApp() picks the page (Today, Meals, Progress, Chat...), then the functions below draw it. */
function clientApp(){
  const c=client(ui.user.id),co=coach(c.coachId);
  if(c.archived)return `<main class="screen"><div class="card hud empty"><p class="eyebrow">Program complete</p><h1>Nice work, ${esc(first(myName(c)))}</h1><p class="muted">${esc(co.name)} has closed your program. Your workouts and progress are saved, and they can reopen your account anytime.</p><p class="hint">${c.logs.length} workouts logged · best streak kept on file.</p></div></main>`;
  if(isInvited(c))return joinView(c);
  const v=['today','exercise','meals','progress','chat','settings'].includes(ui.view)?ui.view:'today';
  let body;
  if(v==='exercise')body=exerciseView(c);
  else if(v==='meals')body=clientMeals(c);
  else if(v==='progress')body=clientProgress(c);
  else if(v==='settings')body=settingsView();
  else if(v==='chat'){c.clientRead=Date.now();save();body=`<header class="hd"><p class="eyebrow">Your coach</p><h1>${esc(co.name)}</h1></header>${chatView(c,'client')}`}
  else body=todayView(c);
  const pend=pendingCount(c);
  const off=!S.online?`<div class="offline"><span class="blink">●</span><span><b>Offline.</b> ${pend?`${pend} change${pend>1?'s':''} saved on this phone. They sync when you reconnect.`:'Everything you log is saved on this phone and syncs later.'}</span></div>`:'';
  const hello=v==='today'?`<div class="hello"><span>Hi, <b>${esc(first(myName(c)))}</b></span></div>`:'';
  return appBar(co)+`<main class="screen">${hello}${off}${body}</main>`+tabbar([['today','Today'],['meals','Meals'],['progress','Progress'],['chat','Chat',v==='chat'?0:c.messages.filter(m=>m.from==='coach'&&m.ts>(c.clientRead||0)).length]],v==='exercise'?'today':v);
}
// the Today page: today's workout, the week strip, streaks and the energy check
function todayView(c){
  const T=today(),inf=dayAt(c,T),co=coach(c.coachId);
  let out='';
  const st=stats(c),adh=adherence(c),stk=streak(c);
  out+=`<header class="hd"><p class="eyebrow">${weekName(c,T)?`${weekName(c,T)} · `:''}${fmtLong(T)}</p><h1>${inf.day?esc(dayTitle(inf.day)):inf.notStarted?'Plan starts soon':'Today'}</h1>${inf.edited?`<p class="sub">${esc(first(co.name))} changed today's workout, just for today.</p>`:''}</header>
  <div class="hudrow">${ring(adh??0,adh==null?'–':adh+'%','on plan')}<div class="tile hud"><small>Streak</small><b class="mono">${stk}</b><i>workouts in a row</i></div><div class="tile hud"><small>This week</small><b class="mono">${st.week}<i>/${st.planned}</i></b><i>workouts</i></div></div>`;
  if(c.plan){
    const mon=mondayOf(T);
    out+=`<div class="week" aria-label="This week">${Array.from({length:7},(_,i)=>{const d=addDays(mon,i),di=dayAt(c,d),done=c.logs.some(l=>l.date===d),train=di.day&&!di.day.rest;const cls=[d===T?'today':'',done?'done':train&&d<T?'missed':train?'train':''].join(' ');return `<div class="wd ${cls}" title="${di.day?esc(dayTitle(di.day)):''}">${WK[i].slice(0,1)}<b class="mono">${new Date(d+'T12:00').getDate()}</b><i></i></div>`}).join('')}</div>`;
  }
  out+=checkinNudge(c);
  if(inf.none)return out+`<div class="card hud empty"><h2>No plan yet</h2><p class="muted">${esc(co.name)} is putting your plan together. You'll get a notification when it's ready.</p></div>`;
  if(inf.notStarted)return out+`<div class="card hud empty"><h2>Your plan starts ${fmtDate(inf.start)}</h2><p class="muted">${esc(c.plan.name)}. Rest up until then.</p></div>`;
  if(inf.day.rest){
    let next=null;for(let i=1;i<=c.plan.days.length;i++){const di=dayAt(c,addDays(T,i));if(di.day&&!di.day.rest){next={...di,date:addDays(T,i)};break}}
    return out+`<div class="card hud"><h2>Rest day</h2><p class="muted">Recovery is part of the plan. Eat well, sleep, and go for a walk if you feel like it.</p>${next?`<p class="hint">Next: <b>${esc(dayTitle(next.day))}</b>, ${next.date===addDays(T,1)?'tomorrow':fmtDate(next.date)}</p>`:''}</div>`;
  }
  const doneLog=c.logs.find(l=>l.date===T);
  if(doneLog)return out+`<div class="card hud done-card"><p class="eyebrow">Complete</p><h2>Workout done</h2><p>Finished at ${fmtClock(doneLog.finishedAt)} · ${doneLog.durationMin} min · effort ${doneLog.rpe}/10. ${doneLog.synced===false?`Saved on this phone. ${esc(first(co.name))} sees it when you're back online.`:`${esc(first(co.name))} can see it now.`}</p>${doneLog.prs&&doneLog.prs.length?`<p><span class="pill ok">${doneLog.prs.length} new personal best${doneLog.prs.length>1?'s':''}</span></p>`:''}</div>
    <div class="logs"><div class="log"><div class="lbody" style="padding-top:10px">${doneLog.entries.map(e=>`<div><span>${esc(exById(e.exId).name)}</span><span class="mono">${setsText(e.sets)}</span></div>`).join('')}</div></div></div>`;
  // the daily "how do you feel?" check: sleep, energy and soreness, each from 1 to 5
  const rd=c.readiness[T];
  if(!rd&&!pref(c,'energyAsk')){}
  else if(!rd){const r=ui.ready||{};const q=(k,lab,lo,hi)=>`<div class="rq"><span>${lab}</span><div class="seg5">${[1,2,3,4,5].map(n=>`<button class="${r[k]===n?'on':''}" data-act="ready-set" data-k="${k}" data-v="${n}" aria-label="${lab}: ${n} of 5">${n}</button>`).join('')}</div><small><span>1 = ${lo}</span><span>5 = ${hi}</span></small></div>`;
    out+=`<div class="card hud"><div><h3>How do you feel today?</h3><p class="hint">Your coach sees this.</p></div>${q('sleep','How did you sleep?','badly','great')}${q('energy','Energy level','drained','full of energy')}${q('sore','Muscle soreness','not sore','very sore')}<button class="btn primary" data-act="ready-save" ${r.sleep&&r.energy&&r.sore?'':'disabled'}>Done</button></div>`}
  else{const sc=readyScore(rd),cls=readyCls(sc);
    const head=sc>=75?"You're ready to train":sc>=55?"You're a little tired today":"You're worn out today";
    const tip=sc>=75?'Go for the full weights your coach set today.':sc>=55?"Take longer breaks between sets today so you can finish every rep."+(pref(c,'extraRest')?' Your rest timer adds an extra 30 seconds.':''):'Take longer breaks today and finish every rep.'+(pref(c,'extraRest')?' Your rest timer adds an extra minute to each break.':'')+' If you feel like this often, message your coach.';
    out+=`<div class="energy ${cls}"><div class="en-score"><b class="mono">${sc}</b><small>/100</small></div><div class="en-text"><p class="eyebrow">Today's energy check</p><h3>${head}</h3><p>${tip}</p><p class="hint">From your answers: sleep ${rd.sleep}/5 · energy ${rd.energy}/5 · soreness ${rd.sore}/5. Good sleep and energy raise the score, soreness lowers it.</p></div></div>`}
  const rows=inf.day.exercises;let anyDone=false;
  const started=c.session&&c.session.date===T&&c.session.startedAt;
  out+=`<div class="section-hd"><h2>${rows.length} exercises</h2>${started?`<span class="pill acc mono" id="elapsed">${elapsed(c.session.startedAt)}</span>`:''}</div>
  <div class="exitems">${rows.map(r0=>{const r=effRow(c,r0),ex=exById(r.exId),sets=getSets(c,r,false),n=sets?sets.filter(s=>s.done).length:0;if(n)anyDone=true;return `<button class="exitem ${n>=r.sets?'complete':''}" data-act="open-ex" data-row="${r.id}">${anim(ex)}<span class="exi"><b>${esc(ex.name)}</b>${r.swappedFrom?`<small class="swaptag">Swapped from ${esc(exById(r.swappedFrom).name)}</small>`:''}<small>${targetsLine(r,c)}</small></span><span class="prog mono">${n}/${r.sets}</span></button>`}).join('')}</div>
  <button class="btn primary big" data-act="finish-open" ${anyDone?'':'disabled'}>Finish workout</button>
  `;
  return out;
}
const elapsed=t=>{const s=Math.floor((Date.now()-t)/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
function prevSets(c,exId){const l=c.logs.filter(l=>l.entries.some(e=>e.exId===exId)).sort((a,b)=>b.finishedAt-a.finishedAt)[0];return l?l.entries.find(e=>e.exId===exId).sets:null}
function getSets(c,r,create=true){
  const T=today(),inf=dayAt(c,T);
  if(!c.session||c.session.date!==T||c.session.dayId!==inf.day.id){if(!create)return null;c.session={date:T,dayId:inf.day.id,sets:{},startedAt:null}}
  let s=c.session.sets[r.id];if(!s&&!create)return null;
  const prev=prevSets(c,r.exId)||[],reps=topReps(r.reps);
  const mk=i=>{const p=prev[i]||prev[prev.length-1];return{w:hasW(r.weight)?kg(setWeight(r,i,T,c.plan)):p?kg(p.w):"",r:p&&(!hasW(r.weight)||+p.w===+setWeight(r,i,T,c.plan))?p.r:(reps??''),done:false}};
  if(!s)s=c.session.sets[r.id]=Array.from({length:r.sets},(_,i)=>mk(i));
  while(s.length<r.sets)s.push(mk(s.length));if(s.length>r.sets)s.length=r.sets;
  return s;
}
// one exercise during a workout: the demo, then a row per set to tick off
function exerciseView(c){
  const inf=dayAt(c,today());if(!inf.day||inf.day.rest){ui.view='today';return todayView(c)}
  const rows=inf.day.exercises,idx=rows.findIndex(r=>r.id===ui.rowId);if(idx<0){ui.view='today';return todayView(c)}
  const r=effRow(c,rows[idx]),ex=exById(r.exId),sets=getSets(c,r),prev=prevSets(c,r.exId),co=coach(c.coachId),h=exHistory(c,r.exId,false),best=h.length?Math.max(...h.map(x=>x.top??0)):0;
  const w0=setWeight(r,0,today(),c.plan),pt=progOf(r).type;
  return `<div class="exbar">${backBtn('today','Today')}<span class="hint mono">${String(idx+1).padStart(2,'0')} / ${String(rows.length).padStart(2,'0')}</span></div>
  <header class="hd"><h1>${esc(ex.name)}</h1>${r.swappedFrom?`<p class="sub">Swapped for today from ${esc(exById(r.swappedFrom).name)}. Your coach has been told.</p>`:''}</header>
  <div class="demo hud">${anim(ex)}<span class="scan" aria-hidden="true"></span></div>
  <div class="target hud"><div><small>${pt==='sets'?'First set':'Target'}</small><b class="mono">${hasW(r.weight)?`${kg(w0)}<i>kg</i>`:"BW"}</b></div><div><small>Sets</small><b class="mono">${r.sets}</b></div><div><small>Reps</small><b class="mono">${esc(r.reps)}</b></div><div><small>Rest</small><b class="mono">${fmtRest(r.rest)}</b>${restBonus(c)?`<span class="tsub">+${restBonus(c)}s today</span>`:''}</div>${best?`<div><small>Your best</small><b class="mono">${kg(best)}<i>kg</i></b></div>`:''}</div>
  ${hasW(r.weight)&&pt!=="none"?`<p class="progline">${progSentence(r,c.plan,"client")}</p>`:""}
  ${r.note?`<div class="coachnote"><span class="eyebrow">Note from ${esc(first(co.name))}</span><p>${esc(r.note)}</p></div>`:''}
  <div class="sets"><div class="sets-hd"><span>Set</span><span>kg</span><span>Reps</span><span></span></div>
  ${sets.map((s,i)=>`<div class="setrow ${s.done?'done':''}"><span class="setn mono">${i+1}</span><input id="w-${r.id}-${i}" inputmode="decimal" data-sf="w" data-row="${r.id}" data-i="${i}" value="${esc(s.w)}" placeholder="kg" aria-label="Set ${i+1} weight in kg"><input id="r-${r.id}-${i}" inputmode="numeric" data-sf="r" data-row="${r.id}" data-i="${i}" value="${esc(s.r)}" aria-label="Set ${i+1} reps"><button class="tick" data-act="set-done" data-row="${r.id}" data-i="${i}" aria-pressed="${s.done}" aria-label="${s.done?'Undo':'Confirm'} set ${i+1}">✓</button></div>`).join('')}</div>
  <label class="xnote">Note for ${esc(first(co.name))} (optional)<textarea id="xn-${r.id}" data-xnote="${r.id}" rows="2" placeholder="e.g. Knee felt sore on the last set">${esc((c.session&&c.session.notes&&c.session.notes[r.id])||'')}</textarea></label>
  <p class="hint">${prev?`Last time: <span class="mono">${setsText(prev)}</span>. ${hasW(r.weight)&&prev[0]&&+prev[0].w<w0?`Up from last time: ${kg(w0)} kg. `:""}Numbers are filled in, so tap ✓ if nothing changed.`:'First time on this one. Enter what you lift, then tap ✓.'}</p>
  <div class="exactions"><button class="btn swapbtn" data-act="swap-open" data-row="${r.id}"><span aria-hidden="true">⇄</span> ${r.swappedFrom?'Change swap':'Swap exercise'}</button>${fcButton(c,r)}</div>
  ${formCheckBox(c,r)}
  <div class="exnav">${idx>0?`<button class="btn" data-act="open-ex" data-row="${rows[idx-1].id}">‹ Previous</button>`:''}${idx<rows.length-1?`<button class="btn primary" data-act="open-ex" data-row="${rows[idx+1].id}">Next: ${esc(exById(effRow(c,rows[idx+1]).exId).name)} ›</button>`:`<button class="btn primary" data-act="nav" data-v="today">Back to workout</button>`}</div>`;
}
function finishSummary(c){
  const inf=dayAt(c,today()),entries=[];let sets=0,vol=0;const prs=[];
  for(const r0 of inf.day.exercises){const r=effRow(c,r0),ss=(getSets(c,r,false)||[]).filter(s=>s.done);if(!ss.length)continue;
    sets+=ss.length;ss.forEach(s=>{if(hasW(s.w))vol+=(+s.w)*(+s.r||0)});
    const h=exHistory(c,r.exId,false),wd=ss.filter(s=>hasW(s.w));
    const isPr=h.length&&(wd.length?Math.max(...wd.map(s=>+s.w))>Math.max(...h.map(x=>x.top??0)):ss.reduce((n,s)=>n+(+s.r||0),0)>Math.max(...h.map(x=>x.reps)));
    if(isPr)prs.push(r.exId);
    const note=((c.session&&c.session.notes&&c.session.notes[r.id])||'').trim();
    entries.push({rowId:r.id,exId:r.exId,sets:ss.map(s=>({w:hasW(s.w)?+s.w:'',r:+s.r||s.r})),...(note?{note}:{}),...(r.swappedFrom?{swappedFrom:r.swappedFrom}:{})});}
  return{entries,sets,vol:Math.round(vol),prs,mins:c.session&&c.session.startedAt?Math.max(1,Math.round((Date.now()-c.session.startedAt)/60000)):0};
}
// the pop-up when finishing a workout: how hard was it, plus a note for the coach
function finishSheet(c){
  const f=finishSummary(c),rpe=ui.finishing.rpe;
  return `<div class="card hud sheetcard" role="dialog" aria-label="Finish workout"><div class="section-hd"><h2>Finish workout</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
  <div class="hudrow"><div class="tile"><small>Time</small><b class="mono">${f.mins}<i>min</i></b></div><div class="tile"><small>Sets</small><b class="mono">${f.sets}</b></div><div class="tile"><small>Total lifted</small><b class="mono">${f.vol.toLocaleString()}<i>kg</i></b></div></div>
  ${f.prs.length?`<div class="prbox"><span class="eyebrow">New personal bests</span>${f.prs.map(id=>`<b>${esc(exById(id).name)}</b>`).join('')}</div>`:''}
  <div><span class="eyebrow">How hard was it? (effort out of 10)</span><div class="seg10">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="${rpe===n?'on':''}" data-act="rpe" data-v="${n}">${n}</button>`).join('')}</div><p class="hint">6 = easy, 8 = 2 reps left, 10 = nothing left.</p></div>
  <label class="xnote">Anything ${esc(first(coach(c.coachId).name))} should know about today? (optional)<textarea id="fin-note" data-fnote rows="2" placeholder="e.g. Short on time, skipped the last set of curls">${esc(ui.finishing.note||'')}</textarea></label>
  <button class="btn primary big" data-act="finish" ${rpe?'':'disabled'}>Save workout</button></div>`;
}
// the Meals page: today's meals to tick off, or any other day of the week
function clientMeals(c){
  if(!c.meals)return `<header class="hd"><h1>Meals</h1></header><div class="card hud empty"><h2>No meal plan yet</h2><p class="muted">${esc(coach(c.coachId).name)} hasn't added your meals yet.</p></div>`;
  const ti=weekIdx(today()),sel=ui.cMealDay??ti,day=c.meals.days[sel],date=addDays(mondayOf(today()),sel),isToday=sel===ti,ticks=c.mealTicks[date]||{};
  const eaten=day.meals.filter(m=>ticks[m.id]).reduce((t,m)=>{const x=mealTotals(m);return{kcal:t.kcal+x.kcal,protein:t.protein+x.protein}},{kcal:0,protein:0}),plan=dayTotals(day);
  const tk=day.kcal||plan.kcal,tp=day.protein||plan.protein;
  return `<header class="hd"><p class="eyebrow">${isToday?'Today':date<today()?'Earlier this week':'Coming up'}</p><h1>${WKL[sel]}</h1></header>
  ${weekStrip(c,sel,'cmeal-day',c.meals.days)}
  <div class="hudrow">${ring(tk?eaten.kcal/tk*100:0,Math.round(eaten.kcal),'of '+tk+' kcal',96)}${ring(tp?eaten.protein/tp*100:0,Math.round(eaten.protein)+'g','of '+tp+' g protein',96)}</div>
  ${isToday?'':'<p class="hint">You can tick meals on the day itself.</p>'}
  <div class="meals">${day.meals.map(m=>{const t=mealTotals(m);return `<button class="meal ${ticks[m.id]?'on':''}" ${isToday?`data-act="tick-meal" data-meal="${m.id}"`:'disabled'} aria-pressed="${!!ticks[m.id]}"><span class="box">✓</span><span class="mb"><span class="mhead"><b>${esc(m.name)}${swappedMeal(c,date,m.id,'client')?' <span class="pill warn">Swapped</span>':''}</b><small class="mono">${t.kcal} kcal · ${t.protein} g</small></span><ul>${m.foods.map(f=>`<li><span>${esc(f.food)}</span><span>${esc(f.portion)}</span></li>`).join('')}</ul></span></button>`}).join('')||'<p class="hint">Nothing planned for this day.</p>'}</div>
  ${mealXList(c,date,'client')}${date<=today()&&day.meals.length?'<button class="linkbtn mxlink" data-act="mx-open">+ Ate something that wasn\'t on the plan</button>':''}`;
}
// the Progress page: weekly check-in, form checks, weight, measurements and photos
function clientProgress(c){
  if(ui.olEx)return overloadDetail(c,ui.olEx);
  const ws=c.weights.slice().sort((a,b)=>a.date<b.date?-1:1);
  if(newReply(c)){c.ciSeen=Date.now();save()}
  const lifts=planExIds(c).map(id=>({id,h:exHistory(c,id,false),r:planRow(c,id)})).filter(x=>x.h.length),shown=ui.liftsAll?lifts:lifts.slice(0,6);
  return `<header class="hd"><h1>Progress</h1></header>
  ${checkinCard(c)}
  ${(c.formChecks||[]).length?`<section class="rsec"><h2>Form checks</h2>${(c.formChecks||[]).slice().sort((a,b)=>b.ts-a.ts).slice(0,3).map(fc=>fcCard(c,fc,'client')).join('')}</section>`:''}
  <section class="rsec"><h2>Body weight</h2>${ws.length?weightChart(ws):'<p class="hint">Log your first weigh-in above.</p>'}</section>
  <section class="rsec"><h2>Body measurements</h2>${measurementsView(c,'client')}</section>
  <section class="rsec"><h2>Your lifts</h2>
  <ul class="olist">${shown.map(x=>{const st=overload(x.h);return `<li><button class="olrow" data-act="ol-ex" data-id="${x.id}">${thumb(exById(x.id))}<span class="olname"><span class="oltop"><b>${esc(exById(x.id).name)}</b>${statusPill(st)}</span><small>${x.r&&hasW(x.r.weight)?`${repsText(x.r.sets,x.r.reps)} · ${weightText(x.r,today(),c.plan)}`:`${x.r?repsText(x.r.sets,x.r.reps)+' · ':''}bodyweight`}</small></span></button></li>`}).join('')||'<li class="hint">Log a workout to see your lifts here.</li>'}</ul>
  ${lifts.length>6?`<button class="morebtn" data-act="lifts-all">${ui.liftsAll?'Show fewer ▴':`Show all ${lifts.length} lifts ▾`}</button>`:''}</section>
  ${c.photos.length?`<section class="rsec"><h2>Progress photos</h2>${photosHistory(c.photos)}</section>`:''}`;
}
