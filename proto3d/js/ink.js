/* Ink Works 3D prototype: the ink renderer.
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
const INK_FRAG=`
uniform vec3 uLight; uniform float uTone; uniform float uPR; uniform float uBoil; uniform float uFade;
varying vec3 vN; varying vec3 vW; varying vec3 vV;
void main(){
  if(uFade>0.){ vec2 q=floor(gl_FragCoord.xy/(2.*uPR)); if(mod(q.x+q.y,2.)<1.) discard; }
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(cameraPosition-vW);
  float d=dot(N,uLight);
  float c;
  if(uTone>.5&&uTone<1.5){ // ink: black, with a crisp white glint and a slightly lifted rim
    float sp=dot(reflect(-uLight,N),V); c=sp>.92?1.:(d>.55?.16:.04);
  } else if(uTone>2.5){ c=1.; } // paper that never shades (sky things, ground)
  else { // cel shading: lit paper, a soft grey shadow, a deeper core shadow
    c=d>.18?1.:(d>-.35?.84:.7);
    if(uTone>1.5) c*=.72; // a mid-grey surface (the silver flag)
    float rim=1.-max(dot(N,V),0.); if(d>.18&&rim>.82) c=.94; // a hint of edge falloff on lit sides
  }
  gl_FragColor=vec4(vec3(c),1.);
}`;
// surface direction and depth, for finding outlines
const NRM_VERT=`varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const NRM_FRAG=`uniform float uFade; uniform float uPR; varying vec3 vN;
void main(){ if(uFade>0.){ vec2 q=floor(gl_FragCoord.xy/(2.*uPR)); if(mod(q.x+q.y,2.)<1.) discard; }
  vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(n*.5+.5,1.); }`;
// the outline pass: ink where depth jumps or the surface turns sharply
const EDGE_FRAG=`
uniform sampler2D tN; uniform sampler2D tD; uniform vec2 uTexel; uniform float uPR; uniform float uBoil; uniform float uNear; uniform float uFar; uniform float uW;
varying vec2 vUv;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float iz(vec2 uv){ float z=texture2D(tD,uv).r*2.-1.; float d=2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); return 1./d; }
vec3 nn(vec2 uv){ return texture2D(tN,uv).xyz*2.-1.; }
void main(){
  vec2 px=vUv/uTexel/uPR;
  vec2 j=(vec2(vnoise(px*.045+uBoil*3.1), vnoise(px*.045-uBoil*2.7+17.))-.5)*uTexel*uPR*2.2; // the wobble
  vec2 uv=vUv+j;
  // thickness varies gently along the line, like a pen: outer edges bold, inside lines fine
  float pen=.75+.5*vnoise(px*.02+uBoil);
  float r=(uW*uPR*.5+.25)*pen, r2=max(.6,uW*uPR*.26)*pen;
  vec2 dx=vec2(uTexel.x*r,0.), dy=vec2(0.,uTexel.y*r), ex=vec2(uTexel.x*r2,0.), ey=vec2(0.,uTexel.y*r2);
  float c=iz(uv), l=iz(uv-dx), rr=iz(uv+dx), u=iz(uv+dy), d=iz(uv-dy);
  float de=max(abs(l+rr-2.*c), abs(u+d-2.*c))/max(c,1e-4);
  float c2=iz(uv), de2=max(abs(iz(uv-ex)+iz(uv+ex)-2.*c2), abs(iz(uv+ey)+iz(uv-ey)-2.*c2))/max(c2,1e-4);
  float ne=max(max(1.-dot(nn(uv-ex),nn(uv+ex)), 1.-dot(nn(uv-ey),nn(uv+ey))), 0.);
  float a=max(max(smoothstep(.06,.14,de), smoothstep(.025,.06,de2)*.9), smoothstep(.22,.45,ne)*.92);
  gl_FragColor=vec4(0.,0.,0.,a);
}`;

function inkInit(canvas){
  const R=new THREE.WebGLRenderer({canvas, antialias:false, alpha:false, powerPreference:'high-performance'});
  R.setClearColor(0xffffff,1); R.outputEncoding=THREE.LinearEncoding; R.sortObjects=true;
  INKR.renderer=R;
  INKR.rt=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  INKR.rt.depthTexture=new THREE.DepthTexture(4,4); INKR.rt.depthTexture.type=THREE.UnsignedIntType;
  INKR.edge=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader:EDGE_FRAG,
    uniforms:{tN:{value:INKR.rt.texture}, tD:{value:INKR.rt.depthTexture}, uTexel:{value:new THREE.Vector2()}, uPR:{value:1}, uBoil:{value:0}, uNear:{value:1}, uFar:{value:100}, uW:{value:2.6}},
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
  const u={uLight:{value:LIGHT}, uTone:{value:tone}, uPR:{value:INKR.PR}, uBoil:{value:0}, uFade:{value:0}};
  const m=new THREE.ShaderMaterial({vertexShader:INK_VERT, fragmentShader:INK_FRAG, uniforms:u, side:o.side||THREE.FrontSide});
  m.extensions={derivatives:false}; INKR.mats.push(m);
  m.userData.nm=new THREE.ShaderMaterial({vertexShader:NRM_VERT, fragmentShader:NRM_FRAG, uniforms:{uFade:u.uFade, uPR:u.uPR}, side:m.side});
  return m;
}
const PAPER=()=>inkMat(0), INKM=()=>inkMat(1);
function setFade(obj,on){ obj.traverse(o=>{ if(o.isMesh&&o.material.uniforms&&o.material.uniforms.uFade) o.material.uniforms.uFade.value=on?1:0; }); }
// meshes that shouldn't be outlined (shadows, the sky) live on layer 1
const NOEDGE=1;

const _swap=[];
function inkRender(scene,cam,t){
  const R=INKR.renderer, boil=RM?0:Math.floor(t*7)%5*1.37;
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
function defaultNM(m){ if(!_dnm) _dnm=new THREE.ShaderMaterial({vertexShader:NRM_VERT, fragmentShader:NRM_FRAG, uniforms:{uFade:{value:0},uPR:{value:1}}, side:THREE.DoubleSide}); return _dnm; }
