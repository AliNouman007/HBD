"""Keep the connected terrace and ending physically present in derived copies."""
def make_connected_sets_visible(scene):
 materials=set();changed=[];candidates=set();original_frame=scene.frame_current
 # Resolve collection ancestry at the same representative frames as export.
 # Archived source collections may retain ordinary child collection names.
 for frame,prefixes in [(1740,('50 ','51 ','52 ')),(2520,('60 ','61 ','62 '))]:
  scene.frame_set(frame)
  def visit(collection,hidden=False):
   hidden=hidden or collection.hide_render
   if not hidden:
    for obj in collection.objects:
     if not obj.hide_render and any(c.name.startswith(prefixes) for c in obj.users_collection):candidates.add(obj.name)
   for child in collection.children:visit(child,hidden)
  visit(scene.collection)
 scene.frame_set(original_frame)
 for obj in scene.objects:
  names=[collection.name for collection in obj.users_collection]
  if obj.name not in candidates or obj.type not in ['MESH','CURVE'] or any('archive' in name.lower() for name in names):continue
  if not any(name.startswith(('50 ','51 ','52 ','60 ','61 ','62 ')) for name in names):continue
  if obj.animation_data and obj.animation_data.action:
   for curve in list(obj.animation_data.action.fcurves):
    if curve.data_path in ['hide_render','hide_viewport']:obj.animation_data.action.fcurves.remove(curve)
  obj.hide_render=False;obj.hide_viewport=False
  materials.update(material for material in obj.data.materials if material);changed.append(obj.name)
 for material in materials:
  if not material.use_nodes:continue
  tree=material.node_tree
  for node in tree.nodes:
   if node.type!='BSDF_PRINCIPLED' or 'Weight' not in node.inputs:continue
   weight=node.inputs['Weight'];path=weight.path_from_id('default_value')
   if tree.animation_data and tree.animation_data.action:
    for curve in list(tree.animation_data.action.fcurves):
     if curve.data_path==path:tree.animation_data.action.fcurves.remove(curve)
   if not weight.is_linked:weight.default_value=1
 return changed
