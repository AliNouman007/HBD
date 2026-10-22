"""Fix source rendering faults without overwriting it.

Usage: Blender Python fix_rendering_v3.py SOURCE.blend OUTPUT.blend
Browser material export must use the accompanying export_world.py UV bake fix.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from connected_visibility import make_connected_sets_visible

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();output=Path(args[1]).resolve();assert source!=output
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene
visible_sets=make_connected_sets_visible(scene)

# The solidified front rim inherited planar grass UVs and produced a striped
# vertical wall whenever the terrace floor was missing in the earlier browser.
# Its three-metre underside has no visible purpose in the landscape.
terrain=bpy.data.objects['Continuous distant olive terrain']
for modifier in terrain.modifiers:
 if modifier.type=='SOLIDIFY':modifier.show_render=False;modifier.show_viewport=False

# Compose the wish for both flames and a short rising plume, with no event zoom.
# Sample the authored camera before creating new marker overrides.
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
poses=[]
for frame in range(831,1161):
 scene.frame_set(frame);original=scene.camera
 weight=smooth((frame-830)/90)*(1-smooth((frame-1050)/110))
 position,rotation,scale=original.matrix_world.decompose()
 position.y-=.30*weight
 rotation=rotation@Quaternion((1,0,0),.025*weight)
 lens=original.data.lens+(min(original.data.lens,40)-original.data.lens)*weight
 poses.append((frame,position.copy(),rotation.copy(),lens,original.data.sensor_width))
scene.frame_set(1161);resume=scene.camera
data=bpy.data.cameras.new('V4 wish • steady candle and smoke composition')
camera=bpy.data.objects.new('V4 CAMERA • steady wish',data);scene.collection.objects.link(camera)
camera.rotation_mode='QUATERNION';data.sensor_fit='HORIZONTAL'
for frame,position,rotation,lens,sensor in poses:
 camera.location=position;camera.rotation_quaternion=rotation;data.lens=lens;data.sensor_width=sensor
 camera.keyframe_insert('location',frame=frame);camera.keyframe_insert('rotation_quaternion',frame=frame);data.keyframe_insert('lens',frame=frame)
for datablock in [camera,data]:
 for curve in datablock.animation_data.action.fcurves:
  for key in curve.keyframe_points:key.interpolation='LINEAR'
for marker in scene.timeline_markers:
 if marker.camera and 831<=marker.frame<=1160:marker.camera=camera
scene.timeline_markers.new('V4 steady wish view',frame=831).camera=camera
scene.timeline_markers.new('V4 resume authored exit route',frame=1161).camera=resume

text=bpy.data.texts.get('V4 SOURCE • fix_rendering_v3.py') or bpy.data.texts.new('V4 SOURCE • fix_rendering_v3.py');text.clear();text.write(Path(__file__).read_text())
text=bpy.data.texts.get('V4 SOURCE • connected_visibility.py') or bpy.data.texts.new('V4 SOURCE • connected_visibility.py');text.clear();text.write((Path(__file__).parent/'connected_visibility.py').read_text())
scene['V4_rendering_revision']='Steady wish framing; hidden terrain underside. Browser exports preserve named UV maps in material bakes. Connected sets stay visible in the browser; no timeline pop-in.'
scene.frame_set(1);output.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(json.dumps({'output':str(output),'steadyWishFrames':[831,1160],'terrainUndersideDisabled':True,'connectedObjects':len(visible_sets)}),flush=True)
