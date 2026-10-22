"""Build the self-contained rendering review and concise QA report.
PROJECT_ROOT REVISION_DIRECTORY ATTACHMENTS_DIRECTORY OUTPUT_DIRECTORY
"""
import sys,json,base64,mimetypes,html,shutil
from pathlib import Path
project,revision,attachments,output=map(lambda p:Path(p).resolve(),sys.argv[1:5]);output.mkdir(parents=True,exist_ok=True)
assets=json.loads((project/'qa/asset-validation.json').read_text())
browser=json.loads((project/'qa/browser-asset-audit.json').read_text())
total=sum(row['bytes'] for row in assets['groups'].values());triangles=sum(row['renderedTriangles'] for row in assets['groups'].values())
load_ms=sum(row.get('loadMs',0) for row in browser)
issues=[
 ('Missing cake through the door','The cake was explicitly hidden before frame 500. Connected sets are now present before portal entry; the cake is inside the open-door camera frustum.'),
 ('Blank frames, then sudden photos','Frame inserts were hidden until frame 1640. All four images now load with their physical mounts before travel; the camera turn reveals them naturally.'),
 ('Terrace and letter appearing suddenly','Whole groups were switched on at frames 1100 and 2161. Those switches are removed. The derived Blender copy also keeps the active connected sets present.'),
 ('Striped surface outside the door','A three-metre terrain underside inherited flat grass UVs. Its Solidify underside is disabled, and the terrace floor is present throughout the connected journey.'),
 ('Flat colour on the letter stand','Named UV inputs were missing on the bake plane, reducing the oak image to a single pixel. Both colour and normal bakes now resolve the source UVs; the optimized GLB retains a 512 × 512 oak image.'),
 ('Dark, oversized smoke','Three smaller pale plumes replace the dark shader. The camera holds steady through extinction. All flame lights reach zero, and smoke fades without relighting on reverse travel.'),
 ('Abrupt camera and door motion','Door/wish release and reverse boundaries share camera poses. Travel accelerates and brakes gradually, queued input is bounded, door samples interpolate, and ultra-wide views retain vertical framing.'),
 ('Glass and first-use rendering stalls','Panes retain transparent alpha in the export, cast no opaque browser shadows, and use consistent roughness. Connected textures and shaders prepare before entry; static sun shadows are cached.')
]
table='\n'.join(f'| {title} | {text} |' for title,text in issues)
report=f'''# Birthday World — rendering revision 3

The reported visibility, camera continuity, smoke and material faults have been addressed in the existing project. **Full rendered-browser acceptance remains blocked by disabled WebGL in the available test browser.** This report does not certify ready-to-ship visual quality or mobile performance.

| Reported issue | Change |
| --- | --- |
{table}

Validation completed:

- 12 automated tests pass, including actual exported camera continuity, steady gate release, bounded scrolling, three-plume framing on desktop/mobile, extinction, reverse travel and replay reset. TypeScript checks pass.
- All eight GLBs load and decode in the browser. Portal UVs are retained; screen-origin offset is 0 m and direction alignment is 1. The door panel travels 1.104 m and clears the centre ray when opened.
- The cake is present and projects inside the open-door view. All four mounted images are populated. The portrait centre is outside the view at frame 1450 and inside at 1510. The letter and its oak texture are present.
- Desktop and 390 × 844 mobile **UI-only** flows reach the letter and ending. Microphone denial fixture, actual unavailable-microphone handling, tap fallback, reverse state and intentional replay reset were checked. The QA panel was moved away from the replay button.
- Actual Blender and export-material stills were inspected. These show the current geometry/material adaptation and are explicitly separated from browser control captures.
- The authoritative bedroom-redesign original is unchanged: SHA-256 `8400fcbb72b8ee3b76986bee4061a8764ba301285d7c88bb07b35fb4e076d593`. Active export object counts remain unchanged after the connected-visibility correction; archived collections remain excluded.

Measured environment and cost:

- Cloud Chrome 151, reported macOS/Intel user agent; 1363 × 936 viewport, DPR 1. Mobile testing used a 390 × 844 CSS viewport, not a physical phone. Node 24.19.0; Blender 4.3, CPU Cycles, 24 samples, 1200 × 750 stills.
- Eight GLBs total **{total:,} bytes ({total/1e6:.2f} MB)**. Combined full-group geometry is {triangles:,} triangles; frustum culling determines what is drawn. This count is not an FPS measurement.
- Sum of observed per-GLB load/decode durations: **{load_ms:,} ms** on the local preview, with cache state uncontrolled. This excludes GPU work and is not an end-user cold-load benchmark.
- `GL_VENDOR = Disabled` and `GL_RENDERER = Disabled` prevent a WebGL context. No GPU FPS, VRAM, visual shader compilation, real mobile rendering or live microphone blowing result is claimed.

Remaining acceptance work:

The updated site needs a complete WebGL-enabled visual pass for portal matching, moving-door clearance, smoke appearance, shadows/exposure, image framing and desktop/mobile FPS. There is no successful 3D browser walkthrough recording or six-scene browser screenshot set from this environment. Blender stills are not a substitute. Browser lighting and swatch-baked detail remain approximations of Cycles; this is not a photographic-match claim. The portrait is a fictional adult demo, the small frames use botanical placeholders, and the letter is generic configurable text.

The source ZIP includes the application, pinned dependency manifest/lockfile, runtime assets, export/baking scripts and QA evidence. The production ZIP contains index.html and its required assets; serve its contents at an HTTP(S) origin root. The source Blender master and export-oriented working copy are provided separately.

Technical references: [Three.js renderer preparation](https://threejs.org/docs/pages/WebGLRenderer.html) and [Blender glTF material limitations](https://docs.blender.org/manual/en/3.1/addons/import_export/scene_gltf2.html).
'''
(project/'qa/revision-report.md').write_text(report)
(output/'birthday-world-QA-report.md').write_text(report)

def figure(path,title,caption):
 data=base64.b64encode(path.read_bytes()).decode();mime=mimetypes.guess_type(path.name)[0]
 return f'<figure><img loading="lazy" src="data:{mime};base64,{data}" alt="{html.escape(title)}"><figcaption><strong>{html.escape(title)}</strong><p>{html.escape(caption)}</p></figcaption></figure>'
sections=[]
screens=[('c499c55a-ebbb-4f08-811e-1be28cd351da.png','Cake missing at the doorway'),('88c7dea9-01c7-485a-8cb9-a919a49d4476.png','Striped exterior edge'),('62f14f29-05af-4b54-b8c6-1dc1c088cbb7.png','Empty physical frames'),('73397992-3122-484d-960d-67c627b0237c.png','Photo appearing after travel'),('d5417533-6cb8-4f66-9b10-ff0f2cc78357.png','Flat letter-stand material')]
sections.append('<h2>Your reported browser frames</h2><div class="grid">'+''.join(figure(attachments/name,title,'User-supplied screenshot of the earlier published revision.') for name,title in screens)+'</div>')
renders=[('export-renders',1,'01 · Bedroom'),('export-renders',465,'02 · Doorway'),('export-renders',610,'03 · Birthday room'),('renders',945,'04 · Steady candle view'),('renders',1050,'04 · Source smoke'),('export-renders',1450,'05 · Connected terrace'),('export-renders',1580,'05 · Populated physical frames'),('export-renders',2520,'06 · Letter and oak grain')]
sections.append('<h2>Current Blender and export-material review</h2><p>These are CPU Cycles stills, not browser screenshots. The laptop retains its packed source preview in the working copy; the website replaces that screen with a live garden render target. Smoke is a Blender volume here and a pale timed shader in the browser.</p><div class="grid">'+''.join(figure(revision/folder/f'blender-frame-{frame:04}.png',title,'Current source composition.' if folder=='renders' else 'Export-oriented Blender materials; browser lighting differs.') for folder,frame,title in renders)+'</div>')
sections.append('<h2>Actual browser control and asset checks</h2><p>The mobile captures are visibly labelled UI-only fixtures because this browser disables WebGL.</p><div class="grid">'+''.join(figure(project/'qa/evidence'/name,title,'Actual browser capture; not 3D rendering proof.') for name,title in [('v3-mobile-wish.jpg','Mobile microphone fallback'),('v3-mobile-letter.jpg','Mobile letter layout'),('v3-browser-assets.jpg','Actual GLB loading and geometry checks')])+'</div>')
rows=''.join(f'<tr><th>{html.escape(a)}</th><td>{html.escape(b)}</td></tr>' for a,b in issues)
document='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Birthday World · rendering review</title><style>body{margin:0;background:#f5efe6;color:#493a37;font:16px/1.6 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:40px 24px}h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:44px}h2{margin-top:50px;font-size:29px}.status{padding:18px 22px;border-left:4px solid #8e4d53;background:#eadad5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}figure{margin:0;background:#fffaf2;border:1px solid #dfcfc1}img{display:block;width:100%;height:auto}figcaption{padding:15px 19px}figcaption p{margin:4px 0;font-size:14px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #d8c9ba;padding:13px}th{width:24%}footer{margin-top:40px;color:#77685e}@media(max-width:750px){.grid{grid-template-columns:1fr}h1{font-size:34px}main{padding:22px 16px}}</style><main><p>BIRTHDAY WORLD · RENDERING REVISION 3</p><h1>Continuity, materials &amp; movement</h1><p class="status"><strong>Implemented fixes; GPU visual acceptance is still blocked.</strong> The available browser cannot create WebGL. This review distinguishes user screenshots, Blender stills and browser control checks.</p><table>'+rows+'</table>'+''.join(sections)+f'<footer>12 automated tests pass. Eight GLBs: {total/1e6:.2f} MB. Browser GLB load/decode observations: {load_ms:,} ms total; no FPS claim. See the separate QA report for scope and remaining checks.</footer></main></html>'
(output/'birthday-world-visual-review-v3.html').write_text(document)
print(json.dumps({'report':str(output/'birthday-world-QA-report.md'),'review':str(output/'birthday-world-visual-review-v3.html'),'embeddedImages':len(screens)+len(renders)+3}))
