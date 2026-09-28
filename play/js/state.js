/* Ink Works: saved progress and the game state GS. */
"use strict";
/* ---------- saved progress ---------- */
const SKEY='inkworks-save';
function load(){ try{ const o=JSON.parse(localStorage.getItem(SKEY)||'null'); if(o&&o.lv) return o; }catch(e){} return {v:1,lv:{}}; }
function save(){ try{ localStorage.setItem(SKEY,JSON.stringify(SAVE)); }catch(e){} }
let SAVE=load();
const rec=id=>SAVE.lv[id]||(SAVE.lv[id]={best:0,medal:0,design:null});
// For testing on your own computer: add ?all to the address (http://localhost:8000/play/?all) to open every machine.
const OPEN_ALL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&/[?&]all\b/.test(location.search);
// A machine opens with a medal on the one before it. New machines were added in the middle of the list,
// so anything already won stays open, along with everything before it.
const unlocked=i=>OPEN_ALL||i===0||rec(LEVELS[i-1].id).medal>=1||LEVELS.slice(i).some(l=>SAVE.lv[l.id]&&SAVE.lv[l.id].medal>=1);

/* ---------- state ---------- */
const GS={mode:'home', li:0, lv:LEVELS[0], design:null, tool:'frame', S:null, placed:{}, fx:[], loose:[],
  cam:{x:0,y:0,z:26}, t:0, pre:0, acc:0, shake:0, endT:0, got:0, skipAt:0, lastV:[0,0], blink:0, nope:0, view:null};
