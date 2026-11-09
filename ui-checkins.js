/* ui-checkins.js: four features that came later.
   1. weekly check-in   2. form-check videos   3. meals that weren't on the plan   4. adding the app to your home screen */

/* ---------- weekly check-in ---------- */
/* One per week (c.checkins, keyed by its Monday). Weight and measurements also go to the usual history. */
const ciOf=(c,mon)=>(c.checkins||[]).find(x=>x.week===mon);
// "vis" = the coach can see it (it's not stuck offline). toAnswer = how many still need a reply from the coach
const visCi=c=>(c.checkins||[]).filter(x=>x.synced!==false).sort((a,b)=>b.ts-a.ts);
const visFc=c=>(c.formChecks||[]).filter(x=>x.synced!==false).sort((a,b)=>b.ts-a.ts);
const toAnswer=c=>visCi(c).filter(x=>!x.reply).length+visFc(c).filter(x=>!x.reply).length;
// The check-in is due from the coach's chosen day (Friday unless they change it), and only if not sent yet
const ciDue=c=>!ciOf(c,mondayOf(today()))&&weekIdx(today())>=pref(coach(c.coachId),'ciDay');
const SCALE5={sleep:['poor','great'],stress:['calm','very stressed']};
const CAM='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6.5" width="13" height="11" rx="1.5"/><path d="M16 10.5l5-3v9l-5-3"/></svg>';
function ciFacts(c,ci){
  const prev=(c.checkins||[]).filter(x=>x.week<ci.week&&hasW(x.kg)).sort((a,b)=>a.week<b.week?1:-1)[0];
  const d=prev&&hasW(ci.kg)?Math.round((ci.kg-prev.kg)*10)/10:null;
  return `<dl class="ci-facts"><div><dt>Weight</dt><dd class="mono">${hasW(ci.kg)?kg(ci.kg):'–'}<small> kg${d?` · ${d>0?'+':'−'}${kg(Math.abs(d))}`:''}</small></dd></div><div><dt>Sleep</dt><dd class="mono">${ci.sleep||'–'}<small>/5</small></dd></div><div><dt>Stress</dt><dd class="mono">${ci.stress||'–'}<small>/5</small></dd></div></dl>`;
}
// the client's check-in form, or a summary of it once it's sent
function checkinCard(c){
  const T=today(),ci=ciOf(c,mondayOf(T)),cn=esc(first(coach(c.coachId).name)),f=ui.ci;
  if(ci&&!f)return `<section class="card hud ci"><div class="section-hd"><h3>Weekly check-in</h3><span class="pill ok">Sent ${ci.date===T?'today':fmtShort(ci.date)}</span></div>
    ${ciFacts(c,ci)}${ci.note?`<p class="ci-note">“${esc(ci.note)}”</p>`:''}
    ${ci.reply?`<div class="coachnote"><span class="eyebrow">${cn} replied</span><p>${esc(ci.reply.text)}</p></div>`:`<p class="hint">${ci.synced===false?`Saved on this phone. ${cn} gets it when you're back online.`:`${cn} will reply here.`}</p>`}
    <button class="linkbtn" data-act="ci-edit">Edit</button></section>`;
  const v=f||{},last=c.weights.slice().sort((a,b)=>a.date<b.date?-1:1).slice(-1)[0],todays=c.photos.filter(p=>p.date===T);
  const q=(k,lab)=>`<div class="rq"><span>${lab}</span><div class="seg5">${[1,2,3,4,5].map(n=>`<button type="button" class="${v[k]===n?'on':''}" data-act="ci-set" data-k="${k}" data-v="${n}" aria-pressed="${v[k]===n}" aria-label="${lab}: ${n} of 5">${n}</button>`).join('')}</div><small><span>1 = ${SCALE5[k][0]}</span><span>5 = ${SCALE5[k][1]}</span></small></div>`;
  const lastM=k=>{const x=(c.measures||[]).filter(m=>hasW(m[k])).slice(-1)[0];return x?kg(x[k]):'cm'};
  return `<form class="card hud ci" data-form="checkin"><div><div class="section-hd"><h3>Weekly check-in</h3>${ciDue(c)?'<span class="pill acc">Due</span>':''}</div><p class="hint">About two minutes, once a week. ${cn} reads it and replies here.</p></div>
    <label class="ci-kg">Weight (kg)<input id="ci-kg" data-ci="kg" inputmode="decimal" value="${esc(v.kg||'')}" placeholder="${last?kg(last.kg):'75.0'}"></label>
    ${q('sleep','Sleep this week')}${q('stress','Stress this week')}
    <label>How did the week go?<textarea id="ci-note" data-ci="note" rows="3" placeholder="Wins, struggles, anything ${cn} should know">${esc(v.note||'')}</textarea></label>
    <div class="ci-more"><button type="button" class="linkbtn" data-act="toggle-meas" aria-expanded="${!!ui.showMeas}">${ui.showMeas?'− Measurements':'+ Measurements'}</button><button type="button" class="linkbtn" data-act="toggle-photos" aria-expanded="${!!ui.showPhotos}">${ui.showPhotos?'− Photos':`+ Photos${todays.length?` (${todays.length})`:''}`}</button></div>
    ${ui.showMeas?`<div class="measgrid">${MEAS.map(([k,l])=>`<label>${l} (cm)<input id="m-${k}" data-ci="m_${k}" inputmode="decimal" value="${esc(v['m_'+k]||'')}" placeholder="${lastM(k)}"></label>`).join('')}</div><p class="hint">Measure in the morning, at the same spot each time: waist at the belly button, hips at the widest point.</p>`:''}
    ${ui.showPhotos?`<div class="slots">${['front','side','back'].map(a=>{const p=todays.find(x=>x.angle===a);return `<label class="slot" for="ph-${a}">${p?`<img src="${p.src}" alt="">`:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'}<span>${p?'Replace ':'Add '}${a}</span><input type="file" accept="image/*" id="ph-${a}" data-photo="${a}"></label>`}).join('')}</div><p class="hint">Same spot, same light. Only you and ${cn} can see them.</p>`:''}
    <div class="btnrow"><button class="btn primary">Send check-in</button>${ci?'<button type="button" class="btn ghost" data-act="ci-cancel">Cancel</button>':''}</div></form>`;
}
/* the newest reply the client hasn't opened Progress for yet */
function newReply(c){
  const rs=[...(c.checkins||[]),...(c.formChecks||[])].filter(x=>x.reply&&x.reply.ts>(c.ciSeen||0));
  return rs.length?rs.sort((a,b)=>b.reply.ts-a.reply.ts)[0]:null;
}
function checkinNudge(c){
  const cn=esc(first(coach(c.coachId).name)),r=newReply(c);
  if(r)return `<button class="invlink nudge" data-act="nav" data-v="progress"><span><b>${cn} replied</b> to your ${r.week?'check-in':`${esc(exById(r.exId).name)} form check`}</span><span class="chev" aria-hidden="true">›</span></button>`;
  if(ciDue(c)&&pref(c,'ciRemind'))return `<button class="invlink nudge" data-act="nav" data-v="progress"><span><b>Weekly check-in</b> · about two minutes</span><span class="chev" aria-hidden="true">›</span></button>`;
  return '';
}
function mealsPct(c,mon){
  if(!c.meals)return null;let n=0,t=0;const T=today();
  for(let i=0;i<7;i++){const d=addDays(mon,i);if(d>T||(c.meals.since&&d<c.meals.since))continue;const md=c.meals.days[i];if(!md)continue;
    const tk=Object.values(c.mealTicks[d]||{}).filter(x=>x.synced!==false).length;if(d<T||tk){n+=md.meals.length;t+=Math.min(tk,md.meals.length)}}
  return n?Math.round(t/n*100):null;
}
const replyBlock=(form,x,who)=>x.reply?`<div class="coachnote"><span class="eyebrow">Your reply</span><p>${esc(x.reply.text)}</p></div>`
  :`<form class="replyform" data-form="${form}" data-id="${x.id}"><textarea name="text" id="rp-${x.id}" rows="2" placeholder="Reply to ${who}" aria-label="Reply to ${who}"></textarea><button class="btn primary sm">Send reply</button></form>`;
/* Coach: everything the client sent, in one tab. Unanswered first, answered weeks fold into one line. */
function coachCheckins(c){
  const cis=visCi(c),fcs=visFc(c),who=esc(first(c.name)),T=today();
  const full=ci=>{const w=clientWeek(c,ci.week),bits=[],mp=mealsPct(c,ci.week),end=addDays(ci.week,6);
    if(w.planned)bits.push(`${w.done} of ${w.planned} workouts`);if(w.energy!=null)bits.push(`energy ${w.energy}/100`);if(mp!=null)bits.push(`${mp}% of meals`);
    const ph=c.photos.filter(p=>p.synced!==false&&p.date>=ci.week&&p.date<=end),ms=(c.measures||[]).filter(m=>m.synced!==false&&m.date>=ci.week&&m.date<=end).slice(-1)[0];
    return `<article class="cicard ${ci.reply?'':'new'}"><div class="section-hd"><div><p class="eyebrow">${weekName(c,ci.week)||'Week'} · ${weekRange(ci.week)}</p><h3>Sent ${ci.date===T?'today':fmtDate(ci.date)}</h3></div>${ci.reply?`<button class="icon-btn" data-act="ci-open" data-id="${ci.id}" aria-label="Fold away">▴</button>`:'<span class="pill acc">New</span>'}</div>
      ${ciFacts(c,ci)}${bits.length?`<p class="hint">From the app: ${bits.join(' · ')}</p>`:''}${ci.note?`<p class="ci-note">“${esc(ci.note)}”</p>`:''}
      ${ms?`<p class="hint">Measurements: ${MEAS.filter(([k])=>hasW(ms[k])).map(([k,l])=>`${l} ${kg(ms[k])} cm`).join(' · ')}</p>`:''}
      ${ph.length?`<div class="ci-pics">${ph.map(p=>`<img src="${p.src}" alt="${p.angle} photo">`).join('')}</div>`:''}
      ${replyBlock('ci-reply',ci,who)}</article>`};
  const row=ci=>`<button class="cirow" data-act="ci-open" data-id="${ci.id}"><span><b>${weekName(c,ci.week)||fmtShort(ci.week)}</b><small>${weekRange(ci.week)}</small></span><span class="mono">${hasW(ci.kg)?`${kg(ci.kg)} kg · `:''}sleep ${ci.sleep} · stress ${ci.stress}</span><span class="chev" aria-hidden="true">▾</span></button>`;
  const shown=ui.ciAll?cis:cis.slice(0,5),first0=cis[0]&&cis[0].id;
  const open=ci=>!ci.reply||ui.ciOpen===ci.id||(ui.ciOpen==null&&ci.id===first0);
  return `<section class="rsec"><h2>Weekly check-ins</h2>${cis.length?`<div class="cilist">${shown.map(ci=>open(ci)?full(ci):row(ci)).join('')}</div>${cis.length>5?`<button class="morebtn" data-act="ci-all">${ui.ciAll?'Show fewer ▴':`Show all ${cis.length} ▾`}</button>`:''}`
    :`<p class="hint">No check-ins yet. ${who} is asked for one at the end of each week.</p>`}</section>
  ${fcs.length?`<section class="rsec"><h2>Form checks</h2><p class="hint">Videos ${who} filmed during a workout.</p>${fcs.slice(0,4).map(fc=>fcCard(c,fc,'coach')).join('')}</section>`:''}`;
}

/* ---------- form-check videos ---------- */
/* Videos are too big for the app's saved data, so they live in the browser's video store (IndexedDB) by id */
const VDB={p:null,
  open(){return this.p||(this.p=new Promise((ok,no)=>{const r=indexedDB.open('spotter-videos',1);r.onupgradeneeded=()=>r.result.createObjectStore('v');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
  async put(id,blob){const db=await this.open();return new Promise((ok,no)=>{const tx=db.transaction('v','readwrite');tx.objectStore('v').put(blob,id);tx.oncomplete=()=>ok();tx.onerror=()=>no(tx.error)})},
  async get(id){const db=await this.open();return new Promise((ok,no)=>{const q=db.transaction('v').objectStore('v').get(id);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}};
const vURL={};
function hydrateVideos(){
  document.querySelectorAll('video[data-fc]').forEach(async v=>{const id=v.dataset.fc;
    if(!vURL[id]){try{const b=await VDB.get(id);if(b)vURL[id]=URL.createObjectURL(b)}catch(e){}}
    if(vURL[id])v.src=vURL[id];else{const w=v.closest('.fcvid');if(w)w.classList.add('missing')}});
}
const fcVideo=(fc,ex)=>fc.sample?`<div class="fcvid sample">${anim(ex)}<small>Sample clip</small></div>`
  :`<div class="fcvid"><video data-fc="${fc.id}" controls playsinline preload="metadata" aria-label="Form check video: ${esc(ex.name)}"></video><small class="fcmiss">The video is on the phone it was filmed on</small></div>`;
function fcCard(c,fc,role){
  const ex=exById(fc.exId),who=esc(first(c.name)),cn=esc(first(coach(c.coachId).name));
  return `<article class="fccard ${role==='coach'&&!fc.reply?'new':''}">${fcVideo(fc,ex)}<div class="fc-body"><p class="eyebrow">${fmtDate(fc.date)}${role==='coach'&&!fc.reply?' · New':''}</p><h3>${esc(ex.name)}</h3>${fc.note?`<p class="ci-note">“${esc(fc.note)}”</p>`:''}
    ${role==='coach'?replyBlock('fc-reply',fc,who):fc.reply?`<div class="coachnote"><span class="eyebrow">${cn} replied</span><p>${esc(fc.reply.text)}</p></div>`:`<p class="hint">Waiting for ${cn}.</p>`}</div></article>`;
}
/* Client, on the exercise screen: film a set, add a note, see the reply */
function formCheckBox(c,r){
  const T=today(),cn=esc(first(coach(c.coachId).name)),ex=exById(r.exId),mine=(c.formChecks||[]).filter(x=>x.exId===r.exId).sort((a,b)=>b.ts-a.ts);
  const now=mine.filter(x=>x.date===T),past=mine.find(x=>x.date!==T&&x.reply);
  return `${now.map(fc=>`<div class="fcmini">${fcVideo(fc,ex)}<div class="fc-body"><b>Form check sent to ${cn}</b><input class="note" id="fcn-${fc.id}" data-fcnote="${fc.id}" value="${esc(fc.note||'')}" placeholder="What should ${cn} look at? (optional)">${fc.reply?`<div class="coachnote"><span class="eyebrow">${cn} replied</span><p>${esc(fc.reply.text)}</p></div>`:''}</div></div>`).join('')}
    ${!now.length&&past?`<div class="coachnote"><span class="eyebrow">Your last form check · ${cn} said</span><p>${esc(past.reply.text)}</p></div>`:''}`;
}
const fcButton=(c,r)=>`<label class="btn swapbtn" for="fc-${r.id}">${CAM} ${(c.formChecks||[]).some(x=>x.exId===r.exId&&x.date===today())?'Send another':'Form check'}<input type="file" id="fc-${r.id}" accept="video/*" data-fcfile="${r.exId}" hidden></label>`;

/* ---------- meals that weren't on the plan ---------- */
/* c.mealLog[date] = [{instead: planned meal id or null for an extra, text, photo}]. The plan itself never changes. */
const mealXs=(c,d)=>((c.mealLog||{})[d]||[]);
const swappedMeal=(c,d,id,role)=>mealXs(c,d).some(x=>x.instead===id&&(role==='client'||x.synced!==false));
function mealXList(c,date,role){
  const xs=mealXs(c,date).filter(x=>role==='client'||x.synced!==false),day=c.meals&&c.meals.days[weekIdx(date)];if(!xs.length)return'';
  const nm=id=>{const m=day&&day.meals.find(y=>y.id===id);return m?m.name:'a planned meal'};
  return `<div class="mxlist"><span class="eyebrow">${role==='client'?'Off the plan':`${esc(first(c.name))} ate off the plan`}</span>${xs.map(x=>`<div class="mxitem">${x.photo?`<img src="${x.photo}" alt="Photo of the meal">`:''}<span><b>${esc(x.text||'Photo only')}</b><small>${x.instead?`Instead of ${esc(nm(x.instead))}`:'Extra, on top of the plan'} · ${fmtClock(x.ts)}</small></span>${role==='client'?`<button class="icon-btn" data-act="mx-del" data-d="${date}" data-id="${x.id}" aria-label="Remove">✕</button>`:''}</div>`).join('')}</div>`;
}
// pop-up for logging a meal that wasn't on the plan
function mxSheet(c){
  const m=ui.mealX,day=c.meals.days[weekIdx(m.date)];
  return `<form class="card hud sheetcard" data-form="mx" role="dialog" aria-label="Log a meal"><div><div class="section-hd"><h2>What did you eat?</h2><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div><p class="hint">${m.date===today()?'Today':fmtDate(m.date)} · ${esc(first(coach(c.coachId).name))} sees it next to your plan. Your plan stays the same.</p></div>
    <div class="mxpick"><span class="eyebrow">Instead of</span><div class="chips">${day.meals.map(x=>`<button type="button" class="chip ${m.instead===x.id?'on':''}" data-act="mx-pick" data-v="${x.id}">${esc(x.name)}</button>`).join('')}<button type="button" class="chip ${!m.instead?'on':''}" data-act="mx-pick" data-v="">Extra</button></div></div>
    <label>What you had<input id="mx-text" data-mx="text" value="${esc(m.text)}" placeholder="e.g. Burrito bowl from the canteen" maxlength="120"></label>
    <label class="mxphoto" for="mx-photo">${m.photo?`<img src="${m.photo}" alt="Your photo">`:'<span>+ Add a photo (optional)</span>'}<input type="file" id="mx-photo" accept="image/*" data-mxphoto hidden></label>
    <button class="btn primary big">Save</button></form>`;
}

/* ---------- add to home screen ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e});
const isInstalled=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
// "add to home screen" steps for iPhone and Android
function installSheet(){
  return `<div class="card hud sheetcard" role="dialog" aria-label="Add to home screen"><div class="section-hd"><h2>Add to home screen</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>
    ${isInstalled()?'<p class="muted">Spotter is already on this phone’s home screen.</p>':`<p class="muted">Once it's on your home screen, Spotter opens full screen from its own icon and keeps working without signal.</p>
    ${installEvt?'<button class="btn primary big" data-act="install-go">Install Spotter</button>':''}
    <ol class="steps"><li><b>iPhone</b><span>Open Spotter in Safari, tap Share, then Add to Home Screen.</span></li><li><b>Android</b><span>Open Spotter in Chrome, tap ⋮, then Install app.</span></li></ol>`}</div>`;
}
