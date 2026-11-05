/* Ink Works: the world. The parts modelled in Blender, the bench, the road, the hills and the medal flags.
   One bench cell is one metre. x runs along the road, y is up, z comes toward the camera. */
"use strict";
const scene=new THREE.Scene();
const BENCH_Y=7.0;           // height of Pip's cell on the bench (high enough for the parts table in front)
const PART3D={};             // templates loaded from models/parts.glb
let LEVELS3DIR='dist'; // what the current machine is measured by ('dist' or 'alt'), set at startup
const ENV3D={};              // scenery modelled in Blender: models/env.glb (outdoors) and models/shop.glb (the workshop)
// where the game takes place: a giant workshop with an endless grid floor (the default), or the outdoors (?world=outdoors)
const WORLD=new URLSearchParams(location.search).get('world')==='outdoors'?'outdoors':'workshop';

function loadParts(done){
  const L=new THREE.GLTFLoader(), fail=e=>{ console.error(e); $('hintT').textContent='Couldn’t load the models.'; $('hint').hidden=false; };
  L.load('models/parts.glb?v='+VERSION, g=>{
    ['core','frame','wheel','motor','battery','rocket','fuel','nose','booster','bigrocket','slowburn','bigtank','fin'].forEach(k=>{ const o=g.scene.getObjectByName('part_'+k); o.parent.remove(o); o.position.set(0,0,0); PART3D[k]=o; });
    const file=WORLD==='workshop'?'shop':'env';
    L.load('models/'+file+'.glb?v='+VERSION, e=>{ e.scene.children.slice().forEach(o=>{ if(/^(env|shop)_/.test(o.name)){ e.scene.remove(o); o.position.set(0,0,0); ENV3D[o.name.replace(/^env_/,'')]=o; } }); done(); }, undefined, fail);
  }, undefined, fail);
}
// a fresh copy of a part with its own ink, and handles for the bits that move
function makePart(k,d){
  const root=PART3D[k].clone(true);
  root.traverse(o=>{ if(o.isMesh){ const tone=o.material.name==='ink'?1:0; o.material=inkMat(tone); } });
  const g=new THREE.Group(); g.add(root); g.userData={k, root,
    spin:['wheel_spin','motor_gearF','motor_gearB'].map(n=>root.getObjectByName(n)).filter(Boolean),
    charge:root.getObjectByName('battery_charge'),
    eyes:['pip_eyeL','pip_eyeR'].map(n=>root.getObjectByName(n)).filter(Boolean),
    pupils:['pip_pupilL','pip_pupilR'].map(n=>root.getObjectByName(n)).filter(Boolean),
    mouth:root.getObjectByName('pip_mouth'), mouthO:root.getObjectByName('pip_mouthO'), ant:root.getObjectByName('pip_antenna'), ball:root.getObjectByName('pip_ball')};
  const u=g.userData; u.pupils.forEach(p=>p.userData.home=p.position.clone()); if(u.mouthO) u.mouthO.visible=false;
  // rockets and nose cones are modelled pointing up; d says which way this one points (0 right, 1 up, 2 left, 3 down)
  if(PARTS[k]&&PARTS[k].rot){ u.dirG=root; u.d=d==null?1:d; root.rotation.z=(u.d-1)*Math.PI/2; }
  root.traverse(o=>{ if(/_nozzle$/.test(o.name)) u.nozzle=o; if(/_gauge$/.test(o.name)) u.gauge=o; }); // where flames come out, and the fuel gauge that drains
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
  if(n>7){ TABLE.gap=1.42; TABLE.small=.84; } // ten parts: closer together and a little smaller
  const P=PAPER(), w=TABLE.gap*n+.6;
  const top=at(box(w,.22,2,P),0,TABLE.y-.11,TABLE.z); table.add(top);
  table.add(at(box(w-.3,.22,.12,P),0,TABLE.y-.33,TABLE.z+.88)); // front apron
  [-1,1].forEach(s=>[-1,1].forEach(t=>table.add(at(box(.22,TABLE.y-.22,.22,P),s*(w/2-.3),(TABLE.y-.22)/2,TABLE.z+t*.75))));
  TABLE.x0=-(n-1)*TABLE.gap/2;
}

/* ---------- the ground, the road and the scenery ---------- */
function buildWorld(lv){
  const P=PAPER;
  if(lv.goal==='alt'){ if(WORLD==='workshop') buildFloor(lv,true); else buildOutdoors(lv,true); buildTower(lv); return; }
  if(WORLD==='workshop') buildFloor(lv); else buildOutdoors(lv);
  // the medal lines: a stripe across the road and a flag (gold is solid ink with a star, silver hatched, bronze outlined)
  lv.marks.forEach((m,i)=>{ const tier=i+1;
    scene.add(at(box(.35,.05,WORLD==='workshop'?3.8:3.4,tier===3?INKM():inkMat(tier===2?2:3)),m,.01,0));
    const pole=at(box(.12,4.2,.12,P()),m,2.1,-2.9); scene.add(pole);
    const fg=new THREE.Shape(); fg.moveTo(0,0); fg.lineTo(2.2,-.65); fg.lineTo(0,-1.3); fg.lineTo(0,0);
    const flag=new THREE.Mesh(new THREE.ExtrudeBufferGeometry(fg,{depth:.06,bevelEnabled:false}), tier===3?INKM():tier===2?inkMat(2):inkMat(3));
    at(flag,m+.06,4.15,-2.93); scene.add(flag); flag.userData.flap=true; FLAGS.push(flag);
    const s=sign(['Bronze','Silver','Gold'][i]+' '+m+' m',2.4,.7); at(s,m,.95,-2.8); scene.add(s);
  });
}
function buildOutdoors(lv,pad){
  const P=PAPER;
  if(pad){ const ground=new THREE.Mesh(new THREE.PlaneBufferGeometry(2400,1200),inkMat(3)); ground.rotation.x=-Math.PI/2; at(ground,0,0,-300); scene.add(ground); return; }
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
}

/* ---------- the workshop floor: an endless grid, like a testing room ----------
   One light line every metre, all the same, a taped test lane down the middle, all fading to white in the distance.
   It isn't outlined (it's on the no-outline layer), so there is no horizon line: the floor just melts into the paper. */
const FLOOR_FRAG=`
varying vec3 vW; uniform float uPad;
float grid(vec2 p,float step,float px){ vec2 c=p/step, fw=fwidth(c), d=abs(fract(c-.5)-.5)/max(fw,1e-4); return 1.-clamp(min(d.x,d.y)-px*.5+.5,0.,1.); }
void main(){
  vec2 p=vW.xz; float fw=max(fwidth(p.x),fwidth(p.y)); float col=1.;
  col=mix(col,.86,grid(p,1.,1.)*(1.-smoothstep(.22,.6,fw)));     // one light line every metre, all alike; it melts away where the squares get tiny
  if(uPad<.5){ // the test lane: plain floor between two strips of hazard tape
    float az=abs(p.y);
    if(az<1.85) col=max(col,.94);
    if(az>1.85&&az<2.25){ float st=step(.5,fract((p.x-p.y*sign(p.y))*.9)); col=mix(1.,0.,st); if(az<1.9||az>2.2) col=0.; }
  } else { // the launch pad: a round plate inside a ring of hazard tape
    float r=length(p);
    if(r<3.3) col=max(col,.94);
    if(r>3.3&&r<3.8){ float a=atan(p.y,p.x); float st=step(.5,fract(a/6.2832*36.+r*.9)); col=mix(1.,0.,st); if(r<3.36||r>3.74) col=0.; }
    if(abs(r-1.6)<.05) col=.6;
  }
  // fade everything into the paper far away
  float dist=length(vW-cameraPosition); col=mix(col,1.,smoothstep(90.,260.,dist));
  gl_FragColor=vec4(vec3(col),1.);
}`;
function buildFloor(lv,pad){
  const m=new THREE.ShaderMaterial({vertexShader:'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader:FLOOR_FRAG, extensions:{derivatives:true}, uniforms:{uPad:{value:pad?1:0}}});
  const floor=new THREE.Mesh(new THREE.PlaneBufferGeometry(5000,3000),m); floor.rotation.x=-Math.PI/2; at(floor,1000,0,-1000); floor.layers.set(NOEDGE); floor.renderOrder=-1; scene.add(floor);
  FLOORNUMS.lv=pad?null:lv;
}
/* ---------- the height tower: a tall lattice mast beside the launch pad, marked every 5 m, numbered every 10 m,
   with a flag sticking out at each medal height ---------- */
function buildTower(lv){
  const top=Math.ceil(lv.marks[2]*1.4/10)*10, X=8.5, Z=-5, cube=new THREE.BoxBufferGeometry(1,1,1), rails=[], ticks=[];
  [[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]].forEach(([dx,dz])=>rails.push(piece(cube,X+dx,top/2,Z+dz,.16,top,.16)));
  for(let y=2.5;y<top;y+=2.5){ rails.push(piece(cube,X,y,Z+.6,1.2,.09,.09),piece(cube,X,y,Z-.6,1.2,.09,.09),piece(cube,X-.6,y,Z,.09,.09,1.2),piece(cube,X+.6,y,Z,.09,.09,1.2)); }
  mergeStatic(rails,PAPER());
  for(let y=5;y<top;y+=5) ticks.push(piece(cube,X-.95,y,Z+.6,y%10?.5:.9,.08,.08));
  mergeStatic(ticks,INKM());
  for(let y=10;y<top;y+=10){ if(lv.marks.includes(y)) continue; const s=sign(y+' m',1.5,.7); at(s,X+1.6,y,Z+.62); scene.add(s); }
  lv.marks.forEach((m,i)=>{ const tier=i+1;
    scene.add(at(box(2.6,.09,.09,tier===3?INKM():inkMat(tier===2?2:3)),X-1.6,m,Z+.6));   // a line across at the medal height
    const fg=new THREE.Shape(); fg.moveTo(0,0); fg.lineTo(2.2,-.65); fg.lineTo(0,-1.3); fg.lineTo(0,0);
    const flag=new THREE.Mesh(new THREE.ExtrudeBufferGeometry(fg,{depth:.06,bevelEnabled:false}), tier===3?INKM():tier===2?inkMat(2):inkMat(3));
    at(flag,X+.66,m+.65,Z); scene.add(flag); FLAGS.push(flag);
    const s=sign(['Bronze','Silver','Gold'][i]+' '+m+' m',2.4,.7); at(s,X+2.1,m-.5,Z+.62); scene.add(s); });
}
// a rocket's flame: a fat paper teardrop with three licking tongues round it, inked by the outline pass; it flickers while the rocket burns
const flameG=new THREE.SphereBufferGeometry(.26,16,10), tongueG=new THREE.ConeBufferGeometry(.1,.55,10);
flameG.scale(1,2.1,1); flameG.translate(0,-.42,0); tongueG.rotateX(Math.PI); tongueG.translate(0,-.38,0);
function addFlame(g){ const u=g.userData; if(!u.nozzle) return; const f=new THREE.Group(), m=inkMat(3), R=ROCKETS[u.k]; u.flameSize=R?Math.sqrt(R.F/70):1;
  f.add(new THREE.Mesh(flameG,m)); u.tongues=[0,1,2].map(i=>{ const t=new THREE.Mesh(tongueG,m), a=i/3*TAU; t.position.set(Math.cos(a)*.13,-.25,Math.sin(a)*.13); t.rotation.z=Math.cos(a)*.35; t.rotation.x=-Math.sin(a)*.35; f.add(t); return t; });
  f.visible=false; u.nozzle.add(f); u.flame=f; }
// big numbers painted on the floor in front of the lane, every 10 m (drawn once the font has loaded)
const FLOORNUMS={lv:null, done:false};
function paintFloorNumbers(){
  if(WORLD!=='workshop'||FLOORNUMS.done||!FLOORNUMS.lv) return; FLOORNUMS.done=true;
  for(let x=10;x<=400;x+=10){
    const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d');
    g.fillStyle='#000'; g.font=`italic 900 ${x%50?150:190}px Fraunces, Georgia, serif`; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(x+(x%50?'':' m'),256,138);
    const tex=new THREE.CanvasTexture(c); tex.anisotropy=INKR.renderer.capabilities.getMaxAnisotropy();
    const d=new THREE.Mesh(new THREE.PlaneBufferGeometry(2.4,1.2),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));
    d.rotation.x=-Math.PI/2; at(d,x,.012,3.2); d.layers.set(NOEDGE); d.renderOrder=1; scene.add(d);
    // and a short tick across the tape, so the number has a line to belong to
  }
  const ticks=[]; const tg=new THREE.BoxBufferGeometry(.08,.02,.9); for(let x=10;x<=400;x+=10) ticks.push(piece(tg,x,.01,2.45));
  const t=mergeStatic(ticks,INKM()); t.layers.set(NOEDGE);
}
const FLAGS=[], CLOUDS=[], SIGNS=[];

/* ---------- scenery from Blender ----------
   Each piece is placed many times and baked into a few big meshes (one per ink), so the screen draws them in one go. */
const inkFor=name=>name==='ink'?INKM():name==='snow'?inkMat(3):PAPER();
function scatter(name,places,ink){ // ink: use this ink for every piece instead of the model's own
  const T=ENV3D[name], buckets={}; if(!T) return;
  places.forEach(p=>{ const o=T.clone(true); o.position.set(p.x,p.y||0,p.z); o.rotation.y=p.ry||0; const s=p.s||1; o.scale.set(s*(p.sx||1),s*(p.sy||1),s*(p.sz||1)); o.updateMatrixWorld(true);
    o.traverse(m=>{ if(m.isMesh){ const k=ink||m.material.name||'paper'; (buckets[k]=buckets[k]||[]).push(m); } }); });
  for(const k in buckets) mergeStatic(buckets[k],inkFor(k));
}
// the workshop: giant tools dropped on the floor behind the lane, so Pip looks tiny, and test cones along the tape
function buildShop(){
  const r=rnd(11), Rr=(a,b)=>a+r()*(b-a);
  if(FLOORNUMS.lv===null&&LEVELS3DIR==='alt'){ // the launch room: giant tools in a loose ring round the pad
    const kinds=['shop_nut','shop_bolt','shop_pencil','shop_ruler','shop_spanner','shop_block','shop_washer'], spots={}; kinds.forEach(k=>spots[k]=[]);
    for(let i=0;i<16;i++){ const a=-Math.PI*.95+i/16*Math.PI*.9+Rr(-.08,.08), rr=Rr(16,46), k=kinds[i%kinds.length];
      spots[k].push({x:Math.cos(a)*rr*1.4, z:Math.sin(a)*rr-6, s:k==='shop_ruler'||k==='shop_pencil'||k==='shop_spanner'?Rr(1.4,2.2):Rr(2,3.6), ry:Rr(0,6)}); }
    for(const k in spots) scatter(k,spots[k]);
    const cones=[]; for(let i=0;i<10;i++){ const a=i/10*TAU+.3; cones.push({x:Math.cos(a)*4.6, z:Math.sin(a)*4.6, ry:a}); } scatter('shop_cone',cones);
    return; }
  const cones=[]; for(let x=-20;x<=420;x+=5) cones.push({x, z:-2.75, ry:Rr(0,6)});
  for(let x=-15;x<=420;x+=20) cones.push({x, z:2.75, ry:Rr(0,6)});
  scatter('shop_cone',cones);
  const kinds=['shop_nut','shop_bolt','shop_pencil','shop_ruler','shop_spanner','shop_block','shop_washer'], spots={};
  kinds.forEach(k=>spots[k]=[]);
  // a few near the start so the workshop reads straight away, then more along the course
  spots.shop_ruler.push({x:-18, z:-16, s:1.6, ry:.15}); spots.shop_pencil.push({x:16, z:-26, s:1.8, ry:-.35});
  spots.shop_nut.push({x:-14, z:-32, s:3.4, ry:.3}); spots.shop_block.push({x:30, z:-34, s:2.4, ry:.4},{x:32, y:4.8, z:-34.5, s:2.2, ry:.1});
  for(let x=35;x<460;x+=Rr(16,32)){ const k=kinds[Math.floor(r()*kinds.length)], far=r()<.5;
    const s=(k==='shop_cone'?1:k==='shop_ruler'||k==='shop_pencil'||k==='shop_spanner'?Rr(1.4,2.4):Rr(2.2,4))*(far?1.5:1);
    spots[k].push({x, z:far?Rr(-30,-48):Rr(-9,-20), s, ry:Rr(0,6)}); }
  for(const k in spots) scatter(k,spots[k]);
}
// a single piece with its own inks (for things that move, like clouds)
function single(name){ const o=ENV3D[name].clone(true); o.traverse(m=>{ if(m.isMesh) m.material=inkFor(m.material.name); }); return o; }
function buildScenery(){
  if(WORLD==='workshop') return buildShop();
  const r=rnd(7), Rr=(a,b)=>a+r()*(b-a);
  // mountains on the far horizon, with snowy tops
  const mtn=[]; for(let x=-160;x<780;x+=Rr(110,170)) mtn.push({x, y:-3, z:Rr(-300,-360), s:Rr(2.6,3.5), sy:Rr(.85,1.15), ry:Rr(-.25,.25)});
  scatter('mountains_a',mtn.filter((_,i)=>i%2===0)); scatter('mountains_b',mtn.filter((_,i)=>i%2===1));
  // rolling hills in front of them
  const hills=[]; for(let x=-90;x<720;x+=Rr(30,55)) hills.push({x, y:-1, z:Rr(-75,-130), s:Rr(14,26), sx:Rr(1.4,2), sy:Rr(.8,1.1), ry:Rr(0,6)});
  scatter('hill',hills);
  // a wood of mixed trees behind the road, thicker further back
  const kinds=['pine_tall','pine_short','tree_round'], trees={pine_tall:[],pine_short:[],tree_round:[]};
  for(let x=-40;x<560;x+=Rr(3,8)){ const k=kinds[Math.floor(r()*3)], z=Rr(-8,-34); trees[k].push({x, z, s:Rr(.8,1.5)*(z<-20?1.25:1), ry:Rr(0,6)}); }
  for(const k in trees) scatter(k,trees[k]);
  // bushes and rocks near the road, a few in front of it
  const bushes=[], rocks=[], rocks2=[];
  for(let x=-30;x<560;x+=Rr(5,13)){ bushes.push({x, z:r()<.75?Rr(-4,-9):Rr(4.5,9), s:Rr(.7,1.4), ry:Rr(0,6)}); }
  for(let x=-30;x<560;x+=Rr(9,20)){ (r()<.5?rocks:rocks2).push({x, y:-.1, z:r()<.6?Rr(-4,-12):Rr(5,10), s:Rr(.5,1.3), ry:Rr(0,6)}); }
  scatter('bush',bushes); scatter('rock_a',rocks); scatter('rock_b',rocks2);
  // grass tufts all along, so you can feel the speed
  const grass=[]; for(let x=-25;x<560;x+=Rr(.6,2.2)) grass.push({x, z:r()<.65?Rr(4.2,10):Rr(-3,-7), s:Rr(.8,1.6), ry:Rr(0,6)});
  scatter('grass',grass,'paper'); // paper blades with ink outlines: lighter than solid ink
  // clouds drifting high up, each on its own so it can move
  for(let i=0;i<16;i++){ const c=single(['cloud_a','cloud_b','cloud_c'][i%3]); at(c,-60+i*45+Rr(0,25),Rr(24,36),Rr(-70,-110)); c.scale.setScalar(Rr(2.4,4)); c.rotation.y=Rr(-.4,.4);
    c.userData.drift=Rr(.3,.7); scene.add(c); CLOUDS.push(c); }
}
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
