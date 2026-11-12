/* ui-common.js: building blocks that lots of screens share.
   Icons, the bottom tab bar, small charts, the progress ring, chat bubbles and photos.
   Every function here returns a string of HTML. The app glues those strings together and puts them on the page. */
/* The Spotter mark: a barbell bent into an S. Follows the text colour, so it matches every theme. */
const SPOTTER_MARK='<svg class="smark" viewBox="0 0 64 64" aria-hidden="true"><path d="M44 17H24a8 8 0 0 0 0 16h16a8 8 0 0 1 0 16H20" fill="none" stroke="currentColor" stroke-width="6"/><g fill="currentColor"><rect x="44" y="10" width="4.5" height="14" rx="1.5"/><rect x="50.5" y="6" width="6.5" height="22" rx="2"/><rect x="15.5" y="42" width="4.5" height="14" rx="1.5"/><rect x="7" y="38" width="6.5" height="22" rx="2"/></g></svg>';
/* ui = what's on screen right now (which page, which tab, what's open).
   It is NOT saved. S (in data.js) is the real data and that IS saved. */
const ui={user:{role:'coach',id:'co1'},view:'clients',clientId:null,tab:'workouts',drafts:{},chooser:null,rowId:null,
  libGroup:'All',libQ:'',preview:null,olEx:null,ready:null,finishing:null,confirm:null,showPast:false,copyOpen:false};

const ICON={
  clients:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/></svg>',
  exercises:'<svg viewBox="0 0 24 24"><path d="M3 9v6M6 6.5v11M18 6.5v11M21 9v6M6 12h12"/></svg>',
  templates:'<svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="12" height="15" rx="1"/><path d="M8 21h10a2 2 0 0 0 2-2V7"/><path d="M7.5 8h5M7.5 11.5h5"/></svg>',
  today:'<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  reports:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  progress:'<svg viewBox="0 0 24 24"><path d="M3.5 19.5h17"/><path d="M5 15l4.5-4.5 3.5 3 6-7"/><path d="M15 6.5h4v4"/></svg>',
  invites:'<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/></svg>'};
// the bar at the bottom with the main sections
function tabbar(items,active){
  return `<nav class="tabbar">${items.map(([k,l,b])=>`<button class="${k===active?'on':''}" data-act="nav" data-v="${k}" ${k===active?'aria-current="page"':''}>${ICON[k]}<span>${l}</span>${b?`<span class="dot">${b}</span>`:''}</button>`).join('')}</nav>`;
}
function anim(e,cls=''){if(e.noAnim&&!e.video)return `<span class="nodemo ${cls}">No demo yet</span>`;return e.video?`<video class="${cls}" src="${e.video}" autoplay loop muted playsinline></video>`:`<canvas class="${cls}" data-anim="${e.pattern}"${e.load?` data-load="${e.load}"`:''} role="img" aria-label="Animation of ${esc(e.name)}"></canvas>`}
const thumb=e=>e.noAnim&&!e.video?`<span class="thumb thumb-empty" aria-hidden="true"></span>`:`<span class="thumb" aria-hidden="true">${e.video?`<video src="${e.video}" autoplay loop muted playsinline></video>`:`<canvas data-anim="${e.pattern}"${e.load?` data-load="${e.load}"`:''}></canvas>`}</span>`;
function spark(vals,w=84,h=22){
  vals=vals.filter(v=>v!=null);if(vals.length<2)return'';
  const mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>[2+i*(w-4)/(vals.length-1),2+(h-4)*(1-(v-mn)/r)]),l=pts[pts.length-1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--accent-dim)" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${l[0]}" cy="${l[1]}" r="2.6" fill="var(--accent)"/></svg>`;
}
// the round progress ring, like the "100% on plan" circle
function ring(pct,label,sub,size=74){
  // the ring fades from the theme's main colour into its second one (same colour twice on lime)
  const r=size/2-6,c=2*Math.PI*r,p=Math.max(0,Math.min(100,pct||0)),gid='rg'+Math.random().toString(36).slice(2,8);
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent2)"/></linearGradient></defs><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line2)" stroke-width="5"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c*p/100} ${c}" transform="rotate(-90 ${size/2} ${size/2})" class="glowline"/></svg><span><b class="mono">${label}</b>${sub?`<small>${sub}</small>`:''}</span></div>`;
}
// a simple line chart over time, used for body weight and similar
function lineChart(points,{unit='kg',label='Chart',head=''}={}){
  if(!points.length)return `<div class="chart"><p class="hint">Nothing logged yet.</p></div>`;
  const W=420,H=200,pl=18,pr=18,pt=34,pb=44,vals=points.map(p=>p.v);let mn=Math.min(...vals),mx=Math.max(...vals);if(mx-mn<.5){mn-=.5;mx+=.5}
  // a little room above and below the line so the number labels never sit on top of it
  const pad=(mx-mn)*.2;mn-=pad;mx+=pad;
  const x=i=>points.length===1?W/2:pl+i*(W-pl-pr)/(points.length-1),y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));
  const line=points.map((p,i)=>`${x(i)},${y(p.v)}`).join(' '),f=points[0],l=points[points.length-1],n=points.length-1,u=unit==='kg'||unit==='cm'?` ${unit}`:unit==='reps'?' reps':unit;
  // Put each label on the side away from the line: if the line heads up from the first point, the label goes underneath
  const firstBelow=n&&points[1].v>f.v,lastBelow=n&&points[n-1].v>l.v;
  return `<div class="chart ${head?'gc':''}">${head}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${+f.v.toFixed(1)} to ${+l.v.toFixed(1)}${esc(u)}">
    <line x1="${pl}" x2="${W-pr}" y1="${H-22}" y2="${H-22}" stroke="var(--line2)"/>
    <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p,i)=>`<g class="hov"><title>${fmtShort(p.date)}: ${+p.v.toFixed(1)}${u}</title><circle cx="${x(i)}" cy="${y(p.v)}" r="11" fill="transparent"/><circle cx="${x(i)}" cy="${y(p.v)}" r="${p.pr||i===n?4.5:2.6}" fill="${p.pr||i===n?'var(--accent)':'var(--surface)'}" stroke="var(--accent)" stroke-width="1.5"/></g>`).join('')}
    ${n?`<text class="val" x="${x(0)}" y="${firstBelow?y(f.v)+22:y(f.v)-12}" text-anchor="start">${+f.v.toFixed(1)}${u}</text>`:''}
    <text class="val now" x="${x(n)}" y="${lastBelow?y(l.v)+24:y(l.v)-12}" text-anchor="${n?'end':'middle'}">${+l.v.toFixed(1)}${u}</text>
    ${n?`<text x="${x(0)}" y="${H-6}" text-anchor="start">${fmtShort(f.date)}</text>`:''}<text x="${x(n)}" y="${H-6}" text-anchor="${n?'end':'middle'}">${n?'Latest · ':''}${fmtShort(l.date)}</text>
  </svg></div>`;
}
const weightChart=(ws,head='')=>lineChart(ws.map(w=>({date:w.date,v:w.kg})),{label:'Body weight over time',head});
function photosHistory(photos){
  const by={};photos.forEach(p=>(by[p.date]=by[p.date]||[]).push(p));
  const dates=Object.keys(by).sort().reverse();
  if(!dates.length)return `<p class="hint">No progress photos yet.</p>`;
  return dates.map(d=>`<div class="photorow"><span class="eyebrow">${fmtDate(d)}</span><div class="thumbs">${['front','side','back'].map(a=>{const p=by[d].find(x=>x.angle===a);return `<figure>${p?`<img src="${p.src}" alt="${a} photo, ${fmtDate(d)}">`:''}<figcaption>${a}</figcaption></figure>`}).join('')}</div></div>`).join('');
}
// the chat between a coach and a client, same layout for both sides
function chatView(c,role){
  const msgs=role==='coach'?c.messages.filter(m=>m.synced!==false):c.messages;
  const other=role==='coach'?first(c.name):first(coach(c.coachId).name);
  return `<div class="chat"><ol class="msgs" id="msgs">${msgs.length?msgs.map(m=>`<li class="msg ${m.from===role?'me':'them'} ${m.synced===false?'pending':''}"><p>${esc(m.text)}</p><time>${fmtTime(m.ts)}${m.synced===false?' · waiting to send':''}</time></li>`).join(''):`<li class="hint">No messages yet. Say hello to ${esc(other)}.</li>`}</ol>
  <form class="composer" data-form="send"><input id="msg-input" name="text" placeholder="Message ${esc(other)}" autocomplete="off" required><button class="btn primary">Send</button></form></div>`;
}
/* Plain-English description of what was lifted, e.g. "3 sets of 10 reps at 24 kg" or "3 sets at 24 kg: 10, 10, 9 reps" */
function setsText(sets){
  if(!sets||!sets.length)return'';
  const n=sets.length,ws=sets.map(s=>hasW(s.w)?kg(s.w):null),rs=sets.map(s=>String(s.r));
  const sameW=ws.every(w=>w===ws[0]),sameR=rs.every(r=>r===rs[0]),word=`${n} set${n>1?'s':''}`,at=ws[0]?` at ${ws[0]} kg`:'';
  const and=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:a[0];
  if(sameW)return sameR?`${word} of ${rs[0]} reps${at}`:`${word}${at}: ${and(rs)} reps`;
  if(sameR&&ws.every(Boolean))return `${word} of ${rs[0]} reps: ${and(ws)} kg`;
  return sets.map(s=>hasW(s.w)?`${s.r} reps at ${kg(s.w)} kg`:`${s.r} reps`).join(', ');
}
const repsText=(sets,reps)=>`${sets} set${sets>1?'s':''} of ${esc(reps)} reps`;
const statusPill=st=>`<span class="pill ${st.key==='pr'||st.key==='up'?'ok':''}">${st.key==='pr'?'★ ':st.key==='up'?'▲ ':st.key==='down'?'▼ ':''}${st.label}</span>`;
function readyPill(score){return score==null?'':`<span class="pill ${readyCls(score)}">Energy ${score}/100</span>`}
function targetsLine(r,c){const w=weightText(r,today(),c&&c.plan);return `${repsText(r.sets,r.reps)}${w?` · <b class="mono">${w}</b>`:''} · ${fmtRest(r.rest)} rest`}
