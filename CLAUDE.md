# Ink Works: notes for Claude Code

Ink Works is a minimal mobile game about building machines, drawn like a paper-and-ink cartoon. Each level asks for a goal (go far, go fast, go high); the player builds a machine on a small bench within a budget, launches it, and watches it run. It's a sister game to Ink Nine (`../ink-nine`) and Ink Rally (`../ink-rally`) and shares their look, fonts and way of working.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html` — the front page (a little rocket launching behind a card, and a Play button).
- `play/index.html` — the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js` — the rules check (see "Every change").

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| engine.js | All the rules, no drawing: `PARTS` (cost, weight, description), `K` (physics numbers), `LEVELS`, designs, and the simulation (`makeSim`, `stepSim`, `runToEnd`, `medalFor`). Also loads in Node for the check. |
| render.js | Shared helpers (`$`, `clamp`, `seeded`), the canvas, ink hatch patterns |
| state.js | Saved progress (`SAVE`, `rec`, `unlocked`) and the game state `GS` |
| audio.js | Synthesized sounds: placing pops, rocket roar, motor hum, medal chimes |
| art.js | How every part is drawn (`drawPart`), including Pip's face, and the tray icons |
| screens.js | Bench layout (`grid`), the machines list, the workbench header, the result card, medal drawings |
| build.js | Tapping the bench: place, turn, remove; the Clear, Launch, Skip and back buttons |
| run.js | Launching, puffs and stars, and each frame of a run: camera, exhaust, hits, medal callouts |
| draw.js | Drawing the bench (with the balance pointers) and the world: clouds, ground, canyon, height lines, distance flags, the machine |
| main.js | Main loop and startup (always last) |

## How it plays
- The bench is 7 × 7. Pip, the pilot, is fixed in the middle and can't be removed. Every part must touch Pip or a part that does; anything not joined falls off at launch (shown faded on the bench, with a warning).
- Tap a part in the tray, then tap the bench. Tapping a placed rocket, propeller or nose cone again turns it a quarter turn. Tapping a different part replaces what's there. "Remove" refunds the cost. You can't go over the level's budget.
- The balance pointers under and beside the bench show the machine's centre of weight. Rockets that don't push through it make the machine spin.
- Once launched, the machine runs by itself. There are no controls during a run. After 2.5 s a "Skip to the result" button appears.
- A run ends when the machine stops, falls into the canyon, or after 40 s.

## The physics (arcade, but honest)
It's a simple 2D rigid body: weight, thrust, air drag, wing lift, balloon lift, and springy ground contact. The numbers live in `K` in engine.js.
- Rockets push hard along their arrow and burn fuel; each rocket has a short burn of its own, fuel tanks add more. Full tanks are heavy.
- Motors drive every wheel that touches the ground and fade out near 144 km/h. Motors and propellers share the batteries.
- Nose cones pointing forward cut drag a lot. Every part adds drag. The air thins as you climb.
- Wings lift at speed and steady the machine in the air. Balloons lift and get weaker the higher they go.
- In the air, machines slowly turn to face where they're going, like an arrow.
- Changing a number in `K` changes every level. Run the check afterwards.

## Other kinds of machine
Most levels are vehicles (`makeSim`). A level's `kind` can also be:
- `bridge` (The bridge): no Pip. The road row is fixed. Every part is a joint, and joints that touch, side by side or corner to corner, are joined by a beam (`BEAM` holds each material's strength and give). Cables only pull. Beams are bolted firmly into the cliffs. A bike, car, van and truck (`VEHICLES`) cross in turn. The score is the heaviest that made it across.
- `watch` (Pocket watch): a gear train. Gears touching side by side mesh (`gearSpeeds`): speed × teeth passes on, so only double gears (`dbl2`, `dbl3`, small side facing their direction) change the overall ratio. The fixed mainspring turns once in 12 h; Pip, the centre wheel with the minute hand, must turn once an hour. Gears that disagree jam. The score is time gained or lost per day.
- The egg drop is a vehicle level with `start` (a drop height) and the goal `soft` (landing speed).
`makeAny`, `stepAny` and `scoreOf` pick the right one. Goals with `low:true` in `GOALS` (landing speed, watch error) are better when smaller.

## Levels and medals
- Levels are in `LEVELS` in engine.js: `goal` is `dist`, `alt`, `speed`, `soft`, `load` or `time`; `marks` are bronze, silver and gold (they get smaller for `low` goals); `budget`; `parts` the tray offers; optional `fixed` parts (the crate on Hot air, the egg, the road) and `terrain` (`gap` is the canyon).
- Machines already won stay open, along with everything before them, even if a new machine is added in the middle of the list.
- Winning bronze opens the next level. There are no coins.
- **Every gold must be winnable.** `tools/check.js` holds one known gold build per level. If you add a level, add its gold build there.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. If you touched engine.js, run `node tools/check.js`. It must say "All good".
4. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). Add `?all` (http://localhost:8000/play/?all) to open every machine; this only works on your own computer.

## Protect players' saved progress
Progress is kept in the browser's localStorage under `inkworks-save`: `{ v, lv: { <level id>: { best, medal, design } } }`. A design is a map of bench cells `"x,y"` to `{ k: part id, d: direction }`.
- Never rename a level `id` or a part id (`frame`, `rocket`, …); they're saved in players' designs.
- Never rename or remove a saved field. Add new fields with defaults.
- If a saved design uses a part a level no longer offers, it should still load; tell Otis if a change would break that.

## Look and feel (same as Ink Nine and Ink Rally; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey only for secondary text. Shading is hatching and stippling, never colour. Gold, silver and bronze are told apart by ink (solid with a star, hatched, outline).
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation (the machine squashes before launch), follow-through (loose parts tumble off), slow in and out.
- Pip has a face: eyes follow the direction of travel, blinks, and looks scared when spinning or falling.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- The front page shows the rocket launching and a Play button that opens `/play/`.
- The machines list shows eleven machines; only First roll is open, the rest say how to open them.
- Egg drop: parachutes open as you fall; a hard landing calls "Crack!". Bridge: two rows of wood under the road carry the truck; the road alone sags and only the bike gets across. Watch: gears turn on the bench as you build; the gold build in tools/check.js (a 2× and a 3× gear, small sides facing the spring) makes Pip turn once an hour.
- In First roll: tap Battery, tap beside Pip; tap Wheel, tap below; the budget number goes up, the balance pointers move. Tapping over budget shakes the number and explains.
- Launch: the machine squashes, "Go!" pops, it drives off with dust. Passing a mark calls out "Bronze!" and so on.
- The result card shows the distance, the medal board and the buttons; the next machine opens after a medal; everything is still there after a refresh.
- Liftoff: an off-centre rocket makes the machine spin and Pip looks scared.
- No errors in the browser console.
