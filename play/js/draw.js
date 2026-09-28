/* Ink Works: drawing the bench and the world (ground, clouds, marks, the machine). */
"use strict";
/* ---------- drawing ---------- */
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  if(GS.mode==='build') drawBuild();
  else if(GS.mode==='run'||GS.mode==='done') drawWorld();
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
  // balance point: little pointers on the bench edges, and a faint dot
  const S=makeSim(GS.design,GS.lv); if(S.P.length>1){ const core=S.P.find(p=>p.k==='core');
    const bx=core.bx-core.rx, by=core.by-core.ry; const sx=g.cx+bx*cs, sy=g.cy-by*cs, L=g.cx-3.5*cs, B=g.cy+3.5*cs; ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.moveTo(sx,B+3); ctx.lineTo(sx-7,B+13); ctx.lineTo(sx+7,B+13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L-3,sy); ctx.lineTo(L-13,sy-7); ctx.lineTo(L-13,sy+7); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha=.5; ctx.setLineDash([3,4]); ctx.lineWidth=1.2; ctx.strokeStyle='#000'; ctx.beginPath(); ctx.moveTo(sx,B); ctx.lineTo(sx,sy); ctx.moveTo(L,sy); ctx.lineTo(sx,sy); ctx.stroke(); ctx.restore();
    ctx.font='800 11px Figtree, system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText('balance',sx,B+15); }

  // parts
  const att=attached(GS.design); LW=INK/cs;
  const look=[Math.sin(GS.t*.7)*.6,Math.sin(GS.t*.43)*.3], blink=(GS.t%3.7)<.12;
  const order=Object.keys(GS.design).sort((a,b)=>(GS.design[a].k==='balloon')-(GS.design[b].k==='balloon'));
  order.forEach(kk=>{ const c=GS.design[kk], [gx,gy]=kk.split(',').map(Number);
    ctx.setTransform(cs*DPR,0,0,-cs*DPR,DPR*(g.cx+(gx-3)*cs),DPR*(g.cy+(gy-3)*cs));
    const pu=GS.placed[kk]?Math.min(1,(now-GS.placed[kk])/380):1;
    drawPart(c,{pop:RM?1:pu,alpha:att.has(kk)?1:.35,look,blink,bob:Math.sin(GS.t*2+gx),spin:c.k==='motor'||c.k==='wheel'?GS.t*.3:GS.t});
    if(PARTS[c.k].rot&&att.has(kk)){ // a small arrow showing the push
      const [dx,dy]=DIRS[c.d]; ctx.save(); ctx.translate(dx*.62,dy*.62); ctx.rotate(Math.atan2(dy,dx)); ctx.beginPath(); ctx.moveTo(.13,0); ctx.lineTo(-.07,.1); ctx.lineTo(-.07,-.1); ctx.closePath(); ctx.fillStyle='#000'; ctx.fill(); ctx.restore(); }
  });
}
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
  if(lv.goal==='alt'){ lv.marks.forEach((m,i)=>{ const [,sy]=w2s(0,S.y0+m); if(sy<-10||sy>H+10) return; ctx.save(); ctx.setLineDash([6,6]); ctx.lineWidth=1.5; ctx.strokeStyle='#000'; ctx.globalAlpha=.5; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W,sy); ctx.stroke(); ctx.restore(); flagLabel(W-12,sy,i+1,m+' m','right'); });
    // ruler
    ctx.save(); ctx.strokeStyle='#000'; ctx.fillStyle='#000'; ctx.lineWidth=1.5; const step=10; for(let a=Math.floor((yBot-S.y0)/step)*step;a<yTop-S.y0;a+=step){ if(a<0) continue; const [,sy]=w2s(0,S.y0+a); const big=a%50===0; ctx.globalAlpha=big?.8:.35; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(big?16:8,sy); ctx.stroke(); if(big&&a>0){ ctx.textAlign='left'; ctx.fillText(a+' m',20,sy); } } ctx.restore(); }
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
  const look=[lx*ca-ly*sa, lx*sa+ly*ca], blink=(GS.t%3.1)<.1, scared=S.w*S.w>9||S.why==='canyon';
  const fuelF=S.fuel0?Math.min(1,S.fuel/Math.max(.01,S.n.fuel*K.tankFuel||S.fuel0)):0, chg=S.energy0?S.energy/S.energy0:0;
  const draws=[...S.P].sort((a,b)=>(a.k==='balloon')-(b.k==='balloon'));
  draws.forEach(p=>{ ctx.save(); ctx.translate(p.rx,p.ry);
    drawPart(p,{look,blink,scared,spin:p.k==='motor'?S.spin*.5:p.k==='prop'?GS.t*40:S.spin,spinning:S.propping&&p.k==='prop',flame:S.burning&&GS.pre<=0?.6+Math.random()*.6:0,fuel:fuelF,charge:chg,bob:Math.sin(GS.t*2+p.gx)});
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
