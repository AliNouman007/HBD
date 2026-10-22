"""CPU Blender still renders, not browser captures. SOURCE OUTPUT FRAME [FRAME ...]"""
import bpy,sys,json,time
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1200;s.render.resolution_y=750;s.render.resolution_percentage=100
s.render.threads_mode='FIXED';s.render.threads=5
report=json.loads((out/'blender-render-results.json').read_text()) if (out/'blender-render-results.json').exists() else []
for frame in map(int,args[2:]):
 s.frame_set(frame);started=time.time();s.render.filepath=str(out/f'blender-frame-{frame:04}.png')
 bpy.ops.render.render(write_still=True)
 report=[r for r in report if r['frame']!=frame]
 report.append({'frame':frame,'camera':s.camera.name,'seconds':round(time.time()-started,2),'file':Path(s.render.filepath).name})
 (out/'blender-render-results.json').write_text(json.dumps(report,indent=2))
