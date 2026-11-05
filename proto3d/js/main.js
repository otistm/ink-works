/* Ink Works 3D prototype: startup and the main loop (always last). */
"use strict";
inkInit($('c'));
// sharpness: start a little above the screen's own, and step down if frames start taking too long
let PR_MAX=Math.min(2,Math.max(1.5,devicePixelRatio||1)), PR_NOW=PR_MAX;
function resize(){ inkSize(innerWidth,innerHeight,PR_NOW); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
buildBench(); scene.remove(bench); benchPivot.position.set(0,0,-1.25); bench.position.z=1.25; benchPivot.add(bench);
buildWorld(LV);
if(document.fonts) document.fonts.ready.then(redrawSigns);
$('hn').textContent=LV.name; $('hsub').textContent=LV.blurb;
trailInit();
let last=performance.now(), slow=0, fast=0;
function frame(now){ const raw=(now-last)/1000, dt=Math.min(.05,raw); last=now;
  // keep the frame rate up: if frames are slow for a while, draw at a lower sharpness
  if(raw>.024) slow+=raw; else slow=Math.max(0,slow-raw*.5);
  if(raw<.0175) fast+=raw; else fast=0;
  if(slow>.6&&PR_NOW>1){ PR_NOW=Math.max(1,PR_NOW-.25); resize(); slow=0; fast=0; }
  else if(fast>4&&PR_NOW<PR_MAX){ PR_NOW=Math.min(PR_MAX,PR_NOW+.25); resize(); fast=0; }
  if(GS.mode==='run') runStep(dt);
  animate(dt); inkRender(scene,cam,GS.t); requestAnimationFrame(frame); }
loadParts(()=>{
  buildItems(); GS.design=loadDesign(); $('top').hidden=false; $('dock').hidden=false;
  refreshBuild(); GS.powered=GS.L.powered.size>0&&GS.L.driven.size>0; GS.mode='build'; showHint('Drag a part onto the board. Wheels go on the bottom.');
  requestAnimationFrame(t=>{ last=t; frame(t); });
});
