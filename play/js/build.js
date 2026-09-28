/* Ink Works: tapping the bench to place, turn and remove parts; the dock buttons. */
"use strict";
/* ---------- build input ---------- */
cv.addEventListener('pointerdown',e=>{
  if(GS.mode!=='build') return; audioInit(); const c=cellAt(e.clientX,e.clientY); if(!c) return;
  const kk=c.join(','), cur=GS.design[kk], lv=GS.lv, tool=GS.tool;
  if(cur&&(cur.k==='core'||cur.k==='crate')){ GS.placed[kk]=performance.now(); blip(300,.1,'sine',.1,420); if(cur.k==='core') showHint(tool==='erase'?'Pip stays. Pip is the pilot.':'That\u2019s Pip, your pilot.'); return; }
  if(tool==='erase'){ if(cur){ delete GS.design[kk]; puffAtCell(c); blip(240,.12,'triangle',.12,140); buzz(8); } }
  else if(cur&&cur.k===tool){ if(PARTS[tool].rot){ cur.d=(cur.d+3)%4; GS.placed[kk]=performance.now(); blip(700,.07,'square',.05,900); buzz(5); } }
  else { const cost=designCost(GS.design)-(cur?PARTS[cur.k].cost:0)+PARTS[tool].cost;
    if(cost>lv.budget){ GS.nope=performance.now(); blip(150,.18,'square',.07); $('costbox').classList.remove('nope'); void $('costbox').offsetWidth; $('costbox').classList.add('nope'); showHint('Over budget. Remove a part to free some up.'); return; }
    GS.design[kk]={k:tool,d:defaultDir(lv,tool)}; GS.placed[kk]=performance.now(); blip(420+Math.random()*80,.09,'triangle',.14,760); buzz(10); }
  refreshBuild(); save_design();
});
function save_design(){ rec(GS.lv.id).design=GS.design; save(); }
function puffAtCell(c){ const g=grid(); for(let i=0;i<5;i++) GS.fx.push({k:'puff',sx:g.cx+(c[0]-3)*g.cs+(Math.random()-.5)*g.cs*.5,sy:g.cy+(c[1]-3)*g.cs+(Math.random()-.5)*g.cs*.5,r:g.cs*.12,g:g.cs*.25,t:0,life:.45,screen:true}); }
$('clear').onclick=()=>{ GS.design=newDesign(GS.lv); GS.placed={}; refreshBuild(); save_design(); blip(200,.2,'triangle',.1,90); };
$('home').onclick=()=>{ blip(400,.08); showHome(); };
$('launch').onclick=()=>{ audioInit(); launch(); };
$('skip').onclick=()=>{ if(GS.S&&!GS.S.done){ let i=0; while(!GS.S.done&&i<40*300){ stepSim(GS.S,1/300); i++; } GS.endT=.01; } };
