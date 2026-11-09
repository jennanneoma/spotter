/* ui-extras.js: the smaller features, one numbered section each.
   Setting up a new coach, invite links, reminders, swapping an exercise, notes, measurements,
   the weekly summary, themes, notifications and settings. */
const INVITE_HOST='https://spotter.example/join/';
const inviteLink=c=>INVITE_HOST+c.inviteCode;
const inviteMsg=(c,co)=>`Hi ${first(c.name)}, I've set up your training on Spotter${co.business?` with ${co.business}`:''}. Tap this link to join and see your plan: ${inviteLink(c)}`;
const newCode=()=>Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const isInvited=c=>c.status==='invited';
const BELL='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>';

/* ---------- branding ---------- */
function brandMark(co,size=28){
  return co.logo?`<img class="brandlogo" src="${co.logo}" alt="" width="${size}" height="${size}">`:`<span class="brandlogo mono" style="width:${size}px;height:${size}px" aria-hidden="true">${initials(co.business||co.name)}</span>`;
}
const brandBar=co=>`<div class="brandbar">${brandMark(co)}<span><b>${esc(co.business||co.name)}</b><small>Coach ${esc(co.name)}</small></span></div>`;

/* ---------- 1 · coach onboarding ---------- */
function onboardingView(co){
  const step=ui.obStep||1,d=ui.ob||(ui.ob={name:co.name==='New coach'?'':co.name,business:co.business||'',logo:co.logo||null,cname:'',cgoal:''});
  const dots=[1,2,3].map(n=>`<i class="${n<=step?'on':''}"></i>`).join('');
  let body='';
  if(step===1)body=`<header class="hd"><p class="eyebrow">Step 1 of 3</p><span class="obmark">${SPOTTER_MARK}</span><h1>Welcome to Spotter</h1><p class="sub">Let's set up your coaching business. Your clients will see this name in their app.</p></header>
    <div class="card hud"><label>Your name<input id="ob-name" data-ob="name" value="${esc(d.name)}" placeholder="e.g. Immanuel Adeshina" autocomplete="name"></label>
    <label>Business name<input id="ob-business" data-ob="business" value="${esc(d.business)}" placeholder="e.g. Immanuel Fitness"></label>
    <p class="hint">You can change both later.</p></div>
    <button class="btn primary big" data-act="ob-next" ${d.name.trim()?'':'disabled'} id="ob-go1">Continue</button>`;
  else if(step===2)body=`<header class="hd"><p class="eyebrow">Step 2 of 3</p><h1>Add your logo</h1><p class="sub">It appears at the top of your clients' app, so it feels like your own.</p></header>
    <div class="card hud"><label class="logodrop" for="ob-logo">${d.logo?`<img src="${d.logo}" alt="Your logo">`:`<span class="mono">${initials(d.business||d.name)}</span>`}<span>${d.logo?'Change logo':'Upload logo'}</span><input type="file" id="ob-logo" accept="image/*" data-oblogo></label>
    <p class="eyebrow">How clients will see it</p>
    <div class="phonepreview">${brandBar({...co,name:d.name||'You',business:d.business,logo:d.logo})}<p class="hint">Week 1 · Monday</p><h2>Upper body</h2></div></div>
    <div class="btnrow"><button class="btn ghost" data-act="ob-back">Back</button><button class="btn primary" data-act="ob-next" style="flex:1">${d.logo?'Continue':'Skip for now'}</button></div>`;
  else body=`<header class="hd"><p class="eyebrow">Step 3 of 3</p><h1>Invite your first client</h1><p class="sub">We'll make a link you can send on WhatsApp. Your client taps it, creates their account, and they're connected to you.</p></header>
    <div class="card hud"><label>Client's name<input id="ob-cname" data-ob="cname" value="${esc(d.cname)}" placeholder="e.g. Taylor Brooks"></label>
    <label>Their goal (optional)<input id="ob-cgoal" data-ob="cgoal" value="${esc(d.cgoal)}" placeholder="e.g. Lose 5 kg by summer"></label></div>
    <div class="btnrow"><button class="btn ghost" data-act="ob-back">Back</button><button class="btn" data-act="ob-finish" data-skip="1">Skip for now</button><button class="btn primary" data-act="ob-finish" style="flex:1">Create invite</button></div>`;
  return `<main class="screen onboarding"><div class="obdots" aria-label="Step ${step} of 3">${dots}</div>${body}</main>`;
}

/* ---------- 2 · client invite links ---------- */
function inviteCard(c,co,fresh){
  return `<div class="card hud invite" id="invite-${c.id}"><div class="section-hd"><div><p class="eyebrow">${fresh?'Invite ready':'Waiting to join'}</p><h3>${esc(c.name)}</h3></div>${fresh?`<button class="icon-btn" data-act="close-invite" aria-label="Close">✕</button>`:''}</div>
    <p class="hint">${fresh?`Send this link to ${esc(first(c.name))}. When they open it and create their account, they're connected to you. You can build their routine now.`:`Invite sent ${rel(c.invitedAt).toLowerCase()}. ${esc(first(c.name))} hasn't joined yet.`}</p>
    <div class="linkbox"><span class="mono" id="link-${c.id}">${inviteLink(c).replace('https://','')}</span><button class="btn sm" data-act="copy-invite" data-id="${c.id}">Copy link</button></div>
    <div class="btnrow"><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(inviteMsg(c,co))}" target="_blank" rel="noopener">Send on WhatsApp</a><button class="btn" data-act="copy-invite" data-id="${c.id}" data-msg="1">Copy message</button></div>${fresh?'':`<div class="btnrow"><button class="btn sm" data-act="open-client" data-id="${c.id}">Build their routine</button><button class="btn ghost sm" data-act="new-invite" data-id="${c.id}">Make a new link</button></div>`}</div>`;
}
function joinView(c){
  const co=coach(c.coachId),j=ui.join||(ui.join={name:'',email:'',pw:''});
  return `<main class="screen"><div class="joinhero">${brandMark(co,64)}<p class="eyebrow">You're invited</p><h1>Train with ${esc(co.business||co.name)}</h1><p class="sub">${esc(co.name)} has set up Spotter for you. Create your account to see your plan and start logging workouts.</p></div>
    <form class="card hud" data-form="join"><label>What should we call you?<input id="jn-name" name="name" value="${esc(j.name)}" required placeholder="Your first name" autocomplete="given-name"></label>
    <label>Email<input id="jn-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email"></label>
    <label>Create a password<input id="jn-pw" name="pw" type="password" required minlength="8" placeholder="At least 8 characters" autocomplete="new-password"></label>
    <button class="btn primary big">Join ${esc(first(co.name))}</button>
    <p class="hint">Prototype: nothing is sent anywhere. In the real app this creates your login.</p></form></main>`;
}

/* ---------- 3 · workout reminders ---------- */
function nextTrainingDays(c,n=3){const out=[];for(let i=0;i<21&&out.length<n;i++){const d=addDays(today(),i),inf=dayAt(c,d);if(inf.day&&!inf.day.rest&&!(i===0&&c.logs.some(l=>l.date===d)))out.push({date:d,day:inf.day})}return out}
const fmt12=t=>{const[h,m]=t.split(':').map(Number);return `${(h%12)||12}:${String(m).padStart(2,'0')} ${h<12?'am':'pm'}`};
function reminderRow(c){
  const r=c.reminder||{on:false,time:'07:00'};
  return `<button class="remrow ${r.on?'on':''}" data-act="rem-open">${BELL}<span>${r.on?`Reminder at <b>${fmt12(r.time)}</b> on training days`:'Turn on workout reminders'}</span><span class="chev" aria-hidden="true">›</span></button>`;
}
function reminderSheet(c){
  const r=c.reminder||{on:false,time:'07:00'},nx=nextTrainingDays(c,3),co=coach(c.coachId),first1=nx[0];
  return `<div class="card hud sheetcard" role="dialog" aria-label="Workout reminders"><div class="section-hd"><h2>Workout reminders</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <p class="hint">Get a notification on the days your routine has a workout. Rest days stay quiet.</p>
    <label class="switch big"><input type="checkbox" id="rem-on" data-rem="on" ${r.on?'checked':''}><span>Remind me on training days</span></label>
    <label>Time<input type="time" id="rem-time" data-rem="time" value="${r.time}" ${r.on?'':'disabled'}></label>
    ${first1?`<p class="eyebrow">Preview</p><div class="notif"><span class="nicon">${brandMark(co,34)}</span><span class="nbody"><span class="ntop"><b>Spotter</b><small>${first1.date===today()?'today':fmtDate(first1.date)} · ${fmt12(r.time)}</small></span><span><b>${esc(dayTitle(first1.day))} today.</b> ${first1.day.exercises.length} exercises from ${esc(first(co.name))}. Tap to start.</span></span></div>
    <p class="hint">Next reminders: ${nx.map(x=>`${fmtDate(x.date)} (${esc(dayTitle(x.day))})`).join(', ')}.</p>`:'<p class="hint">No training days coming up yet.</p>'}
    <button class="btn primary big" data-act="close-sheet">Done</button></div>`;
}

/* ---------- 4 · exercise swap ---------- */
function swapFor(c,r){const s=c.swaps&&c.swaps[today()];return s&&s[r.id]}
function effRow(c,r){
  const sw=swapFor(c,r);if(!sw)return r;
  const h=exHistory(c,sw,false),last=h[h.length-1];
  return{...r,exId:sw,swappedFrom:r.exId,weight:last&&last.top!=null?last.top:'',prog:{type:'none',step:2.5,every:1},since:undefined};
}
/* Exercises that train the same movement, so a swap keeps the workout's purpose */
const FAMILY={squat:'squat',boxsquat:'squat',fsquat:'squat',gsquat:'squat',legpress:'squat',
  rdl:'hinge',gm:'hinge',deadlift:'hinge',sumo:'hinge',hipthrust:'glute',bridge:'glute',gkick:'glute',abduct:'glute',
  lunge:'lunge',bss:'lunge',stepup:'lunge',
  bench:'hpush',cgbench:'hpush',incline:'hpush',decline:'hpush',pushup:'hpush',dpushup:'hpush',ipushup:'hpush',cpress:'hpush',dip:'dip',bdip:'dip',
  fly:'fly',cfly:'fly',pecdeck:'fly',lhfly:'fly',
  pullup:'vpull',chinup:'vpull',pulldown:'vpull',sapd:'vpull',
  row:'hpull',pendlay:'hpull',row1:'hpull',csrow:'hpull',crow:'hpull',invrow:'hpull',
  facepull:'rear',reardelt:'rear',
  press:'vpush',dbpress:'vpush',arnold:'vpush',landmine:'vpush',
  lateral:'raise',front:'raise',upright:'raise',shrug:'shrug',
  curl:'curl',ccurl:'curl',inclinecurl:'curl',preacher:'curl',conc:'curl',
  pushdown:'tri',ohext:'tri',skull:'tri',kick:'tri',
  legext:'quad',sleg:'ham',legcurl:'ham',calf:'calf',scalf:'calf',
  plank:'core',sideplank:'core',abwheel:'core',deadbug:'core',pallof:'core',climber:'core',crunch:'abs',bicycle:'abs',hlr:'abs',llr:'abs',ccrunch:'abs',rtwist:'abs',
  burpee:'cardio',jumpsq:'cardio',boxjump:'cardio',carry:'cardio',ropes:'cardio',erg:'cardio',bike:'cardio',jumprope:'cardio',dunder:'cardio',jack:'cardio',swing:'cardio'};
const famOf=e=>FAMILY[e.pattern]||e.group;
function similarExercises(exId){
  const e=exById(exId),f=famOf(e);
  const same=S.exercises.filter(x=>x.id!==exId&&famOf(x)===f).sort((a,b)=>a.name.localeCompare(b.name));
  const near=S.exercises.filter(x=>x.id!==exId&&famOf(x)!==f&&x.group===e.group).sort((a,b)=>a.name.localeCompare(b.name));
  return(same.length>=4?same:[...same,...near]).slice(0,8);
}
// "machine busy?" pop-up that suggests similar exercises for today only
function swapSheet(c){
  const inf=dayAt(c,today()),r=inf.day.exercises.find(x=>x.id===ui.swapRow);if(!r)return'';
  const orig=exById(r.exId),cur=swapFor(c,r);
  return `<div class="card hud sheetcard" role="dialog" aria-label="Swap exercise"><div class="section-hd"><div><p class="eyebrow">Swap for today</p><h2>${esc(orig.name)}</h2></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <p class="hint">Machine busy or missing? Pick a similar exercise. It only changes today, and ${esc(first(coach(c.coachId).name))} is told.</p>
    <ul class="swaplist">${similarExercises(r.exId).map(e=>`<li><button class="swapitem ${cur===e.id?'on':''}" data-act="do-swap" data-row="${r.id}" data-ex="${e.id}">${thumb(e)}<span><b>${esc(e.name)}</b><small>${famOf(e)===famOf(orig)?'Same movement':'Same muscle group'}</small></span>${cur===e.id?'<span class="pill ok">Chosen</span>':''}</button></li>`).join('')}</ul>
    ${cur?`<button class="btn ghost" data-act="undo-swap" data-row="${r.id}">Go back to ${esc(orig.name)}</button>`:''}</div>`;
}

/* ---------- 5 · notes for the coach (shown in coach lists) ---------- */
function logNotes(l){
  const ex=(l.entries||[]).filter(e=>e.note).map(e=>`<div class="lognote"><span class="eyebrow">${esc(exById(e.exId).name)}</span><p>“${esc(e.note)}”</p></div>`).join('');
  return (l.note?`<div class="lognote"><span class="eyebrow">Workout note</span><p>“${esc(l.note)}”</p></div>`:'')+ex;
}
const hasNotes=l=>!!(l.note||(l.entries||[]).some(e=>e.note));
const newNotes=c=>visLogs(c).filter(l=>hasNotes(l)&&l.finishedAt>(c.notesSeen||0));
const newSwaps=c=>(c.swapFeed||[]).filter(s=>s.synced!==false&&s.ts>(c.notesSeen||0));
const swappedLabel=e=>e.swappedFrom?` <span class="swaptag">instead of ${esc(exById(e.swappedFrom).name)}</span>`:'';

/* ---------- 6 · body measurements ---------- */
const MEAS=[['waist','Waist'],['hips','Hips'],['chest','Chest'],['arm','Arm'],['thigh','Thigh']];
function measurementsView(c,role){
  const ms=(c.measures||[]).filter(m=>role==='client'||m.synced!==false).slice().sort((a,b)=>a.date<b.date?-1:1);
  if(!ms.length)return `<p class="hint">${role==='client'?'No measurements yet. Add them with your next weigh-in.':'No measurements logged yet.'}</p>`;
  const sel=ui.measure||'waist',pts=ms.filter(m=>hasW(m[sel])).map(m=>({date:m.date,v:+m[sel]}));
  const row=([k,l])=>{const v=ms.filter(m=>hasW(m[k]));if(!v.length)return'';const a=+v[0][k],b=+v[v.length-1][k],d=Math.round((b-a)*10)/10;
    return `<tr><td><b>${l}</b></td><td class="mono">${kg(a)}</td><td class="mono">${kg(b)}</td><td class="mono">${d>0?'+':d<0?'−':'±'}${kg(Math.abs(d))} cm</td></tr>`};
  return `<div class="tablewrap"><table class="mtable"><thead><tr><th>Measurement</th><th>${fmtShort(ms[0].date)}</th><th>${fmtShort(ms[ms.length-1].date)}</th><th>Change</th></tr></thead><tbody>${MEAS.map(row).join('')}</tbody></table></div>
    <div class="chips" role="group" aria-label="Chart measurement">${MEAS.map(([k,l])=>`<button class="chip ${sel===k?'on':''}" data-act="meas-pick" data-v="${k}">${l}</button>`).join('')}</div>
    ${pts.length?lineChart(pts,{unit:'cm',label:`${sel} in centimetres`}):'<p class="hint">No numbers for this one yet.</p>'}`;
}

/* ---------- 7 · coach's weekly summary ---------- */
/* Weekly summary: one line per client, so the count always matches the coach's client list */
function clientWeek(c,mon){
  const end=addDays(mon,6),T=today(),last=end<T?end:T;
  const w={c,days:[],planned:0,done:0,miss:0,prs:[],notes:[],swaps:[],energy:null};
  if(isInvited(c)){w.status='invited';return w}
  if(!c.plan){w.status='noplan';return w}
  const logs=visLogs(c).filter(l=>l.date>=mon&&l.date<=end);
  for(let i=0;i<7;i++){const d=addDays(mon,i),inf=dayAt(c,d);if(!inf.day||inf.day.rest)continue;
    const log=logs.find(l=>l.date===d),state=log?'done':d<T?'missed':d===T?'today':'upcoming';
    if(state==='done'||state==='missed'){w.planned++;if(state==='done')w.done++;else w.miss++}
    w.days.push({d,title:dayTitle(inf.day),state,log})}
  for(const l of logs){for(const id of l.prs||[]){const e=l.entries.find(x=>x.exId===id),top=e?Math.max(0,...e.sets.filter(s=>hasW(s.w)).map(s=>+s.w)):0;w.prs.push({id,top,reps:e?e.sets.reduce((n,s)=>n+(+s.r||0),0):0})}
    if(hasNotes(l))w.notes.push(l)}
  w.swaps=(c.swapFeed||[]).filter(s=>s.synced!==false&&s.date>=mon&&s.date<=end);
  const rs=Object.entries(c.readiness).filter(([d,r])=>d>=mon&&d<=end&&r.synced!==false).map(([,r])=>readyScore(r));
  if(rs.length)w.energy=Math.round(rs.reduce((a,b)=>a+b,0)/rs.length);
  const ns=!w.days.length&&dayAt(c,last).notStarted;if(ns)w.startsOn=dayAt(c,last).start;
  w.status=w.miss?'missed':w.planned?'ontrack':ns?'notstarted':'nothingyet';
  return w;
}
// gathers one week for every client, for the weekly summary card
function weekSummary(co,mon){
  const all=S.clients.filter(c=>c.coachId===co.id&&!c.archived),list=all.filter(c=>!isInvited(c)).map(c=>clientWeek(c,mon));
  const order={missed:0,noplan:1,invited:2,notstarted:3,nothingyet:3,ontrack:4};
  list.sort((a,b)=>order[a.status]-order[b.status]||a.c.name.localeCompare(b.c.name));
  const n=k=>list.filter(x=>x.status===k).length;
  return{mon,list,total:list.length,ontrack:n('ontrack'),missed:n('missed'),noplan:n('noplan'),invited:all.length-list.length,nothingyet:n('nothingyet'),notstarted:n('notstarted')};
}
/* One friendly sentence that always accounts for every client */
function funSummary(W,which){
  const T=W.total,pend=W.invited?` ${W.invited} invite${W.invited>1?'s are':' is'} still pending.`:'';if(!T)return 'No clients yet. Invite your first one from the Invites tab.'+pend;
  const one=n=>n===1;
  const P={ontrack:n=>'crushed every workout',missed:n=>'skipped a few (worth a quick nudge)',
    notstarted:n=>one(n)?'is about to start':'are about to start',nothingyet:n=>one(n)?'had nothing due yet':'had nothing due yet',
    noplan:n=>one(n)?'is waiting on a routine from you':'are waiting on a routine from you',
    invited:n=>one(n)?"hasn't accepted your invite yet":"haven't accepted your invite yet"};
  const groups=['ontrack','missed','notstarted','nothingyet','noplan'].filter(k=>W[k]).map(k=>({k,n:W[k]}));
  const lead=W.missed?'Mixed week.':W.ontrack?(which==='this'?'Great start to the week!':'Great week!'):(which==='this'?'Quiet start to the week.':'Quiet week.');
  const parts=groups.map((g,i)=>{
    if(i===0){if(g.n===T)return `${T===1?'Your client':T===2?'Both your clients':`All ${T} of your clients`} ${P[g.k](g.n===1?1:2)}`;return `${g.n} of your ${T} clients ${P[g.k](g.n)}`}
    if(i===1&&groups.length===2)return `the other ${g.n===1?'one':g.n} ${P[g.k](g.n)}`;
    return `${g.n} ${P[g.k](g.n)}`});
  const body=parts.length>1?parts.slice(0,-1).join(', ')+', and '+parts[parts.length-1]:parts[0];
  return `${lead} ${body}.${pend}`;
}
function statusLine(w){
  return w.status==='ontrack'?{cls:'ok',icon:'✓',text:w.done===1?'Did their 1 workout':w.done===2?'Did both workouts':`Did all ${w.done} workouts`}
    :w.status==='missed'?{cls:'bad',icon:'✕',text:`Did ${w.done} of ${w.planned} · missed ${w.miss}`}
    :w.status==='noplan'?{cls:'warn',icon:'!',text:'No routine yet'}
    :w.status==='invited'?{cls:'muted',icon:'…',text:"Hasn't joined yet"}
    :w.status==='notstarted'?{cls:'muted',icon:'·',text:`Routine starts ${fmtDate(w.startsOn)}`}
    :{cls:'muted',icon:'·',text:'No workouts due yet'};
}
function weeklySummaryView(co){
  const which=ui.sumWeek||'last',mon=which==='last'?addDays(mondayOf(today()),-7):mondayOf(today()),W=weekSummary(co,mon);
  const row=w=>{const st=statusLine(w),c=w.c,open=ui.sumOpen===c.id;
    const badges=[w.notes.length?`<span class="sbadge warn">${w.notes.length} note${w.notes.length>1?'s':''}</span>`:'',w.swaps.length?`<span class="sbadge warn">${w.swaps.length} swap${w.swaps.length>1?'s':''}</span>`:'',w.prs.length?`<span class="sbadge ok">${w.prs.length} PB</span>`:''].join('');
    const body=w.status==='invited'?`<p class="hint">${esc(c.name)} has an invite but hasn't created their account yet.</p><button class="btn sm" data-act="open-client" data-id="${c.id}">See invite link</button>`
      :w.status==='noplan'?`<p class="hint">Nothing was planned because ${esc(first(c.name))} has no routine.</p><button class="btn primary sm" data-act="open-client" data-id="${c.id}">Build a routine</button>`
      :`${(()=>{if(!visLogs(c).length)return'';const R=reportData(c,4);return `<div class="cwsnap"><span><small>Last 4 weeks</small><b class="mono">${R.attendance==null?'–':R.attendance+'%'}</b><i>workouts done</i></span><span><small>Strength</small><b class="mono">${pctText(R.medianPct)}</b><i>typical lift</i></span><span><small>Body weight</small><b class="mono">${R.bwChange==null?'–':(R.bwChange>0?'+':R.bwChange<0?'−':'')+Math.abs(R.bwChange)+' kg'}</b><i>change</i></span></div>`})()}
        <p class="eyebrow">${which==='last'?'Last week':'This week'}, day by day</p><ul class="cwdays">${w.days.map(x=>`<li class="${x.state}"><span class="mono">${WK[weekIdx(x.d)].toUpperCase()}</span><span>${esc(x.title)}</span><span class="cw-state">${x.state==='done'?'✓ Done':x.state==='missed'?'✕ Missed':x.state==='today'?'Today':'Coming up'}</span></li>`).join('')||'<li><span class="hint">No training days this week.</span></li>'}</ul>
        ${w.energy!=null?`<p class="hint">Energy check this week: average <b class="${readyCls(w.energy)}-t">${w.energy}/100</b>${w.energy<55?' (low, worth asking about sleep and stress)':''}.</p>`:''}
        ${w.prs.length?`<p class="hint">Personal bests: ${w.prs.map(p=>`<b>${esc(exById(p.id).name)}</b> ${p.top?kg(p.top)+' kg':p.reps+' reps'}`).join(', ')}.</p>`:''}
        ${w.swaps.map(s=>`<p class="hint">Swapped on ${fmtDate(s.date)}: <b>${esc(exById(s.to).name)}</b> instead of ${esc(exById(s.from).name)}.</p>`).join('')}
        ${w.notes.map(l=>logNotes(l)).join('')}
        <button class="btn primary sm" data-act="open-report" data-id="${c.id}">Open full report ›</button>`;
    return `<li class="cweek ${open?'open':''}"><button class="cw-head" data-act="sum-open" data-id="${c.id}" aria-expanded="${open}">${avatarOf(c)}<span class="cw-name"><b>${esc(c.name)}</b><span class="cw-st ${st.cls}"><i aria-hidden="true">${st.icon}</i> ${st.text}</span></span><span class="cw-badges">${badges}</span><span class="chev" aria-hidden="true">${open?'▴':'▾'}</span></button>${open?`<div class="cw-body">${body}</div>`:''}</li>`};
  return `<section class="card hud summary"><div class="section-hd"><div class="sum-hd"><h2>Weekly summary</h2><p class="hint">${weekRange(mon)}</p></div>
    <div class="chips" role="group" aria-label="Which week"><button class="chip ${which==='last'?'on':''}" data-act="sum-week" data-v="last">Last week</button><button class="chip ${which==='this'?'on':''}" data-act="sum-week" data-v="this">This week</button></div></div>
    <p class="sumline">${esc(funSummary(W,which))}</p>
    <ul class="cwlist">${W.list.map(row).join('')}</ul></section>`;
}
/* Names: c.name is what the coach calls the client; c.selfName is what the client calls themselves (client app only) */
const myName=c=>c.selfName||c.name;
// a client's round picture, or their initials when they haven't added one
function avatarOf(c,cls=''){return `<span class="avatar ${cls}">${c&&c.avatar?`<img src="${c.avatar}" alt="">`:initials(c?c.name:'')}</span>`}
// the coach's settings for one client: name, goal, and remove
function clientSheet(c){
  if(!c)return'';
  return `<div class="card hud sheetcard csheet" role="dialog" aria-label="${esc(c.name)} settings"><div class="section-hd"><div class="cs-who">${avatarOf(c)}<h2>${esc(first(c.name))}</h2></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <form data-form="edit-client" class="cs-form"><label>Name<input id="ec-name" name="name" value="${esc(c.name)}" required maxlength="40"></label><label>Goal<input id="ec-goal" name="goal" value="${esc(c.goal||'')}" maxlength="80" placeholder="e.g. Build muscle"></label>${c.selfName&&c.selfName!==c.name?`<p class="hint">They go by “${esc(c.selfName)}” in their own app.</p>`:''}<button class="btn primary">Save</button></form>
    <div class="optcard">${isInvited(c)?`<button class="optrow optlink" data-act="inv-go" data-id="${c.id}"><span><b>Manage invite</b></span><span class="optval"><i aria-hidden="true">›</i></span></button>`:''}<button class="optrow optlink danger-row" data-act="ask-archive" data-id="${c.id}"><span><b>Remove client</b></span><span class="optval"><i aria-hidden="true">›</i></span></button></div></div>`;
}
function nameSheet(c){
  return `<form class="card hud sheetcard" data-form="my-name" role="dialog" aria-label="Your name"><div class="section-hd"><h2>Your name</h2><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    <p class="hint">Only changes it on your phone.</p>
    <label>What should we call you?<input id="my-name" name="name" value="${esc(myName(c))}" required maxlength="40" autocomplete="name"></label>
    <button class="btn primary big">Save</button></form>`;
}

/* Themes: each person's own colours. Kept apart from the app data so Reset sample data leaves them alone. */
const THEMES=[['lime','Lime','Black and lime, the Spotter look','#050806','#B8F24C'],['pink','Pink','Pitch black and hot pink','#000000','#FF6FB5'],['ocean','Ocean','Deep navy and sky blue','#040A10','#5CC8FF'],['violet','Violet','Midnight purple and lavender','#08060F','#B79CFF'],['ember','Ember','Warm charcoal and orange','#0C0705','#FF9A3D'],['blush','Blush','Light mode in soft pink','#FDF2F7','#C8186F'],['daylight','Daylight','Light mode in white and green','#F5F8F2','#3A7D0A']];
const PALETTE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-1.9 0-1.4-1-1.8-1-3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.2 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';
let themeMem={};try{themeMem=JSON.parse(localStorage.getItem('spotter-themes'))||{}}catch(e){}
const themeOf=()=>themeMem[`${ui.user.role}:${ui.user.id}`]||'lime';
function applyTheme(){const r=document.documentElement,t=themeOf();if(r.dataset&&r.dataset.skin!==t){r.dataset.skin=t;SpotterAnim.reset()}}
function setTheme(t){themeMem[`${ui.user.role}:${ui.user.id}`]=t;try{localStorage.setItem('spotter-themes',JSON.stringify(themeMem))}catch(e){}applyTheme()}
const themeButton=()=>`<button class="themebtn" data-act="theme-open">${PALETTE}Themes</button>`;
function themeSheet(){
  const cur=themeOf();
  return `<div class="card hud sheetcard" role="dialog" aria-label="Themes"><div class="section-hd"><div><h2>Themes</h2><p class="hint">Only changes the app for you.</p></div><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
  <ul class="themelist">${THEMES.map(([k,n,d,bg,ac])=>`<li><button class="themeopt ${cur===k?'on':''}" data-act="theme-set" data-v="${k}" aria-pressed="${cur===k}"><span class="themeswatch" style="background:${bg}"><i style="background:${ac}"></i><i style="background:${ac}"></i></span><span><b>${n}</b><small>${d}</small></span>${cur===k?'<span class="themecheck" aria-hidden="true">✓</span>':''}</button></li>`).join('')}</ul>
  <button class="btn primary big" data-act="close-sheet">Done</button></div>`;
}

/* Invites: everyone the coach has invited, pending first */
function invitesView(co){
  const mine=S.clients.filter(c=>c.coachId===co.id&&!c.archived);
  const pending=mine.filter(isInvited).sort((a,b)=>a.invitedAt<b.invitedAt?-1:1),joined=mine.filter(c=>!isInvited(c)).sort((a,b)=>(b.joinedAt||'')<(a.joinedAt||'')?-1:1);
  const row=c=>{const open=ui.invOpen===c.id,age=daysBetween(c.invitedAt,today()),del=ui.confirm&&ui.confirm.id===c.id&&ui.confirm.kind==='cancelinv';
    return `<li class="invrow ${open?'open':''}"><button class="invhead" data-act="inv-open" data-id="${c.id}" aria-expanded="${open}">${avatarOf(c,'dim')}<span class="cname">${esc(c.name)}<small>Sent ${rel(c.invitedAt).toLowerCase()}${age>=7?' · worth a reminder':''}</small></span><span class="pill ${age>=7?'warn':''}">Pending</span><span class="chev" aria-hidden="true">${open?'▴':'▾'}</span></button>
    ${open?`<div class="invbody"><div class="linkbox"><span class="mono" id="link-${c.id}">${inviteLink(c).replace('https://','')}</span><button class="btn sm" data-act="copy-invite" data-id="${c.id}">Copy link</button></div>
      <div class="btnrow"><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(inviteMsg(c,co))}" target="_blank" rel="noopener">Send on WhatsApp</a><button class="btn" data-act="copy-invite" data-id="${c.id}" data-msg="1">Copy message</button></div>
      ${del?`<div class="confirm-inline"><span class="bad-t">Cancel this invite? The link stops working${c.plan||c.meals?' and the routine you built is removed':''}.</span><button class="btn danger sm" data-act="inv-cancel" data-id="${c.id}">Cancel invite</button><button class="btn ghost sm" data-act="cancel-confirm">Keep</button></div>`
      :`<div class="invlinks"><button class="icon-btn" data-act="open-client" data-id="${c.id}">${c.plan?'Edit their routine':'Build their routine'}</button><button class="icon-btn" data-act="new-invite" data-id="${c.id}">New link</button><button class="icon-btn" data-act="inv-ask-cancel" data-id="${c.id}">Cancel invite</button></div>`}</div>`:''}</li>`};
  return `<header class="hd"><h1>Invites</h1><p class="sub">${pending.length?`${pending.length} waiting to join`:'Nobody waiting to join'}, ${joined.length} joined.</p></header>
  <form class="card hud" data-form="add-client"><h3>Invite a client</h3><div class="row2"><label>Name<input id="nc-name" name="name" required placeholder="e.g. Taylor Brooks" maxlength="40"></label><label>Goal (optional)<input id="nc-goal" name="goal" placeholder="e.g. Lose 5 kg" maxlength="80"></label></div><button class="btn primary">Create invite link</button></form>
  <section class="rsec"><h2>Pending</h2>${pending.length?`<ul class="invlist">${pending.map(row).join('')}</ul>`:'<p class="hint">No pending invites.</p>'}</section>
  <section class="rsec"><h2>Joined</h2>${joined.length?`<ul class="invlist">${joined.map(c=>`<li class="invrow"><button class="invhead" data-act="open-client" data-id="${c.id}">${avatarOf(c)}<span class="cname">${esc(c.name)}<small>${c.joinedAt?`Joined ${fmtShort(c.joinedAt)}`:'Joined'}</small></span><span class="chev" aria-hidden="true">›</span></button></li>`).join('')}</ul>`:'<p class="hint">Clients appear here once they create their account.</p>'}</section>`;
}

/* Top bar + notifications. Client items are saved when the coach changes something; coach items come from what clients log. */
const NBELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>';
// the list in the bell. Coaches get them from what clients do; clients get them from coach changes
function notifications(){
  if(ui.user.role==='client'){const c=client(ui.user.id),cn=first(coach(c.coachId).name);
    const msgs=c.messages.filter(m=>m.from==='coach').slice(-5).map(m=>({ts:m.ts,text:`${cn} sent you a message.`,go:'chat'}));
    return[...c.notes.map(n=>({ts:n.ts,text:n.text,go:n.go||'today'})).filter(n=>pref(c,n.go==='meals'?'nMeals':'nRoutine')),...(pref(c,'nMsgs')?msgs:[])].sort((a,b)=>b.ts-a.ts).slice(0,15)}
  const out=[],since=Date.now()-21*864e5,me=coach(ui.user.id);
  for(const c of S.clients.filter(x=>x.coachId===ui.user.id&&!x.archived)){
    if(c.joinedTs&&pref(me,'nJoins'))out.push({ts:c.joinedTs,text:c.invitedAs&&c.invitedAs!==c.name?`${c.invitedAs} accepted your invite and joined as ${c.name}.`:`${c.name} accepted your invite.`,id:c.id,tab:'workouts'});
    for(const l of visLogs(c)){if(l.finishedAt<since)continue;const pb=(l.prs||[]).length;
      const nt=hasNotes(l)&&pref(me,'nNotes');
      if(pref(me,'nWorkouts'))out.push({ts:l.finishedAt,text:`${c.name} finished ${l.dayName}${nt?' and left you a note':''}.${pb?` ${pb} new personal best${pb>1?'s':''}.`:''}`,id:c.id,tab:'workouts'});
      else if(nt)out.push({ts:l.finishedAt,text:`${c.name} left you a note on ${l.dayName}.`,id:c.id,tab:'workouts'})}
    if(pref(me,'nNotes')){for(const s of c.swapFeed||[])if(s.synced!==false)out.push({ts:s.ts,text:`${c.name} swapped ${exById(s.from).name} for ${exById(s.to).name}.`,id:c.id,tab:'workouts'});
      for(const x of visCi(c))if(x.ts>=since)out.push({ts:x.ts,text:`${c.name} sent their weekly check-in.`,id:c.id,tab:'progress'});
      for(const x of visFc(c))if(x.ts>=since)out.push({ts:x.ts,text:`${c.name} sent a form check on ${exById(x.exId).name}.`,id:c.id,tab:'progress'});
      for(const d in c.mealLog||{})for(const x of c.mealLog[d])if(x.synced!==false&&x.ts>=since)out.push({ts:x.ts,text:`${c.name} logged a meal that wasn't on the plan.`,id:c.id,tab:'meals',mealDay:d>=mondayOf(today())?weekIdx(d):null})}
    const m=c.messages.filter(x=>x.from==='client'&&x.synced!==false).slice(-1)[0];if(m&&pref(me,'nMsgs'))out.push({ts:m.ts,text:`${c.name} sent you a message.`,id:c.id,tab:'chat'});
    const r=c.readiness[today()];if(r&&r.synced!==false&&readyScore(r)<55&&pref(me,'nEnergy'))out.push({ts:new Date(today()+'T06:00').getTime(),text:`${c.name} has low energy today (${readyScore(r)}/100).`,id:c.id,tab:'workouts'});
  }
  return out.sort((a,b)=>b.ts-a.ts).slice(0,15);
}
const notifOwner=()=>ui.user.role==='client'?client(ui.user.id):coach(ui.user.id);
function appBar(co){
  const read=notifOwner().notifRead||0,n=notifications().filter(x=>x.ts>read).length;
  return `<div class="appbar">${brandMark(co,30)}<span class="appname">${esc(co.business||co.name)}</span>${demoBtn()}<button class="barbtn" data-act="search-open" aria-label="Search" title="Search (Ctrl K)">${SEARCH_ICON}</button><button class="barbtn" data-act="settings-open" aria-label="Settings" title="Settings">${GEAR}</button><button class="barbtn" data-act="notif-open" aria-label="Notifications${n?`, ${n} new`:''}" title="Notifications">${NBELL}${n?`<span class="barcount">${n>9?'9+':n}</span>`:''}</button></div>`;
}
function notifSheet(){
  const list=notifications(),prev=ui.notifPrev||0;
  return `<div class="card hud sheetcard" role="dialog" aria-label="Notifications"><div class="section-hd"><h2>Notifications</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
  ${list.length?`<ul class="notiflist">${list.map((x,i)=>`<li><button class="notifitem ${x.ts>prev?'new':''}" data-act="notif-go" data-i="${i}"><i aria-hidden="true"></i><span><b>${esc(x.text)}</b><small>${fmtTime(x.ts)}</small></span></button></li>`).join('')}</ul>`:'<p class="hint">Nothing yet. New updates will show up here.</p>'}</div>`;
}

/* Settings: each person's own choices */
const GEAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.800l-.1-.1a1.700 1.700 0 0 0-2.900 1.200V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-2.900-1.200l-.1.1a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0-1.200-2.900H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.200-2.900l-.1-.1a2 2 0 1 1 2.800-2.800l.1.1a1.700 1.700 0 0 0 2.900-1.200V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 2.900 1.200l.1-.1a2 2 0 1 1 2.800 2.800l-.1.1a1.700 1.700 0 0 0 1.200 2.900h.1a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/></svg>'.replace(/(\d\.\d)00/g,'$1');
const PREFS={ciDay:4,ciRemind:true,autoTimer:true,extraRest:true,vibrate:true,energyAsk:true,nRoutine:true,nMeals:true,nMsgs:true,missAfter:3,defaultRest:90,showSummary:true,nWorkouts:true,nNotes:true,nEnergy:true,nJoins:true};
// reads one setting for a person, or the default above if they never changed it
function pref(o,k){const v=o&&o.prefs?o.prefs[k]:undefined;return v===undefined?PREFS[k]:v}
// the Settings page. tog = on/off switch, sel = dropdown, link = row that opens something
function settingsView(){
  const coachSide=ui.user.role==='coach',o=notifOwner(),past=coachSide?S.clients.filter(c=>c.coachId===o.id&&c.archived).length:0;
  const tog=(k,l,d)=>`<label class="optrow"><span><b>${l}</b>${d?`<small>${d}</small>`:''}</span><input type="checkbox" id="p-${k}" data-pref="${k}" ${pref(o,k)?'checked':''}></label>`;
  const sel=(k,l,d,opts)=>`<label class="optrow"><span><b>${l}</b>${d?`<small>${d}</small>`:''}</span><select id="p-${k}" data-pref="${k}" class="optsel">${opts.map(([v,t])=>`<option value="${v}" ${+pref(o,k)===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
  const link=(act,l,val,v='')=>`<button class="optrow optlink" data-act="${act}" ${v?`data-v="${v}"`:''}><span><b>${l}</b></span><span class="optval">${esc(val)} <i aria-hidden="true">›</i></span></button>`;
  const group=(t,rows)=>`<section class="optgroup"><h3>${t}</h3><div class="optcard">${rows}</div></section>`;
  const themeName=(THEMES.find(x=>x[0]===themeOf())||THEMES[0])[1];
  const head=`${backBtn(coachSide?'clients':'today','Back','settings-back')}<header class="hd"><h1>Settings</h1></header>`;
  if(coachSide)return head+`<form class="card hud" data-form="coach-profile"><h3>Profile</h3><label class="logodrop" for="set-logo">${o.logo?`<img src="${o.logo}" alt="Your logo">`:`<span class="mono">${initials(o.business||o.name)}</span>`}<span>${o.logo?'Change logo':'Add a logo'}</span><input type="file" id="set-logo" accept="image/*" data-setlogo></label>
    <div class="row2"><label>Your name<input id="set-name" name="name" value="${esc(o.name)}" required maxlength="40"></label><label>Business name<input id="set-biz" name="business" value="${esc(o.business||'')}" maxlength="40"></label></div><button class="btn">Save profile</button></form>`
    +group('Appearance',link('theme-open','Theme',themeName))
    +group('App',link('install-open','Add to home screen',isInstalled()?'Installed':''))
    +group('Clients',sel('missAfter','Flag a client in red after','Days without a workout, once they have also missed a planned one.',[[2,'2 days'],[3,'3 days'],[5,'5 days'],[7,'7 days']])+tog('showSummary','Weekly summary on Clients page','')+sel('defaultRest','Default rest for new exercises','You can still change it on each exercise.',[[60,'1:00'],[90,'1:30'],[120,'2:00'],[180,'3:00']]))
    +group('Check-ins',sel('ciDay','Check-in day','Clients see a reminder from this day until they send it.',[[4,'Friday'],[5,'Saturday'],[6,'Sunday'],[0,'Monday']]))
    +group('Notifications',tog('nWorkouts','Finished workouts','')+tog('nNotes','Check-ins, notes and swaps','Weekly check-ins, form checks, workout notes, swaps and off-plan meals.')+tog('nMsgs','New messages','')+tog('nEnergy','Low energy days','')+tog('nJoins','Accepted invites',''))
    +group('Your data',link('export-data','Download a backup','')+(past?link('show-past','Past clients',String(past),'clients'):''));
  const r=o.reminder||{on:false,time:'07:00'};
  const pic=`<label class="optrow optlink" for="my-pic"><span class="pic-row">${avatarOf(o)}<b>Profile picture</b></span><span class="optval">${o.avatar?'Change':'Add'} <i aria-hidden="true">›</i></span><input type="file" id="my-pic" accept="image/*" data-mypic hidden></label>`+(o.avatar?`<button class="optrow optlink" data-act="pic-remove"><span><b>Remove picture</b></span></button>`:'');
  return head+group('Profile',pic+link('edit-myname','Your name',myName(o)))
    +group('Appearance',link('theme-open','Theme',themeName))
    +group('App',link('install-open','Add to home screen',isInstalled()?'Installed':''))
    +group('Workouts',link('rem-open','Workout reminders',r.on?fmt12(r.time):'Off')+tog('autoTimer','Start rest timer automatically','Starts after you confirm a set.')+tog('extraRest','Longer rests on tired days','Adds 30 to 60 seconds when your energy check is low.')+tog('vibrate','Vibrate when rest ends','')+tog('energyAsk','Ask how I feel before training','The daily energy check.'))
    +group('Check-ins',tog('ciRemind','Remind me to check in','A small reminder on Today, once a week.'))
    +group('Notifications',tog('nRoutine','Routine changes','')+tog('nMeals','Meal plan changes','')+tog('nMsgs','New messages',''))
    +group('Your coach',link('nav',`Message ${esc(first(coach(o.coachId).name))}`,'','chat'))
    +group('Your data',link('export-data','Download my data',''));
}
