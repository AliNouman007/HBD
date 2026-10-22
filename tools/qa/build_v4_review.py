"""PROJECT_ROOT SCRATCH_ROOT OUTPUT_DIRECTORY: reproducible, self-contained review."""
from pathlib import Path
import sys, json, base64, mimetypes, html, shutil
project, scratch, output = map(lambda x: Path(x).resolve(), sys.argv[1:4])
output.mkdir(parents=True, exist_ok=True)
audit=json.loads((project/'qa/v4-browser-asset-audit.json').read_text())
metrics=next(row['pipeline'] for row in audit if 'pipeline' in row)
quality=json.loads((project/'qa/v4-quality-preservation.json').read_text())
total=sum(row['bytes'] for row in quality)
fixes=[
 ('Startup and portal wait','All eight transfers start together. Meshopt uses two workers when supported, with a tested worker-availability probe and the original decoding fallback. Groups still prepare in order to bound work.'),
 ('Mid-journey preparation','The bedroom appears first. Step inside becomes available after the connected world, textures, shader variants and entrance view are prepared. Startup work finishes before camera travel; the portal safety gate remains.'),
 ('Texture upload stalls','Texture preparation yields after a four-millisecond budget. One indivisible upload may still exceed that budget. Both portal and direct-view shader variants prepare ahead of entry.'),
 ('Soft or mismatched laptop view','The portal target follows viewport pixel density and uses half-float colour to preserve highlights before tone mapping. The previous fixed 1008 × 600 target could soften the view and clip bright linear colour.'),
 ('Automatic blur','The automatic reduction of render resolution on slow frames is removed. All eight GLBs are byte-for-byte identical to revision 3; no geometry or texture-detail reduction was introduced.'),
 ('25 October surprise','After the three-candle smoke beat, warm gold particles gather into 25 OCT, hold, then drift away. Continue is available after formation. The camera stays still; reverse does not replay the event, and Replay resets it intentionally.'),
 ('Accessible motion','The OS reduced-motion preference is followed live. The date uses quiet solid lettering in that mode. The date is also announced as text; controls support keyboard and touch.')
]
scenes=[
 ('01 · Bedroom / laptop',scratch/'refinement-v3/export-renders/blender-frame-0001.png','Blush, ivory and oak read consistently in the source render. The laptop preview is visible. The view beyond the window is still sparse; bedding remains simpler than a photographic reference. Portal GPU appearance is unverified.'),
 ('02 · Garden / doorway',scratch/'review-v4/renders/blender-frame-0240.png','The path leads clearly to the arched door and the floral borders frame it well. Repeated leaf shapes and groomed planting still look authored. Door geometry clears the centre ray in the browser asset check; moving shadows need a GPU pass.'),
 ('03 · Birthday room',scratch/'refinement-v3/export-renders/blender-frame-0610.png','The cake is visible on approach and the exit remains readable on the right. Warm plaster, curtains and timber fit the bedroom palette. Upholstery, flowers and icing retain some modeled simplicity.'),
 ('04 · Wish / date',scratch/'refinement-v3/renders/blender-frame-0945.png','All three candles fit the held composition. The lower cake is intentionally cropped in this close view. The new date follows the smoke and keeps the camera still. Browser smoke and exposure remain unverified.'),
 ('05 · Portrait / memories',scratch/'review-v4/renders/blender-frame-1740.png','The portrait fills its physical frame and becomes centred after the camera turn. It is a fictional adult demo. The three small frames repeat crops of one botanical artwork; these need distinct personal content and are currently passive.'),
 ('06 · Letter / ending',scratch/'refinement-v3/export-renders/blender-frame-2520.png','Oak grain and the letter are visible in the export-material render. The accessible reading panel supports a longer letter, but the current message is generic. Her actual name, message and signature would add more value than extra decoration.')
]
ideas=[
 ('First priority','Three tappable memory frames','One shared moment; one thing she loves; one future plan or wish. Each tap opens the photo and one or two short sentences, with Back to world. Use actual supplied details.'),
 ('First priority','A personal voice note','An optional Listen to my wish control at the final letter, with a text transcript and mute/stop. A short recording in your own voice would make the ending more personal.'),
 ('Second priority','A little keepsake','At the ending, let her save a tasteful 25 October birthday card using her chosen photo and message. Keep this optional and local; no account or upload is needed.'),
 ('Second priority','One hidden note','A single flower or envelope reveals a short supplied note on tap. Keep it optional so the main birthday journey remains easy to follow.'),
 ('Optional','Sound she chooses','A clear sound-on control for a supplied favourite track or licensed quiet ambience. Keep mute available throughout and avoid autoplay.')
]
report=f'''# Birthday World — visual review and revision 4

The 25 October moment and portal preparation changes are implemented in the existing Site. **Full 3D browser visual acceptance is still blocked: the available browser reports GL_VENDOR and GL_RENDERER as Disabled.** This is not a ready-to-ship certification.

## What changed

'''+'\n'.join(f'- **{a}:** {b}' for a,b in fixes)+f'''

## What was actually reviewed

The supplied 20-second MP4 was inspected as sampled frames: a particle field forms 25 OCT, holds, then disperses. The adaptation uses a warm gold typographic particle overlay after the wish, rather than adding another room or changing the route. It is a browser Canvas 2D effect over the real 3D view, not a movie playing in place of the world.

All six scenes were reviewed through current Blender/export-material stills. Two additional renders, garden frame 240 and portrait frame 1740, were produced from the unchanged working copy. The date effect itself was inspected in the browser at desktop and 390 × 844 portrait sizes, including reduced motion. Its composition fixture uses a clearly labelled Blender still as background; that still is absent from the normal experience.

'''+'\n\n'.join(f'**{name}:** {finding}' for name,_,finding in scenes)+f'''

## Interaction suggestions

These are recommendations, not features silently added in this revision. The date surprise is implemented; the following personal additions need your selected content.

| Priority | Addition | What she can do |
| --- | --- | --- |
'''+'\n'.join(f'| {a} | {b} | {c} |' for a,b,c in ideas)+f'''

## Validation and measured limits

- 16 automated tests pass; TypeScript passes. Tests cover door/wish/date gates, input discard, camera continuity, portal target sizing, reverse and replay, and budgeted preparation without losing items.
- All eight actual GLBs load and decode in the browser. Portal UV and direction checks pass; the door panel moves 1.104 m and clears the central view; the cake is in the open-door frustum; all four images and the oak letter texture are present.
- The revised asset diagnostic observed **{metrics['elapsedMs']} ms** from concurrent transfer start through ordered decoding/checks, **{metrics['decoderWorkers']} decoding workers**, **{metrics['longTasks']} main-thread tasks over 50 ms**, and a longest task of **{metrics['longestTaskMs']} ms**. Local preview cache state was uncontrolled. This excludes GPU preparation and is not a guaranteed cold-load or FPS result.
- The eight GLBs remain **{total:,} bytes** total, with exactly the revision-3 bytes. Full-group geometry remains 6,736,620 triangles; only a real rendering pass can establish actual frame cost.
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
'''
(project/'qa/revision-4-report.md').write_text(report)
(output/'birthday-world-QA-report.md').write_text(report)
def data(path):
 return f'data:{mimetypes.guess_type(path.name)[0]};base64,'+base64.b64encode(path.read_bytes()).decode()
def figure(path,title,caption):
 return f'<figure><img loading="lazy" src="{data(path)}" alt="{html.escape(title)}"><figcaption><b>{html.escape(title)}</b><p>{html.escape(caption)}</p></figcaption></figure>'
rows=''.join(f'<tr><th>{html.escape(a)}</th><td>{html.escape(b)}</td></tr>' for a,b in fixes)
idea_rows=''.join(f'<tr><td>{html.escape(a)}</td><th>{html.escape(b)}</th><td>{html.escape(c)}</td></tr>' for a,b,c in ideas)
body=f'''<p class="eyebrow">BIRTHDAY WORLD · 25 OCTOBER · REVISION 4</p><h1>A more personal pause.<br>A better-prepared portal.</h1><p class="notice"><b>Implemented and reviewed within the available environment.</b> Full browser 3D visuals and GPU performance remain unverified because WebGL is disabled. The images below distinguish Blender source renders from actual browser effect and control captures.</p><nav><a href="#date">25 OCT</a><a href="#scenes">Six scenes</a><a href="#changes">Changes</a><a href="#ideas">Personal interactions</a><a href="#qa">QA limits</a></nav>
<section id="date"><h2>The 25 October moment</h2><p>Placed after the candle smoke, before travelling to the memories. Gold particles form the date, hold, and drift away. The date is configurable; no age or birth year has been assumed.</p>{figure(project/'qa/evidence/v4-date-desktop.jpg','Actual browser effect · desktop','The date overlay is live browser rendering; the background is a labelled Blender still in this isolated QA fixture. Normal production uses the actual world behind the overlay.')}<div class="grid">{figure(project/'qa/evidence/v4-date-mobile.jpg','390 × 844 composition','The date remains inside the portrait viewport.')}{figure(project/'qa/evidence/v4-date-reduced.jpg','Reduced motion','Solid, readable typography replaces particle travel.')}</div><video controls muted playsinline preload="metadata" src="{data(output/'birthday-25-oct-browser-effect.mp4')}"></video><p class="caption">Actual browser particle-canvas recording only. This cloud capture is approximately 9.83 fps and does not prove production frame rate or full-world rendering.</p></section>
<section id="scenes"><h2>Scene-by-scene visual findings</h2><p>Every image in this section is a current Blender or export-material CPU render. Browser lighting may differ.</p><div class="grid">'''+''.join(figure(path,name,finding) for name,path,finding in scenes)+f'''</div></section><section id="changes"><h2>Changes applied</h2><table>{rows}</table></section><section id="ideas"><h2>What I would add for her</h2><p>Personal content will make the largest difference now. These recommendations are separate from the implemented date reveal.</p><table><thead><tr><th>Priority</th><th>Interaction</th><th>Experience</th></tr></thead><tbody>{idea_rows}</tbody></table><p>For the three small frames: a shared moment, something she loves, and a future plan or wish. Use her actual photos and your own short notes; do not invent a personal history.</p></section><section id="qa"><h2>What passed — and what remains open</h2><div class="metrics"><p><strong>16</strong>automated tests passed</p><p><strong>8 / 8</strong>actual GLBs decoded</p><p><strong>{total/1e6:.2f} MB</strong>unchanged 3D assets</p><p><strong>{metrics['elapsedMs']} ms</strong>observed asset pipeline</p></div><p>The pipeline used {metrics['decoderWorkers']} decoding workers. {metrics['longTasks']} main-thread tasks exceeded 50 ms; the longest was {metrics['longestTaskMs']} ms. Cache state was uncontrolled, and GPU preparation was excluded.</p>{figure(project/'qa/evidence/v4-integrated-date.jpg','Integrated wish → date control state','Actual UI-only browser capture: progress remains 0.56 and candles remain extinguished. This does not show 3D rendering.')}<p class="notice"><b>Still needed before an honest ready-to-ship sign-off:</b> a WebGL-enabled full journey and real-device performance pass; her actual portrait, memory content and letter; and recipient access to the currently owner-private Site. The source world still has simplified exterior, vegetation and soft-material detail. Live microphone blowing is untested.</p></section>'''
document='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Birthday World · 25 October review</title><style>body{margin:0;background:#f4eee6;color:#493b39;font:16px/1.65 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:44px 24px}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.13}h1{font-size:clamp(38px,5vw,62px);letter-spacing:-.035em}h2{font-size:34px;margin:0 0 18px}section{padding-top:54px}.eyebrow{font-size:12px;letter-spacing:.18em;color:#8a615c}.notice{padding:20px 24px;background:#ead9d2;border-left:3px solid #95686a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:24px}figure{margin:0 0 22px;background:#fffaf3;border:1px solid #dbcab9}figure img{display:block;width:100%;height:auto}figcaption{padding:18px 22px}figcaption p{font-size:14px;margin:6px 0}nav{display:flex;gap:20px;flex-wrap:wrap;border-bottom:1px solid #d6c4b3;padding:15px 0}a{color:#855a5b}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:16px 12px;border-bottom:1px solid #d6c4b3}th{min-width:150px}video{display:block;width:100%;max-height:600px;background:#1d191e}.caption{font-size:13px;color:#786762}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.metrics strong{display:block;font:32px Georgia;color:#865c58}.metrics p{font-size:13px}@media(max-width:740px){main{padding:24px 16px}.grid{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}h2{font-size:28px}th,td{padding:12px 7px}th{min-width:80px}}</style><main>'''+body+'</main></html>'
(output/'birthday-world-visual-review-v4.html').write_text(document)
shutil.copy2(project/'qa/evidence/v4-date-desktop.jpg',output/'birthday-world-25-oct-review.jpg')
print(json.dumps({'review':str(output/'birthday-world-visual-review-v4.html'),'report':str(output/'birthday-world-QA-report.md'),'sceneRenders':len(scenes)}))
