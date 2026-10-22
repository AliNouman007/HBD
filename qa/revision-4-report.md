# Birthday World — visual review and revision 4

The 25 October moment and portal preparation changes are implemented in the existing Site. **Full 3D browser visual acceptance is still blocked: the available browser reports GL_VENDOR and GL_RENDERER as Disabled.** This is not a ready-to-ship certification.

## What changed

- **Startup and portal wait:** All eight transfers start together. Meshopt uses two workers when supported, with a tested worker-availability probe and the original decoding fallback. Groups still prepare in order to bound work.
- **Mid-journey preparation:** The bedroom appears first. Step inside becomes available after the connected world, textures, shader variants and entrance view are prepared. Startup work finishes before camera travel; the portal safety gate remains.
- **Texture upload stalls:** Texture preparation yields after a four-millisecond budget. One indivisible upload may still exceed that budget. Both portal and direct-view shader variants prepare ahead of entry.
- **Soft or mismatched laptop view:** The portal target follows viewport pixel density and uses half-float colour to preserve highlights before tone mapping. The previous fixed 1008 × 600 target could soften the view and clip bright linear colour.
- **Automatic blur:** The automatic reduction of render resolution on slow frames is removed. All eight GLBs are byte-for-byte identical to revision 3; no geometry or texture-detail reduction was introduced.
- **25 October surprise:** After the three-candle smoke beat, warm gold particles gather into 25 OCT, hold, then drift away. Continue is available after formation. The camera stays still; reverse does not replay the event, and Replay resets it intentionally.
- **Accessible motion:** The OS reduced-motion preference is followed live. The date uses quiet solid lettering in that mode. The date is also announced as text; controls support keyboard and touch.

## What was actually reviewed

The supplied 20-second MP4 was inspected as sampled frames: a particle field forms 25 OCT, holds, then disperses. The adaptation uses a warm gold typographic particle overlay after the wish, rather than adding another room or changing the route. It is a browser Canvas 2D effect over the real 3D view, not a movie playing in place of the world.

All six scenes were reviewed through current Blender/export-material stills. Two additional renders, garden frame 240 and portrait frame 1740, were produced from the unchanged working copy. The date effect itself was inspected in the browser at desktop and 390 × 844 portrait sizes, including reduced motion. Its composition fixture uses a clearly labelled Blender still as background; that still is absent from the normal experience.

**01 · Bedroom / laptop:** Blush, ivory and oak read consistently in the source render. The laptop preview is visible. The view beyond the window is still sparse; bedding remains simpler than a photographic reference. Portal GPU appearance is unverified.

**02 · Garden / doorway:** The path leads clearly to the arched door and the floral borders frame it well. Repeated leaf shapes and groomed planting still look authored. Door geometry clears the centre ray in the browser asset check; moving shadows need a GPU pass.

**03 · Birthday room:** The cake is visible on approach and the exit remains readable on the right. Warm plaster, curtains and timber fit the bedroom palette. Upholstery, flowers and icing retain some modeled simplicity.

**04 · Wish / date:** All three candles fit the held composition. The lower cake is intentionally cropped in this close view. The new date follows the smoke and keeps the camera still. Browser smoke and exposure remain unverified.

**05 · Portrait / memories:** The portrait fills its physical frame and becomes centred after the camera turn. It is a fictional adult demo. The three small frames repeat crops of one botanical artwork; these need distinct personal content and are currently passive.

**06 · Letter / ending:** Oak grain and the letter are visible in the export-material render. The accessible reading panel supports a longer letter, but the current message is generic. Her actual name, message and signature would add more value than extra decoration.

## Interaction suggestions

These are recommendations, not features silently added in this revision. The date surprise is implemented; the following personal additions need your selected content.

| Priority | Addition | What she can do |
| --- | --- | --- |
| First priority | Three tappable memory frames | One shared moment; one thing she loves; one future plan or wish. Each tap opens the photo and one or two short sentences, with Back to world. Use actual supplied details. |
| First priority | A personal voice note | An optional Listen to my wish control at the final letter, with a text transcript and mute/stop. A short recording in your own voice would make the ending more personal. |
| Second priority | A little keepsake | At the ending, let her save a tasteful 25 October birthday card using her chosen photo and message. Keep this optional and local; no account or upload is needed. |
| Second priority | One hidden note | A single flower or envelope reveals a short supplied note on tap. Keep it optional so the main birthday journey remains easy to follow. |
| Optional | Sound she chooses | A clear sound-on control for a supplied favourite track or licensed quiet ambience. Keep mute available throughout and avoid autoplay. |

## Validation and measured limits

- 16 automated tests pass; TypeScript passes. Tests cover door/wish/date gates, input discard, camera continuity, portal target sizing, reverse and replay, and budgeted preparation without losing items.
- All eight actual GLBs load and decode in the browser. Portal UV and direction checks pass; the door panel moves 1.104 m and clears the central view; the cake is in the open-door frustum; all four images and the oak letter texture are present.
- The revised asset diagnostic observed **1358 ms** from concurrent transfer start through ordered decoding/checks, **2 decoding workers**, **4 main-thread tasks over 50 ms**, and a longest task of **98 ms**. Local preview cache state was uncontrolled. This excludes GPU preparation and is not a guaranteed cold-load or FPS result.
- The eight GLBs remain **38,929,072 bytes** total, with exactly the revision-3 bytes. Full-group geometry remains 6,736,620 triangles; only a real rendering pass can establish actual frame cost.
- Desktop UI-only journey checks reached door, wish, the integrated date at progress 0.56, memories, final letter and ending. Microphone denial and the tap alternative were tested. Reverse preserved extinction, and intentional replay reset the journey. This is interaction proof, not 3D rendering proof.
- Cloud Chrome 151, macOS/Intel user agent, 1363 × 936 CSS viewport, DPR 1. The 390 × 844 test is an emulated layout, not a physical phone. Source stills: Blender 4.3, CPU Cycles, 24 samples, 1200 × 750. No live microphone blowing, GPU frame rate, VRAM, moving-shadow or full portal visual result is claimed.
- The supplied effect MP4 is an actual browser particle-canvas recording: 1150 × 650, 81 captured frames, about 8.24 seconds. This cloud capture is approximately 9.83 frames/s; it is not a smoothness benchmark and is not a six-scene walkthrough. No interpolation or Blender footage was substituted for it.

## Remaining delivery blockers

1. A WebGL-enabled full journey pass is still required for portal alignment/colour, door clearance, smoke, shadows, frame pacing and desktop/mobile GPU performance. Startup preparation may still take time on slower connections. The portal changes are code- and asset-validated, not visually GPU-validated.
2. The portrait, three memory images, recipient name and final letter are still demo/generic content. The three small frames currently have no tap-to-read interaction.
3. Browser materials and lighting approximate the Blender source. Exterior detail, vegetation variation, upholstery and icing remain simpler than photography. No new full lightmap bake was performed.
4. The Site remains owner-private. The intended recipient will need appropriate access before it is sent as a gift; no audience change was made.

The Blender master and working copy remain revision 3 because this update changes runtime loading and browser presentation, not the authored world geometry. Reproducible Blender/export scripts, exact assets, source, lockfile and evidence are included in the updated source ZIP. The production ZIP contains index.html and all required runtime assets.

Implementation references: [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Meshopt decoder API](https://github.com/zeux/meshoptimizer/blob/master/js/meshopt_decoder.module.d.ts).
