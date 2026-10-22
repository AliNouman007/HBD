# Birthday World — Phase 3 integration checkpoint

The existing React + TypeScript + Three.js experience now uses the final Phase 2 world, with **only the large bedroom teddy removed**. The small gift teddy is retained. The story and existing cake, three candles, pale smoke and birthday letter are preserved.

**Acceptance is still open.** The available review Chrome reports `GL_VENDOR/GL_RENDERER = Disabled`; its supported controls cannot enable WebGL. The actual 3D browser journey, final lighting comparison, mobile GPU performance and full browser walkthrough could not be signed off. Audio playback/decoding and event timing were checked programmatically, but this environment cannot provide a listening review. This build is an integration checkpoint, not a production-ready certification. See `qa/phase3-report.md`.

## Run

Use Node 22.18+ and the pinned pnpm 11.25.0 package manager:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the development URL in a WebGL2-capable browser. Microphone access needs HTTPS or localhost. Tap-to-wish remains available without microphone access.

```sh
pnpm build
python3 -m http.server 8080 --directory dist/client
```

`dist/client/` is the complete static distribution, including `index.html`, JavaScript, `world/`, EXR lightmaps, personal placeholders and audio. Keep the directory together and serve it at the site's root over HTTP(S). Direct `file://` opening is unsupported. No backend or API key is required for the experience.

## Journey and controls

1. Enter with sound, enter quietly, or use the optional bounded bedroom Free Look. Drag or use its arrow controls; Return restores the route.
2. Scroll, trackpad, vertical swipe, Up/Down or PageUp/PageDown move the camera. The laptop's live garden view is prepared before the portal gate releases. The separated bedroom and garden sets are joined by matched projection.
3. Open the entry door with its button, Space or the physical doorway. The native handle/hinge clip completes before travel resumes.
4. Pause at the cake. Explicitly request the microphone or tap to make a wish. Three flames and their lights go out; the existing pale smoke holds for 7.2 seconds. A quiet 11-second Musfira / 25 October particle moment follows.
5. Open the second door, visit the portrait and the separate received-card display. Their inspection panels pause the route and return keyboard focus correctly.
6. Scroll to unwrap the gift, or press Unwrap gift for timed opening. Limited teddy rotation uses drag or arrow controls. Return and Continue resume the route.
7. Read the preserved birthday letter indefinitely. Continue to the quiet, sequential ending and Begin again.

Reverse travel retains completed door, wish and gift events. Replay intentionally resets every story event, camera mode and audio cue without re-downloading assets. Escape closes inspection or stops microphone listening. Reduced-motion preferences disable decorative travel effects and provide Previous view / Next view controls.

Sound starts only from an explicit user action. Mute preference is stored locally. Playback is ducked before microphone calibration. Audio input is analyzed transiently on-device; no recording, storage or upload occurs in the microphone path. QA viewport recording is a separate explicit screen-capture action.

## Personal content

Edit `public/personal-content.json`, or `personal-content.json` in a built distribution. Use same-origin paths under `/personal/`; add the files before rebuilding.

| Key | Purpose |
|---|---|
| `recipientName`, `birthday` | Musfira, day 25 / month 10; no year or age is assumed. |
| `bedroomPhotos[0..1]` | Two physical bedroom photographs. |
| `portrait` | Large courtyard portrait; current image is explicitly fictional, not Musfira. |
| `receivedCard` | The card Musfira gave you, separate from the birthday letter. |
| `gift.tag` | Physical tag and gift caption. |
| `letter.title`, `paragraphs`, `signature` | Actual paper texture plus accessible, scrollable reading panel. |
| `ending[0..2]` | Three sequential goodbye lines. |
| `audio.birthday`, `audio.credits` | Local birthday vocal excerpt and attribution. |

Each photo supports `image`, `alt`, `placeholder`, `fallback` and optional normalized `crop: [x,y,width,height]`. Physical mounts preserve aspect ratio; the inspection view shows the original image. Use approved personal photographs, set accurate alternative text and clear `placeholder` when replacing them. Keep a neutral local fallback. Final personal portrait, received-card image and personal letter text are still needed.

`public/audio/credits.json` documents the public-domain recording and original synthesized sound design. `tools/audio/prepare-birthday.sh` reproduces the short excerpt. Machine transcription found only the two generic opening birthday phrases. Listening quality and the final mix remain unreviewed.

## Asset and rendering contract

`public/world/phase3-manifest.json` hashes the exact integrated asset set. Do not mix earlier cameras or GLBs with these files. There are ten groups: bedroom, garden, door, salon, cake, flames, exit-door, courtyard, gift and ending. The former terrace export is retired.

- Coordinates are already glTF Y-up metres. Camera quaternions are `[x,y,z,w]`; derive vertical FOV from the authored horizontal sensor and actual aspect ratio.
- The portal matches frame 180 to 181. It never travels through the empty distance between sets.
- `EntryDoor.Open`, `ExitDoor.Open` and `Gift.Unwrap` are authoritative glTF clips. Sidecar Euler values are Blender-local reference data, not browser transforms.
- `extras.p2_indirect` identifies indirect-only EXR receivers on UV channel 1. GLTFLoader's multi-material child meshes inherit the receiver metadata. Their materials are cloned so maps never leak to unrelated props sharing wood/metal materials.
- Preserve authored material sidedness, texture colour spaces, normal maps and hero geometry. Browser direct light/exposure require final GPU comparison against Blender.
- Staging prioritizes bedroom, then garden/door, then the interior and finally courtyard/gift/ending. Downloaded textures are prepared in small batches, with shader warm-up and bounded decoder workers.
- Byte-identical embedded texture images share a reference-counted source without resampling. Texture samplers and colour-space roles remain separate. The runtime reports decoded-image savings separately from unmeasured GPU memory.

The separate 3D handoff contains both modified Blender copies, exact exports, render evidence and reproducible scripts. Earlier `tools/blender` and modeling scripts in this repository are historical; use the Phase 3 handoff for rebuilding the current world.

## QA

```sh
pnpm exec tsc --noEmit
pnpm test:journey
pnpm check:assets
```

- `/?qa=1`: real renderer and diagnostics; explicit viewport recorder.
- `/qa`: desktop or 390 × 844 iframe; UI-only fixture is clearly labelled and is not 3D proof.
- `/qa/assets`: actual GLB, animation, photo, indirect-map and image-sharing audit without a GPU renderer.
- `/qa/celebration`: real Canvas particle effect over a labelled Blender still; its recorder captures only the effect.

The UI-only fixture uses the production state controller and audio system. Its state tests do not verify geometry, smoke appearance, camera occlusion, shader compilation, FPS or touch hardware. Preserve this distinction when continuing acceptance testing.
