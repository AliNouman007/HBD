# Birthday World performance audit — 23 September 2026

## Outcome

Loading and redundant rendering fixes are implemented locally. Full-quality cake rendering still needs further work on slower graphics hardware; this is not a 60 FPS sign-off. The user's home machine has an i7 10th-generation CPU and 16 GB RAM; its GPU, acceleration status and network speed are unknown.

## Ranked findings and changes

1. **The birthday doorway waited for unrelated later sets.** Production was observed blocked with all seven original room groups prepared because gift/ending/courtyard were also required. The corrected entry dependency includes the courtyard: it is visible through the cake-view window. Entry now releases at eight prepared groups; gift and ending prepare at the existing courtyard-door gate. This removes 8,091,480 bytes of model decoding/upload/compilation from the birthday-entry requirement. It redistributes some preparation to the later door; it does not remove those assets from the complete experience.
2. **Network transfer started only after reaching the room door.** Upcoming model bytes now prefetch during exploration, with two transfers per batch. Decode/upload/shader preparation stays at the closed door, keeping it out of the candle interaction. Shared promises prevent duplicate transfers, consumed bytes are released, and unmount aborts outstanding transfers. Slow connections can still require a wait.
3. **Shader warming repeated native/HDR work.** World assets were compiled natively and into the portal before RoomRenderer did both again; garden/door were also warmed again as part of the whole world. The existing RoomRenderer is now the single color-variant warmup path. The initial sky/effects and cake depth variants still warm separately.
4. **Static transforms and bedroom views were recalculated unnecessarily.** Static authored sets keep their original local/world matrices. Doors, gift/teddy and flames retain live transforms. The bedroom redraws on camera, projection, portal-content or resize changes. The portal keeps its original animation cadence. Closed-door loading retains the previous 3D frame while the UI/loading animation remains responsive, instead of competing with preparation.
5. **The remaining room cost is predominantly a large, physically shaded 3D scene.** Current unchanged exports contain 1,031,062 salon triangles, 451,930 cake triangles, 1,006,954 garden triangles and 454,616 bedroom triangles. Five world area lights, candle lights, glass/transmission, antialiasing and shadow refreshes remain substantial work. Changing hosting or adding RAM alone does not remove this GPU work. Existing shared glass rendering is active in this test, so an extra glass pass is not the sole remaining cause.

## Asset/export audit

- Actual GLBs: **49,375,324 bytes**; actual indirect-light EXRs: **6,980,788 bytes**.
- All ten GLB SHA-256 values still match the previous asset manifest. No model, image, material, lighting value, shadow resolution, DPR cap or Blender source was reduced or replaced.
- Embedded image duplicates account for only **2,636,434 compressed bytes**. Externalizing them is a smaller opportunity than room scheduling and would add a more complex asset pipeline. The existing decoded-image sharing pool remains in place.
- The old optimization report's `lightingBytes` (40,953,152) is stale relative to files on disk. This audit uses actual file sizes.
- Runtime exports are already Meshopt compressed with quantization, WebP embedded images and instancing. Repeating compression or swapping libraries is not a root-cause fix.
- The Blender/export path retains detailed mesh geometry and material swatches, with separate **indirect-only** lightmaps. It does not bake away the expensive direct-light calculations. Original `.blend` files remain untouched.
- Audio totals about 616 KiB; stickers about 372 KiB. Removing the bear is not the useful first optimization.

## Browser evidence (1280 × 720, DPR 1)

| Observation | Production before | Local revised loading |
|---|---:|---:|
| Prepared groups needed at entry | 10 | 8 |
| Cake-view draw calls | 224 | 163 |
| Cake-view processed triangles | 2,180,700 | 1,961,908 |
| Loaded textures at cake | 188 | 160 |
| Embedded decoded-image estimate | 295 MiB | 238.6 MiB |

This is about 27% fewer draw submissions, 10% fewer processed triangles and 19% less embedded decoded-image memory during the first cake visit. It is **not** a measured FPS improvement. Production and local development timing samples have different histories and are not a controlled benchmark. The local room-entry wait was 8,974 ms in one run before the additional closed-door redraw pause. Frame submission remained slow (roughly 125–135 ms in the cake view); actual smoothness is still unresolved on this test GPU. The memory estimate excludes total driver/GPU allocations.

The first trial deferred the courtyard too. Visual inspection caught the missing window exterior; that trial was rejected and the courtyard restored to the entry dependencies. The final cake, curtains, room and window were inspected against production at the same authored camera. No pixel-exact comparison is claimed.

## Validation

- **104 automated checks passed** with `--test-concurrency=1`; TypeScript `--noEmit --incremental false` passed. The new checks exercise the actual engine loading coordinator without a GPU constructor, static-matrix preservation, redraw invalidation and closed-door pause/resume.
- Real WebGL journey tested through opening, entry, wish, candle-out/celebration, deferred exit loading, keepsake modal, gift unwrap despite backward input, teddy inspection, final letter, replay and bedroom camera controls.
- Final fresh-load test after the closed-door pause: entry became ready at 8 groups, with an 8,337 ms gate wait; no browser error-level logs. The waiting UI stayed visible while render submission dropped to zero; normal rendering resumed when ready. Development-mode Strict Mode registration-abort warnings were observed during initial setup.
- Real microphone, target Windows laptop, physical Android device, cold Vercel download timing and a production build were not tested in this pass. No build command was run.
- Follow-up deployment on 23 September, explicitly requested by the user: production deployment `dpl_5f5r7P9CnvXmVU1uCgdPQhQ3EPRr` reached READY and was aliased to https://birthday-world-musfira.vercel.app/. The live opening screen became ready with the new diagnostic fields and no browser error logs. Home page, personal content, cake and manifest returned HTTP 200; the three asset/content hashes matched local files. The home-laptop performance caveat remains.

## Next material improvement

Measure a controlled cake-view GPU profile on the target Windows Chrome device first, including its renderer/fallback information. For a larger gain while preserving the approved appearance, create a separate candidate export that bakes static direct diffuse lighting into lightmaps and reduces unnecessary high-frequency decorative geometry with preserved normals/UVs; retain dynamic candle light, reflections and moving actors. Compare room-wide and close-up views before accepting it. This is a Blender/material-pipeline change requiring visual validation, not another package installation or a promise that every laptop will run at 60 FPS.
