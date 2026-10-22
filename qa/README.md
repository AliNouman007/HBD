# Current Phase 3 checkpoint

Read `phase3-report.md`, `phase3-browser-asset-audit.json`, `phase3-gltf-validation.json`, `phase3-build-validation.json` and `phase3-controller-tests.txt` for the current implementation. Earlier revision reports below are historical. No complete 3D browser visual acceptance is claimed.

Current revision: see `revision-4-report.md` for the 25 October and portal review. Older reports are retained as historical evidence.

# QA status

Current results: [rendering revision 3](revision-report.md), with 12 automated tests and the current browser asset audit.

This is the integrated visual/interaction revision. Full 3D browser acceptance is BLOCKED, not passed.

The available cloud Chrome session reports `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled` and fails to create a WebGL context. The normal route renders the designed recovery message. No browser-rendered six-scene screenshots, successful 3D walkthrough recording, visual match, or FPS claim can be provided from that environment.

`/?qa=1&uiOnly=1` is an explicitly labeled UI STATE FIXTURE. It runs the same Journey controller and controls without constructing a renderer. It is useful for button, keyboard, gate and microphone-error flow checks. It is not a substitute for 3D acceptance or visual proof.

`/qa/assets` decodes the actual GLBs, checks the portal UVs, applies all four demo images and verifies that the exported door panel follows its hinge. Its timing numbers describe asset decoding/loading in this cloud environment, not rendering or end-user cold network performance.

`/qa` embeds the real application in desktop or 390 × 844 CSS-pixel viewports. `/?qa=1` also exposes a local canvas recorder and diagnostics. The recorder uses only the WebGL canvas stream, never microphone audio. A working WebGL2 environment is needed.

Run automated controller and asset checks:

```sh
node --experimental-strip-types --test qa/*.test.ts
node tools/export/validate-assets.mjs
pnpm exec tsc --noEmit
```

Remaining acceptance checks on a WebGL-enabled browser:

1. Complete bedroom, laptop portal, garden door, birthday room, wish, terrace, memories and letter.
2. Confirm exact screen alignment at the portal cut and source camera clearance.
3. Confirm door/lever pivot direction; tap and rapid-scroll gates; reverse with open door.
4. Deny microphone permission, use tap fallback; verify exactly three flames vanish with zero flame lighting and thin smoke.
5. Verify microphone secure-context handling, then test an actual live breath; heuristic detection is not a breath classifier.
6. Check supplied photos on existing UV inserts when actual photos become available.
7. Check portrait concealment, letter reading hold, backward route and full replay reset.
8. Compare scene framing, textile/wood detail, exposure, glass and shadows against the actual Blender renders.
9. Record GPU/browser/device, resolution, median/p95 frame times and cold-load time. Current exported triangle counts are not FPS measurements.
10. Capture all six scenes on desktop/mobile and download an actual browser-canvas walkthrough.
