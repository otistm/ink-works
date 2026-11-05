# Ink Works: notes for Claude Code

Ink Works is a game about building machines, drawn in ink in 3D. The player builds a machine on a pegboard in a giant workshop, within a budget, launches it, and watches it run down a test lane; the result comes up as a test report on a clipboard. It's a sister game to Ink Nine (`../ink-nine`) and Ink Rally (`../ink-rally`) and shares their fonts and way of working.

For now only the first level, First roll, is playable. The earlier 2D game (eleven machines, phone-first) is kept on the `classic-2d` branch; it is not on `main` and not at the official link.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them, on a computer for now.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. Outside code: Google Fonts, and Three.js r128 plus its GLTFLoader from CDNs (Otis agreed to Three.js for the 3D game).
- `index.html` — the front page (a little rocket launching behind a card, and a Play button to `/play/`).
- `play/index.html` — the game page. It loads `styles.css` and `game.css`, then the scripts in `play/js/` **in the order listed there**. Every local file link carries `?v=<VERSION>`: bump it with `VERSION` so browsers fetch the new files.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on click, per frame) can use anything.
- `play/models/*.glb` — the 3D models, exported from `art/inkworks-parts.blend` (Blender). Scenes in that file: InkWorks (Pip and the parts → `parts.glb`), InkWorksShop (giant workshop props → `shop.glb`), InkWorksEnv (outdoor scenery → `env.glb`), InkWorksClip (the clipboard → `clipboard.glb`). Object names are how the game finds things (`part_core`, `wheel_spin`, `pip_eyeL`, `shop_nut`, `clip_page_spot`…); don't rename them.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js` — the rules check (see "Every change").

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| engine.js | All the rules, no drawing: `PARTS`, `K` (physics numbers), `LEVELS`, designs, and the simulation (`makeSim`, `stepSim`, `medalFor`…). Shared with the 2D game; also loads in Node for the check. |
| audio.js | Synthesized sounds |
| ink.js | The renderer: cel shading, ink outlines from depth and surface direction, and the looks (`LOOKS`, `setLook`) |
| world.js | Loading the models, `makePart`, the pegboard and parts table, the world (workshop grid floor and test lane, or the outdoors), scenery, shadows, dust |
| power.js | What powers what (`linksOf`, `powerLine`), snap effects, sparks, speed lines, floating words |
| game.js | The build screen (parts table, drag and drop, snapping, budget meter), launching, each frame of a run, the camera |
| report.js | The clipboard test report: the page drawing, the machine sketch, the buttons laid over the page |
| main.js | Startup and the main loop (always last) |

## How it plays
- The board is 7 × 7. Pip, the passenger, is fixed in the middle and can't be removed. Every part must touch Pip or a part that does; anything not joined falls off at launch (shown faded, with a warning). Nothing is ever bolted onto Pip's face.
- Drag a part from the table onto the board, or click a part then a square. Drag a placed part to move it, or off the board to remove it (the cost comes back). Number keys pick parts, R picks Remove, Space launches.
- The budget meter shows what's left to spend, with a block per placed part and a striped preview of what the pointed-at part would cost.
- Once launched, the board tips back, the machine drops onto the lane and runs by itself. After 2.5 s "Skip to the result" appears. A run ends when the machine stops, falls, or after 40 s.

## The physics (arcade, but honest)
A simple 2D rigid body (the 3D is only how it's drawn): weight, thrust, air drag, wing lift, balloon lift, and springy ground contact. The numbers live in `K` in engine.js. Changing a number in `K` changes every level; run the check afterwards.

## Levels and medals
- Levels are in `LEVELS` in engine.js. The 3D game plays `LEVELS[0]` (First roll) only, for now.
- **Every gold must be winnable.** `tools/check.js` holds one known gold build per level.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features), bump the `?v=` on the file links in `play/index.html` to match, and add a line to `CHANGELOG.md` in plain language.
3. If you touched engine.js, run `node tools/check.js`. It must say "All good".
4. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a desktop size (1280 × 720 and up).

## Protect players' saved progress
- The 3D game saves the player's build under `inkworks-3d-proto` (a design: bench cells `"x,y"` to `{ k: part id, d: direction }`), best distance under `inkworks-3d-proto-best`, and the report's run count under `inkworks-3d-proto-runs`. Keep those names.
- The 2D game's progress is in `inkworks-save`. Never read it in a way that changes it, and never delete it.
- Never rename a level `id` or a part id (`frame`, `rocket`, …); they're saved in players' designs.

## Look and feel
- Paper and ink: white `#fff`, black `#000`, and flat greys for cel shading (lit paper, a soft grey, a deeper grey). Gold, silver and bronze are told apart by ink (solid with a star, grey or hatched, outline).
- Ink outlines are clean and even (bold outside, fine inside), no wobble. Other looks are kept to compare: `?look=0` … `?look=7`.
- The world is a giant workshop: an endless light grid floor that fades into white, a hazard-taped test lane with cones and painted distance numbers, giant tools lying about. `?world=outdoors` shows the outdoor version.
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out.
- Pip has a face: eyes follow the direction of travel, blinks, and looks scared when spinning or falling.
- Desktop first for now. Respect `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- The front page shows the rocket launching and a Play button that opens `/play/`.
- The build screen shows the pegboard with Pip, the parts table in front, the budget meter and Launch.
- Drag a battery next to Pip: it snaps with a click; drag a wheel off the board: it's removed and refunded. Going over budget shakes the meter.
- Launch: the board tips back, the machine drops, "Go!" pops, it drives down the lane. Passing a mark calls out "Bronze!" and so on.
- The clipboard swings up and fills in; "Run it again" and "Change the build" work, and so do Space and Esc.
- No errors in the browser console.
