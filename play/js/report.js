/* Ink Works: the result as a test report, on a clipboard that swings up in front of the camera.
   The page fills itself in as you watch: a sketch of the machine, the distance, ticks for each medal,
   the verdict circled, a "New best" stamp and Pip's signature. */
"use strict";
const REPORT={root:null, page:null, cv:null, g:null, tex:null, state:'off', t:0, data:null, sketch:null, said:{}};
const PAGE_W=1024, PAGE_H=1316;

function loadClipboard(){
  new THREE.GLTFLoader().load('models/clipboard.glb?v='+VERSION, g=>{
    const root=g.scene.getObjectByName('clip_root'); root.parent.remove(root); root.position.set(0,0,0);
    root.traverse(o=>{ if(o.isMesh) o.material=inkFor(o.material.name); });
    const spot=root.getObjectByName('clip_page_spot');
    const cv=document.createElement('canvas'); cv.width=PAGE_W; cv.height=PAGE_H;
    const tex=pageTexture(cv);
    const page=new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1),new THREE.MeshBasicMaterial({map:tex}));
    page.position.copy(spot.position); page.scale.set(spot.scale.x,spot.scale.y,1); root.add(page);
    const holder=new THREE.Group(); holder.add(root); cam.add(holder); scene.add(cam); holder.visible=false;
    Object.assign(REPORT,{root:holder, clip:root, page, cv, g:cv.getContext('2d'), tex});
  }, undefined, e=>console.error(e));
}

// The page is drawn at the size it shows on screen (one canvas pixel per screen pixel), and sampled without
// blurring mipmaps, so the lettering on it stays as sharp as the rest of the interface.
function pageTexture(cv){ const t=new THREE.CanvasTexture(cv); t.minFilter=THREE.LinearFilter; t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.anisotropy=1; return t; }
function fitPage(){ const R=REPORT; if(!R.cv) return;
  const screenH=REPORT_FILL*(2.8/3.3)*INKR.H*INKR.PR, k=clamp(screenH/PAGE_H,.5,2.5);
  if(R.k&&Math.abs(k-R.k)/R.k<.04) return;   // close enough already
  R.k=k; R.cv.width=Math.round(PAGE_W*k); R.cv.height=Math.round(PAGE_H*k); R.g=R.cv.getContext('2d');
  const old=R.tex; R.tex=pageTexture(R.cv); R.page.material.map=R.tex; R.page.material.needsUpdate=true; if(old) old.dispose(); }
const REPORT_FILL=.8; // the clipboard is this much of the screen's height
// a small ink drawing of the machine for the top of the page, drawn by the same renderer as the game
function sketchMachine(S){
  const s=new THREE.Scene(), grp=new THREE.Group(); s.add(grp);
  S.P.forEach(p=>{ const m=makePart(p.k); m.position.set(p.rx,p.ry,0); grp.add(m); });
  S.loose.forEach(p=>{ const m=makePart(p.k); m.position.set(p.bx-S.P[0].bx+S.P[0].rx,p.by-S.P[0].by+S.P[0].ry,0); setFade(m,true); grp.add(m); });
  const box=new THREE.Box3().setFromObject(grp), c=box.getCenter(new THREE.Vector3()), sz=box.getSize(new THREE.Vector3());
  const w=420, h=220, k=new THREE.PerspectiveCamera(26,w/h,.5,80), d=Math.max(sz.x/(2*Math.tan(13*Math.PI/180)*w/h), sz.y/(2*Math.tan(13*Math.PI/180)))*1.25+2;
  k.position.set(c.x+d*.32,c.y+d*.22,d); k.lookAt(c);
  const keep=[INKR.W,INKR.H,INKR.PR]; inkSize(w,h,2); INKR.renderer.setClearColor(0xffffff,1); inkRender(s,k,0);
  const out=document.createElement('canvas'); out.width=w*2; out.height=h*2; out.getContext('2d').drawImage(INKR.renderer.domElement,0,0);
  inkSize(...keep); return out;
}

/* ---------- drawing the page ---------- */
const easeOut=u=>1-Math.pow(1-clamp(u,0,1),3);
function wob(seed){ let s=seed*9301+49297; return ()=>{ s=(s*9301+49297)%233280; return s/233280-.5; }; }
// a hand-drawn stroke through points, drawn up to fraction u of its length
function stroke(g,pts,u,w,seed){ if(u<=0) return; const r=wob(seed||1); g.lineWidth=w||6; g.lineCap='round'; g.lineJoin='round'; g.strokeStyle='#111';
  const segs=[]; let L=0; for(let i=1;i<pts.length;i++){ const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); segs.push(l); L+=l; }
  let left=L*clamp(u,0,1); g.beginPath(); g.moveTo(pts[0][0]+r()*2,pts[0][1]+r()*2);
  for(let i=1;i<pts.length&&left>0;i++){ const f=Math.min(1,left/segs[i-1]); const x=pts[i-1][0]+(pts[i][0]-pts[i-1][0])*f, y=pts[i-1][1]+(pts[i][1]-pts[i-1][1])*f; g.lineTo(x+r()*2,y+r()*2); left-=segs[i-1]; }
  g.stroke(); }
// text written in from left to right, like a pen moving across
function writeIn(g,text,x,y,font,u,align){ if(u<=0) return; g.save(); g.font=font; g.textAlign=align||'left'; g.textBaseline='alphabetic'; g.fillStyle='#111';
  const m=g.measureText(text), w=m.width, x0=align==='center'?x-w/2:align==='right'?x-w:x;
  g.beginPath(); g.rect(x0-10,y-200,(w+20)*easeOut(u),260); g.clip(); g.fillText(text,x,y); g.restore(); } // save/restore: its alignment never leaks into the next line
function ellipseLoop(cx,cy,rx,ry){ const pts=[]; for(let i=0;i<=46;i++){ const a=-2.6+i/40*TAU; pts.push([cx+Math.cos(a)*rx*(1+.04*Math.sin(i)),cy+Math.sin(a)*ry]); } return pts; }
function medalMark(g,x,y,r,m){ g.lineWidth=5; g.strokeStyle='#111'; g.fillStyle='#fff'; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); g.stroke();
  if(m===3){ g.fillStyle='#111'; g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); g.fillStyle='#fff'; g.beginPath();
    for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.3:r*.66; g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } g.closePath(); g.fill(); }
  else if(m===2){ g.save(); g.beginPath(); g.arc(x,y,r*.7,0,TAU); g.clip(); g.lineWidth=3; for(let i=-r;i<r;i+=8){ g.beginPath(); g.moveTo(x+i-r,y+r); g.lineTo(x+i+r,y-r); g.stroke(); } g.restore(); }
  else { g.lineWidth=4; g.beginPath(); g.arc(x,y,r*.62,0,TAU); g.stroke(); } }

function drawPage(t){
  const R=REPORT, g=R.g, D=R.data; if(!g||!D) return;
  g.setTransform(R.k||1,0,0,R.k||1,0,0); // draw in page units; the canvas itself is screen-sized
  const ph=(a,b)=>clamp((t-a)/(b-a),0,1);
  g.fillStyle='#fff'; g.fillRect(0,0,PAGE_W,PAGE_H);
  // ruled paper: light lines and a margin, printed
  g.strokeStyle='#e4e4e4'; g.lineWidth=2; for(let y=260;y<PAGE_H-40;y+=56){ g.beginPath(); g.moveTo(60,y); g.lineTo(PAGE_W-60,y); g.stroke(); }
  g.strokeStyle='#cfcfcf'; g.beginPath(); g.moveTo(120,200); g.lineTo(120,PAGE_H-40); g.stroke();
  // the printed heading
  g.fillStyle='#5c5c5c'; g.font='800 30px Figtree, system-ui, sans-serif'; g.textAlign='left'; g.fillText('TEST REPORT  ·  RUN '+String(D.run).padStart(3,'0'),150,150);
  g.fillStyle='#111'; g.font='italic 900 84px Fraunces, Georgia, serif'; g.fillText(D.level,150,236);
  // 1: the sketch of the machine
  const sk=R.sketch, sx=150, sy=275, sw=640, sh=sw*220/420;
  if(sk){ const u=ph(.35,1.0); g.save(); g.beginPath(); g.rect(sx,sy,sw*easeOut(u),sh); g.clip(); g.drawImage(sk,sx,sy,sw,sh); g.restore(); }
  stroke(g,[[sx,sy],[sx+sw,sy],[sx+sw,sy+sh],[sx,sy+sh],[sx,sy]],ph(.2,.55),4,3);
  g.fillStyle='#5c5c5c'; g.font='800 26px Figtree, system-ui, sans-serif'; g.fillText('MACHINE',sx+16,sy+40);
  // 2: the distance, written in big
  const y2=sy+sh+130;
  g.fillStyle='#5c5c5c'; g.font='800 30px Figtree, system-ui, sans-serif'; g.fillText('DISTANCE',150,y2-70);
  writeIn(g,D.value,150,y2+30,'italic 900 136px Fraunces, Georgia, serif',ph(1.05,1.6));
  if(D.best) writeIn(g,D.best,PAGE_W-120,y2+20,'700 30px Figtree, system-ui, sans-serif',ph(1.5,1.8),'right');
  // 3: the medal checklist, ticked for each one earned
  const y3=y2+110;
  g.textAlign='left'; g.textBaseline='alphabetic';
  D.marks.forEach((mk,i)=>{ const y=y3+i*72, got=D.medal>=i+1;
    g.lineWidth=4; g.strokeStyle='#111'; g.strokeRect(150,y-34,44,44);
    medalMark(g,248,y-12,24,i+1);
    g.fillStyle='#111'; g.font='700 40px Figtree, system-ui, sans-serif'; g.fillText(['Bronze','Silver','Gold'][i],292,y);
    g.font='italic 900 40px Fraunces, Georgia, serif'; g.fillText(mk,470,y);
    const u=ph(1.75+i*.28,2.0+i*.28);
    if(got) stroke(g,[[152,y-18],[170,y+4],[214,y-58]],u,8,7+i);
    else if(t>1.75+i*.28) { g.strokeStyle='#bbb'; g.lineWidth=4; g.beginPath(); g.moveTo(156,y-12); g.lineTo(188,y-12); g.stroke(); } });
  // 4: the verdict, circled
  const vx=805, vy=y3+60;
  writeIn(g,D.head,vx,vy,'italic 900 92px Fraunces, Georgia, serif',ph(2.75,3.15),'center');
  g.font='italic 900 92px Fraunces, Georgia, serif'; const vw=g.measureText(D.head).width;
  stroke(g,ellipseLoop(vx,vy-30,vw*.62+30,74),ph(3.1,3.55),6,11);
  // 5: a note, and a stamp for a new best (thumped onto the corner of the sketch)
  const y5=y3+2*72+74;
  if(D.why) writeIn(g,D.why,150,y5,'600 29px Figtree, system-ui, sans-serif',ph(3.5,3.95));
  if(D.newBest&&t>4.1){ const u=clamp((t-4.1)/.22,0,1), s=1+1.4*(1-easeOut(u)); g.save(); g.translate(sx+sw-40,sy+sh-14); g.rotate(-.18); g.scale(s,s); g.globalAlpha=Math.min(1,u*1.5);
    g.strokeStyle='#111'; g.lineWidth=7; g.strokeRect(-150,-52,300,96); g.lineWidth=3; g.strokeRect(-140,-42,280,76);
    g.fillStyle='#111'; g.font='900 46px Figtree, system-ui, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('NEW BEST',0,0); g.restore(); g.textAlign='left'; g.textBaseline='alphabetic'; }
  // 6: signed by Pip, up in the corner like a form
  const sx6=PAGE_W-330, sy6=222; g.fillStyle='#5c5c5c'; g.font='800 24px Figtree, system-ui, sans-serif'; g.textAlign='left'; g.fillText('TESTED BY',sx6,sy6-62);
  const sig=[]; for(let i=0;i<=40;i++){ const a=i/40; sig.push([sx6+a*150, sy6-6+Math.sin(a*TAU*2.2)*13-a*12+Math.sin(a*29)*4]); }
  stroke(g,sig,ph(4.3,4.9),5,21);
  if(t>4.9){ g.fillStyle='#111'; g.font='italic 900 34px Fraunces, Georgia, serif'; g.fillText('Pip',sx6+162,sy6+4); }
  // 7: the two buttons are real buttons laid over the bottom of the page (see placeButtons), so their lettering is crisp
  R.tex.needsUpdate=true;
}

/* ---------- buttons on the page ---------- */
const PBTN=[{id:'bRetry',label:'Run it again',x:150,y:1150,w:360,h:96,main:true},{id:'bAgain',label:'Change the build',x:540,y:1150,w:364,h:96}];
function drawButtons(g,u){ if(u<=0) return; const R=REPORT; g.save(); g.globalAlpha=easeOut(u);
  PBTN.forEach(b=>{ const hov=R.hover===b.id, prs=R.press===b.id, o=prs?6:hov?-3:0, sh=prs?0:hov?10:7;
    g.fillStyle='#111'; g.fillRect(b.x+sh,b.y+sh,b.w,b.h);                 // the ink shadow under it
    g.fillStyle=b.main?'#111':'#fff'; g.fillRect(b.x+o,b.y+o,b.w,b.h); g.lineWidth=5; g.strokeStyle='#111'; g.strokeRect(b.x+o,b.y+o,b.w,b.h);
    g.fillStyle=b.main?'#fff':'#111'; g.textAlign='center'; g.textBaseline='middle';
    g.font=b.main?'italic 900 46px Fraunces, Georgia, serif':'800 36px Figtree, system-ui, sans-serif'; g.fillText(b.label,b.x+o+b.w/2,b.y+o+b.h/2+2);
    if(hov&&!prs){ g.lineWidth=3; g.strokeStyle=b.main?'#fff':'#111'; g.strokeRect(b.x+o+9,b.y+o+9,b.w-18,b.h-18); } });
  g.textAlign='center'; g.textBaseline='alphabetic'; g.fillStyle='#5c5c5c'; g.font='700 24px Figtree, system-ui, sans-serif';
  g.fillText('Space to run again  ·  Esc to change the build',(150+904)/2,1290);
  g.restore(); g.textAlign='left'; }
// which page button is under the pointer (the page is a real 3D surface, so the pointer is traced onto it)
function pageButtonAt(e){ const R=REPORT; if(!R.page||R.state!=='in'||e.clientX==null) return null;
  const hit=pointerRay(e).intersectObject(R.page)[0]; if(!hit||!hit.uv) return null;
  const x=hit.uv.x*PAGE_W, y=(1-hit.uv.y)*PAGE_H; const b=PBTN.find(b=>x>=b.x-6&&x<=b.x+b.w+6&&y>=b.y-6&&y<=b.y+b.h+6); return b?b.id:null; }
function reportHover(e){ $('c').style.cursor=''; }
function reportPress(e){}
// each frame, sit the real buttons exactly on their spots on the page, following the clipboard as it moves
function placeButtons(show){ const R=REPORT; R.page.updateMatrixWorld(true);
  const toScreen=(px,py)=>{ const v=R.page.localToWorld(new THREE.Vector3(px/PAGE_W-.5,.5-py/PAGE_H,0)).project(cam); return [(v.x+1)/2*INKR.W,(1-v.y)/2*INKR.H]; };
  PBTN.forEach(b=>{ const el=$(b.id), a=toScreen(b.x,b.y), c=toScreen(b.x+b.w,b.y+b.h), w=c[0]-a[0], h=c[1]-a[1];
    el.style.left=a[0]+'px'; el.style.top=a[1]+'px'; el.style.width=w+'px'; el.style.height=h+'px'; el.style.fontSize=(b.main?h*.46:h*.36)+'px'; });
  const n=$('reportKeys'), a=toScreen(150,1262), c=toScreen(904,1300); n.style.left=a[0]+'px'; n.style.top=a[1]+'px'; n.style.width=(c[0]-a[0])+'px'; n.style.fontSize=Math.max(10,(c[1]-a[1])*.62)+'px';
  $('report').style.opacity=show; }

/* ---------- showing and hiding ---------- */
function showReport(D,S){
  const R=REPORT; if(!R.root) return false;
  R.data=D; R.sketch=sketchMachine(S); fitPage(); R.state='in'; R.t=0; R.said={}; R.hover=R.press=null; R.root.visible=true; drawPage(0);
  $('report').hidden=false; $('reportSay').textContent=`${D.level}: ${D.value}. ${D.head}${D.why?' '+D.why:''}`;
  blip(300,.18,'triangle',.08,520);
  return true;
}
function hideReport(){ const R=REPORT; if(R.state==='off') return; R.state='out'; R.t=0; $('report').hidden=true; }
function animateReport(dt){
  const R=REPORT; if(!R.root||R.state==='off') return; R.t+=dt;
  // the clipboard sits in the middle of the screen, about four-fifths of its height, just below the top bar
  const d=3.3/(REPORT_FILL*2*Math.tan(cam.fov*Math.PI/360)), x=0, h=R.root, c=R.clip; fitPage();
  if(R.state==='in'){ const u=clamp(R.t/.75,0,1), back=1+2.2*Math.pow(u-1,3)+1.2*Math.pow(u-1,2); // swings up and settles with a little overshoot
    h.position.set(x,-.12-6*(1-back),-d); c.rotation.set(-.35*(1-u),0,.28*(1-u));
    if(RM){ h.position.set(x,-.12,-d); c.rotation.set(0,0,0); }
    const wt=RM?99:R.t-.35; drawPage(wt); placeButtons(clamp((wt-.5)/.4,0,1));
    [[1.1,'num'],[1.8,'t0'],[2.08,'t1'],[2.36,'t2'],[2.8,'head'],[4.15,'stamp'],[4.4,'sig']].forEach(([at,k])=>{ if(wt>at&&!R.said[k]){ R.said[k]=1;
      if(k[0]==='t'){ if(R.data.medal>=+k[1]+1) blip(880+(+k[1])*160,.09,'triangle',.1,1200); }
      else if(k==='stamp'){ if(R.data.newBest){ blip(120,.15,'square',.12,60); buzz(20); } }
      else blip(500+Math.random()*120,.06,'triangle',.05,700); } });
    if(R.data.medal&&!R.said.chime&&wt>3.2){ R.said.chime=1; const m=R.data.medal; blip(660,.15,'triangle',.14); setTimeout(()=>blip(880,.15,'triangle',.14),120); if(m>1) setTimeout(()=>blip(1175,.3,'triangle',.14),240); }
    }
  else if(R.state==='out'){ const u=clamp(R.t/.35,0,1); placeButtons(0); h.position.set(x,-.12-7*u*u,-d); c.rotation.z=-.02-.3*u; if(u>=1){ R.state='off'; h.visible=false; } }
}
