# Room rendering optimization — 17 September 2026

## Result

The planned rendering changes are implemented. Checked views retain the original appearance, but the **30 FPS room target is not met** on the available Intel UHD 620 laptop. Recipient Windows/Chrome and Android/Chrome testing remains pending. Vercel has not been updated by this change.

## Changes

- Skip cake, flames, exit door, gift and ending groups only when every corner of their padded bounds is behind the verified opaque core of the closed entry door. Unknown views, inspections, opening states and shadow refreshes remain visible. Use the actual camera for each render, including the laptop portal.
- Refresh moving-object shadows at the existing 24 Hz limit; only the actor that moved can force its final-pose refresh.
- Sort opaque world objects front to back while retaining authored render/group order. Restore the renderer's default sorting afterward. Transparent and physical glass rendering remain unchanged.
- Skip area-light calculations only on the exact halfspace where Three r180 already returns zero. Keep contributing lighting equations and existing point-light guards.
- Reduce selected cake and table-runner geometry with attribute-aware simplification. Keep **both original curtains**: their simplified experiment changed thin highlights. Textures, materials, node/instance transforms, lightmap UVs, retained vertex attributes and morph data pass structural preservation checks.
- Bump the asset revision to `2026-09-17-room-rendering` and update manifest hashes. No new dependencies, resolution reduction or content changes.

## Measurements

Same Linux Chrome 152 browser, ANGLE/Mesa Intel UHD 620, 1280×720, DPR 1, fixed authored camera 945. Both runs use the same GPU timing instrumentation and frozen real 3D fixture. These are sequential single runs, not a repeated statistical benchmark.

| Wish view | Original | Accepted |
| --- | ---: | ---: |
| Submitted triangles/frame | 4,738,780 | 4,208,616 |
| Draw calls | 421 | 421 |
| Median frame interval | 367.2 ms | 236.2 ms |
| p95 frame interval | 400.9 ms | 249.9 ms |
| Median CPU render submission | 45.7 ms | 33.6 ms |
| Median transmission-pass GPU time | 178.730 ms | 113.455 ms |
| Frame samples | 138 | 374 |

This is about **36% less frame time**, but only about **4.2 FPS** in the accepted room fixture. A separate normal-journey run with music, animated flames and no GPU profiler measured 238.3 ms median / 255.2 ms p95 over 159 samples. It confirms remaining room lag.

Closed-door submitted geometry fell from 6,634,328 / 730 draws to **1,977,870 / 249 draws**. The accepted stationary door run measured 33.3 ms median and 50 ms p95 over 1,200 samples.

Cake geometry: 1,061,502 → 828,356 triangles. Runner: 86,880 → 54,944. Curtains: 337,440 unchanged. Combined cake/salon triangle saving: 265,082 per pass. These changes primarily save rendering work; the combined downloads shrink only about 70.8 KB.

First-time shader preparation can still be slow. Cold/warm cache conditions were not matched, so no load-time improvement is claimed.

## Verification

- All 11 Node test files pass, including occlusion, final-pose shadow, opaque-order and shader-equivalence regressions.
- TypeScript passes. Asset validation has no failures. No build command was run.
- Independent source and decoded-asset review found no actionable code blockers. All 25 manifest entries match; all 95 unselected primitives, including curtains, preserve topology and attributes.
- Desktop fixed-camera comparisons cover closed door, room approach, cake, cloth and visible glass. Lossless comparison pixels differing by more than 2/255 levels: wish 0.0664%, cloth 0.0803%, glass 0.00239%. No pixel-identical claim.
- The normal 3D journey was exercised through entry, wish, celebration, courtyard door, portrait, keepsake, gift, teddy rotation, letter, ending, backwards input and replay. At 390×844, photographs load at full source dimensions and remain visible; bear controls work. A replay restores candles and doors. Gift opening completes despite backwards input. The birthday loop remains active outside the room; applause and fairy-dust cues are recorded.
- No browser console errors or photo warnings were reported. Development Strict Mode logged WebMCP registration cleanup `AbortError` warnings on initial mount; this unchanged QA-only behavior did not interrupt the journey.
- The fixed fixture uses reduced motion; the normal journey uses ordinary animation. Exact first-moving-frame restoration is covered by regression tests; the browser journey verifies the opening result, not a captured first-frame video.
- Physical microphone input, recipient hardware, cold-load comparisons and production deployment were not verified in this pass. Existing microphone regressions pass.

**QA verdict: Manual verification required** for recipient hardware. Rendering optimization is integrated; smoothness acceptance remains open.

## Reproducing accepted geometry

From the installed app directory, use the original, unoptimized Phase 3 export as input and a separate output directory:

```sh
node tools/export/optimize-room-geometry.mjs /path/to/original-world /path/to/review-output preserve-curtains
```

Do not use the already optimized `public/world` as input: repeated simplification would compound the error. The default preset is `preserve-curtains`; other presets are unapproved experiments. The script verifies structural preservation and emits a geometry report, but every new export still needs close-view visual comparison. Source Blender files are untouched.
