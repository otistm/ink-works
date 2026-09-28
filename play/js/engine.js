/* Ink Works engine: parts, levels, and the machine simulation. Pure JS, no DOM. */
"use strict";
const GW=7, GH=7, G=9.8;
const PARTS={
  core:   {name:'Pip',       cost:0,  mass:1,   fixed:true, desc:'Your pilot. Every part must touch Pip or a part that does.'},
  frame:  {name:'Frame',     cost:5,  mass:0.6, desc:'Joins parts together.'},
  wheel:  {name:'Wheel',     cost:10, mass:0.5, desc:'Rolls. Put it on the bottom.'},
  motor:  {name:'Motor',     cost:20, mass:1,   desc:'Turns the wheels. Needs a battery.'},
  battery:{name:'Battery',   cost:10, mass:0.8, desc:'Runs motors and propellers.'},
  rocket: {name:'Rocket',    cost:25, mass:1,   rot:true, desc:'Big push, short burn. Tap it again to turn it.'},
  fuel:   {name:'Fuel tank', cost:10, mass:0.4, desc:'Longer rocket burns. Heavy when full.'},
  nose:   {name:'Nose cone', cost:10, mass:0.3, rot:true, desc:'Cuts through the air. Point it forward.'},
  wing:   {name:'Wing',      cost:15, mass:0.4, desc:'Lifts at speed and keeps you steady.'},
  prop:   {name:'Propeller', cost:20, mass:0.6, rot:true, desc:'Steady push. Needs a battery.'},
  balloon:{name:'Balloon',   cost:15, mass:0.2, desc:'Floats up. Weaker the higher it gets.'},
  crate:  {name:'Crate',     cost:0,  mass:3,   fixed:true, desc:'The cargo. It has to come along.'},
  chute:  {name:'Parachute', cost:10, mass:.2,  desc:'Opens as you fall and slows you down. Best on top.'},
  egg:    {name:'Egg',       cost:0,  mass:.3,  fixed:true, desc:'Land gently or it cracks.'},
  // bridge parts: each one is a joint, and joints that touch (even at a corner) are joined by a beam
  road:   {name:'Road',      cost:0,  mass:.25, fixed:true, desc:'The road. It can’t hold much on its own.'},
  wood:   {name:'Wood',      cost:5,  mass:.15, desc:'Cheap and light. Joins to every part it touches, even at a corner.'},
  steel:  {name:'Steel',     cost:15, mass:.35, desc:'Three times as strong as wood, but heavy.'},
  cable:  {name:'Cable',     cost:5,  mass:.04, desc:'Strong, but it can only pull. Hang things from it.'},
  // watch parts: Pip is the axle of the balance wheel
  spoke:  {name:'Spoke',     cost:2,  mass:.1,  desc:'Light. Joins weights to the middle.'},
  rim:    {name:'Weight',    cost:10, mass:1,   desc:'Heavy. The further out it sits, the slower the swing.'},
  screw:  {name:'Screw',     cost:3,  mass:.035, rot:true, desc:'For fine tuning. Tap it again to screw it in or out a little.'},
  hair:   {name:'Hairspring',cost:15, mass:.01, desc:'Springs the wheel back. More springs, faster swing.'}
};
const K={ rocketF:70, rocketBurn:1.5, tankFuel:5, fuelMass:.22, motorF:34, motorVmax:40, battery:8, propF:24, propVmax:32,
  balloonF:16, balloonTop:150, cd:.018, noseCut:.45, cl:.34, wheelR:.6, chute:.3,
  hair:352, screwStep:.05, tick:1, poise:3000, day:86400 };
const DIRS=[[1,0],[0,1],[-1,0],[0,-1]]; // 0 right, 1 up, 2 left, 3 down (body frame, y up)

// terrain: height at x, and its slope
function terrain(lv){
  const T=lv.terrain||'flat';
  if(T==='gap'){ // a ramp from 30 to 50 m, a canyon from 50 to 90 m
    return { h:x=> x<30?0 : x<50? 5*Math.pow((x-30)/20,1.6) : x<90? -1e4 : 0,
             s:x=> x<30?0 : x<50? 5*1.6*Math.pow((x-30)/20,.6)/20 : 0,
             gap:[50,90] };
  }
  return { h:()=>0, s:()=>0, gap:null };
}

const LEVELS=[
  {id:'roll',  name:'First roll',   goal:'dist',  marks:[60,140,220],  budget:70,  parts:['frame','wheel','motor','battery'],
   blurb:'Drive as far as you can.', hint:'Tap a part, then tap the grid. Wheels go on the bottom.'},
  {id:'dash',  name:'The dash',     goal:'speed', marks:[45,60,70],    budget:110, parts:['frame','wheel','motor','battery','nose'],
   blurb:'Hit top speed on the flat.', hint:'A nose cone pointed forward cuts the air. Tap a placed cone to turn it.'},
  {id:'lift',  name:'Liftoff',      goal:'alt',   marks:[80,160,240],  budget:70,  parts:['frame','rocket','fuel','nose'],
   blurb:'Fly as high as you can.', hint:'Rockets push the way their nose points. Keep them under the balance dot.'},
  {id:'float', name:'Hot air',      goal:'alt',   marks:[25,50,70],    budget:95,  parts:['frame','balloon'], fixed:{'3,5':'crate'},
   blurb:'Lift the crate off the ground.', hint:'Join the crate to Pip with a frame. Balloons stick to anything they touch.'},
  {id:'drop',  name:'Egg drop',     goal:'soft',  marks:[20,12,8],     budget:60,  parts:['frame','chute','balloon'], fixed:{'3,4':'egg'}, start:60,
   blurb:'Fall 60 m and land softly, or the egg cracks.', hint:'Parachutes slow the fall. Balloons do too, but you must land within 40 s.'},
  {id:'leap',  name:'The canyon',   goal:'dist',  marks:[100,180,260], budget:130, parts:['frame','wheel','motor','battery','rocket','fuel','nose'], terrain:'gap',
   blurb:'Jump the canyon. It starts at 50 m.', hint:'You need about 90 km/h off the ramp. A rocket pointed right helps.'},
  {id:'bridge',name:'The bridge',   goal:'load',  marks:[1,2,4],       budget:80, parts:['wood','steel','cable'], kind:'bridge',
   blurb:'Heavier and heavier trucks will cross. Keep it standing.', hint:'Triangles are strong. Parts touching at a corner are joined too.'},
  {id:'glide', name:'First flight', goal:'dist',  marks:[120,220,300], budget:130, parts:['frame','wheel','battery','prop','wing','nose'],
   blurb:'Take off and fly far.', hint:'Propellers need speed before the wings can lift you. Roll out on wheels.'},
  {id:'watch', name:'Pocket watch', goal:'time',  marks:[600,180,45],   budget:80,  parts:['spoke','rim','screw','hair'], kind:'watch',
   blurb:'Make Pip’s watch keep good time.', hint:'Pip is the axle. It should swing once a second. Keep it balanced.'},
  {id:'sky',   name:'Sky high',     goal:'alt',   marks:[240,300,340], budget:160, parts:['frame','rocket','fuel','nose','wing','balloon'],
   blurb:'Go as high as you dare.', hint:'Fuel is heavy and every part drags. The air thins as you climb.'},
  {id:'flats', name:'Salt flats',   goal:'speed', marks:[120,160,190], budget:170, parts:['frame','wheel','motor','battery','rocket','fuel','nose','wing'],
   blurb:'Set a land speed record.', hint:'Motors top out. Rockets don\u2019t.'}
];
// low: a smaller number is better
const GOALS={dist:{label:'Distance',unit:'m'}, alt:{label:'Height',unit:'m'}, speed:{label:'Top speed',unit:'km/h'},
  soft:{label:'Landing',unit:'km/h',low:true}, load:{label:'Heaviest across',unit:'t'}, time:{label:'Off by',unit:'s a day',low:true}};
const ROAD=3; // the bridge's road runs along this row of the bench
LEVELS.forEach(lv=>{ if(lv.kind==='bridge'){ lv.fixed={}; for(let x=0;x<GW;x++) lv.fixed[x+','+ROAD]='road'; } });

// ---------- designs ----------
function newDesign(lv){ const d={}; if(lv.kind!=='bridge') d['3,3']={k:'core',d:0}; if(lv.fixed) for(const key in lv.fixed) d[key]={k:lv.fixed[key],d:0}; return d; }
function defaultDir(lv,k){ if(k==='rocket'||k==='nose') return lv.goal==='alt'?1:0; return 0; }
function designCost(d){ let c=0; for(const key in d) c+=PARTS[d[key].k].cost; return c; }
function attached(d){
  const seen=new Set(['3,3']), q=['3,3'];
  while(q.length){ const [x,y]=q.shift().split(',').map(Number);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const kk=(x+dx)+','+(y+dy); if(d[kk]&&!seen.has(kk)){ seen.add(kk); q.push(kk); } } }
  return seen;
}

// ---------- simulation ----------
function makeSim(design,lv){
  const att=attached(design), T=terrain(lv);
  const P=[]; let loose=[];
  for(const key in design){ const [gx,gy]=key.split(',').map(Number), c=design[key];
    const p={k:c.k,d:c.d||0,gx,gy,bx:gx-3,by:-(gy-3),m:PARTS[c.k].mass,key};
    (att.has(key)?P:loose).push(p); }
  const cnt=k=>P.filter(p=>p.k===k).length;
  const n={rocket:cnt('rocket'),fuel:cnt('fuel'),motor:cnt('motor'),battery:cnt('battery'),prop:cnt('prop'),wing:cnt('wing'),balloon:cnt('balloon'),wheel:cnt('wheel'),chute:cnt('chute')};
  const fuel0=n.rocket?n.fuel*K.tankFuel+n.rocket*K.rocketBurn:0;
  const dryM=P.reduce((s,p)=>s+p.m,0);
  const fuelMass0=n.fuel*K.tankFuel*K.fuelMass;
  // centre of mass with full tanks
  let cx=0,cy=0,M0=dryM+fuelMass0;
  P.forEach(p=>{ const m=p.m+(p.k==='fuel'?K.tankFuel*K.fuelMass:0); cx+=p.bx*m; cy+=p.by*m; }); cx/=M0; cy/=M0;
  P.forEach(p=>{ p.rx=p.bx-cx; p.ry=p.by-cy; });
  let I=0; P.forEach(p=>{ I+=p.m*(p.rx*p.rx+p.ry*p.ry+1/6); }); I+=fuelMass0*1; I=Math.max(I,.5);
  // thrust direction defines "forward"
  let fx=0,fy=0; P.forEach(p=>{ if(p.k==='rocket'||p.k==='prop'){ fx+=DIRS[p.d][0]; fy+=DIRS[p.d][1]; } });
  let fwd=null; const fl=Math.hypot(fx,fy); if(fl>.01) fwd=[fx/fl,fy/fl]; else if(!n.balloon&&lv.goal!=='soft') fwd=[1,0];
  // nose cones pointing forward cut drag
  const f0=fwd||[0,1]; const noses=P.filter(p=>p.k==='nose'&&DIRS[p.d][0]*f0[0]+DIRS[p.d][1]*f0[1]>.5).length;
  const cd=K.cd*P.length*(noses?K.noseCut:1)+(n.balloon*.06);
  // rest on the ground: lowest point touches
  let low=1e9; P.forEach(p=>{ low=Math.min(low, p.ry-(p.k==='wheel'?K.wheelR:.5)); });
  const S={kind:'machine',dt:1/300,P,loose,n,T,lv,cd,I,M:M0,dryM,fuel:fuel0,fuel0,energy:n.battery*K.battery,energy0:n.battery*K.battery,fwd,noses,
    x:0,y:T.h(0)-low+.01+(lv.start||0),a:0,vx:0,vy:0,w:0,t:0,x0:0,y0:0,land:null,open:0,
    best:{dist:0,alt:0,speed:0}, done:false, why:'', still:0, grounded:0, wheelsDown:0, spin:0, burning:false, driving:false, propping:false, contacts:[]};
  S.x0=S.x; S.y0=S.y;
  if(lv.fixed&&Object.values(lv.fixed).includes('crate')&&!P.some(p=>p.k==='crate')) S.noCargo=true;
  return S;
}
function stepSim(S,dt){
  if(S.done) return;
  const {P,n,T}=S, ca=Math.cos(S.a), sa=Math.sin(S.a);
  const toW=(x,y)=>[x*ca-y*sa, x*sa+y*ca];
  let Fx=0,Fy=0,tau=0;
  const add=(fx,fy,rx,ry)=>{ Fx+=fx; Fy+=fy; tau+=rx*fy-ry*fx; };
  const M=S.dryM+Math.min(S.fuel,n.fuel*K.tankFuel)*K.fuelMass;
  S.M=Math.max(.3,M);
  const sp=Math.hypot(S.vx,S.vy);
  Fy-=S.M*G;
  // rockets
  S.burning=n.rocket>0&&S.fuel>0;
  if(S.burning){ S.fuel=Math.max(0,S.fuel-n.rocket*dt);
    P.forEach(p=>{ if(p.k!=='rocket') return; const [dx,dy]=toW(...DIRS[p.d]), [rx,ry]=toW(p.rx,p.ry); add(dx*K.rocketF,dy*K.rocketF,rx,ry); }); }
  // propellers and motors share the batteries
  const drain=(S.energy>0?(n.prop+(S.wheelsDown>0?n.motor:0)):0);
  S.propping=n.prop>0&&S.energy>0; S.driving=n.motor>0&&S.energy>0;
  if(S.energy>0) S.energy=Math.max(0,S.energy-drain*dt);
  if(S.propping){ P.forEach(p=>{ if(p.k!=='prop') return; const [dx,dy]=toW(...DIRS[p.d]), [rx,ry]=toW(p.rx,p.ry);
    const along=S.vx*dx+S.vy*dy, f=K.propF*Math.max(0,1-along/K.propVmax); add(dx*f,dy*f,rx,ry); }); }
  // air
  const air=Math.exp(-Math.max(0,S.y-S.y0)/350); S.air=air;
  Fx-=S.cd*air*sp*S.vx; Fy-=S.cd*air*sp*S.vy;
  if(n.wing&&sp>.5){ const up=toW(0,1); let px=-S.vy/sp, py=S.vx/sp; if(px*up[0]+py*up[1]<0){ px=-px; py=-py; }
    const rt=toW(1,0), vf=Math.max(0,S.vx*rt[0]+S.vy*rt[1]);
    const L=Math.min(K.cl*n.wing*vf*vf, 3*S.M*G); Fx+=px*L; Fy+=py*L; Fx-=.04*L*S.vx/sp; Fy-=.04*L*S.vy/sp; }
  if(n.chute){ // parachutes open over the first second and fold away once you've landed
    S.open=S.land!=null?Math.max(0,S.open-dt*2):Math.min(1,S.t/.8);
    const c=K.chute*air*S.open*sp;
    P.forEach(p=>{ if(p.k!=='chute') return; const [rx,ry]=toW(p.rx,p.ry); add(-c*S.vx,-c*S.vy,rx,ry); }); }
  if(n.balloon){ const b=K.balloonF*Math.max(0,Math.min(1,1-(S.y-S.y0)/K.balloonTop));
    P.forEach(p=>{ if(p.k!=='balloon') return; const [rx,ry]=toW(p.rx,p.ry); add(0,b,rx,ry); }); }
  // ground
  let wheelsDown=0, touching=0; S.contacts.length=0;
  const kS=S.M*900, cS=S.M*30;
  const contact=(px,py,rx,ry,isWheel)=>{
    const hh=T.h(px); if(hh<-1e3) return;
    const s=T.s(px), nl=Math.hypot(s,1), nx=-s/nl, ny=1/nl, tx=1/nl, ty=s/nl;
    const pen=(hh-py)*ny; if(pen<=0) return;
    touching++;
    const vpx=S.vx-S.w*ry, vpy=S.vy+S.w*rx, vn=vpx*nx+vpy*ny, vt=vpx*tx+vpy*ty;
    const Fn=Math.max(0,kS*Math.min(pen,.4)-cS*vn); let Ft;
    if(isWheel){ Ft=-.07*Fn*Math.tanh(vt*4);
      if(S.driving){ const want=K.motorF*n.motor*Math.max(0,1-vt/K.motorVmax)/Math.max(1,S.wheelsDown); Ft+=Math.min(want,1.1*Fn); } }
    else { Ft=Math.max(-.6*Fn,Math.min(.6*Fn,-vt*S.M*20)); }
    add(nx*Fn+tx*Ft, ny*Fn+ty*Ft, rx, ry);
    if(Fn>S.M*2) S.contacts.push([px,py,isWheel,vt]);
  };
  P.forEach(p=>{ const [rx,ry]=toW(p.rx,p.ry);
    if(p.k==='wheel'){ const cx=S.x+rx, cy=S.y+ry, hh=T.h(cx); if(hh<-1e3) return;
      const s=T.s(cx), nl=Math.hypot(s,1), nx=-s/nl, ny=1/nl;
      const dist=(cy-hh)*ny; if(dist<K.wheelR){ wheelsDown++; contact(cx-nx*K.wheelR, cy-ny*K.wheelR, rx-nx*K.wheelR, ry-ny*K.wheelR, true); } }
    else if(p.k!=='balloon'){ for(const [ox,oy] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){ const [qx,qy]=toW(p.rx+ox,p.ry+oy); contact(S.x+qx,S.y+qy,qx,qy,false); } } });
  S.wheelsDown=wheelsDown; S.grounded=touching;
  if(touching&&S.land==null&&S.lv.start){ S.land=sp*3.6; S.landT=S.t; }
  // spin: damping, and weathervane in the air
  tau-=S.w*S.I*(.4+.03*sp*(n.wing||S.noses?2:1));
  if(!touching&&S.fwd&&sp>3){ const [ux,uy]=toW(...S.fwd), vx=S.vx/sp, vy=S.vy/sp;
    const err=Math.atan2(ux*vy-uy*vx, ux*vx+uy*vy); tau+=err*Math.min(sp*sp,900)*.004*(1+n.wing+S.noses)*S.I; }
  // integrate
  S.vx+=Fx/S.M*dt; S.vy+=Fy/S.M*dt; S.w+=tau/S.I*dt; S.w=Math.max(-25,Math.min(25,S.w));
  S.x+=S.vx*dt; S.y+=S.vy*dt; S.a+=S.w*dt; S.t+=dt;
  S.spin+=(S.vx/K.wheelR)*dt;
  // records
  const b=S.best; b.dist=Math.max(b.dist,S.x-S.x0); b.alt=Math.max(b.alt,S.y-S.y0); b.speed=Math.max(b.speed,Math.hypot(S.vx,S.vy)*3.6);
  // ending
  const pushing=S.burning||S.propping||(S.driving&&S.wheelsDown);
  const sp2=Math.hypot(S.vx,S.vy);
  if(sp2<.35&&Math.abs(S.w)<.3&&!pushing) S.still+=dt; else S.still=0;
  const drop=!!S.lv.start;
  if(drop&&S.land==null) S.still=0; // still falling (or floating)
  if(n.balloon&&!drop&&!pushing&&Math.abs(S.vy)<.25&&S.t>4) S.still+=dt*.5;
  if(T.gap&&S.x>T.gap[0]&&S.x<T.gap[1]&&S.y<-4){ S.done=true; S.why='canyon'; }
  else if(drop&&S.land!=null&&S.t-S.landT>3){ S.done=true; S.why='stopped'; }
  else if(S.still>1.2){ S.done=true; S.why='stopped'; }
  else if(S.t>40){ S.done=true; S.why='time'; }
}

// ---------- bridges ----------
// Every part is a joint. Joints that touch, side by side or corner to corner, are joined by a beam.
// Beams stretch a little, and snap when pulled or pushed harder than they can take. Cables only pull.
const BEAM={ road:{str:30, give:.004}, wood:{str:40, give:.002}, steel:{str:120, give:.0008}, cable:{str:80, give:.0012, pull:true}, bolt:{str:150, give:.001} };
const VEHICLES=[{k:'bike',name:'Bike',m:.3,v:3.2,len:.9},{k:'car',name:'Car',m:1,v:3,len:1.3},{k:'van',name:'Van',m:2,v:2.6,len:1.6},{k:'truck',name:'Truck',m:4,v:2.2,len:2.2}];
function beamOf(a,b){ // the weaker part decides; parts are bolted firmly into the cliff
  if(a==='cable'||b==='cable') return 'cable'; if(a==='bank'||b==='bank') return 'bolt';
  return BEAM[a].str<=BEAM[b].str?a:b; }
function bridgeGraph(d){
  const nodes=[], idx={}; const add=(x,y,k)=>{ idx[x+','+y]=nodes.length; nodes.push({x,y,k}); };
  for(let y=ROAD;y<GH;y++){ add(-1,y,'bank'); add(GW,y,'bank'); } // the cliff faces, from the road down
  for(const key in d){ const [x,y]=key.split(',').map(Number); add(x,y,d[key].k); }
  const links=[];
  nodes.forEach((a,i)=>{ for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){ const j=idx[(a.x+dx)+','+(a.y+dy)]; if(j==null) continue;
    const b=nodes[j]; if(a.k==='bank'&&b.k==='bank') continue; links.push({a:i,b:j,m:beamOf(a.k,b.k)}); } });
  return {nodes,links,idx};
}
function attachedBridge(d){ // parts joined, through other parts, to a cliff
  const G=bridgeGraph(d), adj=G.nodes.map(()=>[]); G.links.forEach(l=>{ adj[l.a].push(l.b); adj[l.b].push(l.a); });
  const q=[], seen=new Set(); G.nodes.forEach((n,i)=>{ if(n.k==='bank'){ q.push(i); seen.add(i); } });
  while(q.length){ const i=q.shift(); adj[i].forEach(j=>{ if(!seen.has(j)){ seen.add(j); q.push(j); } }); }
  const out=new Set(); seen.forEach(i=>{ const n=G.nodes[i]; if(n.k!=='bank') out.add(n.x+','+n.y); }); return out;
}
function makeBridgeSim(design,lv){
  const G=bridgeGraph(design);
  const N=G.nodes.map(n=>({k:n.k,gx:n.x,gy:n.y,x:n.x,y:-n.y,px:n.x,py:-n.y,vx:0,vy:0,m:n.k==='bank'?0:PARTS[n.k].mass,w:0,fixed:n.k==='bank'}));
  const L=G.links.map(l=>{ const a=N[l.a], b=N[l.b], B=BEAM[l.m]; return {a:l.a,b:l.b,m:l.m,L:Math.hypot(a.x-b.x,a.y-b.y),str:B.str,give:B.give,pull:!!B.pull,f:0,load:0,broken:false}; });
  const road=[G.idx['-1,'+ROAD]]; for(let x=0;x<GW;x++) road.push(G.idx[x+','+ROAD]); road.push(G.idx[GW+','+ROAD]);
  const roadLinks=road.slice(1).map((j,i)=>L.find(l=>(l.a===road[i]&&l.b===j)||(l.b===road[i]&&l.a===j)));
  return {kind:'bridge',dt:1/60,lv,N,L,road,roadLinks,t:0,vi:0,car:null,wait:1.5,load:0,done:false,why:'',snaps:[],endT:0};
}
function stepBridge(S,dt){
  if(S.done) return; S.t+=dt;
  const {N,L,road}=S, extra=new Array(N.length).fill(0);
  // the vehicles, one at a time
  if(!S.car&&S.wait>0){ S.wait-=dt; if(S.wait<=0){ const V=VEHICLES[S.vi]; S.car={V,x:-4,y:-ROAD,a:0,fall:false,vx:V.v,vy:0,w:0}; } }
  const C=S.car;
  if(C&&!C.fall){ C.x+=C.V.v*dt;
    const x0=N[road[0]].x, x1=N[road[road.length-1]].x;
    if(C.x<x0||C.x>x1){ C.y=-ROAD; C.a=0; }
    else { let i=0; while(i<road.length-2&&N[road[i+1]].x<C.x) i++;
      const A=N[road[i]], B=N[road[i+1]], lk=S.roadLinks[i], u=clamp01((C.x-A.x)/Math.max(.05,B.x-A.x));
      const slope=(B.y-A.y)/Math.max(.05,B.x-A.x);
      if(!lk||lk.broken||B.x-A.x<.05||Math.abs(slope)>1.2){ C.fall=true; C.vy=0; C.w=-1.5; if(!S.why) S.why='fell'; }
      else { C.y=A.y+(B.y-A.y)*u; C.a=Math.atan(slope); extra[road[i]]+=C.V.m*(1-u); extra[road[i+1]]+=C.V.m*u; } }
    if(C.x>GW+3){ S.load=Math.max(S.load,C.V.m); S.car=null; S.vi++; S.wait=.5; if(S.vi>=VEHICLES.length){ S.done=true; S.why='all'; } }
  }
  if(C&&C.fall){ C.vy-=G*dt; C.x+=C.vx*dt*.6; C.y+=C.vy*dt; C.a+=C.w*dt; }
  if(C&&C.fall){ S.endT+=dt; if(S.endT>2.2){ S.done=true; if(!S.why) S.why='fell'; } }
  // the beams, in small steps (position-based: move the joints, then pull the beams back to length)
  const n=16, h=dt/n, g=G*Math.min(1,S.t/.8);
  for(let s=0;s<n;s++){
    N.forEach((p,i)=>{ if(p.fixed) return; p.w=1/(p.m+extra[i]); p.vy-=g*h; p.px=p.x; p.py=p.y; p.x+=p.vx*h; p.y+=p.vy*h; });
    L.forEach(l=>{ if(l.broken) return; const a=N[l.a], b=N[l.b], dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1e-6, c=d-l.L;
      if(l.pull&&c<0){ l.f=0; l.load*=.9; return; }
      const wa=a.fixed?0:a.w, wb=b.fixed?0:b.w; if(wa+wb===0) return;
      const dl=-c/(wa+wb+l.give/(h*h)), nx=dx/d, ny=dy/d;
      a.x-=wa*dl*nx; a.y-=wa*dl*ny; b.x+=wb*dl*nx; b.y+=wb*dl*ny;
      l.f=-dl/(h*h); l.load=l.load*.9+Math.abs(l.f)/l.str*.1; // pull is +, push is -
      if(l.load>1){ l.broken=true; S.snaps.push(l); } });
    N.forEach(p=>{ if(p.fixed) return; const k=1-.6*h; p.vx=(p.x-p.px)/h*k; p.vy=(p.y-p.py)/h*k; });
  }
}
function clamp01(v){ return v<0?0:v>1?1:v; }

// ---------- the pocket watch ----------
// Pip is the axle of a balance wheel. It swings with a period of 2π√(I/κ): I is how the weight is spread
// around the axle, κ is how stiff the hairsprings are. A watch that isn't balanced on its axle also runs badly.
function makeWatchSim(design,lv){
  const att=attached(design), P=[], loose=[];
  for(const key in design){ const [gx,gy]=key.split(',').map(Number), c=design[key];
    (att.has(key)?P:loose).push({k:c.k,d:c.d||0,gx,gy,bx:gx-3,by:-(gy-3),m:PARTS[c.k].mass,key}); }
  let M=0,mx=0,my=0,I=0,nh=0;
  P.forEach(p=>{ let x=p.bx, y=p.by, r=Math.hypot(x,y);
    if(p.k==='screw'&&r>0){ const out=screwOut(p.d)*K.screwStep; x+=x/r*out; y+=y/r*out; } // each tap screws it a little further out
    M+=p.m; mx+=p.m*x; my+=p.m*y; I+=p.m*(x*x+y*y+1/6); if(p.k==='hair') nh++; });
  const off=Math.hypot(mx,my)/M, T=nh?2*Math.PI*Math.sqrt(I/(K.hair*nh)):0;
  const rate=nh?K.day*(K.tick/T-1):0; // seconds gained (+) or lost (-) in a day
  const err=nh?Math.abs(rate)+K.poise*off:null;
  return {kind:'watch',dt:1/60,lv,P,loose,I,T,off,rate,err,nh,t:0,done:false,why:nh?'':'nohair'};
}
function screwOut(d){ return (4-d)%4; } // taps turn d 0,3,2,1: 0 to 3 steps out
const WATCH={swing:3, day:4.5}; // seconds of real-time swinging, then seconds for the fast-forwarded day
function stepWatch(S,dt){ if(S.done) return; S.t+=dt; if(S.t>=(S.nh?WATCH.swing+WATCH.day+.4:2)) S.done=true; }

// ---------- all kinds ----------
function makeAny(design,lv){ return lv.kind==='bridge'?makeBridgeSim(design,lv):lv.kind==='watch'?makeWatchSim(design,lv):makeSim(design,lv); }
function stepAny(S,dt){ S.kind==='bridge'?stepBridge(S,dt):S.kind==='watch'?stepWatch(S,dt):stepSim(S,dt); }
function attachedAny(d,lv){ return lv.kind==='bridge'?attachedBridge(d):attached(d); }
function scoreOf(S){ const g=S.lv.goal;
  if(S.kind==='bridge') return S.load; if(S.kind==='watch') return S.done?S.err:null;
  return g==='soft'?S.land:S.best[g]; }
function medalFor(lv,v){ if(v==null) return 0; const m=lv.marks;
  if(GOALS[lv.goal].low) return v<=m[2]?3:v<=m[1]?2:v<=m[0]?1:0;
  return v>=m[2]?3:v>=m[1]?2:v>=m[0]?1:0; }
function better(lv,v,best){ if(v==null) return false; if(!best) return true; return GOALS[lv.goal].low?v<best:v>best; }
function runToEnd(design,lv){ const S=makeAny(design,lv); let i=0; while(!S.done&&i<45/S.dt){ stepAny(S,S.dt); i++; } return S; }
if(typeof module!=='undefined') module.exports={PARTS,LEVELS,GOALS,K,BEAM,VEHICLES,ROAD,makeSim,stepSim,makeAny,stepAny,runToEnd,scoreOf,better,newDesign,attached,attachedAny,designCost,medalFor,terrain,DIRS,GW,GH};
