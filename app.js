(()=>{'use strict';
/* =====================================================================
   Robotics Plant Floor Sim
   Floor units: 1 unit ≈ 3.6 ft. Time: sim minutes from 06:00.
   ===================================================================== */
const W=120,H=68,DAY=1200,FT=3.6,BIN=12,ROP=5;
const $=s=>document.querySelector(s);
const rnd=Math.random,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)];
const pad=(n,l=2)=>String(n).padStart(l,'0');
const fmtT=m=>{const t=360+Math.max(0,m);return pad(Math.floor(t/60)%24)+':'+pad(Math.floor(t%60));};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const pct=v=>Math.round(v*100)+'%';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Plan of Record (edit here) ---------- */
const PHASES={
 1:{n:1,demand:350,mix:{DU:200,AMR:150,ARM:0},duLines:1,cells:0,rigs:6,pads:16,crates:2,buffer:12,
    staff:{recv:2,qc:1,fork:2,tug:2,test:2,rep:1,mnt:1,load:2},bots:4},
 2:{n:2,demand:650,mix:{DU:300,AMR:200,ARM:150},duLines:1,cells:3,rigs:10,pads:24,crates:3,buffer:16,
    staff:{recv:2,qc:1,fork:2,tug:2,test:3,rep:1,mnt:2,load:2},bots:5},
 3:{n:3,demand:1000,mix:{DU:450,AMR:300,ARM:250},duLines:2,cells:5,rigs:15,pads:32,crates:4,buffer:20,
    staff:{recv:2,qc:1,fork:3,tug:3,test:4,rep:2,mnt:2,load:3},bots:7}};
const FAM={
 DU:{name:'Drive unit',color:'#D08A1E',test:14,charge:40,fpy:0.90,bom:['chassis','mech','elec','batt'],ops:['Chassis prep','Drivetrain','Electronics','Battery & close-up'],
     fails:['drive-wheel encoder fault','lift mechanism torque out of spec','BMS comms error','fiducial camera misread']},
 AMR:{name:'Mobile robot',color:'#2F7FD6',test:11,charge:30,fpy:0.92,bom:['mech','sens','elec','batt'],ops:['Frame','Drive & sensors','Electronics','Battery & cover'],
     fails:['lidar calibration drift','e-stop circuit fault','BMS comms error','wheel module noise']},
 ARM:{name:'Picking arm',color:'#8B5CC2',test:9,charge:0,fpy:0.94,bom:['mech','elec','sens'],ops:['Cell build'],
     fails:['vacuum gripper leak','joint 3 encoder offset','vision calibration fail']}};
const CK=['mech','chassis','elec','sens','batt'];
const CLS={mech:{name:'Mechanical',short:'MECH',color:'#6F7F8C',smY:7.75,zone:'Selective racking',sup:'Keystone Castings'},
 chassis:{name:'Oversized chassis',short:'CHAS',color:'#A0764A',smY:12.75,zone:'Floor storage',sup:'Northfield Fabrication'},
 elec:{name:'Electronics',short:'ELEC',color:'#2E9E6B',smY:17.75,zone:'ESD cage',sup:'Brightpath Electronics'},
 sens:{name:'Optics & sensors',short:'SENS',color:'#C2549A',smY:22.75,zone:'ESD cage',sup:'Lumen Optics'},
 batt:{name:'Li-ion battery packs',short:'BATT',color:'#D64533',smY:27.75,zone:'Battery room',sup:'Apex Cell Energy'}};
const NEEDS_QC={elec:1,sens:1,batt:1};
const ROLES={
 recv:{label:'Receiver',l:'R',c:'#6C5BB8',cat:'in',sp:42},
 qc:{label:'Incoming QC',l:'Q',c:'#B04F8E',cat:'in',sp:42},
 fork:{label:'Forklift driver',l:'F',c:'#D9861C',cat:'store',sp:60,sq:true},
 tug:{label:'Milk-run driver',l:'M',c:'#1F9AA8',cat:'line',sp:55,sq:true},
 bot:{label:'Logistics AMR',l:'B',c:'#1F9AA8',cat:'line',sp:50,sq:true,robot:true},
 test:{label:'Test technician',l:'T',c:'#2F6FC4',cat:'test',sp:44},
 rep:{label:'Repair technician',l:'X',c:'#B5483B',cat:'test',sp:42},
 mnt:{label:'Maintenance tech',l:'W',c:'#5E6E7C',cat:'mnt',sp:48},
 load:{label:'Shipping loader',l:'L',c:'#7C6A2A',cat:'out',sp:44},
 vis:{label:'Visitor group',l:'V',c:'#8A8F94',cat:'ehs',sp:22,robot:true}};
const NAMES=['Maya','Luis','Priya','Dante','Keisha','Tomás','Hannah','Omar','Grace','Andre','Lena','Marcus','Yuki','Rosa','Ben','Aisha','Carlos','Nina','Theo','Fatima','Jamal','Ivy','Sam','Elena','Raj','Owen','Zara','Diego','Mei','Kofi'];
const CATS={in:'INB',store:'STOR',line:'KAN',asm:'ASM',test:'TEST',chg:'CHG',out:'SHIP',mnt:'ANDN',ehs:'EHS'};

/* ---------- layout ---------- */
const STX=[54,62,70,78], CELLX=[53.5,60.5,67.5,74.5,81.5], CELLY=38.5;
const RIGP=[];[7,11.5,16,20.5].forEach(y=>[95,99.5,104,108.5].forEach(x=>RIGP.push({x,y})));
const PADP=[];[28.8,32.1,35.4,38.7].forEach(y=>{for(let c=0;c<8;c++)PADP.push({x:95+c*2.45,y});});
const CRATEY=[47.5,52,56.5,61];
const FGP=[];[47.5,50.5,53.5,56.5,59.5,62.5].forEach(y=>[106,109,112].forEach(x=>FGP.push({x,y})));
const RSLOT=[];[9.5,13.5].forEach((x,c)=>[14,18.5,23,27.5,32,36.5].forEach((y,r)=>RSLOT.push({code:`RCV-${'AB'[c]}${r+1}`,x,y,ax:c?15.7:7.3})));
const ZPTS={mech:[[21,8],[25,8],[28,8],[21,13.2],[25,13.2],[28,13.2],[21,18.4],[25,18.4],[28,18.4]],chassis:[[20,29],[23,29],[26,29],[28.5,29]],
 elec:[[34,9],[37.5,9],[34,13],[37.5,13]],sens:[[34,17.8],[37.5,17.8]],batt:[[34,30],[37.5,30]]};
const bufPos=i=>({x:90,y:6.4+Math.min(i,21)*1.65});
const chgQPos=i=>({x:94+Math.min(i,14)*1.3,y:25.2});
const crQPos=i=>({x:112.8-Math.min(i,14)*1.3,y:43.4});
const repPos=i=>({x:111.4,y:15.8+Math.min(i,4)*1.6});
const OBS=[
 [19,5.2,29,6.6],[19,9.4,29,11.8],[19,14.6,29,17],[19,19.8,29,21],
 [18.5,25,29.5,27],[18.5,31,29.5,33],
 [31.5,4.6,40.1,5.1],[31.5,5,32,21.1],[39.6,5,40.1,21.1],[31.5,20.6,34.5,21.1],[37.5,20.6,40.1,21.1],
 [33,6.5,38.5,7.3],[33,10.5,38.5,11.3],[33,14.5,38.5,15.3],
 [31.5,23.8,40.5,24.3],[31.5,35.7,40.5,36.2],[31.5,24,32,36.2],[40,24,40.5,28.8],[40,31.2,40.5,36.2],
 [33,25.5,38.5,26.5],[33,33.5,38.5,34.5],
 [43.6,6,46.4,9.5],[43.6,11,46.4,14.5],[43.6,16,46.4,19.5],[43.6,21,46.4,24.5],[43.6,26,46.4,29.5],
 [8,42,15,43.5],[112.5,8,114.6,14],[5,53.5,92,65]];
const ROOMS=[[5,53.5,14,65,'Electrical & IT','switchgear sized for phase 3'],[14,53.5,27,65,'Maintenance','shop & tool crib'],[27,53.5,38,65,'Quality lab',''],
 [38,53.5,52,65,'Offices',''],[52,53.5,68,65,'Break room','lockers & restrooms'],[68,53.5,78,65,'Lobby','visitor entry'],[78,53.5,92,65,'Training','& team rooms']];

/* ---------- pathfinding (grid BFS + string pulling) ---------- */
const grid=new Uint8Array(W*H),prev=new Int32Array(W*H),que=new Int32Array(W*H),routeCache=new Map();
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const free=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!grid[y*W+x];
function markRect(r){for(let y=Math.floor(r[1]);y<Math.ceil(r[3]);y++)for(let x=Math.floor(r[0]);x<Math.ceil(r[2]);x++)if(x>=0&&y>=0&&x<W&&y<H)grid[y*W+x]=1;}
function buildGrid(){grid.fill(0);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(x<5||x>=115||y<3||y>=65)grid[y*W+x]=1;
 OBS.forEach(markRect);
 S.lines.forEach(L=>{L.stations.forEach(s=>markRect([s.x-2.5,s.y-1.8,s.x+2.5,s.y+1.8]));markRect([51,L.y-0.4,86.5,L.y+0.4]);});
 S.cells.forEach(c=>markRect([c.x-2.8,CELLY-2.5,c.x+2.8,CELLY+2.5]));
 S.rigs.forEach(r=>{if(r.installed)markRect([r.x-1.5,r.y-1.5,r.x+1.5,r.y+1.5]);});
 S.crates.forEach(c=>{if(c.installed)markRect([95,c.y-1.5,99,c.y+1.5]);});
 routeCache.clear();}
function nearestFree(cx,cy){if(free(cx,cy))return[cx,cy];for(let r=1;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;if(free(cx+dx,cy+dy))return[cx+dx,cy+dy];}return[cx,cy];}
function bfs(s,g){prev.fill(-1);let h=0,t=0;que[t++]=s;prev[s]=s;
 while(h<t){const c=que[h++];if(c===g)break;const cx=c%W,cy=(c/W)|0;for(const[dx,dy]of DIRS){const nx=cx+dx,ny=cy+dy;if(!free(nx,ny))continue;const n=ny*W+nx;if(prev[n]!==-1)continue;prev[n]=c;que[t++]=n;}}
 if(prev[g]===-1)return null;const p=[];let c=g;while(c!==s){p.push(c);c=prev[c];}p.push(s);return p.reverse();}
function los(ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.ceil(d/0.25);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(!free(Math.floor(x),Math.floor(y)))return false;}return true;}
function route(a,b){const[sx,sy]=nearestFree(Math.floor(a.x),Math.floor(a.y)),[gx,gy]=nearestFree(Math.floor(b.x),Math.floor(b.y));const key=sx+','+sy+','+gx+','+gy;let pts=routeCache.get(key);
 if(!pts){pts=[];const p=bfs(sy*W+sx,gy*W+gx);if(p&&p.length>1){const cs=p.map(c=>({x:c%W+0.5,y:((c/W)|0)+0.5}));let i=0;while(i<cs.length-1){let j=i+1;while(j+1<cs.length&&los(cs[i].x,cs[i].y,cs[j+1].x,cs[j+1].y))j++;pts.push(cs[j]);i=j;}}
  routeCache.set(key,pts);if(routeCache.size>5000)routeCache.clear();}
 const out=pts.map(p=>({x:p.x,y:p.y}));out.push({x:b.x,y:b.y});return out;}

/* ---------- state ---------- */
const U={speed:1,phase:1,logi:'tug',brk:true,labels:'all',paused:false,filter:'all',only:false,sel:null,tour:-1};
let S;
const mv=(to,label,load)=>({k:'move',to,label,load});
const wt=(dur,label)=>({k:'wait',dur,label,el:0});
const sc=(what,code,note)=>({k:'scan',dur:0.12,el:0,what,code,note,label:`Scanning ${what} ${code}`});
const fn=f=>({k:'fn',f,label:''});
const useOf=c=>{let u=0;const m=S.cfg.mix;for(const f in m)if(FAM[f].bom.includes(c))u+=m[f];return u;};
const kitsDay=()=>{let k=0;const m=S.cfg.mix;for(const f in m)k+=m[f]*FAM[f].bom.length;return k;};

function mkStation(o){const s=Object.assign({unit:null,started:false,done:false,rem:0,state:'idle',down:false,built:0,busy:0,starvedAt:null},o);
 s.bins=o.cls.map((c,k)=>({cls:c,qty:BIN,card:false,x:o.binPts[k].x,y:o.binPts[k].y,st:s}));return s;}
function mkLine(id,fam,y){const F=FAM[fam];const L={id,fam,y,stations:[],nextLaunch:rnd()*3,takt:0,launched:0,built:0};S.lines.push(L);
 STX.forEach((x,i)=>L.stations.push(mkStation({kind:'st',id:`${id}-S${i+1}`,name:`${id} station ${i+1} · ${F.ops[i]}`,x,y,fam,line:L,idx:i,cls:[F.bom[i]],binPts:[{x,y:y+2.9}],op:{x,y:y-2.8}})));}

function init(){const cfg=PHASES[U.phase];
 S={cfg,now:0,log:[],seq:0,units:[],unitSeq:1,lines:[],cells:[],testQ:[],repairQ:[],chargeQ:[],crateQ:[],cards:[],maintQ:[],
  W:{mech:400,chassis:240,elec:400,sens:240,batt:320},SM:{mech:96,chassis:96,elec:96,sens:96,batt:96},pipe:{mech:0,chassis:0,elec:0,sens:0,batt:0},smPending:{},shortLog:{},
  shipped:0,crated:0,doneTimes:[],firstTests:0,firstPass:0,scans:0,flowFt:0,idealTest:0,actualTest:0,rigDown:0,rigTime:0,dockOcc:0,dockOccIn:0,dockOccOut:0,
  util:{},flashes:[],nextTruck:4,nextVisit:20,rigsInstalled:cfg.rigs,workers:[]};
 mkLine('DU1','DU',17);mkLine('AMR','AMR',27);if(cfg.duLines>1)mkLine('DU2','DU',8);
 S.lines.forEach(L=>{const n=S.lines.filter(l=>l.fam===L.fam).length;L.takt=DAY/(cfg.mix[L.fam]/n);const bal=[0.72,0.78,0.76,0.7];L.stations.forEach((s,i)=>s.ct=+(L.takt*bal[i]).toFixed(2));});
 for(let i=0;i<cfg.cells;i++){const x=CELLX[i];S.cells.push(mkStation({kind:'cell',id:`ARM-C${i+1}`,name:`Arm cell ${i+1} · full build`,x,y:CELLY,fam:'ARM',cls:['mech','elec','sens'],binPts:[{x:x-1.8,y:34.9},{x,y:34.9},{x:x+1.8,y:34.9}],op:{x,y:CELLY},ct:20}));}
 S.rigs=RIGP.map((p,i)=>({kind:'rig',id:'TR-'+pad(i+1),name:'Test rig TR-'+pad(i+1),x:p.x,y:p.y,unit:null,state:'idle',rem:0,down:false,installed:i<cfg.rigs,tested:0,claimed:false}));
 S.pads=PADP.map((p,i)=>({kind:'pad',id:'CP-'+pad(i+1),name:'Charging pad CP-'+pad(i+1),x:p.x,y:p.y,unit:null,rem:0,tot:1,installed:i<cfg.pads}));
 S.crates=CRATEY.map((y,i)=>({kind:'crate',id:'CR-'+(i+1),name:'Crating station '+(i+1),x:97,y,unit:null,rem:0,done:false,installed:i<cfg.crates,built:0,busy:0}));
 S.fg=FGP.map((p,i)=>({id:'FG-'+pad(i+1),x:p.x,y:p.y,unit:null,claimed:false}));
 S.rslots=RSLOT.map(s=>Object.assign({pallet:null,res:null},s));
 S.rdoors=[18,27,36].map((y,i)=>({code:'R'+(i+1),y,pt:{x:6.4,y},truck:null}));
 S.sdoors=[48,55,62].map((y,i)=>({code:'S'+(i+1),y,pt:{x:113.9,y},carrier:['Ridgeline Freight','Crossroads Carriers','Summit Logistics'][i],trailer:null,nextAt:0,pending:0}));
 S.sdoors.forEach(d=>{d.trailer=newTrailer();d.trailer.arrived=-ri(0,80);});
 S.truckEvery=DAY*480/kitsDay()*0.92;
 let ni=0;const H0={recv:i=>({x:7.3,y:22.5+i*9}),qc:()=>({x:11.5,y:45.3}),fork:i=>({x:18.5+i*3,y:41.5}),tug:i=>({x:48.6,y:33+i*3}),bot:i=>({x:48.6,y:44.5-i*1.4}),
  test:i=>({x:92.4,y:9+i*4.5}),rep:i=>({x:111.3,y:10+i*2.2}),mnt:i=>({x:19+i*3.5,y:51.8}),load:i=>({x:104.4,y:45.4+i*3}),vis:()=>({x:73,y:52.4})};
 const add=(role,i,name)=>{const h=H0[role](i);S.workers.push({id:S.workers.length,name,role,x:h.x,y:h.y,home:h,plan:[],cur:null,homing:false,carry:null,task:'Idle, waiting for work',done:0,scans:0,dist:0,recent:[],sp:ROLES[role].sp});};
 Object.keys(cfg.staff).forEach(r=>{for(let i=0;i<cfg.staff[r];i++)add(r,i,NAMES[ni++]);});
 for(let i=0;i<cfg.bots;i++)add('bot',i,'AMR-'+pad(i+1));
 add('vis',0,'Visitor group');
 buildGrid();
 log('ehs',`Shift start under POR phase ${cfg.n}: plan ${cfg.demand} units/day. ${headcount()} associates on the floor.`,null);
}

/* ---------- log ---------- */
const logEl=$('#log');
const refOf=o=>o?(o.role!=null?'w'+o.id:o.id):null;
function passes(e){if(U.only&&(!U.sel||e.ref!==refOf(U.sel)))return false;if(U.filter==='all')return true;if(U.filter==='scan')return e.scan;return e.cat===U.filter;}
function rowEl(e){const d=document.createElement('div');d.className='row'+(e.lvl?' '+e.lvl:'')+(e.scan?' scan':'');
 d.innerHTML=`<span class="t">${fmtT(e.t)}</span><span class="tag">${e.scan?'SCAN':CATS[e.cat]}</span><span class="m">${e.who?`<button class="who" type="button" data-r="${e.ref}">${esc(e.who)}</button> `:''}${esc(e.msg)}</span>`;return d;}
function log(cat,msg,o,lvl,scan){const e={t:S.now,cat,msg,ref:refOf(o),who:o?o.name:'',lvl:lvl||'',scan:!!scan};S.log.unshift(e);if(S.log.length>600)S.log.pop();
 if(!S.silent&&passes(e)){const em=logEl.querySelector('.empty');if(em)em.remove();logEl.prepend(rowEl(e));while(logEl.childElementCount>160)logEl.lastChild.remove();}}
function renderLog(){logEl.innerHTML='';const f=document.createDocumentFragment();let n=0;for(const e of S.log){if(passes(e)){f.appendChild(rowEl(e));if(++n>=160)break;}}
 if(!n){const d=document.createElement('div');d.className='empty';d.textContent='No events in this view yet.';f.appendChild(d);}logEl.appendChild(f);}
logEl.addEventListener('click',e=>{const b=e.target.closest('.who');if(!b)return;const r=b.dataset.r;const o=findRef(r);if(o)select(o);});
function findRef(r){if(!r)return null;if(r[0]==='w'&&/^w\d+$/.test(r))return S.workers[+r.slice(1)];return allAssets().find(a=>a.id===r)||null;}
function allAssets(){const a=[];S.lines.forEach(L=>a.push(...L.stations));a.push(...S.cells,...S.rigs.filter(r=>r.installed),...S.pads.filter(p=>p.installed),...S.crates.filter(c=>c.installed));return a;}

/* ---------- units ---------- */
function newUnit(fam,x,y){const u={sn:`${fam}-${pad(S.unitSeq++,5)}`,fam,x,y,path:[],moving:false,fails:0,tested:false,crated:false,born:S.now};S.units.push(u);return u;}
function moveUnit(u,t){u.path=route(u,t);u.moving=true;}
function moveUnits(dt){for(const u of S.units){if(!u.moving)continue;let t=dt;const sp=u.fast?90:28;
 while(t>1e-6&&u.path.length){const p=u.path[0],dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy),can=sp*t;if(can>=d){u.x=p.x;u.y=p.y;t-=d/sp;S.flowFt+=d*FT;u.path.shift();}else{u.x+=dx/d*can;u.y+=dy/d*can;S.flowFt+=can*FT;t=0;}}
 if(!u.path.length){u.moving=false;u.fast=false;}}}
function slide(q,pf){q.forEach((u,i)=>{if(u.moving)return;const p=pf(i);if(Math.abs(u.x-p.x)+Math.abs(u.y-p.y)>0.05){u.path=[p];u.moving=true;}});}
function takeReady(q){const i=q.findIndex(u=>!u.moving);return i<0?null:q.splice(i,1)[0];}
function sendToTest(u,from){u.fast=false;S.testQ.push(u);u.path=[...(from?[from]:[]),...route(from||u,bufPos(S.testQ.length-1))];u.moving=true;}

/* ---------- kanban ---------- */
function checkCard(b){if(b.qty<=ROP&&!b.card){b.card=true;S.cards.push({b,at:S.now,claimed:false});log('line',`Kanban card raised: ${b.st.id} ${CLS[b.cls].short} bin at ${b.qty}`,b.st);}}

/* ---------- assembly ---------- */
function breakdown(s,mtbf,what){if(U.brk&&rnd()<S.dt/mtbf){s.down=true;s.downAt=S.now;s.state='down';S.maintQ.push(s);log('mnt',`ANDON ${s.id}: ${what}. Maintenance called.`,s,'crit');return true;}return false;}
function startWork(s){if(s.bins.every(b=>b.qty>0)){s.bins.forEach(b=>{b.qty--;checkCard(b);});s.started=true;s.rem=s.ct*(0.95+rnd()*0.1);s.state='work';
  if(s.starvedAt!=null){log('mnt',`${s.id} restarted after ${Math.max(1,Math.round(S.now-s.starvedAt))} min starved`,s);s.starvedAt=null;}return true;}
 if(s.state!=='starved'){s.state='starved';s.starvedAt=S.now;const miss=s.bins.filter(b=>b.qty<=0).map(b=>CLS[b.cls].name.toLowerCase()).join(', ');log('mnt',`ANDON ${s.id}: starved, no ${miss} at line side`,s,'warn');}return false;}
function lineStep(L,dt){const st=L.stations;
 for(let i=st.length-1;i>=0;i--){const s=st[i];if(!s.unit||!s.done)continue;
  if(i===st.length-1){if(S.testQ.length<S.cfg.buffer){const u=s.unit;s.unit=null;s.done=false;s.started=false;L.built++;sendToTest(u,{x:87.3,y:L.y});log('asm',`${u.sn} off line ${L.id} into the test buffer`,s);}else s.state='blocked';}
  else{const n=st[i+1];if(!n.unit){n.unit=s.unit;n.started=false;n.done=false;n.unit.path=[{x:n.x,y:n.y}];n.unit.moving=true;n.unit.fast=true;s.unit=null;s.done=false;s.started=false;}else s.state='blocked';}}
 if(S.now>=L.nextLaunch&&!st[0].unit&&!st[0].down){st[0].unit=newUnit(L.fam,51.5,L.y);st[0].unit.path=[{x:st[0].x,y:L.y}];st[0].unit.moving=true;st[0].unit.fast=true;st[0].started=false;st[0].done=false;L.launched++;
  L.nextLaunch=Math.max(L.nextLaunch+L.takt,S.now+L.takt*0.5);}
 for(const s of st){if(s.down){s.state='down';continue;}if(!s.unit){s.state='idle';continue;}if(s.done)continue;if(s.unit.moving){s.state='idle';continue;}
  if(!s.started){startWork(s);continue;}s.state='work';s.busy+=dt;if(breakdown(s,480,pick(['nutrunner fault','fixture clamp sensor','torque tool out of calibration'])))continue;
  s.rem-=dt;if(s.rem<=0){s.done=true;s.built++;}}}
function cellStep(c,dt){if(c.down){c.state='down';return;}
 if(c.unit&&c.done){if(S.testQ.length<S.cfg.buffer){const u=c.unit;c.unit=null;c.done=false;c.built++;sendToTest(u,{x:c.x,y:34.9});log('asm',`${u.sn} built in ${c.id}, sent to test`,c);}else c.state='blocked';return;}
 if(!c.unit){if(S.now<(c.nextStart||0)){c.state='idle';return;}if(startWork(c)){c.nextStart=S.now+DAY*S.cells.length/S.cfg.mix.ARM;c.unit=newUnit('ARM',c.x,CELLY);c.rem=c.ct*(0.95+rnd()*0.1);}return;}
 c.state='work';c.busy+=dt;if(breakdown(c,400,pick(['robot teach pendant fault','light curtain trip','end-effector sensor fault'])))return;c.rem-=dt;if(c.rem<=0)c.done=true;}

/* ---------- test, repair, charging, crating ---------- */
function finishTest(r){const u=r.unit,F=FAM[u.fam];r.unit=null;r.state='idle';r.tested++;S.idealTest+=F.test;S.actualTest+=r.dur;
 const first=!u.tested;u.tested=true;if(first)S.firstTests++;const pass=rnd()<(first?F.fpy:0.97);
 if(pass){if(first)S.firstPass++;if(u.fam==='ARM'){S.crateQ.push(u);moveUnit(u,crQPos(S.crateQ.length-1));}else{S.chargeQ.push(u);moveUnit(u,chgQPos(S.chargeQ.length-1));}
  log('test',`${u.sn} PASS on ${r.id} in ${r.dur.toFixed(1)} min${first?'':' (retest)'}${u.fam==='DU'?', lift and payload check OK':u.fam==='AMR'?', navigation and e-stop OK':', pick-cycle repeatability OK'}`,r,'');}
 else{u.fails++;u.fault=pick(F.fails);S.repairQ.push(u);moveUnit(u,repPos(S.repairQ.length-1));log('test',`${u.sn} FAIL on ${r.id}: ${u.fault}. Routed to repair.`,r,'warn');}}
function testStep(dt){for(const r of S.rigs){if(!r.installed)continue;S.rigTime+=dt;if(r.down){S.rigDown+=dt;r.state='down';continue;}
 if(!r.unit){const h=takeReady(S.testQ);if(h){r.unit=h;r.state='wait';r.claimed=false;moveUnit(h,r);}else r.state='idle';continue;}
 if(r.state==='test'){if(breakdown(r,320,pick(['load cell drift','power analyzer fault','fixture interlock open'])))continue;r.rem-=dt;if(r.rem<=0)finishTest(r);}}}
function padStep(dt){for(const p of S.pads){if(!p.installed)continue;
 if(p.unit){if(p.unit.moving)continue;p.rem-=dt;if(p.rem<=0){const u=p.unit;p.unit=null;S.crateQ.push(u);moveUnit(u,crQPos(S.crateQ.length-1));log('chg',`${u.sn} charged to ship level on ${p.id}, released to crating`,p);}}
 else{const u=takeReady(S.chargeQ);if(!u)continue;p.unit=u;p.tot=p.rem=FAM[u.fam].charge*(0.9+rnd()*0.2);moveUnit(u,p);}}}
function crateStep(dt){for(const c of S.crates){if(!c.installed)continue;
 if(c.unit){if(c.unit.moving)continue;if(!c.done){c.rem-=dt;c.busy+=dt;if(c.rem<=0)c.done=true;}
  if(c.done){const slot=S.fg.find(f=>!f.unit);if(slot){const u=c.unit;u.crated=true;slot.unit=u;moveUnit(u,slot);c.unit=null;c.done=false;c.built++;S.crated++;S.doneTimes.push(S.now);
   log('out',`${u.sn} crated${u.fam==='DU'?' on a heavy-duty skid':''}, label printed, staged at ${slot.id}`,c);}}}
 else{const u=takeReady(S.crateQ);if(!u)continue;c.unit=u;c.rem=3.2*(0.9+rnd()*0.2);c.done=false;moveUnit(u,c);}}}

/* ---------- inbound / outbound ---------- */
function lowCls(){let best=null,bv=1e9;for(const c of CK){const use=useOf(c);if(!use)continue;const v=(S.W[c]+S.SM[c]+S.pipe[c])/use;if(v<bv){bv=v;best=c;}}return best||'mech';}
function newTruck(){const pallets=[];for(let i=0;i<12;i++){const c=lowCls();S.pipe[c]+=40;pallets.push({lpn:'LPN'+ri(100000,999999),cls:c,qty:40,state:'truck',claimed:false});}
 const t={id:'INB-'+ri(3100,3999),pallets,leaveAt:0,arrived:S.now};const d=S.rdoors.find(d=>!d.truck);
 if(d){d.truck=t;const z={};pallets.forEach(p=>z[p.cls]=(z[p.cls]||0)+1);log('in',`${t.id} docked at ${d.code}: 12 pallets (${Object.keys(z).map(k=>z[k]+' '+CLS[k].short).join(', ')})`,null);}
 else log('in',`${t.id} turned away to the yard: all inbound doors busy`,null,'warn');}
function newTrailer(){return{id:'TRL-'+ri(200,899),cap:24,load:[],arrived:S?S.now:0};}
function dockStep(dt){
 S.rdoors.forEach(d=>{const t=d.truck;if(t&&t.leaveAt&&S.now>=t.leaveAt){log('in',`${t.id} unloaded in ${Math.round(S.now-t.arrived)} min and released from ${d.code}`,null);d.truck=null;}});
 S.sdoors.forEach(d=>{const tr=d.trailer;
  if(tr&&d.pending===0&&(tr.load.length>=tr.cap||(S.now-tr.arrived>=150&&tr.load.length>0))){log('out',`${tr.id} sealed and departed ${d.code} with ${tr.load.length} crated units for ${d.carrier}`,null,'ok');d.trailer=null;d.nextAt=S.now+ri(8,12);}
  else if(!tr&&S.now>=d.nextAt){d.trailer=newTrailer();log('out',`Empty trailer ${d.trailer.id} backed into ${d.code}`,null);}});
 S.rslots.forEach(s=>{const p=s.pallet;if(p&&p.state==='hold'&&S.now>=p.holdUntil){log('in',`${p.lpn} returned to supplier from ${s.code}`,null);S.pipe[p.cls]-=40;s.pallet=null;}});
 const ri_=S.rdoors.filter(d=>d.truck).length,ro=S.sdoors.filter(d=>d.trailer).length;S.dockOccIn+=ri_*dt;S.dockOccOut+=ro*dt;}

/* ---------- task choosers ---------- */
const locCode=c=>({mech:'RK-',chassis:'FL-',elec:'ESD-',sens:'ESD-O',batt:'BR-'}[c])+pad(ri(1,24));
function battNote(c){return c==='batt'?[fn(w=>{log('ehs',`Battery room: ${w.name} badge-in, fire door closed behind`,w);})]:[];}
function chooseRecv(w){let best=null,bs=1e9;S.rdoors.forEach(d=>{const t=d.truck;if(!t)return;const p=t.pallets.find(p=>!p.claimed);if(!p)return;const v=dist(w,d.pt);if(v<bs){bs=v;best={d,t,p};}});
 if(!best)return null;const slot=S.rslots.find(s=>!s.pallet&&!s.res);if(!slot)return null;const{d,t,p}=best;p.claimed=true;slot.res=p;w.task=`Unload ${p.lpn} from ${t.id}`;
 return[mv(d.pt,`Walking to door ${d.code}`),sc('DOOR',d.code,t.id),sc('LPN',p.lpn,`${CLS[p.cls].name}, ${p.qty} kits`),wt(0.8,'Unloading pallet'),
  fn(w=>{t.pallets.splice(t.pallets.indexOf(p),1);w.carry={kind:'pallet',cls:p.cls};if(!t.pallets.length)t.leaveAt=S.now+3;}),
  mv({x:slot.ax,y:slot.y},`Moving pallet to ${slot.code}`,true),sc('STAGE',slot.code),
  fn(w=>{w.carry=null;slot.res=null;slot.pallet=p;p.state=NEEDS_QC[p.cls]?'qc':'put';p.claimed=false;p.at=S.now;w.done++;log('in',`${p.lpn} staged at ${slot.code}${NEEDS_QC[p.cls]?', waiting for incoming QC':', cleared for putaway'}`,w);})];}
function chooseQC(w){const c=S.rslots.filter(s=>s.pallet&&s.pallet.state==='qc'&&!s.pallet.claimed).sort((a,b)=>a.pallet.at-b.pallet.at)[0];if(!c)return null;const p=c.pallet;p.claimed=true;w.task=`Incoming QC ${p.lpn}`;
 const what={elec:'Checking ESD packaging and sampling boards',sens:'Checking optics seals and humidity cards',batt:'Checking SoC, swelling and UN38.3 labels'}[p.cls];
 return[mv({x:c.ax,y:c.y},`Walking to ${c.code}`),sc('LPN',p.lpn,CLS[p.cls].name),wt(1.5,what),
  fn(w=>{p.claimed=false;w.done++;if(rnd()<0.03){p.state='hold';p.holdUntil=S.now+6;log('in',`QC HOLD ${p.lpn}: ${p.cls==='batt'?'pack swelling on 2 units':p.cls==='sens'?'humidity indicator tripped':'ESD bag seal broken'}`,w,'crit');}
   else{p.state='put';log('in',`QC pass ${p.lpn}: ${p.cls==='batt'?'SoC 32%, no damage':p.cls==='sens'?'seals intact':'ESD packaging intact'}`,w,'ok');}})];}
function chooseFork(w){let need=null;for(const c of CK){if(S.SM[c]<48&&!S.smPending[c]&&S.W[c]>=40&&(!need||S.SM[c]<S.SM[need]))need=c;}
 if(need){const c=need;S.smPending[c]=true;const z=pick(ZPTS[c]),from={x:z[0],y:z[1]};w.task=`Replenish supermarket: ${CLS[c].name}`;
  return[mv(from,`To ${CLS[c].zone.toLowerCase()}`),...battNote(c),sc('LOC',locCode(c),'full pallet'),wt(0.4,'Lifting pallet'),fn(w=>{S.W[c]-=40;w.carry={kind:'pallet',cls:c};}),
   mv({x:42.3,y:CLS[c].smY},'To supermarket',true),sc('LANE','SM-'+CLS[c].short,'flow rack'),wt(0.5,'Loading flow rack'),
   fn(w=>{S.SM[c]+=40;S.smPending[c]=false;w.carry=null;w.done++;log('store',`Supermarket ${CLS[c].name.toLowerCase()} lane replenished to ${S.SM[c]} kits`,w,'ok');})];}
 for(const c of CK){if(S.SM[c]<48&&S.W[c]<40&&!S.shortLog[c]){S.shortLog[c]=true;log('store',`Warehouse out of ${CLS[c].name.toLowerCase()}. Supermarket at ${S.SM[c]} kits and falling.`,null,'crit');}}
 const s=S.rslots.filter(s=>s.pallet&&s.pallet.state==='put'&&!s.pallet.claimed).sort((a,b)=>a.pallet.at-b.pallet.at)[0];if(!s)return null;const p=s.pallet;p.claimed=true;
 const z=pick(ZPTS[p.cls]),to={x:z[0],y:z[1]};w.task=`Putaway ${p.lpn} to ${CLS[p.cls].zone.toLowerCase()}`;
 return[mv({x:s.ax,y:s.y},`Driving to ${s.code}`),sc('LPN',p.lpn,CLS[p.cls].zone),wt(0.4,'Lifting pallet'),fn(w=>{s.pallet=null;w.carry={kind:'pallet',cls:p.cls};}),
  mv(to,`Driving to ${CLS[p.cls].zone.toLowerCase()}`,true),...battNote(p.cls),sc('LOC',locCode(p.cls),'putaway'),wt(0.5,'Placing pallet'),
  fn(w=>{S.W[p.cls]+=40;S.pipe[p.cls]-=40;S.shortLog[p.cls]=false;w.carry=null;w.done++;
   log('store',`${p.lpn} put away in ${CLS[p.cls].zone.toLowerCase()}${p.cls==='batt'?` (${S.W.batt} of 480 kit fire-area limit)`:''}`,w,'ok');})];}
function smOk(c,need){return S.SM[c]>=need;}
function chooseTug(w){if(U.logi!=='tug')return null;const open=S.cards.filter(c=>!c.claimed);if(!open.length)return null;
 if(S.now-(w.lastLoop??-99)<10&&open.length<4)return null;
 const take=[],need={};for(const c of open.sort((a,b)=>a.at-b.at)){if(take.length>=8)break;const cl=c.b.cls;const n=(need[cl]||0)+BIN;if(smOk(cl,n)){need[cl]=n;take.push(c);}}
 if(!take.length){for(const c of open){if(!S.shortLog['sm'+c.b.cls]){S.shortLog['sm'+c.b.cls]=true;log('line',`Supermarket short of ${CLS[c.b.cls].name.toLowerCase()}: kanban cards waiting`,null,'warn');}}return null;}
 take.forEach(c=>c.claimed=true);w.lastLoop=S.now;take.sort((a,b)=>a.b.y-b.b.y||a.b.x-b.b.x);w.task=`Milk run: ${take.length} bins`;
 const steps=[];Object.keys(need).forEach(cl=>{steps.push(mv({x:47.4,y:CLS[cl].smY},'Loading at supermarket'),sc('LANE','SM-'+CLS[cl].short,`${need[cl]/BIN} bin${need[cl]>BIN?'s':''}`),fn(w=>{S.SM[cl]-=need[cl];S.shortLog['sm'+cl]=false;w.carry={kind:'bins'};}));});
 take.forEach(c=>steps.push(mv({x:c.b.x,y:c.b.y},`To ${c.b.st.id}`,true),sc('BIN',`${c.b.st.id}-${CLS[c.b.cls].short}`,'kanban card closed'),fn(w=>deliverBin(w,c))));
 steps.push(fn(w=>{w.carry=null;w.done++;log('line',`Milk run complete: ${take.length} bins in ${Math.round(S.now-w.lastLoop)} min`,w);}));return steps;}
function deliverBin(w,c){c.b.qty+=BIN;c.b.card=false;const i=S.cards.indexOf(c);if(i>=0)S.cards.splice(i,1);S.flowFt+=0;}
function chooseBot(w){if(U.logi!=='amr')return null;const c=S.cards.filter(c=>!c.claimed&&smOk(c.b.cls,BIN)).sort((a,b)=>a.at-b.at)[0];if(!c)return null;c.claimed=true;const cl=c.b.cls;w.task=`Deliver ${CLS[cl].short} bin to ${c.b.st.id}`;
 return[mv({x:47.4,y:CLS[cl].smY},'To supermarket'),sc('LANE','SM-'+CLS[cl].short,'fiducial'),fn(w=>{S.SM[cl]-=BIN;w.carry={kind:'bins'};}),mv({x:c.b.x,y:c.b.y},`To ${c.b.st.id}`,true),sc('BIN',`${c.b.st.id}-${CLS[cl].short}`,'fiducial'),
  fn(w=>{deliverBin(w,c);w.carry=null;w.done++;})];}
function chooseTest(w){const r=S.rigs.filter(r=>r.installed&&r.state==='wait'&&!r.claimed&&r.unit&&!r.unit.moving&&!r.down).sort((a,b)=>dist(w,a)-dist(w,b))[0];if(!r)return null;r.claimed=true;const u=r.unit;w.task=`Hook up ${u.sn} on ${r.id}`;
 return[mv({x:r.x-2.1,y:r.y},`To ${r.id}`),sc('SN',u.sn,`${FAM[u.fam].name} on ${r.id}`),wt(1,'Connecting test harness'),fn(w=>{r.state='test';r.dur=r.rem=FAM[u.fam].test*(0.95+rnd()*0.15);r.claimed=false;w.done++;})];}
function chooseRep(w){const u=S.repairQ.find(u=>!u.moving&&!u.claimed);if(!u)return null;u.claimed=true;w.task=`Repair ${u.sn}: ${u.fault}`;
 return[mv({x:111.3,y:u.y-0.1},'At repair bench'),sc('SN',u.sn,u.fault),wt(ri(12,18),`Diagnosing: ${u.fault}`),
  fn(w=>{u.claimed=false;w.done++;const i=S.repairQ.indexOf(u);if(i>=0)S.repairQ.splice(i,1);S.testQ.unshift(u);moveUnit(u,bufPos(0));log('test',`${u.sn} repaired (${u.fault}), back to the head of the test buffer`,w,'ok');})];}
function chooseMnt(w){const e=S.maintQ.find(e=>!e.mClaimed);if(!e)return null;e.mClaimed=true;w.task=`Work order: ${e.id}`;
 const pt=e.kind==='rig'?{x:e.x-2.1,y:e.y}:e.kind==='cell'?{x:e.x,y:34.9}:{x:e.x,y:e.y-2.8};
 return[mv(pt,`Responding to ${e.id}`),sc('ASSET',e.id,'work order opened'),wt(ri(5,10),`Repairing ${e.id}`),
  fn(w=>{e.down=false;e.mClaimed=false;e.state=e.kind==='rig'?'test':'idle';S.maintQ.splice(S.maintQ.indexOf(e),1);w.done++;log('mnt',`${e.id} back in service. Downtime ${Math.round(S.now-e.downAt)} min.`,w,'ok');})];}
function chooseLoad(w){const crates=S.fg.filter(f=>f.unit&&!f.claimed&&!f.unit.moving);if(!crates.length)return null;
 const d=S.sdoors.filter(d=>d.trailer&&d.trailer.load.length+d.pending<d.trailer.cap).sort((a,b)=>b.trailer.load.length-a.trailer.load.length)[0];if(!d)return null;
 const f=crates.sort((a,b)=>a.unit.born-b.unit.born)[0],u=f.unit,tr=d.trailer;f.claimed=true;d.pending++;w.task=`Load ${u.sn} onto ${tr.id}`;
 return[mv({x:f.x-1.5,y:f.y},`To ${f.id}`),sc('CRATE',u.sn,f.id),fn(w=>{f.unit=null;f.claimed=false;u.hidden=true;w.carry={kind:'crate',fam:u.fam};}),mv(d.pt,`To door ${d.code}`,true),sc('TRAILER',tr.id,d.code),wt(0.5,'Loading crate'),
  fn(w=>{w.carry=null;w.done++;d.pending--;tr.load.push(u);S.shipped++;S.units.splice(S.units.indexOf(u),1);log('out',`${u.sn} loaded on ${tr.id} (${tr.load.length}/${tr.cap})`,w,'ok');})];}
function chooseVis(w){if(S.now<S.nextVisit)return null;S.nextVisit=S.now+ri(110,150);w.task='Visitor tour on the gallery route';
 log('ehs','Visitor tour left the lobby on the gallery walkway, separated from forklift and AMR lanes',w);
 return[mv({x:73,y:51.8},'Entering gallery'),mv({x:53,y:51.8},'Walking the gallery'),wt(3,'Viewing the assembly lines'),mv({x:88,y:51.8},'Walking the gallery'),wt(3,'Viewing end-of-line test'),mv({x:73,y:52.4},'Returning to lobby'),fn(w=>{log('ehs','Visitor tour returned to the lobby',w);})];}
const CHOOSE={recv:chooseRecv,qc:chooseQC,fork:chooseFork,tug:chooseTug,bot:chooseBot,test:chooseTest,rep:chooseRep,mnt:chooseMnt,load:chooseLoad,vis:chooseVis};
function decide(w){if(w.homing&&!w.cur&&!w.plan.length){w.homing=false;w.task='Idle, waiting for work';}
 const p=CHOOSE[w.role](w);if(p){w.plan=p;w.cur=null;w.homing=false;return;}
 if(!w.homing&&dist(w,w.home)>0.5){w.plan=[mv(w.home,'Returning to home position')];w.cur=null;w.homing=true;w.task='Idle, returning to position';}}
function doScan(w,s){w.scans++;S.scans++;w.recent.unshift({t:S.now,what:s.what,code:s.code});if(w.recent.length>6)w.recent.pop();
 log(ROLES[w.role].cat,`${s.what} ${s.code} ✓${s.note?'  '+s.note:''}`,w,'',true);if(!S.silent)S.flashes.push({x:w.x,y:w.y,t:0,c:ROLES[w.role].c});}
function stepWorker(w,dt){let t=dt,g=0;
 while(t>1e-6&&g++<30){
  if(!w.cur){if(!w.plan.length)break;w.cur=w.plan.shift();if(w.cur.k==='move')w.cur.pts=route({x:w.x,y:w.y},w.cur.to);}
  const s=w.cur;
  if(s.k==='move'){const sp=w.sp*(s.load?0.8:1);
   while(t>1e-6&&s.pts.length){const p=s.pts[0],dx=p.x-w.x,dy=p.y-w.y,d=Math.hypot(dx,dy),can=sp*t;
    if(can>=d){w.x=p.x;w.y=p.y;t-=d/sp;w.dist+=d;if(s.load)S.flowFt+=d*FT;s.pts.shift();}else{w.x+=dx/d*can;w.y+=dy/d*can;w.dist+=can;if(s.load)S.flowFt+=can*FT;t=0;}}
   if(!s.pts.length)w.cur=null;}
  else if(s.k==='wait'||s.k==='scan'){const need=s.dur-s.el;if(t>=need){t-=need;w.cur=null;if(s.k==='scan')doScan(w,s);}else{s.el+=t;t=0;}}
  else{w.cur=null;const extra=s.f(w);if(extra)w.plan.unshift(...extra);}}}

/* ---------- metrics ---------- */
function ema(k,x,dt){const o=S.util[k];S.util[k]=o==null?x:o+(x-o)*Math.min(1,dt/60);}
function metrics(dt){
 S.lines.forEach(L=>ema(L.id,L.stations.filter(s=>s.state==='work').length/4,dt));
 if(S.cells.length)ema('cells',S.cells.filter(c=>c.state==='work').length/S.cells.length,dt);
 const rigs=S.rigs.filter(r=>r.installed);ema('test',rigs.filter(r=>r.unit||r.down).length/rigs.length,dt);
 const pads=S.pads.filter(p=>p.installed);ema('pads',pads.filter(p=>p.unit).length/pads.length,dt);
 const cr=S.crates.filter(c=>c.installed);ema('crate',cr.filter(c=>c.unit).length/cr.length,dt);
 const busy=r=>{const ws=S.workers.filter(w=>w.role===r);return ws.length?ws.filter(w=>(w.cur||w.plan.length)&&!w.homing).length/ws.length:0;};
 ema('milk',busy(U.logi==='tug'?'tug':'bot'),dt);ema('fork',busy('fork'),dt);ema('test_t',busy('test'),dt);
 ema('dock',(S.rdoors.filter(d=>d.truck).length+S.sdoors.filter(d=>d.trailer).length)/6,dt);
 while(S.doneTimes.length&&S.doneTimes[0]<S.now-120)S.doneTimes.shift();}
function headcount(){let n=0;S.workers.forEach(w=>{if(ROLES[w.role].robot)return;if(w.role==='tug'&&U.logi!=='tug')return;n++;});return n+S.lines.length*4+S.cells.length+S.crates.filter(c=>c.installed).length;}

/* ---------- tick ---------- */
function tick(dt){S.dt=dt;S.now+=dt;
 if(S.now>=S.nextTruck){newTruck();S.nextTruck=S.now+S.truckEvery*(0.85+rnd()*0.3);}
 dockStep(dt);S.lines.forEach(L=>lineStep(L,dt));S.cells.forEach(c=>cellStep(c,dt));testStep(dt);padStep(dt);crateStep(dt);
 slide(S.testQ,bufPos);slide(S.chargeQ,chgQPos);slide(S.crateQ,crQPos);slide(S.repairQ,repPos);
 for(const w of S.workers){if((!w.cur&&!w.plan.length)||w.homing)decide(w);stepWorker(w,dt);}
 moveUnits(dt);metrics(dt);}

/* ---------- drawing ---------- */
const cv=$('#floor'),ctx=cv.getContext('2d');let scale=8,dpr=1,C={};
const TOK=['bg','panel','panel-2','ink','ink-2','ink-3','line','floor','floor-grid','rack','lane-fork','lane-walk','accent','ok','warn','crit','idle','blocked','hl'];
function readColors(){const cs=getComputedStyle(document.documentElement);TOK.forEach(k=>C[k]=cs.getPropertyValue('--'+k).trim());}
function rgba(hex,a){if(!hex||hex[0]!=='#')return hex;const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function resize(){const wrap=cv.parentElement;const w=Math.max(wrap.clientWidth,760);const h=w*H/W;dpr=window.devicePixelRatio||1;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.height=h+'px';scale=w/W;}
const FD="'Chakra Petch','Arial Narrow',sans-serif",FB="'Archivo',system-ui,sans-serif",FM="'JetBrains Mono',ui-monospace,monospace";
function txt(s,x,y,o={}){const fs=Math.max(o.size||1.2,(o.min||9.5)/scale);ctx.font=`${o.w||600} ${fs}px ${o.f||FD}`;ctx.fillStyle=o.c||C['ink-2'];ctx.textAlign=o.a||'left';ctx.textBaseline=o.b||'alphabetic';ctx.fillText(s,x,y);}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
const lab=()=>U.labels!=='off';
function area(x,y,w,h,label,sub,o={}){ctx.fillStyle=o.fill||rgba(C.panel,0.5);ctx.fillRect(x,y,w,h);ctx.setLineDash(o.dash||[0.5,0.4]);ctx.strokeStyle=o.stroke||C['ink-3'];ctx.lineWidth=(o.lw||1)/scale;ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
 if(lab()&&label){const ly=o.top?y+1.5:y+h-0.6;txt(label.toUpperCase(),x+0.5,ly,{size:1.1,min:9,c:o.lc||C['ink-2']});if(sub)txt(sub,x+0.5,o.top?ly+1.3:ly-1.3,{size:0.9,min:8,f:FB,w:500,c:C['ink-3']});}}
function hatch(x,y,w,h,col){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle=col;ctx.lineWidth=1/scale;ctx.beginPath();for(let k=-h;k<w;k+=1.2){ctx.moveTo(x+k,y+h);ctx.lineTo(x+k+h,y);}ctx.stroke();ctx.restore();}
const STC=s=>({work:C.ok,starved:C.warn,blocked:C.blocked,down:C.crit,idle:C.idle,wait:C.warn,test:C.ok}[s]||C.idle);
function drawBin(b){const f=Math.min(1,b.qty/BIN);ctx.fillStyle=rgba(CLS[b.cls].color,0.22);ctx.fillRect(b.x-0.6,b.y-0.5,1.2,1);ctx.fillStyle=CLS[b.cls].color;ctx.fillRect(b.x-0.6,b.y+0.5-f,1.2,f);
 if(b.card){ctx.fillStyle=C.warn;ctx.fillRect(b.x+0.5,b.y-0.9,0.5,0.6);}}
function drawOp(x,y){ctx.beginPath();ctx.arc(x,y,0.75,0,7);ctx.fillStyle=C.ok;ctx.fill();ctx.strokeStyle=C.floor;ctx.lineWidth=1.5/scale;ctx.stroke();txt('A',x,y+0.05,{size:0.9,min:6.5,a:'center',b:'middle',c:'#fff',f:FB});}
function drawUnit(u){if(u.hidden)return;const col=FAM[u.fam].color;
 if(u.crated){ctx.fillStyle='#9C7A4F';ctx.fillRect(u.x-0.8,u.y-0.8,1.6,1.6);ctx.fillStyle=col;ctx.fillRect(u.x-0.8,u.y-0.8,1.6,0.45);ctx.strokeStyle=C.floor;ctx.lineWidth=1/scale;ctx.strokeRect(u.x-0.8,u.y-0.8,1.6,1.6);return;}
 rr(u.x-0.7,u.y-0.7,1.4,1.4,0.3);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle=C.floor;ctx.lineWidth=1.2/scale;ctx.stroke();}
function draw(ms){const px=1/scale;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
 ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=C.floor;ctx.fillRect(5,3,110,62);
 ctx.strokeStyle=C['floor-grid'];ctx.lineWidth=px;ctx.beginPath();for(let x=10;x<115;x+=5){ctx.moveTo(x,3);ctx.lineTo(x,65);}for(let y=5;y<65;y+=5){ctx.moveTo(5,y);ctx.lineTo(115,y);}ctx.stroke();
 ctx.strokeStyle=C['ink-2'];ctx.lineWidth=2.5*px;ctx.strokeRect(5,3,110,62);
 // traffic lanes (EHS segregation)
 ctx.fillStyle=rgba(C['lane-fork'],0.1);ctx.fillRect(5.5,44,86.5,2.8);ctx.strokeStyle=C['lane-fork'];ctx.lineWidth=1.5*px;ctx.setLineDash([1,0.7]);ctx.beginPath();ctx.moveTo(5.5,44);ctx.lineTo(92,44);ctx.moveTo(5.5,46.8);ctx.lineTo(92,46.8);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=rgba(C['lane-walk'],0.13);ctx.fillRect(5.5,47.6,86.5,2.2);ctx.strokeStyle=C['lane-walk'];ctx.beginPath();ctx.moveTo(5.5,47.6);ctx.lineTo(92,47.6);ctx.moveTo(5.5,49.8);ctx.lineTo(92,49.8);ctx.stroke();
 ctx.setLineDash([0.4,0.4]);ctx.strokeStyle=rgba(C['ink-3'],0.8);ctx.beginPath();ctx.moveTo(50,51.8);ctx.lineTo(90,51.8);ctx.stroke();ctx.setLineDash([]);
 if(lab()){txt('FORKLIFT & AMR LANE',91.5,45.9,{size:0.9,min:8,c:C['lane-fork'],a:'right'});txt('PEDESTRIAN WALKWAY',91.5,49.2,{size:0.9,min:8,c:C['lane-walk'],a:'right'});txt('VISITOR GALLERY ROUTE',50.2,51.3,{size:0.85,min:7.5,c:C['ink-3']});}
 // rooms
 ROOMS.forEach(r=>{ctx.fillStyle=C['panel-2'];ctx.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);ctx.strokeStyle=C['ink-3'];ctx.lineWidth=px;ctx.strokeRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);
  if(lab()){txt(r[4].toUpperCase(),r[0]+0.6,r[1]+2,{size:1.05,min:8.5,c:C['ink-2']});if(r[5])txt(r[5],r[0]+0.6,r[1]+3.4,{size:0.85,min:7.5,f:FB,w:500,c:C['ink-3']});}});
 // receiving
 area(5.8,10,11.4,37.2,'Receiving',null,{top:true});
 ctx.fillStyle=C.panel;ctx.fillRect(8,42,7,1.5);ctx.strokeStyle=C['ink-3'];ctx.lineWidth=px;ctx.strokeRect(8,42,7,1.5);if(lab())txt('INCOMING QC',11.5,45.9,{size:0.85,min:7.5,a:'center',c:C['ink-3']});
 S.rslots.forEach(s=>{const p=s.pallet;ctx.lineWidth=px;if(p){ctx.fillStyle=rgba(CLS[p.cls].color,0.85);ctx.fillRect(s.x-1.1,s.y-1.1,2.2,2.2);ctx.lineWidth=2*px;ctx.strokeStyle=p.state==='hold'?C.crit:p.state==='put'?C.ok:C.ink;if(p.state==='qc')ctx.setLineDash([0.4,0.3]);ctx.strokeRect(s.x-1.25,s.y-1.25,2.5,2.5);ctx.setLineDash([]);}
  else{ctx.strokeStyle=rgba(C['ink-3'],s.res?1:0.5);ctx.strokeRect(s.x-1.1,s.y-1.1,2.2,2.2);}});
 S.rdoors.forEach(d=>{ctx.fillStyle=d.truck?C['ink-2']:C['ink-3'];ctx.fillRect(4.6,d.y-2,0.8,4);if(lab())txt(d.code,6.2,d.y-2.3,{size:0.9,min:7.5,f:FM,w:600});
  if(d.truck){ctx.fillStyle=rgba(C['ink-2'],0.22);ctx.strokeStyle=C['ink-2'];ctx.lineWidth=px;rr(0.3,d.y-2.2,4.1,4.4,0.3);ctx.fill();ctx.stroke();d.truck.pallets.forEach((p,i)=>{ctx.fillStyle=CLS[p.cls].color;ctx.fillRect(0.6+(i%3)*1.25,d.y-1.9+Math.floor(i/3)*1.0,1,0.8);});}});
 // warehouse zones
 area(18,3.6,12.5,18.8,'Selective racking',null,{top:true});
 ctx.fillStyle=rgba(C.rack,0.35);[[19,5.2,29,6.6],[19,9.4,29,11.8],[19,14.6,29,17],[19,19.8,29,21]].forEach(r=>{ctx.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);});
 ctx.strokeStyle=C.rack;ctx.lineWidth=px;[[19,5.2,29,6.6],[19,9.4,29,11.8],[19,14.6,29,17],[19,19.8,29,21]].forEach(r=>{ctx.strokeRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);for(let x=r[0]+2;x<r[2];x+=2){ctx.beginPath();ctx.moveTo(x,r[1]);ctx.lineTo(x,r[3]);ctx.stroke();}});
 area(18,23.4,12.5,11.6,'Floor storage','oversized chassis');
 [[18.5,25,29.5,27],[18.5,31,29.5,33]].forEach(r=>{for(let x=r[0]+0.2;x<r[2]-1;x+=2.2){ctx.fillStyle=rgba(CLS.chassis.color,0.55);ctx.fillRect(x,r[1]+0.2,1.9,r[3]-r[1]-0.4);}});
 ctx.fillStyle=rgba(CLS.elec.color,0.07);ctx.fillRect(31.5,4.6,8.6,16.5);ctx.strokeStyle=CLS.elec.color;ctx.lineWidth=2*px;ctx.setLineDash([0.6,0.35]);ctx.strokeRect(31.75,4.85,8.1,16);ctx.setLineDash([]);
 ctx.fillStyle=rgba(C.rack,0.4);[[33,6.5,38.5,7.3],[33,10.5,38.5,11.3],[33,14.5,38.5,15.3]].forEach(r=>ctx.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]));
 if(lab()){txt('ESD CAGE',32.4,19.9,{size:1,min:8,c:CLS.elec.color});txt('electronics & optics',32.4,3.9+0.1,{size:0.8,min:7,f:FB,w:500,c:C['ink-3']});}
 ctx.fillStyle=rgba(CLS.batt.color,0.07);ctx.fillRect(31.5,23.8,9,12.4);ctx.strokeStyle=CLS.batt.color;ctx.lineWidth=3*px;ctx.beginPath();ctx.moveTo(40.25,28.8);ctx.lineTo(40.25,24.05);ctx.lineTo(31.75,24.05);ctx.lineTo(31.75,35.95);ctx.lineTo(40.25,35.95);ctx.lineTo(40.25,31.2);ctx.stroke();
 ctx.fillStyle=rgba(C.rack,0.4);[[33,25.5,38.5,26.5],[33,33.5,38.5,34.5]].forEach(r=>ctx.fillRect(r[0],r[1],r[2]-r[0],r[3]-r[1]));
 if(lab()){txt('BATTERY ROOM',32.4,32.6,{size:1,min:8,c:CLS.batt.color});txt('2-hr fire separation',32.4,28.4,{size:0.8,min:7,f:FB,w:500,c:C['ink-3']});}
 if(lab()){txt(`WH stock · ${CK.map(c=>CLS[c].short+' '+S.W[c]).join('  ')}`,18.2,39.3,{size:0.85,min:7.5,f:FM,w:500,c:C['ink-3']});txt('KITTING & SEQUENCING',18.2,42.8,{size:0.95,min:8,c:C['ink-3']});}
 // supermarket
 area(41.2,3.6,6.6,28,'Supermarket',null,{top:true});
 CK.forEach(c=>{const y0=CLS[c].smY-1.75;ctx.fillStyle=rgba(CLS[c].color,0.2);ctx.fillRect(43.6,y0,2.8,3.5);const f=Math.min(1,S.SM[c]/160);ctx.fillStyle=CLS[c].color;ctx.fillRect(43.6,y0+3.5-3.5*f,2.8,3.5*f);ctx.strokeStyle=C.rack;ctx.lineWidth=px;ctx.strokeRect(43.6,y0,2.8,3.5);
  if(lab())txt(CLS[c].short,45,y0-0.25,{size:0.75,min:7,a:'center',f:FM,w:600,c:C['ink-3']});});
 // expansion bay & assembly
 const P3=S.lines.length>2;
 if(!P3){ctx.fillStyle=rgba(C.accent,0.05);ctx.fillRect(49.8,3.4,38.4,8.6);hatch(49.8,3.4,38.4,8.6,rgba(C.accent,0.35));if(lab()){txt('EXPANSION BAY · RESERVED FOR POR PHASE 3',69,8.4,{size:1.1,min:8.5,a:'center',c:C.accent});}}
 if(lab())txt('EXPANSION WALL · NO OFFICES OR UTILITIES →',69,2.4,{size:0.9,min:7.5,a:'center',c:C.accent});
 S.lines.forEach(L=>{ctx.fillStyle=rgba(C.rack,0.45);ctx.fillRect(51,L.y-0.4,35.5,0.8);ctx.strokeStyle=C.rack;ctx.lineWidth=px;ctx.beginPath();for(let x=51.5;x<86.5;x+=1){ctx.moveTo(x,L.y-0.4);ctx.lineTo(x,L.y+0.4);}ctx.stroke();
  if(lab())txt(`${L.id} · ${FAM[L.fam].name.toUpperCase()} · TAKT ${L.takt.toFixed(1)} MIN`,51,L.y-2.6-(L.id==='DU2'?-0.1:0),{size:0.95,min:8,c:FAM[L.fam].color,w:700});
  L.stations.forEach(s=>{ctx.fillStyle=C.panel;ctx.fillRect(s.x-2.5,s.y-1.8,5,3.6);ctx.strokeStyle=C['ink-3'];ctx.lineWidth=px;ctx.strokeRect(s.x-2.5,s.y-1.8,5,3.6);
   ctx.fillStyle=STC(s.state);ctx.beginPath();ctx.arc(s.x+2,s.y-1.3,0.45,0,7);ctx.fill();s.bins.forEach(drawBin);drawOp(s.op.x+ (s.idx%2?0.8:-0.8),s.op.y+0.8);
   if(U.labels==='all')txt('S'+(s.idx+1),s.x-2.2,s.y+1.45,{size:0.8,min:7,f:FM,w:600,c:C['ink-3']});});});
 CELLX.forEach((x,i)=>{const c=S.cells[i];if(c){ctx.fillStyle=rgba(FAM.ARM.color,0.08);ctx.fillRect(x-2.8,CELLY-2.5,5.6,5);ctx.strokeStyle=FAM.ARM.color;ctx.lineWidth=1.5*px;ctx.setLineDash([0.5,0.3]);ctx.strokeRect(x-2.8,CELLY-2.5,5.6,5);ctx.setLineDash([]);
   ctx.fillStyle=STC(c.state);ctx.beginPath();ctx.arc(x+2.3,CELLY-2,0.45,0,7);ctx.fill();c.bins.forEach(drawBin);drawOp(x-1.5,CELLY+1.2);if(U.labels==='all')txt('C'+(i+1),x-2.5,CELLY+2.2,{size:0.8,min:7,f:FM,w:600,c:C['ink-3']});}
  else{hatch(x-2.8,CELLY-2.5,5.6,5,rgba(C['ink-3'],0.35));ctx.strokeStyle=rgba(C['ink-3'],0.6);ctx.lineWidth=px;ctx.strokeRect(x-2.8,CELLY-2.5,5.6,5);}});
 if(lab())txt(S.cells.length?`ARM CELLS · CELLULAR LAYOUT · ${S.cells.length} ACTIVE`:'ARM CELLS · RESERVED FOR POR PHASE 2',51,42.7,{size:0.95,min:8,c:FAM.ARM.color,w:700});
 // test area
 ctx.fillStyle=rgba(C.accent,0.06);ctx.fillRect(89,5.4,2,36.4);ctx.strokeStyle=rgba(C.accent,0.6);ctx.lineWidth=px;ctx.setLineDash([0.4,0.3]);ctx.strokeRect(89,5.4,2,36.4);ctx.setLineDash([]);
 if(lab()){ctx.save();ctx.translate(88.4,41.5);ctx.rotate(-Math.PI/2);txt(`TEST BUFFER · ${S.testQ.length}/${S.cfg.buffer}`,0,0,{size:0.9,min:7.5,c:C.accent});ctx.restore();}
 ctx.strokeStyle=C.crit;ctx.lineWidth=1.5*px;ctx.setLineDash([0.8,0.5]);ctx.strokeRect(92.6,4.2,18.1,19.4);ctx.setLineDash([]);
 if(lab())txt('END-OF-LINE TEST · HEAVY PAYLOAD · RESTRICTED',92.8,3.9+0.2,{size:0.85,min:7.5,c:C.crit});
 S.rigs.forEach(r=>{if(!r.installed){ctx.strokeStyle=rgba(C['ink-3'],0.5);ctx.lineWidth=px;ctx.setLineDash([0.3,0.3]);ctx.strokeRect(r.x-1.5,r.y-1.5,3,3);ctx.setLineDash([]);return;}
  ctx.fillStyle=C.panel;ctx.fillRect(r.x-1.5,r.y-1.5,3,3);ctx.strokeStyle=STC(r.down?'down':r.state);ctx.lineWidth=2*px;ctx.strokeRect(r.x-1.5,r.y-1.5,3,3);
  if(r.state==='test'&&r.dur){ctx.fillStyle=rgba(C.ok,0.3);const f=1-Math.max(0,r.rem)/r.dur;ctx.fillRect(r.x-1.5,r.y+1.5-3*f,3,3*f);}});
 area(110.9,3.6,3.9,20,'',null,{fill:rgba(C.crit,0.05)});ctx.fillStyle=C.panel;ctx.fillRect(112.5,8,2.1,6);ctx.strokeStyle=C['ink-3'];ctx.strokeRect(112.5,8,2.1,6);
 if(lab()){ctx.save();ctx.translate(114.2,22.8);ctx.rotate(-Math.PI/2);txt('REPAIR BAY',0,0,{size:0.9,min:7.5,c:C['ink-2']});ctx.restore();}
 // charging
 area(92.6,26.6,22,14.8,'Charging hub · inductive grid',null,{fill:rgba(C.warn,0.04)});
 S.pads.forEach(p=>{ctx.lineWidth=px;if(!p.installed){ctx.strokeStyle=rgba(C['ink-3'],0.4);ctx.setLineDash([0.3,0.3]);ctx.strokeRect(p.x-0.95,p.y-1.2,1.9,2.4);ctx.setLineDash([]);return;}
  ctx.fillStyle=rgba(C.warn,0.12);ctx.fillRect(p.x-0.95,p.y-1.2,1.9,2.4);ctx.strokeStyle=rgba(C.warn,0.8);ctx.strokeRect(p.x-0.95,p.y-1.2,1.9,2.4);
  if(p.unit&&!p.unit.moving){const f=1-Math.max(0,p.rem)/p.tot;ctx.fillStyle=C.ok;ctx.fillRect(p.x-0.95,p.y+1.35,1.9*f,0.3);}});
 // crating & FG
 area(92.6,44.6,10.6,20,'Crating',null);ctx.fillStyle=rgba('#9C7A4F',0.25);ctx.fillRect(93,45,1.4,17);
 S.crates.forEach(c=>{if(!c.installed){ctx.strokeStyle=rgba(C['ink-3'],0.5);ctx.lineWidth=px;ctx.setLineDash([0.3,0.3]);ctx.strokeRect(95,c.y-1.5,4,3);ctx.setLineDash([]);return;}
  ctx.fillStyle=C.panel;ctx.fillRect(95,c.y-1.5,4,3);ctx.strokeStyle=C['ink-3'];ctx.lineWidth=px;ctx.strokeRect(95,c.y-1.5,4,3);ctx.fillStyle=c.unit?C.ok:C.idle;ctx.beginPath();ctx.arc(98.5,c.y-1,0.4,0,7);ctx.fill();drawOp(100.3,c.y);});
 area(103.6,44.6,10.4,20,'FG staging','');
 S.fg.forEach(f=>{ctx.strokeStyle=rgba(C['ink-3'],0.45);ctx.lineWidth=px;ctx.strokeRect(f.x-1,f.y-1,2,2);});
 S.sdoors.forEach(d=>{ctx.fillStyle=d.trailer?C['ink-2']:C['ink-3'];ctx.fillRect(114.6,d.y-2,0.8,4);if(lab())txt(d.code,114.2,d.y-2.4,{size:0.9,min:7.5,a:'right',f:FM,w:600});
  const tr=d.trailer;if(tr){ctx.fillStyle=C.panel;ctx.strokeStyle=C['ink-2'];ctx.lineWidth=px;rr(115.6,d.y-2.2,4.2,4.4,0.3);ctx.fill();ctx.stroke();const f=tr.load.length/tr.cap;ctx.fillStyle=rgba(C.ok,0.7);ctx.fillRect(115.9,d.y+1.9-3.8*f,3.6,3.8*f);
   if(lab())txt(`${tr.load.length}/${tr.cap}`,117.7,d.y+0.35,{size:0.8,min:7,a:'center',f:FM,w:600,c:C.ink});}});
 // tour highlight backdrop
 const sel=U.sel;
 if(sel&&sel.role!=null&&sel.cur&&sel.cur.k==='move'&&sel.cur.pts&&sel.cur.pts.length){ctx.strokeStyle=C.accent;ctx.lineWidth=2*px;ctx.setLineDash([0.6,0.5]);ctx.beginPath();ctx.moveTo(sel.x,sel.y);sel.cur.pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);}
 S.units.forEach(drawUnit);
 for(const w of S.workers)drawWorker(w,false);
 S.flashes.forEach(f=>{const k=f.t/0.5;ctx.strokeStyle=rgba(f.c,0.8*(1-k));ctx.lineWidth=1.5*px;ctx.beginPath();ctx.arc(f.x,f.y,1.1+k*1.8,0,7);ctx.stroke();});
 if(U.tour>=0){const r=TOUR[U.tour].r;ctx.fillStyle=C.hl;ctx.beginPath();ctx.rect(0,0,W,H);ctx.rect(r.x,r.y,r.w,r.h);ctx.fill('evenodd');const a=reduce?1:0.6+0.4*Math.sin(ms/300);ctx.strokeStyle=rgba(C.accent,a);ctx.lineWidth=2.5*px;ctx.strokeRect(r.x,r.y,r.w,r.h);}
 if(sel){if(sel.role!=null)drawWorker(sel,true);else{ctx.strokeStyle=C.accent;ctx.lineWidth=2.5*px;const e=sel.kind==='cell'?[2.9,2.6]:sel.kind==='st'?[2.7,2]:sel.kind==='crate'?[2.2,1.7]:[1.8,1.8];ctx.strokeRect((sel.kind==='crate'?97:sel.x)-e[0],sel.y-e[1],e[0]*2,e[1]*2);}}
}
function drawWorker(w,sel){const r=ROLES[w.role],px=1/scale;if(r.robot&&w.role==='bot'&&U.logi!=='amr'&&!w.cur&&!w.plan.length){ctx.globalAlpha=0.35;}
 if(w.role==='tug'&&U.logi!=='tug'&&!w.cur&&!w.plan.length)ctx.globalAlpha=0.35;
 if(sel){ctx.strokeStyle=C.accent;ctx.lineWidth=2.5*px;ctx.beginPath();ctx.arc(w.x,w.y,1.9,0,7);ctx.stroke();}
 if(w.role==='vis'){[[-0.7,0],[0.6,-0.5],[0.5,0.7]].forEach(o=>{ctx.beginPath();ctx.arc(w.x+o[0],w.y+o[1],0.55,0,7);ctx.fillStyle=r.c;ctx.fill();});ctx.globalAlpha=1;if(U.labels==='all')txt('Visitors',w.x,w.y+2,{size:0.85,min:7.5,a:'center',f:FB,w:500,c:C['ink-3']});return;}
 ctx.fillStyle=r.c;ctx.strokeStyle=C.floor;ctx.lineWidth=2*px;
 if(w.role==='bot'){rr(w.x-0.75,w.y-0.75,1.5,1.5,0.25);}else if(r.sq){rr(w.x-1.05,w.y-0.9,2.1,1.8,0.35);}else{ctx.beginPath();ctx.arc(w.x,w.y,0.95,0,7);}
 ctx.fill();ctx.stroke();txt(r.l,w.x,w.y+0.05,{size:w.role==='bot'?0.9:1.1,min:6.5,a:'center',b:'middle',c:'#fff',f:FB});
 if(w.carry){const cc=w.carry.kind==='pallet'?CLS[w.carry.cls].color:w.carry.kind==='crate'?'#9C7A4F':C['ink-2'];ctx.fillStyle=cc;ctx.strokeStyle=C.floor;ctx.lineWidth=px;const s=w.carry.kind==='pallet'?1.1:0.8;ctx.fillRect(w.x+0.7,w.y-1.5,s,s);ctx.strokeRect(w.x+0.7,w.y-1.5,s,s);}
 if(w.role==='tug'&&w.carry){ctx.fillStyle=rgba(C['ink-2'],0.8);ctx.fillRect(w.x-2.8,w.y-0.4,1.3,0.8);ctx.fillRect(w.x-4.3,w.y-0.4,1.3,0.8);}
 if((U.labels==='all'&&!ROLES[w.role].robot)||(sel&&lab()))txt(w.name,w.x,w.y+2.1,{size:0.9,min:7.5,a:'center',c:sel?C.ink:C['ink-2'],f:FB,w:sel?600:500});
 ctx.globalAlpha=1;}

/* ---------- side panels ---------- */
function capRows(){const c=S.cfg,m=c.mix,rows=[];
 S.lines.forEach(L=>{const mx=Math.max(...L.stations.map(s=>s.ct));rows.push({k:L.id,prod:1,name:`${L.id} line`,inst:`4 stations · max CT ${mx.toFixed(1)} min`,req:`takt ${L.takt.toFixed(1)} min`,short:mx>L.takt});});
 if(S.cells.length){const need=Math.ceil(m.ARM*S.cells[0].ct/DAY/0.9);rows.push({k:'cells',prod:1,name:'Arm cells',inst:`${S.cells.length} cells · CT ${S.cells[0].ct} min`,req:`${need} cells`,short:need>S.cells.length});}
 let load=0;for(const f in m)load+=m[f]*FAM[f].test/FAM[f].fpy;const rigs=Math.ceil(load/(DAY*0.8));rows.push({k:'test',prod:1,name:'End-of-line test',inst:`${S.rigsInstalled} rigs`,req:`${rigs} rigs @ 80% eff.`,short:rigs>S.rigsInstalled});
 const perHr=(m.DU+m.AMR)/(DAY/60),chH=(m.DU*40+m.AMR*30)/Math.max(1,m.DU+m.AMR)/60,pads=Math.ceil(perHr*chH*1.2);rows.push({k:'pads',prod:1,name:'Charging pads',inst:`${c.pads} pads`,req:`${pads} (Little's Law)`,short:pads>c.pads});
 const cr=Math.ceil(c.demand*3.2/(DAY*0.85));rows.push({k:'crate',prod:1,name:'Crating',inst:`${c.crates} stations`,req:`${cr} stations`,short:cr>c.crates});
 const inT=kitsDay()/480,outT=c.demand/24,din=Math.ceil(inT*50/(DAY*0.75)),dout=Math.ceil(outT*45/(DAY*0.75));rows.push({k:'dock',name:'Dock doors',inst:'3 in · 3 out',req:`${din} in · ${dout} out`,short:din>3||dout>3});
 rows.push({k:'milk',name:U.logi==='tug'?'Tugger milk run':'Logistics AMRs',inst:U.logi==='tug'?`${c.staff.tug} tuggers`:`${c.bots} robots`,req:`${S.cards.length} open cards`});
 rows.push({k:'fork',name:'Forklifts',inst:`${c.staff.fork} trucks`,req:`${CK.filter(k=>S.SM[k]<48).length} lanes low`});
 return rows;}
function renderCap(){const rows=capRows();let bn=null,bv=-1;rows.forEach(r=>{if(r.prod){const u=S.util[r.k]||0;if(u>bv){bv=u;bn=r.k;}}});
 $('#cap-sub').textContent=`POR phase ${S.cfg.n} · ${S.cfg.demand}/day`;
 $('#cap').innerHTML='<div class="crow hd"><span>Resource</span><span>Installed · required</span><span>Utilization</span></div>'+rows.map(r=>{const u=S.util[r.k]||0;
  return`<div class="crow${r.short?' short':''}"><span class="nm">${esc(r.name)}${r.k===bn?'<span class="chip">Constraint</span>':''}</span><span class="iv">${esc(r.inst)}<br><em>need</em> <b>${esc(r.req)}</b></span><span class="ubar ${r.k===bn?'max':u>0.85?'hi':''}">${pct(u)}<i><s style="width:${Math.min(100,u*100)}%"></s></i></span></div>`;}).join('');}
function renderInsp(){const el=$('#insp');const o=U.sel;if(!o){el.innerHTML='<p class="empty" style="padding:0">Click an associate, station, cell, test rig, charging pad or crating station on the floor.</p>';return;}
 let dot,name,role,state,cls,kv=[],extra='';
 if(o.role!=null){const r=ROLES[o.role];dot=`<div class="dot${r.sq?' sq':''}" style="background:${r.c}">${r.l}</div>`;name=o.name;role=r.label;
  state=o.cur&&!o.homing?(o.cur.k==='move'?(o.cur.load?'Carrying':'Moving'):o.cur.k==='scan'?'Scanning':'Working'):'Idle';cls=state==='Idle'?'':'work';
  kv=[['Now',o.cur&&o.cur.label?o.cur.label:(o.homing?'Returning to position':'Waiting for work')],['Job',o.task],['Jobs done',o.done],['Scans',o.scans],['Travelled',Math.round(o.dist*FT).toLocaleString()+' ft']];
  extra=o.recent.length?'<ul class="scans">'+o.recent.map(s=>`<li><span class="t">${fmtT(s.t)}</span>${s.what} <b>${esc(s.code)}</b></li>`).join('')+'</ul>':'';}
 else{dot=`<div class="dot sq" style="background:${o.fam?FAM[o.fam].color:C['ink-3']}">${o.kind==='rig'?'T':o.kind==='pad'?'C':o.kind==='crate'?'K':'S'}</div>`;name=o.id;role=o.name;
  state=o.down?'down':o.kind==='rig'?(o.state==='test'?'work':o.state):o.kind==='pad'?(o.unit?'work':'idle'):o.kind==='crate'?(o.unit?'work':'idle'):o.state;cls=state;state=state.charAt(0).toUpperCase()+state.slice(1);
  if(o.kind==='st'||o.kind==='cell'){kv=[['Cycle time',o.ct+' min'],o.kind==='st'?['Takt',o.line.takt.toFixed(1)+' min']:['Plan',S.cfg.mix.ARM+'/day across cells'],['Unit',o.unit?o.unit.sn:'–'],['Built',o.built],['Line-side',o.bins.map(b=>`${CLS[b.cls].short} ${b.qty}/${BIN}${b.card?' (card)':''}`).join(' · ')]];}
  else if(o.kind==='rig')kv=[['Unit',o.unit?o.unit.sn:'–'],['Progress',o.state==='test'?Math.round((1-o.rem/o.dur)*100)+'%':'–'],['Units tested',o.tested]];
  else if(o.kind==='pad')kv=[['Unit',o.unit?o.unit.sn:'–'],['Charge',o.unit&&!o.unit.moving?Math.round((1-o.rem/o.tot)*100)+'%':'–']];
  else kv=[['Unit',o.unit?o.unit.sn:'–'],['Crated',o.built]];}
 el.innerHTML=`<div class="ihead">${dot}<div><div class="iname">${esc(name)}</div><div class="irole">${esc(role)}</div></div><span class="pill ${cls}">${esc(state)}</span></div><dl class="kvs">${kv.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${extra}`;}
function updKPI(){$('#clock').textContent=fmtT(S.now);const c=S.cfg;
 $('#k-ship').textContent=S.shipped;$('#k-ship-s').textContent=`plan ${c.demand.toLocaleString()} per day`;
 const rate=S.now>=30?Math.round(S.doneTimes.length*DAY/Math.min(120,S.now)):null;$('#k-rate').textContent=rate==null?'–':rate.toLocaleString();$('#kp-rate').className='kpi'+(rate==null?'':rate>=c.demand*0.97?' ok':rate>=c.demand*0.85?' warn':' crit');
 $('#k-takt').textContent=(DAY/c.demand).toFixed(1)+' min';
 const rows=capRows();let bn=null,bv=-1;rows.forEach(r=>{if(r.prod){const u=S.util[r.k]||0;if(u>bv){bv=u;bn=r;}}});$('#k-takt-s').textContent=bn?`constraint: ${bn.name} ${pct(bv)}`:'–';
 const A=S.rigTime?1-S.rigDown/S.rigTime:1,P=S.actualTest?Math.min(1,S.idealTest/S.actualTest):1,Q=S.firstTests?S.firstPass/S.firstTests:1;
 $('#k-oee').textContent=S.firstTests?pct(A*P*Q):'–';$('#k-oee-s').textContent=`A ${pct(A)} · P ${pct(P)} · Q ${pct(Q)}`;
 $('#k-fpy').textContent=S.firstTests?pct(Q):'–';$('#k-wip').textContent=S.units.length;
 const hc=headcount(),uplh=S.now>10?S.crated/(hc*S.now/60):0;$('#k-uplh').textContent=S.now>10?uplh.toFixed(2):'–';$('#k-uplh-s').textContent=`${hc} people on shift`;
 $('#k-flow').textContent=S.crated?Math.round(S.flowFt/S.crated).toLocaleString()+' ft':'–';
 const du=S.now?(S.dockOccIn+S.dockOccOut)/(S.now*6):0;$('#k-dock').textContent=pct(du);$('#k-dock-s').textContent=`in ${pct(S.now?S.dockOccIn/(S.now*3):0)} · out ${pct(S.now?S.dockOccOut/(S.now*3):0)} · target 70–80%`;
 $('#kp-dock').className='kpi'+(du>0.85?' crit':du<0.6?' warn':' ok');
 $('#k-buf').textContent=`${S.testQ.length}/${c.buffer}`;$('#kp-buf').className='kpi'+(S.testQ.length===0?' warn':S.testQ.length>=c.buffer?' crit':'');
 $('#addRig').disabled=S.rigsInstalled>=16;}

/* ---------- controls ---------- */
function seg(id,cb){const el=$('#'+id);el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));cb(b.dataset.v);});}
seg('speed',v=>U.speed=+v);
seg('phase',v=>{U.phase=+v;restart();});
seg('logi',v=>{U.logi=v;log('line',v==='tug'?'Line-side delivery switched to tugger milk run':'Line-side delivery switched to plant-built AMRs (no drivers)',null);});
seg('brk',v=>U.brk=v==='on');
seg('labels',v=>U.labels=v);
$('#pause').addEventListener('click',()=>{U.paused=!U.paused;$('#pause').textContent=U.paused?'Resume':'Pause';});
$('#addTruck').addEventListener('click',()=>{newTruck();});
$('#addRig').addEventListener('click',()=>{const r=S.rigs.find(r=>!r.installed);if(!r)return;r.installed=true;S.rigsInstalled++;buildGrid();log('mnt',`MOC approved: ${r.id} installed and commissioned. ${S.rigsInstalled} rigs in service.`,r,'ok');updKPI();});
$('#restart').addEventListener('click',restart);
$('#lfilter').addEventListener('change',e=>{U.filter=e.target.value;renderLog();});
$('#lonly').addEventListener('change',e=>{U.only=e.target.checked;renderLog();});
$('#legend').innerHTML='<b>People &amp; vehicles</b>'+['recv','qc','fork','tug','bot','test','rep','mnt','load'].map(k=>{const r=ROLES[k];return`<span><i style="background:${r.c}"${r.sq?' class="sq"':''}>${r.l}</i>${r.label}</span>`;}).join('')+`<span><i style="background:#2D8A4E">A</i>Assembler</span>`+
 '<b>Units</b>'+Object.keys(FAM).map(f=>`<span><i class="sq" style="background:${FAM[f].color}"></i>${FAM[f].name}</span>`).join('')+'<span><i class="sq" style="background:#9C7A4F"></i>Crated</span>'+
 '<b>Parts</b>'+CK.map(c=>`<span><i class="sq" style="background:${CLS[c].color}"></i>${CLS[c].name}</span>`).join('');
function select(o){U.sel=o;if(U.only)renderLog();renderInsp();}
function world(e){const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H};}
function hit(p){let best=null,bd=1.6;S.workers.forEach(w=>{const d=Math.hypot(w.x-p.x,w.y-p.y);if(d<bd){bd=d;best=w;}});if(best)return best;
 for(const a of allAssets()){const ex=a.kind==='cell'?[2.8,2.5]:a.kind==='st'?[2.5,1.8]:a.kind==='crate'?[2,1.5]:a.kind==='pad'?[1,1.2]:[1.5,1.5];const ax=a.kind==='crate'?97:a.x;if(Math.abs(p.x-ax)<=ex[0]&&Math.abs(p.y-a.y)<=ex[1])return a;}return null;}
cv.addEventListener('click',e=>{const o=hit(world(e));if(o)select(o);});
const hov=$('#hover'),HOV0=hov.textContent;
cv.addEventListener('mousemove',e=>{const p=world(e);const o=hit(p);cv.style.cursor=o?'pointer':'crosshair';
 if(o){if(o.role!=null)hov.textContent=`${o.name} · ${ROLES[o.role].label} · ${o.cur&&o.cur.label?o.cur.label:'idle'}`;
  else if(o.kind==='st'||o.kind==='cell')hov.textContent=`${o.id} · ${o.state} · CT ${o.ct} min · ${o.bins.map(b=>CLS[b.cls].short+' '+b.qty).join(' · ')}`;
  else hov.textContent=`${o.id} · ${o.unit?o.unit.sn:'empty'}${o.down?' · DOWN':''}`;return;}
 for(const c of CK){if(p.x>=43.6&&p.x<=46.4&&Math.abs(p.y-CLS[c].smY)<=1.75){hov.textContent=`Supermarket ${CLS[c].name} · ${S.SM[c]} kits · warehouse ${S.W[c]} kits`;return;}}
 for(const u of S.units){if(!u.hidden&&Math.hypot(u.x-p.x,u.y-p.y)<0.9){hov.textContent=`${u.sn} · ${FAM[u.fam].name}${u.fails?` · ${u.fails} test fail${u.fails>1?'s':''}`:''}${u.crated?' · crated':''}`;return;}}
 hov.textContent=HOV0;});
cv.addEventListener('mouseleave',()=>{hov.textContent=HOV0;});

/* ---------- tour ---------- */
const TOUR=[
 {h:'Plan of Record, phase by phase',p:'The building opens at POR phase 1: 350 units a day of drive units and mobile robots. Arm cells (phase 2) and a second drive-unit line in the expansion bay (phase 3) are reserved space. Switch the POR phase above to watch them plug in without moving anything that is already running.',r:{x:49.5,y:1,w:39.2,h:43},role:null,f:'all'},
 {h:'Inbound docks and incoming QC',p:'Consolidated trucks dock at R1 to R3. Receivers scan the door and each pallet LPN into a staging slot. Electronics, optics and battery packs get incoming QC before putaway; a dashed outline means the pallet is still waiting.',r:{x:0,y:9.5,w:17.5,h:38},role:'recv',f:'in'},
 {h:'Plan for Every Part storage',p:'Each PFEP part class has its own storage: selective racking for mechanical parts, floor storage for oversized chassis, an ESD cage for electronics and optics, and a fire-separated battery room with a kit limit per fire area.',r:{x:17.6,y:1,w:23.3,h:42.8},role:'fork',f:'store'},
 {h:'Supermarket and line-side delivery',p:'Flow racks hold a short buffer by part class. When a line-side bin drops to its reorder point it raises a kanban card, and the tugger milk run (or the plant’s own AMRs) brings a full bin. Try both modes and compare starvation and headcount.',r:{x:41,y:3.4,w:9,h:40},role:'tug',f:'line'},
 {h:'Paced flow lines',p:'Drive units and mobile robots are built on paced product-layout lines. A unit launches every takt, and every station cycle time sits below takt. Andon lights: green working, amber starved, blue blocked, red down.',r:{x:49.5,y:12.5,w:39.2,h:18.4},role:null,f:'asm',asset:'DU1-S3'},
 {h:'Cellular assembly for arms',p:'Low-volume, high-mix picking arms are built start to finish in cells, the result of the P-Q analysis. They are reserved in phase 1; switch to phase 2 or 3 to activate them.',r:{x:49.5,y:32,w:39.2,h:11.5},role:null,f:'asm',asset:'ARM-C1'},
 {h:'End-of-line test is the constraint',p:'Test takes 9 to 14 minutes per unit, longer than any assembly station, so it sets plant output. The buffer lane in front protects it from upstream stoppages. Use + Test rig to relieve it and watch the constraint move downstream.',r:{x:87.8,y:3.2,w:23,h:39},role:'test',f:'test'},
 {h:'Repair loop and first-pass yield',p:'Units that fail test go to the repair bay, get diagnosed and return to the head of the test buffer. Every retest consumes constraint time, so first-pass yield drives real capacity.',r:{x:110.7,y:3.4,w:4.3,h:20.4},role:'rep',f:'test'},
 {h:'Charging hub',p:'Pads are sized with Little’s Law: units per hour × charge hours × a 1.2 buffer. Arms skip charging and go straight to crating.',r:{x:92.4,y:24,w:22.6,h:17.2},role:null,f:'chg'},
 {h:'Crating, staging and outbound docks',p:'Crating adds dunnage and a shipping label. Loaders scan the crate and the trailer; a full trailer seals and pulls away. Dock utilization is tracked against the 70–80% target.',r:{x:92.4,y:42,w:27.6,h:23.2},role:'load',f:'out'},
 {h:'People flow and EHS segregation',p:'The south band holds offices, the quality lab, maintenance, the break room and the lobby. A pedestrian walkway runs apart from the forklift and AMR lane, and visitors stay on the gallery route. The battery room and heavy-payload test sit away from walkways, the X-rated pairs from the REL chart.',r:{x:4.8,y:43.6,w:87.6,h:21.6},role:'vis',f:'ehs'},
 {h:'Andon, maintenance and OEE',p:'Stations, cells and test rigs break down at random. Maintenance responds by work order, and downtime feeds the availability term of test OEE. Turn breakdowns off to see how much capacity they cost.',r:{x:49.5,y:3.2,w:61.5,h:41},role:'mnt',f:'mnt'}];
function showTour(i){U.tour=i;const t=TOUR[i];$('#t-n').textContent=`${i+1} / ${TOUR.length}`;$('#t-h').textContent=t.h;$('#t-p').textContent=t.p;
 $('#t-prev').hidden=false;$('#t-prev').disabled=i===0;$('#t-close').hidden=false;$('#t-next').textContent=i===TOUR.length-1?'Finish':'Next step';
 let o=null;if(t.role){const role=t.role==='tug'&&U.logi==='amr'?'bot':t.role;const c=S.workers.filter(w=>w.role===role);o=c.find(w=>w.cur&&!w.homing)||c[0];}else if(t.asset)o=findRef(t.asset)||S.lines[0].stations[2];
 if(o)select(o);U.filter=t.f;$('#lfilter').value=t.f;renderLog();}
function endTour(){U.tour=-1;$('#t-n').textContent=`Tour · ${TOUR.length} steps`;$('#t-h').textContent='How the plant works';$('#t-p').textContent='Follow material from the inbound dock to the outbound trailer. Each step highlights its area, follows one associate and filters the event log.';
 $('#t-prev').hidden=true;$('#t-close').hidden=true;$('#t-next').textContent='Start tour';}
$('#t-next').addEventListener('click',()=>{if(U.tour>=TOUR.length-1)endTour();else showTour(U.tour+1);});
$('#t-prev').addEventListener('click',()=>{if(U.tour>0)showTour(U.tour-1);});
$('#t-close').addEventListener('click',endTour);

/* ---------- boot ---------- */
function restart(){init();S.silent=true;for(let i=0;i<2400;i++)tick(0.1);S.silent=false;S.log=S.log.slice(0,160);
 U.sel=S.lines[0].stations[2];renderLog();renderInsp();renderCap();updKPI();}
readColors();
new MutationObserver(readColors).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',readColors);
window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(cv.parentElement);
resize();restart();
let last=performance.now(),acc=0;
function frame(t){const rdt=Math.min(0.1,(t-last)/1000);last=t;
 if(!U.paused){let sim=rdt*U.speed;while(sim>1e-9){const d=Math.min(0.1,sim);tick(d);sim-=d;}}
 S.flashes.forEach(f=>f.t+=rdt);S.flashes=S.flashes.filter(f=>f.t<0.5);
 draw(t);acc+=rdt;if(acc>0.3){acc=0;updKPI();renderCap();renderInsp();}
 requestAnimationFrame(frame);}
requestAnimationFrame(frame);
})();
