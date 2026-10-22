> Historical initial report. Superseded by `revision-report.md`.

# Birthday World — delivery and QA report

**Status: implementation draft; full 3D browser acceptance is blocked.**

The source, complete static production build and eight optimized asset groups are supplied. The original bedroom-redesign Blender file is untouched. Its SHA-256 matches the export input (`8400fcbb72b8ee3b76986bee4061a8764ba301285d7c88bb07b35fb4e076d593`). The separate browser working copy has adapted material graphs and must not replace the approved master.

## Implemented

All six scenes are connected through the authored camera route. The existing laptop carries a garden render target; camera travel does not cross the empty set separation. Door/handle and wish/smoke events use elapsed time, with forward gates. Three original flame meshes and three light sources are independently controlled. Reverse travel retains completed events; Replay resets them. The letter has an indefinite reading hold. Wheel, touch, keyboard and onscreen controls are present, along with reduced-motion behavior and recovery UI.

Personal images remain blank. Replaceable photo/caption slots and the neutral letter are configured in `public/personal-content.json`. No faces, personal memories, message or music have been invented.

Microphone requests occur only on the explicit button. Web Audio analysis is local and transient, with quiet calibration and a sustained-energy heuristic. It can mistake other loud sounds for blowing. No microphone recording or upload is implemented. The tap alternative remains available.

## Checks completed

- Production static build and TypeScript check.
- Automated controller tests for gates, repeated input, wish/denial fallback, reverse state, reading hold and replay.
- Decoded each optimized GLB: exactly one intended scene, all nodes reachable, no non-finite vertex values. Source portal, four image inserts, three flame pivots and door pivots retained.
- In the actual cloud browser, the normal route showed its WebGL recovery message.
- In an **explicitly labeled UI-only fixture**, Begin → door gate → timed opening → wish → simulated permission denial → tap → extinction state → reverse → letter → ending → Replay passed. The UI fixture does not construct a 3D renderer.
- Actual unavailable/secure-context microphone error produced its recovery message and retained the tap alternative.
- 390 × 844 CSS-pixel iframe viewport: inspected Begin control layout and confirmed the same actual-renderer failure. This is viewport emulation, not a real mobile device.

## Browser blocker and missing proof

Cloud Chrome reported `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` and `BindToCurrentSequence failed` when creating WebGL. A default-power, non-antialiased compatibility attempt also failed.

Consequently **the full rendered journey, visual comparison, portal fit, mesh motion, camera clearance, scene framing, smoke quality and rendering FPS have not been verified**. Live microphone blowing also remains unverified. WebMCP validation was unavailable because this browser does not expose `document.modelContext`.

**No successful browser walkthrough video or six-scene screenshot set is included.** Neither Blender footage nor the UI-only fixture is presented as that evidence. The two included screenshots document the limitation and the mobile UI fixture only.

## Measured asset inventory

These are decoded asset counts, not rendered FPS or a claim about visible per-frame workload. Frustum culling and runtime group visibility affect actual rendering. Shared instances are counted in the triangle totals; draw estimates exclude shadows/effects.

| Asset | File size | Instanced triangles | Primitive draw estimate |
| --- | ---: | ---: | ---: |
| bedroom | 2.19 MiB | 259,121 | 39 |
| garden | 17.30 MiB | 1,567,425 | 126 |
| door | 0.11 MiB | 5,216 | 26 |
| salon | 7.42 MiB | 1,083,046 | 102 |
| cake | 3.86 MiB | 1,026,784 | 7 |
| flames | 0.03 MiB | 3,360 | 9 |
| terrace | 22.84 MiB | 1,294,665 | 92 |
| ending | 2.95 MiB | 250,424 | 34 |

The complete GLB set is 59,464,056 bytes (56.71 MiB). The opening asset is 2.19 MiB. Eight groups load in stages, with loading gates before portal/exit transitions. Repeated geometry uses instancing, static meshes are merged, geometry uses Meshopt compression, colour textures use WebP and resolution adapts to sampled frame times. **No FPS, 3D cold-load time or device performance guarantee is available.** Test machine for export/build: Linux x86-64 container, 9 reported CPUs, 16 GB RAM; Blender Python 4.3, Three.js 0.180, Node 22-compatible toolchain. Browser: remote cloud Chrome; GPU renderer disabled.

## Remaining visual and implementation limits

- Procedural base colours were baked to material swatches, not per-object atlases. Fine normals, fabric weave, glass, exposure, shadow softness and indirect light are approximations.
- No static lighting/lightmap bake, contact-shadow bake or depth-of-field match was completed. There is no baked illumination to double-light.
- Source hero shapes are retained with tighter simplification tolerances, but the material/lighting match to Cycles is unverified. Botanical simplification also needs a visual pass.
- Camera poses are sampled from the source. Exact collision and portrait-occlusion checks require a working renderer and/or further geometric QA; no collision solver is included.
- Photo orientation/cropping, captions and longer physical letters need checking with actual supplied content.
- Mobile rendering and memory usage require testing on a real device. The retained scene detail remains substantial.

## Files and next validation

- `birthday-world-source.zip`: runnable source, package manifest, pnpm lockfile, all optimized GLBs, export/baking/optimization scripts, configuration, README and QA evidence.
- `birthday-world-production.zip`: `index.html` with its complete asset tree and serving instructions. Serve over HTTP(S); it is not a standalone file that can be opened via `file://`.
- `birthday-world-browser-working.blend`: separate material-adapted working copy.
- The optimized GLBs are also in `public/world/` inside the source ZIP. Export and bake scripts are under `tools/export/`.

A WebGL2-enabled browser is required to complete the remaining acceptance checks. Use `/qa` for desktop/mobile viewport checks and `/?qa=1` for diagnostics and recording the actual rendered canvas. The recorder captures the browser's canvas without microphone audio. See `qa/README.md` for the exact remaining checks.
