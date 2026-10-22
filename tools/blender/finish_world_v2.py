"""Second visual-review pass. INPUT.blend OUTPUT.blend PROJECT_ROOT"""
import bpy,sys,random,math,json
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();out=Path(args[1]).resolve();project=Path(args[2]).resolve();assert source!=out
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene;s.frame_set(1740);rng=random.Random(7142)
land=bpy.data.collections.get('V3 • Landscape continuous ground')
archive=bpy.data.collections.new('V3 • Replaced distant screening — archive');s.collection.children.link(archive);archive.hide_render=True;archive.hide_viewport=True
for o in list(s.objects):
 if o.name.startswith('Outlook • natural cypress foliage'):
  for c in list(o.users_collection):c.objects.unlink(o)
  archive.objects.link(o)
# Natural ground variation uses metre-scaled UVs, shared by Blender and the browser bake.
mat=bpy.data.materials.new('V3 meadow • fine grass and dry summer flecks');mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.95
coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=5;l.new(coord.outputs['UV'],noise.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.10,.14,.065,1);ramp.color_ramp.elements[1].color=(.25,.29,.13,1);l.new(noise.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],p.inputs['Base Color'])
fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=330;fine.inputs['Detail'].default_value=2;l.new(coord.outputs['UV'],fine.inputs['Vector']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.007;l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
surfaces=[o for o in s.objects if o.type=='MESH' and (o.name=='Continuous distant olive terrain' or o.name.startswith('V2 soft meadow rise'))]
for o in surfaces:
 o.data=o.data.copy();o.data.materials.clear();o.data.materials.append(mat)
 uv=o.data.uv_layers.active or o.data.uv_layers.new()
 for loop in o.data.loops:
  co=o.matrix_world@o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(co.x*.2,co.y*.2)
# Geometry close to the terrace breaks up the flat ground silhouette and catches afternoon light.
grassm=[]
for i,col in enumerate([(.15,.23,.085),(.21,.29,.11),(.27,.33,.15),(.31,.30,.14)]):
 m=bpy.data.materials.new(f'V3 meadow blade {i}');m.diffuse_color=(*col,1);m.use_nodes=True;pr=m.node_tree.nodes.get('Principled BSDF');pr.inputs['Base Color'].default_value=(*col,1);pr.inputs['Roughness'].default_value=.7;grassm.append(m)
verts=[];faces=[];colors=[]
for tuft in range(5500):
 x=rng.uniform(-9,9);y=rng.uniform(12.45,25)
 # Keep the letter platform and the connected walking route clear.
 if abs(x)<1.35 and y<14:continue
 heights=[]
 for o in surfaces:
  inv=o.matrix_world.inverted();hit,co,normal,idx=o.ray_cast(inv@Vector((x,y,30)),inv.to_3x3()@Vector((0,0,-1)))
  if hit:heights.append((o.matrix_world@co).z)
 if not heights:continue
 z=max(heights)+.006
 for blade in range(5):
  angle=rng.uniform(0,math.tau);length=rng.uniform(.06,.15);width=rng.uniform(.003,.006);lean=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-lean.y,lean.x,0))*width
  base=Vector((x+rng.uniform(-.04,.04),y+rng.uniform(-.04,.04),z));mid=base+lean*length*.2+Vector((0,0,length*.55));tip=base+lean*length*.55+Vector((0,0,length));k=len(verts)
  verts.extend([base-side,base+side,mid-side*.65,mid+side*.65,tip]);faces.extend([(k,k+1,k+3,k+2),(k+2,k+3,k+4)]);color=rng.randrange(4);colors.extend([color,color])
mesh=bpy.data.meshes.new('V3 meadow • individual bent grass blades');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('V3 landscape • close meadow grass',mesh);land.objects.link(o)
for m in grassm:mesh.materials.append(m)
for poly,i in zip(mesh.polygons,colors):poly.material_index=i
# Preserve the existing animated smoke mesh, strengthening its actual volumetric density.
for o in s.objects:
 if o.name.startswith('Wish • rising smoke wisp'):
  o.data=o.data.copy()
  for v in o.data.vertices:v.co.x*=1.5;v.co.y*=1.5
for m in bpy.data.materials:
 if 'thin dispersed smoke' not in m.name:continue
 tree=m.node_tree;volume=next(n for n in tree.nodes if n.type=='PRINCIPLED_VOLUME');volume.inputs['Color'].default_value=(.43,.46,.50,1);volume.inputs['Anisotropy'].default_value=.12
 weight=next((i for i in volume.inputs if i.name=='Weight'),None)
 if weight:weight.default_value=1
 if tree.animation_data and tree.animation_data.action:
  for curve in list(tree.animation_data.action.fcurves):
   if weight and curve.data_path==weight.path_from_id('default_value'):tree.animation_data.action.fcurves.remove(curve);continue
   if curve.data_path.startswith('nodes["Math"].inputs[1]'):
    for key in curve.keyframe_points:key.co.y*=14;key.handle_left.y*=14;key.handle_right.y*=14
# Keep the fictional portrait's photographic aspect ratio inside its 3:4 physical mount.
portrait=bpy.data.objects.get('Portrait • supplied image placeholder • matte ivory insert')
coords=[v.co for v in portrait.data.vertices];lo=[min(v[i] for v in coords) for i in range(3)];hi=[max(v[i] for v in coords) for i in range(3)]
for loop in portrait.data.loops:
 co=portrait.data.vertices[loop.vertex_index].co;u=1-(co.y-lo[1])/(hi[1]-lo[1]);v=(co.z-lo[2])/(hi[2]-lo[2]);portrait.data.uv_layers.active.data[loop.index].uv=(.03125+u*.9375,v)
# Printed paper remains a physical scene surface. Browser text stays configurable.
items=[(next(o for o in s.objects if o.name.startswith('06 LETTER')),project/'public/personal/letter-print.png',False)]
for i in range(3):
 note=next((o for o in s.objects if o.name.startswith(f'Memory {i+1} • folded archival note')),None)
 if note:items.append((note,project/f'public/personal/note-{i+1}.png',True))
for paper,path,is_note in items:
 image=bpy.data.images.load(str(path),check_existing=True);image.pack();m=bpy.data.materials.new('V3 printed cotton • '+paper.name);m.use_nodes=True;m['v3_image_surface']=True
 pr=m.node_tree.nodes.get('Principled BSDF');pr.inputs['Roughness'].default_value=.94;tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;m.node_tree.links.new(tex.outputs['Color'],pr.inputs['Base Color']);paper.data=paper.data.copy();paper.data.materials.clear();paper.data.materials.append(m)
 uv=paper.data.uv_layers.active or paper.data.uv_layers.new();coords=[v.co for v in paper.data.vertices];lo=[min(v[i] for v in coords) for i in range(3)];hi=[max(v[i] for v in coords) for i in range(3)]
 a,b=(1,0) if is_note else (0,1)
 for loop in paper.data.loops:
  co=paper.data.vertices[loop.vertex_index].co;u=(co[a]-lo[a])/max(1e-8,hi[a]-lo[a]);v=(co[b]-lo[b])/max(1e-8,hi[b]-lo[b]);uv.data[loop.index].uv=(1-u if is_note else u,v)
text=bpy.data.texts.new('V3 SOURCE • finish_world_v2.py');text.write(Path(__file__).read_text())
s.frame_set(1);out.parent.mkdir(exist_ok=True,parents=True);bpy.ops.wm.save_as_mainfile(filepath=str(out))
print(json.dumps({'archivedCypressScreens':5,'grassBlades':len(verts)//5,'smokeDensityMultiplier':14,'output':out.name}),flush=True)
