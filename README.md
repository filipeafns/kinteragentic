# Magnetic Morph Studies

A single Canvas 2D agent built from one persistent set of particles. The page
opens in dark mode with two presentation modes:

- **List** keeps the focused, unified agent at the center.
- **Grid** opens a spatial autoplay carousel containing the aware face, dizzy
  fast, and void-collapse states.

The previous twelve-study implementation and its `/studies` route have been
removed.

## Unified agent

The agent uses 26 circle nodes plus two independent solid eye ellipses. Its
visible composition remains authored in a centered 100 × 100 field, while the
renderer now owns a 180 × 180 simulation field. Circles occupy a complete golden-angle Fibonacci
sphere, including front and rear hemispheres. The sphere rotates with a small
secondary tilt and independent wobble. Projected radius determines dot size;
rear depth produces the requested shallow 30%-to-100% fog.

The eyes lead cursor-directed gaze while a slower yaw, pitch, and roll response
makes the full composition turn like a head. Near and far eyes receive different
depth, scale, and foreshortening. Once the head catches up, residual eye travel
reduces, producing a lightweight version of natural eye-head compensation.
Horizontal cursor intent also eases the sphere spin through zero and reverses
its direction. Two moving elliptical exclusion fields bend nearby dots around
the eyes while leaving the full sphere intact.

Auto is deterministic: `aware → dizzy fast → aware → void collapse → repeat`.
Fast mode rotates the full eyed sphere at roughly seven times normal speed,
adds short frame persistence, and alternates the two eye closures while the head
orbits slightly. Collapse captures every node's current position and multiplies
both axes by the same radial scale. The eye ellipses circularize as all 28 nodes
converge into a nearly singular core; the following aware state springs back
out from that point.

Pointer proximity repels the circle field. Pointer-down temporarily opens the
larger simulation field, applies a wide radial impulse, and reconverges through
a one-second inertial spring without clipping the expanding nodes.

## Presentation and controls

The `1×`, `2×`, and `4×` controls map to 80, 160, and 320 CSS pixels. Each
Canvas backing buffer follows device density for crisp output. Auto, aware,
dizzy fast, and void controls directly select the current behavior. In Grid
mode the same controls navigate the three carousel entries; Auto resumes its
4.2-second progression. Arrow keys and card selection also move the carousel.

Dark mode uses `#D9FF2F` on `#0A0506`. Light mode uses pure black on white.
The optional glow is a faint lime halo. Every card Canvas paints the same solid
surface as its container, so there is no inset Canvas square or transparency
seam.

## Audio

`cuelume@0.2.2` synthesizes compact two-layer hover cues and three-layer focus
cues for all three states. No recorded audio files are embedded. The speaker
control disables all future cues.

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
