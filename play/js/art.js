/* Ink Works: how every part is drawn (drawPart) and the tray icons. */
"use strict";
/* ---------- drawing parts (local frame: y up, cell is -0.5..0.5) ---------- */
let LW=.05; // one ink line in local units
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h); }
function ink(fill){ ctx.fillStyle=fill||'#fff'; ctx.fill(); ctx.lineWidth=LW; ctx.strokeStyle='#000'; ctx.stroke(); }
function hatchFill(){ ctx.save(); ctx.clip(); ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle=HATCH2; ctx.fillRect(0,0,W,H); ctx.restore(); }
function drawPart(p,o){
  o=o||{}; const k=p.k; ctx.save();
  if(o.alpha!=null) ctx.globalAlpha=o.alpha;
  if(o.pop!=null){ const u=o.pop, s=u<1?(1-Math.pow(1-u,3))*(1+.35*Math.sin(u*Math.PI)):1; ctx.scale(s*(u<1?1+.15*Math.sin(u*TAU):1),s); }
  const rotTo=d=>ctx.rotate((d-1)*Math.PI/2); // local +y becomes the part's direction
  if(k==='frame'){ rr(-.5,-.5,1,1,.04); ink(); ctx.lineWidth=LW*.6; ctx.globalAlpha*=.55; ctx.beginPath(); ctx.moveTo(-.36,-.36); ctx.lineTo(.36,.36); ctx.moveTo(-.36,.36); ctx.lineTo(.36,-.36); ctx.stroke(); }
  else if(k==='core'){
    ctx.lineWidth=LW; ctx.beginPath(); ctx.moveTo(0,.46); ctx.quadraticCurveTo(.02,.62,.12,.66); ctx.stroke(); ctx.beginPath(); ctx.arc(.13,.66,.055,0,TAU); ctx.fillStyle='#000'; ctx.fill();
    rr(-.47,-.47,.94,.94,.24); ink();
    const lk=o.look||[0,0], bl=o.blink?.02:.15;
    [-.17,.17].forEach(ex=>{ ctx.beginPath(); ctx.ellipse(ex,.08,.1,bl,0,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=LW*.8; ctx.stroke();
      if(!o.blink){ ctx.beginPath(); ctx.arc(ex+lk[0]*.045,.08+lk[1]*.07,.055,0,TAU); ctx.fillStyle='#000'; ctx.fill(); } });
    ctx.lineWidth=LW*.8; ctx.beginPath(); if(o.scared){ ctx.ellipse(0,-.2,.07,.08,0,0,TAU); ctx.stroke(); } else { ctx.arc(0,-.12,.13,-2.5,-.64); ctx.stroke(); } }
  else if(k==='wheel'){ const R=K.wheelR; ctx.beginPath(); ctx.arc(0,0,R,0,TAU); ink(); ctx.beginPath(); ctx.arc(0,0,R*.72,0,TAU); ctx.lineWidth=LW*.6; ctx.stroke();
    ctx.save(); ctx.rotate(-(o.spin||0)); ctx.lineWidth=LW*.8; for(let i=0;i<3;i++){ ctx.rotate(TAU/6); ctx.beginPath(); ctx.moveTo(-R*.72,0); ctx.lineTo(R*.72,0); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.arc(0,0,.1,0,TAU); ctx.fillStyle='#000'; ctx.fill(); }
  else if(k==='motor'){ rr(-.5,-.5,1,1,.12); ink(); ctx.save(); ctx.rotate(o.spin||0); ctx.beginPath();
    for(let i=0;i<16;i++){ const a=i/16*TAU, r=i%2?.26:.34; ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } ctx.closePath(); ink(); ctx.beginPath(); ctx.arc(0,0,.1,0,TAU); ctx.fillStyle='#000'; ctx.fill(); ctx.restore(); }
  else if(k==='battery'){ rr(-.44,-.3,.82,.6,.08); ink(); rr(.38,-.11,.08,.22,.02); ink('#000');
    const f=o.charge==null?1:o.charge; if(f>0){ ctx.fillStyle='#000'; ctx.fillRect(-.35,-.21,.64*f,.42); }
    ctx.lineWidth=LW*.8; ctx.strokeStyle=f>.25?'#fff':'#000'; ctx.beginPath(); ctx.moveTo(-.26,0); ctx.lineTo(-.1,0); ctx.moveTo(-.18,-.08); ctx.lineTo(-.18,.08); ctx.stroke(); }
  else if(k==='rocket'){ rotTo(p.d);
    if(o.flame){ const L=.55+o.flame*.5; ctx.beginPath(); ctx.moveTo(-.2,-.5); ctx.quadraticCurveTo(-.3,-.5-L*.5,0,-.5-L); ctx.quadraticCurveTo(.3,-.5-L*.5,.2,-.5); ctx.closePath(); ink();
      ctx.beginPath(); ctx.moveTo(-.1,-.52); ctx.quadraticCurveTo(-.14,-.5-L*.35,0,-.5-L*.6); ctx.quadraticCurveTo(.14,-.5-L*.35,.1,-.52); ctx.closePath(); ctx.fillStyle='#000'; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-.18,-.3); ctx.lineTo(-.3,-.5); ctx.lineTo(.3,-.5); ctx.lineTo(.18,-.3); ctx.closePath(); ink('#000');
    ctx.beginPath(); ctx.moveTo(-.3,-.32); ctx.lineTo(-.3,.18); ctx.quadraticCurveTo(-.3,.5,0,.5); ctx.quadraticCurveTo(.3,.5,.3,.18); ctx.lineTo(.3,-.32); ctx.closePath(); ink();
    ctx.beginPath(); ctx.rect(-.3,-.12,.6,.16); ctx.save(); hatchFill(); ctx.restore(); ctx.lineWidth=LW*.7; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,.22,.08,0,TAU); ink(); }
  else if(k==='fuel'){ rr(-.36,-.46,.72,.92,.2); ink(); const f=o.fuel==null?1:o.fuel;
    if(f>0){ ctx.save(); rr(-.36,-.46,.72,.92,.2); ctx.clip(); ctx.beginPath(); ctx.rect(-.4,-.5,.8,.92*f+.04); hatchFill(); ctx.restore(); }
    rr(-.36,-.46,.72,.92,.2); ctx.lineWidth=LW; ctx.strokeStyle='#000'; ctx.stroke(); ctx.lineWidth=LW*.7; ctx.beginPath(); ctx.moveTo(-.36,.3); ctx.lineTo(.36,.3); ctx.stroke(); }
  else if(k==='nose'){ rotTo(p.d); ctx.beginPath(); ctx.moveTo(-.46,-.5); ctx.bezierCurveTo(-.46,.05,-.2,.35,0,.5); ctx.bezierCurveTo(.2,.35,.46,.05,.46,-.5); ctx.closePath(); ink();
    ctx.lineWidth=LW*.7; ctx.beginPath(); ctx.moveTo(-.4,-.22); ctx.lineTo(.4,-.22); ctx.stroke(); }
  else if(k==='wing'){ ctx.beginPath(); ctx.moveTo(-.5,.02); ctx.bezierCurveTo(-.5,.22,-.1,.22,.5,.02); ctx.bezierCurveTo(.1,-.1,-.5,-.14,-.5,.02); ctx.closePath(); ink();
    ctx.lineWidth=LW*.6; ctx.beginPath(); ctx.moveTo(.18,.07); ctx.lineTo(.26,-.03); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-.07); ctx.lineTo(0,-.5); ctx.lineWidth=LW*.8; ctx.stroke(); }
  else if(k==='prop'){ rotTo(p.d); rr(-.22,-.5,.44,.5,.08); ink(); ctx.beginPath(); ctx.rect(-.05,0,.1,.22); ink('#000');
    const c=Math.cos(o.spin||0), bl=.48*Math.max(.12,Math.abs(c));
    if(o.spinning){ ctx.save(); ctx.globalAlpha*=.35; ctx.beginPath(); ctx.ellipse(0,.26,.48,.07,0,0,TAU); ctx.lineWidth=LW*.6; ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(0,.26,bl,.08,0,0,TAU); ink(); ctx.beginPath(); ctx.arc(0,.26,.07,0,TAU); ink('#000'); }
  else if(k==='balloon'){ const b=o.bob||0; ctx.lineWidth=LW*.7; ctx.beginPath(); ctx.moveTo(0,-.5); ctx.quadraticCurveTo(.1+b*.05,-.35,0,-.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-.06,-.2); ctx.lineTo(.06,-.2); ctx.lineTo(0,-.12); ctx.closePath(); ink('#000');
    ctx.beginPath(); ctx.ellipse(0,.18,.4,.46,b*.05,0,TAU); ink(); ctx.save(); ctx.beginPath(); ctx.ellipse(-.14,.32,.1,.16,-.5,0,TAU); ctx.lineWidth=LW*.7; ctx.globalAlpha*=.6; ctx.stroke(); ctx.restore(); }
  else if(k==='crate'){ rr(-.5,-.5,1,1,.04); ink(); ctx.beginPath(); ctx.rect(-.4,-.4,.8,.8); ctx.save(); hatchFill(); ctx.restore(); ctx.lineWidth=LW*.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-.4,-.4); ctx.lineTo(.4,.4); ctx.lineWidth=LW*2.4; ctx.strokeStyle='#fff'; ctx.stroke(); ctx.lineWidth=LW*.8; ctx.strokeStyle='#000';
    ctx.beginPath(); ctx.moveTo(-.4,-.3); ctx.lineTo(.3,.4); ctx.moveTo(-.3,-.4); ctx.lineTo(.4,.3); ctx.stroke(); }
  else if(k==='chute'){ const u=o.open||0;
    if(u>0){ const R=.35+.85*u, cy=.45+1.1*u, hgt=.75*u; // strings, then the canopy
      ctx.lineWidth=LW*.6; ctx.beginPath(); [[-R,-.22],[-R*.35,-.08],[R*.35,.08],[R,.22]].forEach(([ex,sx])=>{ ctx.moveTo(sx,.2); ctx.lineTo(ex*.96,cy); }); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R,cy); ctx.bezierCurveTo(-R,cy+hgt*1.3,R,cy+hgt*1.3,R,cy);
      for(let i=3;i>=0;i--){ const x0=-R+i*R/2; ctx.quadraticCurveTo(x0+R/4,cy+.1*u,x0,cy); } ctx.closePath(); ink();
      ctx.save(); ctx.clip(); ctx.beginPath(); ctx.rect(-R*.5,cy-.2,R*.5,hgt*1.3); ctx.rect(R*.5,cy-.2,R*.5,hgt*1.3); hatchFill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-R,cy); ctx.bezierCurveTo(-R,cy+hgt*1.3,R,cy+hgt*1.3,R,cy); ctx.lineWidth=LW; ctx.stroke(); }
    rr(-.32,-.34,.64,.6,.14); ink(); ctx.lineWidth=LW*.7; ctx.beginPath(); ctx.moveTo(-.32,.02); ctx.lineTo(.32,.02); ctx.moveTo(0,.02); ctx.lineTo(0,-.34); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,.02,.06,0,TAU); ink('#000'); }
  else if(k==='egg'){ ctx.beginPath(); ctx.ellipse(0,-.04,.32,.42,0,0,TAU); ink();
    ctx.fillStyle='#000'; [[-.12,.12],[.1,-.1],[.14,.16],[-.06,-.22],[.02,.02]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,.022,0,TAU); ctx.fill(); });
    if(o.cracked){ ctx.lineWidth=LW*.9; ctx.beginPath(); ctx.moveTo(-.32,.02); [[-.2,-.06],[-.1,.08],[0,-.06],[.1,.08],[.2,-.04],[.32,.04]].forEach(([x,y])=>ctx.lineTo(x,y)); ctx.stroke();
      ctx.save(); ctx.globalAlpha*=.8; ctx.beginPath(); ctx.moveTo(-.1,.08); ctx.lineTo(-.02,.3); ctx.moveTo(.1,.08); ctx.lineTo(.2,.28); ctx.lineWidth=LW*.6; ctx.stroke(); ctx.restore(); } }
  else if(k==='wood'){ rr(-.46,-.16,.92,.32,.05); ink(); ctx.lineWidth=LW*.55; ctx.beginPath(); ctx.moveTo(-.36,-.04); ctx.quadraticCurveTo(0,.06,.3,-.03); ctx.moveTo(-.2,.07); ctx.lineTo(.36,.07); ctx.stroke(); }
  else if(k==='steel'){ ctx.beginPath(); ctx.moveTo(-.46,.2); ctx.lineTo(.46,.2); ctx.lineTo(.46,.1); ctx.lineTo(.07,.1); ctx.lineTo(.07,-.1); ctx.lineTo(.46,-.1); ctx.lineTo(.46,-.2); ctx.lineTo(-.46,-.2); ctx.lineTo(-.46,-.1); ctx.lineTo(-.07,-.1); ctx.lineTo(-.07,.1); ctx.lineTo(-.46,.1); ctx.closePath(); ink('#000'); }
  else if(k==='cable'){ ctx.lineWidth=LW*.8; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(0,0,.38-i*.1,.3-i*.08,0,0,TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(.38,0); ctx.lineTo(.48,-.3); ctx.stroke(); }
  else if(k==='road'){ rr(-.5,-.14,1,.28,.03); ink(); ctx.lineWidth=LW*.7; ctx.setLineDash([.12,.1]); ctx.beginPath(); ctx.moveTo(-.4,0); ctx.lineTo(.4,0); ctx.stroke(); ctx.setLineDash([]); }
  else if(k==='spoke'){ ctx.beginPath(); ctx.rect(-.5,-.06,1,.12); ctx.rect(-.06,-.5,.12,1); ink('#000'); ctx.beginPath(); ctx.arc(0,0,.13,0,TAU); ink(); }
  else if(k==='rim'){ ctx.beginPath(); ctx.arc(0,0,.42,0,TAU); ink(); ctx.save(); ctx.beginPath(); ctx.arc(0,0,.42,0,TAU); hatchFill(); ctx.restore();
    ctx.beginPath(); ctx.arc(0,0,.42,0,TAU); ctx.lineWidth=LW; ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,.16,0,TAU); ink(); }
  else if(k==='screw'){ const out=screwOut(p.d||0); ctx.beginPath(); ctx.arc(0,0,.2+out*.03,0,TAU); ink(); ctx.save(); ctx.rotate(out*Math.PI/4+.4); ctx.lineWidth=LW*1.1; ctx.beginPath(); ctx.moveTo(-.15,0); ctx.lineTo(.15,0); ctx.stroke(); ctx.restore();
    for(let i=0;i<out;i++){ ctx.beginPath(); ctx.arc(-.12+i*.12,-.34,.035,0,TAU); ctx.fillStyle='#000'; ctx.fill(); } }
  else if(k==='hair'){ ctx.lineWidth=LW*.75; ctx.beginPath(); for(let a=0;a<TAU*3.2;a+=.15){ const r=.04+a*.019; ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,.05,0,TAU); ctx.fillStyle='#000'; ctx.fill(); }
  else if(k==='erase'){ ctx.lineWidth=LW*1.3; ctx.beginPath(); ctx.moveTo(-.3,-.3); ctx.lineTo(.3,.3); ctx.moveTo(-.3,.3); ctx.lineTo(.3,-.3); ctx.stroke(); }
  ctx.restore();
}
// draw a part as a little icon onto a small canvas (the tray)
function iconCanvas(k,size){ const s=size||40, c=document.createElement('canvas'); c.width=c.height=Math.round(s*DPR); c.style.width=c.style.height=s+'px';
  const real=ctx; ctx=c.getContext('2d'); const sc=k==='wheel'?.5:.62;
  ctx.setTransform(s*DPR*sc,0,0,-s*DPR*sc,s*DPR/2,s*DPR/2); LW=INK/(s*sc)*.8;
  drawPart({k,d:(k==='rocket'||k==='nose'||k==='prop')?1:0},{}); ctx=real; return c; }

/* ---------- the bridge's traffic (local frame: y up, one unit is one bench cell, the road surface at y=0) ---------- */
function drawVehicle(k,o){ o=o||{}; const wheel=(x,r)=>{ ctx.beginPath(); ctx.arc(x,r,r,0,TAU); ink(); ctx.beginPath(); ctx.arc(x,r,r*.35,0,TAU); ink('#000'); };
  const eyes=(x,y,s)=>{ const lk=o.look||[1,0]; [-1,1].forEach(e=>{ ctx.beginPath(); ctx.ellipse(x+e*.07*s,y,.05*s,o.scared?.075*s:.065*s,0,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=LW*.7; ctx.stroke();
    ctx.beginPath(); ctx.arc(x+e*.07*s+lk[0]*.02*s,y+lk[1]*.02*s,.028*s,0,TAU); ctx.fillStyle='#000'; ctx.fill(); }); };
  ctx.save();
  if(k==='bike'){ wheel(-.34,.17); wheel(.34,.17); ctx.lineWidth=LW; ctx.beginPath(); ctx.moveTo(-.34,.17); ctx.lineTo(-.05,.5); ctx.lineTo(.26,.5); ctx.lineTo(.34,.17); ctx.moveTo(-.05,.5); ctx.lineTo(0,.17); ctx.lineTo(-.34,.17); ctx.stroke();
    rr(-.2,.52,.4,.36,.12); ink(); eyes(0,.72,1.2); }
  else if(k==='car'){ rr(-.36,.4,.66,.36,.14); ink(); rr(-.66,.14,1.32,.34,.1); ink(); rr(-.24,.47,.4,.22,.06); ink(); eyes(-.04,.58,1); wheel(-.4,.15); wheel(.42,.15); }
  else if(k==='van'){ rr(-.8,.14,1.6,.78,.12); ink(); ctx.save(); rr(-.7,.26,.95,.56,.06); hatchFill(); ctx.restore(); rr(.38,.46,.34,.3,.06); ink(); eyes(.55,.6,1); wheel(-.5,.16); wheel(.5,.16); }
  else if(k==='truck'){ rr(-1.12,.18,1.62,.86,.06); ink(); ctx.save(); rr(-1.04,.26,1.46,.7,.04); hatchFill(); ctx.restore(); rr(-1.12,.18,1.62,.86,.06); ctx.lineWidth=LW; ctx.stroke();
    rr(.56,.18,.56,.72,.14); ink(); rr(.7,.52,.34,.28,.06); ink(); eyes(.87,.66,1); wheel(-.86,.17); wheel(-.46,.17); wheel(.84,.17); }
  ctx.restore(); }
