/* anim.js: the moving stick-figure demos for each exercise.
   How it works, roughly:
   - a skeleton is a set of joints (hips, knees, shoulders...) in 3D
   - each exercise ("pattern") says how the limbs are angled at the start and at the hardest point
   - we blend between those two poses over time, so the figure moves
   - hands or feet that should stay put (like on a bar) get pulled into place ("IK", inverse kinematics)
   - then everything is drawn flat onto a canvas from a camera angle that suits the exercise
   Angles for each limb:
     forward/back: 0 = pointing straight down, 90 = forward, 180 = straight up, 270 = backward
     sideways: 0 = not out to the side at all, 90 = straight out to the side */
(function(){
const D2R=Math.PI/180;
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
  mid:(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]};
function dirS(t,a,s){t*=D2R;a*=D2R;return[s*Math.sin(a),-Math.cos(t)*Math.cos(a),Math.sin(t)*Math.cos(a)]}
const LIMB=['th','tha','sh','sha','ua','uaa','fa','faa'];
const BASE={t:180,ta:0,th:0,tha:4,sh:0,sha:0,ua:0,uaa:10,fa:0,faa:5,lift:0,dz:0,shrug:0};
const SEG={torso:36,thigh:28,shin:27,upper:19,fore:18,hipW:6,shW:9};

/* camera angles: from the side, three-quarter, front, and from above */
const SIDE={yaw:72,pitch:12},Q={yaw:45,pitch:16},FRONT={yaw:14,pitch:12},HIGH={yaw:32,pitch:26};

/* ---- patterns: the start pose and the hard pose for each kind of exercise ---- */
const lying={anchor:'hip',ay:30,bench:{from:'head',to:'hip'},cam:{yaw:55,pitch:18}};
const seated={anchor:'hip',ay:28,seat:true};
const pushA={t:114,th:-66,sh:-66,ua:0,uaa:10,fa:0,faa:0};
const PAT={
 squat:{cam:Q,load:'bb',keys:[{tha:10,ua:-30,uaa:45,fa:160,faa:-15},{t:145,th:95,tha:18,sh:-35,sha:8}]},
 boxsquat:{cam:Q,load:'bb',box:{pos:[0,-24],w:24,d:20,h:24},keys:[{tha:12,ua:-30,uaa:45,fa:160,faa:-15},{t:140,th:92,tha:22,sh:-20,sha:10}]},
 fsquat:{cam:Q,load:'bb',keys:[{tha:10,ua:90,uaa:25,fa:255,faa:-10},{t:162,th:100,tha:18,sh:-40,sha:8}]},
 gsquat:{cam:Q,load:'kb',keys:[{tha:12,ua:15,uaa:20,fa:160,faa:-25},{t:155,th:100,tha:22,sh:-35,sha:10}]},
 legpress:{cam:SIDE,anchor:'hip',ay:25,bench:{from:'head',to:'hip',off:[0,-4,-4]},footplate:true,keys:[{t:225,th:150,tha:12,sh:60,ua:30,fa:30},{th:115,sh:110}]},
 lunge:{cam:SIDE,anchor:'lfoot',load:'db',keys:[{},{L:{th:88,sh:0},R:{th:-20,sh:-100}}]},
 bss:{cam:SIDE,anchor:'lfoot',load:'db',fix:{feet:0,kh:{L:[0,.2,1],R:[0,-1,-.2]}},box:{at:'rfoot',w:22,d:16,drop:3},keys:[{t:175,L:{th:20,sh:-8},R:{th:-30,sh:-100}},{t:166,L:{th:88,sh:-12},R:{th:-5,sh:-100}}]},
 stepup:{cam:SIDE,anchor:'lfoot',ay:26,load:'db',box:{at:'lfoot',w:26,d:26,drop:2},keys:[{L:{th:80,sh:-5},R:{th:0,sh:0}},{L:{th:0,sh:0},R:{th:85,sh:-5}}]},
 legext:{cam:SIDE,...seated,bench:{from:'head',to:'hip',off:[0,0,-5]},keys:[{t:172,th:90,sh:5,ua:15,fa:15},{sh:85}]},
 sleg:{cam:SIDE,...seated,bench:{from:'head',to:'hip',off:[0,0,-5]},keys:[{t:172,th:90,sh:85,ua:15,fa:15},{sh:-5}]},
 legcurl:{cam:SIDE,anchor:'hip',ay:36,bench:{from:'sho',to:'knee'},keys:[{t:90,th:-90,sh:-90,ua:10,fa:30},{sh:-165}]},
 rdl:{cam:SIDE,load:'bb',keys:[{},{t:102,th:38,sh:-6}]},
 gm:{cam:SIDE,load:'bb',keys:[{ua:-30,uaa:45,fa:160,faa:-15},{t:100,th:18,sh:-6}]},
 deadlift:{cam:SIDE,load:'bb',plate:12,keys:[{t:130,th:70,tha:10,sh:-25,sha:5},{t:180,th:0,tha:6,sh:0,sha:0}]},
 sumo:{cam:{yaw:35,pitch:14},load:'bb',plate:12,keys:[{t:150,th:75,tha:40,sh:-12,sha:30,uaa:2},{t:180,th:0,tha:22,sh:0,sha:22}]},
 hipthrust:{cam:SIDE,anchor:'sho',ay:30,load:'bb',fix:{feet:1,kh:{L:[0,1,.3],R:[0,1,.3]}},box:{at:'sho',w:40,d:16,drop:4,dz:-4},keys:[{t:249,th:140,sh:25,ua:150,uaa:30,fa:120},{t:270,th:95,sh:0}]},
 bridge:{cam:SIDE,anchor:'sho',ay:6,fix:{feet:0,hands:0,kh:{L:[0,1,.3],R:[0,1,.3]},ah:[0,1,0]},keys:[{t:270,th:150,sh:30,ua:90,fa:90},{t:297}]},
 gkick:{cam:SIDE,anchor:'lfoot',keys:[{t:165,ua:45,fa:60},{R:{th:-40,sh:-25}}]},
 abduct:{cam:{yaw:12,pitch:18},...seated,keys:[{t:178,th:90,tha:6,sh:0,ua:10,uaa:30,fa:20},{tha:38}]},
 calf:{cam:SIDE,load:'db',calf:true,keys:[{},{lift:7}]},
 scalf:{cam:SIDE,...seated,calf:true,keys:[{th:90,sh:0,ua:10,fa:60},{lift:6}]},
 hlr:{cam:SIDE,anchor:'hands',ay:134,bar:true,keys:[{ua:180,uaa:22,fa:180,faa:0},{th:95,sh:95}]},
 pullup:{cam:{yaw:30,pitch:12},anchor:'hands',ay:134,bar:true,fix:{hands:0,ah:[1,-1,-.3]},keys:[{ua:180,uaa:28,fa:180,faa:0,th:5,sh:-25},{ua:-25,uaa:50,fa:170,faa:-30,th:10,sh:-35}]},
 chinup:{cam:{yaw:60,pitch:12},anchor:'hands',ay:134,bar:true,fix:{hands:0,ah:[.3,-1,.4]},keys:[{ua:180,uaa:8,fa:180,faa:0,th:5,sh:-25},{ua:-10,uaa:20,fa:165,faa:-10,th:12,sh:-40}]},
 pulldown:{cam:{yaw:40,pitch:14},...seated,load:'bb',cable:{to:[0,150,8],mid:true},keys:[{t:172,th:90,sh:0,ua:178,uaa:28,fa:180,faa:0},{t:165,ua:-25,uaa:50,fa:170,faa:-30}]},
 crow:{cam:SIDE,anchor:'hip',ay:14,seat:true,footplate:true,load:'handle',cable:{to:[0,16,64],mid:true},keys:[{t:160,th:82,sh:70,ua:90,uaa:8,fa:90,faa:0},{t:185,ua:-35,uaa:12,fa:88}]},
 row:{cam:SIDE,load:'bb',keys:[{t:112,th:22,sh:-12,ua:0,uaa:14,fa:0,faa:0},{ua:-80,uaa:22,fa:-5}]},
 pendlay:{cam:SIDE,load:'bb',plate:12,keys:[{t:95,th:35,sh:-15,ua:0,uaa:14,fa:0,faa:0},{ua:-80,uaa:22,fa:-5}]},
 row1:{cam:{yaw:55,pitch:16},load:'db1',box:{at:'lhand',w:20,d:40,drop:1},keys:[{t:98,th:20,sh:-10,ua:0,fa:0,L:{ua:5,fa:5}},{R:{ua:-85,uaa:12,fa:0}}]},
 csrow:{cam:SIDE,load:'db',bench:{from:'head',to:'hip',off:[0,-3,6]},keys:[{t:130,th:-20,sh:-10,ua:0,uaa:10,fa:0},{ua:-85,fa:0}]},
 invrow:{cam:SIDE,bar:true,fix:{hands:0,ah:[.5,-.5,-1]},keys:[{t:110,th:-70,sh:-70,ua:200,uaa:20,fa:200,faa:0},{t:125,th:-55,sh:-55}]},
 sapd:{cam:SIDE,load:'handle',cable:{to:[0,135,45],mid:true},keys:[{t:160,th:10,sh:-6,ua:150,uaa:10,fa:150,faa:0},{ua:-10,fa:-10}]},
 facepull:{cam:{yaw:40,pitch:14},load:'handle',cable:{to:[0,95,70],mid:true},keys:[{t:178,ua:90,uaa:12,fa:90,faa:0},{ua:95,uaa:78,fa:175,faa:-5}]},
 press:{cam:{yaw:50,pitch:14},load:'bb',keys:[{ua:30,uaa:45,fa:175,faa:-5},{ua:178,uaa:14,fa:180,faa:0}]},
 dbpress:{cam:{yaw:25,pitch:14},...seated,load:'db',bench:{from:'head',to:'hip',off:[0,0,-6]},keys:[{t:178,th:90,sh:0,ua:0,uaa:85,fa:180,faa:0},{uaa:165,faa:-8}]},
 arnold:{cam:{yaw:30,pitch:14},...seated,load:'db',bench:{from:'head',to:'hip',off:[0,0,-6]},keys:[{t:178,th:90,sh:0,ua:20,uaa:10,fa:165,faa:-10},{ua:0,uaa:165,fa:180,faa:-8}]},
 lateral:{cam:FRONT,load:'db',keys:[{t:176,ua:0,uaa:12,fa:0,faa:16},{uaa:85,faa:82}]},
 front:{cam:SIDE,load:'db',keys:[{ua:0,uaa:10,fa:0,faa:10},{ua:90,fa:90}]},
 reardelt:{cam:HIGH,load:'db',keys:[{t:100,th:22,sh:-10,ua:0,uaa:8,fa:0,faa:8},{uaa:82,faa:80}]},
 upright:{cam:{yaw:30,pitch:14},load:'bb',keys:[{ua:0,uaa:4,fa:0,faa:-6},{ua:0,uaa:85,fa:150,faa:-60}]},
 shrug:{cam:FRONT,load:'db',keys:[{},{shrug:5}]},
 landmine:{cam:{yaw:55,pitch:14},load:'landmine',keys:[{R:{ua:20,uaa:20,fa:160,faa:-10}},{R:{ua:135,uaa:10,fa:135,faa:0}}]},
 curl:{cam:SIDE,load:'db',keys:[{ua:0,uaa:8,fa:0,faa:6},{ua:8,fa:150}]},
 ccurl:{cam:SIDE,load:'handle',cable:{to:[0,6,40],mid:true},keys:[{ua:0,uaa:8,fa:0,faa:-4},{ua:8,fa:150}]},
 inclinecurl:{cam:SIDE,...seated,load:'db',bench:{from:'head',to:'hip',off:[0,-2,-6]},keys:[{t:215,th:90,sh:0,ua:-10,uaa:10,fa:-10},{fa:140}]},
 preacher:{cam:SIDE,...seated,load:'bb',bench:{from:'sho',to:'elb',off:[0,-4,2],legs:false},keys:[{t:165,th:90,sh:0,ua:40,uaa:8,fa:45},{fa:165}]},
 conc:{cam:{yaw:45,pitch:14},...seated,load:'db1',keys:[{t:140,th:90,tha:25,sh:0,sha:10,R:{ua:5,uaa:-15,fa:5,faa:-5},L:{ua:60,fa:30}},{R:{fa:150}}]},
 pushdown:{cam:SIDE,load:'handle',cable:{to:[0,140,26],mid:true},keys:[{t:172,th:6,sh:-4,ua:-8,uaa:8,fa:140},{fa:-5}]},
 ohext:{cam:SIDE,load:'kb',keys:[{ua:175,uaa:8,fa:178,faa:-12},{fa:320}]},
 skull:{...lying,load:'bb',keys:[{t:270,th:85,tha:20,sh:0,sha:5,ua:190,uaa:10,fa:190,faa:-5},{fa:265}]},
 kick:{cam:SIDE,load:'db',keys:[{t:112,th:22,sh:-12,ua:-72,uaa:8,fa:2},{fa:-75}]},
 dip:{cam:SIDE,anchor:'hands',ay:78,dipbars:true,keys:[{t:178,ua:-2,uaa:12,fa:0,faa:0,th:-12,sh:-75},{t:160,ua:-62,uaa:25,fa:2}]},
 bdip:{cam:SIDE,anchor:'hands',ay:28,fix:{feet:0,kh:{L:[0,1,.3],R:[0,1,.3]}},box:{at:'hands',w:40,d:16,drop:1,dz:-4},keys:[{t:180,ua:-15,uaa:12,fa:0,faa:0,th:55,sh:85},{ua:-80,fa:-5}]},
 bench:{...lying,load:'bb',keys:[{t:270,th:85,tha:20,sh:0,sha:5,ua:180,uaa:16,fa:180,faa:0},{ua:60,uaa:60}]},
 cgbench:{...lying,load:'bb',keys:[{t:270,th:85,tha:20,sh:0,sha:5,ua:180,uaa:6,fa:180,faa:0},{ua:55,uaa:22}]},
 incline:{...lying,load:'bb',keys:[{t:225,th:80,tha:20,sh:0,sha:5,ua:180,uaa:16,fa:180,faa:0},{ua:30,uaa:62,fa:175}]},
 decline:{...lying,ay:36,load:'bb',keys:[{t:290,th:110,tha:12,sh:50,ua:180,uaa:16,fa:180,faa:0},{ua:80,uaa:60}]},
 fly:{...lying,cam:HIGH,load:'db',keys:[{t:270,th:85,tha:20,sh:0,sha:5,ua:180,uaa:8,fa:180,faa:0},{uaa:80,faa:72}]},
 cfly:{cam:{yaw:25,pitch:16},load:'handle',cables:[[60,140,-10],[-60,140,-10]],keys:[{t:170,ua:90,uaa:95,fa:90,faa:80},{uaa:10,faa:-5}]},
 pecdeck:{cam:{yaw:25,pitch:16},...seated,bench:{from:'head',to:'hip',off:[0,0,-6]},keys:[{t:178,th:90,sh:0,ua:90,uaa:95,fa:150,faa:80},{uaa:12,faa:-5}]},
 lhfly:{cam:{yaw:25,pitch:16},load:'handle',cables:[[60,10,-5],[-60,10,-5]],keys:[{t:172,ua:20,uaa:70,fa:20,faa:65},{ua:120,uaa:12,fa:125,faa:-6}]},
 cpress:{cam:{yaw:50,pitch:16},...seated,bench:{from:'head',to:'hip',off:[0,0,-6]},keys:[{t:180,th:90,sh:0,ua:90,uaa:120,fa:90,faa:-10},{uaa:12,faa:-5}]},
 pallof:{cam:{yaw:30,pitch:14},load:'handle',cable:{to:[70,95,0],mid:true},keys:[{tha:14,ua:15,uaa:5,fa:160,faa:-30},{ua:90,uaa:2,fa:90,faa:-6}]},
 pushup:{cam:SIDE,fix:{hands:0,ah:[.6,.4,-1]},keys:[pushA,{t:97,th:-83,sh:-83}]},
 dpushup:{cam:{yaw:55,pitch:16},fix:{hands:0,ah:[.8,.4,-.6]},keys:[{...pushA,uaa:-12,faa:-8},{t:97,th:-83,sh:-83}]},
 ipushup:{cam:SIDE,fix:{hands:0,ah:[.6,.4,-1]},box:{at:'hands',w:44,d:16,drop:1},keys:[{t:130,th:-50,sh:-50,ua:0,uaa:10,fa:0,faa:0},{t:120,th:-60,sh:-60}]},
 plank:{cam:SIDE,per:3200,keys:[{t:103,th:-77,sh:-77,ua:0,uaa:10,fa:90,faa:0},{t:103.6,th:-76.4,sh:-76.4}]},
 sideplank:{cam:{yaw:8,pitch:10},ay:5,per:3200,keys:[{t:180,ta:-71,L:{th:0,tha:71,ua:0,uaa:178,fa:0,faa:178},R:{th:0,tha:-71,ua:0,uaa:0,fa:90,faa:0}},{ta:-72.5}]},
 crunch:{cam:SIDE,anchor:'hip',ay:6,fix:{feet:0,kh:{L:[0,1,.3],R:[0,1,.3]}},keys:[{t:270,th:140,sh:30,ua:90,uaa:10,fa:90},{t:238,ua:130,fa:130}]},
 bicycle:{cam:{yaw:40,pitch:18},anchor:'hip',ay:4,per:1800,keys:[{t:235,ta:8,ua:220,uaa:75,fa:260,faa:-75,L:{th:150,sh:60},R:{th:100,sh:100}},{ta:-8,L:{th:100,sh:100},R:{th:150,sh:60}}]},
 llr:{cam:SIDE,anchor:'hip',ay:6,keys:[{t:270,th:92,sh:92,ua:90,fa:90},{th:178,sh:178}]},
 ccrunch:{cam:SIDE,anchor:'knees',ay:1,cable:{to:[0,150,30],mid:true},load:'handle',keys:[{t:165,th:0,sh:-90,ua:160,uaa:25,fa:290,faa:-20},{t:105,th:20,ua:100,fa:230}]},
 abwheel:{cam:SIDE,anchor:'knees',ay:1,wheel:true,keys:[{t:115,th:10,sh:-90,ua:12,uaa:6,fa:12,faa:0},{t:97,th:-60,ua:68,fa:68}]},
 rtwist:{cam:{yaw:22,pitch:20},anchor:'hip',ay:4,load:'kb',per:1800,keys:[{t:135,ta:8,th:130,tha:10,sh:70,L:{ua:50,uaa:40,fa:60,faa:60},R:{ua:50,uaa:-25,fa:60,faa:-40}},{ta:-8,L:{uaa:-25,faa:-40},R:{uaa:40,faa:60}}]},
 deadbug:{cam:{yaw:35,pitch:20},anchor:'hip',ay:6,per:4400,keys:[{t:270,th:180,sh:90,ua:180,fa:180},{L:{th:100,sh:96},R:{ua:268,fa:268}},{L:{th:180,sh:90},R:{ua:180,fa:180}},{R:{th:100,sh:96},L:{ua:268,fa:268}}]},
 climber:{cam:SIDE,anchor:'hands',ay:0,per:900,keys:[{...pushA,R:{th:70,sh:-95}},{L:{th:70,sh:-95},R:{th:-66,sh:-66}}]},
 swing:{cam:SIDE,load:'kb',per:1700,keys:[{t:115,th:28,tha:14,sh:-15,ua:-35,uaa:4,fa:-35,faa:0},{t:182,th:0,sh:0,ua:92,fa:92}]},
 burpee:{cam:SIDE,per:3800,keys:[{ua:0,fa:0},{t:125,th:105,sh:-35,ua:15,fa:15},{t:114,th:-66,sh:-66,ua:0,fa:0,dz:-55},{t:125,th:105,sh:-35,ua:15,fa:15,dz:0},{t:180,th:0,sh:0,ua:175,uaa:15,fa:178,lift:22}]},
 jumpsq:{cam:SIDE,per:1800,keys:[{},{t:145,th:95,sh:-35,ua:-30,fa:-30},{t:180,th:0,sh:0,lift:24,ua:20,fa:20}]},
 boxjump:{cam:SIDE,per:3200,box:{pos:[0,32],w:30,d:28,h:24},keys:[{},{t:140,th:70,sh:-30,ua:-50,fa:-50},{t:170,th:100,sh:-10,lift:40,dz:18,ua:100,fa:100},{t:150,th:90,sh:-30,lift:26,dz:32,ua:60,fa:70},{t:180,th:0,sh:0,lift:26,dz:32,ua:0,fa:0}]},
 carry:{cam:SIDE,anchor:'hip',ay:54,load:'db',scroll:.07,per:1100,keys:[{L:{th:22,sh:8},R:{th:-18,sh:-40},ua:0,uaa:14,fa:0},{L:{th:-18,sh:-40},R:{th:22,sh:8}}]},
 ropes:{cam:{yaw:40,pitch:14},per:900,ropes:true,keys:[{t:155,th:55,tha:16,sh:-30,sha:6,L:{ua:50,fa:60},R:{ua:95,fa:105}},{L:{ua:95,fa:105},R:{ua:50,fa:60}}]},
 erg:{cam:SIDE,ay:8,per:2600,rail:true,seat:'follow',footplate:true,load:'handle',cable:{to:[0,14,24],mid:true},keys:[{t:150,th:140,sh:35,ua:90,uaa:8,fa:90},{t:170,th:100,sh:80},{t:200,th:92,sh:92,ua:-35,uaa:14,fa:88},{t:175,th:100,sh:80,ua:90,fa:90}]},
 bike:{cam:{yaw:50,pitch:14},anchor:'hip',ay:46,seat:true,per:900,pedal:{c:[0,18,8],r:9},keys:[{t:160,L:{ua:50,fa:80},R:{ua:80,fa:60}},{L:{ua:80,fa:60},R:{ua:50,fa:80}}]},
 jumprope:{cam:{yaw:40,pitch:12},per:620,jumprope:1,keys:[{th:6,sh:-6,ua:12,uaa:18,fa:60,faa:45},{lift:5,th:0,sh:0}]},
 dunder:{cam:{yaw:40,pitch:12},per:760,jumprope:2,keys:[{th:8,sh:-8,ua:12,uaa:18,fa:60,faa:45},{lift:10,th:0,sh:0}]},
 jack:{cam:{yaw:2,pitch:10},per:1000,keys:[{tha:4,ua:0,uaa:12,fa:0,faa:10},{lift:6,tha:12,sha:10,uaa:90,faa:95},{lift:0,tha:20,sha:18,uaa:170,faa:175},{lift:6,tha:12,sha:10,uaa:90,faa:95}]},
};

/* ---- turning angles into joint positions ---- */
function resolveKeys(keys){
  const out=[];let prev=null;
  for(const k of keys){
    const top=prev?{...prev}:{...BASE};
    for(const x in k)if(x!=='L'&&x!=='R')top[x]=k[x];
    const L={},R={};
    for(const f of LIMB){
      const both=k[f]!==undefined;
      L[f]=k.L&&k.L[f]!==undefined?k.L[f]:both?k[f]:prev?prev.L[f]:top[f];
      R[f]=k.R&&k.R[f]!==undefined?k.R[f]:both?k[f]:prev?prev.R[f]:top[f];
    }
    top.L=L;top.R=R;out.push(top);prev=top;
  }
  return out;
}
function lerpPose(A,B,p){
  const o={};
  for(const k in A){if(k==='L'||k==='R'){o[k]={};for(const f of LIMB)o[k][f]=A[k][f]+(B[k][f]-A[k][f])*p}else o[k]=typeof A[k]==='number'?A[k]+(B[k]-A[k])*p:A[k]}
  return o;
}
function joints(q,pat){
  const u=dirS(q.t,q.ta,1),hip=[0,0,0];
  let l=V.sub([1,0,0],V.mul(u,u[0]));l=V.len(l)<.1?[0,1,0]:V.norm(l);
  const sc=V.add(hip,V.mul(u,SEG.torso+q.shrug));
  const J={hip,sc,head:V.add(hip,V.mul(u,SEG.torso+11)),u,l};
  for(const[k,s]of[['L',1],['R',-1]]){
    const g=q[k],hp=V.add(hip,V.mul(l,SEG.hipW*s)),sp=V.add(sc,V.mul(l,SEG.shW*s));
    const kn=V.add(hp,V.mul(dirS(g.th,g.tha,s),SEG.thigh)),an=V.add(kn,V.mul(dirS(g.sh,g.sha,s),SEG.shin));
    const el=V.add(sp,V.mul(dirS(g.ua,g.uaa,s),SEG.upper)),ha=V.add(el,V.mul(dirS(g.fa,g.faa,s),SEG.fore));
    J[k]={hip:hp,sho:sp,knee:kn,ank:an,elb:el,hand:ha};
  }
  const an=pat.anchor||'feet';
  const a=an==='feet'?V.mid(J.L.ank,J.R.ank):an==='lfoot'?J.L.ank:an==='hands'?V.mid(J.L.hand,J.R.hand):an==='knees'?V.mid(J.L.knee,J.R.knee):an==='sho'?V.mid(J.L.sho,J.R.sho):hip;
  shift(J,V.sub([0,(pat.ay||0)+q.lift,q.dz],a));
  return J;
}
function shift(J,d){
  for(const k of['hip','sc','head'])J[k]=V.add(J[k],d);
  for(const s of['L','R'])for(const k in J[s])J[s][k]=V.add(J[s][k],d);
}
function ik(root,target,a,b,hint){
  let d=V.sub(target,root),dl=V.len(d);const max=a+b-.01;
  if(dl>max){d=V.mul(d,max/dl);dl=max}
  dl=Math.max(dl,Math.abs(a-b)+.01);
  const u=V.norm(d),x=(a*a-b*b+dl*dl)/(2*dl),y=Math.sqrt(Math.max(0,a*a-x*x));
  let p=V.sub(hint,V.mul(u,V.dot(hint,u)));p=V.len(p)<1e-6?[0,1,0]:V.norm(p);
  return[V.add(V.add(root,V.mul(u,x)),V.mul(p,y)),V.add(root,V.mul(u,dl))];
}
function frameAt(pat,f){
  const K=pat._keys,N=K.length;let q;
  if(N===2)q=lerpPose(K[0],K[1],(1-Math.cos(2*Math.PI*f))/2);
  else{const s=f*N,i=Math.floor(s)%N,e=s-Math.floor(s);q=lerpPose(K[i],K[(i+1)%N],e*e*(3-2*e))}
  const J=joints(q,pat),fx=pat.fix;
  if(fx){
    for(const[k,s]of[['L',1],['R',-1]]){
      if(fx.hands!==undefined){const h=fx.ah||[.6,-.3,-1];const[e,t]=ik(J[k].sho,pat._raw[fx.hands][k].hand,SEG.upper,SEG.fore,[h[0]*s,h[1],h[2]]);J[k].elb=e;J[k].hand=t}
      if(fx.feet!==undefined){const h=(fx.kh&&fx.kh[k])||[.15*s,.2,1];const[e,t]=ik(J[k].hip,pat._raw[fx.feet][k].ank,SEG.thigh,SEG.shin,h);J[k].knee=e;J[k].ank=t}
    }
  }
  if(pat.pedal){
    const{c,r}=pat.pedal,a=2*Math.PI*f;
    for(const[k,s,o]of[['L',1,0],['R',-1,Math.PI]]){
      const tg=[J[k].hip[0],c[1]+r*Math.cos(a+o),c[2]+r*Math.sin(a+o)];
      const[e,t]=ik(J[k].hip,tg,SEG.thigh,SEG.shin,[0,.3,1]);J[k].knee=e;J[k].ank=t;
    }
  }
  J.q=q;return J;
}

/* ---- getting a pattern ready, and sizing it to fit the box ---- */
const cache={};
function prep(name){
  if(cache[name])return cache[name];
  const pat={anchor:'feet',per:2600,cam:SIDE,...(PAT[name]||PAT.curl)};
  pat._keys=resolveKeys(pat.keys);
  pat._raw=pat._keys.map(k=>joints(k,pat));
  pat._k0=frameAt(pat,0);
  const y=pat.cam.yaw*D2R,p=pat.cam.pitch*D2R,cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
  pat.proj=w=>{const X=w[0]*cy+w[2]*sy,D=-w[0]*sy+w[2]*cy;return[X,-w[1]*cp+D*sp,D]};
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  const rec=w=>{const q=pat.proj(w);if(!isFinite(q[0])||!isFinite(q[1]))return;x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])};
  const pen={P:pat.proj,line:(a,b)=>{rec(a);rec(b)},circle:(c,r)=>{rec(V.add(c,[0,r,0]));rec(V.sub(c,[0,r,0]))},poly:pts=>pts.forEach(rec),quad:(a,c,b)=>{rec(a);rec(b)},ellipse:()=>{}};
  for(let i=0;i<24;i++){const J=frameAt(pat,i/24);paint(pen,pat,J,i/24,{measure:true})}
  pat.box2={x0,x1,y0,y1};
  return cache[name]=pat;
}

/* ---- drawing it ---- */
function figurePts(J){return[J.hip,J.sc,J.head,J.L.knee,J.R.knee,J.L.ank,J.R.ank,J.L.elb,J.R.elb,J.L.hand,J.R.hand]}
function toe(J,k,pat){
  const a=J[k].ank;
  if(pat.calf)return[a[0],Math.max(0,(pat.anchor==='hip'?0:0)),a[2]+7];
  const d=V.norm(V.sub(a,J[k].knee));return V.add(a,V.mul([0,d[2],-d[1]],7));
}
function paint(pen,pat,J,f,o){
  const C=o.C||{},meas=o.measure,K0=pat._k0;
  const st=(c,w,a,dash)=>({c,w,a,dash});
  const hm=V.mid(J.L.hand,J.R.hand),hm0=V.mid(K0.L.hand,K0.R.hand);
  if(!meas&&o.big)grid(pen,pat,J,f,C);
  if(!meas&&!pat.bar&&!pat.dipbars)pen.ellipse([J.hip[0],0,J.hip[2]],20,7,{f:C.soft});
  const ptOf=(w,F)=>w==='head'?F.head:w==='sho'?F.sc:w==='elb'?V.mid(F.L.elb,F.R.elb):w==='knee'?V.mid(F.L.knee,F.R.knee):w==='rfoot'?F.R.ank:w==='lfoot'?F.L.ank:w==='hands'?V.mid(F.L.hand,F.R.hand):w==='lhand'?F.L.hand:F.hip;
  // static props
  if(pat.rail)pen.line([0,1,K0.hip[2]-50],[0,1,K0.L.ank[2]+14],st(C.line2,3));
  if(pat.box){const b=pat.box;let cx,cz,h;if(b.pos){cx=0;cz=b.pos[1];h=b.h}else{const p=ptOf(b.at,K0);cx=p[0];cz=p[2]+(b.dz||0);h=p[1]-(b.drop||2)}if(b.pos&&b.pos[0])cx=b.pos[0];box3(pen,[cx,cz],b.w,b.d,Math.max(2,h),C)}
  if(pat.bench){const b=pat.bench,off=b.off||[0,-6,0];const a=V.add(ptOf(b.from,K0),off),c=V.add(ptOf(b.to,K0),off);pen.line(a,c,st(C.line2,7));if(b.legs!==false)for(const e of[a,c])if(e[1]>8)pen.line([e[0],e[1]-3,e[2]],[e[0],0,e[2]],st(C.line2,2.5))}
  if(pat.seat){const h=pat.seat==='follow'?J.hip:K0.hip;pen.line([h[0],h[1]-6,h[2]-9],[h[0],h[1]-6,h[2]+9],st(C.line2,6));if(h[1]>12)pen.line([h[0],h[1]-8,h[2]],[h[0],0,h[2]],st(C.line2,2.5))}
  if(pat.bar){const y=hm0[1];pen.line([-36,y,hm0[2]],[36,y,hm0[2]],st(C.muted,2.2));pen.line([-36,y,hm0[2]],[-36,y+10,hm0[2]],st(C.muted,1.5));pen.line([36,y,hm0[2]],[36,y+10,hm0[2]],st(C.muted,1.5))}
  if(pat.dipbars)for(const k of['L','R']){const h=K0[k].hand;pen.line([h[0],h[1],h[2]-18],[h[0],h[1],h[2]+18],st(C.muted,2.2));pen.line([h[0],h[1],h[2]+14],[h[0],0,h[2]+14],st(C.line2,1.5))}
  if(pat.footplate){const am=V.mid(J.L.ank,J.R.ank),d=V.norm(V.sub(am,J.hip)),p=V.norm([0,d[2],-d[1]]);const c=V.add(am,V.mul(d,3));pen.line(V.add(c,V.mul(p,13)),V.sub(c,V.mul(p,13)),st(C.line2,4))}
  // figure, far side first
  const segs=[];
  const add=(a,b,w,side)=>segs.push({a,b,w,side,d:(pen.P(a)[2]+pen.P(b)[2])/2});
  add(J.hip,J.sc,5,'c');add(J.L.sho,J.R.sho,3,'c');add(J.L.hip,J.R.hip,3,'c');
  for(const k of['L','R']){const g=J[k];add(g.hip,g.knee,4.4,k);add(g.knee,g.ank,4.2,k);add(g.ank,toe(J,k,pat),3,k);add(g.sho,g.elb,3.8,k);add(g.elb,g.hand,3.6,k)}
  const nearSide=(pen.P(J.L.sho)[2]>pen.P(J.R.sho)[2])?'L':'R';
  segs.sort((a,b)=>a.d-b.d);
  for(const s of segs)pen.line(s.a,s.b,st(s.side==='c'||s.side===nearSide?C.accent:C.dim,s.w,1),true);
  if(!meas){for(const k of['L','R'])for(const j of['knee','elb','hand','ank'])pen.circle(J[k][j],1.5,{f:C.ink})}
  pen.circle(J.head,6.5,{f:C.bg,c:C.accent,w:2.2},true);
  // loads + moving props
  const ld=o.load||pat.load;
  if(pat.cable)pen.line(hm,pat.cable.to,st(C.dim,1.2,1,[3,3])),pen.circle(pat.cable.to,2.6,{c:C.dim,w:1.2});
  if(pat.cables){pen.line(J.L.hand,pat.cables[0],st(C.dim,1.2,1,[3,3]));pen.line(J.R.hand,pat.cables[1],st(C.dim,1.2,1,[3,3]))}
  if(ld==='bb'){let ax=V.sub(J.R.hand,J.L.hand);ax=V.len(ax)<4?[1,0,0]:V.norm(ax);const e1=V.sub(J.L.hand,V.mul(ax,-22)),e2=V.add(J.R.hand,V.mul(ax,-22));const pr=pat.plate||9;
    pen.line(V.add(J.L.hand,V.mul(ax,-24)),V.add(J.R.hand,V.mul(ax,24)),st(C.ink,1.8));
    for(const e of[V.add(J.L.hand,V.mul(ax,-15)),V.add(J.R.hand,V.mul(ax,15))])pen.circle(e,pr,{f:C.plate,c:C.accent,w:1.6});void e1;void e2}
  if(ld==='db'||ld==='db1')for(const k of ld==='db1'?['R']:['L','R']){const h=J[k].hand;pen.line(V.add(h,[-5,0,0]),V.add(h,[5,0,0]),st(C.ink,1.6));pen.circle(V.add(h,[-5,0,0]),3.4,{f:C.plate,c:C.accent,w:1.2});pen.circle(V.add(h,[5,0,0]),3.4,{f:C.plate,c:C.accent,w:1.2})}
  if(ld==='kb'){pen.circle(V.add(hm,[0,-5,0]),5,{f:C.plate,c:C.accent,w:1.6})}
  if(ld==='landmine'){pen.line(J.R.hand,[J.R.hand[0],1,-62],st(C.ink,1.8));pen.circle(V.add(J.R.hand,[0,0,4]),6,{f:C.plate,c:C.accent,w:1.4})}
  if(pat.wheel)pen.circle(V.add(hm,[0,-1,0]),6,{f:C.plate,c:C.accent,w:1.6});
  if(pat.jumprope){
    const rot=pat.jumprope,ph=2*Math.PI*rot*(f-.5)+Math.PI,c=V.mid(J.L.hand,J.R.hand),R=c[1]+1;
    const M=V.add(c,[0,R*Math.cos(ph),R*.75*Math.sin(ph)]);M[1]=Math.max(.5,M[1]);
    const ctrl=V.sub(V.mul(M,2),c);pen.quad(J.L.hand,ctrl,J.R.hand,st(C.ink,1.4));
  }
  if(pat.ropes)for(const[k,ph]of[['L',0],['R',Math.PI]]){const h=J[k].hand,A=[h[0]*.6,6,h[2]+105];const pts=[];for(let i=0;i<=26;i++){const t=i/26,p=V.add(V.mul(h,1-t),V.mul(A,t));p[1]+=7*Math.sin(2*Math.PI*(t*2.2-f*2)+ph)*(1-t*.7);pts.push(p)}pen.poly(pts,st(C.ink,1.6))}
}
function box3(pen,[cx,cz],w,d,h,C){
  const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
  const top=[[x0,h,z0],[x1,h,z0],[x1,h,z1],[x0,h,z1]];
  pen.poly(top,{c:C.line2,w:1.4,f:C.soft},true);
  for(const[x,z]of[[x0,z0],[x1,z0],[x1,z1],[x0,z1]])pen.line([x,h,z],[x,0,z],{c:C.line2,w:1.4});
  pen.poly([[x0,0,z0],[x1,0,z0],[x1,0,z1],[x0,0,z1]],{c:C.line2,w:1},true);
}
function grid(pen,pat,J,f,C){
  const step=14,cz=pat._k0.hip[2],cx=0,off=pat.scroll?(f*pat.per*pat.scroll)%step:0;
  for(let i=-5;i<=5;i++){
    const x=cx+i*step;
    for(let j=-6;j<6;j++){const z0=cz+j*step,z1=z0+step,a=Math.max(0,1-Math.hypot(i/5.5,(j+.5)/6.5));if(a>.02)pen.line([x,0,z0],[x,0,z1],{c:C.grid,w:.8,a})}
  }
  for(let j=-6;j<=6;j++){
    const z=cz+j*step-off;
    for(let i=-5;i<5;i++){const a=Math.max(0,1-Math.hypot((i+.5)/5.5,j/6.5));if(a>.02)pen.line([cx+i*step,0,z],[cx+(i+1)*step,0,z],{c:C.grid,w:.8,a})}
  }
}

/* ---- the animation loop: redraws every visible demo about 60 times a second ---- */
let COLORS=null,colorsAt=0;
function readColors(){
  const cs=getComputedStyle(document.documentElement),g=n=>cs.getPropertyValue(n).trim();
  return{accent:g('--accent'),dim:g('--accent-dim'),ink:g('--ink'),muted:g('--muted'),line2:g('--line2'),bg:g('--surface'),soft:g('--accent-soft'),grid:g('--accent-dim'),plate:g('--sunk')};
}
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawCanvas(cv,now){
  const pat=prep(cv.dataset.anim),W=cv.clientWidth,H=cv.clientHeight;if(!W||!H)return;
  const dpr=window.devicePixelRatio||1;
  if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  const big=W>=140,f=REDUCED?.5:(now%pat.per)/pat.per,b=pat.box2;
  const s=Math.min(W*.86/(b.x1-b.x0||1),H*.82/(b.y1-b.y0||1));
  const ox=W/2-(b.x0+b.x1)/2*s,oy=H/2-(b.y0+b.y1)/2*s;
  const C=COLORS;
  const P=w=>{const q=pat.proj(w);return[ox+q[0]*s,oy+q[1]*s,q[2]]};
  ctx.lineCap='round';ctx.lineJoin='round';
  const stroke=(st,glow)=>{ctx.strokeStyle=st.c;ctx.lineWidth=Math.max(big?1:.8,(st.w||1)*s*(big?1:1.15));ctx.globalAlpha=st.a??1;ctx.setLineDash(st.dash?st.dash.map(x=>x*s):[]);if(glow&&big){ctx.shadowColor=C.accent;ctx.shadowBlur=6}ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.setLineDash([])};
  const pen={P,
    line(a,c,st,glow){const A=P(a),B=P(c);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);stroke(st,glow&&st.c===C.accent)},
    circle(c,r,st,glow){const A=P(c);ctx.beginPath();ctx.arc(A[0],A[1],Math.max(.8,r*s),0,7);if(st.f){ctx.fillStyle=st.f;ctx.fill()}if(st.c)stroke({c:st.c,w:st.w||1},glow)},
    poly(pts,st,closed){ctx.beginPath();pts.forEach((w,i)=>{const A=P(w);i?ctx.lineTo(A[0],A[1]):ctx.moveTo(A[0],A[1])});if(closed)ctx.closePath();if(st.f){ctx.fillStyle=st.f;ctx.fill()}stroke(st)},
    quad(a,c,b,st){const A=P(a),Cc=P(c),B=P(b);ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.quadraticCurveTo(Cc[0],Cc[1],B[0],B[1]);stroke(st)},
    ellipse(c,rx,ry,st){const A=P(c);ctx.beginPath();ctx.ellipse(A[0],A[1],rx*s,ry*s*Math.sin(pat.cam.pitch*D2R)*2.4,0,0,7);ctx.fillStyle=st.f;ctx.fill()}};
  paint(pen,pat,frameAt(pat,f),f,{C,big,load:cv.dataset.load||null});
}
let last=0;
function loop(now){
  if(!COLORS||now-colorsAt>1500){COLORS=readColors();colorsAt=now}
  const cvs=document.querySelectorAll('canvas[data-anim]');
  const thumbs=now-last>40;
  cvs.forEach(cv=>{if(cv.clientWidth>=140||thumbs)drawCanvas(cv,now)});
  if(thumbs)last=now;
  requestAnimationFrame(loop);
}
window.SpotterAnim={PAT,prep,frameAt,start:()=>requestAnimationFrame(loop),reset:()=>{COLORS=null}};
})();
