/* Ink Works: shared helpers, the canvas and ink hatching. */
"use strict";
const $=id=>document.getElementById(id);
const cv=$('c'); let ctx=cv.getContext('2d');
const TAU=Math.PI*2, INK=2.5;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=0,H=0,DPR=1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function seeded(s){ return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

/* ---------- canvas ---------- */
let HATCH=null, HATCH2=null;
function makeHatch(gap,alpha){ const s=gap*DPR, c=document.createElement('canvas'); c.width=c.height=Math.round(s); const g=c.getContext('2d');
  g.strokeStyle=`rgba(0,0,0,${alpha})`; g.lineWidth=1.1*DPR; g.beginPath(); g.moveTo(-1,s+1); g.lineTo(s+1,-1); g.moveTo(-1,1); g.lineTo(1,-1); g.moveTo(s-1,s+1); g.lineTo(s+1,s-1); g.stroke();
  return ctx.createPattern(c,'repeat'); }
function resize(){ DPR=Math.min(2,devicePixelRatio||1); W=innerWidth; H=innerHeight; cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR);
  HATCH=makeHatch(7,.55); HATCH2=makeHatch(4,.7); }
addEventListener('resize',resize); resize();
