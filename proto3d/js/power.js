/* Ink Works 3D prototype: how the parts work together, and the little effects that make building feel physical.
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
function speedLine(x,y,z){ const m=fxMesh(lineG,fxInk()), L=1.2+Math.random()*2.2;
  addFX(m,.35,u=>{ m.position.set(x-L/2-u*.6,y,z); m.scale.set(L*(1-u),.7,.7); }); }
function stepFX(dt){ for(let i=FX.length-1;i>=0;i--){ const f=FX[i]; f.t+=dt; const u=f.t/f.life; if(u>=1){ scene.remove(f.m); FX.splice(i,1); continue; } f.upd(u,dt); } }
// words that float up from a spot in the world ("Powered!", "Flat!")
const WORDS=[];
function word(text,pos,cls){ const el=document.createElement('div'); el.className='word '+(cls||''); el.textContent=text; document.body.appendChild(el);
  WORDS.push({el,pos:pos.clone(),t:0}); stepWords(0); }
function stepWords(dt){ for(let i=WORDS.length-1;i>=0;i--){ const w=WORDS[i]; w.t+=dt; if(w.t>1.3){ w.el.remove(); WORDS.splice(i,1); continue; }
  const p=w.pos.clone().project(cam); w.el.style.transform=`translate(${(p.x+1)/2*INKR.W}px,${(1-p.y)/2*INKR.H-w.t*30}px) translate(-50%,-100%)`; } }
