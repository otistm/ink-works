// Ink Works rules check. Run with: node tools/check.js
// It loads the real engine, builds a known machine for every level, and checks each gold medal can
// still be won within the budget. Run it after changing parts, physics numbers or medal marks.
const E = require('../play/js/engine.js');
const KEY = { P:'core', F:'frame', W:'wheel', M:'motor', B:'battery', R:'rocket', T:'fuel', N:'nose', V:'wing', O:'prop', A:'balloon', C:'crate' };
// One gold build per level: 7 rows of the bench, top to bottom. Directions: 0 right, 1 up, 2 left, 3 down.
const GOLD = {
  roll:  { rows:['.......','.......','.......','..BPB..','..WMW..','.......','.......'] },
  dash:  { rows:['.......','.......','..BB...','.MMPMN.','.W...W.','.......','.......'], dirs:{'5,3':0} },
  lift:  { rows:['.......','...N...','...P...','...T...','...T...','...R...','.......'], dirs:{'3,1':1,'3,5':1} },
  float: { rows:['.......','.......','.......','AAAP...','...A...','..ACA..','.......'] },
  leap:  { rows:['.......','.......','.......','.RTPN..','..W.W..','.......','.......'], dirs:{'1,3':0,'4,3':0} },
  glide: { rows:['.......','.......','..VV...','OBBPN..','.W.W...','.......','.......'], dirs:{'0,3':0,'4,3':0} },
  sky:   { rows:['...N...','...P...','..TTT..','..R.R..','.......','.......','.......'], dirs:{'3,0':1,'2,3':1,'4,3':1} },
  flats: { rows:['.......','.......','RR.....','RTPN...','RWW....','.......','.......'], dirs:{'0,2':0,'1,2':0,'0,3':0,'0,4':0,'3,3':0} }
};
function design(g){ const d = {};
  g.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (KEY[ch]) d[x+','+y] = { k:KEY[ch], d:(g.dirs||{})[x+','+y]||0 }; }));
  return d; }
let bad = 0; const fail = m => { bad++; console.log('  PROBLEM: ' + m); };
for (const lv of E.LEVELS) {
  console.log(lv.name + ' (' + lv.id + ')');
  if (!(lv.marks[0] < lv.marks[1] && lv.marks[1] < lv.marks[2])) fail('medal marks must go up: ' + lv.marks.join(', '));
  lv.parts.forEach(p => { if (!E.PARTS[p]) fail('unknown part ' + p); });
  const g = GOLD[lv.id]; if (!g) { fail('no gold build written for this level'); continue; }
  const d = design(g), cost = E.designCost(d);
  Object.values(d).forEach(c => { if (c.k !== 'core' && c.k !== 'crate' && !lv.parts.includes(c.k)) fail('gold build uses ' + c.k + ', which this level does not offer'); });
  if (lv.fixed) for (const k in lv.fixed) if (!d[k] || d[k].k !== lv.fixed[k]) fail('gold build is missing the fixed ' + lv.fixed[k] + ' at ' + k);
  if (cost > lv.budget) fail('gold build costs ' + cost + ', over the budget of ' + lv.budget);
  const S = E.runToEnd(d, lv), v = S.best[lv.goal], m = E.medalFor(lv, v);
  console.log('  gold build: ' + v.toFixed(1) + ' (gold is ' + lv.marks[2] + '), cost ' + cost + ' of ' + lv.budget);
  if (m < 3) fail('the gold build only reached ' + v.toFixed(1));
  const empty = E.runToEnd(E.newDesign(lv), lv);
  if (E.medalFor(lv, empty.best[lv.goal]) > 0) fail('Pip alone wins a medal');
}
console.log(bad ? '\n' + bad + ' problem(s).' : '\nAll good: every gold can be won.');
process.exit(bad ? 1 : 0);
