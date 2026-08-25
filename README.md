# Magnetic Morph Studies

A single Canvas 2D agent built from one persistent set of particles. The page
opens in light mode with two presentation modes:

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

Auto is deterministic: `Idle → Thinking → Idle → Contract → repeat`. Every
step lasts three seconds, and the four-step timeline below the agent shows the
current step by number and name.
Fast mode rotates the full eyed sphere at roughly seven times normal speed,
adds short frame persistence, and alternates the two eye closures while the head
orbits slightly. Collapse captures every node's current position and multiplies
both axes by the same radial scale. A deterministic per-node delay creates the
sucked-in stagger. The eye ellipses circularize as all 28 nodes converge into a
nearly singular core, then every node expands back to its captured face position
before the next Idle step begins.

Pointer proximity repels the circle field. Pointer-down temporarily opens the
larger simulation field, applies a wide radial impulse, and reconverges through
a one-second inertial spring without clipping the expanding nodes. Once the
burst returns, it randomly triggers Thinking or Contract, then rejoins the
four-step sequence through Idle.

## Presentation and controls

The `1×`, `2×`, and `4×` controls map to 80, 160, and 320 CSS pixels. Each
Canvas backing buffer follows device density for crisp output. The labeled
`1 Idle`, `2 Thinking`, `3 Idle`, and `4 Contract` timeline both explains the
sequence and lets a viewer jump to any step without stopping playback. Grid
mode maps the four-step timeline onto the three unique live-state cards. Arrow
keys and card selection also move the carousel.

Pointer events only record the latest coordinates; geometry reads and gaze
updates are coalesced into the next animation frame. Decorative carousel
canvases no longer register global pointer handlers, and control sounds are
deferred outside the originating event callback to keep UI input responsive.

Light mode is the default. The eyes use the selected accent at full strength,
while the sphere dots blend that accent 72% toward the white Canvas surface.
Six quick palettes—cobalt, rust, green, mustard, violet, and black—sit beside a
native full-spectrum picker. Dark mode keeps the same dual-tone logic with a
shallower 44% background blend for legibility. The optional glow follows the
selected accent. Every card Canvas paints the same solid
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
