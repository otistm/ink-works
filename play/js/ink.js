/* Ink Works: the ink renderer.
   Everything is paper white. Shadow is drawn as hatching (one way, then crossed when darker),
   and ink outlines are found from depth and surface direction, with a slight hand-drawn wobble that "boils". */
"use strict";
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LIGHT=new THREE.Vector3(-.5,.85,.45).normalize(); // from the upper left, a little in front

const INKR={renderer:null, rt:null, quad:null, qScene:null, qCam:null, PR:1, W:1, H:1, boil:0, nmCache:new Map(), mats:[]};

// tone: 0 paper (hatched in shadow), 1 ink (solid black with a white glint), 2 always hatched, 3 paper that never hatches
const INK_VERT=`
varying vec3 vN; varying vec3 vW; varying vec3 vV;
void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal);
  vec4 mv=viewMatrix*w; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;
// LOOKS: one renderer, six ways to draw. 0 studio cel (the current look), 1 two-tone comic, 2 halftone print,
// 3 clean line, 4 soft graphite, 5 inked terminator, 6 studio cel with wobbly lines, 7 studio cel with steady pen lines. Pick one with ?look=N or setLook(N).
// boil: whether the lines redraw themselves a few times a second (the hand-drawn shimmer).
const LOOKS=[
  {name:'Studio cel',       w:2.4, wob:0,   pen:0,  ink:0,   crease:.92, boil:false}, // clean, even lines: nothing hand-drawn about them
  {name:'Two-tone comic',   w:4.2, wob:2.6, pen:.6, ink:0,   crease:.75},
  {name:'Halftone print',   w:2.4, wob:0,   pen:.15,ink:0,   crease:.9},
  {name:'Clean line',       w:2.0, wob:0,   pen:0,  ink:0,   crease:1},
  {name:'Soft graphite',    w:2.2, wob:1.4, pen:.7, ink:.22, crease:.6},
  {name:'Inked terminator', w:3.0, wob:1.6, pen:.45,ink:0,   crease:.85},
  {name:'Studio cel, wobbly',w:2.6, wob:2.2, pen:.5, ink:0,   crease:.92, look:0},
  {name:'Studio cel, pen lines',w:2.6, wob:0, pen:.5, ink:0,   crease:.92, look:0, boil:false}];
const LOOKU={value:0};
const INK_FRAG=`
uniform vec3 uLight; uniform float uTone; uniform float uPR; uniform float uBoil; uniform float uFade; uniform float uLook;
varying vec3 vN; varying vec3 vW; varying vec3 vV;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  if(uFade>0.){ vec2 q=floor(gl_FragCoord.xy/(2.*uPR)); if(mod(q.x+q.y,2.)<1.) discard; }
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(cameraPosition-vW);
  float d=dot(N,uLight), rim=1.-max(dot(N,V),0.);
  float sp=dot(reflect(-uLight,N),V);
  bool ink=uTone>.5&&uTone<1.5, plain=uTone>2.5, grey=uTone>1.5&&uTone<2.5;
  int L=int(uLook+.5);
  float c=1.;
  if(L==1){ // two-tone comic: lit paper, solid ink shadow, nothing between
    if(ink) c=sp>.9?1.:0.; else if(plain) c=1.; else c=(d>-.12||grey&&d>.4)?(grey?.55:1.):0.;
    if(!ink&&!plain&&d<=-.12&&rim>.7) c=1.; // a paper rim so dark shapes still read
  } else if(L==2){ // halftone print: shade is a dot screen, bigger dots where it's darker
    if(ink) c=sp>.92?1.:0.; else if(plain) c=1.; else {
      float dark=clamp((.45-d)/1.35,0.,1.); if(grey) dark=max(dark,.45);
      vec2 p=gl_FragCoord.xy/uPR; float a=.785; p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
      vec2 cell=fract(p/5.)-.5; float r=sqrt(dark)*.62;
      c=length(cell)<r?0.:1.; }
  } else if(L==3){ // clean line: plain paper and plain ink, the lines do all the work
    c=ink?0.:(grey?.78:1.);
  } else if(L==4){ // soft graphite: three soft grey steps on toothy paper
    if(ink) c=sp>.9?.92:(d>.4?.3:.2); else if(plain) c=1.; else {
      c=mix(.66,1.,smoothstep(-.45,-.1,d)); c=mix(c,.8,(1.-smoothstep(-.1,.3,d))*.4); if(grey) c*=.8; }
    c*=.95+.05*h21(floor(gl_FragCoord.xy/(1.5*uPR)));
  } else if(L==5){ // inked terminator: two plain tones with an ink line where light turns to shadow
    if(ink) c=sp>.92?1.:(d>.5?.2:.05); else if(plain) c=1.; else {
      c=d>.1?1.:.62; if(grey) c*=.75;
      float w=fwidth(d)*1.6; if(abs(d-.1)<w) c=0.;
      if(d<=.1&&rim>.78) c=.9; } // back light on the shadow edge
  } else { // 0 studio cel: lit paper, a soft grey shadow, a deeper core shadow
    if(ink) c=sp>.92?1.:(d>.55?.16:.04); else if(plain) c=1.; else {
      c=d>.18?1.:(d>-.35?.84:.7); if(grey) c*=.72; if(d>.18&&rim>.82) c=.94; }
  }
  gl_FragColor=vec4(vec3(c),1.);
}`;
// surface direction and depth, for finding outlines
const NRM_VERT=`varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const NRM_FRAG=`uniform float uFade; uniform float uPR; uniform float uShell; varying vec3 vN;
void main(){ if(uFade>0.){ vec2 q=floor(gl_FragCoord.xy/(2.*uPR)); if(mod(q.x+q.y,2.)<1.) discard; }
  vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1.-uShell); }`;
// the outline pass: ink where depth jumps or the surface turns sharply
const EDGE_FRAG=`
uniform sampler2D tN; uniform sampler2D tD; uniform vec2 uTexel; uniform float uPR; uniform float uBoil; uniform float uNear; uniform float uFar; uniform float uW; uniform float uWob; uniform float uPen; uniform float uInk; uniform float uCrease;
varying vec2 vUv;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float iz(vec2 uv){ float z=texture2D(tD,uv).r*2.-1.; float d=2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); return 1./d; }
vec3 nn(vec2 uv){ return texture2D(tN,uv).xyz*2.-1.; }
bool shelled(vec2 uv){ return texture2D(tN,uv).a<.5; } // a piece that draws its own smooth outline (the board)
// a neighbour's depth and direction, except where the board is in front of this spot: that counts as no jump (its shell draws that edge)
float zN(vec2 uv,vec2 o,float c){ float z=iz(uv+o); return shelled(uv+o)&&z>c?c:z; }
vec3 nN(vec2 uv,vec2 o,float c){ return shelled(uv+o)&&iz(uv+o)>c?nn(uv):nn(uv+o); }
void main(){
  vec2 px=vUv/uTexel/uPR;
  vec2 j=(vec2(vnoise(px*.045+uBoil*3.1), vnoise(px*.045-uBoil*2.7+17.))-.5)*uTexel*uPR*uWob; // the wobble
  vec2 uv=vUv+j;
  // thickness varies gently along the line, like a pen: outer edges bold, inside lines fine
  float pen=1.-uPen*.5+uPen*vnoise(px*.02+uBoil);
  float r=(uW*uPR*.5+.25)*pen, r2=max(.6,uW*uPR*.26)*pen;
  vec2 dx=vec2(uTexel.x*r,0.), dy=vec2(0.,uTexel.y*r), ex=vec2(uTexel.x*r2,0.), ey=vec2(0.,uTexel.y*r2);
  if(shelled(uv)){ gl_FragColor=vec4(0.); return; } // no outline step on the board itself: its ink shell outlines it
  float c=iz(uv), l=zN(uv,-dx,c), rr=zN(uv,dx,c), u=zN(uv,dy,c), d=zN(uv,-dy,c);
  float de=max(abs(l+rr-2.*c), abs(u+d-2.*c))/max(c,1e-4);
  float c2=c, de2=max(abs(zN(uv,-ex,c)+zN(uv,ex,c)-2.*c2), abs(zN(uv,ey,c)+zN(uv,-ey,c)-2.*c2))/max(c2,1e-4);
  float ne=max(max(1.-dot(nN(uv,-ex,c),nN(uv,ex,c)), 1.-dot(nN(uv,-ey,c),nN(uv,ey,c))), 0.);
  float soft=uPen>.01||uWob>.01?1.:.45; // hand-drawn looks keep a soft edge; clean lines are crisp
  float a=max(max(smoothstep(.1-.04*soft,.1+.04*soft,de), smoothstep(.042-.017*soft,.042+.017*soft,de2)*.9), smoothstep(.335-.115*soft,.335+.115*soft,ne)*uCrease);
  gl_FragColor=vec4(vec3(uInk),a);
}`;

function inkInit(canvas){
  const R=new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'}); // smooths the edges of solid shapes (not the outline step)
  R.setClearColor(0xffffff,1); R.outputEncoding=THREE.LinearEncoding; R.sortObjects=true;
  INKR.renderer=R;
  INKR.rt=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  INKR.rt.depthTexture=new THREE.DepthTexture(4,4); INKR.rt.depthTexture.type=THREE.UnsignedIntType;
  INKR.edge=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader:EDGE_FRAG,
    uniforms:{tN:{value:INKR.rt.texture}, tD:{value:INKR.rt.depthTexture}, uTexel:{value:new THREE.Vector2()}, uPR:{value:1}, uBoil:{value:0}, uNear:{value:1}, uFar:{value:100}, uW:{value:2.6}, uWob:{value:2.2}, uPen:{value:.5}, uInk:{value:0}, uCrease:{value:.92}},
    transparent:true, depthTest:false, depthWrite:false});
  INKR.quad=new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2), INKR.edge); INKR.quad.frustumCulled=false;
  INKR.qScene=new THREE.Scene(); INKR.qScene.add(INKR.quad); INKR.qCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
}
function inkSize(w,h,pr){ const R=INKR.renderer; INKR.W=w; INKR.H=h; INKR.PR=pr;
  R.setPixelRatio(pr); R.setSize(w,h,false); const bw=Math.round(w*pr), bh=Math.round(h*pr);
  INKR.rt.setSize(bw,bh); INKR.edge.uniforms.uTexel.value.set(1/bw,1/bh); INKR.edge.uniforms.uPR.value=pr;
  INKR.mats.forEach(m=>m.uniforms.uPR.value=pr); }

// one ink material per mesh (so a single part can fade) paired with its outline-pass material
function inkMat(tone,o){ o=o||{};
  const u={uLight:{value:LIGHT}, uTone:{value:tone}, uPR:{value:INKR.PR}, uBoil:{value:0}, uFade:{value:0}, uLook:LOOKU};
  const m=new THREE.ShaderMaterial({vertexShader:INK_VERT, fragmentShader:INK_FRAG, uniforms:u, side:o.side||THREE.FrontSide});
  m.extensions={derivatives:true}; INKR.mats.push(m);
  m.userData.nm=new THREE.ShaderMaterial({vertexShader:NRM_VERT, fragmentShader:NRM_FRAG, uniforms:{uFade:u.uFade, uPR:u.uPR, uShell:{value:0}}, side:m.side});
  return m;
}
const PAPER=()=>inkMat(0), INKM=()=>inkMat(1);
// pieces outlined by their own ink shell still hide what's behind them from the outline step, but draw no outline there themselves
let _shellNM=null; const shellNM=()=>_shellNM||(_shellNM=new THREE.ShaderMaterial({vertexShader:NRM_VERT, fragmentShader:NRM_FRAG, uniforms:{uFade:{value:0},uPR:{value:1},uShell:{value:1}}}));
function setLook(n){ n=clamp(n|0,0,LOOKS.length-1); const L=LOOKS[n], u=INKR.edge.uniforms; LOOKU.value=L.look!=null?L.look:n;
  u.uW.value=L.w; u.uWob.value=L.wob; u.uPen.value=L.pen; u.uInk.value=L.ink; u.uCrease.value=L.crease; INKR.look=n; INKR.boil=L.boil!==false; return L.name; }
function setFade(obj,on){ obj.traverse(o=>{ if(o.isMesh&&o.material.uniforms&&o.material.uniforms.uFade) o.material.uniforms.uFade.value=on?1:0; }); }
// meshes that shouldn't be outlined (shadows, the sky) live on layer 1
const NOEDGE=1;

const _swap=[];
function inkRender(scene,cam,t){
  const R=INKR.renderer, boil=RM||!INKR.boil?0:Math.floor(t*7)%5*1.37;
  INKR.mats.forEach(m=>{ m.uniforms.uBoil.value=boil; });
  INKR.edge.uniforms.uBoil.value=boil; INKR.edge.uniforms.uNear.value=cam.near; INKR.edge.uniforms.uFar.value=cam.far;
  // 1: paper and hatching, straight to the screen
  cam.layers.enableAll(); R.setRenderTarget(null); R.autoClear=true; R.render(scene,cam);
  // 2: directions and depth, for the outlines
  _swap.length=0; scene.traverse(o=>{ if(o.isMesh&&o.visible){ const nm=o.material.userData&&o.material.userData.nm; _swap.push(o,o.material); o.material=nm||defaultNM(o.material); } });
  cam.layers.set(0); R.setRenderTarget(INKR.rt); R.setClearColor(0x8080ff,1); R.clear(); R.render(scene,cam); R.setClearColor(0xffffff,1);
  for(let i=0;i<_swap.length;i+=2) _swap[i].material=_swap[i+1];
  cam.layers.enableAll();
  // 3: lay the ink lines over the top
  R.setRenderTarget(null); R.autoClear=false; R.render(INKR.qScene,INKR.qCam); R.autoClear=true;
}
let _dnm=null;
function defaultNM(m){ if(!_dnm) _dnm=new THREE.ShaderMaterial({vertexShader:NRM_VERT, fragmentShader:NRM_FRAG, uniforms:{uFade:{value:0},uPR:{value:1},uShell:{value:0}}, side:THREE.DoubleSide}); return _dnm; }
