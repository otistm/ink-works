/* Ink Works engine: parts, levels, and the machine simulation. Pure JS, no DOM. */
"use strict";
const GW=7, GH=7, G=9.8;
const PARTS={
  core:   {name:'Pip',       cost:0,  mass:1,   desc:'Your pilot. Every part must touch Pip or a part that does.'},
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
  crate:  {name:'Crate',     cost:0,  mass:3,   desc:'The cargo. It has to come along.'}
};
const K={ rocketF:70, rocketBurn:1.5, tankFuel:5, fuelMass:.22, motorF:34, motorVmax:40, battery:8, propF:24, propVmax:32,
  balloonF:16, balloonTop:150, cd:.018, noseCut:.45, cl:.34, wheelR:.6 };
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
  {id:'leap',  name:'The canyon',   goal:'dist',  marks:[100,180,260], budget:130, parts:['frame','wheel','motor','battery','rocket','fuel','nose'], terrain:'gap',
   blurb:'Jump the canyon. It starts at 50 m.', hint:'You need about 90 km/h off the ramp. A rocket pointed right helps.'},
  {id:'glide', name:'First flight', goal:'dist',  marks:[120,220,300], budget:130, parts:['frame','wheel','battery','prop','wing','nose'],
   blurb:'Take off and fly far.', hint:'Propellers need speed before the wings can lift you. Roll out on wheels.'},
  {id:'sky',   name:'Sky high',     goal:'alt',   marks:[240,300,340], budget:160, parts:['frame','rocket','fuel','nose','wing','balloon'],
   blurb:'Go as high as you dare.', hint:'Fuel is heavy and every part drags. The air thins as you climb.'},
  {id:'flats', name:'Salt flats',   goal:'speed', marks:[120,160,190], budget:170, parts:['frame','wheel','motor','battery','rocket','fuel','nose','wing'],
   blurb:'Set a land speed record.', hint:'Motors top out. Rockets don\u2019t.'}
];
const GOALS={dist:{label:'Distance',unit:'m'}, alt:{label:'Height',unit:'m'}, speed:{label:'Top speed',unit:'km/h'}};

// ---------- designs ----------
function newDesign(lv){ const d={}; d['3,3']={k:'core',d:0}; if(lv.fixed) for(const key in lv.fixed) d[key]={k:lv.fixed[key],d:0}; return d; }
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
  const n={rocket:cnt('rocket'),fuel:cnt('fuel'),motor:cnt('motor'),battery:cnt('battery'),prop:cnt('prop'),wing:cnt('wing'),balloon:cnt('balloon'),wheel:cnt('wheel')};
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
  let fwd=null; const fl=Math.hypot(fx,fy); if(fl>.01) fwd=[fx/fl,fy/fl]; else if(!n.balloon) fwd=[1,0];
  // nose cones pointing forward cut drag
  const f0=fwd||[0,1]; const noses=P.filter(p=>p.k==='nose'&&DIRS[p.d][0]*f0[0]+DIRS[p.d][1]*f0[1]>.5).length;
  const cd=K.cd*P.length*(noses?K.noseCut:1)+(n.balloon*.06);
  // rest on the ground: lowest point touches
  let low=1e9; P.forEach(p=>{ low=Math.min(low, p.ry-(p.k==='wheel'?K.wheelR:.5)); });
  const S={P,loose,n,T,lv,cd,I,M:M0,dryM,fuel:fuel0,fuel0,energy:n.battery*K.battery,energy0:n.battery*K.battery,fwd,noses,
    x:0,y:T.h(0)-low+.01,a:0,vx:0,vy:0,w:0,t:0,x0:0,y0:0,
    best:{dist:0,alt:0,speed:0}, done:false, why:'', still:0, grounded:0, wheelsDown:0, spin:0, burning:false, driving:false, propping:false, contacts:[]};
  S.x0=S.x; S.y0=S.y;
  if(!P.some(p=>p.k==='crate')&&lv.fixed) S.noCargo=true;
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
  if(n.balloon){ const b=K.balloonF*Math.max(0,1-(S.y-S.y0)/K.balloonTop);
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
  if(n.balloon&&!pushing&&Math.abs(S.vy)<.25&&S.t>4) S.still+=dt*.5;
  if(T.gap&&S.x>T.gap[0]&&S.x<T.gap[1]&&S.y<-4){ S.done=true; S.why='canyon'; }
  else if(S.still>1.2){ S.done=true; S.why='stopped'; }
  else if(S.t>40){ S.done=true; S.why='time'; }
}
function medalFor(lv,v){ return v>=lv.marks[2]?3:v>=lv.marks[1]?2:v>=lv.marks[0]?1:0; }
function runToEnd(design,lv){ const S=makeSim(design,lv); let i=0; while(!S.done&&i<40*300){ stepSim(S,1/300); i++; } return S; }
if(typeof module!=='undefined') module.exports={PARTS,LEVELS,K,makeSim,stepSim,runToEnd,newDesign,attached,designCost,medalFor,terrain,DIRS,GW,GH};
