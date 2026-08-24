# Magnetic Morph Studies

A centered Canvas 2D agent built from one fixed set of particles. The primary
page is a single white field with a spherical black agent; the original twelve
40 × 40 studies now live at `/studies` with their grid and carousel controls.

## Unified spherical agent

The primary agent uses 26 circles plus two separate solid ellipse nodes. The
circles are distributed across a complete Fibonacci sphere, including both the
front and rear hemispheres, then rotate quickly with a gentle secondary tilt
and independent wobble. The eyes remain fixed in the center. As they arrive,
two soft elliptical exclusion areas grow with them and redirect only the nearby
circles, creating the protected face without flattening the rest of the globe.
The complete composition still repels locally on hover.

The eyes blink by collapsing vertically and become circular nodes before the
agent reorganizes. Each cycle alternates the face with one randomly selected
globe, checklist, waveform, or rotating pyramid, then always returns to the
face before choosing another shape.

All light-mode geometry uses pure black. Depth and hierarchy come from particle
size: dots are smallest near the projected center and become larger toward the
spherical silhouette. Rear-hemisphere fog is the sole opacity treatment,
ranging from 30% at the back to fully opaque at the front. Every non-eye node
is a true Canvas circle; each eye is one intentional stretched ellipse.

The restored `1×`, `2×`, and `4×` controls present the agent at approximately
80 × 80, 160 × 160, and 320 × 320 CSS pixels. The Canvas backing buffer follows
device density so each physical scale stays crisp. The original light/dark,
sound, and view controls remain above it.

## Compact studies

The secondary `/studies` page continuously reorganizes fixed 72-particle sets
into data forms, geometric solids, and amorphic forms. It opens in light mode
and grid view, retains the earlier dark `#0A0506` and accent `#D9FF2F` theme,
and includes the autoplaying spatial carousel. In light mode every dot is now
pure black; neutral depth values reduce particle size rather than tinting gray.

## Layered interaction audio in the studies

The secondary studies use `cuelume@0.2.2`. Cuelume contains no recorded audio assets to
extract: its 17 cues are synthesized at playback time with one shared Web Audio
context. Each study has a deliberately quiet signature made from two cues on
mouse hover and three staggered cues when it becomes the selected carousel
item. `tick` supplies the crisp common transient; shape-specific layers use
`page`, `scan`, `pulse`, `bloom`, `sparkle`, `whisper`, `droplet`, `ready`, and
other native Cuelume recipes. The small speaker control disables future cues.

Browsers require a click, tap, or keyboard interaction before audio can start.
After that first gesture, automatic carousel focus changes also play their
assigned signatures.

## Sentient particle states

Every study now includes one agent state made from the same 72 particles as its
other forms. Twenty particles form the two light, center-weighted eyes, 30 make
a compact low-contrast diffusion field, and 22 balance the outer face orbit.
The round, tall, or long eyes blink in orchestration, follow recent pointer
movement, and return to autonomous side-to-side glances when the pointer is
idle. There are no overlaid eye graphics or cross-fades. Spreadsheet and data
sequences also pass through a particle-built three-row checklist.

The minimal bottom control switches between `1×`, `2×`, and `4×`. It changes
both the CSS footprint and the Canvas backing resolution, so enlarged studies
remain crisp rather than stretching a 40-pixel bitmap.

In grid view the Canvas surface matches the page. In carousel view the Canvas
fills the entire card and uses the card's exact solid surface color, eliminating
the inset square while keeping the particle renderer opaque.

## Reference behavior extracted from Magnets

The original magnetic system treats every visible source pixel as a physical
particle rather than animating the source artwork itself. Its core motion model
combines:

- a persistent home position for each particle;
- staggered assembly along curved paths;
- per-particle lag and mass variation;
- a compact per-icon pointer field that repels nearby particles on hover;
- pointer and impact offsets layered over the home position;
- a damped spring that returns displaced particles to their structure; and
- velocity-sensitive movement that gives the field metallic inertia.

## Adaptation for the 40 px system

The compact studies preserve that physical idea but replace source-image
rasterization with procedural target generators. Every study owns exactly 72
particles for its entire lifetime. No particle is added, removed, faded, or
cross-dissolved during a morph.

At every state change:

1. The next form produces 72 target positions, sizes, and depth values.
2. A greedy nearest-target pass maps the current particles to the new form,
   limiting unnecessary crossings in the tiny container.
3. Each particle receives a deterministic activation delay and a small lateral
   velocity, creating the reference video's loose reorganization without its
   pendulum wipe.
4. Position, size, and depth converge independently through damped springs.
5. Rotating forms keep their target identity while their 3D projection moves,
   so cube and sphere rotation remains coherent after the morph settles.

The compact canvas uses an opaque rendering context, paints a solid background
on every frame, and draws each light-mode dot in pure black. Dot-size variation
carries neutral hierarchy instead of gray tint.

## Form generators

- **Loader:** a complete orbit with a moving hierarchy of larger anchor dots.
- **Grid:** a 9 × 8 field with quiet tonal and size variation.
- **Cube:** 72 samples distributed across 12 rotating wireframe edges.
- **Sphere:** a Fibonacci sphere projected with depth-based size and tone.
- **Cloud:** three overlapping deterministic lobes with subtle breathing and
  deformation.
- **Check:** paired dotted lanes sampled across a two-segment check mark.
- **Spreadsheet:** horizontal and vertical point rules that resolve into table
  cells with a darker header edge.
- **Columns:** six compact data columns with distinct heights and tones.
- **Pyramid:** a rotating square pyramid sampled across its eight edges.
- **Diamond:** a rotating octahedron made from twelve sampled edges.
- **Helix:** two depth-aware strands that rotate without changing particle
  identity.
- **Wave:** three gently moving data ribbons.

Each of the twelve studies uses a different order, starting offset, rotation
phase, and tempo while sharing the same motion system.

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
