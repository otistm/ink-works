# Changelog

## 0.11.2
- 3D test: sharp clipboard buttons. "Run it again" and "Change the build" are now real buttons laid exactly over the bottom of the report page, following the clipboard as it swings in, so their lettering is as crisp as the rest of the interface. The page itself is now drawn at the size it shows on screen, so its writing is sharper too, and the clipboard rests square to the screen instead of swaying.

## 0.11.1
- 3D test: the clipboard sits in the middle of the screen, and "Run it again" and "Change the build" are drawn right on the report page as ink buttons. They lift when you point at them and press in when you click. They appear early, so you never have to wait for the page to finish. Pip's signature moved up to the corner like a signed form, "Best so far" sits beside the distance, and the NEW BEST stamp lands on the corner of the machine sketch. Space and Esc still work, and keyboard and screen-reader users still get real buttons.

## 0.11.0
- 3D test: the result is a test report on a clipboard. When a run ends, a clipboard (modelled in Blender) swings up in front of the camera with a little overshoot, and the page fills itself in as you watch: an ink sketch of your machine, the distance written in big, a tick for each medal you earned (with a chime), the verdict circled ("Gold!" or "Not yet"), a note if something's missing, a "NEW BEST" stamp that thumps down, and Pip's signature. Each report has a run number. "Run it again" and "Change the build" sit beside the clipboard (Space and Esc work too), and the clipboard drops away when you go back to the bench.

## 0.10.1
- 3D test: the workshop floor grid is lighter and even: one light grey line every metre, all the same colour and strength, with no darker 5 m or 10 m lines.

## 0.10.0
- 3D test: a new place to play. The game now takes place in a gigantic workshop, like a testing room: an endless grid floor (fine lines every metre, bolder every 5 and 10 m) that fades into white paper, with no horizon line. The machine runs down a test lane edged with hazard tape and lined with cones, with big distance numbers painted on the floor every 10 m. Giant tools modelled in Blender lie about the floor so Pip looks tiny: a hex nut, a bolt, a pencil, a ruler, a spanner, a washer and stacked wooden blocks. The outdoor world is still there with ?world=outdoors.

## 0.9.0
- 3D test:
  - Clean lines. Studio cel, the default look, now draws crisp, even ink lines with nothing hand-drawn about them: no wobble, no shimmer, no pen wobble in their weight. The earlier lines are kept to compare: ?look=6 (wobbly) and ?look=7 (steady pen lines).
  - Scenery modelled in Blender: snow-capped mountain ranges on the horizon, rolling hills, tall and short pines, round trees, bushes, rocks, grass tufts and cartoon clouds that drift. They are scattered along the whole course and drawn in a few big batches, so runs stay smooth. Grass is paper with an ink outline, so it stays light.

## 0.8.1
- 3D test: Studio cel, the default look, now has steady lines: no wobble and no shimmer. The ink lines keep their bold outsides and fine insides. The old wobbly version is still there as ?look=6 to compare.

## 0.8.0
- 3D test: six ways to draw it. Add ?look=0 to ?look=5 to the page address to switch: 0 studio cel (the look so far), 1 two-tone comic, 2 halftone print, 3 clean line, 4 soft graphite, 5 inked terminator. Each changes the shading, the line weight and how much the lines wobble. All stay black, white and grey.

## 0.7.1
- 3D test: Pip's face is clear again. The raised frame round the face and its four corner screws are gone; Pip keeps the eyes, smile, antenna and ear knobs.

## 0.7.0
- 3D test: drag and drop.
  - Grab a part off the table and it lifts into your hand, leaning as you swing it. Over the board it hovers in front of the square it will land on, with a soft tick at each square and snap marks on the sides that will join. Let go and it drops in and snaps.
  - Let go anywhere else and the part swoops back to its stand. Press Escape mid-drag to do the same.
  - Parts already on the board can be dragged to another square, or off the board to remove them ("Removed", and the cost comes back).
  - Clicking still works as before: click a part, then click a square.

## 0.6.1
- 3D test: the spend bar is steady. Moving the pointer no longer makes every block replay its grow-in animation, so only a part you just placed grows in. The striped preview slides rather than blinking as you cross gaps between parts. The line under the bar always stays on one line, so the shelf and the camera don't jump.

## 0.6.0
- 3D test polish:
  - A clear budget. A meter at the bottom left shows a big "left to spend" number and a bar with one block for each part you've placed. Point at a part on the table, or at an empty square, and the bar shows striped how much it would take, with a line like "A motor costs 20. You'd have 40 left." The meter shakes when something won't fit.
  - The part description, the power line and the Clear and Launch buttons sit on a solid paper shelf along the bottom, and the board and table are framed above it, so nothing overlaps at any desktop size.
  - The test page always loads its newest files, so changes show up without clearing the browser.

## 0.5.0
- 3D test, round three:
  - Smooth runs. The machine glides between physics steps instead of jumping, the camera keeps exact pace along the road, and bumps no longer shake the zoom. The scenery is drawn in a few big batches instead of 1,500 pieces, effects reuse their ink, and the picture drops a little sharpness by itself if a computer can't keep up.
  - No more cables, belts or bolted plates. Instead, a part drops into its cell, lands with a squash and snaps onto its neighbours with a click, a flash of ink along each joined edge and a little burst of lines. The neighbours get nudged, and Pip's antenna wobbles. A part that touches nothing lands with a dull thud and says "Not joined". Hovering shows a faded copy plus marks on the sides that will snap.
  - Pip is a passenger again: nothing is bolted to Pip's face.
  - The parts now sit as real 3D models on a workbench under the board. Hover one and it lifts; pick one and it rises on its stand, turns slowly and gets an ink ring. Labels underneath show the name, the cost (crossed out when you can't afford it) and the number key.
  - Distance signs are drawn at much higher resolution with a border, so they stay sharp as you drive past.

## 0.4.0
- 3D test, round two, laid out for desktop:
  - Cel shading instead of hatching, so details read clearly. Ink outlines are bold round the outside and fine inside, and still wobble like a hand drawing.
  - More detail on every part: Pip's visor, ear bolts and screws; tyre tread; pulleys; terminal posts on the battery and motor.
  - Parts now show how they work together. Parts that touch get bolted with a bracket (with a click and a burst of lines). Each battery gets a wire to the nearest motor ("Powered!"), and each wheel gets a drive belt from a motor ("Driven"). Sparks of power run along the wires and the belts turn, on the bench and during the run. A line under the tray says what powers what.
  - During the run: the motor buzzes and sparks, the battery drains and calls "Flat!" when empty, and speed lines streak past.
  - A progress line along the top shows how far you've gone, each medal mark and your best.
  - The camera pulls back further, so you can see more of the road ahead.
  - On desktop the parts sit in a panel on the left, a faded copy of the chosen part follows the pointer over the bench, number keys pick parts, R picks Remove, and Space launches.

## 0.3.0
- A 3D test of First roll at /proto3d/, still drawn in paper and ink: toon shading with hatched shadows and wobbly hand-inked outlines. Pip and the four parts were modelled in Blender. Build on a standing bench, launch, and the bench tips back as the machine drops to the road and drives off. Same rules and physics as the real game; it keeps its own save, so your progress is untouched.

## 0.2.0
- Three new kinds of machine, so it's not all about going far, fast or high:
  - **Egg drop**: fall 60 m with an egg under Pip and land softly. Parachutes and balloons slow you, but you must be down within 40 s.
  - **The bridge**: build a bridge of wood, steel and cable under the road. A bike, a car, a van and a truck cross in turn. Weak beams show strain marks, then snap.
  - **Pocket watch**: join the mainspring to Pip with gears. Pip is the centre wheel carrying the minute hand, and must turn once an hour. Double gears (2× and 3×) speed things up when you drive their small side; tap one to turn it. Gears turn on the bench as you build, and jam if two of them disagree. A fast-forwarded day shows how much the watch gains or loses.
- New parts: parachute, wood, steel, cable, gear, 2× gear and 3× gear.
- Machines already won stay open even though the new ones sit in the middle of the list.

## 0.1.0
- First version. Eight machines to build: First roll, The dash, Liftoff, Hot air, The canyon, First flight, Sky high and Salt flats.
- Build on a 7 × 7 bench around Pip, the pilot, within a budget. Parts: frame, wheel, motor, battery, rocket, fuel tank, nose cone, wing, propeller and balloon.
- Balance pointers show where the machine's weight sits.
- Bronze, silver and gold for each machine. Bronze opens the next one.
- Progress and your last build for each machine are saved on your phone.
- A front page, and the game can be added to your home screen.
