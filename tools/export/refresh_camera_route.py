"""Refresh route data and the editable copy after a completed geometry export.
SOURCE.blend EXPORT_DIRECTORY; browser GLBs are unchanged by this helper.
The full export_world.py pipeline remains the canonical clean reproduction.
"""
import bpy,json,sys,math,hashlib
from pathlib import Path
from mathutils import Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'blender'))
from connected_visibility import make_connected_sets_visible
source=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve()
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene
keys=json.loads((out/'cameras.json').read_text());convert=Matrix.Rotation(-math.pi/2,4,'X')
for key in keys:
 if not 830<=key['f']<=1161:continue
 scene.frame_set(key['f']);camera=scene.camera
 position,rotation,scale=(convert@camera.matrix_world).decompose()
 key.update(p=list(position),q=[rotation.x,rotation.y,rotation.z,rotation.w],s=list(scale),lens=camera.data.lens,sensor=camera.data.sensor_width,camera=camera.name)
(out/'cameras.json').write_text(json.dumps(keys,separators=(',',':')))
report=json.loads((out/'export-report.json').read_text());report['sha256']=hashlib.sha256(source.read_bytes()).hexdigest();report['source']=source.name;report['cameraCompositionRevision']='V4 steady wish, full cake and short smoke'
(out/'export-report.json').write_text(json.dumps(report,indent=2))
working=out/'birthday-world-browser-working.blend'
bpy.ops.wm.open_mainfile(filepath=str(working));scene=bpy.context.scene
make_connected_sets_visible(scene)
for material in bpy.data.materials:
 if material.name.startswith('WEB') and any(word in material.name.lower() for word in ['glass','glazing']):
  node=next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if node:node.inputs['Alpha'].default_value=.08;node.inputs['Roughness'].default_value=.15
old=bpy.data.objects.get('V4 CAMERA • steady wish')
with bpy.data.libraries.load(str(source),link=False) as (src,dst):
 dst.objects=['V4 CAMERA • steady wish'];text_names=[name for name in src.texts if name.startswith('V4 SOURCE')];dst.texts=list(text_names)
 dst.materials=['Garden_screen']
camera=dst.objects[0];scene.collection.objects.link(camera)
screen=bpy.data.objects.get('Portal_screen')
if screen:
 for i,material in enumerate(screen.data.materials):
  if material and 'Garden_screen' in material.name:screen.data.materials[i]=dst.materials[0]
for name,text in zip(text_names,dst.texts):
 old_text=bpy.data.texts.get(name)
 if old_text and old_text!=text:bpy.data.texts.remove(old_text)
 text.name=name
for marker in scene.timeline_markers:
 if marker.camera==old:marker.camera=camera
if old:bpy.data.objects.remove(old,do_unlink=True)
camera.name='V4 CAMERA • steady wish'
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(working))
print('Camera route and export working copy refreshed',flush=True)
