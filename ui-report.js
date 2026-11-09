/* ui-report.js: the coach's report on one client.
   reportData() does all the counting first (workouts done, strength, weight...),
   then the chart functions turn those numbers into pictures with a plain headline on top. */
// does all the counting for one client over a chosen period. The charts below just draw what this returns
function reportData(c,weeksBack){
  const T=today(),logs=visLogs(c).slice().sort((a,b)=>a.finishedAt-b.finishedAt);
  const firstDate=[c.plan&&c.plan.startDate,logs[0]&&logs[0].date].filter(Boolean).sort()[0]||T;
  let start=weeksBack?addDays(mondayOf(T),-7*(weeksBack-1)):mondayOf(firstDate);
  if(start<mondayOf(firstDate))start=mondayOf(firstDate);
  const inRange=logs.filter(l=>l.date>=start&&l.date<=T);
  // go week by week: what was planned, what got done, how heavy, how hard it felt
  const weeks=[];const missedBy={};let planned=0,done=0;
  for(let w=start;w<=T;w=addDays(w,7)){
    const wk={start:w,planned:0,done:0,missed:0,vol:0,rpe:[],ready:[]};
    for(let i=0;i<7;i++){
      const d=addDays(w,i);if(d>T)break;
      const inf=dayAt(c,d),train=inf.day&&!inf.day.rest,did=inRange.some(l=>l.date===d);
      if(train&&(d<T||did)){wk.planned++;if(!did){wk.missed++;{const key=dayLabel(weekIdx(d),inf.day);missedBy[key]=(missedBy[key]||0)+1}}}
      const rd=c.readiness[d];if(rd&&rd.synced!==false)wk.ready.push(readyScore(rd));
    }
    for(const l of inRange.filter(l=>l.date>=w&&l.date<addDays(w,7))){wk.done++;if(l.rpe)wk.rpe.push(l.rpe);for(const e of l.entries)for(const s of e.sets)if(hasW(s.w))wk.vol+=(+s.w)*(+s.r||0)}
    wk.vol=Math.round(wk.vol);planned+=wk.planned;done+=Math.min(wk.done,wk.planned||wk.done);
    weeks.push(wk);
  }
  // strength: for each exercise, compare the first session in the period with the latest one
  const lifts=[];
  for(const id of[...new Set(inRange.flatMap(l=>l.entries.map(e=>e.exId)))]){
    const h=exHistory(c,id).filter(x=>x.date>=start);if(h.length<2)continue;
    const a=h[0],b=h[h.length-1],weighted=a.top!=null&&b.top!=null;
    const from=weighted?a.top:a.reps,to=weighted?b.top:b.reps;if(!from)continue;
    lifts.push({id,name:exById(id).name,from,to,unit:weighted?'kg':'reps',pct:Math.round((to/from-1)*1000)/10,sessions:h.length});
  }
  lifts.sort((x,y)=>y.pct-x.pct);
  const ws=visW(c).filter(w=>w.date>=start);
  const pts=inRange.reduce((n,l)=>n+(l.prs?l.prs.length:0),0);
  // meals: how many planned meals got ticked off
  let mealsPlanned=0,mealsTicked=0;
  if(c.meals)for(let d=c.meals.since&&c.meals.since>start?c.meals.since:start;d<=T;d=addDays(d,1)){const md=c.meals.days[weekIdx(d)];if(!md)continue;const tk=Object.values(c.mealTicks[d]||{}).filter(x=>x.synced!==false).length;if(d<T||tk){mealsPlanned+=md.meals.length;mealsTicked+=tk}}
  const allRpe=inRange.map(l=>l.rpe).filter(Boolean),allReady=weeks.flatMap(w=>w.ready);
  return{start,weeks,planned,done,missedBy,lifts,ws,inRange,prCount:pts,mealsPlanned,mealsTicked,
    attendance:planned?Math.round(done/planned*100):null,
    avgRpe:allRpe.length?Math.round(allRpe.reduce((a,b)=>a+b,0)/allRpe.length*10)/10:null,
    avgReady:allReady.length?Math.round(allReady.reduce((a,b)=>a+b,0)/allReady.length):null,
    bwChange:ws.length>1?Math.round((ws[ws.length-1].kg-ws[0].kg)*10)/10:null,
    up:lifts.filter(l=>l.pct>0).length,down:lifts.filter(l=>l.pct<0).length,flat:lifts.filter(l=>l.pct===0).length,
    medianPct:lifts.length?lifts.map(l=>l.pct).sort((a,b)=>a-b)[Math.floor(lifts.length/2)]:null};
}
const pctText=p=>p==null?'–':`${p>0?'+':p<0?'−':''}${Math.abs(p)}%`;
/* Each chart starts with the answer in big text ("12 of 14 workouts done"), then the picture underneath */
const gcHead=(big,text,word='',tone='')=>`<div class="gc-h"><div><b class="mono">${big}</b><span>${text}</span></div>${word?`<span class="pill ${tone}">${word}</span>`:''}</div>`;
function wkLab(c,w,many,nowWord='this week'){
  const n=weekName(c,w.start),now=w.start===mondayOf(today());
  if(many)return[now?'now':n?n.replace('Week ',''):fmtShort(w.start).split(' ')[0],''];
  return[n||fmtShort(w.start),now?nowWord:n?fmtShort(w.start):''];
}
const gcX=([a,b],on)=>`<span class="gc-x ${on?'on':''}"><b>${a}</b>${b?`<small>${b}</small>`:''}</span>`;
// one column per week, one block per planned workout: filled = done, ✕ = missed
function consistencyChart(c,R){
  const rows=R.weeks.map(w=>({w,cw:clientWeek(c,w.start)})).filter(x=>x.cw.days.length||x.w.done).slice(-12);
  if(!rows.length)return '<p class="hint">No workouts planned in this period.</p>';
  const pct=R.attendance,many=rows.length>6,word=pct>=90?['Excellent','ok']:pct>=75?['Good','ok']:pct>=50?['Slipping','warn']:['Needs a check-in','bad'];
  const kind=d=>d.state==='done'?'done':d.state==='missed'?'miss':'next',seen=new Set(rows.flatMap(r=>r.cw.days.map(kind)));
  const h=Math.min(30,(136-3*(Math.max(...rows.map(r=>r.cw.days.length))-1))/Math.max(...rows.map(r=>r.cw.days.length)));
  const order={done:0,miss:1,next:2};
  return `<div class="chart gc">${gcHead(`${R.done} of ${R.planned}`,'planned workouts done',word[0],word[1])}
  <div class="gc-cols" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr))">${rows.map(({w,cw})=>`<button class="gc-col" data-act="rep-week" data-v="${w.start}" title="${cw.done} of ${cw.days.length} workouts done" aria-label="${weekName(c,w.start)||fmtShort(w.start)}: ${cw.done} of ${cw.days.length} workouts done. Open in the calendar"><span class="gc-n mono">${many?cw.done:`${cw.done} of ${cw.days.length}`}</span><span class="gc-stack">${cw.days.map(kind).sort((a,b)=>order[a]-order[b]).map(k=>`<i class="${k}" style="height:${h}px">${k==='miss'?'✕':''}</i>`).join('')}</span>${gcX(wkLab(c,w,many),w.start===mondayOf(today()))}</button>`).join('')}</div>
  <div class="legend">${seen.has('done')?'<span><i class="tok done"></i>Done</span>':''}${seen.has('miss')?'<span><i class="tok miss">✕</i>Not logged</span>':''}${seen.has('next')?'<span><i class="tok next"></i>Coming up</span>':''}<span class="gc-tap">Tap a week for details</span></div></div>`;
}
// total kilograms lifted each week (weight × reps, added up)
function volumeChart(c,R){
  const rows=R.weeks.filter(w=>w.vol).map(w=>({w,v:w.vol})).slice(-12);
  if(!rows.length)return '<p class="hint">No weights logged in this period.</p>';
  const mon=mondayOf(today()),full=rows.filter(r=>r.w.start!==mon),total=rows.reduce((n,r)=>n+r.v,0),many=rows.length>6,max=Math.max(...rows.map(r=>r.v));
  let head=gcHead(`${total.toLocaleString()} kg`,'lifted in this period');
  // A first week with only a workout or two would make any change look huge, so compare real training weeks
  const most=Math.max(0,...full.map(r=>r.w.done)),real=full.filter(r=>r.w.done>=most/2);
  if(real.length>1){const a=real[0].v,b=real[real.length-1].v,p=Math.round((b/a-1)*100);head=p>=3?gcHead(`Up ${p}%`,'more weight per week over this period','Getting stronger','ok'):p<=-3?gcHead(`Down ${-p}%`,'less weight per week over this period','Lifting less','warn'):gcHead('Steady','about the same weight each week')}
  const lab=(r,i)=>!many||i===0||i===rows.length-1||r.v===max;
  return `<div class="chart gc">${head}<p class="gc-cap">Kilograms lifted each week. Taller means more.</p>
  <div class="gc-cols" style="grid-template-columns:repeat(${rows.length},minmax(0,1fr))">${rows.map((r,i)=>{const now=r.w.start===mon;return `<div class="gc-col" title="${r.v.toLocaleString()} kg"><span class="gc-n mono">${lab(r,i)?(many?(r.v/1000).toFixed(1)+'k':r.v.toLocaleString()):''}</span><span class="gc-bar ${now?'cur':''}" style="height:${Math.max(3,r.v/max*136)}px"></span>${gcX(wkLab(c,r.w,many,'so far'),now)}</div>`}).join('')}</div></div>`;
}
/* A line chart with labelled bands behind it ("Easy", "Hard"...), so you can read it without knowing the numbers */
function zoneChart(points,bands,top,avg,label,suffix=''){
  const W=340,H=196,pl=8,gut=62,pt=24,pb=38,vals=points.map(p=>p.v),lo=Math.max(bands[0][0],Math.min(bands[1][0]-(top-bands[1][0])*.22,Math.floor(Math.min(...vals)-(top/10))));
  const n=points.length,many=n>6,x=i=>pl+(W-pl-gut)*(i+.5)/n,y=v=>pt+(H-pt-pb)*(1-(v-lo)/(top-lo));
  const bv=Math.max(...vals),line=points.map((p,i)=>`${x(i)},${y(p.v)}`).join(' ');
  const zones=bands.filter(b=>b[1]>lo).map(([a,b,name])=>{const f=Math.max(a,lo),on=avg>=a&&(avg<b||b===top),y1=y(b),y2=y(f);return `<g>${on?`<rect x="${pl}" y="${y1}" width="${W-pl}" height="${y2-y1}" fill="var(--accent-soft)"/>`:''}<line x1="${pl}" x2="${W}" y1="${y2}" y2="${y2}" stroke="var(--line2)"/><text class="zn ${on?'on':''}" x="${W-6}" y="${(y1+y2)/2+3.5}" text-anchor="end">${name}</text></g>`}).join('');
  const lab=(p,i)=>!many||i===0||i===n-1||p.v===bv;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${points.map(p=>`${p.lab[0]} ${p.v}${suffix}`).join(', ')}">
    <line x1="${pl}" x2="${W}" y1="${y(top)}" y2="${y(top)}" stroke="var(--line2)"/>${zones}
    ${n>1?`<polyline class="glowline" points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`:''}
    ${points.map((p,i)=>`<g class="hov"><title>${p.lab[0]}: ${p.v}${suffix}</title><circle cx="${x(i)}" cy="${y(p.v)}" r="12" fill="transparent"/><circle cx="${x(i)}" cy="${y(p.v)}" r="${i===n-1?5.5:4}" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/></g>${lab(p,i)?`<text class="val ${i===n-1?'now':''}" x="${x(i)}" y="${y(p.v)-11}" text-anchor="middle">${p.v}</text>`:''}<text class="wk ${p.now?'on':''}" x="${x(i)}" y="${H-21}" text-anchor="middle">${p.lab[0]}</text>${p.lab[1]?`<text class="wk2" x="${x(i)}" y="${H-7}" text-anchor="middle">${p.lab[1]}</text>`:''}`).join('')}
  </svg>`;
}
const weekPts=(c,rows)=>rows.map(({w,v})=>({v,lab:wkLab(c,w,rows.length>6),now:w.start===mondayOf(today())}));
function effortChart(c,R){
  const rows=R.weeks.filter(w=>w.rpe.length).map(w=>({w,v:Math.round(w.rpe.reduce((a,b)=>a+b,0)/w.rpe.length*10)/10})).slice(-12);
  if(!rows.length)return '<p class="hint">No effort ratings yet.</p>';
  const a=R.avgRpe,word=a<5?['Easy','']:a<7?['Moderate','']:a<8.5?['Hard','']:['Very hard','warn'];
  return `<div class="chart gc">${gcHead(`${a} / 10`,'average effort, as rated by the client',word[0],word[1])}${zoneChart(weekPts(c,rows),[[0,5,'Easy'],[5,7,'Moderate'],[7,8.5,'Hard'],[8.5,10,'Very hard']],10,a,'Effort each week',' out of 10')}</div>`;
}
function energyChart(c,R){
  const rows=R.weeks.filter(w=>w.ready.length).map(w=>({w,v:Math.round(w.ready.reduce((a,b)=>a+b,0)/w.ready.length)})).slice(-12);
  if(!rows.length)return'';
  const a=R.avgReady,word=a>=75?['Feeling good','ok']:a>=55?['A little tired','warn']:['Often worn out','bad'];
  // One week of check-ins says more day by day than as a single dot
  const days=Object.entries(c.readiness).filter(([d,r])=>d>=R.start&&d<=today()&&r&&r.synced!==false).sort(([x],[y])=>x<y?-1:1).slice(-7);
  const byDay=rows.length<2&&days.length>1;
  const pts=byDay?days.map(([d,r])=>({v:readyScore(r),lab:[WK[weekIdx(d)],fmtShort(d).split(' ')[0]],now:d===today()})):weekPts(c,rows);
  return `<section class="rsec"><h3>Energy check</h3><div class="chart gc">${gcHead(`${a} / 100`,byDay?'average energy this week':'average energy before workouts',word[0],word[1])}${zoneChart(pts,[[0,55,'Worn out'],[55,75,'Tired'],[75,100,'Good']],100,a,'Energy check',' out of 100')}</div></section>`;
}
function strengthBars(lifts){
  if(!lifts.length)return `<p class="hint">Needs at least two sessions of a lift in this period.</p>`;
  // full name on top, bar underneath. The zero line sits in the middle only when some lift went down
  const m=Math.max(5,...lifts.map(l=>Math.abs(l.pct))),neg=lifts.some(l=>l.pct<0),half=neg?50:100;
  return `<ul class="sbars ${neg?'twoway':''}">${lifts.map(l=>{const w=Math.abs(l.pct)/m*half;return `<li title="${esc(l.name)}: ${l.from} → ${l.to} ${l.unit} over ${l.sessions} sessions">
    ${thumb(exById(l.id))}<span class="sb-name">${esc(l.name)}</span>
    <span class="sb-val mono ${l.pct<0?'down':''}">${l.pct>0?'▲':l.pct<0?'▼':'●'} ${pctText(l.pct)}</span>
    <span class="sb-track"><span class="sb-zero"></span>${l.pct?`<span class="sb-bar ${l.pct<0?'neg':''}" style="${l.pct<0?'right:50%':`left:${neg?50:0}%`};width:${w}%"></span>`:''}</span>
    <small class="sb-sub mono">${kg(l.from)} → ${kg(l.to)} ${l.unit}</small></li>`}).join('')}</ul>`;
}
// the "key points" list: the most useful facts, in plain sentences
function highlights(c,R){
  const out=[];const name=first(c.name);
  if(R.attendance!=null)out.push([R.attendance>=80?'up':R.attendance>=60?'flat':'down',`Did <b>${R.done} of ${R.planned}</b> planned workouts (${R.attendance}%).`]);
  const worst=Object.entries(R.missedBy).sort((a,b)=>b[1]-a[1])[0];
  if(worst)out.push(['down',`Most often missed: <b>${esc(worst[0])}</b> (${worst[1]} time${worst[1]>1?'s':''}).`]);
  if(R.lifts.length){const b=R.lifts[0];if(b.pct>0)out.push(['up',`Biggest gain: <b>${esc(b.name)}</b>, ${kg(b.from)} → ${kg(b.to)} ${b.unit} (${pctText(b.pct)}).`]);
    const w=R.lifts[R.lifts.length-1];if(w.pct<0)out.push(['down',`Went down: <b>${esc(w.name)}</b>, ${kg(w.from)} → ${kg(w.to)} ${w.unit} (${pctText(w.pct)}).`]);
    const flat=R.lifts.filter(l=>l.pct===0);if(flat.length)out.push(['flat',`No change yet on ${flat.slice(0,3).map(l=>`<b>${esc(l.name)}</b>`).join(', ')}${flat.length>3?` and ${flat.length-3} more`:''}.`]);}
  if(R.prCount)out.push(['up',`${R.prCount} personal best${R.prCount>1?'s':''} set.`]);
  if(R.bwChange!=null)out.push(['flat',`Body weight ${R.bwChange===0?'unchanged':R.bwChange<0?`down ${Math.abs(R.bwChange)} kg`:`up ${R.bwChange} kg`} (goal: ${esc(c.goal||'not set')}).`]);
  if(R.mealsPlanned)out.push([R.mealsTicked/R.mealsPlanned>=.8?'up':'flat',`Ticked <b>${R.mealsTicked} of ${R.mealsPlanned}</b> planned meals (${Math.round(R.mealsTicked/R.mealsPlanned*100)}%).`]);
  if(R.avgReady!=null&&R.avgReady<60)out.push(['down',`Energy check has been low (average ${R.avgReady}/100). Ask ${esc(name)} about sleep and stress.`]);
  const st=streak(c);if(st>2)out.push(['up',`On a streak of ${st} workouts in a row.`]);
  return `<ul class="hl">${out.map(([k,t])=>`<li class="${k}"><span aria-hidden="true">${k.startsWith('up')?'▲':k.startsWith('down')?'▼':'●'}</span><p>${t}</p></li>`).join('')}</ul>`;
}
// one client's report: period chips, tabs (Overview, Strength, Body, Calendar), then the charts
function reportView(c){
  const range=ui.repRange??4,R=reportData(c,range),tab=ui.repTab||'overview';
  if(!visLogs(c).length)return `<div class="card hud empty"><h2>No workouts yet</h2><p class="muted">The report fills in after ${esc(first(c.name))} logs their first workout. It will show consistency, strength changes, body weight, effort and a full workout history.</p></div>`;
  const tile=(label,val,sub,cls='')=>`<div class="tile hud ${cls}"><small>${label}</small><b class="mono">${val}</b><i>${sub}</i></div>`;
  const tabs=[['overview','Overview'],['strength','Strength'],['body','Body'],['history','Calendar']];
  const period=`<div class="repperiod"><div class="chips" role="group" aria-label="Report period">${[[4,'Last 4 weeks'],[12,'Last 12 weeks'],[0,'Since start']].map(([v,l])=>`<button class="chip ${range===v?'on':''}" data-act="rep-range" data-v="${v}">${l}</button>`).join('')}</div><p class="hint">${fmtDate(R.start)} to today · ${R.inRange.length} workout${R.inRange.length===1?'':'s'} logged</p></div>`;
  let body='';
  if(tab==='overview')body=`
    <div class="rtiles">
      ${tile('Workouts done',R.attendance==null?'–':R.attendance+'%',`${R.done} of ${R.planned} planned`,R.attendance!=null&&R.attendance<60?'alert':'')}
      ${tile('Strength',pctText(R.medianPct),R.lifts.length?`typical lift · ${R.up} up, ${R.down} down`:'not enough data yet',R.medianPct<0?'alert':'')}
      ${tile('Body weight',R.bwChange==null?'–':(R.bwChange>0?'+':R.bwChange<0?'−':'')+Math.abs(R.bwChange)+'<i>kg</i>',R.ws.length?`now ${kg(R.ws[R.ws.length-1].kg)} kg`:'no weigh-ins')}
      ${tile('Effort',R.avgRpe??'–',R.avgRpe?'average out of 10':'not rated yet')}
    </div>
    <section class="rsec"><h3>Key points</h3>${highlights(c,R)}</section>
    <section class="rsec"><h3>Consistency</h3>${consistencyChart(c,R)}</section>
    <section class="rsec"><h3>How hard workouts felt</h3>${effortChart(c,R)}</section>
    ${energyChart(c,R)}`;
  else if(tab==='strength'){const all=ui.strAll,shown=all?R.lifts:R.lifts.slice(0,6);body=`
    <section class="rsec"><h3>Strength by exercise</h3><p class="hint">Start of the period compared with the latest session.</p>${strengthBars(shown)}
    ${R.lifts.length>6?`<button class="morebtn" data-act="str-all">${all?'Show top 6 only ▴':`Show all ${R.lifts.length} exercises ▾`}</button>`:''}</section>
    <section class="rsec"><h3>Total weight lifted</h3>${volumeChart(c,R)}</section>`}
  else if(tab==='body')body=`
    <section class="rsec"><h3>Body weight</h3>${R.ws.length?weightChart(R.ws,R.bwChange!=null?gcHead(`${R.bwChange>0?'+':R.bwChange<0?'−':''}${Math.abs(R.bwChange)} kg`,`in this period · now ${kg(R.ws[R.ws.length-1].kg)} kg`):''):'<p class="hint">No weigh-ins in this period.</p>'}</section>
    <section class="rsec"><h3>Body measurements</h3><p class="hint">Centimetres, from check-ins.</p>${measurementsView(c,'coach')}</section>
    <section class="rsec"><h3>Progress photos</h3>${photosHistory(c.photos.filter(p=>p.synced!==false))}</section>`;
  else body=calendarView(c);
  return `${tab==='history'?'':period}
  <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${k===tab}" class="${k===tab?'on':''}" data-act="rep-tab" data-v="${k}">${l}</button>`).join('')}</div>
  ${body}`;
}

/* The Reports tab: the weekly summary, or one client's full report */
function reportsView(co){
  const mine=S.clients.filter(c=>c.coachId===co.id&&!c.archived&&!isInvited(c));
  const c=ui.repClient&&mine.find(x=>x.id===ui.repClient);
  if(c)return `${backBtn('reports','All reports')}
    <header class="hd"><p class="eyebrow">Report</p><h1>${esc(c.name)}</h1><p class="sub">${esc(c.goal||'')}</p></header>${reportView(c)}`;
  return `<header class="hd"><h1>Reports</h1></header>
  ${weeklySummaryView(co)}`;
}
