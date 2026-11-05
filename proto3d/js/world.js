/* Ink Works 3D prototype: the world. The parts modelled in Blender, the bench, the road, the hills and the medal flags.
   One bench cell is one metre. x runs along the road, y is up, z comes toward the camera. */
"use strict";
const scene=new THREE.Scene();
const BENCH_Y=7.0;           // height of Pip's cell on the bench (high enough for the parts table in front)
const PART3D={};             // templates loaded from models/parts.glb

function loadParts(done){
  new THREE.GLTFLoader().load('models/parts.glb', g=>{
    ['core','frame','wheel','motor','battery'].forEach(k=>{ const o=g.scene.getObjectByName('part_'+k); o.parent.remove(o); o.position.set(0,0,0); PART3D[k]=o; });
    done();
  }, undefined, e=>{ console.error(e); $('hintT').textContent='Couldn’t load the parts.'; $('hint').hidden=false; });
}
// a fresh copy of a part with its own ink, and handles for the bits that move
function makePart(k){
  const root=PART3D[k].clone(true);
  root.traverse(o=>{ if(o.isMesh){ const tone=o.material.name==='ink'?1:0; o.material=inkMat(tone); } });
  const g=new THREE.Group(); g.add(root); g.userData={k, root,
    spin:['wheel_spin','motor_gearF','motor_gearB'].map(n=>root.getObjectByName(n)).filter(Boolean),
    charge:root.getObjectByName('battery_charge'),
    eyes:['pip_eyeL','pip_eyeR'].map(n=>root.getObjectByName(n)).filter(Boolean),
    pupils:['pip_pupilL','pip_pupilR'].map(n=>root.getObjectByName(n)).filter(Boolean),
    mouth:root.getObjectByName('pip_mouth'), mouthO:root.getObjectByName('pip_mouthO'), ant:root.getObjectByName('pip_antenna'), ball:root.getObjectByName('pip_ball')};
  const u=g.userData; u.pupils.forEach(p=>p.userData.home=p.position.clone()); if(u.mouthO) u.mouthO.visible=false;
  if(u.ant){ // the antenna swings from where it meets Pip's head
    const pv=new THREE.Group(); pv.position.set(0,.46,0); root.add(pv); [u.ant,u.ball].forEach(o=>{ o.position.y-=.46; pv.add(o); }); u.antP=pv; }
  return g;
}

// many small still things (posts, tufts, trees) baked into one mesh each, so the screen draws them in one go
function mergeStatic(meshes,mat){
  const pos=[], nrm=[];
  meshes.forEach(m=>{ m.updateMatrixWorld(true); const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
    pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); g.dispose(); });
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
  const o=new THREE.Mesh(g,mat); o.frustumCulled=false; scene.add(o); return o; }
// world-space meshes to be merged: describe each with a shape, a spot and a size
function piece(g,x,y,z,sx,sy,sz,rz){ const m=new THREE.Mesh(g); m.position.set(x,y,z); m.scale.set(sx||1,sy||sx||1,sz||sx||1); if(rz) m.rotation.z=rz; return m; }
function box(w,h,d,mat){ return new THREE.Mesh(new THREE.BoxBufferGeometry(w,h,d),mat); }
function at(o,x,y,z){ o.position.set(x,y,z); return o; }
function add(o,parent){ (parent||scene).add(o); return o; }
function rnd(s){ return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

/* ---------- the bench: a pegboard standing at the start line ---------- */
const bench=new THREE.Group(); scene.add(bench);
function buildBench(){
  const P=PAPER(), I=INKM();
  // the board, with the grid inked on its face (a drawing, so the lines stay crisp)
  const c=document.createElement('canvas'), S=1024; c.width=c.height=S; const g=c.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,S,S); g.strokeStyle='#000'; g.lineCap='round';
  const u=S/7.7, o=(7.7-7)/2*u;
  for(let i=0;i<=7;i++){ g.lineWidth=i===0||i===7?5:3; const v=o+i*u; g.beginPath(); g.moveTo(v,o); g.lineTo(v,S-o); g.moveTo(o,v); g.lineTo(S-o,v); g.stroke(); }
  g.fillStyle='#000'; for(let x=0;x<7;x++) for(let y=0;y<7;y++){ g.beginPath(); g.arc(o+(x+.5)*u,o+(y+.5)*u,3,0,TAU); g.fill(); } // peg holes
  const tex=new THREE.CanvasTexture(c); tex.anisotropy=8;
  const board=at(new THREE.Mesh(new THREE.BoxBufferGeometry(7.7,7.7,.3),[P,P,P,P,new THREE.MeshBasicMaterial({map:tex}),P]),0,BENCH_Y,-1.05); bench.add(board);
  // two legs and feet
  [-3.2,3.2].forEach(x=>{ bench.add(at(box(.3,BENCH_Y-3.85+.2,.3,P),x,(BENCH_Y-3.85)/2,-1.05)); bench.add(at(box(.5,.18,1.6,P),x,.09,-1.05)); });
  // the balance pointers: under the bench and beside it
  const cone=new THREE.ConeBufferGeometry(.22,.4,3);
  bench.userData.px=add(at(new THREE.Mesh(cone,INKM()),0,BENCH_Y-3.95,-.6),bench);
  bench.userData.py=add(at(new THREE.Mesh(cone,INKM()),3.95,BENCH_Y,-.6),bench);
  bench.userData.py.rotation.z=Math.PI/2; // the one under points up, this one points left at the board
}

/* ---------- the parts table: a workbench under the board where the parts sit ---------- */
const TABLE={y:1.75, z:2.6, x0:-3.6, gap:1.8};
const table=new THREE.Group(); scene.add(table);
function buildTable(n){
  const P=PAPER(), w=TABLE.gap*n+.6;
  const top=at(box(w,.22,2,P),0,TABLE.y-.11,TABLE.z); table.add(top);
  table.add(at(box(w-.3,.22,.12,P),0,TABLE.y-.33,TABLE.z+.88)); // front apron
  [-1,1].forEach(s=>[-1,1].forEach(t=>table.add(at(box(.22,TABLE.y-.22,.22,P),s*(w/2-.3),(TABLE.y-.22)/2,TABLE.z+t*.75))));
  TABLE.x0=-(n-1)*TABLE.gap/2;
}

/* ---------- the ground, the road and the scenery ---------- */
function buildWorld(lv){
  const P=PAPER;
  // ground: one big sheet of paper, never hatched
  const ground=new THREE.Mesh(new THREE.PlaneBufferGeometry(2400,400),inkMat(3)); ground.rotation.x=-Math.PI/2; at(ground,700,0,-150); scene.add(ground);
  // the road: a raised strip, with dashes along its front edge
  const road=at(box(2400,.08,3.4,inkMat(3)),700,.0,0); road.position.y=-.03; scene.add(road);
  const dashG=new THREE.BoxBufferGeometry(1.2,.03,.12), cube=new THREE.BoxBufferGeometry(1,1,1), dashes=[], posts=[];
  for(let x=-30;x<600;x+=3) dashes.push(piece(dashG,x,.02,1.45));
  mergeStatic(dashes,INKM());
  // little distance posts every 10 m, with a number every 20 m
  for(let x=10;x<=400;x+=10){ if(lv.marks.includes(x)) continue;
    posts.push(piece(cube,x,x%20?.25:.55,-2.1,.12,x%20?.5:1.1,.12));
    if(x%20===0){ const s=sign(x+' m',1.5,.7); at(s,x,1.35,-2.03); scene.add(s); }
  }
  mergeStatic(posts,P());
  // the medal lines: a stripe across the road and a flag (gold is solid ink with a star, silver hatched, bronze outlined)
  lv.marks.forEach((m,i)=>{ const tier=i+1;
    scene.add(at(box(.35,.05,3.4,tier===3?INKM():inkMat(tier===2?2:3)),m,.01,0));
    const pole=at(box(.12,4.2,.12,P()),m,2.1,-2.9); scene.add(pole);
    const fg=new THREE.Shape(); fg.moveTo(0,0); fg.lineTo(2.2,-.65); fg.lineTo(0,-1.3); fg.lineTo(0,0);
    const flag=new THREE.Mesh(new THREE.ExtrudeBufferGeometry(fg,{depth:.06,bevelEnabled:false}), tier===3?INKM():tier===2?inkMat(2):inkMat(3));
    at(flag,m+.06,4.15,-2.93); scene.add(flag); flag.userData.flap=true; FLAGS.push(flag);
    const s=sign(['Bronze','Silver','Gold'][i]+' '+m+' m',2.4,.7); at(s,m,.95,-2.8); scene.add(s);
  });
  // rolling hills, far off, and trees between
  const r=rnd(7), hillG=new THREE.SphereBufferGeometry(1,28,14);
  const hills=[]; for(let x=-80;x<700;x+=r()*40+35){ const s=18+r()*22; hills.push(piece(hillG,x,-2,-70-r()*50,s*1.6,s*.45+4,s)); }
  mergeStatic(hills,inkMat(3));
  const trunkG=new THREE.CylinderBufferGeometry(.12,.16,1.4,8), crownG=new THREE.ConeBufferGeometry(1,2.6,9), bushG=new THREE.IcosahedronBufferGeometry(1,1);
  const trees=[];
  for(let x=-40;x<500;x+=r()*14+6){ const z=-7-r()*22, s=.8+r()*.9;
    if(r()<.6){ trees.push(piece(trunkG,x,.7*s,z,s), piece(crownG,x,2.4*s,z,s)); }
    else trees.push(piece(bushG,x,.3*s,z,1.3*s,.8*s,s)); }
  mergeStatic(trees,P());
  // grass tufts in front of the road, so you can feel the speed
  const tuftG=new THREE.ConeBufferGeometry(.05,.35,4), tufts=[];
  for(let x=-20;x<560;x+=r()*2.2+.6){ const z=4.2+r()*5, s=.7+r()*.7;
    for(let j=0;j<3;j++) tufts.push(piece(tuftG,x+(j-1)*.09*s,.15*s,z,s,s,s,(j-1)*.45)); }
  mergeStatic(tufts,INKM());
  // clouds: clumps of paper balls, drifting slowly
  const cG=new THREE.IcosahedronBufferGeometry(1,2);
  for(let i=0;i<14;i++){ const c=new THREE.Group(), n=3+Math.floor(r()*3);
    for(let j=0;j<n;j++){ const b=at(new THREE.Mesh(cG,inkMat(3)),j*1.6-n*.8,r()*.6,r()*.5); b.scale.setScalar(1.1+r()*.9); c.add(b); }
    at(c,-40+i*40+r()*20,14+r()*12,-45-r()*25); c.scale.setScalar(1.4+r()); c.userData.drift=.3+r()*.4; scene.add(c); CLOUDS.push(c); }
}
const FLAGS=[], CLOUDS=[], SIGNS=[];
// redraw sign lettering once the font has arrived, so it's never in a fallback font
function redrawSigns(){ SIGNS.forEach(S=>{ const {c,g,s}=S; g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.fillStyle='#000';
  g.font=`italic 900 ${s*.6}px Fraunces, Georgia, serif`; g.textAlign='center'; g.textBaseline='middle'; g.fillText(S.text,c.width/2,s*.56); g.lineWidth=s*.05; g.strokeRect(s*.04,s*.04,c.width-s*.08,s-s*.08); S.tex.needsUpdate=true; }); }

// a small paper sign with ink lettering
function sign(text,w,h){
  const c=document.createElement('canvas'), s=256; c.width=Math.round(s*w/h); c.height=s; const g=c.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.fillStyle='#000'; g.font=`italic 900 ${s*.6}px Fraunces, Georgia, serif`;
  g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,c.width/2,s*.56);
  g.lineWidth=s*.05; g.strokeRect(s*.04,s*.04,c.width-s*.08,s-s*.08);
  const tex=new THREE.CanvasTexture(c); tex.anisotropy=INKR.renderer.capabilities.getMaxAnisotropy(); tex.minFilter=THREE.LinearMipmapLinearFilter; tex.generateMipmaps=true;
  SIGNS.push({c,g,text,tex,s});
  const m=new THREE.Mesh(new THREE.BoxBufferGeometry(w,h,.06),[PAPER(),PAPER(),PAPER(),PAPER(),new THREE.MeshBasicMaterial({map:tex}),PAPER()]);
  return m;
}

/* ---------- shadows: a hatched patch on the ground under the machine ---------- */
const SHADOW_FRAG=`uniform float uPR; uniform float uBoil; uniform float uA; varying vec2 vUv;
void main(){ vec2 c=vUv-.5; float r=length(c*vec2(1.,2.2))*2.; if(r>1.) discard;
  if(r>mix(.55,1.,uA)) discard; gl_FragColor=vec4(vec3(.8),1.); }`;
function makeShadow(){
  const m=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:SHADOW_FRAG, uniforms:{uPR:{value:1},uBoil:{value:0},uA:{value:1}}, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2});
  INKR.mats.push(m);
  const s=new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1),m); s.rotation.x=-Math.PI/2; s.layers.set(NOEDGE); s.renderOrder=1; scene.add(s); return s;
}

/* ---------- dust: little paper puffs ---------- */
const PUFFS=[]; const puffG=new THREE.IcosahedronBufferGeometry(1,1);
function puff(x,y,z,vx,vy,r,life){
  let p=PUFFS.find(p=>!p.visible); if(!p){ if(PUFFS.length>60) return; p=new THREE.Mesh(puffG,inkMat(3)); scene.add(p); PUFFS.push(p); }
  p.visible=true; p.position.set(x,y,z); p.userData={vx,vy,r,t:0,life}; p.scale.setScalar(.01);
}
function stepPuffs(dt){ PUFFS.forEach(p=>{ if(!p.visible) return; const u=p.userData; u.t+=dt; if(u.t>=u.life){ p.visible=false; return; }
  const k=u.t/u.life; p.position.x+=u.vx*dt; p.position.y+=u.vy*dt; u.vx*=.96; u.vy*=.96;
  p.scale.setScalar(u.r*Math.sin(Math.PI*Math.min(1,k*1.15))*(1+k*.6)); }); }
// stars burst out when a medal is passed
function starBurst(x,y){ for(let i=0;i<8;i++){ const a=i/8*TAU; puff(x,y,.6,Math.cos(a)*7,Math.sin(a)*7,.22,.7); } }
