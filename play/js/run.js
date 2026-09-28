/* Ink Works: launching, effects, and each frame of a run (camera, exhaust, medal callouts). */
"use strict";
/* ---------- launching ---------- */
function launch(){
  const S=makeSim(GS.design,GS.lv); GS.S=S; GS.mode='run'; GS.pre=RM?0:.55; GS.acc=0; GS.got=0; GS.endT=0; GS.fx=[]; GS.shake=0; GS.lastV=[0,0];
  const r=rec(GS.lv.id); r.design=GS.design; save();
  GS.loose=S.loose.map(p=>({p, x:S.x+(p.bx-0)-(S.P.length?0:0), y:0, vx:(Math.random()-.5)*2, vy:2+Math.random()*2, a:0, w:(Math.random()-.5)*6, t:0}));
  // loose parts start where they sat in the grid, relative to Pip
  const core=S.P.find(p=>p.k==='core'); GS.loose.forEach(L=>{ L.x=S.x+(L.p.bx-core.bx)+core.rx; L.y=S.y+(L.p.by-core.by)+core.ry; });
  GS.cam.x=S.x; GS.cam.y=S.y+2; GS.cam.z=baseZ();
  $('dock').hidden=true; $('warn').textContent=''; showHint(''); $('hsub').textContent='Target '+GS.lv.marks[0]+' '+GOALS[GS.lv.goal].unit;
  $('costbox').hidden=true; $('live').hidden=false; setLive(0);
  blip(180,.5,'sawtooth',.06,90);
  setTimeout(()=>{ if(GS.mode==='run'){ $('skip').hidden=false; } },2500);
}
function baseZ(){ return clamp(Math.min(W,H)/15,20,34); }
function setLive(v){ const lv=GS.lv; $('livev').textContent=Math.round(v); $('liveu').textContent=GOALS[lv.goal].unit; }

function finish(){
  const S=GS.S, lv=GS.lv, v=S.best[lv.goal], m=medalFor(lv,v), r=rec(lv.id), newBest=v>r.best+.5;
  if(v>r.best) r.best=v; if(m>r.medal) r.medal=m; save(); loops(false,false,0);
  const nextOpen=GS.li<LEVELS.length-1&&unlocked(GS.li+1);
  const why=S.why==='canyon'?'Into the canyon.':S.noCargo?'The crate wasn\u2019t joined on.':S.P.length===1?'Pip needs some parts.':'';
  const head=m===3?'Gold!':m===2?'Silver!':m===1?'Bronze!':'Not yet';
  const rows=lv.marks.map((mk,i)=>`<div class="row${m>=i+1?' me':''}"><span class="pos">${medalSVG(m>=i+1?i+1:0,22)}</span><span class="nm">${MNAME[i+1]}</span><span></span><b>${mk} ${GOALS[lv.goal].unit}</b></div>`).join('');
  openCard(`<h2>${head}</h2><p>${lv.name}${why?'. '+why:''}</p>
    <div class="award"><div class="troph">${medalSVG(m,m?84:64)}</div></div>
    <div class="big">${fmt(lv.goal,v)}</div><p class="nxt">${newBest?'New best':'Best '+fmt(lv.goal,r.best)}</p>
    <div class="board">${rows}</div>
    ${nextOpen?`<button class="btn" id="bNext" type="button">Next machine</button>`:''}
    <button class="btn${nextOpen?' ghost':''}" id="bAgain" type="button">Change the build</button>
    <button class="btn ghost" id="bHome" type="button">All machines</button>`);
  if(m) setTimeout(()=>{ blip(660,.15,'triangle',.14); setTimeout(()=>blip(880,.15,'triangle',.14),120); if(m>1) setTimeout(()=>blip(1175,.3,'triangle',.14),240); },350);
  $('bAgain').onclick=()=>{ blip(500,.08); GS.mode='build'; closeCard(); setHud(true); $('costbox').hidden=false; $('live').hidden=true; refreshBuild(); };
  $('bHome').onclick=()=>{ blip(400,.08); showHome(); };
  if(nextOpen) $('bNext').onclick=()=>{ blip(560,.1,'triangle',.12,820); $('costbox').hidden=false; $('live').hidden=true; startBuild(GS.li+1); };
  GS.mode='done';
}

/* ---------- effects ---------- */
function puff(x,y,vx,vy,r,life){ GS.fx.push({k:'puff',x,y,vx,vy,r,g:r*1.8,t:0,life}); }
function star(x,y){ for(let i=0;i<8;i++){ const a=i/8*TAU; GS.fx.push({k:'star',x,y,vx:Math.cos(a)*7,vy:Math.sin(a)*7,t:0,life:.8,rot:a}); } }

function runStep(dt){
  const S=GS.S, lv=GS.lv;
  if(GS.pre>0){ GS.pre-=dt; if(GS.pre<=0){ callout('Go!'); blip(300,.35,'sawtooth',.08,700); buzz(20); } return; }
  if(!S.done){ GS.acc+=dt; let n=0; while(GS.acc>=1/300&&n<40){ stepSim(S,1/300); GS.acc-=1/300; n++; if(S.done) break; } }
  // hits
  const dv=Math.hypot(S.vx-GS.lastV[0],S.vy-GS.lastV[1]); GS.lastV=[S.vx,S.vy];
  if(dv>6&&S.grounded){ GS.shake=Math.min(1,dv/20); for(let i=0;i<6;i++) puff(S.x+(Math.random()-.5)*2,S.y-1,(Math.random()-.5)*4,Math.random()*2,.4,.7); blip(90,.25,'sine',.25,40); buzz(30); }
  // exhaust and dust
  const ca=Math.cos(S.a), sa=Math.sin(S.a);
  if(S.burning) S.P.forEach(p=>{ if(p.k!=='rocket'||Math.random()>.55) return; const dx=DIRS[p.d][0], dy=DIRS[p.d][1], ex=p.rx-dx*.9, ey=p.ry-dy*.9;
    const wx=S.x+ex*ca-ey*sa, wy=S.y+ex*sa+ey*ca, bx=-(dx*ca-dy*sa), by=-(dx*sa+dy*ca); puff(wx,wy,S.vx*.3+bx*8+(Math.random()-.5)*2,S.vy*.3+by*8+(Math.random()-.5)*2,.3,.9); });
  if(S.contacts.length&&Math.hypot(S.vx,S.vy)>3&&Math.random()<.5){ const c=S.contacts[Math.floor(Math.random()*S.contacts.length)]; puff(c[0],c[1]+.1,-S.vx*.1,1+Math.random(),.2,.6); }
  // loose parts tumble off
  GS.loose.forEach(L=>{ L.vy-=G*dt; L.x+=L.vx*dt; L.y+=L.vy*dt; L.a+=L.w*dt; const h=S.T.h(L.x); if(L.y-.5<h&&h>-1e3){ L.y=h+.5; L.vy*=-.3; L.vx*=.7; L.w*=.6; } });
  // marks passed
  const v=S.best[lv.goal]; setLive(lv.goal==='speed'?Math.hypot(S.vx,S.vy)*3.6:v);
  const m=medalFor(lv,v); if(m>GS.got){ GS.got=m; callout(MNAME[m]+'!',fmt(lv.goal,lv.marks[m-1])); star(S.x,S.y); blip(660+m*110,.2,'triangle',.14); buzz(15); $('hsub').textContent=m<3?'Next '+lv.marks[m]+' '+GOALS[lv.goal].unit:'Gold!'; }
  const sp=Math.hypot(S.vx,S.vy); loops(S.burning&&!S.done, (S.driving&&S.wheelsDown>0||S.propping)&&!S.done, sp);
  // camera
  const lead=clamp(S.vx*.25,-6,10), leadY=clamp(S.vy*.2,-6,8);
  GS.cam.x+=(S.x+lead-GS.cam.x)*Math.min(1,dt*4); GS.cam.y+=(S.y+leadY-GS.cam.y)*Math.min(1,dt*4);
  const zt=baseZ()/Math.min(2.2,1+sp/45); GS.cam.z+=(zt-GS.cam.z)*Math.min(1,dt*1.5);
  GS.shake*=Math.pow(.02,dt);
  if(S.done){ GS.endT+=dt; loops(false,false,0); $('skip').hidden=true; if(GS.endT>1.1) finish(); }
}
