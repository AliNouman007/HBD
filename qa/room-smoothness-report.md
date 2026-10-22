# Birthday room optimization — 17 September 2026

## Delivered changes

The cake and birthday room render with less repeated work. Resolution, antialiasing, textures, curtains, lights, reflections, audio and personal content retain their existing settings. No dependencies or build commands were used. Vercel is unchanged.

- **Cake geometry:** 828,356 → 451,930 triangles compared with the previous local version (45.4% fewer); 3,795,688 → 2,801,328 bytes. Only cream piping, rosettes and raspberry detail were simplified from the original source. Vertex attributes, textures, materials, transforms and instances were preserved. All other GLBs are unchanged.
- **Cake depth:** a colorless draw rejects hidden cake fragments before physical lighting runs. The same geometry, side and invariant positions preserve coverage. Unsupported materials use the ordinary rendering path.
- **Area lighting:** identical LTC lookups, view basis, matrices and Fresnel preparation are shared across area lights. Light colors, intensities, integration and accumulation order remain unchanged.
- **Glass:** a dual-output render target shares opaque shading between glass and the display. A separate display output retains the original tone mapping, color conversion, fog, dithering and four-sample antialiasing before resolution. Glass and transparent objects retain their ordering. Unsupported devices, shadow refreshes, portal views and unsupported scene states use the native renderer.
- **Preparation:** native and shared-renderer variants, hidden smoke and transparent sides prepare behind the loading gate. Compilation starts in parallel, then readiness is checked per mesh. The last room frame stays visible during this preparation. Cleanup preserves callback ownership and waits for outstanding preparation before releasing owned resources.

## Measured rendering work

At the authored cake view (frame 945), 1280×720, DPR 1:

| Work per frame | Previous local version | Selected version |
| --- | ---: | ---: |
| Draw calls | 421 | 224 |
| Processed triangles, including extra passes | 4,208,616 | 2,180,700 |

That is about **47% fewer draw calls and 48% fewer processed triangles** in this view. The extra cake depth work is included in these totals.

## Timing and limits

Chrome 152 on Linux, ANGLE / Intel UHD Graphics 620 / Mesa. Real WebGL2 rendering at fixed authored cameras, frozen animation and no audio. These are sequential warmed samples, not a controlled cross-device benchmark. The machine was also under memory pressure late in the checks (about 21 GB of 24 GB RAM and nearly all 4 GB swap in use). Treat timing as indicative; the deterministic rendering-work and pixel comparisons are stronger evidence.

| View | Previous median / p95 | Selected median / p95 | Selected samples |
| --- | ---: | ---: | ---: |
| Cake 945, 1280×720 | 249.6 / 273.9 ms | 133.3 / 216.6 ms | 529 |
| Closest cake 1115, 1280×720 | 116.6 / 116.7 ms | 99.9 / 116.7 ms | 272 |
| Cake 945, 390×844 | 100.0 / 116.7 ms | 83.3 / 183.3 ms | 511 |

The small-viewport run improved its median but had a worse p95; consistent mobile smoothness is **not established**. That viewport used the same laptop GPU, not an Android phone. Actual Windows/Android target-device testing remains outstanding.

This work does **not** establish 60 FPS or eliminate all visible lag on this machine. Cold shader preparation remains substantial: the final normal journey measured 51.7 seconds in asset preparation, with all assets ready 116.8 seconds after startup, including time spent at journey gates. These were not matched cold-cache loading benchmarks, so no loading-time improvement is claimed.

## Visual fidelity

The new glass pipeline added **zero changed pixels** compared with the selected geometry under the native renderer at cake 945 and frozen candle-smoke moments at 3 and 5 seconds (1280×720). Its side-view result at 1326 matched the existing shared-lighting result. Mobile-size cake comparison retained the same differences as the geometry-only selection.

Geometry simplification is not mathematically pixel-identical. Against the previous local cake, mean RGB channel error was 0.0376/255 at view 945 and 0.0508/255 at view 1115. About 0.15–0.20% of pixels differed by more than eight channel levels, concentrated on fine cake edges. Desktop, mobile-size and 1920×1080 close-up inspection preserved the visible cake silhouette, cream and raspberries. Textures and materials were separately checked for exact preservation.

## Verification

- All 13 automated test files pass; TypeScript passes without a build. Asset validation passes for all 10 groups.
- The final normal app was exercised through Step inside, preparation messaging, enabled entry door, opening animation, travel to the wish gate, button-driven candle extinction, smoke, birthday celebration and travel to the courtyard door.
- Shader programs remained at 110 from the ready door through celebration. The previously observed long pause when changing to camera 1326 did not recur after preparation was added. No JavaScript errors were observed.
- This is not a fresh real-microphone or audio-perception test. One browser automation click timed out during a busy frame; the normal door action then completed through the app's own test interface.
- An early fully parallel test invocation failed the existing loading test under contention; its direct rerun and the full final sequential suite passed without changing that test.

## Reproduction and rollback

The geometry tool supports the `cake-only` preset against the original source assets and reproduces the selected cake byte-for-byte: SHA-256 `3b18a21f46f026887fa0e2b602c9cf33f19e5f17e58e835d9510f77f691a0fa3`. The manifest and optimization report match. Integration records and pre-change file copies are retained in the working directory under `work/room-smoothness-2026-09-17`.

Temporary profiling pages, reference engines, alternate assets and experimental renderers are excluded from the original project.

Rejected alternatives included salon-wide depth rendering, a runtime area-light loop, extra zero-light guards, FrontSide cake changes and a projected-size depth gate; they did not improve measured results. A simpler HDR composition was faster but visibly changed curtain and glass edges, so it was also rejected.
