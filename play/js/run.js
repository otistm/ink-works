/* Ink Works: launching, effects, and each frame of a run (camera, exhaust, medal callouts). */
"use strict";
/* ---------- launching ---------- */
function launch(){
  const lv=GS.lv; GS.view=grid(); // the bridge and the watch are shown where the bench was
  const S=makeAny(GS.design,lv); GS.S=S; GS.mode='run'; GS.pre=RM||S.kind!=='machine'?0:.55; GS.acc=0; GS.got=0; GS.endT=0; GS.fx=[]; GS.shake=0; GS.lastV=[0,0];
  GS.loose=[]; GS.snapsSeen=0; GS.carSeen=-1; GS.crashed=false; GS.cracked=false; GS.ticks=0; GS.tocks=0;
  const r=rec(lv.id); r.design=GS.design; save();
  if(S.kind==='machine'){
    GS.loose=S.loose.map(p=>({p, x:0, y:0, vx:(Math.random()-.5)*2, vy:2+Math.random()*2, a:0, w:(Math.random()-.5)*6, t:0}));
    // loose parts start where they sat in the grid, relative to Pip
    const core=S.P.find(p=>p.k==='core'); GS.loose.forEach(L=>{ L.x=S.x+(L.p.bx-core.bx)+core.rx; L.y=S.y+(L.p.by-core.by)+core.ry; });
    GS.cam.x=S.x; GS.cam.y=S.y+2; GS.cam.z=baseZ();
  } else if(S.kind==='watch') GS.loose=S.loose.map(p=>({p, x:p.bx, y:p.by, vx:(Math.random()-.5)*2, vy:1+Math.random()*2, a:0, w:(Math.random()-.5)*6}));
  $('dock').hidden=true; $('warn').textContent=''; showHint('');
  $('hsub').textContent=S.kind==='bridge'?'The traffic is coming.':S.kind==='watch'?'Tick, tock…':GOALS[lv.goal].low?'Gold is '+fmt(lv.goal,lv.marks[2])+' or less':'Target '+fmt(lv.goal,lv.marks[0]);
  $('costbox').hidden=true; $('live').hidden=false; setLive(S.kind==='machine'&&lv.goal==='soft'?0:null);
  if(S.kind==='machine') blip(180,.5,'sawtooth',.06,90);
  setTimeout(()=>{ if(GS.mode==='run'){ $('skip').hidden=false; } },2500);
}
function baseZ(){ return clamp(Math.min(W,H)/15,20,34); }
function setLive(v){ const s=v==null?'— ':fmt(GS.lv.goal,v), i=s.indexOf(' '); $('livev').textContent=s.slice(0,i); $('liveu').textContent=s.slice(i+1); }

function finish(){
  const S=GS.S, lv=GS.lv, v=scoreOf(S), m=medalFor(lv,v), r=rec(lv.id), newBest=better(lv,v,r.best);
  if(newBest) r.best=GOALS[lv.goal].low?Math.max(v,.001):v; if(m>r.medal) r.medal=m; save(); loops(false,false,0);
  const nextOpen=GS.li<LEVELS.length-1&&unlocked(GS.li+1);
  let why='';
  if(S.kind==='bridge') why=S.why==='all'?'Everything made it across.':S.car?'The '+S.car.V.name.toLowerCase()+' fell.':'';
  else if(S.kind==='watch') why=!S.nh?'No hairspring, so it doesn’t tick.':(S.rate>=0?'It gains ':'It loses ')+fmt('time',Math.abs(S.rate))+(K.poise*S.off>=1?', plus '+fmt('time',K.poise*S.off).replace(' a day','')+' from being off balance.':'.');
  else why=S.why==='canyon'?'Into the canyon.':S.noCargo?'The crate wasn’t joined on.':!S.P.some(p=>!PARTS[p.k].fixed)?'Pip needs some parts.':
    lv.start&&S.land==null?'Still in the air after 40 s.':lv.start&&m===0?'The egg cracked.':'';
  const head=m===3?'Gold!':m===2?'Silver!':m===1?'Bronze!':'Not yet';
  const rows=lv.marks.map((mk,i)=>`<div class="row${m>=i+1?' me':''}"><span class="pos">${medalSVG(m>=i+1?i+1:0,22)}</span><span class="nm">${MNAME[i+1]}</span><span></span><b>${fmt(lv.goal,mk)}</b></div>`).join('');
  openCard(`<h2>${head}</h2><p>${lv.name}${why?'. '+why:''}</p>
    <div class="award"><div class="troph">${medalSVG(m,m?84:64)}</div></div>
    <div class="big">${fmt(lv.goal,v)}</div><p class="nxt">${newBest?'New best':r.best?'Best '+fmt(lv.goal,r.best):''}</p>
    <div class="board">${rows}</div>
    ${nextOpen?`<button class="btn" id="bNext" type="button">Next machine</button>`:''}
    <button class="btn${nextOpen?' ghost':''}" id="bAgain" type="button">Change the build</button>
    <button class="btn ghost" id="bHome" type="button">All machines</button>`);
  if(m) setTimeout(()=>{ blip(660,.15,'triangle',.14); setTimeout(()=>blip(880,.15,'triangle',.14),120); if(m>1) setTimeout(()=>blip(1175,.3,'triangle',.14),240); },350);
  $('bAgain').onclick=()=>{ blip(500,.08); GS.mode='build'; closeCard(); setHud(true); $('costbox').hidden=false; $('live').hidden=true; refreshBuild(); };
  $('bHome').onclick=()=>{ blip(400,.08); showHome(); };
  if(nextOpen) $('bNext').onclick=()=>{ blip(560,.1,'triangle',.12,820); startBuild(GS.li+1); };
  GS.mode='done';
}

/* ---------- effects ---------- */
function puff(x,y,vx,vy,r,life){ GS.fx.push({k:'puff',x,y,vx,vy,r,g:r*1.8,t:0,life}); }
function star(x,y){ for(let i=0;i<8;i++){ const a=i/8*TAU; GS.fx.push({k:'star',x,y,vx:Math.cos(a)*7,vy:Math.sin(a)*7,t:0,life:.8,rot:a}); } }
function screenPuff(sx,sy,r,n){ for(let i=0;i<(n||5);i++) GS.fx.push({k:'puff',sx:sx+(Math.random()-.5)*r*2,sy:sy+(Math.random()-.5)*r*2,r:r*.5,g:r,t:0,life:.5,screen:true}); }

function runStep(dt){
  const S=GS.S, lv=GS.lv;
  if(S.kind==='bridge') runBridge(dt); else if(S.kind==='watch') runWatch(dt); else if(!runMachine(dt)) return;
  // medals
  const v=scoreOf(S), m=medalFor(lv,v);
  if(m>GS.got){ GS.got=m; callout(MNAME[m]+'!',fmt(lv.goal,lv.marks[m-1])); if(S.kind==='machine') star(S.x,S.y); blip(660+m*110,.2,'triangle',.14); buzz(15);
    if(!GOALS[lv.goal].low) $('hsub').textContent=m<3?'Next '+fmt(lv.goal,lv.marks[m]):'Gold!'; }
  if(S.done){ GS.endT+=dt; loops(false,false,0); $('skip').hidden=true; if(GS.endT>1.1) finish(); }
}

function runMachine(dt){
  const S=GS.S, lv=GS.lv;
  if(GS.pre>0){ GS.pre-=dt; if(GS.pre<=0){ callout(lv.start?'Drop!':'Go!'); blip(300,.35,'sawtooth',.08,700); buzz(20); } return false; }
  if(!S.done){ GS.acc+=dt; let n=0; while(GS.acc>=S.dt&&n<40){ stepSim(S,S.dt); GS.acc-=S.dt; n++; if(S.done) break; } }
  // hits
  const dv=Math.hypot(S.vx-GS.lastV[0],S.vy-GS.lastV[1]); GS.lastV=[S.vx,S.vy];
  if(dv>6&&S.grounded){ GS.shake=Math.min(1,dv/20); for(let i=0;i<6;i++) puff(S.x+(Math.random()-.5)*2,S.y-1,(Math.random()-.5)*4,Math.random()*2,.4,.7); blip(90,.25,'sine',.25,40); buzz(30); }
  // the egg drop: how hard did we land?
  if(lv.start&&S.land!=null&&!GS.cracked&&medalFor(lv,S.land)===0){ GS.cracked=true; callout('Crack!',fmt(lv.goal,S.land)); blip(140,.3,'square',.12,60); buzz(40); }
  // exhaust and dust
  const ca=Math.cos(S.a), sa=Math.sin(S.a);
  if(S.burning) S.P.forEach(p=>{ if(p.k!=='rocket'||Math.random()>.55) return; const dx=DIRS[p.d][0], dy=DIRS[p.d][1], ex=p.rx-dx*.9, ey=p.ry-dy*.9;
    const wx=S.x+ex*ca-ey*sa, wy=S.y+ex*sa+ey*ca, bx=-(dx*ca-dy*sa), by=-(dx*sa+dy*ca); puff(wx,wy,S.vx*.3+bx*8+(Math.random()-.5)*2,S.vy*.3+by*8+(Math.random()-.5)*2,.3,.9); });
  if(S.contacts.length&&Math.hypot(S.vx,S.vy)>3&&Math.random()<.5){ const c=S.contacts[Math.floor(Math.random()*S.contacts.length)]; puff(c[0],c[1]+.1,-S.vx*.1,1+Math.random(),.2,.6); }
  // loose parts tumble off
  GS.loose.forEach(L=>{ L.vy-=G*dt; L.x+=L.vx*dt; L.y+=L.vy*dt; L.a+=L.w*dt; const h=S.T.h(L.x); if(L.y-.5<h&&h>-1e3){ L.y=h+.5; L.vy*=-.3; L.vx*=.7; L.w*=.6; } });
  const sp=Math.hypot(S.vx,S.vy);
  setLive(lv.goal==='soft'?(S.land!=null?S.land:sp*3.6):lv.goal==='speed'?sp*3.6:S.best[lv.goal]);
  loops(S.burning&&!S.done, (S.driving&&S.wheelsDown>0||S.propping)&&!S.done, sp);
  // camera
  const lead=clamp(S.vx*.25,-6,10), leadY=clamp(S.vy*.2,-6,8);
  GS.cam.x+=(S.x+lead-GS.cam.x)*Math.min(1,dt*4); GS.cam.y+=(S.y+leadY-GS.cam.y)*Math.min(1,dt*4);
  const zt=baseZ()/Math.min(2.2,1+sp/45); GS.cam.z+=(zt-GS.cam.z)*Math.min(1,dt*1.5);
  GS.shake*=Math.pow(.02,dt);
  return true;
}

function bridgeXY(x,y){ const g=GS.view||grid(); return [g.cx+(x-3)*g.cs, g.cy+(-y-3)*g.cs]; }
function runBridge(dt){
  const S=GS.S;
  if(!S.done){ GS.acc+=dt; let n=0; while(GS.acc>=S.dt&&n<4){ stepBridge(S,S.dt); GS.acc-=S.dt; n++; if(S.done) break; } }
  // snapping beams
  while(GS.snapsSeen<S.snaps.length){ const l=S.snaps[GS.snapsSeen++], a=S.N[l.a], b=S.N[l.b], [sx,sy]=bridgeXY((a.x+b.x)/2,(a.y+b.y)/2);
    screenPuff(sx,sy,GS.view.cs*.25,4); GS.shake=Math.min(1,GS.shake+.35); blip(160+Math.random()*80,.18,'square',.1,60); buzz(20); }
  const C=S.car;
  if(C&&GS.carSeen!==S.vi){ GS.carSeen=S.vi; $('hsub').textContent='Here comes the '+C.V.name.toLowerCase()+', '+fmt('load',C.V.m)+'.'; blip(520,.1,'triangle',.08,700); }
  if(C&&C.fall&&!GS.crashed){ GS.crashed=true; callout('Crash!'); blip(90,.5,'sawtooth',.12,40); buzz(60); GS.shake=1; }
  setLive(S.load||null);
  loops(false,!!C&&!C.fall&&!S.done,C?C.V.v*6:0);
  GS.shake*=Math.pow(.02,dt);
}

function runWatch(dt){
  const S=GS.S; stepWatch(S,dt);
  // Pip's watch ticks every half swing; the real clock tocks every second
  if(S.nh&&S.t<WATCH.swing){ const n=Math.floor(S.t/(S.T/2)); if(n>GS.ticks){ GS.ticks=n; blip(2200,.03,'square',.05); }
    const s=Math.floor(S.t); if(s>GS.tocks){ GS.tocks=s; blip(700,.05,'triangle',.07); } }
  if(S.nh&&S.t>=WATCH.swing&&GS.ticks>=0){ GS.ticks=-1; $('hsub').textContent='A day later…'; blip(300,.4,'triangle',.08,900); }
  if(!S.nh&&S.t>.6&&GS.ticks===0){ GS.ticks=-1; callout('No tick'); }
  setLive(S.nh?S.err*watchDay(S):null);
  GS.loose.forEach(L=>{ L.vy-=G*dt; L.x+=L.vx*dt; L.y+=L.vy*dt; L.a+=L.w*dt; });
}
// how far through the fast-forwarded day we are, eased in and out
function watchDay(S){ const u=clamp((S.t-WATCH.swing)/WATCH.day,0,1); return u*u*(3-2*u); }
