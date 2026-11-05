# Changelog

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
