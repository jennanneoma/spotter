/* data.js: the "brain" of the app. No screens in here, just data and maths.
   - small helpers for dates, names and numbers (used everywhere)
   - the list of exercises
   - seed(): makes the sample coaches and clients you see in the demo
   - the maths for progress: streaks, how a lift is going, weekly weights
   Everything the app knows lives in one object called S. It gets saved in the browser (see app.js). */
const $=s=>document.querySelector(s);
// quick random id like "k3j9x0ab", for anything new we create
const uid=()=>Math.random().toString(36).slice(2,10);
const clone=o=>JSON.parse(JSON.stringify(o));
// esc() makes text safe to put in HTML (so a name like <b> shows as text, not as code)
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iso(d){const z=new Date(d);return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0')}
// dates are kept as text like "2026-11-09", which sorts in the right order for free
const today=()=>iso(new Date());
function addDays(s,n){const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return iso(d)}
function daysBetween(a,b){return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5)}
// the Monday of the week a date is in. Weeks always run Monday to Sunday here
function mondayOf(s){const d=new Date(s+'T12:00');return addDays(s,-((d.getDay()+6)%7))}
const weekIdx=s=>(new Date(s+'T12:00').getDay()+6)%7;
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],WK=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],WKL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(s){const d=new Date(s+'T12:00');return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`}
function fmtShort(s){const d=new Date(s+'T12:00');return `${d.getDate()} ${MON[d.getMonth()]}`}
function fmtLong(s){return new Date(s+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
const fmtClock=ts=>new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
function fmtTime(ts){return iso(new Date(ts))===today()?fmtClock(ts):`${fmtShort(iso(new Date(ts)))}, ${fmtClock(ts)}`}
function rel(s){const n=daysBetween(s,today());return n===0?'Today':n===1?'Yesterday':`${n} days ago`}
function fmtRest(s){s=+s||0;return s>=60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:`${s}s`}
const initials=n=>n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const first=n=>/^Client \d+$/.test(n)?n:n.split(" ")[0];
const kg=x=>(x===''||x==null||isNaN(+x))?'':String(+(+x).toFixed(2));
const hasW=x=>x!==''&&x!=null&&!isNaN(+x);
function rng(seed){let s=seed;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0)>>>0)/4294967296}
function topReps(s){const m=String(s).match(/(\d+)\s*(?:-|–|to)\s*(\d+)/);if(m)return+m[2];const n=parseInt(s);return isNaN(n)?null:n}
function lowReps(s){const n=parseInt(s);return isNaN(n)?null:n}
const roundTo=(x,step=1.25)=>Math.round(x/step)*step;

/* ---------- progression: how the weight changes over time ----------
   The coach picks one of these for each exercise:
   none   : same weight every time
   weekly : add `step` kg every `every` weeks, counting from `since` (the Monday it was set) or the plan start
   earned : add `step` kg once a workout has every set at the top of the rep range (e.g. all sets of 12 in "8-12")
   sets   : each set is `step` kg heavier than the one before (a minus number makes drop sets) */
const PROG_TYPES=[['none','Same weight','No automatic change'],['weekly','Add every week','Goes up each week'],['sets','Add after every set','Heavier each set, in the same workout']];
function progOf(r){const p=r.prog;if(!p)return{type:'none',step:2.5,every:1};if(typeof p==='number')return{type:'none',step:p||2.5,every:1};const o={type:'none',step:2.5,every:1,...p};if(o.type==='earned')o.type='none';return o}
function weekNo(r,date,plan){const p=progOf(r),since=r.since||(plan&&plan.startDate)||date;return Math.max(0,Math.floor(daysBetween(since,date)/7/(p.every||1)))}
// works out the weight for one set on a given date, following the progression rules above
function setWeight(r,i,date,plan){
  if(!hasW(r.weight))return'';
  const p=progOf(r);let w=+r.weight;
  if(p.type==='weekly')w+=(+p.step||0)*weekNo(r,date||today(),plan);
  if(p.type==='sets')w+=(+p.step||0)*i;
  return Math.max(0,+w.toFixed(2));
}
function weightText(r,date,plan){
  if(!hasW(r.weight))return'';
  const a=setWeight(r,0,date,plan),b=setWeight(r,r.sets-1,date,plan);
  return a===b?`${kg(a)} kg`:`${kg(a)}→${kg(b)} kg`;
}
const signed=x=>(+x>=0?'+':'−')+kg(Math.abs(+x));
function progTag(r){
  const p=progOf(r);if(!hasW(r.weight)||p.type==='none')return'';
  return p.type==='weekly'?`${signed(p.step)} KG/${p.every>1?p.every+' WK':'WK'}`:p.type==='earned'?`${signed(p.step)} WHEN EARNED`:`${signed(p.step)} EVERY SET`;
}
function progSentence(r,plan,who='coach'){
  const p=progOf(r),T=today();if(!hasW(r.weight))return'';
  if(p.type==='weekly'){const now=setWeight(r,0,T,plan),nx=setWeight(r,0,addDays(T,7*(p.every||1)),plan),nx2=setWeight(r,0,addDays(T,14*(p.every||1)),plan);
    return `This week ${kg(now)} kg · ${p.every>1?`in ${p.every} weeks`:'next week'} ${kg(nx)} kg · then ${kg(nx2)} kg`}
  if(p.type==='earned')return `${who==='coach'?'Stays':'You stay'} at ${kg(r.weight)} kg until every set hits ${topReps(r.reps)??'the target'} reps, then ${kg(+r.weight+(+p.step||0))} kg.`;
  if(p.type==='sets')return `Sets: ${Array.from({length:r.sets},(_,i)=>kg(setWeight(r,i,T,plan))).join(' · ')} kg`;
  return `Same weight every session: ${kg(r.weight)} kg.`;
}

/* ---------- the exercise list ----------
   Each line is [name, muscle group, which animation to play, what's being lifted (optional)] */
const GROUPS=['Chest','Back','Shoulders','Biceps','Triceps','Legs','Core','Conditioning'];
const EX=[
['Barbell Bench Press','Chest','bench'],['Incline Barbell Bench Press','Chest','incline'],['Decline Bench Press','Chest','decline'],['Dumbbell Bench Press','Chest','bench','db'],['Incline Dumbbell Press','Chest','incline','db'],['Dumbbell Fly','Chest','fly'],['Incline Dumbbell Fly','Chest','fly'],['Cable Crossover','Chest','cfly'],['Low-to-High Cable Fly','Chest','lhfly'],['Push-Up','Chest','pushup'],['Incline Push-Up','Chest','ipushup'],['Chest Dip','Chest','dip'],['Machine Chest Press','Chest','cpress'],['Pec Deck','Chest','pecdeck'],
['Pull-Up','Back','pullup'],['Chin-Up','Back','chinup'],['Lat Pulldown','Back','pulldown'],['Close-Grip Lat Pulldown','Back','pulldown','handle'],['Seated Cable Row','Back','crow'],['Barbell Row','Back','row'],['Pendlay Row','Back','pendlay'],['One-Arm Dumbbell Row','Back','row1'],['Chest-Supported Row','Back','csrow'],['T-Bar Row','Back','row','landmine'],['Inverted Row','Back','invrow'],['Straight-Arm Pulldown','Back','sapd'],['Face Pull','Back','facepull'],['Machine Row','Back','crow'],
['Overhead Press','Shoulders','press'],['Seated Dumbbell Shoulder Press','Shoulders','dbpress'],['Arnold Press','Shoulders','arnold'],['Lateral Raise','Shoulders','lateral'],['Cable Lateral Raise','Shoulders','lateral','handle'],['Front Raise','Shoulders','front'],['Rear Delt Fly','Shoulders','reardelt'],['Upright Row','Shoulders','upright'],['Machine Shoulder Press','Shoulders','dbpress','none'],['Landmine Press','Shoulders','landmine'],['Barbell Shrug','Shoulders','shrug','bb'],['Dumbbell Shrug','Shoulders','shrug'],
['Barbell Curl','Biceps','curl','bb'],['EZ-Bar Curl','Biceps','curl','bb'],['Dumbbell Curl','Biceps','curl'],['Hammer Curl','Biceps','curl'],['Incline Dumbbell Curl','Biceps','inclinecurl'],['Preacher Curl','Biceps','preacher'],['Cable Curl','Biceps','ccurl'],['Concentration Curl','Biceps','conc'],
['Triceps Pushdown','Triceps','pushdown'],['Rope Pushdown','Triceps','pushdown'],['Overhead Triceps Extension','Triceps','ohext'],['Skull Crusher','Triceps','skull'],['Close-Grip Bench Press','Triceps','cgbench'],['Bench Dip','Triceps','bdip'],['Triceps Kickback','Triceps','kick'],['Diamond Push-Up','Triceps','dpushup'],
['Back Squat','Legs','squat'],['Front Squat','Legs','fsquat'],['Goblet Squat','Legs','gsquat'],['Hack Squat','Legs','squat','none'],['Box Squat','Legs','boxsquat'],['Leg Press','Legs','legpress'],['Bulgarian Split Squat','Legs','bss'],['Walking Lunge','Legs','lunge'],['Reverse Lunge','Legs','lunge'],['Step-Up','Legs','stepup'],['Leg Extension','Legs','legext'],['Lying Leg Curl','Legs','legcurl'],['Seated Leg Curl','Legs','sleg'],['Romanian Deadlift','Legs','rdl'],['Conventional Deadlift','Legs','deadlift'],['Sumo Deadlift','Legs','sumo'],['Trap Bar Deadlift','Legs','deadlift','db'],['Good Morning','Legs','gm'],['Hip Thrust','Legs','hipthrust'],['Glute Bridge','Legs','bridge'],['Cable Kickback','Legs','gkick'],['Hip Abduction Machine','Legs','abduct'],['Standing Calf Raise','Legs','calf'],['Seated Calf Raise','Legs','scalf'],
['Plank','Core','plank'],['Side Plank','Core','sideplank'],['Crunch','Core','crunch'],['Bicycle Crunch','Core','bicycle'],['Hanging Leg Raise','Core','hlr'],['Lying Leg Raise','Core','llr'],['Cable Crunch','Core','ccrunch'],['Ab Wheel Rollout','Core','abwheel'],['Russian Twist','Core','rtwist'],['Dead Bug','Core','deadbug'],['Mountain Climber','Core','climber'],['Pallof Press','Core','pallof'],
['Kettlebell Swing','Conditioning','swing'],['Burpee','Conditioning','burpee'],['Jump Squat','Conditioning','jumpsq'],['Box Jump','Conditioning','boxjump'],["Farmer's Carry",'Conditioning','carry'],['Battle Ropes','Conditioning','ropes'],['Rowing Machine','Conditioning','erg'],['Assault Bike','Conditioning','bike'],['Jump Rope','Conditioning','jumprope'],['Double Under','Conditioning','dunder'],['Jumping Jack','Conditioning','jack']
];
const isBarbell=e=>(e.load||(SpotterAnim.PAT[e.pattern]||{}).load)==='bb';
function plates(total,bar=20){
  if(!hasW(total)||+total<=bar)return null;
  let side=(+total-bar)/2;const out=[];
  for(const p of[25,20,15,10,5,2.5,1.25]){while(side>=p-1e-6){out.push(p);side-=p}}
  return{out,left:Math.round(side*100)/100};
}

/* ---------- sample data ----------
   seed() builds a fresh, believable demo: two coaches, a few clients, a few weeks of workouts.
   It runs on first load, and again each new day so the dates always look recent. */
function seed(){
  const T=today();
  const S={v:14,online:true,seededOn:T,coaches:[{id:'co1',name:'Immanuel',business:'Immanuel Fitness',logo:null,onboarded:true,notifRead:Date.now()-3*864e5},{id:'co2',name:'Dev Patel',business:'Dev Patel Coaching',logo:null,onboarded:true,notifRead:Date.now()-3*864e5},{id:'co3',name:'New coach',business:'',logo:null,onboarded:false}],
    exercises:EX.map(([name,group,pattern,load],i)=>({id:'e'+i,name,group,pattern,load:load||null})),templates:[],clients:[]};
  const ex=n=>S.exercises.find(e=>e.name===n).id,exById2=id=>(S.exercises.find(e=>e.id===id)||{}).name;
  const row=(n,sets,reps,rest,weight='',prog=0,note='')=>({id:uid(),exId:ex(n),sets,reps,rest,weight,prog:{type:prog?"earned":"none",step:prog||2.5,every:1},note});
  const day=(name,rows)=>({id:uid(),name:cleanTitle(name),rest:false,exercises:rows});
  const rest=()=>({id:uid(),name:'',rest:true,exercises:[]});
  const mk=o=>({id:uid(),logs:[],weights:[],photos:[],messages:[],notes:[],mealTicks:{},meals:null,plan:null,session:null,readiness:{},progressions:[],planHistory:[],swaps:{},swapFeed:[],measures:[],checkins:[],formChecks:[],mealLog:{},dayEdits:{},reminder:{on:false,time:'07:00'},coachRead:0,notesSeen:0,status:'active',...o});

  const sam=mk({id:'cl1',coachId:'co1',name:"Client 1",goal:'Lose fat, keep strength'});
  sam.plan={id:uid(),name:'Push, pull, legs',startDate:addDays(T,-29),days:[
    day('Day 1: Chest and Triceps',[row('Barbell Bench Press',4,'6-8',120,65,2.5,'Pause for one second on your chest. Keep your shoulder blades pinned.'),row('Incline Dumbbell Press',3,'8-10',90,22,2),row('Cable Crossover',3,'12-15',60,12.5,2.5),row('Rope Pushdown',3,'10-12',60,22.5,2.5),row('Overhead Triceps Extension',3,'10-12',60,18,2)]),
    day('Day 2: Back and Biceps',[row('Pull-Up',4,'6-8',120,'',0,"Use the band if you can't get 6 clean reps."),row('Barbell Row',4,'8-10',90,55,2.5,'Pull to your belly button, not your chest.'),row('Seated Cable Row',3,'10-12',75,50,5),row('Face Pull',3,'15',60,17.5,0),row('Hammer Curl',3,'10-12',60,12,2)]),
    rest(),
    day('Day 3: Legs',[row('Back Squat',4,'5',150,85,2.5,'Belt on for the top two sets.'),row('Romanian Deadlift',3,'8',120,75,5),row('Bulgarian Split Squat',3,'10',90,14,2,'10 reps on each leg.'),row('Lying Leg Curl',3,'12',60,32.5,2.5),row('Standing Calf Raise',4,'12-15',45,60,5)]),
    day('Day 4: Shoulders and Core',[row('Overhead Press',4,'6-8',120,45,2.5),row('Lateral Raise',4,'12-15',45,8,1,'Take 3 seconds on the way down.'),row('Rear Delt Fly',3,'15',45,6,1),row('Hanging Leg Raise',3,'10-12',60,''),row('Jump Rope',3,'60',45,'',0,'60 skips per set. Stay light on the balls of your feet.')]),
    rest(),rest()]};
  { // Weeks 1-2 used a lighter starter routine; it stays on record as a past routine
    const starter=clone(sam.plan);starter.id=uid();starter.name='Starter: push, pull, legs';
    starter.days.forEach(dd=>{dd.id=uid();dd.exercises=dd.exercises.slice(0,3);dd.exercises.forEach(r=>r.id=uid())});
    const from0=mondayOf(sam.plan.startDate);sam.plan.activeFrom=addDays(from0,14);
    sam.planHistory=[{from:from0,until:addDays(sam.plan.activeFrom,-1),plan:starter}];
  }
  genLogs(sam,sam.plan.startDate,addDays(T,-1),d=>daysBetween(sam.plan.startDate,d)===8,11,{[ex('Overhead Press')]:'stall'});
  genWeights(sam,85.4,-0.4,6,3);
  genReady(sam,T,5,[4,4,2]);
  const setProg=(c,name,prog,weight)=>{for(const d of c.plan.days)for(const r of d.exercises)if(r.exId===ex(name)){r.prog={every:1,...prog};if(weight!==undefined)r.weight=weight;if(prog.type==='weekly')r.since=mondayOf(T)}};
  setProg(sam,'Romanian Deadlift',{type:'weekly',step:5});
  setProg(sam,'Back Squat',{type:'sets',step:2.5},80);
  sam.meals=weekMeals(sam,T);
  const mon=mondayOf(T);
  for(let i=0;i<weekIdx(T);i++){const d=addDays(mon,i),m=sam.meals.days[i].meals;sam.mealTicks[d]={};m.forEach((x,j)=>{if(j<m.length-(i%2))sam.mealTicks[d][x.id]={synced:true}})}
  sam.mealTicks[T]={[sam.meals.days[weekIdx(T)].meals[0].id]:{synced:true}};
  sam.messages=[{from:'coach',text:'Strong squats on Friday. Your bench target went up to '+kg(sam.plan.days[0].exercises[0].weight)+' kg.',ts:Date.now()-2*864e5},{from:'client',text:'Felt good. Overhead press is still stuck though.',ts:Date.now()-2*864e5+3600e3},{from:'coach',text:"I see it on your overload chart. We'll fix it, try paused reps this week.",ts:Date.now()-864e5}];
  sam.notes=[{id:uid(),text:'Immanuel changed your routine. Friday now ends with jump rope.',go:'today',ts:Date.now()-864e5},{id:uid(),text:'Immanuel edited your meal plan.',go:'meals',ts:Date.now()-3*864e5}];
  sam.notifRead=Date.now()-2*864e5;
  sam.ciSeen=Date.now();
  sam.coachRead=Date.now();
  sam.reminder={on:true,time:'07:00'};
  { // a recent workout with notes for the coach and one swapped exercise
    const l=sam.logs[sam.logs.length-1];
    l.note='Gym was packed, so I rushed the last two exercises.';
    if(l.entries[1])l.entries[1].note='The last set felt tough, so I kept the weight the same.';
    const e2=l.entries.find(e=>exById2(e.exId)==='Seated Cable Row');
    if(e2){e2.swappedFrom=e2.exId;e2.exId=ex('Machine Row');sam.swapFeed.push({id:uid(),date:l.date,rowId:e2.rowId,from:e2.swappedFrom,to:e2.exId,ts:l.finishedAt,synced:true})}
    sam.notesSeen=l.finishedAt-1;
  }
  { // measurements every two weeks, in cm
    const base={waist:92,hips:104,chest:106,arm:36,thigh:60},m0=mondayOf(T);
    for(let i=3;i>=0;i--){const k=3-i;sam.measures.push({id:uid(),date:addDays(m0,-14*i),waist:+(base.waist-0.8*k).toFixed(1),hips:+(base.hips-0.5*k).toFixed(1),chest:+(base.chest-0.3*k).toFixed(1),arm:+(base.arm+0.2*k).toFixed(1),thigh:+(base.thigh-0.2*k).toFixed(1),synced:true})}
  }

  { // weekly check-ins (the last two answered), form checks, an off-plan lunch and one changed day
    const mon=mondayOf(T),wAt=d=>{const w=sam.weights.filter(x=>x.date<=d).slice(-1)[0];return w?w.kg:null},at=(d,h)=>new Date(d+'T'+h).getTime();
    sam.checkins=[[-14,3,3,'Settling in. Legs were sore for days after the first squat session.',"That soreness fades after week two. Keep walking on rest days."],
      [-7,4,2,'Good week. Squats felt strong, sleep was a bit off midweek.',"Great week. Keep the bedtime routine going and we'll push squats again."]].map(([o,sl,st,note,rep])=>{const d=addDays(mon,o+6);return{id:uid(),week:addDays(mon,o),date:d,kg:wAt(d),sleep:sl,stress:st,note,ts:at(d,'19:30'),synced:true,reply:{text:rep,ts:at(d,'21:05')}}});
    const lastOf=n=>visLogs(sam).filter(l=>l.entries.some(e=>e.exId===ex(n))).slice(-1)[0];
    const sq=lastOf('Back Squat'),op=lastOf('Overhead Press');
    if(sq)sam.formChecks.push({id:uid(),date:sq.date,exId:ex('Back Squat'),note:'Is my depth okay on the last rep?',ts:sq.finishedAt-600e3,synced:true,sample:true,reply:{text:'Depth is good. Keep your chest up as you drive out of the bottom.',ts:sq.finishedAt+5400e3}});
    if(op)sam.formChecks.push({id:uid(),date:op.date,exId:ex('Overhead Press'),note:'Still stuck on this one. Is my bar path off?',ts:op.finishedAt-900e3,synced:true,sample:true,reply:null});
    const lunch=sam.meals.days[weekIdx(T)].meals[1];if(lunch)sam.mealLog[T]=[{id:uid(),instead:lunch.id,text:'Chicken burrito bowl from the canteen',photo:null,ts:Date.now()-2*36e5,synced:true}];
    for(let i=2;i<10;i++){const d=addDays(T,i),inf=dayAt(sam,d);if(inf.day&&!inf.day.rest&&inf.day.exercises.length>3){const day=clone(inf.day);day.name=day.name+', lighter';day.exercises=day.exercises.slice(0,-1);sam.dayEdits[d]=day;break}}
  }

  const pri=mk({id:'cl2',coachId:'co1',name:"Jennifer",goal:'Build muscle, first year lifting'});
  const upper=day('Upper body',[row('Dumbbell Bench Press',3,'10',90,12,2),row('One-Arm Dumbbell Row',3,'10',75,14,2),row('Seated Dumbbell Shoulder Press',3,'10',75,8,1),row('Lat Pulldown',3,'10',75,30,2.5),row('Dead Bug',3,'8',45,'')]);
  const legs=day('Legs',[row('Goblet Squat',3,'10',90,16,2,'Elbows inside your knees at the bottom.'),row('Leg Press',3,'12',90,80,10),row('Walking Lunge',2,'12',60,8,2),row('Glute Bridge',3,'12',60,30,5),row('Plank',3,'30',45,'',0,'Hold for 30 seconds.')]);
  const full=day('Full body',[row('Goblet Squat',3,'10',90,16,2),row('Dumbbell Bench Press',3,'10',90,12,2),row('One-Arm Dumbbell Row',3,'10',75,14,2),row('Glute Bridge',3,'12',60,30,5),row('Plank',3,'30',45,'')]);
  pri.plan={id:uid(),name:'Upper, legs, full body',startDate:addDays(T,-35),days:[upper,rest(),legs,rest(),full,rest(),rest()]};
  genLogs(pri,pri.plan.startDate,addDays(T,-6),()=>false,5,{});
  genWeights(pri,60.8,0.15,6,1);
  setProg(pri,'Glute Bridge',{type:'weekly',step:5},25);
  setProg(pri,'Leg Press',{type:'weekly',step:10,every:2});
  pri.messages=[{from:'coach',text:"Hi Jennifer, how's the week going?",ts:Date.now()-3*864e5}];
  {const w=pri.weights.slice(-1)[0];pri.checkins=[{id:uid(),week:mondayOf(T),date:T,kg:w?w.kg:null,sleep:2,stress:4,note:"Exams this week, so I couldn't make it to the gym. Back on it Monday.",ts:Date.now()-3*36e5,synced:true,reply:null}]}

  const jor=mk({id:'cl3',coachId:'co1',name:"Client 3",goal:'Run a half marathon in March'});
  jor.weights=[{id:uid(),date:addDays(T,-2),kg:77.2,synced:true}];

  const alex=mk({id:'cl4',coachId:'co2',name:"Client 4",goal:'Get back into training'});
  alex.plan={id:uid(),name:'Upper and lower',startDate:addDays(T,-20),days:[
    day('Day 1: Upper',[row('Machine Chest Press',3,'10',90,35,5),row('Lat Pulldown',3,'10',90,40,5),row('Dumbbell Curl',2,'12',60,8,1)]),rest(),
    day('Day 2: Lower',[row('Leg Press',3,'12',90,100,10),row('Romanian Deadlift',3,'10',90,50,5),row('Plank',3,'30',45,'')]),rest(),rest(),rest(),rest()]};
  genLogs(alex,alex.plan.startDate,addDays(T,-1),d=>daysBetween(alex.plan.startDate,d)%10===5,7,{});
  genWeights(alex,92.4,-0.4,4,9);
  alex.readiness[T]={sleep:2,energy:2,sore:4,synced:true};
  const tay=mk({id:'cl5',coachId:'co1',name:'Client 5',goal:'Get stronger for football season',status:'invited',inviteCode:'K7P2QX',invitedAt:addDays(T,-2)});
  sam.joinedAt=addDays(T,-31);pri.joinedAt=addDays(T,-37);jor.joinedAt=addDays(T,-3);alex.joinedAt=addDays(T,-22);sam.clientRead=Date.now();
  S.clients=[sam,pri,jor,alex,tay];
  S.templates=[{id:uid(),coachId:'co1',name:'Upper, legs, full body',days:clone(pri.plan.days)}];
  return S;

  function genLogs(c,from,to,skip,seedN,special){
    const R=rng(seedN),count={};
    for(let d=from;d<=to;d=addDays(d,1)){
      const inf=dayAt(c,d);if(!inf.day||inf.day.rest||skip(d))continue;
      const entries=inf.day.exercises.map(r=>{
        const k=count[r.exId]=(count[r.exId]??-1)+1;
        const lo=lowReps(r.reps)||10,hi=topReps(r.reps)||lo;
        r._base=r._base??r.weight;
        let w,reps;
        if(special[r.exId]==='stall'){w=hasW(r._base)?+r._base+(k<2?0:2.5):'';reps=k<2?Array(r.sets).fill(hi):Array.from({length:r.sets},(_,i)=>Math.max(1,lo-(i>1?1:0)))}
        else if(!hasW(r._base)){w='';const n=Math.min(hi+2,lo+Math.floor(k/2));reps=Array.from({length:r.sets},(_,i)=>Math.max(1,n-(i===r.sets-1&&R()>.5?1:0)))}
        else{w=+r._base+(progOf(r).step||2.5)*Math.floor(k/2);const hit=k%2===1;reps=Array.from({length:r.sets},(_,i)=>hit?hi:Math.max(lo,hi-1-(i>1?1:0)))}
        r._last={w,hit:special[r.exId]!=='stall'&&k%2===1};
        return{rowId:r.id,exId:r.exId,sets:reps.map(x=>({w,r:x}))};
      });
      const rd=R();
      c.logs.push({id:uid(),date:d,dayId:inf.day.id,dayName:dayLabel(weekIdx(d),inf.day),entries,rpe:7+Math.floor(rd*3),durationMin:48+Math.floor(rd*22),finishedAt:new Date(d+'T18:'+String(10+Math.floor(R()*40))).getTime(),synced:true});
    }
    for(const dd of c.plan.days)for(const r of dd.exercises){
      if(r._last&&hasW(r._last.w))r.weight=+r._last.w+(r._last.hit&&progOf(r).type==="earned"?progOf(r).step:0);
      delete r._last;delete r._base;
    }
  }
  function genWeights(c,start,step,n,seedN){
    const R=rng(seedN),m=mondayOf(today());
    for(let i=n;i>=0;i--)c.weights.push({id:uid(),date:addDays(m,-7*i),kg:Math.round((start+step*(n-i)+(R()-.5)*.4)*10)/10,synced:true});
  }
  function genReady(c,T,n,todayVals){
    const R=rng(4);
    for(let i=n;i>=1;i--)c.readiness[addDays(T,-i)]={sleep:3+Math.floor(R()*3),energy:3+Math.floor(R()*3),sore:1+Math.floor(R()*3),synced:true};
    void todayVals;
  }
  function weekMeals(c,T){
    const f=(food,portion,kcal,protein)=>({id:uid(),food,portion,kcal,protein});
    const train={kcal:2500,protein:185,meals:[
      {name:'Breakfast',foods:[f('Oats','80 g',300,10),f('Whey protein','1 scoop',120,24),f('Blueberries','100 g',57,1),f('Milk','250 ml',160,8)]},
      {name:'Lunch',foods:[f('Chicken breast','200 g',330,62),f('Rice, cooked','250 g',325,6),f('Broccoli','150 g',51,4)]},
      {name:'Pre-workout',foods:[f('Banana','1 medium',105,1),f('Greek yogurt','200 g',190,20)]},
      {name:'Dinner',foods:[f('Salmon','180 g',370,40),f('Potatoes','350 g',270,7),f('Green salad','1 bowl',40,2),f('Olive oil','1 tbsp',120,0)]}]};
    const restM={kcal:2100,protein:170,meals:[
      {name:'Breakfast',foods:[f('Eggs','3 large',215,19),f('Wholegrain toast','2 slices',160,8),f('Avocado','half',120,1)]},
      {name:'Lunch',foods:[f('Turkey wrap','1 wrap',420,35),f('Apple','1 medium',95,0)]},
      {name:'Snack',foods:[f('Greek yogurt','250 g',240,25),f('Almonds','25 g',145,5)]},
      {name:'Dinner',foods:[f('Lean beef mince','200 g',340,52),f('Sweet potato','250 g',215,4),f('Green beans','150 g',47,3)]}]};
    const m=mondayOf(T);
    return{since:m,days:Array.from({length:7},(_,i)=>{const inf=dayAt(c,addDays(m,i));const src=inf.day&&!inf.day.rest?train:restM;const d=clone(src);d.meals.forEach(x=>{x.id=uid();x.foods.forEach(y=>y.id=uid())});return d})};
  }
}

/* ---------- looking things up ----------
   Short helpers to find a client, coach or exercise by id.
   "vis" means visible: things logged offline stay hidden from the coach until they sync. */
let S=null;
const client=id=>S.clients.find(c=>c.id===id);
const coach=id=>S.coaches.find(c=>c.id===id);
const exById=id=>S.exercises.find(e=>e.id===id)||{name:'Unknown exercise',group:'',pattern:'curl'};
const visLogs=c=>c.logs.filter(l=>l.synced!==false);
const visW=c=>c.weights.filter(w=>w.synced!==false).sort((a,b)=>a.date<b.date?-1:1);
/* Routines run Monday to Sunday: days[0] is Monday ... days[6] is Sunday. day.name is the coach's title for it. */
const cleanTitle=n=>String(n||'').replace(/^Day \d+:\s*/,'').replace(/^Rest$/,'');
function toWeek(days){const out=(days||[]).slice(0,7).map(d=>({...d,name:d.rest?'':cleanTitle(d.name)}));while(out.length<7)out.push({id:uid(),name:'',rest:true,exercises:[]});return out}
const dayTitle=d=>d.rest?'Rest day':(d.name||'Training');
const dayLabel=(i,d)=>`${WKL[i]} · ${dayTitle(d)}`;
/* Routines are saved week by week: c.plan is the latest routine (it applies from plan.activeFrom, a Monday);
   older routines live in c.planHistory as {from, until, plan} so past weeks always show what was actually set. */
function planAt(c,date){
  const p=c.plan;if(!p)return null;
  if(p.activeFrom&&date<p.activeFrom){
    const h=(c.planHistory||[]).filter(x=>x.from<=date).sort((a,b)=>a.from<b.from?1:-1)[0];
    return h?h.plan:null;
  }
  return p;
}
function dayAt(c,date,raw){
  const p=planAt(c,date);
  if(!p){if(c.plan&&c.plan.activeFrom&&date<c.plan.activeFrom)return{notStarted:true,start:c.plan.activeFrom};return{none:true}}
  if(!p.days.length)return{none:true};
  const n=daysBetween(p.startDate,date);
  if(n<0)return{notStarted:true,start:p.startDate};
  const idx=p.days.length===7?weekIdx(date):n%p.days.length,ed=!raw&&c.dayEdits&&c.dayEdits[date];
  return ed?{day:ed,idx,plan:p,edited:true}:{day:p.days[idx],idx,plan:p};
}
function progStart(c){
  const ds=[c.plan&&c.plan.startDate,...(c.planHistory||[]).map(h=>h.plan.startDate),...c.logs.map(l=>l.date)].filter(Boolean).sort();
  return ds[0]||today();
}
const progWeek=(c,date)=>Math.floor(daysBetween(mondayOf(progStart(c)),mondayOf(date))/7)+1;
/* "Week N" only exists from the client's start date; before that there is no week number */
const weekName=(c,date)=>{const n=progWeek(c,date);return n>=1?`Week ${n}`:''};
const weekSpan=(c,from,until)=>{const a=progWeek(c,from),b=progWeek(c,until);return a===b?`Week ${a}`:`Weeks ${a}–${b}`};
const weekRange=mon=>`${fmtShort(mon)} – ${fmtShort(addDays(mon,6))}`;
const readyScore=r=>r?Math.round((r.sleep+r.energy+(6-r.sore))/15*100):null;
const readyCls=s=>s==null?'':s>=75?'ok':s>=55?'warn':'bad';
// every time a client did one exercise, oldest first, with the heaviest set and total reps
function exHistory(c,exId,vis=true){
  return(vis?visLogs(c):c.logs).filter(l=>l.entries.some(e=>e.exId===exId)).sort((a,b)=>a.finishedAt-b.finishedAt).map(l=>{
    const e=l.entries.find(x=>x.exId===exId),ws=e.sets.filter(s=>hasW(s.w));
    const top=ws.length?Math.max(...ws.map(s=>+s.w)):null;
    const e1rm=ws.length?Math.round(Math.max(...ws.map(s=>+s.w*(1+(+s.r||0)/30)))*10)/10:null;
    const vol=Math.round(ws.reduce((v,s)=>v+(+s.w)*(+s.r||0),0));
    const reps=e.sets.reduce((n,s)=>n+(+s.r||0),0);
    return{date:l.date,top,e1rm,vol,reps,sets:e.sets,score:e1rm??reps};
  });
}
/* Compares the latest session with the one before, in plain terms:
   heaviest set first (weighted lifts), then total reps (or reps alone for bodyweight moves). */
function overload(h){
  if(h.length<2)return{key:'new',label:'First session'};
  const a=h[h.length-2],b=h[h.length-1],weighted=b.top!=null&&a.top!=null;
  const best=weighted?Math.max(...h.slice(0,-1).map(x=>x.top??0)):Math.max(...h.slice(0,-1).map(x=>x.reps));
  if(weighted&&b.top>a.top)return{key:b.top>best?'pr':'up',label:b.top>best?`Personal best · ${kg(b.top)} kg`:`Up ${kg(b.top-a.top)} kg`};
  if(weighted&&b.top<a.top)return{key:'down',label:`Lighter by ${kg(a.top-b.top)} kg`};
  if(b.reps>a.reps)return{key:!weighted&&b.reps>best?'pr':'up',label:!weighted&&b.reps>best?`Personal best · ${b.reps} reps`:`+${b.reps-a.reps} reps`};
  if(b.reps<a.reps)return{key:'down',label:`${a.reps-b.reps} fewer reps`};
  return{key:'same',label:'Same as last time'};
}
function sinceStart(h){
  if(h.length<2)return'';
  const a=h[0],b=h[h.length-1];
  if(a.top!=null&&b.top!=null&&b.top!==a.top)return `${kg(a.top)} → ${kg(b.top)} kg since ${fmtShort(a.date)}`;
  if(b.reps!==a.reps)return `${a.reps} → ${b.reps} reps since ${fmtShort(a.date)}`;
  return '';
}
function planExIds(c){const ids=[];if(c.plan)for(const d of c.plan.days)for(const r of d.exercises)if(!ids.includes(r.exId))ids.push(r.exId);return ids}
function overloadSummary(c){
  const out={pr:0,up:0,same:0,down:0,new:0,items:[]};
  for(const id of planExIds(c)){const h=exHistory(c,id);const st=overload(h);out[st.key]++;out.items.push({id,h,st})}
  return out;
}
// the numbers on a client card: last workout, workouts this week, missed ones
function stats(c){
  const T=today(),logs=visLogs(c),last=logs.map(l=>l.date).sort().pop(),mon=mondayOf(T);
  const week=logs.filter(l=>l.date>=mon&&l.date<=T).length;
  let planned=0;for(let i=0;i<7;i++){const inf=dayAt(c,addDays(mon,i));if(inf.day&&!inf.day.rest)planned++}
  const started=c.plan&&c.plan.startDate<=T;
  const since=last?daysBetween(last,T):(started?daysBetween(c.plan.startDate,T):0);
  let skipped=0;if(started)for(let d=last?addDays(last,1):c.plan.startDate;d<T;d=addDays(d,1)){const i=dayAt(c,d);if(i.day&&!i.day.rest)skipped++}
  const missAfter=((coach(c.coachId).prefs||{}).missAfter)||3;
  const missed=!!started&&since>=missAfter&&skipped>0;
  const ws=visW(c),wt=ws.length?ws[ws.length-1].kg:null;let trend='',trendCls='';
  if(ws.length>1){const d=Math.round((wt-ws[Math.max(0,ws.length-5)].kg)*10)/10;trend=(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(1);trendCls='up'}
  const rd=c.readiness[T];const ready=rd&&rd.synced!==false?readyScore(rd):null;
  return{last,week,planned,missed,since,missedLabel:last?`${since} days since last workout`:`No workouts in ${since} days`,wt,trend,trendCls,wts:ws.slice(-8).map(w=>w.kg),ready};
}
// how many planned workouts in a row the client has done
function streak(c){
  let n=0,d=today();const done=new Set(c.logs.map(l=>l.date));
  const inf0=dayAt(c,d);if(!(inf0.day&&!inf0.day.rest&&done.has(d)))d=addDays(d,-1);
  for(let i=0;i<120;i++,d=addDays(d,-1)){const inf=dayAt(c,d);if(!inf.day)break;if(inf.day.rest)continue;if(done.has(d))n++;else break}
  return n;
}
function adherence(c){
  const T=today(),mon=mondayOf(T);let want=0,got=0;
  for(let i=0;i<=weekIdx(T);i++){const d=addDays(mon,i),inf=dayAt(c,d);
    if(inf.day&&!inf.day.rest&&d<T){want++;if(c.logs.some(l=>l.date===d))got++}
    if(inf.day&&!inf.day.rest&&d===T&&c.logs.some(l=>l.date===d)){want++;got++}
    const md=c.meals&&c.meals.days[i];if(md&&d<=T){const ms=md.meals.length;const tk=Object.keys(c.mealTicks[d]||{}).length;want+=d<T?ms:tk;got+=tk}}
  return want?Math.round(got/want*100):null;
}
// how many things the client saved while offline that haven't reached the coach yet
function pendingCount(c){
  let n=[...c.logs,...c.weights,...c.photos,...c.messages,...c.progressions,...(c.swapFeed||[]),...(c.measures||[]),...(c.checkins||[]),...(c.formChecks||[])].filter(x=>x.synced===false).length;
  for(const d in c.mealLog||{})n+=c.mealLog[d].filter(x=>x.synced===false).length;
  for(const d in c.mealTicks)for(const m in c.mealTicks[d])if(c.mealTicks[d][m].synced===false)n++;
  for(const d in c.readiness)if(c.readiness[d].synced===false)n++;
  return n;
}
// back online: mark everything as sent, so the coach can see it
function syncAll(){
  let n=0;
  for(const c of S.clients){n+=pendingCount(c);
    [...c.logs,...c.weights,...c.photos,...c.messages,...c.progressions,...(c.swapFeed||[]),...(c.measures||[]),...(c.checkins||[]),...(c.formChecks||[])].forEach(x=>x.synced=true);
    for(const d in c.mealLog||{})c.mealLog[d].forEach(x=>x.synced=true);
    for(const d in c.mealTicks)for(const m in c.mealTicks[d])c.mealTicks[d][m].synced=true;
    for(const d in c.readiness)c.readiness[d].synced=true;}
  return n;
}
const dayTotals=d=>d.meals.reduce((t,m)=>{m.foods.forEach(f=>{t.kcal+=+f.kcal||0;t.protein+=+f.protein||0});return t},{kcal:0,protein:0});
const mealTotals=m=>m.foods.reduce((t,f)=>({kcal:t.kcal+(+f.kcal||0),protein:t.protein+(+f.protein||0)}),{kcal:0,protein:0});
