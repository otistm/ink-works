/* Ink Works: saved progress and the game state GS. */
"use strict";
/* ---------- saved progress ---------- */
const SKEY='inkworks-save';
function load(){ try{ const o=JSON.parse(localStorage.getItem(SKEY)||'null'); if(o&&o.lv) return o; }catch(e){} return {v:1,lv:{}}; }
function save(){ try{ localStorage.setItem(SKEY,JSON.stringify(SAVE)); }catch(e){} }
let SAVE=load();
const rec=id=>SAVE.lv[id]||(SAVE.lv[id]={best:0,medal:0,design:null});
const unlocked=i=>i===0||rec(LEVELS[i-1].id).medal>=1;

/* ---------- state ---------- */
const GS={mode:'home', li:0, lv:LEVELS[0], design:null, tool:'frame', S:null, placed:{}, fx:[], loose:[],
  cam:{x:0,y:0,z:26}, t:0, pre:0, acc:0, shake:0, endT:0, got:0, skipAt:0, lastV:[0,0], blink:0, nope:0};
