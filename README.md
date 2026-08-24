# Magnetic Morph Studies

Twelve 40 × 40 pixel Canvas 2D studies that continuously reorganize one fixed
set of opaque particles into data forms, geometric solids, and amorphic forms.

## Reference behavior extracted from Magnets

The original magnetic system treats every visible source pixel as a physical
particle rather than animating the source artwork itself. Its core motion model
combines:

- a persistent home position for each particle;
- staggered assembly along curved paths;
- per-particle lag and mass variation;
- pointer and impact offsets layered over the home position;
- a damped spring that returns displaced particles to their structure; and
- velocity-sensitive movement that gives the field metallic inertia.

## Adaptation for the 40 px system

The compact studies preserve that physical idea but replace source-image
rasterization with procedural target generators. Every study owns exactly 72
particles for its entire lifetime. No particle is added, removed, faded, or
cross-dissolved during a morph.

At every state change:

1. The next form produces 72 target positions, sizes, and gray-tone values.
2. A greedy nearest-target pass maps the current particles to the new form,
   limiting unnecessary crossings in the tiny container.
3. Each particle receives a deterministic activation delay and a small lateral
   velocity, creating the reference video's loose reorganization without its
   pendulum wipe.
4. Position, size, and tone converge independently through damped springs.
5. Rotating forms keep their target identity while their 3D projection moves,
   so cube and sphere rotation remains coherent after the morph settles.

The canvas uses an opaque rendering context, paints a solid white background on
every frame, and draws each dot with one of five solid gray values. Dot-size
variation carries depth and hierarchy instead of opacity.

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
