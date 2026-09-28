/* Ink Works: drawing the bench and the world (ground, clouds, marks, the machine). */
"use strict";
/* ---------- drawing ---------- */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  if(GS.mode==='build') drawBuild();
  else if(GS.mode==='run'||GS.mode==='done') GS.S.kind==='bridge'?drawBridgeRun():GS.S.kind==='watch'?drawWatchRun():drawWorld();
  else drawHomeBg();
  // screen-space puffs (build)
  GS.fx.filter(f=>f.screen).forEach(f=>{ const u=f.t/f.life, r=f.r+f.g*Math.sqrt(u); ctx.setTransform(DPR,0,0,DPR,0,0); ctx.globalAlpha=1-u; ctx.beginPath(); ctx.arc(f.sx,f.sy-u*10,r,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#000'; ctx.stroke(); ctx.globalAlpha=1; });
}
function drawHomeBg(){ // a few drifting ink clouds behind the card
  ctx.setTransform(DPR,0,0,DPR,0,0); }
function drawBuild(){
  const g=grid(), cs=g.cs, now=performance.now();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // the bench: dotted cells
  ctx.save(); ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.globalAlpha=.22; ctx.setLineDash([2,4]);
  for(let x=0;x<GW;x++) for(let y=0;y<GH;y++){ const sx=g.cx+(x-3.5)*cs, sy=g.cy+(y-3.5)*cs; ctx.strokeRect(sx+.5,sy+.5,cs-1,cs-1); }
  ctx.restore(); ctx.save(); ctx.fillStyle='#000'; ctx.globalAlpha=.35;
  for(let x=0;x<=GW;x++) for(let y=0;y<=GH;y++){ ctx.beginPath(); ctx.arc(g.cx+(x-3.5)*cs,g.cy+(y-3.5)*cs,1.4,0,TAU); ctx.fill(); } ctx.restore();
  if(GS.lv.kind==='bridge'){ GS.view=g; const B=bridgeGraph(GS.design), att=attachedBridge(GS.design);
    drawBridge(B.nodes.map(n=>({k:n.k,x:n.x,y:-n.y,gx:n.x,gy:n.y})),B.links,{att,placed:GS.placed,now}); return; }
  const watch=GS.lv.kind==='watch', Gs=watch?gearSpeeds(GS.design):null;
  // balance point: little pointers on the bench edges, and a faint dot
  const S=makeSim(GS.design,GS.lv); if(S.P.length>1&&!watch){ const core=S.P.find(p=>p.k==='core');
    const bx=core.bx-core.rx, by=core.by-core.ry; const sx=g.cx+bx*cs, sy=g.cy-by*cs, L=g.cx-3.5*cs, B=g.cy+3.5*cs; ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.moveTo(sx,B+3); ctx.lineTo(sx-7,B+13); ctx.lineTo(sx+7,B+13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L-3,sy); ctx.lineTo(L-13,sy-7); ctx.lineTo(L-13,sy+7); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha=.5; ctx.setLineDash([3,4]); ctx.lineWidth=1.2; ctx.strokeStyle='#000'; ctx.beginPath(); ctx.moveTo(sx,B); ctx.lineTo(sx,sy); ctx.moveTo(L,sy); ctx.lineTo(sx,sy); ctx.stroke(); ctx.restore();
    ctx.font='800 11px Figtree, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('balance',sx,B+15); }

  // parts
  const att=GS.lv.kind==='watch'?new Set(Object.keys(GS.design)):attached(GS.design); LW=INK/cs; // gears don't fall off; they just don't turn
  const look=[Math.sin(GS.t*.7)*.6,Math.sin(GS.t*.43)*.3], blink=(GS.t%3.7)<.12;
  const order=Object.keys(GS.design).sort((a,b)=>(GS.design[a].k==='balloon')-(GS.design[b].k==='balloon'));
  order.forEach(kk=>{ const c=GS.design[kk], [gx,gy]=kk.split(',').map(Number);
    ctx.setTransform(cs*DPR,0,0,-cs*DPR,DPR*(g.cx+(gx-3)*cs),DPR*(g.cy+(gy-3)*cs));
    const pu=GS.placed[kk]?Math.min(1,(now-GS.placed[kk])/380):1;
    if(watch){ if(Gs.jams.has(kk)&&!RM) ctx.translate((Math.random()-.5)*.06,(Math.random()-.5)*.06); // jammed gears shake
      drawPart(c,{pop:RM?1:pu,alpha:att.has(kk)?1:.35,look,blink,gear:true,scared:Gs.jam,spin:Gs.jam?0:(Gs.spd[kk]||0)*GS.t/6*TAU}); }
    else drawPart(c,{pop:RM?1:pu,alpha:att.has(kk)?1:.35,look,blink,bob:Math.sin(GS.t*2+gx),spin:c.k==='motor'||c.k==='wheel'?GS.t*.3:GS.t});
    if(PARTS[c.k].rot&&att.has(kk)&&!watch){ // a small arrow showing the push
      const [dx,dy]=DIRS[c.d]; ctx.save(); ctx.translate(dx*.62,dy*.62); ctx.rotate(Math.atan2(dy,dx)); ctx.beginPath(); ctx.moveTo(.13,0); ctx.lineTo(-.07,.1); ctx.lineTo(-.07,-.1); ctx.closePath(); ctx.fillStyle='#000'; ctx.fill(); ctx.restore(); }
  });
  if(watch) order.forEach(kk=>{ const c=GS.design[kk]; if(!PARTS[c.k].rot) return; const [gx,gy]=kk.split(',').map(Number); // double gears: an arrow to the small side, over everything
    ctx.setTransform(cs*DPR,0,0,-cs*DPR,DPR*(g.cx+(gx-3)*cs),DPR*(g.cy+(gy-3)*cs)); gearArrow(c.d); });
}
function gearArrow(d){ const [dx,dy]=DIRS[d]; ctx.save(); ctx.translate(dx*.36,dy*.36); ctx.rotate(Math.atan2(dy,dx));
  ctx.beginPath(); ctx.moveTo(.2,0); ctx.lineTo(-.06,.15); ctx.lineTo(-.06,-.15); ctx.closePath(); ctx.fillStyle='#000'; ctx.fill(); ctx.lineWidth=LW*.8; ctx.strokeStyle='#fff'; ctx.stroke(); ctx.restore(); }
function w2s(x,y){ const z=GS.cam.z; return [W/2+(x-GS.cam.x)*z+sh[0], H*.56-(y-GS.cam.y)*z+sh[1]]; }
let sh=[0,0];
function drawWorld(){
  const S=GS.S, z=GS.cam.z, lv=GS.lv, T=S.T;
  sh=RM?[0,0]:[(Math.random()-.5)*GS.shake*10,(Math.random()-.5)*GS.shake*10];
  const x0=GS.cam.x-W/2/z-2, x1=GS.cam.x+W/2/z+2, yTop=GS.cam.y+H*.56/z, yBot=GS.cam.y-H*.44/z;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // clouds (parallax), tiled so they never run out
  { const pz=z*.6, par=.5, cxm=GS.cam.x*par, cym=GS.cam.y*par, span=W/2/pz+20;
    for(let ti=Math.floor((cxm-span)/30); ti<=Math.floor((cxm+span)/30); ti++){ const R=seeded(9973+ti*131);
      [[8,40],[40,250],[250,1100]].forEach(([lo,hi])=>{ const cx=ti*30+R()*30, cy=lo+R()*(hi-lo), s=1.2+R()*2;
        const sx=W/2+(cx-cxm)*pz, sy=H*.56-(cy-cym)*pz; if(sy<-80||sy>H+80) return; cloud(sx,sy,s*pz); }); } }
  // height lines for height goals, finish posts for distance goals
  ctx.font='800 12px Figtree, system-ui, sans-serif'; ctx.textBaseline='middle';
  if(lv.goal==='alt') lv.marks.forEach((m,i)=>{ const [,sy]=w2s(0,S.y0+m); if(sy<-10||sy>H+10) return; ctx.save(); ctx.setLineDash([6,6]); ctx.lineWidth=1.5; ctx.strokeStyle='#000'; ctx.globalAlpha=.5; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W,sy); ctx.stroke(); ctx.restore(); flagLabel(W-12,sy,i+1,m+' m','right'); });
  if(lv.goal==='alt'||lv.start){ // a height ruler, from the start (or, for a drop, from the ground)
    const y0=lv.start?0:S.y0, big=lv.start?20:50;
    ctx.save(); ctx.strokeStyle='#000'; ctx.fillStyle='#000'; ctx.lineWidth=1.5; const step=10; for(let a=Math.floor((yBot-y0)/step)*step;a<yTop-y0;a+=step){ if(a<0) continue; const [,sy]=w2s(0,y0+a); const b=a%big===0; ctx.globalAlpha=b?.8:.35; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(b?16:8,sy); ctx.stroke(); if(b&&a>0){ ctx.textAlign='left'; ctx.fillText(a+' m',20,sy); } } ctx.restore(); }
  if(lv.start) dropTower(S);
  if(lv.goal==='dist') lv.marks.forEach((m,i)=>{ const x=S.x0+m, [sx,sy]=w2s(x,Math.max(0,T.h(x))); if(sx<-40||sx>W+40) return; ctx.save(); ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy-70); ctx.stroke(); ctx.restore(); flagLabel(sx,sy-78,i+1,m+' m','center'); });
  // ground
  ctx.beginPath(); let first=true; const stp=.5;
  for(let x=Math.floor(x0);x<=x1;x+=stp){ const h=T.h(x); const [sx,sy]=w2s(x,h<-1e3?-40:h); first?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); first=false; }
  ctx.lineTo(W+20,H+20); ctx.lineTo(-20,H+20); ctx.closePath(); ctx.fillStyle='#fff'; ctx.fill();
  const [ox,oy]=w2s(0,0); ctx.save(); if(HATCH.setTransform) HATCH.setTransform(new DOMMatrix().translateSelf(ox*DPR,oy*DPR)); ctx.fillStyle=HATCH; ctx.globalAlpha=.5; ctx.fill(); ctx.restore();
  ctx.lineWidth=INK; ctx.strokeStyle='#000'; ctx.lineJoin='round';
  ctx.beginPath(); first=true; for(let x=Math.floor(x0);x<=x1;x+=stp){ const h=T.h(x), [sx,sy]=w2s(x,h<-1e3?-40:h); first?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy); first=false; } ctx.stroke();
  // distance ticks
  ctx.fillStyle='#000'; ctx.textAlign='center'; for(let d=Math.ceil((x0-S.x0)/10)*10; d<x1-S.x0; d+=10){ if(d<0) continue; const x=S.x0+d, h=T.h(x); if(h<-1e3) continue; const [sx,sy]=w2s(x,h); ctx.globalAlpha=d%50?.3:.8; ctx.fillRect(sx-1,sy+4,2,d%50?6:10); if(d%50===0&&d>0) ctx.fillText(d+' m',sx,sy+24); } ctx.globalAlpha=1;
  // start line
  { const [sx,sy]=w2s(S.x0,0); ctx.save(); for(let i=0;i<4;i++){ ctx.fillStyle=i%2?'#fff':'#000'; ctx.fillRect(sx-3,sy+2+i*5,6,5); } ctx.restore(); }
  // puffs: all outlines, then all fills, like merged clouds of ink
  const P=GS.fx.filter(f=>f.k==='puff'&&!f.screen), rad=f=>{ const u=f.t/f.life; return (f.r+f.g*Math.sqrt(u))*(u>.6?Math.max(0,1-(u-.6)/.4):1)*z; };
  ctx.beginPath(); P.forEach(f=>{ const [sx,sy]=w2s(f.x,f.y), r=rad(f)+2.2; ctx.moveTo(sx+r,sy); ctx.arc(sx,sy,r,0,TAU); }); ctx.fillStyle='#000'; ctx.fill();
  ctx.beginPath(); P.forEach(f=>{ const [sx,sy]=w2s(f.x,f.y), r=rad(f); ctx.moveTo(sx+r,sy); ctx.arc(sx,sy,r,0,TAU); }); ctx.fillStyle='#fff'; ctx.fill();
  // stars
  GS.fx.filter(f=>f.k==='star').forEach(f=>{ const [sx,sy]=w2s(f.x,f.y), u=f.t/f.life, r=9*(1-u*.5); ctx.save(); ctx.translate(sx,sy); ctx.rotate(f.rot+u*3); ctx.globalAlpha=1-u*u; ctx.beginPath(); for(let k=0;k<10;k++){ const a=k/10*TAU, rr2=k%2?r*.42:r; k?ctx.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2):ctx.moveTo(rr2,0); } ctx.closePath(); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=2; ctx.stroke(); ctx.restore(); });
  // loose parts
  LW=INK/z; GS.loose.forEach(L=>{ const [sx,sy]=w2s(L.x,L.y); ctx.setTransform(z*DPR,0,0,-z*DPR,sx*DPR,sy*DPR); ctx.rotate(L.a); drawPart(L.p,{alpha:.9}); });
  // the machine, squashing before launch (anticipation)
  const [mx,my]=w2s(S.x,S.y); let sqx=1,sqy=1;
  if(GS.pre>0){ const u=1-GS.pre/.55; sqy=1-.12*Math.sin(u*Math.PI*.5); sqx=1+.08*Math.sin(u*Math.PI*.5); }
  ctx.setTransform(z*DPR,0,0,-z*DPR,mx*DPR,my*DPR); ctx.rotate(S.a); ctx.scale(sqx,sqy);
  const sp=Math.hypot(S.vx,S.vy), lx=sp>1?S.vx/sp:0, ly=sp>1?S.vy/sp:0, ca=Math.cos(-S.a), sa=Math.sin(-S.a);
  const look=[lx*ca-ly*sa, lx*sa+ly*ca], blink=(GS.t%3.1)<.1, scared=S.w*S.w>9||S.why==='canyon'||(lv.start&&S.vy<-9)||GS.cracked;
  const fuelF=S.fuel0?Math.min(1,S.fuel/Math.max(.01,S.n.fuel*K.tankFuel||S.fuel0)):0, chg=S.energy0?S.energy/S.energy0:0;
  const layer=k=>k==='balloon'?2:k==='chute'?1:0; // parachutes over the machine, balloons over everything
  const draws=[...S.P].sort((a,b)=>layer(a.k)-layer(b.k));
  draws.forEach(p=>{ ctx.save(); ctx.translate(p.rx,p.ry);
    drawPart(p,{look,blink,scared,open:S.open,cracked:GS.cracked,spin:p.k==='motor'?S.spin*.5:p.k==='prop'?GS.t*40:S.spin,spinning:S.propping&&p.k==='prop',flame:S.burning&&GS.pre<=0?.6+Math.random()*.6:0,fuel:fuelF,charge:chg,bob:Math.sin(GS.t*2+p.gx)});
    ctx.restore(); });
}
function cloud(x,y,s){ ctx.save(); ctx.translate(x,y); const b=[[-1,0,.8],[0,-.4,1],[1,0,.75],[.3,.25,.7],[-.5,.25,.6]];
  ctx.beginPath(); b.forEach(([bx,by,r])=>{ ctx.moveTo(bx*s+r*s+1.8,by*s); ctx.arc(bx*s,by*s,r*s+1.8,0,TAU); }); ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fill();
  ctx.beginPath(); b.forEach(([bx,by,r])=>{ ctx.moveTo(bx*s+r*s,by*s); ctx.arc(bx*s,by*s,r*s,0,TAU); }); ctx.fillStyle='#fff'; ctx.fill(); ctx.restore(); }
function flagLabel(x,y,m,txt,align){ ctx.save(); ctx.font='800 12px Figtree, system-ui, sans-serif'; const w=ctx.measureText(txt).width+34, h=24;
  const lx=align==='right'?x-w:align==='center'?x-w/2:x; ctx.beginPath(); ctx.roundRect?ctx.roundRect(lx,y-h/2,w,h,12):ctx.rect(lx,y-h/2,w,h); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#000'; ctx.stroke();
  // mini medal
  const cx=lx+13, cy=y; ctx.beginPath(); ctx.arc(cx,cy,7,0,TAU); if(m===3){ ctx.fillStyle='#000'; ctx.fill(); } else { ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=1.8; ctx.stroke(); if(m===2){ ctx.save(); ctx.clip(); ctx.lineWidth=1.3; for(let i=-10;i<10;i+=3){ ctx.beginPath(); ctx.moveTo(cx+i,cy+8); ctx.lineTo(cx+i+8,cy-8); ctx.stroke(); } ctx.restore(); } else { ctx.beginPath(); ctx.arc(cx,cy,3.5,0,TAU); ctx.stroke(); } }
  ctx.fillStyle='#000'; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(txt,lx+25,y+.5); ctx.restore(); }

/* ---------- the egg drop's tower ---------- */
function dropTower(S){
  if(S.top==null) S.top=S.P.reduce((m,p)=>Math.max(m,p.ry+(p.k==='chute'?.3:.5)),.5);
  const top=S.lv.start, arm=top+S.top+1.2;
  const P=[[-8,0],[-8,top+2],[-5,top+2],[-5,0]].map(([x,y])=>w2s(x,y));
  ctx.beginPath(); P.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle='#fff'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle=HATCH; ctx.globalAlpha=.35; ctx.fillRect(0,0,W,H); ctx.restore();
  ctx.lineWidth=INK; ctx.strokeStyle='#000'; ctx.stroke();
  ctx.lineWidth=1.5; ctx.beginPath(); for(let y=0;y<top;y+=4){ const [a,b]=w2s(-8,y), [c,d]=w2s(-5,y+4); ctx.moveTo(a,b); ctx.lineTo(c,d); } ctx.stroke();
  // the crane arm, and the rope that lets go on "Drop!"
  const [ax,ay]=w2s(-6.5,arm), [bx,by]=w2s(.6,arm); ctx.lineWidth=INK*1.6; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  const [hx,hy]=w2s(0,arm); ctx.lineWidth=2; ctx.beginPath();
  if(GS.pre>0){ const [mx,my]=w2s(S.x,S.y+S.top); ctx.moveTo(hx,hy); ctx.lineTo(mx,my); ctx.stroke(); }
  else { ctx.moveTo(hx,hy); ctx.lineTo(hx,hy+10); ctx.stroke(); ctx.beginPath(); ctx.arc(hx+3,hy+13,4,Math.PI*.9,Math.PI*2.2); ctx.stroke(); }
}

/* ---------- the bridge ---------- */
const BSTYLE={road:{w:.26,fill:'#fff'}, wood:{w:.17,fill:'#fff'}, steel:{w:.15,fill:'#000'}, cable:{w:0}};
// N: joints {k,x,y,gx,gy} with y up, in bench cells; L: beams {a,b,m,broken,load}
function drawBridge(N,L,o){ const g=GS.view, cs=g.cs, xy=bridgeXY;
  const roadY=xy(0,-ROAD)[1], top=roadY-BSTYLE.road.w*cs/2;
  // the cliffs
  [[-1,-.55],[1,GW-.45]].forEach(([side,fx])=>{ const ex=xy(fx,0)[0], far=side<0?-20:W+20, R=seeded(side<0?11:23);
    ctx.beginPath(); ctx.moveTo(far,top); ctx.lineTo(ex,top); let y=top; while(y<H+20){ y+=cs*(.35+R()*.5); ctx.lineTo(ex+side*R()*cs*.18,y); } ctx.lineTo(far,H+20); ctx.closePath();
    ctx.fillStyle='#fff'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle=HATCH; ctx.globalAlpha=.5; ctx.fillRect(0,0,W,H); ctx.restore(); ctx.lineWidth=INK; ctx.strokeStyle='#000'; ctx.lineJoin='round'; ctx.stroke(); });
  // the road carries on over the clifftops
  bar(-20,roadY,xy(-1,0)[0],roadY,'road',cs,0); bar(xy(GW,0)[0],roadY,W+20,roadY,'road',cs,0);
  if(o.run){ const ry=xy(0,-7.4)[1], x0=xy(-.4,0)[0], x1=xy(GW-.6,0)[0]; ctx.save(); ctx.lineWidth=2; ctx.globalAlpha=.6;
    for(let i=0;i<3;i++){ ctx.beginPath(); for(let x=x0;x<x1;x+=4){ const y=ry+i*9+Math.sin(x*.08+GS.t*2+i)*2.5; x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke(); } ctx.restore(); }
  const vis=l=>l.m==='bolt'?(N[l.a].k==='bank'?N[l.b].k:N[l.a].k):l.m, ord={cable:0,steel:1,wood:2,road:3};
  const faded=i=>o.att&&N[i].k!=='bank'&&!o.att.has(N[i].gx+','+N[i].gy);
  L.filter(l=>!l.broken).sort((p,q)=>ord[vis(p)]-ord[vis(q)]).forEach(l=>{ const a=N[l.a], b=N[l.b], [x1,y1]=xy(a.x,a.y), [x2,y2]=xy(b.x,b.y);
    ctx.save(); if(faded(l.a)||faded(l.b)) ctx.globalAlpha=.35; bar(x1,y1,x2,y2,vis(l),cs,o.run?l.load:0); ctx.restore(); });
  // the joints
  N.forEach((n,i)=>{ if(n.k==='bank'||n.k==='road') return; const key=n.gx+','+n.gy, [x,y]=xy(n.x,n.y);
    const pu=o.placed&&o.placed[key]?Math.min(1,(o.now-o.placed[key])/300):1, r=cs*(n.k==='cable'?.07:.1)*(pu<1?1+.6*Math.sin(pu*Math.PI):1);
    ctx.save(); if(faded(i)) ctx.globalAlpha=.35; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fillStyle=n.k==='steel'?'#000':'#fff'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#000'; ctx.stroke();
    if(n.k==='wood'){ ctx.beginPath(); ctx.arc(x,y,r*.35,0,TAU); ctx.fillStyle='#000'; ctx.fill(); } ctx.restore(); });
}
function bar(x1,y1,x2,y2,m,cs,load){ const S=BSTYLE[m]||BSTYLE.wood;
  if(load>.8&&!RM){ const j=(load-.8)*cs*.12; x1+=(Math.random()-.5)*j; y1+=(Math.random()-.5)*j; x2+=(Math.random()-.5)*j; y2+=(Math.random()-.5)*j; }
  ctx.lineCap='round'; ctx.strokeStyle='#000';
  if(!S.w){ ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  else { const w=S.w*cs; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    if(S.fill==='#fff'){ ctx.lineWidth=Math.max(1,w-2*INK); ctx.strokeStyle='#fff'; ctx.stroke(); ctx.strokeStyle='#000';
      if(m==='road'){ ctx.lineWidth=1.5; ctx.setLineDash([5,5]); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]); } } }
  if(load>.55){ // strain marks: more of them the closer it is to snapping
    const mx=(x1+x2)/2, my=(y1+y2)/2, L=Math.hypot(x2-x1,y2-y1)||1, nx=-(y2-y1)/L, ny=(x2-x1)/L, tx=(x2-x1)/L, ty=(y2-y1)/L, n=load>.8?3:2;
    ctx.lineWidth=2; ctx.lineCap='butt'; ctx.beginPath();
    for(let i=0;i<n;i++){ const d=(i-(n-1)/2)*7; [1,-1].forEach(sd=>{ ctx.moveTo(mx+tx*d+sd*nx*cs*.2,my+ty*d+sd*ny*cs*.2); ctx.lineTo(mx+tx*d+sd*nx*cs*.32,my+ty*d+sd*ny*cs*.32); }); }
    ctx.stroke(); }
}
function drawBridgeRun(){ const S=GS.S, g=GS.view, cs=g.cs;
  const sx=RM?0:(Math.random()-.5)*GS.shake*10, sy=RM?0:(Math.random()-.5)*GS.shake*10;
  ctx.setTransform(DPR,0,0,DPR,sx*DPR,sy*DPR);
  cloud(W*.2,g.cy-3.2*cs,cs*.5); cloud(W*.78,g.cy-2.6*cs,cs*.4);
  drawBridge(S.N,S.L,{run:true});
  const C=S.car; if(C){ const [x,y]=bridgeXY(C.x,C.y); ctx.setTransform(cs*DPR,0,0,-cs*DPR,(x+sx)*DPR,(y-BSTYLE.road.w*cs/2+sy)*DPR); ctx.rotate(C.a); LW=INK/cs;
    drawVehicle(C.V.k,{scared:C.fall||S.L.some(l=>!l.broken&&l.load>.8)}); }
}

/* ---------- the pocket watch ---------- */
function drawWatchRun(){ const S=GS.S, g=GS.view, cs=g.cs, h=watchHours(S), shake=S.jam&&!RM;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  // the movement: every gear turning at its own speed
  LW=INK/cs; const blink=(GS.t%3.1)<.1, pa=-S.w*h*TAU; // Pip's minute hand, clockwise
  const lk=[Math.sin(-pa)*.8,Math.cos(pa)*.6];
  S.P.forEach(p=>{ let x=g.cx+p.bx*cs, y=g.cy-p.by*cs; if(shake&&S.jams.has(p.key)){ x+=(Math.random()-.5)*4; y+=(Math.random()-.5)*4; }
    ctx.setTransform(cs*DPR,0,0,-cs*DPR,x*DPR,y*DPR); drawPart(p,{gear:true,look:lk,blink,scared:S.err==null&&S.t>.5,spin:p.spd*h*TAU}); });
  S.P.forEach(p=>{ if(PARTS[p.k].rot){ ctx.setTransform(cs*DPR,0,0,-cs*DPR,(g.cx+p.bx*cs)*DPR,(g.cy-p.by*cs)*DPR); gearArrow(p.d); } });
  if(S.err!=null){ // Pip's minute hand
    ctx.setTransform(cs*DPR,0,0,-cs*DPR,g.cx*DPR,g.cy*DPR); ctx.rotate(pa);
    ctx.beginPath(); ctx.moveTo(-.07,-.25); ctx.lineTo(0,1.55); ctx.lineTo(.07,-.25); ctx.closePath(); ctx.fillStyle='#000'; ctx.fill(); ctx.lineWidth=LW*.8; ctx.strokeStyle='#fff'; ctx.stroke(); }
  // the two clocks, below the movement
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const u=watchDay(S), start=10*3600, real=h*3600, pip=S.err!=null?h*3600*S.w:0;
  const r=Math.min(cs*.85,46), dy=g.cy+3.5*cs+r+16, fast=S.t>WATCH.hour+.1&&u<.98;
  dial(g.cx-1.4*cs,dy,r,start+pip,'Pip\u2019s watch',!fast);
  dial(g.cx+1.4*cs,dy,r,start+real,'Real time',!fast);
  if(S.err!=null&&S.t>=WATCH.hour&&S.err>0){ ctx.font='800 13px Figtree, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle='#000';
    ctx.fillText((S.rate>0?'+':'\u2212')+fmt('time',S.err*u).replace(' a day',''),g.cx-1.4*cs,dy+r+36); }
}
function dial(x,y,r,secs,label,sec){ ctx.save(); ctx.translate(x,y);
  ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=INK; ctx.strokeStyle='#000'; ctx.stroke();
  for(let i=0;i<12;i++){ const a=i/12*TAU, l=i%3?.1:.18; ctx.lineWidth=i%3?1.5:2.5; ctx.beginPath(); ctx.moveTo(Math.sin(a)*r*.88,-Math.cos(a)*r*.88); ctx.lineTo(Math.sin(a)*r*(.88-l),-Math.cos(a)*r*(.88-l)); ctx.stroke(); }
  const hand=(a,len,w)=>{ ctx.lineWidth=w; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.sin(a)*r*len,-Math.cos(a)*r*len); ctx.stroke(); };
  hand(secs/43200*TAU,.5,4); hand(secs/3600*TAU,.75,2.5); if(sec) hand(secs/60*TAU,.82,1.2);
  ctx.beginPath(); ctx.arc(0,0,3,0,TAU); ctx.fillStyle='#000'; ctx.fill();
  ctx.font='800 12px Figtree, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(label,0,r+6); ctx.restore(); }
