/* Spotter: client calendar. Each day shows its status at a glance; tap a day or a week for the detail. */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthOf=d=>d.slice(0,7);
function shiftMonth(m,n){const[y,mo]=m.split('-').map(Number),x=new Date(y,mo-1+n,1);return iso(x).slice(0,7)}
function dayStatus(c,d){
  const T=today(),logs=visLogs(c).filter(l=>l.date===d),inf=dayAt(c,d),train=inf.day&&!inf.day.rest;
  if(logs.length)return{key:'done',logs,inf};
  if(d<progStart(c))return{key:'before',logs,inf};
  if(train)return{key:d<T?'notlogged':d===T?'today':'planned',logs,inf};
  return{key:inf.day?'rest':'none',logs,inf};
}
const CAL_LABEL={done:'Workout done',notlogged:'Not logged',today:'Planned for today',planned:'Planned',rest:'Rest day',before:'Before the program started',none:'Nothing planned'};
function calendarView(c){
  const T=today(),cal=ui.cal||(ui.cal={month:monthOf(T),day:T,week:null}),[y,m]=cal.month.split('-').map(Number);
  const firstD=cal.month+'-01',lastD=iso(new Date(y,m,0)),minM=monthOf(progStart(c)),maxM=shiftMonth(monthOf(T),1);
  const rows=[];
  for(let mon=mondayOf(firstD);mon<=lastD;mon=addDays(mon,7)){
    const wn=progWeek(c,mon);
    const cells=Array.from({length:7},(_,i)=>{const d=addDays(mon,i);if(monthOf(d)!==cal.month)return'<span class="calcell blank"></span>';
      const s=dayStatus(c,d),mark=s.key==='done'?'✓':s.key==='notlogged'?'✕':s.key==='today'||s.key==='planned'?'•':'';
      return `<button class="calcell ${s.key} ${d===T?'istoday':''} ${d===cal.day?'sel':''}" data-act="cal-day" data-v="${d}" aria-label="${fmtDate(d)}: ${CAL_LABEL[s.key]}" aria-pressed="${d===cal.day}"><b>${+d.slice(8)}</b><i aria-hidden="true">${mark}</i></button>`}).join('');
    rows.push(`<div class="calrow">${wn>=1?`<button class="calwk ${cal.week===mon?'sel':''}" data-act="cal-week" data-v="${mon}" aria-label="Week ${wn} summary">${wn}</button>`:'<span class="calwk blank"></span>'}${cells}</div>`);
  }
  return `<div class="calcard"><div class="calhead"><button class="icon-btn" data-act="cal-month" data-v="-1" aria-label="Previous month" ${cal.month<=minM?'disabled':''}>‹</button><h3>${MONTHS[m-1]} ${y}</h3><button class="icon-btn" data-act="cal-month" data-v="1" aria-label="Next month" ${cal.month>=maxM?'disabled':''}>›</button></div>
    <div class="calrow caldow"><span>WK</span>${WK.map(w=>`<span>${w.slice(0,1)}</span>`).join('')}</div>${rows.join('')}
    <div class="callegend"><span><i class="ok">✓</i>Done</span><span><i class="bad">✕</i>Not logged</span><span><i>•</i>Planned</span><span>Tap a week number for its summary</span></div></div>
  ${cal.week?calWeekPanel(c,cal.week):cal.day?calDayPanel(c,cal.day):'<p class="hint">Tap a day to see what happened.</p>'}`;
}
function calWeekPanel(c,mon){
  const w=clientWeek(c,mon),bits=[`${w.done} of ${w.planned} workouts done`];
  if(w.notes.length)bits.push(`${w.notes.length} note${w.notes.length>1?'s':''}`);
  if(w.swaps.length)bits.push(`${w.swaps.length} swap${w.swaps.length>1?'s':''}`);
  if(w.prs.length)bits.push(`${w.prs.length} personal best${w.prs.length>1?'s':''}`);
  if(w.energy!=null)bits.push(`energy ${w.energy}/100`);
  const st={done:'✓ Done',missed:'✕ Not logged',today:'Today',upcoming:'Planned'};
  return `<section class="card hud calpanel"><div><p class="eyebrow">Week ${progWeek(c,mon)} · ${weekRange(mon)}</p><h2>${w.planned?bits[0]:'No workouts due yet'}</h2>${bits.length>1?`<p class="hint">${bits.slice(1).join(' · ')}</p>`:''}</div>
    ${w.days.length?`<ul class="calweekdays">${w.days.map(x=>`<li class="${x.state}"><button data-act="cal-day" data-v="${x.d}"><span class="mono">${WK[weekIdx(x.d)].toUpperCase()}</span><span>${esc(x.title)}</span><span class="cw-state">${st[x.state]}</span></button></li>`).join('')}</ul>`:'<p class="hint">No training days this week.</p>'}</section>`;
}
function calDayPanel(c,d){
  const s=dayStatus(c,d),wn=weekName(c,d),who=esc(first(c.name)),day=s.inf.day;
  const planned=()=>day&&day.exercises.length?`<ul class="caldex">${day.exercises.map(r=>{const e=exById(r.exId),w=weightText(r,d,s.inf.plan);return `<li>${thumb(e)}<span><b>${esc(e.name)}</b><small>${repsText(r.sets,r.reps)}${w?` · ${w}`:''}</small></span></li>`}).join('')}</ul>`:'';
  let title=CAL_LABEL[s.key],msg='',body='';
  if(s.key==='done'){title=s.logs[0].dayName.split(' · ').pop();
    body=s.logs.map(l=>{const skipped=day&&!day.rest?day.exercises.filter(r=>!l.entries.some(e=>e.exId===r.exId||e.swappedFrom===r.exId)):[];
      return `<p class="hint">Finished at ${fmtClock(l.finishedAt)}${l.durationMin?` · ${l.durationMin} min`:''}${l.rpe?` · effort ${l.rpe}/10`:''}</p>
      <ul class="caldex">${l.entries.map(e=>`<li>${thumb(exById(e.exId))}<span><b>${esc(exById(e.exId).name)}${(l.prs||[]).includes(e.exId)?' <i class="auto">PB</i>':''}${swappedLabel(e)}</b><small>${setsText(e.sets)}</small></span></li>`).join('')}</ul>${logNotes(l)}
      ${skipped.length?`<p class="hint">Not done: ${skipped.map(r=>esc(exById(r.exId).name)).join(', ')}.</p>`:''}`}).join('')}
  else if(s.key==='notlogged'){title=`Not logged: ${dayTitle(day)}`;msg=`${who} didn't log this workout. They may have skipped it or forgotten to log it.`;body=planned()}
  else if(s.key==='today'){title=dayTitle(day);msg='Planned for today. Not logged yet.';body=planned()}
  else if(s.key==='planned'){title=dayTitle(day);msg='Coming up.';body=planned()}
  else if(s.key==='before')msg=`${who}'s program hadn't started yet.`;
  else if(s.key==='rest'&&d<=today())msg='Nothing was planned, and no workout was logged.';
  const extra=[];
  const r=c.readiness[d];if(r&&r.synced!==false)extra.push(['Energy check',`${readyScore(r)}/100 · sleep ${r.sleep}/5, energy ${r.energy}/5, soreness ${r.sore}/5`]);
  if(c.meals&&d<=today()&&(!c.meals.since||d>=c.meals.since)){const md=c.meals.days[weekIdx(d)],n=md?md.meals.length:0,t=Object.values(c.mealTicks[d]||{}).filter(x=>x.synced!==false).length;if(n)extra.push(['Meals',`${Math.min(t,n)} of ${n} planned meals eaten`])}
  const wg=visW(c).find(x=>x.date===d);if(wg)extra.push(['Body weight',`${kg(wg.kg)} kg`]);
  const ms=(c.measures||[]).find(x=>x.date===d&&x.synced!==false);if(ms)extra.push(['Measurements',MEAS.filter(([k])=>hasW(ms[k])).map(([k,l])=>`${l} ${kg(ms[k])} cm`).join(' · ')]);
  const ph=c.photos.filter(p=>p.date===d&&p.synced!==false);
  return `<section class="card hud calpanel"><div><p class="eyebrow">${fmtDate(d)}${wn?` · ${wn}`:''}</p><h2>${esc(title)}</h2>${msg?`<p class="hint">${msg}</p>`:''}</div>${body}
    ${extra.length?`<dl class="calextra">${extra.map(([a,b])=>`<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>`:''}
    ${ph.length?photosHistory(ph):''}</section>`;
}
