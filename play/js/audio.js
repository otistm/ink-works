/* Ink Works: little synthesized sounds: pops, rocket roar, motor hum, medal chimes. */
"use strict";
/* ---------- audio ---------- */
let AC=null, roar=null, hum=null;
function audioInit(){ if(AC) return; try{ AC=new (window.AudioContext||window.webkitAudioContext)();
  const buf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const src=AC.createBufferSource(); src.buffer=buf; src.loop=true; const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=500;
  const g=AC.createGain(); g.gain.value=0; src.connect(f).connect(g).connect(AC.destination); src.start(); roar={g,f};
  const o=AC.createOscillator(); o.type='sawtooth'; const f2=AC.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=700; const g2=AC.createGain(); g2.gain.value=0;
  o.connect(f2).connect(g2).connect(AC.destination); o.start(); hum={o,g:g2};
 }catch(e){ AC=null; } }
function blip(freq,dur,type,vol,slide){ if(!AC) return; const t=AC.currentTime, o=AC.createOscillator(), g=AC.createGain(); o.type=type||'triangle';
  o.frequency.setValueAtTime(freq,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(vol||.15,t); g.gain.exponentialRampToValueAtTime(.001,t+dur); o.connect(g).connect(AC.destination); o.start(t); o.stop(t+dur+.02); }
function loops(rocket,motor,spd){ if(!AC) return; const t=AC.currentTime;
  roar.g.gain.setTargetAtTime(rocket?.22:0,t,.06); roar.f.frequency.setTargetAtTime(380+spd*6,t,.1);
  hum.g.gain.setTargetAtTime(motor?.05:0,t,.08); hum.o.frequency.setTargetAtTime(55+spd*7,t,.08); }
const buzz=ms=>{ try{ navigator.vibrate&&navigator.vibrate(ms); }catch(e){} };
