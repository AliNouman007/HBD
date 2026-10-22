"""Run with Blender 4.3 Python: blender -b SOURCE.blend -P export_world.py -- SOURCE OUTPUT.
Also supports a bpy Python installation. Never overwrites SOURCE.
"""
import bpy,sys,json,math,hashlib,time,re
from pathlib import Path
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
source=Path(args[0]).resolve();out=Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene
C=Matrix.Rotation(-math.pi/2,4,'X')
def pose(mat):
 m=C@mat; p,q,scale=m.decompose();return {'p':list(p),'q':[q.x,q.y,q.z,q.w],'s':list(scale)}
def chain(o,n):
 while o:
  if o.name==n:return True
  o=o.parent
 return False
def render_visible_objects(scene):
 visible=set()
 def visit(collection,hidden=False):
  hidden=hidden or collection.hide_render
  if not hidden:visible.update(o.name for o in collection.objects if not o.hide_render)
  for child in collection.children:visit(child,hidden)
 visit(scene.collection)
 return visible
report={'source':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'blender':bpy.app.version_string,'groups':{},'bakedMaterials':[],'excluded':[]}
# Sample exact authored poses; no interpolation across spatial portal cut.
cam=[]
frames=sorted(set(list(range(1,182))+list(range(185,3001,5))+[385,414,474,540,610,770,830,831,945,970,1020,1125,1160,1161,1390,1510,1640,1740,1960,2120,2160,2161,2320,2520,2700,2880,3000]))
for f in (frames if not (out/'cameras.json').exists() else []):
 s.frame_set(f);o=s.camera;d=pose(o.matrix_world);d.update({'f':f,'lens':o.data.lens,'sensor':o.data.sensor_width,'camera':o.name});cam.append(d)
if cam:(out/'cameras.json').write_text(json.dumps(cam,separators=(',',':')))
# Record authored hinge and handle local rotations for elapsed-time events.
events=[]
for f in range(385,475):
 s.frame_set(f);events.append({'f':f,'door':list(bpy.data.objects['DOOR • inward hinge'].rotation_euler),'handle':list(bpy.data.objects['HANDLE • lever spindle'].rotation_euler)})
(out/'door-event.json').write_text(json.dumps(events,separators=(',',':')))
# Capture active geometry at each representative frame, not final-frame visibility.
def group(o):
 cols=[c.name for c in o.users_collection]
 if any('archive' in c.lower() for c in cols):return None
 if any(c.startswith('R01') for c in cols):return 'bedroom'
 if any(c.startswith('V3 • Salon') for c in cols):return 'salon'
 if any(c.startswith('V3 • Terrace') for c in cols):return 'terrace'
 if any(c.startswith('V3 • Landscape') for c in cols):return 'garden'
 if chain(o,'Laptop'):return 'bedroom'
 if any(c.startswith('00 ') for c in cols):return None
 if any(c.startswith('02 Door') for c in cols):return 'door'
 if any(c.startswith(('01 Arch','03 Stone','04 Roses','05 Lavender','06 Olive','V2 • Entrance','V2 • Landscape')) for c in cols):return 'garden'
 if any(c.startswith('39 ') for c in cols):return 'flames' if ('flame' in o.name.lower()) else 'cake'
 if any(c.startswith(('30 ','31 ','32 ','34 ','35 ','36 ','38 ','40 ')) for c in cols):return 'salon'
 if any(c.startswith(('50 ','51 ','52 ','V2 • Open')) for c in cols):return 'terrace'
 if any(c.startswith(('60 ','61 ','62 ')) for c in cols):return 'ending'
 return None
reps={'bedroom':1,'garden':350,'door':385,'salon':945,'cake':945,'flames':945,'terrace':1740,'ending':2520}
selected={};lights={}
for key,f in reps.items():
 s.frame_set(f)
 visible=render_visible_objects(s)
 selected[key]=[o.name for o in s.objects if o.type in ['MESH','CURVE'] and group(o)==key and o.name in visible]
 lights[key]=[{'name':o.name,'kind':o.data.type,'energy':o.data.energy,'color':list(o.data.color),**pose(o.matrix_world)} for o in s.objects if o.type=='LIGHT' and not o.hide_render and o.data.energy>0.001 and (group(o)==key or key=='garden' and o.name in ['Sky fill','Golden afternoon sun'])]
report['excluded']=[o.name for o in s.objects if o.type in ['MESH','CURVE'] and o.name not in set(sum(selected.values(),[]))]
(out/'lights.json').write_text(json.dumps(lights,separators=(',',':')))
# Bake actual Base Color graphs to compact swatches in a separate scene. No lighting baked.
used={m.name:m for names in selected.values() for name in names for m in bpy.data.objects[name].data.materials if m}
bakes=bpy.data.scenes.new('EXPORT • material swatches');bakes.render.engine='CYCLES';bakes.cycles.samples=1;bakes.render.threads_mode='FIXED';bakes.render.threads=4
bpy.context.window.scene=bakes
mesh=bpy.data.meshes.new('swatch');mesh.from_pydata([(-.5,-.5,0),(.5,-.5,0),(.5,.5,0),(-.5,.5,0)],[],[(0,1,2,3)]);uv=mesh.uv_layers.new()
for i,co in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=co
plane=bpy.data.objects.new('swatch',mesh);bakes.collection.objects.link(plane);bpy.context.view_layer.objects.active=plane;plane.select_set(True)
def swatch_uvs(material):
 # Missing named UVs evaluate to (0,0) on the bake plane and flatten oak to a
 # single colour. Preserve the source graph while binding its swatch UV input.
 for node in material.node_tree.nodes:
  if node.type=='UVMAP':node.uv_map=plane.data.uv_layers.active.name
texture_dir=out/'material-bakes';texture_dir.mkdir(exist_ok=True)
replacement={}
for idx,(name,mat) in enumerate(used.items()):
 new=bpy.data.materials.new('WEB • '+name);new.use_nodes=True;pn=new.node_tree.nodes.get('Principled BSDF');base=None
 if mat.use_nodes:
  base=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if base:
   for field in ['Base Color','Metallic','Roughness','Alpha','Emission Color','Emission Strength']:
    if field in base.inputs:pn.inputs[field].default_value=base.inputs[field].default_value
  else:
   em=next((n for n in mat.node_tree.nodes if n.type=='EMISSION'),None)
   if em:pn.inputs['Emission Color'].default_value=em.inputs['Color'].default_value;pn.inputs['Emission Strength'].default_value=min(5,em.inputs['Strength'].default_value)
 else:pn.inputs['Base Color'].default_value=mat.diffuse_color
 direct_image=next((n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None) if mat.use_nodes else None
 if mat.get('v3_image_surface') and direct_image:
  tex=new.node_tree.nodes.new('ShaderNodeTexImage');tex.image=direct_image;new.node_tree.links.new(tex.outputs['Color'],pn.inputs['Base Color'])
 elif name=='Garden_screen':pn.inputs['Base Color'].default_value=(.2,.3,.2,1)
 elif base and base.inputs['Base Color'].is_linked:
  temp=mat.copy();swatch_uvs(temp);nodes=temp.node_tree.nodes;output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');pr=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');em=nodes.new('ShaderNodeEmission');temp.node_tree.links.new(pr.inputs['Base Color'].links[0].from_socket,em.inputs['Color']);temp.node_tree.links.new(em.outputs[0],output.inputs['Surface'])
  size=512 if any(x in name.lower() for x in ['oak','linen','butter','rug','r01']) else 128
  im=bpy.data.images.new('BAKED • '+name,width=size,height=size,alpha=False);im.colorspace_settings.name='sRGB';tex=nodes.new('ShaderNodeTexImage');tex.image=im;nodes.active=tex;plane.data.materials.clear();plane.data.materials.append(temp)
  bakes.render.bake.use_clear=True;bakes.render.bake.margin=4
  try:

   cached=texture_dir/(f'{idx:03}-uv-v3.png')
   if cached.exists():
    bpy.data.images.remove(im);im=bpy.data.images.load(str(cached))
   else:bpy.ops.object.bake(type='EMIT')
   im.filepath_raw=str(cached);im.file_format='PNG';im.save();im.pack();t=new.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;new.node_tree.links.new(t.outputs['Color'],pn.inputs['Base Color']);report['bakedMaterials'].append(name)
  except Exception as e:print('BAKE FAILURE',name,str(e),flush=True)
  bpy.data.materials.remove(temp)
 if base and base.inputs['Normal'].is_linked:
  normal_mat=mat.copy();swatch_uvs(normal_mat);plane.data.materials.clear();plane.data.materials.append(normal_mat)
  normal_image=bpy.data.images.new('NORMAL • '+name,width=512,height=512,alpha=False);normal_image.colorspace_settings.name='Non-Color'
  target=normal_mat.node_tree.nodes.new('ShaderNodeTexImage');target.image=normal_image;normal_mat.node_tree.nodes.active=target
  try:
   cached=texture_dir/(f'{idx:03}-normal-uv-v3.png')
   if cached.exists():bpy.data.images.remove(normal_image);normal_image=bpy.data.images.load(str(cached));normal_image.colorspace_settings.name='Non-Color'
   else:bpy.ops.object.bake(type='NORMAL')
   normal_image.filepath_raw=str(cached);normal_image.file_format='PNG';normal_image.save();normal_image.pack()
   tex=new.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal_image;normal=new.node_tree.nodes.new('ShaderNodeNormalMap')
   new.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);new.node_tree.links.new(normal.outputs['Normal'],pn.inputs['Normal'])
   report.setdefault('bakedNormalMaterials',[]).append(name)
  except Exception as error:print('NORMAL BAKE FAILURE',name,str(error),flush=True)
  bpy.data.materials.remove(normal_mat)
 replacement[name]=new
 if re.search(r'glass|glazing',name,re.I):pn.inputs['Alpha'].default_value=.08;pn.inputs['Roughness'].default_value=.15
 print('MATERIAL',idx+1,len(used),name,flush=True)
bpy.context.window.scene=s
# Keep original scene copy with export-friendly material variants. Archive isn't exported.
for o in s.objects:
 if hasattr(o.data,'materials') and group(o):
  for i,m in enumerate(o.data.materials):
   if m and m.name in replacement:o.data.materials[i]=replacement[m.name]
# Save source-derived working copy before destructive export freezing.
s.frame_set(1)
# A render-target placeholder is useful in GLB, but the editable Blender copy
# should still show its packed garden screen image when opened on its own.
screen=bpy.data.objects.get('Portal_screen');screen_slots=[]
if screen and bpy.data.materials.get('Garden_screen'):
 for i,material in enumerate(screen.data.materials):
  if material==replacement.get('Garden_screen'):
   screen_slots.append((i,material));screen.data.materials[i]=bpy.data.materials['Garden_screen']
bpy.ops.wm.save_as_mainfile(filepath=str(out/'birthday-world-browser-working.blend'))
for i,material in screen_slots:screen.data.materials[i]=material
# Export each set through evaluated original geometry. Keep node transforms/pivots.
for key,f in reps.items():
 s.frame_set(f);bpy.context.view_layer.update();depg=bpy.context.evaluated_depsgraph_get()
 export_scene=bpy.data.scenes.new('WEB EXPORT '+key);mapping={};verts=0;tris=0
 names=selected[key]
 # Mesh data cache preserves repeated source instances; keep hero silhouettes untouched.
 cache={}
 for name in names:
  o=bpy.data.objects[name];e=o.evaluated_get(depg)
  data_key=(o.data.name, o.name if len(o.modifiers) else '', tuple(m.name for m in o.data.materials if m))
  if data_key not in cache:
   me=bpy.data.meshes.new_from_object(e,depsgraph=depg,preserve_all_data_layers=True)
   if not me.vertices:continue
   if not me.uv_layers:
    layer=me.uv_layers.new(name='Export box UV')
    lo=Vector([min(v.co[i] for v in me.vertices) for i in range(3)]);hi=Vector([max(v.co[i] for v in me.vertices) for i in range(3)]);span=hi-lo
    for poly in me.polygons:
     axis=max(range(3),key=lambda i:abs(poly.normal[i]));a,b=[i for i in range(3) if i!=axis]
     for li in poly.loop_indices:
      co=me.vertices[me.loops[li].vertex_index].co;layer.data[li].uv=((co[a]-lo[a])/max(span[a],.001),(co[b]-lo[b])/max(span[b],.001))
   cache[data_key]=me
  me=cache[data_key];n=bpy.data.objects.new(o.name,me);n.matrix_world=o.matrix_world.copy();export_scene.collection.objects.link(n);mapping[name]=n
  n['source_name']=o.name;n['group']=key
  me.calc_loop_triangles();verts+=len(me.vertices);tris+=len(me.loop_triangles)
 # Preserve meaningful dynamic empty hierarchy; meshes use world matrices otherwise.
 if key in ['door','flames']:
  ancestors=set()
  for name in names:
   p=bpy.data.objects[name].parent
   while p:ancestors.add(p.name);p=p.parent
  for name in ancestors:
   o=bpy.data.objects[name];n=bpy.data.objects.new(name,None);export_scene.collection.objects.link(n);n.matrix_world=o.matrix_world.copy();mapping[name]=n
   n['source_name']=name;n['group']=key
  for name,n in mapping.items():
   orig=bpy.data.objects[name];world=n.matrix_world.copy()
   if orig.parent and orig.parent.name in mapping:n.parent=mapping[orig.parent.name];n.matrix_world=world
 bpy.context.window.scene=export_scene
 for o in export_scene.objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/(key+'-raw.glb')),export_format='GLB',use_selection=False,use_active_scene=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_yup=True,export_apply=False,export_materials='EXPORT')
 report['groups'][key]={'frame':f,'objects':len(names),'vertices':verts,'triangles':tris,'rawBytes':(out/(key+'-raw.glb')).stat().st_size}
 print('EXPORTED',key,report['groups'][key],flush=True)
 bpy.context.window.scene=s;bpy.data.scenes.remove(export_scene)
 for n in mapping.values():
  if n.users==0:bpy.data.objects.remove(n)
(out/'export-report.json').write_text(json.dumps(report,indent=2))
print('COMPLETE',flush=True)
