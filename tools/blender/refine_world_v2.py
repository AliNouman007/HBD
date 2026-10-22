"""Refine the approved world in a NEW file. ORIGINAL.blend OUTPUT.blend PROJECT_ROOT"""
import bpy,sys,math,random,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();output=Path(args[1]).resolve();project=Path(args[2]).resolve()
assert source!=output
bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1740);rng=random.Random(20260914)
def collection(name):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);return c
salon=collection('V3 • Salon botanical refinement');terrace=collection('V3 • Terrace shaded limestone loggia');landscape=collection('V3 • Landscape continuous ground')
def material(name,color,rough=.65,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
stone=material('V3 limestone • fine warm mineral',(.63,.56,.45),.85);wood=material('V3 pergola • natural oiled oak',(.27,.16,.085),.55);bark=material('V3 laurel • warm living bark',(.16,.12,.073),.9)
for mat,scale,strength in [(stone,95,.12),(wood,18,.15),(bark,42,.18)]:
 n=mat.node_tree.nodes;p=n.get('Principled BSDF');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=3
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength;bump.inputs['Distance'].default_value=.004
 mat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
leafm=[material(f'V3 laurel • living leaf {i}',c,.46) for i,c in enumerate([(.085,.16,.06),(.12,.21,.09),(.18,.26,.11),(.10,.18,.07),(.21,.28,.13)])]
def move_to(o,c):
 for old in list(o.users_collection):old.objects.unlink(o)
 c.objects.link(o)
def box(name,loc,dimensions,mat,col,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dimensions
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);move_to(o,col);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft physical edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
 return o
def tube(name,points,radius,mat,col):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=radius;curve.bevel_resolution=3
 sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for i,(p,co) in enumerate(zip(sp.bezier_points,points)):
  p.co=co;p.handle_left_type=p.handle_right_type='AUTO';p.radius=max(.12,1-i/(len(points)-.5))
 o=bpy.data.objects.new(name,curve);col.objects.link(o);curve.materials.append(mat);return o
# Keep the original pot and archive only the old sparse indoor canopy.
arch=collection('V3 • Replaced indoor tree — archive');arch.hide_render=True;arch.hide_viewport=True
for name in ['Indoor olive • branches','Indoor olive • individual silver leaves']:
 o=bpy.data.objects.get(name)
 if o:move_to(o,arch)
base=Vector((2.67,5.55,.41));trunk=[base,base+Vector((-.02,.01,.52)),base+Vector((.035,-.015,1.03)),base+Vector((.015,.012,1.58))]
tube('V3 indoor laurel • tapered trunk',trunk,.028,bark,salon)
vertices=[];faces=[];indices=[]
def leaf(origin,direction,length,width,roll,color):
 axis=direction.normalized();side=axis.cross(Vector((0,0,1)))
 if side.length<.05:side=Vector((1,0,0))
 side.normalize();normal=axis.cross(side).normalized();side=side*math.cos(roll)+normal*math.sin(roll);normal=axis.cross(side).normalized();start=len(vertices)
 for k in range(7):
  t=k/6;center=origin+axis*length*t+normal*(math.sin(t*math.pi)*length*.08);w=math.sin(math.pi*t)**.8*width
  vertices.extend([center-side*w,center+normal*(math.sin(t*math.pi)*width*.1),center+side*w])
 for k in range(6):
  a=start+k*3;b=a+3;faces.extend([(a,b,b+1,a+1),(a+1,b+1,b+2,a+2)]);indices.extend([color,color])
for branch in range(23):
 a=branch*2.39996+rng.uniform(-.2,.2);z=.74+branch/23*.78;radius=.25+rng.random()*.18
 begin=base+Vector((.01,0,z));end=base+Vector((math.cos(a)*radius,math.sin(a)*radius,z+.27+rng.random()*.1));mid=begin.lerp(end,.48)+Vector((0,0,.08))
 tube(f'V3 laurel • branch {branch}',[begin,mid,end],.007,bark,salon)
 for k in range(11):
  t=.14+k*.077;p=begin.lerp(end,t)+Vector((0,0,math.sin(t*math.pi)*.07));sign=1 if k%2 else -1
  d=Vector((math.cos(a+sign*.88),math.sin(a+sign*.88),rng.uniform(-.12,.4)))
  leaf(p,d,rng.uniform(.105,.155),rng.uniform(.023,.038),rng.uniform(-.35,.35),rng.randrange(len(leafm)))
mesh=bpy.data.meshes.new('V3 laurel • curved broad leaf surfaces');mesh.from_pydata(vertices,[],faces);mesh.update()
o=bpy.data.objects.new('V3 indoor laurel • individual curved leaves',mesh);salon.objects.link(o)
for m in leafm:mesh.materials.append(m)
for poly,idx in zip(mesh.polygons,indices):poly.material_index=idx;poly.use_smooth=True
# A connected shaded loggia surrounds the existing portrait niche and memory console.
box('V3 loggia • warm limestone backdrop',(3.19,9.77,1.4),(.18,4.08,2.8),stone,terrace,.024)
for y in [7.83,11.71]:
 box('V3 loggia • profiled end pier',(3.00,y,1.4),(.34,.26,2.8),stone,terrace,.018)
 box('V3 loggia • pier capital',(2.99,y,2.75),(.44,.36,.14),stone,terrace,.014)
 box('V3 pergola • outer oak column',(-2.26,y,1.42),(.13,.13,2.84),wood,terrace,.012)
 box('V3 pergola • open cross beam',(.43,y,2.87),(5.76,.15,.20),wood,terrace,.012)
for x in [-2.26,3.09]:box('V3 pergola • longitudinal beam',(x,9.77,2.97),(.16,4.34,.18),wood,terrace,.012)
for i in range(13):box('V3 pergola • slender sunlight lath',(.43,7.79+i*.33,3.06),(5.7,.085,.105),wood,terrace,.006)
# The original terrain is part of the connected landscape, not the indoor visibility group.
ground=bpy.data.objects.get('Continuous distant olive terrain')
if ground:move_to(ground,landscape)
content=json.loads((project/'public/personal-content.json').read_text())
def frame_image(object_name,item):
 o=bpy.data.objects.get(object_name)
 if not o or not item.get('image'):return
 image=bpy.data.images.load(str(project/'public'/item['image'].lstrip('/')),check_existing=True);image.pack()
 m=material('V3 demo print • '+object_name,(1,1,1),.92);m['v3_image_surface']=True
 tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 o.data=o.data.copy();o.data.materials.clear();o.data.materials.append(m)
 uv=o.data.uv_layers.active or o.data.uv_layers.new();coords=[v.co for v in o.data.vertices];mn=[min(v[i] for v in coords) for i in range(3)];mx=[max(v[i] for v in coords) for i in range(3)];crop=item.get('crop',[0,0,1,1])
 for poly in o.data.polygons:
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co;u=1-(co.y-mn[1])/max(mx[1]-mn[1],1e-8);v=(co.z-mn[2])/max(mx[2]-mn[2],1e-8)
   uv.data[li].uv=(crop[0]+u*crop[2],1-crop[1]-crop[3]+v*crop[3])
 o['demo_content']=True
 if object_name.startswith('Portrait'):
  o.hide_render=True;o.keyframe_insert(data_path='hide_render',frame=1639);o.hide_render=False;o.keyframe_insert(data_path='hide_render',frame=1640)
frame_image('Portrait • supplied image placeholder • matte ivory insert',content['portrait'])
for i,item in enumerate(content['memories']):frame_image(f'Memory {i+1} • supplied photo placeholder • matte ivory insert',item)
for name in ['DOOR • inward hinge','HANDLE • lever spindle']:bpy.data.objects[name]['source_name']=name
scene.frame_set(1);scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
text=bpy.data.texts.new('V3 SOURCE • refine_world_v2.py');text.write(Path(__file__).read_text())
output.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(output))
report={'input':source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'output':output.name,'newCollections':[salon.name,terrace.name,landscape.name],'demoPortrait':True,'replacedIndoorTree':True,'archivedCollectionsRemainHidden':True}
(output.parent/'blender-refinement-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
