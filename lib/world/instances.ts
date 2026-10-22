import {Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D,PropertyBinding,SkinnedMesh} from 'three';
export type InstanceBatch={instance:InstancedMesh;originals:Mesh[]};

/** Keep the authored meshes for comparison; each batch inherits its existing animated parent. */
export function instanceRepeatedSiblings(root:Group):InstanceBatch[]{
 const batches:InstanceBatch[]=[],animated=new Set<Object3D>(),parents:Object3D[]=[];
 for(const clip of root.animations)for(const track of clip.tracks){
  const node=PropertyBinding.findNode(root,PropertyBinding.parseTrackName(track.name).nodeName);if(node instanceof Object3D)animated.add(node);
 }
 root.updateMatrixWorld(true);root.traverse(parent=>{if(parent.children.length)parents.push(parent)});
 for(const parent of parents){
  const groups=new Map<string,Mesh[]>();
  for(const node of parent.children){
   if(!(node instanceof Mesh)||node instanceof InstancedMesh||node instanceof SkinnedMesh||!node.visible||node.children.length||animated.has(node))continue;
   const material=node.material;
   if(Array.isArray(material)||!(material instanceof MeshStandardMaterial)||!material.visible||material.transparent||material.opacity!==1||!material.depthWrite||'transmission' in material&&Number(material.transmission)>0)continue;
   if(Object.keys(node.geometry.morphAttributes).length||node.matrix.determinant()<=0||node.matrixWorld.determinant()<=0||node.customDepthMaterial||node.customDistanceMaterial)continue;
   if(node.onBeforeRender!==Object3D.prototype.onBeforeRender||node.onAfterRender!==Object3D.prototype.onAfterRender)continue;
   const key=[node.geometry.uuid,material.uuid,node.castShadow,node.receiveShadow,node.layers.mask,node.renderOrder,node.frustumCulled].join(':');
   const siblings=groups.get(key);if(siblings)siblings.push(node);else groups.set(key,[node]);
  }
  for(const originals of groups.values()){
   if(originals.length<2)continue;
   const first=originals[0],instance=new InstancedMesh(first.geometry,first.material,originals.length);
   instance.name=`Repeated ${first.name}`;instance.userData={...first.userData,source_names:originals.map(mesh=>String(mesh.userData.source_name||mesh.name))};
   instance.castShadow=first.castShadow;instance.receiveShadow=first.receiveShadow;instance.layers.mask=first.layers.mask;instance.renderOrder=first.renderOrder;instance.frustumCulled=first.frustumCulled;
   originals.forEach((mesh,i)=>{instance.setMatrixAt(i,mesh.matrix);mesh.visible=false});instance.instanceMatrix.needsUpdate=true;instance.computeBoundingBox();instance.computeBoundingSphere();
   parent.add(instance);batches.push({instance,originals});
  }
 }
 return batches;
}
