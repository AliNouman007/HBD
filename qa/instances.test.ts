import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AnimationClip,AnimationMixer,BoxGeometry,Group,InstancedMesh,Matrix4,Mesh,MeshPhysicalMaterial,MeshStandardMaterial,QuaternionKeyframeTrack,Raycaster,Texture,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {instanceRepeatedSiblings} from '../lib/world/instances.ts';

function repeated(parent:Group,count=3,geometry=new BoxGeometry(.2,.4,.1),material=new MeshStandardMaterial()){
 return Array.from({length:count},(_,i)=>{const mesh=new Mesh(geometry,material);mesh.name=`trim-${i}`;mesh.userData.source_name=`Authored trim ${i}`;mesh.position.set(i*.6,.3,0);mesh.rotation.set(i*.07,i*.12,i*.04);mesh.scale.set(1+i*.05,1,1);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh});
}
function assertWorldCoordinates(instance:InstancedMesh,originals:Mesh[]){
 const matrix=new Matrix4(),world=new Matrix4(),expected=new Vector3(),actual=new Vector3();
 for(let i=0;i<originals.length;i++){
  instance.getMatrixAt(i,matrix);world.multiplyMatrices(instance.matrixWorld,matrix);const positions=originals[i].geometry.getAttribute('position');
  for(let v=0;v<positions.count;v++){expected.fromBufferAttribute(positions,v).applyMatrix4(originals[i].matrixWorld);actual.fromBufferAttribute(positions,v).applyMatrix4(world);assert(actual.distanceTo(expected)<1e-6,`instance ${i} vertex ${v}`)}
 }
}

test('instances preserve all geometry, materials, bounds, shadows and moving-parent coordinates',()=>{
 const root=new Group(),leaf=new Group();leaf.name='moving-leaf';root.add(leaf);leaf.position.set(2,1,-3);leaf.rotation.y=.5;
 const originals=repeated(leaf);for(const mesh of originals){mesh.layers.set(2);mesh.renderOrder=4}
 root.animations=[new AnimationClip('Door',1,[new QuaternionKeyframeTrack('moving-leaf.quaternion',[0,1],[0,0,0,1,0,.7,0,.7])])];
 root.updateMatrixWorld(true);const geometry=originals[0].geometry,uv=Array.from(geometry.getAttribute('uv').array),positions=Array.from(geometry.getAttribute('position').array);
 const batches=instanceRepeatedSiblings(root);assert.equal(batches.length,1);const {instance}=batches[0];assert.deepEqual(batches[0].originals,originals);
 assert.equal(instance.parent,leaf);assert.equal(instance.geometry,geometry);assert.equal(instance.material,originals[0].material);assert.equal(instance.count,3);
 assert(instance.castShadow&&instance.receiveShadow);assert.equal(instance.layers.mask,originals[0].layers.mask);assert.equal(instance.renderOrder,4);
 assert.deepEqual(Array.from(geometry.getAttribute('uv').array),uv);assert.deepEqual(Array.from(geometry.getAttribute('position').array),positions);
 assert(originals.every(m=>m.parent===leaf&&!m.visible));assert.deepEqual(instance.userData.source_names,originals.map(m=>m.userData.source_name));
 root.updateMatrixWorld(true);assertWorldCoordinates(instance,originals);
 const local=new Matrix4(),p=new Vector3();for(let i=0;i<originals.length;i++){instance.getMatrixAt(i,local);for(let v=0;v<geometry.getAttribute('position').count;v++){p.fromBufferAttribute(geometry.getAttribute('position'),v).applyMatrix4(local);assert(instance.boundingBox!.containsPoint(p));assert(instance.boundingSphere!.containsPoint(p))}}
 leaf.rotation.y=1.4;leaf.position.x+=.8;root.updateMatrixWorld(true);assertWorldCoordinates(instance,originals);
 assert.equal(instanceRepeatedSiblings(root).length,0,'calling again does not duplicate an existing batch');
 instance.visible=false;originals.forEach(m=>m.visible=true);assert(originals.every(m=>m.visible),'originals remain available for comparison');
 let disposed=false;instance.addEventListener('dispose',()=>{disposed=true});instance.dispose();assert(disposed,'native instance buffers have an explicit cleanup hook');
});

test('batched opaque trim remains pickable through its parent',()=>{
 const root=new Group(),meshes=repeated(root);const ray=new Raycaster(new Vector3(0,.3,2),new Vector3(0,0,-1));root.updateMatrixWorld(true);
 const before=ray.intersectObject(root,true).filter(hit=>hit.object.visible);assert(before.length>0);
 const [{instance}]=instanceRepeatedSiblings(root);root.updateMatrixWorld(true);const after=ray.intersectObject(root,true).filter(hit=>hit.object===instance);assert(after.length>0);assert.equal(after[0].instanceId,0);assert(Math.abs(before[0].distance-after[0].distance)<1e-6);assert.equal(instance.geometry,meshes[0].geometry);
});

test('unsafe or animated mesh leaves remain untouched',()=>{
 const cases:[string,(meshes:Mesh[],root:Group)=>void][]=[
  ['transparent',ms=>{(ms[0].material as MeshStandardMaterial).transparent=true}],
  ['opacity',ms=>{(ms[0].material as MeshStandardMaterial).opacity=.5}],
  ['transmission',ms=>{const material=new MeshPhysicalMaterial({transmission:1});ms.forEach(m=>m.material=material)}],
  ['material arrays',ms=>{ms.forEach(m=>m.material=[m.material as MeshStandardMaterial])}],
  ['negative local scale',ms=>ms.forEach(m=>m.scale.x=-1)],
  ['negative parent scale',(_ms,root)=>{root.scale.x=-1}],
  ['morph targets',ms=>{ms[0].geometry.morphAttributes.position=[ms[0].geometry.getAttribute('position').clone()]}],
  ['custom render',ms=>ms.forEach(m=>m.onBeforeRender=()=>{})],
  ['child meshes',ms=>ms.forEach(m=>m.add(new Group()))],
  ['animated leaves',(ms,root)=>{root.animations=[new AnimationClip('Trim',1,ms.map(m=>new QuaternionKeyframeTrack(`${m.name}.quaternion`,[0,1],[0,0,0,1,0,.7,0,.7])))]}]
 ];
 for(const [name,change] of cases){const root=new Group(),meshes=repeated(root);change(meshes,root);assert.equal(instanceRepeatedSiblings(root).length,0,name);assert(meshes.every(m=>m.visible),name)}
});

test('batches use exact shared geometry and material and preserve per-mesh render flags',()=>{
 const root=new Group(),meshes=repeated(root,4);meshes[3].castShadow=false;
 const other=new Mesh(meshes[0].geometry.clone(),meshes[0].material);root.add(other);
 const another=new Mesh(meshes[0].geometry,(meshes[0].material as MeshStandardMaterial).clone());root.add(another);
 const batches=instanceRepeatedSiblings(root);assert.equal(batches.length,1);assert.equal(batches[0].instance.count,3);assert(meshes[3].visible&&other.visible&&another.visible);
});


test('the authored exit door keeps every vertex and glass mesh through its real opening clip',async()=>{
 const bytes=await readFile(new URL('../public/world/exit-door.glb',import.meta.url));
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(parser=>{
  // Geometry and material identity are real; image decoding needs a browser.
  (parser as unknown as {loadTextureImage:()=>Promise<Texture>}).loadTextureImage=()=>Promise.resolve(new Texture());return {name:'HEADLESS_TEXTURE'};
 });
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const root=gltf.scene;root.animations=gltf.animations;
 let before=0;const glass:Mesh[]=[];root.traverse(o=>{if(o instanceof Mesh){before++;o.castShadow=true;o.receiveShadow=true;if(o.material instanceof MeshPhysicalMaterial&&o.material.transmission>0)glass.push(o)}});
 const batches=instanceRepeatedSiblings(root);let after=0;root.traverseVisible(o=>{if(o instanceof Mesh)after++});
 assert.equal(before,114);assert(after<=51,'at least 63 draws are removed without merging geometry');assert.equal(glass.length,14);assert(glass.every(m=>m.visible&&m.castShadow));
 const mixer=new AnimationMixer(root);mixer.clipAction(gltf.animations[0]).play();
 for(const time of [0,.5,1.5,2.99]){mixer.setTime(time);root.updateMatrixWorld(true);for(const {instance,originals} of batches){assert(originals.every(m=>m.geometry===instance.geometry&&m.material===instance.material&&m.castShadow===instance.castShadow&&m.receiveShadow===instance.receiveShadow));assertWorldCoordinates(instance,originals)}}
 for(const {instance}of batches)instance.dispose();mixer.stopAllAction();mixer.uncacheRoot(root);
});
