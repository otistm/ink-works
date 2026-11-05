/* Ink Works: how the parts work together, and the little effects that make building feel physical.
   No cables or plates: parts snap together with a click, and a powered machine shows it by ticking over.
   (The rules are still the real game's: any battery runs every motor, and motors drive every wheel on the ground.) */
"use strict";
const cellXY=key=>{ const [gx,gy]=key.split(',').map(Number); return [gx-3,-(gy-3)]; };
// which motors have power and which wheels they drive, through joined parts
function linksOf(d){
  const att=attached(d), keys=[...att], kind=k=>d[k].k, n=k=>keys.filter(x=>kind(x)===k).length;
  const powered=new Set(n('battery')?keys.filter(k=>kind(k)==='motor'):[]);
  const driven=new Set(powered.size?keys.filter(k=>kind(k)==='wheel'):[]);
  return {powered,driven,n:{battery:n('battery'),motor:n('motor'),wheel:n('wheel')},att};
}
// the parts a cell touches (side by side), and which of them are joined to Pip
function touching(d,gx,gy){ return [[1,0],[-1,0],[0,1],[0,-1]].map(([a,b])=>[gx+a,gy+b,a,b]).filter(([x,y])=>d[x+','+y]); }
// a plain-words summary for the bench
function powerLine(L){ const {battery:b,motor:m,wheel:w}=L.n;
  if(!m&&!b) return w?'Wheels roll, but nothing turns them yet. Add a motor and a battery.':'';
  if(m&&!b) return 'The motor needs a battery to run.';
  if(b&&!m) return 'The battery is ready. Add a motor for it to run.';
  if(!w) return 'Motor powered. Add wheels for it to drive.';
  return `${b>1?b+' batteries power':'The battery powers'} ${m>1?m+' motors':'the motor'}, driving ${w} wheel${w>1?'s':''}.`; }

// a plain-words summary for a rocket build: how many push which way, and how long they'll burn
function rocketLine(d){ const att=attached(d), cs=[...att].map(k=>d[k]), r=cs.filter(c=>isRocket(c.k)), tanks=cs.filter(c=>TANKS[c.k]);
  if(!r.length) return tanks.length?'Fuel tanks need a rocket to burn them.':'';
  const fuel=tanks.reduce((s,c)=>s+TANKS[c.k],0)+r.reduce((s,c)=>s+ROCKETS[c.k].burn,0), use=r.reduce((s,c)=>s+ROCKETS[c.k].use,0), burn=Math.round(fuel/use*10)/10;
  const up=r.filter(c=>c.d===1).length, fins=cs.filter(c=>c.k==='fin').length;
  const dirs=up===r.length?(r.length>1?'all pointing up':'pointing up'):up?`${up} pointing up, ${r.length-up} not`:(r.length>1?'none pointing up':'not pointing up');
  return `${r.length} rocket${r.length>1?'s':''}, ${dirs}: about ${burn} s of push.${fins?' Fins keep it straight.':''}`; }
/* ---------- effects (shared shapes and inks, so nothing piles up) ---------- */
const FX=[]; const lineG=new THREE.BoxBufferGeometry(1,.05,.05), sparkG=new THREE.OctahedronBufferGeometry(.08,0);
let FXI=null, FXP=null; const fxInk=()=>FXI||(FXI=INKM()), fxPaper=()=>FXP||(FXP=inkMat(3));
const fxPool=[];
function fxMesh(g,m){ let o=fxPool.find(o=>!o.parent&&o.geometry===g&&o.material===m); if(!o) o=new THREE.Mesh(g,m); o.rotation.set(0,0,0); o.scale.set(1,1,1); o.visible=true; scene.add(o); if(!fxPool.includes(o)) fxPool.push(o); return o; }
function addFX(m,life,upd){ FX.push({m,t:0,life,upd}); }
// short lines bursting out from a point: the "click" of a snap
function impact(x,y,z,n,len,dirx,diry){ n=n||7; len=len||.35;
  for(let i=0;i<n;i++){ let a=i/n*TAU+Math.random()*.3; if(dirx!=null){ a=Math.atan2(diry,dirx)+(i/(n-1)-.5)*2.2; }
    const m=fxMesh(lineG,fxInk()); addFX(m,.3,u=>{ const r=.12+u*.5; m.position.set(x+Math.cos(a)*r,y+Math.sin(a)*r,z); m.rotation.z=a; m.scale.set(len*(1-u)+.02,1,1); }); } }
// a bold ink seam along the edge where two parts meet; it flashes and is gone
function seam(x,y,z,vertical){ const m=fxMesh(lineG,fxInk());
  addFX(m,.35,u=>{ m.position.set(x,y,z); m.rotation.z=vertical?Math.PI/2:0; const k=u<.25?u/.25:1-(u-.25)/.75; m.scale.set(.95*Math.min(1,u*5),2.2*k,1); }); }
function sparkle(x,y,z){ for(let i=0;i<5;i++){ const m=fxMesh(sparkG,fxInk());
  const vx=(Math.random()-.5)*3, vy=1+Math.random()*2.5; let px=x,py=y;
  addFX(m,.4+Math.random()*.2,(u,dt)=>{ px+=vx*dt; py+=(vy-6*u)*dt; m.position.set(px,py,z); m.scale.setScalar(1-u); m.rotation.z+=dt*9; }); } }
function speedLine(x,y,z,ang){ const m=fxMesh(lineG,fxInk()), L=1.2+Math.random()*2.2, a=ang||0, cx=Math.cos(a), cy=Math.sin(a);
  addFX(m,.35,u=>{ const b=L/2+u*.6; m.position.set(x-cx*b,y-cy*b,z); m.rotation.z=a; m.scale.set(L*(1-u),.7,.7); }); }
// rockets on the run: flames flicker while they burn, smoke pours out behind, tanks drain, and the machine shudders
function rocketFX(S,R,dt){
  const cap=S.tankCap, tank=cap?clamp(Math.min(S.fuel,cap)/cap,0,1):0, ca=Math.cos(R.a), sa=Math.sin(R.a);
  GS.mparts.forEach(g=>{ const u=g.userData;
    if(u.gauge) u.gauge.scale.y=Math.max(.001,tank);
    if(!u.flame) return; const on=S.burning&&!S.done; u.flame.visible=on; if(!on) return;
    const fl=(RM?1:.8+Math.random()*.4)*(u.flameSize||1), wd=u.flameSize||1; u.flame.scale.set(wd*(1+(Math.random()-.5)*.18),fl,wd*(1+(Math.random()-.5)*.18));
    if(u.tongues&&!RM) u.tongues.forEach(t=>t.scale.y=.6+Math.random()*.9);
    const p=u.p, dx=DIRS[p.d][0], dy=DIRS[p.d][1], ex=p.rx-dx*.75, ey=p.ry-dy*.75;
    if(Math.random()<dt*28){ const wx=R.x+ex*ca-ey*sa, wy=R.y+ex*sa+ey*ca, bx=-(dx*ca-dy*sa), by=-(dx*sa+dy*ca);
      puff(wx,wy,(Math.random()-.5)*.6,S.vx*.25+bx*7+(Math.random()-.5)*2,S.vy*.25+by*7+(Math.random()-.5)*2,.28+Math.random()*.2,.8); } });
  if(S.burning&&!RM&&GS.squashG) GS.squashG.position.set((Math.random()-.5)*.03,(Math.random()-.5)*.03,0); else if(GS.squashG) GS.squashG.position.set(0,0,0);
  if(GS.wasBurning&&!S.burning&&S.n.rockets){ const r=GS.mparts.find(g=>g.userData.flame); if(r){ const w=r.localToWorld(new THREE.Vector3(0,0,.6)); word('Out of fuel',w,'small'); } blip(300,.4,'sawtooth',.05,60); }
  GS.wasBurning=S.burning; }
function stepFX(dt){ for(let i=FX.length-1;i>=0;i--){ const f=FX[i]; f.t+=dt; const u=f.t/f.life; if(u>=1){ scene.remove(f.m); FX.splice(i,1); continue; } f.upd(u,dt); } }
// words that float up from a spot in the world ("Powered!", "Flat!")
const WORDS=[];
function word(text,pos,cls){ const el=document.createElement('div'); el.className='word '+(cls||''); el.textContent=text; document.body.appendChild(el);
  WORDS.push({el,pos:pos.clone(),t:0}); stepWords(0); }
function stepWords(dt){ for(let i=WORDS.length-1;i>=0;i--){ const w=WORDS[i]; w.t+=dt; if(w.t>1.3){ w.el.remove(); WORDS.splice(i,1); continue; }
  const p=w.pos.clone().project(cam); w.el.style.transform=`translate(${(p.x+1)/2*INKR.W}px,${(1-p.y)/2*INKR.H-w.t*30}px) translate(-50%,-100%)`; } }
