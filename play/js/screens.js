/* Ink Works: the bench layout, machines list, workbench HUD and the result card. */
"use strict";
/* ---------- build view geometry ---------- */
function grid(){ const top=$('top').getBoundingClientRect().bottom, bot=$('dock').getBoundingClientRect().top;
  const cols=GS.lv&&GS.lv.kind==='bridge'?GW+1.6:GW; // leave room for the cliffs either side of the bridge
  const cs=Math.floor(Math.min((W-28)/cols,(bot-top-24)/GH,64)); return {cs, cx:W/2, cy:(top+bot)/2}; }
function cellAt(x,y){ const g=grid(), gx=Math.round((x-g.cx)/g.cs)+3, gy=Math.round((y-g.cy)/g.cs)+3; return (gx<0||gy<0||gx>=GW||gy>=GH)?null:[gx,gy]; }

/* ---------- screens ---------- */
function openCard(html,home){ const c=$('card'); $('panel').innerHTML=html; c.classList.toggle('home',!!home); c.hidden=false; c.scrollTop=0; }
function closeCard(){ $('card').hidden=true; }
function medalSVG(m,size){ const s=size||34, id='h'+Math.random().toString(36).slice(2,7);
  const star='M17 7.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z';
  let inner='';
  if(m===3) inner=`<circle cx="17" cy="17" r="14" fill="#000" stroke="#000" stroke-width="2.5"/><path d="${star}" fill="#fff"/>`;
  else if(m===2) inner=`<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="4" fill="#000"/></pattern></defs><circle cx="17" cy="17" r="14" fill="#fff" stroke="#000" stroke-width="2.5"/><circle cx="17" cy="17" r="10" fill="url(#${id})"/>`;
  else if(m===1) inner=`<circle cx="17" cy="17" r="14" fill="#fff" stroke="#000" stroke-width="2.5"/><circle cx="17" cy="17" r="9" fill="none" stroke="#000" stroke-width="2"/>`;
  else inner=`<circle cx="17" cy="17" r="13" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="3 3.4" opacity=".45"/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 34 34" aria-hidden="true">${inner}</svg>`; }
const MNAME=['Not yet','Bronze','Silver','Gold'];
function fmt(g,v){ if(v==null) return '—';
  if(g==='time') return v<120?Math.round(v)+' s a day':v<7200?Math.round(v/60)+' min a day':Math.round(v/3600)+' h a day';
  return (v>0&&v<1?Math.round(v*10)/10:Math.round(v))+' '+GOALS[g].unit; }
function goalLine(lv){ const G=GOALS[lv.goal];
  return G.low?`${G.label}: gold is ${fmt(lv.goal,lv.marks[2])} or less`:`${G.label} ${lv.marks[0]}–${lv.marks[2]} ${G.unit}`; }

function showHome(){
  GS.mode='home'; setHud(false); loops(false,false,0);
  const rows=LEVELS.map((lv,i)=>{ const r=rec(lv.id), open=unlocked(i);
    return `<button class="event${open?'':' lock'}" data-i="${i}" ${open?'':'disabled'} style="animation-delay:${i*.04}s">
      <div class="tw-wrap">${medalSVG(open?r.medal:-1,38)}<small>${r.best?fmt(lv.goal,r.best):open?'New':'Locked'}</small></div>
      <div class="ev"><b>${lv.name}</b><i>${goalLine(lv)}</i><span>${open?lv.blurb:'Win a medal on '+LEVELS[i-1].name+' to open.'}</span></div></button>`; }).join('');
  const got=LEVELS.reduce((s,lv)=>s+rec(lv.id).medal,0);
  openCard(`<h2 class="logo">Ink Works</h2><p>Build it. Launch it. Get trophies.</p>
    <div class="shelf">${medalSVG(got>=LEVELS.length*3?3:got?2:0,26)}<span>${got} of ${LEVELS.length*3} medals</span></div>
    <div class="events">${rows}</div><p class="ver">Version ${VERSION}</p>`,true);
  $('panel').querySelectorAll('.event[data-i]').forEach(b=>b.onclick=()=>{ audioInit(); blip(520,.12,'triangle',.12,780); startBuild(+b.dataset.i); });
}
function startBuild(i){
  GS.li=i; GS.lv=LEVELS[i]; const r=rec(GS.lv.id); $('costbox').hidden=false; $('live').hidden=true;
  GS.design=r.design?JSON.parse(JSON.stringify(r.design)):newDesign(GS.lv);
  const base=newDesign(GS.lv); for(const kk in base) GS.design[kk]=base[kk];
  GS.placed={}; GS.tool=GS.lv.parts[0]; GS.fx=[]; GS.S=null; GS.mode='build'; closeCard(); setHud(true); buildTray(); refreshBuild(); showHint(GS.lv.hint);
}
function setHud(on){ ['top','dock','home'].forEach(id=>$(id).hidden=!on); $('skip').hidden=true; }
function buildTray(){
  const tr=$('tray'); tr.innerHTML='';
  [...GS.lv.parts,'erase'].forEach(k=>{ const b=document.createElement('button'); b.className='cp'+(GS.tool===k?' on':''); b.type='button';
    b.appendChild(iconCanvas(k,34)); const t=document.createElement('span'); t.textContent=k==='erase'?'Remove':PARTS[k].name; b.appendChild(t);
    const c=document.createElement('small'); c.textContent=k==='erase'?'refund':PARTS[k].cost; b.appendChild(c);
    b.onclick=()=>{ GS.tool=k; blip(660,.07,'triangle',.08); tr.querySelectorAll('.cp').forEach(x=>x.classList.remove('on')); b.classList.add('on'); refreshBuild(); };
    tr.appendChild(b); });
}
function refreshBuild(){
  const lv=GS.lv, cost=designCost(GS.design);
  $('hn').textContent=lv.name; $('hsub').textContent=lv.blurb;
  $('cost').textContent=cost; $('budget').textContent='of '+lv.budget+' budget';
  $('marks').innerHTML=lv.marks.map((m,i)=>`<span>${medalSVG(i+1,20)}${fmt(lv.goal,m)}</span>`).join('')+(rec(lv.id).best?`<span class="best">Best ${fmt(lv.goal,rec(lv.id).best)}</span>`:'');
  const k=GS.tool; $('info').innerHTML=k==='erase'?'<b>Remove</b> Tap a part to take it off and get its cost back.':`<b>${PARTS[k].name}</b> ${PARTS[k].desc}`;
  const att=attachedAny(GS.design,lv), loose=Object.keys(GS.design).filter(kk=>!att.has(kk)).length, to=lv.kind==='bridge'?'the bridge':'Pip';
  $('warn').textContent=loose?(loose===1?`1 part isn\u2019t joined to ${to}. It will fall off.`:`${loose} parts aren\u2019t joined to ${to}. They will fall off.`):'';
}
let hintT=0; function showHint(t){ const h=$('hint'); if(!t){ h.hidden=true; return; } $('hintT').textContent=t; h.hidden=false; clearTimeout(hintT); hintT=setTimeout(()=>h.hidden=true,6500); }
function callout(big,small){ const c=$('callout'); c.innerHTML=`<b>${big}</b>`+(small?`<span>${small}</span>`:''); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); }
