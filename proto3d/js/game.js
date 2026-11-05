/* Ink Works 3D prototype: First roll. Pick parts from the table, build on the board, launch, watch it run, see the result.
   The rules and the physics are the real game's (../play/js/engine.js); only the drawing is new. */
"use strict";
const LV=LEVELS[0];
const SKEY3='inkworks-3d-proto'; // its own save, so the real game's progress is never touched
const MNAME=['Not yet','Bronze','Silver','Gold'];
const TOOLS=[...LV.parts,'erase'];
const GS={mode:'load', design:null, tool:'frame', S:null, bparts:{}, machine:null, squashG:null, pre:0, acc:0, got:0, endT:0, loose:[], t:0,
  lastV:[0,0], blinkAt:2, benchSpin:0, benchRate:0, hover:null, hoverItem:null, flat:false, sq:0, sqv:0, look:[0,0], antV:0, ant:0, shadow:null,
  gearSpin:0, pipBench:null, tap:null, skipT:0, R:null, spS:0, powered:false};
const cam=new THREE.PerspectiveCamera(34,1,.5,600);
const camPos=new THREE.Vector3(0,5,30), camLook=new THREE.Vector3(0,BENCH_Y,0);
const benchParts=new THREE.Group(); scene.add(benchParts);
const benchPivot=new THREE.Group(); scene.add(benchPivot);

function fmt(g,v){ if(v==null) return '—'; return Math.round(v)+' '+GOALS[g].unit; }
function loadDesign(){ try{ const d=JSON.parse(localStorage.getItem(SKEY3)||'null'); if(d&&d['3,3']) return d; }catch(e){} return newDesign(LV); }
function saveDesign(){ try{ localStorage.setItem(SKEY3,JSON.stringify(GS.design)); }catch(e){} }
let hintT=0; function showHint(t){ const h=$('hint'); if(!t){ h.hidden=true; return; } $('hintT').textContent=t; h.hidden=false; clearTimeout(hintT); hintT=setTimeout(()=>h.hidden=true,6500); }
function callout(big,small){ const c=$('callout'); c.innerHTML=`<b>${big}</b>`+(small?`<span>${small}</span>`:''); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); }
function medalSVG(m,size){ const s=size||34, id='h'+Math.random().toString(36).slice(2,7);
  const star='M17 7.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z'; let inner='';
  if(m===3) inner=`<circle cx="17" cy="17" r="14" fill="#000" stroke="#000" stroke-width="2.5"/><path d="${star}" fill="#fff"/>`;
  else if(m===2) inner=`<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="4" fill="#000"/></pattern></defs><circle cx="17" cy="17" r="14" fill="#fff" stroke="#000" stroke-width="2.5"/><circle cx="17" cy="17" r="10" fill="url(#${id})"/>`;
  else if(m===1) inner=`<circle cx="17" cy="17" r="14" fill="#fff" stroke="#000" stroke-width="2.5"/><circle cx="17" cy="17" r="9" fill="none" stroke="#000" stroke-width="2"/>`;
  else inner=`<circle cx="17" cy="17" r="13" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="3 3.4" opacity=".45"/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 34 34" aria-hidden="true">${inner}</svg>`; }
const ease=u=>u<0?0:u>1?1:u*u*(3-2*u);

/* ---------- the parts table ---------- */
const ITEMS={}; // tool -> {g (lifts and turns), model, stand, ring, label}
function makeRemoveTool(){ // a little paper bin with an ink cross: drop parts in it to take them off
  const g=new THREE.Group(), P=PAPER(), I=INKM();
  [[0,-.32,0,.7,.06,.7],[0,0,.34,.7,.64,.06],[0,0,-.34,.7,.64,.06],[.34,0,0,.06,.64,.7],[-.34,0,0,.06,.64,.7]].forEach(([x,y,z,w,h,d])=>g.add(at(box(w,h,d,P),x,y,z)));
  [1,-1].forEach(s=>{ const b=at(box(.46,.07,.03,I),0,0,.38); b.rotation.z=s*Math.PI/4; g.add(b); });
  g.add(at(box(.78,.05,.78,P),0,.34,0)); // rim
  return g; }
function buildItems(){
  buildTable(TOOLS.length);
  TOOLS.forEach((k,i)=>{ const x=TABLE.x0+i*TABLE.gap, z=TABLE.z;
    const stand=at(new THREE.Mesh(new THREE.CylinderBufferGeometry(.62,.66,.08,40),PAPER()),x,TABLE.y+.04,z); table.add(stand);
    const ring=at(new THREE.Mesh(new THREE.TorusBufferGeometry(.7,.045,8,48),INKM()),x,TABLE.y+.09,z); ring.rotation.x=Math.PI/2; ring.visible=false; table.add(ring);
    const g=new THREE.Group(); at(g,x,TABLE.y+.62,z); table.add(g);
    const model=k==='erase'?makeRemoveTool():makePart(k); if(k==='wheel') model.scale.setScalar(.82); g.add(model);
    model.rotation.y=-.35;
    const label=document.createElement('button'); label.type='button'; label.className='tlabel'; label.dataset.k=k;
    label.innerHTML=`<kbd>${i+1}</kbd><b>${k==='erase'?'Remove':PARTS[k].name}</b>${k==='erase'?'':`<small>${PARTS[k].cost}</small>`}`;
    label.onclick=()=>pickTool(k); document.body.appendChild(label);
    ITEMS[k]={g,model,stand,ring,label,hop:-9,lift:0,spin:-.35}; });
}
// the budget meter: one block for each part on the board, sized by what it cost, and a dashed space for what's left.
// Hovering a part on the table (or holding one) shows, striped, what it would take.
function drawBudget(){
  const d=GS.design||{}, spent=designCost(d), left=LV.budget-spent, B=LV.budget, bar=$('bbar');
  // blocks are kept between updates: only a part that was just placed grows in, and a removed one simply goes
  const keys=Object.keys(d).filter(k=>PARTS[d[k].k].cost>0), order=[...LV.parts];
  keys.sort((a,b)=>order.indexOf(d[a].k)-order.indexOf(d[b].k)||a.localeCompare(b));
  const have={}; [...bar.querySelectorAll('i.seg')].forEach(el=>{ if(!keys.includes(el.dataset.key)||el.dataset.k!==d[el.dataset.key].k) el.remove(); else have[el.dataset.key]=el; });
  let peekEl=bar.querySelector('i.peek'); if(!peekEl){ peekEl=document.createElement('i'); peekEl.className='peek'; bar.appendChild(peekEl); }
  keys.forEach((k,i)=>{ let el=have[k]; if(!el){ el=document.createElement('i'); el.className='seg'+(GS.mode==='build'?' new':''); el.dataset.key=k; el.dataset.k=d[k].k;
      el.addEventListener('animationend',()=>el.classList.remove('new'),{once:true}); }
    el.style.width=PARTS[d[k].k].cost/B*100+'%'; el.title=PARTS[d[k].k].name+' '+PARTS[d[k].k].cost;
    if(bar.children[i]!==el) bar.insertBefore(el,bar.children[i]||peekEl); }); // only move a block if it's out of place
  $('left').textContent=left; $('budgetbox').classList.toggle('empty',left<=0);
  showPeek();
}
// the striped preview of what a part would cost. It waits a moment before hiding, so it doesn't blink as the pointer crosses a gap.
let peekHide=0;
function showPeek(){
  const d=GS.design||{}, left=LV.budget-designCost(d), B=LV.budget, peekEl=$('bbar').querySelector('i.peek'), note=$('bspent');
  const peek=GS.mode==='build'?(GS.hoverItem||(GS.hover&&!d[GS.hover.join(',')]?GS.tool:null)):null, pc=peek&&peek!=='erase'?PARTS[peek].cost:0;
  clearTimeout(peekHide);
  if(pc){ const fits=pc<=left; peekEl.style.width=(fits?pc:Math.max(0,left))/B*100+'%'; peekEl.classList.add('on'); $('budgetbox').classList.toggle('over',!fits);
    note.textContent=fits?`${PARTS[peek].name}: ${pc}. You’d have ${left-pc} left.`:`${PARTS[peek].name}: ${pc}. You only have ${left}.`; }
  else peekHide=setTimeout(()=>{ peekEl.classList.remove('on'); peekEl.style.width='0%'; $('budgetbox').classList.remove('over'); note.textContent=`${designCost(d)} of ${B} spent`; },120);
}
function pickTool(k){ if(GS.mode!=='build') return; audioInit(); if(GS.tool!==k){ GS.tool=k; ITEMS[k].hop=GS.t; blip(520,.07,'triangle',.1,780); } refreshBuild(); }
function itemAt(e){ if(e.clientX==null) return null; const ray=pointerRay(e), hits=ray.intersectObjects(Object.values(ITEMS).flatMap(it=>[it.g,it.stand]),true);
  if(!hits.length) return null; for(const k in ITEMS){ let o=hits[0].object; while(o){ if(o===ITEMS[k].g||o===ITEMS[k].stand) return k; o=o.parent; } } return null; }
function animateItems(dt){
  const remain=LV.budget-designCost(GS.design||{});
  for(const k in ITEMS){ const it=ITEMS[k], on=GS.tool===k, hov=GS.hoverItem===k;
    const want=on?.42:hov?.18:0; it.lift+=(want-it.lift)*Math.min(1,dt*10);
    it.spin+=RM?0:(on?.9:hov?.4:0)*dt; if(!on&&!hov) it.spin+=(-.35-((it.spin+Math.PI)%TAU-Math.PI))*Math.min(1,dt*3);
    const h=GS.t-it.hop, hop=RM||h>.5?0:Math.sin(h/.5*Math.PI)*.35, sq=RM||h>.5?0:Math.sin(h/.5*TAU)*.12;
    it.g.position.y=TABLE.y+.62+it.lift+hop+(on&&!RM?Math.sin(GS.t*2.2)*.05:0); it.model.rotation.y=it.spin; it.g.scale.set(1+sq,1-sq,1+sq);
    it.ring.visible=on;
    const short=k!=='erase'&&PARTS[k].cost>remain; it.label.classList.toggle('on',on); it.label.classList.toggle('short',short);
    // labels sit on the table's front edge, under each part
    const p=new THREE.Vector3(it.g.position.x,TABLE.y-.2,TABLE.z+1.05).project(cam);
    it.label.style.transform=`translate(${(p.x+1)/2*INKR.W}px,${(1-p.y)/2*INKR.H}px) translate(-50%,0)`; }
}

/* ---------- the board ---------- */
const cellPos=(gx,gy)=>new THREE.Vector3(gx-3,BENCH_Y-(gy-3),0);
function refreshBuild(){
  const d=GS.design, att=attached(d);
  for(const key in GS.bparts){ const b=GS.bparts[key]; if(!d[key]||d[key].k!==b.userData.k){ benchParts.remove(b); delete GS.bparts[key]; } }
  for(const key in d){ if(GS.bparts[key]) continue; const [gx,gy]=key.split(',').map(Number), p=makePart(d[key].k);
    p.position.copy(cellPos(gx,gy)); p.userData.key=key; p.userData.home=p.position.clone(); benchParts.add(p); GS.bparts[key]=p; if(d[key].k==='core') GS.pipBench=p; }
  for(const key in GS.bparts) setFade(GS.bparts[key],!att.has(key));
  const cost=designCost(d), loose=Object.keys(d).length-att.size;
  $('cost').textContent=cost; $('budget').textContent='of '+LV.budget; drawBudget();
  $('warn').textContent=loose?(loose===1?'1 part isn’t joined to Pip. It will fall off.':loose+' parts aren’t joined to Pip. They will fall off.'):'';
  let m=0,cx=0,cy=0; att.forEach(key=>{ const [gx,gy]=key.split(',').map(Number), w=PARTS[d[key].k].mass; m+=w; cx+=(gx-3)*w; cy+=-(gy-3)*w; });
  GS.com=[cx/m,cy/m];
  const L=linksOf(d); GS.L=L; $('power').textContent=powerLine(L);
  // the first time a motor gets power, it says so and spins up
  const pw=L.powered.size>0&&L.driven.size>0;
  if(pw&&!GS.powered&&GS.mode==='build'){ const k=[...L.powered][0], [x,y]=cellXY(k);
    setTimeout(()=>{ if(GS.mode!=='build') return; word('Powered!',new THREE.Vector3(x,y+BENCH_Y+.7,.6)); sparkle(x,y+BENCH_Y+.4,.7); GS.benchRate=8; blip(420,.3,'sawtooth',.05,1300); },300); }
  GS.powered=pw;
  const P=PARTS[GS.tool]; $('info').innerHTML=GS.tool==='erase'?'<b>Remove</b>Click a part to take it off. You get its cost back.':`<b>${P.name}</b>${P.desc}`;
}
function pointerRay(e){ const r=$('c').getBoundingClientRect(), v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1, -((e.clientY-r.top)/r.height)*2+1);
  const ray=new THREE.Raycaster(); ray.setFromCamera(v,cam); return ray; }
function cellAt(e){ if(e.clientX==null) return null; const hit=new THREE.Vector3();
  if(!pointerRay(e).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),hit)) return null;
  const gx=Math.round(hit.x)+3, gy=3-Math.round(hit.y-BENCH_Y); return gx<0||gy<0||gx>=GW||gy>=GH?null:[gx,gy]; }

// the drop-in and the snap: a placed part falls into its cell, lands with a squash, and clicks onto whatever it touches
function placeFX(key){
  const p=GS.bparts[key]; if(!p) return; const [gx,gy]=key.split(',').map(Number), att=attached(GS.design), joined=att.has(key);
  p.userData.drop=GS.t; if(RM) p.userData.drop=-9;
  const nbs=touching(GS.design,gx,gy);
  setTimeout(()=>{ if(GS.mode!=='build'||!GS.bparts[key]) return;
    if(joined&&nbs.length){ blip(1500,.035,'square',.07,1100); setTimeout(()=>blip(240,.08,'sine',.12,120),20);
      nbs.forEach(([x,y,a,b])=>{ const c=cellPos(gx,gy), ex=c.x+a*.5, ey=c.y-b*.5; seam(ex,ey,.6,a!==0); impact(ex,ey,.62,5,.3,a,-b);
        const n=GS.bparts[x+','+y]; if(n){ n.userData.nudge={dx:a*.09,dy:-b*.09,t:GS.t}; if(n.userData.k==='core'){ GS.antV+=7; } } });
      buzz(12); }
    else { blip(160,.12,'sine',.12,90); word('Not joined',cellPos(gx,gy).add(new THREE.Vector3(0,.7,.6)),'small'); } }, RM?0:150);
}
// pointer over the board shows a faded copy of the part, with small marks on the sides that would snap together
const hoverBox=new THREE.Group(); scene.add(hoverBox); hoverBox.visible=false;
[[0,.5,1.02,.05],[0,-.5,1.02,.05],[.5,0,.05,1.02],[-.5,0,.05,1.02]].forEach(([x,y,w,h])=>hoverBox.add(at(new THREE.Mesh(new THREE.BoxBufferGeometry(w,h,.03),INKM()),x,y,0)));
const snapMarks=[0,1,2,3].map(()=>{ const m=new THREE.Mesh(new THREE.BoxBufferGeometry(.5,.09,.05),INKM()); m.visible=false; scene.add(m); return m; });
const GHOSTS={};
function hoverAll(e){
  const touch=e.pointerType==='touch';
  const dragging=DRAG&&DRAG.active;
  const item=GS.mode==='build'&&!touch&&!dragging?itemAt(e):null; if(item!==GS.hoverItem){ GS.hoverItem=item; showPeek(); }
  const c=GS.mode==='build'&&(!touch||dragging)&&!item?cellAt(e):null; const was=GS.hover&&GS.hover.join(); GS.hover=c; if((c&&c.join())!==was) showPeek();
  Object.values(GHOSTS).forEach(g=>g.visible=false); hoverBox.visible=!!c; snapMarks.forEach(m=>m.visible=false);
  const grabbable=c&&GS.design[c.join(',')]&&!PARTS[GS.design[c.join(',')].k].fixed&&GS.tool!=='erase';
  $('c').style.cursor=dragging?'grabbing':item&&item!=='erase'||grabbable?'grab':c||item?'pointer':'';
  if(!c) return; const p=cellPos(...c), key=c.join(','), cur=GS.design[key];
  hoverBox.position.set(p.x,p.y,-.7);
  if(GS.tool!=='erase'&&!cur){ if(!dragging){ const g=GHOSTS[GS.tool]||(GHOSTS[GS.tool]=(()=>{ const g=makePart(GS.tool); setFade(g,true); scene.add(g); return g; })()); g.visible=true; g.position.copy(p); }
    const att=attached(GS.design); touching(GS.design,...c).filter(([x,y])=>att.has(x+','+y)).forEach(([x,y,a,b],i)=>{ const m=snapMarks[i]; m.visible=true;
      m.position.set(p.x+a*.5,p.y-b*.5,.62); m.rotation.z=a?Math.PI/2:0; }); }
}
function tapAny(e){
  if(GS.mode!=='build') return; audioInit();
  const item=itemAt(e); if(item){ pickTool(item); return; }
  const c=cellAt(e); if(!c) return; const [gx,gy]=c;
  const kk=gx+','+gy, cur=GS.design[kk], tool=GS.tool;
  GS.tap={x:gx-3,y:-(gy-3),t:GS.t};
  if(cur&&PARTS[cur.k].fixed){ GS.bparts[kk].userData.drop=GS.t-.15; GS.antV+=6; blip(300,.1,'sine',.1,420); showHint(tool==='erase'?'Pip stays. Pip is the passenger.':'That’s Pip, your passenger. Build around Pip.'); return; }
  if(tool==='erase'){ if(!cur) return; const p=cellPos(gx,gy); delete GS.design[kk]; for(let i=0;i<6;i++) puff(p.x+(Math.random()-.5)*.6,p.y+(Math.random()-.5)*.6,.8,(Math.random()-.5)*2,(Math.random()-.5)*2,.25,.45);
    blip(240,.12,'triangle',.12,140); buzz(8); ITEMS.erase.hop=GS.t; refreshBuild(); saveDesign(); hoverAll(e); return; }
  if(cur&&cur.k===tool){ GS.bparts[kk].userData.drop=GS.t-.15; return; }
  const cost=designCost(GS.design)-(cur?PARTS[cur.k].cost:0)+PARTS[tool].cost;
  if(cost>LV.budget){ blip(150,.18,'square',.07); const cb=$('budgetbox'); cb.classList.remove('nope'); void cb.offsetWidth; cb.classList.add('nope'); showHint('Over budget. Remove a part to free some up.'); return; }
  GS.design[kk]={k:tool,d:defaultDir(LV,tool)}; blip(700,.05,'triangle',.08,500);
  refreshBuild(); placeFX(kk); saveDesign(); hoverAll(e);
}

/* ---------- drag and drop ----------
   Press on a part on the table (or a part on the board) and move: it lifts into your hand and follows the pointer,
   leaning as it swings. Over the board it hovers in front of the square it will land on, with snap marks showing.
   Let go over a square and it drops in and snaps. Let go anywhere else and a table part flies back to its stand;
   a part taken off the board is removed (and its cost comes back). A press without a move is still a click. */
let DRAG=null; const RETURNS=[];
function onDown(e){
  if(GS.mode!=='build') return; audioInit();
  const item=itemAt(e), c=item?null:cellAt(e), key=c&&c.join(','), cur=key&&GS.design[key];
  const from=item&&item!=='erase'?'table':cur&&!PARTS[cur.k].fixed&&GS.tool!=='erase'?key:null;
  if(from){ DRAG={k:from==='table'?item:cur.k, d:cur?cur.d:null, from, x0:e.clientX, y0:e.clientY, e, active:false, id:e.pointerId};
    try{ $('c').setPointerCapture(e.pointerId); }catch(_){} return; }
  tapAny(e);
}
function onMove(e){
  if(DRAG&&!DRAG.active&&Math.hypot(e.clientX-DRAG.x0,e.clientY-DRAG.y0)>6) startDrag(e);
  if(DRAG&&DRAG.active) dragTo(e);
  hoverAll(e);
}
function onUp(e){ if(!DRAG) return; const D=DRAG; DRAG=null; try{ $('c').releasePointerCapture(D.id); }catch(_){}
  if(!D.active){ tapAny(D.e); return; } dropDrag(D,e); hoverAll(e); }
function startDrag(e){
  const D=DRAG; D.active=true; GS.tool=D.k;
  const held=makePart(D.k); scene.add(held); D.obj=held; D.vx=0;
  if(D.from==='table'){ const it=ITEMS[D.k]; held.position.copy(it.g.position); held.rotation.y=it.spin; it.model.visible=false; }
  else { held.position.copy(GS.bparts[D.from].position); delete GS.design[D.from]; }
  D.pos=held.position.clone(); D.want=held.position.clone();
  blip(620,.06,'triangle',.09,900); buzz(6); refreshBuild();
}
function dragTo(e){
  const D=DRAG, c=cellAt(e), hit=new THREE.Vector3();
  if(c) D.want.copy(cellPos(...c)).add(new THREE.Vector3(0,.12,1.1));         // hovers just in front of its square
  else if(pointerRay(e).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-1.4),hit)) D.want.copy(hit); // free in the air
  if(c&&(!D.cell||D.cell.join()!==c.join())) blip(900+Math.random()*80,.02,'square',.025); // a tick as it passes over each square
  D.cell=c;
}
function dropDrag(D,e){
  const c=cellAt(e), key=c&&c.join(','), cur=key&&GS.design[key];
  const ok=c&&!(cur&&PARTS[cur.k].fixed), cost=ok?designCost(GS.design)-(cur?PARTS[cur.k].cost:0)+PARTS[D.k].cost:0;
  if(ok&&cost<=LV.budget){
    scene.remove(D.obj); if(D.from==='table') ITEMS[D.k].model.visible=true;
    GS.design[key]={k:D.k,d:D.d!=null?D.d:defaultDir(LV,D.k)}; GS.tap={x:c[0]-3,y:-(c[1]-3),t:GS.t};
    blip(700,.05,'triangle',.08,500); refreshBuild(); placeFX(key); GS.bparts[key].userData.drop=GS.t-.06; saveDesign(); return; }
  if(ok){ blip(150,.18,'square',.07); const cb=$('budgetbox'); cb.classList.remove('nope'); void cb.offsetWidth; cb.classList.add('nope'); showHint('Over budget. Remove a part to free some up.'); }
  else if(cur&&PARTS[cur.k].fixed) showHint('That’s Pip’s seat. Build around Pip.');
  if(D.from==='table') flyBack(D.obj,ITEMS[D.k].g.position.clone(),()=>{ ITEMS[D.k].model.visible=true; ITEMS[D.k].hop=GS.t; });
  else if(ok||(cur&&PARTS[cur.k].fixed)){ // couldn't go there: back to where it was
    const home=cellPos(...D.from.split(',').map(Number)); flyBack(D.obj,home,()=>{ GS.design[D.from]={k:D.k,d:D.d}; refreshBuild(); saveDesign(); }); }
  else { // dropped off the board: it's removed, and the cost comes back
    const p=D.obj.position; for(let i=0;i<7;i++) puff(p.x+(Math.random()-.5)*.6,p.y+(Math.random()-.5)*.6,p.z,(Math.random()-.5)*2.5,(Math.random()-.5)*2.5,.28,.45);
    word('Removed',p.clone().add(new THREE.Vector3(0,.7,0)),'small'); scene.remove(D.obj); blip(240,.12,'triangle',.12,140); buzz(8); ITEMS.erase.hop=GS.t; saveDesign(); refreshBuild(); }
}
// a part that wasn't placed swoops back in an arc, then lands
function flyBack(obj,to,done){ blip(380,.15,'sine',.06,700); RETURNS.push({obj,from:obj.position.clone(),to,t:0,done}); }
function cancelDrag(){ if(!DRAG) return; const D=DRAG; DRAG=null; if(!D.active) return;
  if(D.from==='table') flyBack(D.obj,ITEMS[D.k].g.position.clone(),()=>{ ITEMS[D.k].model.visible=true; });
  else flyBack(D.obj,cellPos(...D.from.split(',').map(Number)),()=>{ GS.design[D.from]={k:D.k,d:D.d}; refreshBuild(); saveDesign(); }); }
function animateDrag(dt){
  const D=DRAG;
  if(D&&D.active){ const o=D.obj, k=RM?1:1-Math.pow(.00002,dt), px=o.position.x;
    o.position.lerp(D.want,k); D.vx+=((o.position.x-px)/Math.max(dt,1e-3)-D.vx)*Math.min(1,dt*12);
    // it leans into the swing and bobs a little, like something held up by its top
    o.rotation.z=RM?0:clamp(-D.vx*.035,-.5,.5); o.rotation.y+=(0-o.rotation.y)*Math.min(1,dt*8);
    const s=1.12+(RM?0:Math.sin(GS.t*9)*.02); o.scale.set(s,s,s); }
  for(let i=RETURNS.length-1;i>=0;i--){ const R=RETURNS[i]; R.t+=dt/.38; const u=Math.min(1,R.t), e=1-Math.pow(1-u,3);
    R.obj.position.lerpVectors(R.from,R.to,e); R.obj.position.y+=Math.sin(u*Math.PI)*.9; R.obj.rotation.z*=.85; R.obj.scale.setScalar(1.12-.12*e);
    if(u>=1){ scene.remove(R.obj); RETURNS.splice(i,1); R.done(); } }
}

// frame the board and the parts table in whatever space the header and the buttons leave
function fitBuildCam(){
  const H=INKR.H, W=INKR.W, top=Math.max($('top').getBoundingClientRect().bottom,$('trail').getBoundingClientRect().bottom)+6, bot=$('dock').hidden?H-10:$('dock').getBoundingClientRect().top-44;
  const pts=[[-4,BENCH_Y+3.95,-1],[4.2,BENCH_Y+3.95,-1],[-TABLE.gap*TOOLS.length/2-.3,TABLE.y-.4,TABLE.z+1],[TABLE.gap*TOOLS.length/2+.3,TABLE.y-.4,TABLE.z+1]].map(a=>new THREE.Vector3(...a));
  const C=cam.clone(); let look=new THREE.Vector3(0,(BENCH_Y+TABLE.y)/2+1,0), dist=26;
  const ty0=1-2*top/H, ty1=1-2*bot/H, tx=.94; // the usable box, in screen units (-1..1)
  for(let i=0;i<4;i++){ C.position.set(look.x+.6,look.y+2.2,dist); C.lookAt(look); C.updateMatrixWorld(); C.updateProjectionMatrix();
    let x0=9,x1=-9,y0=9,y1=-9; pts.forEach(p=>{ const q=p.clone().project(C); x0=Math.min(x0,q.x); x1=Math.max(x1,q.x); y0=Math.min(y0,q.y); y1=Math.max(y1,q.y); });
    const s=Math.max((x1-x0)/(2*tx),(y1-y0)/(ty0-ty1)); dist*=s;
    const vh=Math.tan(cam.fov*Math.PI/360)*dist; look.y+=((y0+y1)/2-(ty0+ty1)/2)*vh*.9; look.x+=((x0+x1)/2)*vh*cam.aspect*.9; }
  return {pos:new THREE.Vector3(look.x+.6,look.y+2.2,dist), look};
}

/* ---------- launching ---------- */
function launch(){
  if(GS.mode!=='build') return; audioInit(); if(DRAG) cancelDrag(); RETURNS.forEach(R=>{ R.t=1; }); animateDrag(0);
  const S=makeSim(GS.design,LV); GS.S=S; GS.mode='run'; GS.pre=RM?.2:1.15; GS.acc=0; GS.got=0; GS.endT=0; GS.lastV=[0,0]; GS.spS=0;
  GS.R={x:S.x,y:S.y,a:S.a,spin:0}; GS.prev=GS.R;
  saveDesign();
  if(GS.machine) scene.remove(GS.machine);
  const M=new THREE.Group(), Q=new THREE.Group(); M.add(Q); scene.add(M); GS.machine=M; GS.squashG=Q; GS.mparts=[];
  S.P.forEach(p=>{ const g=makePart(p.k); g.position.set(p.rx,p.ry,0); g.userData.p=p; Q.add(g); GS.mparts.push(g); });
  const core=S.P.find(p=>p.k==='core'); GS.from=new THREE.Vector3(core.bx-core.rx, BENCH_Y+core.by-core.ry, 0);
  M.position.copy(GS.from); GS.flat=false;
  GS.loose.forEach(L=>scene.remove(L.o)); GS.loose=S.loose.map(p=>{ const o=makePart(p.k); scene.add(o);
    return {o,x:p.bx,y:BENCH_Y+p.by,vx:(Math.random()-.5)*2,vy:2+Math.random()*2,a:0,w:(Math.random()-.5)*6}; });
  benchParts.visible=false; hoverBox.visible=false; snapMarks.forEach(m=>m.visible=false); Object.values(GHOSTS).forEach(g=>g.visible=false);
  Object.values(ITEMS).forEach(it=>it.label.hidden=true);
  if(!GS.shadow) GS.shadow=makeShadow();
  $('dock').hidden=true; $('warn').textContent=''; showHint('');
  $('hsub').textContent='Target '+fmt(LV.goal,LV.marks[0]); $('costbox').hidden=true; $('live').hidden=false; $('budget').textContent=''; setLive(0);
  blip(180,.5,'sawtooth',.06,90);
  GS.skipT=setTimeout(()=>{ if(GS.mode==='run') $('skip').hidden=false; },2500);
}
function setLive(v){ $('livev').textContent=Math.round(v); $('liveu').textContent='m'; trail(v); }
const TRAIL_END=260;
function trailInit(){ const t=$('trail'); t.innerHTML='<div class="tl"></div><div class="tf" id="tf"></div>'+LV.marks.map((m,i)=>`<div class="tm" style="left:${m/TRAIL_END*100}%">${medalSVG(i+1,22)}<small>${m} m</small></div>`).join('')+
  '<div class="tb" id="tb" hidden><small>Best</small></div><div class="tp" id="tp"><i></i></div>'; trail(0); }
function trail(v){ const f=clamp(v/TRAIL_END,0,1)*100; $('tf').style.width=f+'%'; $('tp').style.left=f+'%';
  let best=0; try{ best=+localStorage.getItem(SKEY3+'-best')||0; }catch(e){} const tb=$('tb'); tb.hidden=!best; tb.style.left=clamp(best/TRAIL_END,0,1)*100+'%'; }

function runStep(dt){
  const S=GS.S, M=GS.machine;
  if(GS.pre>0){ // anticipation: squash, the board tips back, the machine drops to the road
    const T=RM?.2:1.15, u=1-GS.pre/T; GS.pre-=dt;
    if(!RM){
      if(u<.3) GS.sq=.16*ease(u/.3);
      else if(u<.62){ const f=(u-.3)/.32; GS.sq=-.12*Math.sin(f*Math.PI); M.position.lerpVectors(GS.from,new THREE.Vector3(S.x,S.y,0),f*f); }
      else { M.position.set(S.x,S.y,0); if(!GS.landed){ GS.landed=1; GS.sqv=-4; for(let i=0;i<8;i++) puff(S.x+(Math.random()-.5)*3,.25,(Math.random()-.5)*2,(Math.random()-.5)*4,Math.random(),.35,.6); blip(90,.2,'sine',.2,50); buzz(15); } }
      benchPivot.rotation.x=-Math.PI/2*Math.pow(ease((u-.25)/.5),1.6);
    } else { M.position.set(S.x,S.y,0); benchPivot.rotation.x=-Math.PI/2; }
    if(GS.pre<=0){ GS.landed=0; callout('Go!'); blip(300,.35,'sawtooth',.08,700); buzz(20);
      for(let i=0;i<10;i++) puff(Math.random()*2-4,.2,(Math.random()-.5)*3-1,-1-Math.random()*2,Math.random(),.4,.6); }
    stepLoose(dt); return;
  }
  // fixed physics steps; the picture is drawn between the last two steps, so motion is smooth at any frame rate
  if(!S.done){ GS.acc+=dt; let n=0; while(GS.acc>=S.dt&&n<60){ GS.prev={x:S.x,y:S.y,a:S.a,spin:S.spin}; stepSim(S,S.dt); GS.acc-=S.dt; n++; if(S.done) break; } }
  const k=S.done?1:GS.acc/S.dt, P0=GS.prev, R=GS.R;
  R.x=P0.x+(S.x-P0.x)*k; R.y=P0.y+(S.y-P0.y)*k; R.a=P0.a+(S.a-P0.a)*k; R.spin=P0.spin+(S.spin-P0.spin)*k;
  M.position.set(R.x,R.y,0); M.rotation.z=R.a;
  const dv=Math.hypot(S.vx-GS.lastV[0],S.vy-GS.lastV[1]); GS.lastV=[S.vx,S.vy];
  if(dv>5&&S.grounded){ GS.sqv-=Math.min(6,dv*.5); for(let i=0;i<6;i++) puff(R.x+(Math.random()-.5)*2,.3,(Math.random()-.5)*2,(Math.random()-.5)*4,Math.random()*2,.45,.7); blip(90,.25,'sine',.25,40); buzz(30); }
  const sp=Math.hypot(S.vx,S.vy); GS.spS+=(sp-GS.spS)*Math.min(1,dt*1.5);
  if(S.contacts.length&&sp>2&&Math.random()<.6){ const c=S.contacts[Math.floor(Math.random()*S.contacts.length)]; puff(c[0]-.3,c[1]+.1,(Math.random()<.5?-.8:.8),-S.vx*.15,.6+Math.random()*.8,.12+Math.min(.14,sp*.008),.55); }
  stepLoose(dt);
  const flow=S.driving&&S.wheelsDown?1:0;
  GS.gearSpin+=flow*dt*(5+sp*1.4);
  GS.mparts.forEach(g=>{ const u=g.userData;
    u.spin.forEach(o=>{ o.rotation.z=o.name==='wheel_spin'?-R.spin:(o.name==='motor_gearF'?-1:1)*GS.gearSpin; });
    if(u.charge) u.charge.scale.x=Math.max(.001,S.energy0?S.energy/S.energy0:0);
    if(u.k==='motor'){ if(flow&&!RM){ u.root.position.set((Math.random()-.5)*.02,(Math.random()-.5)*.02,0); if(Math.random()<dt*2.5){ const w=g.localToWorld(new THREE.Vector3(.3,.5,.5)); sparkle(w.x,w.y,w.z); } } else u.root.position.set(0,0,0); } });
  if(S.energy<=0&&S.energy0>0&&!GS.flat){ GS.flat=true; const b=GS.mparts.find(g=>g.userData.k==='battery');
    if(b){ const w=b.localToWorld(new THREE.Vector3(0,.5,0)); word('Flat!',w); sparkle(w.x,w.y,w.z); } blip(400,.5,'sawtooth',.05,80); }
  if(sp>7&&!RM&&Math.random()<dt*(sp*.9)) speedLine(R.x-1.8-Math.random(),R.y-.6+Math.random()*1.8,-.8+Math.random()*1.8);
  setLive(S.best.dist);
  loops(false,flow&&!S.done,sp);
  const m=medalFor(LV,S.best.dist);
  if(m>GS.got){ GS.got=m; callout(MNAME[m]+'!',fmt(LV.goal,LV.marks[m-1])); starBurst(R.x,R.y+1); blip(660+m*110,.2,'triangle',.14); buzz(15);
    $('hsub').textContent=m<3?'Next '+fmt(LV.goal,LV.marks[m]):'Gold!'; }
  if(S.done){ GS.endT+=dt; loops(false,false,0); $('skip').hidden=true; if(GS.endT>1.1) finish(); }
}
function stepLoose(dt){ GS.loose.forEach(L=>{ L.vy-=G*dt; L.x+=L.vx*dt; L.y+=L.vy*dt; L.a+=L.w*dt; if(L.y<.5){ L.y=.5; L.vy*=-.3; L.vx*=.7; L.w*=.6; }
  L.o.position.set(L.x,L.y,0); L.o.rotation.z=L.a; }); }

function finish(){
  const S=GS.S, v=S.best.dist, m=medalFor(LV,v); GS.mode='done';
  let best=0; try{ best=+localStorage.getItem(SKEY3+'-best')||0; if(v>best) localStorage.setItem(SKEY3+'-best',v); }catch(e){}
  const why=!S.P.some(p=>!PARTS[p.k].fixed)?'Pip needs some parts.':S.n.motor&&!S.n.battery?'The motor needs a battery.':S.n.battery&&!S.n.motor?'A battery on its own won’t turn the wheels. Add a motor.':'';
  const rows=LV.marks.map((mk,i)=>`<div class="row${m>=i+1?' me':''}"><span class="pos">${medalSVG(m>=i+1?i+1:0,22)}</span><span class="nm">${MNAME[i+1]}</span><span></span><b>${fmt(LV.goal,mk)}</b></div>`).join('');
  $('panel').innerHTML=`<h2>${m===3?'Gold!':m===2?'Silver!':m===1?'Bronze!':'Not yet'}</h2><p>${LV.name}${why?'. '+why:''}</p>
    <div class="award"><div class="troph">${medalSVG(m,m?84:64)}</div></div>
    <div class="big">${fmt(LV.goal,v)}</div><p class="nxt">${v>best?'New best':best?'Best '+fmt(LV.goal,best):''}</p>
    <div class="board">${rows}</div>
    <button class="btn" id="bAgain" type="button">Change the build</button>
    <button class="btn ghost" id="bRetry" type="button">Run it again</button>`;
  $('card').hidden=false;
  if(m) setTimeout(()=>{ blip(660,.15,'triangle',.14); setTimeout(()=>blip(880,.15,'triangle',.14),120); if(m>1) setTimeout(()=>blip(1175,.3,'triangle',.14),240); },350);
  $('bAgain').onclick=()=>{ blip(500,.08); toBuild(); };
  $('bRetry').onclick=()=>{ blip(500,.08); toBuild(); launch(); };
}
function toBuild(){
  clearTimeout(GS.skipT); $('card').hidden=true; $('skip').hidden=true; GS.mode='build';
  if(GS.machine){ scene.remove(GS.machine); GS.machine=null; } GS.loose.forEach(L=>scene.remove(L.o)); GS.loose=[];
  trail(0); benchParts.visible=true; benchPivot.rotation.x=0; WORDS.forEach(w=>w.el.remove()); WORDS.length=0; if(GS.shadow) GS.shadow.visible=false;
  Object.values(ITEMS).forEach(it=>it.label.hidden=false);
  $('dock').hidden=false; $('costbox').hidden=false; $('live').hidden=true; $('hsub').textContent=LV.blurb; refreshBuild();
}
$('skip').onclick=()=>{ const S=GS.S; if(S&&!S.done&&GS.pre<=0){ let i=0; while(!S.done&&i<45/S.dt){ stepSim(S,S.dt); i++; } GS.endT=.6; } };
$('launch').onclick=launch;
$('clear').onclick=()=>{ GS.design=newDesign(LV); refreshBuild(); saveDesign(); blip(200,.2,'triangle',.1,90); };
$('c').addEventListener('pointerdown',onDown);
$('c').addEventListener('pointermove',onMove); $('c').addEventListener('pointerup',onUp); $('c').addEventListener('pointercancel',cancelDrag);
$('c').addEventListener('pointerleave',()=>{ if(!DRAG) hoverAll({}); });
// keys: number keys pick parts, R picks Remove, space launches
addEventListener('keydown',e=>{ if(e.repeat) return;
  if(e.key==='Escape'&&DRAG){ cancelDrag(); return; }
  if(GS.mode==='build'){ const i=+e.key-1;
    if(i>=0&&i<TOOLS.length) pickTool(TOOLS[i]);
    else if(e.key==='r'||e.key==='Backspace') pickTool('erase');
    else if(e.key===' '||e.key==='Enter'){ e.preventDefault(); launch(); } }
  else if(GS.mode==='done'&&(e.key===' '||e.key==='Enter')){ e.preventDefault(); $('bRetry').click(); }
  else if(GS.mode==='done'&&e.key==='Escape') $('bAgain').click(); });

/* ---------- every frame ---------- */
function animate(dt){
  GS.t+=dt;
  GS.sqv+=(-GS.sq*180-GS.sqv*14)*dt; GS.sq+=GS.sqv*dt; if(GS.mode==='run'&&GS.pre>0&&!RM) GS.sqv*=.5;
  const sq=RM?0:clamp(GS.sq,-.35,.35);
  if(GS.squashG){ GS.squashG.scale.set(1+sq*.7,1-sq,1+sq*.4); }
  // board parts: drop in, land with a squash, get nudged by their new neighbours
  for(const key in GS.bparts){ const p=GS.bparts[key], u=p.userData, h=u.home; let x=h.x, y=h.y, z=0, sx=1, sy=1;
    if(u.drop!=null){ const t=GS.t-u.drop;
      if(t<.15){ const f=t/.15; z=1.6*(1-f*f); y+=.25*(1-f*f); sx=sy=1.12-.12*f; }
      else if(t<.6){ const f=(t-.15)/.45, e=Math.exp(-f*5)*Math.cos(f*14); sx=1+.2*e; sy=1-.22*e; } }
    if(u.nudge){ const t=GS.t-u.nudge.t, e=t<.5?Math.exp(-t*9)*Math.sin(t*30):0; x+=u.nudge.dx*e*2.2; y+=u.nudge.dy*e*2.2; }
    p.position.set(x,y,z); p.scale.set(sx,sy,sx); }
  // Pip's face
  const S=GS.S, running=GS.mode!=='build'&&S;
  const pip=running?GS.mparts&&GS.mparts.find(g=>g.userData.k==='core'):GS.pipBench;
  if(pip){ const u=pip.userData; let lx=0, ly=0, scared=false;
    if(running){ const sp=Math.hypot(S.vx,S.vy), ca=Math.cos(-S.a), sa=Math.sin(-S.a);
      if(sp>.5){ lx=(S.vx*ca-S.vy*sa)/sp; ly=(S.vx*sa+S.vy*ca)/sp; } else if(GS.pre>0){ lx=0; ly=-.6; }
      scared=Math.abs(S.w)>2.5||(S.vy<-5&&!S.grounded); }
    else if(GS.tap&&GS.t-GS.tap.t<2.5){ const dx=GS.tap.x, dy=GS.tap.y, l=Math.hypot(dx,dy)||1; lx=dx/l; ly=dy/l; }
    else if(GS.hoverItem){ lx=(ITEMS[GS.hoverItem].g.position.x)/6; ly=-.9; }
    else { lx=Math.sin(GS.t*.7)*.5; ly=-.2; }
    GS.look[0]+=(lx-GS.look[0])*Math.min(1,dt*10); GS.look[1]+=(ly-GS.look[1])*Math.min(1,dt*10);
    if(GS.t>GS.blinkAt+.13) GS.blinkAt=GS.t+2+Math.random()*3;
    const blink=GS.t>GS.blinkAt&&!RM;
    u.eyes.forEach(e=>e.scale.y=blink?.12:scared?1.25:1);
    u.pupils.forEach(p=>{ p.visible=!blink; p.position.copy(p.userData.home); p.position.x+=GS.look[0]*.04; p.position.y+=GS.look[1]*.05; p.scale.setScalar(scared?.7:1); });
    if(u.mouth){ u.mouth.visible=!scared; u.mouthO.visible=scared; }
    GS.antV+=(-GS.ant*60-GS.antV*4)*dt; GS.ant+=GS.antV*dt;
    const a=RM?0:clamp(GS.ant*.12,-.5,.5)+(running?-clamp(S.vx*.006,0,.25):0); if(u.antP) u.antP.rotation.z=a;
  }
  if(GS.shadow&&GS.machine){ const sh=GS.shadow, M=GS.machine, h=Math.max(0,M.position.y-1);
    sh.visible=true; sh.position.set(M.position.x,.03,0); sh.scale.set(5.2/(1+h*.15),5.2/(1+h*.15),1); sh.material.uniforms.uA.value=1/(1+h*.3); }
  // on the board, a powered machine ticks over gently: the motor turns and the wheels it drives roll
  if(GS.mode==='build'&&GS.L){ const L=GS.L, on=L.powered.size&&L.driven.size;
    GS.benchRate+=((on?1.1:0)-GS.benchRate)*Math.min(1,dt*1.5); GS.benchSpin+=RM?0:GS.benchRate*dt;
    for(const key in GS.bparts){ const u=GS.bparts[key].userData;
      u.spin.forEach(o=>{ if(o.name==='wheel_spin'){ if(L.driven.has(key)) o.rotation.z=-GS.benchSpin; } else if(L.powered.has(key)) o.rotation.z=(o.name==='motor_gearF'?-1:1)*GS.benchSpin*3; }); } }
  if(GS.mode==='build') animateItems(dt);
  animateDrag(dt);
  stepFX(dt); stepWords(dt);
  FLAGS.forEach((f,i)=>{ f.rotation.y=RM?0:Math.sin(GS.t*2.4+i)*.18; });
  CLOUDS.forEach(c=>{ c.position.x+=c.userData.drift*dt; });
  stepPuffs(dt);
  // camera: glides between the board and the chase; the chase follows the smoothed speed, so bumps don't shake it
  let want;
  if(GS.mode==='build'||GS.mode==='load') want=fitBuildCam();
  else { const R=GS.R||{x:0,y:1}, sp=GS.spS, z=Math.min(10,sp*.25), lead=clamp(sp*.25,0,6);
    const th=Math.tan(cam.fov*Math.PI/360)*cam.aspect, dist=clamp((10+z*.6)/th,14,90);
    const T=new THREE.Vector3(R.x+lead+dist*.12,Math.max(R.y,1)+.4,0);
    want={pos:T.clone().add(new THREE.Vector3(-dist*.3,1.5+dist*.16,dist)), look:T.clone().add(new THREE.Vector3(0,dist*.07,0))}; }
  const k=RM||GS.mode==='load'?1:1-Math.pow(GS.mode==='build'?.004:.02,dt);
  camPos.lerp(want.pos,k); camLook.lerp(want.look,k); cam.position.copy(camPos); cam.lookAt(camLook);
  // once running, the camera keeps exact pace along the road (no lag to catch up, so no judder); only height and zoom ease
  if(GS.mode!=='build'&&GS.mode!=='load'&&GS.pre<=0&&!RM){ GS.lock=Math.min(1,(GS.lock||0)+dt*.8); const f=ease(GS.lock);
    camPos.x+=(want.pos.x-camPos.x)*f; camLook.x+=(want.look.x-camLook.x)*f; cam.position.copy(camPos); cam.lookAt(camLook); } else GS.lock=0;
  if(GS.com){ const bu=bench.userData; bu.px.position.x+=(GS.com[0]-bu.px.position.x)*Math.min(1,dt*12); bu.py.position.y+=(BENCH_Y+GS.com[1]-bu.py.position.y)*Math.min(1,dt*12); }
}
