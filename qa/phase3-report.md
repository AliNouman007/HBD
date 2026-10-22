# Birthday World — Phase 3 checkpoint, 15 September 2026

**The bedroom teddy has been removed. The gift teddy remains.** The Phase 3 application is integrated and builds successfully, but final production acceptance is blocked by the review environment. The current live Site has not been replaced with unreviewed work.

## Acceptance boundary

The supported review Chrome reports `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` and `BindToCurrentSequence failed`. Both high-performance and default WebGL renderer attempts fail. The available browser capabilities do not expose a GPU-enable setting. The final integrated application was retried and displays a recoverable WebGL failure message. This is an environment limitation; it is not evidence that the 3D world rendered correctly.

The microphone availability fallback and simulated permission-denial path work. Live breath input could not be tested: the review URL is not a secure microphone origin and there is no usable live input here. Audio decoding, gesture unlock, mute state and event dispatch were exercised, and the vocal excerpt was transcribed locally to check for an unintended name. The current model cannot listen to the sound journey, so vocal quality, natural ambience and mix acceptance remain open.

No complete six-scene 3D browser walkthrough is claimed. UI fixtures do not verify the camera, smoke appearance, lighting, material finish, physical occlusion or GPU performance. The isolated particle recording is actual browser Canvas output, explicitly not the complete world.

## Changes and review findings

| Area | Change and evidence |
|---|---|
| Bedroom | Removed all 34 `P2.Bedroom.Teddy` objects in two separate Blender copies. Rendered and inspected the opening, +35° Free Look edge and laptop approach. Bed, desk and laptop remained intact. |
| Export | Re-exported/optimized the bedroom. Retained the other nine final Phase 2 GLBs byte for byte, including the approved cake, flames and small gift teddy. |
| Indirect light | Corrected a black initial rebake by explicitly activating the bake UV. Re-baked bedroom indirect illumination. Compressed four linear EXRs to half-float ZIP. |
| Browser materials | Asset QA found multi-material glTF parent metadata was not reaching child meshes. Fixed inheritance. A second check found shared wood/trim materials could leak lightmaps onto unbaked props; cloned receiver materials and verified zero leaks. |
| Loading/portal | Bedroom-first streaming, two transfers at a time, bounded decoder workers, incremental texture preparation, shader warm-up and real progress. Live portal target is reused and sized only when needed. Projection covers desktop and portrait aspect ratios; final visual blend is unverified. |
| Doors | Integrated native `EntryDoor.Open` and `ExitDoor.Open` clips with independent gates. Browser data checks measured ~102° entry rotation and ~70° on each exit leaf. |
| Wish | Preserved original cake/flame geometry and pale-smoke implementation. Three flame lights turn off; the smoke and date holds reject accumulated input. |
| Celebration | Date forms, then Musfira; both hold before release. Fixed desktop text overlap and the diagonal artifact in drifting dust. Reduced-motion typography is available. |
| Memories | Real courtyard assets and physical portrait/received-card slots. Image inspection pauses the journey and returns focus. Fixed focus loss after closing an unmounted trigger button. |
| Gift | Scroll-driven ribbon/lid/front opening; accessible timed unwrapping; bounded teddy inspection. Fixed idle input cancelling timed unwrapping and fixed yaw to glTF Y-up. The box remains still during inspection. |
| Letter/ending | Preserved generic letter text and reading panel. Configured realistic exported oak. Sequential goodbye lines and intentional replay reset. Removed the forward-travel hint at the final endpoint. |
| Audio | Gesture-unlocked local sound graph, scene crossfades, short public-domain vocal excerpt, door/ribbon/paper cues, microphone ducking, mute preference and replay cleanup. Final listening approval remains open. |
| Memory use | Exact embedded-image reuse across staged GLBs, with reference-counted lifetime and unchanged samplers, pixels and colour-space roles. |

## Verification

- TypeScript check passes.
- 27 controller/continuity/material/resource regression tests pass.
- Ten final GLBs pass decoded Khronos glTF validation with zero errors. Three.js loaded actual geometry, textures, animations and morph targets in CPU validation.
- Real browser asset audit loaded all ten GLBs, photos and EXRs; portal alignment was 1.0, bedroom teddy count was zero and the gift teddy was found.
- Receiver counts were bedroom 3, salon 5, courtyard 3 and ending 1; all used UV channel 1, all maps were nonzero, and no indirect map leaked to an unbaked prop.
- Original Phase 2 world/web Blender hashes are unchanged. Nine retained GLB hashes match Phase 2 exactly.
- Production static build succeeds and contains `index.html` plus required JavaScript, world, lighting, personal and audio assets.
- Browser UI flow exercised opening, Free Look entry/exit, both doors, microphone denial/unavailability, tap wish, timed extinction/date, portrait/card inspection, gift, letter, ending and replay. Mobile layout checks use a 390 × 844 iframe, not phone hardware.

Some desktop and mobile UI passes occurred during development hot reload, which restarts the audio graph. Those runs are not a continuous listening or resource-leak acceptance test. The normal replay controller and image ownership have dedicated regression checks.

## Evidence supplied

`qa/evidence/phase3-*` contains labelled browser UI screenshots, the WebGL error, and ending/replay state snapshots. Mobile wish, teddy controls, letter, ending and reduced-motion date layouts were inspected. The QA ZIP also includes three native Blender bedroom renders and the final isolated Canvas celebration recording. Those are explicitly separated from full-world browser evidence, which remains unavailable.

The browser recording was captured in the foreground at 1150 × 650 with 326 frames over roughly 11 seconds. Its MP4 is a format conversion of that real browser capture; it is not Blender footage or a camera walkthrough.

## Measurements

| Measurement | Result / scope |
|---|---|
| Browser | Cloud Chrome 151; reported macOS 10.15.7 user agent; 1363 × 936 viewport; DPR 1; WebGL unavailable. |
| Mobile layout | 390 × 844 CSS-pixel iframe. No physical phone or mobile GPU measurement. |
| Final GLBs | 50,440,528 bytes across ten groups. |
| Bedroom GLB | 7,488,752 bytes; final Phase 2 bedroom before teddy removal was 12,702,184 bytes. This is not a comparison with the older live browser's lower-detail bedroom. |
| Indirect maps | 6,980,788 bytes total, down from 40,953,152 bytes. The three unchanged maps have maximum measured component error below 0.002 after half-float conversion. |
| Browser asset audit | 2,527 ms total in a repeat run via the local preview; cache state was uncontrolled; two decoder workers; eight long tasks; longest 274 ms. This excludes shader compilation and GPU uploads, and is not a public-network load benchmark. |
| Decoded embedded images | 163 unique images; 295 MiB of decoded RGBA image data; 114 MiB of duplicate decoded images avoided. Excludes GPU mipmaps, geometry, render targets, personal canvases and lightmaps. |
| Rendering frame time / GPU memory | Not measured. Cannot claim desktop or mobile FPS. |

The preserved cake alone contains about 1.06 million triangles. Salon scenery is also substantial. Real phone/GPU testing is still necessary before choosing any further visibility/LOD or shadow budgets; hero geometry has not been silently simplified.

## Personalization still needed

Musfira's approved portrait, the actual card she gave you, optional bedroom photographs and the final personal letter text. The current woman is an explicitly fictional placeholder. The received-card placeholder does not invent a message or history. Edit `public/personal-content.json`; the gift tag and ending copy are centralized there too.

## Remaining work before release

Run the real world in a supported WebGL2 review environment; inspect all production camera poses and interaction views; compare browser exposure, colour and lightmaps with the Blender renders; verify portal continuity, physical door passage, smoke, gift rotation and all resize/orientation cases. Complete a real phone/performance pass and live microphone test. Listen to the entire sound journey, adjust the mix if needed, and record the final first-time-user walkthrough without debug shortcuts. Only then publish and claim production readiness.

The current source connector requires `publish_on_push = private`; it did not accept a non-publishing credential request. No publishing push was made while visual acceptance remained blocked. The complete unpublished source/build are supplied as downloadable artifacts.
