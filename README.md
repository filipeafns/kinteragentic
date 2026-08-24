# Magnetic Morph Studies

A single Canvas 2D agent built from one persistent set of particles. The page
opens in dark mode with two presentation modes:

- **List** keeps the focused, unified agent at the center.
- **Grid** opens a spatial autoplay carousel containing the current face, fast,
  cube, collapse, tracking-bars, and globe states.

The previous twelve-study implementation and its `/studies` route have been
removed.

## Unified agent

The agent uses 26 circle nodes plus two independent solid eye ellipses. Its
visible composition remains authored in a centered 100 × 100 field, while the
renderer now owns a 180 × 180 simulation field. Circles occupy a complete golden-angle Fibonacci
sphere, including front and rear hemispheres. The sphere rotates with a small
secondary tilt and independent wobble. Projected radius determines dot size;
rear depth produces the requested shallow 30%-to-100% fog.

The fixed central eyes blink, form asymmetric expressions, and follow the
cursor. Two elliptical exclusion fields bend nearby dot trajectories around
the eyes while leaving the full sphere intact. Pointer proximity repels the
circle field. Pointer-down temporarily opens the larger simulation field,
applies a wide radial impulse, and reconverges through a one-second inertial
spring without clipping the expanding nodes.

The state sequence alternates between the face and one randomly selected
shape. Fast mode is the second state and runs the full eyed sphere at seven
times normal speed with a short persistence trail. Cube points use the same
golden-angle directions projected evenly across all six cube faces. Collapse
spirals all nodes into a nearly singular dense core in 340 ms, briefly holds,
and releases to a natural globe. Tracking Bars align the 28 nodes into seven
vertical columns whose positions chase up and down like a live signal.

## Presentation and controls

The `1×`, `2×`, and `4×` controls map to 80, 160, and 320 CSS pixels. Each
Canvas backing buffer follows device density for crisp output. Auto, face,
fast, cube, collapse, tracking-bars, and globe controls directly select the
current behavior. In Grid mode the same controls navigate the six carousel entries; Auto resumes its
4.2-second progression. Arrow keys and card selection also move the carousel.

Dark mode uses `#D9FF2F` on `#0A0506`. Light mode uses pure black on white.
The optional glow is a faint lime halo. Every card Canvas paints the same solid
surface as its container, so there is no inset Canvas square or transparency
seam.

## Audio

`cuelume@0.2.2` synthesizes compact two-layer hover cues and three-layer focus
cues for every state, including collapse and tracking bars. No recorded audio
files are embedded. The speaker control disables all future cues.

## Local development

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run lint
npm run build
```
