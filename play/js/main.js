/* Ink Works: the main loop and startup (always last). */
"use strict";
/* ---------- main loop ---------- */
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now; GS.t+=dt;
  if(GS.mode==='run') runStep(dt);
  GS.fx.forEach(f=>{ f.t+=dt; if(!f.screen){ f.x+=(f.vx||0)*dt; f.y+=(f.vy||0)*dt; if(f.k==='star'){ f.vx*=.92; f.vy*=.92; } } }); GS.fx=GS.fx.filter(f=>f.t<f.life);
  draw(); requestAnimationFrame(frame);
}
document.fonts&&document.fonts.ready.then(()=>{ if(GS.mode==='build') buildTray(); });
showHome(); requestAnimationFrame(frame);
