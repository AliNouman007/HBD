# Birthday World — rendering revision 3

The reported visibility, camera continuity, smoke and material faults have been addressed in the existing project. **Full rendered-browser acceptance remains blocked by disabled WebGL in the available test browser.** This report does not certify ready-to-ship visual quality or mobile performance.

| Reported issue | Change |
| --- | --- |
| Missing cake through the door | The cake was explicitly hidden before frame 500. Connected sets are now present before portal entry; the cake is inside the open-door camera frustum. |
| Blank frames, then sudden photos | Frame inserts were hidden until frame 1640. All four images now load with their physical mounts before travel; the camera turn reveals them naturally. |
| Terrace and letter appearing suddenly | Whole groups were switched on at frames 1100 and 2161. Those switches are removed. The derived Blender copy also keeps the active connected sets present. |
| Striped surface outside the door | A three-metre terrain underside inherited flat grass UVs. Its Solidify underside is disabled, and the terrace floor is present throughout the connected journey. |
| Flat colour on the letter stand | Named UV inputs were missing on the bake plane, reducing the oak image to a single pixel. Both colour and normal bakes now resolve the source UVs; the optimized GLB retains a 512 × 512 oak image. |
| Dark, oversized smoke | Three smaller pale plumes replace the dark shader. The camera holds steady through extinction. All flame lights reach zero, and smoke fades without relighting on reverse travel. |
| Abrupt camera and door motion | Door/wish release and reverse boundaries share camera poses. Travel accelerates and brakes gradually, queued input is bounded, door samples interpolate, and ultra-wide views retain vertical framing. |
| Glass and first-use rendering stalls | Panes retain transparent alpha in the export, cast no opaque browser shadows, and use consistent roughness. Connected textures and shaders prepare before entry; static sun shadows are cached. |

Validation completed:

- 12 automated tests pass, including actual exported camera continuity, steady gate release, bounded scrolling, three-plume framing on desktop/mobile, extinction, reverse travel and replay reset. TypeScript checks pass.
- All eight GLBs load and decode in the browser. Portal UVs are retained; screen-origin offset is 0 m and direction alignment is 1. The door panel travels 1.104 m and clears the centre ray when opened.
- The cake is present and projects inside the open-door view. All four mounted images are populated. The portrait centre is outside the view at frame 1450 and inside at 1510. The letter and its oak texture are present.
- Desktop and 390 × 844 mobile **UI-only** flows reach the letter and ending. Microphone denial fixture, actual unavailable-microphone handling, tap fallback, reverse state and intentional replay reset were checked. The QA panel was moved away from the replay button.
- Actual Blender and export-material stills were inspected. These show the current geometry/material adaptation and are explicitly separated from browser control captures.
- The authoritative bedroom-redesign original is unchanged: SHA-256 `8400fcbb72b8ee3b76986bee4061a8764ba301285d7c88bb07b35fb4e076d593`. Active export object counts remain unchanged after the connected-visibility correction; archived collections remain excluded.

Measured environment and cost:

- Cloud Chrome 151, reported macOS/Intel user agent; 1363 × 936 viewport, DPR 1. Mobile testing used a 390 × 844 CSS viewport, not a physical phone. Node 24.19.0; Blender 4.3, CPU Cycles, 24 samples, 1200 × 750 stills.
- Eight GLBs total **38,929,072 bytes (38.93 MB)**. Combined full-group geometry is 6,736,620 triangles; frustum culling determines what is drawn. This count is not an FPS measurement.
- Sum of observed per-GLB load/decode durations: **1,711 ms** on the local preview, with cache state uncontrolled. This excludes GPU work and is not an end-user cold-load benchmark.
- `GL_VENDOR = Disabled` and `GL_RENDERER = Disabled` prevent a WebGL context. No GPU FPS, VRAM, visual shader compilation, real mobile rendering or live microphone blowing result is claimed.

Remaining acceptance work:

The updated site needs a complete WebGL-enabled visual pass for portal matching, moving-door clearance, smoke appearance, shadows/exposure, image framing and desktop/mobile FPS. There is no successful 3D browser walkthrough recording or six-scene browser screenshot set from this environment. Blender stills are not a substitute. Browser lighting and swatch-baked detail remain approximations of Cycles; this is not a photographic-match claim. The portrait is a fictional adult demo, the small frames use botanical placeholders, and the letter is generic configurable text.

The source ZIP includes the application, pinned dependency manifest/lockfile, runtime assets, export/baking scripts and QA evidence. The production ZIP contains index.html and its required assets; serve its contents at an HTTP(S) origin root. The source Blender master and export-oriented working copy are provided separately.

Technical references: [Three.js renderer preparation](https://threejs.org/docs/pages/WebGLRenderer.html) and [Blender glTF material limitations](https://docs.blender.org/manual/en/3.1/addons/import_export/scene_gltf2.html).
