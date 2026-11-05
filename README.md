# Ink Works

Build it. Launch it. Get trophies. A game about building machines, drawn in ink in 3D. A sister game to Ink Nine and Ink Rally.

- `index.html` is the front page; the game is in `play/`.
- The levels, parts and physics are in `play/js/engine.js`; the 3D models are in `play/models/`, made in Blender from `art/inkworks-parts.blend`.
- The earlier 2D game is kept on the `classic-2d` branch.
- `CLAUDE.md` explains the project to Claude Code, and `CHANGELOG.md` lists what changed in each version.
- `node tools/check.js` checks that every gold medal can still be won.

To run it on your computer: open a terminal in this folder, run `python -m http.server`, then visit http://localhost:8000
