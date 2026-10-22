"""Final review corrections: INPUT.blend OUTPUT.blend PROJECT_ROOT.

Run after refine_world_v2.py and finish_world_v2.py. The input is never overwritten.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();out=Path(args[1]).resolve();project=Path(args[2]).resolve();assert source!=out
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene;s.frame_set(2520)
mat=bpy.data.materials['V3 meadow • fine grass and dry summer flecks']
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(project/'public/materials/meadow-albedo.png'),check_existing=True);tex.image.pack();tex.extension='REPEAT'
mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mat['v3_image_surface']=True
for o in s.objects:
 if o.type=='MESH' and mat.name in [m.name for m in o.data.materials if m]:
  for loop in o.data.loops:
   co=o.matrix_world@o.data.vertices[loop.vertex_index].co;o.data.uv_layers.active.data[loop.index].uv=(co.x*.4,co.y*.4)
# Move decoration along the tilted reading board; preserve its existing visibility actions.
board_rotation=Matrix.Rotation(math.radians(14),3,'X')
for o in s.objects:
 if o.name.startswith('06 rose •'):o.delta_location=board_rotation@Vector((-.070,0,0))
 if o.name=='06 letter • smooth natural stone paperweight':o.delta_location=board_rotation@Vector((.016,-.103,0))
# Pale, translucent source smoke. Browser smoke is independently time-driven.
smoke_report=[]
for m in bpy.data.materials:
 if 'thin dispersed smoke' not in m.name:continue
 tree=m.node_tree;volume=next(n for n in tree.nodes if n.type=='PRINCIPLED_VOLUME');volume.inputs['Color'].default_value=(.74,.76,.79,1)
 if tree.animation_data and tree.animation_data.action:
  for curve in tree.animation_data.action.fcurves:
   if curve.data_path.startswith('nodes["Math"].inputs[1]'):
    for key in curve.keyframe_points:key.co.y*=1/14;key.handle_left.y*=1/14;key.handle_right.y*=1/14
 smoke_report.append({'name':m.name,'nodes':[(n.name,n.type) for n in tree.nodes]})
# Keep the smoke in the authored close-up instead of clipping its top.
for o in s.objects:
 if o.name.startswith('Wish • rising smoke wisp'):
  o.data=o.data.copy()
  for v in o.data.vertices:v.co.z*=.5
# The Blender laptop uses an actual current garden still; the website uses a live 3D render target.
screen=bpy.data.materials.get('Garden_screen')
if screen:
 image=bpy.data.images.load(str(project/'assets/blender-references/garden-screen.png'),check_existing=True);image.pack()
 for node in screen.node_tree.nodes:
  if node.type=='TEX_IMAGE':node.image=image
for filename in ['refine_world_v2.py','finish_world_v2.py','finalize_world_v2.py']:
 name='V3 SOURCE • '+filename;text=bpy.data.texts.get(name) or bpy.data.texts.new(name);text.clear();text.write((project/'tools/blender'/filename).read_text())
notes=bpy.data.texts.get('V3 START HERE • browser revision') or bpy.data.texts.new('V3 START HERE • browser revision');notes.clear();notes.write('''V2 visual and interaction revision. Original bedroom-redesign source remains untouched.
New V3 collections: indoor laurel, open terrace pergola/backdrop, meadow grass.
Archived: obsolete indoor tree and distant cypress screening. Hidden originals remain archives.
Portrait: generated fictional adult demo. Memories: botanical still-life crops, generic captions.
Replace public/personal-content.json and rerun the documented print/model workflow for personal content.
Browser camera uses authored coordinates; portal crosses the 180/181 spatial cut through the laptop screen.
Browser door and candle smoke use elapsed time, independent from scroll. Browser smoke differs from Blender volume.
The available QA browser cannot create WebGL. Source renders are not browser visual acceptance.
''')
s['Scene06_message']='Generic birthday demo text; replace with the recipient’s actual letter in public/personal-content.json.'
s.frame_set(1);out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out));print(json.dumps({'output':out.name,'smoke':smoke_report}),flush=True)
