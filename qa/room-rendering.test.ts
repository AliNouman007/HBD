import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,Group,Mesh,Raycaster,Texture,Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {Journey} from '../lib/world/journey.ts';
import {applyEntryDoorOcclusion,entryDoorOccludes,shouldRefreshShadow,freezeStaticTransforms} from '../lib/world/render-work.ts';

const camera=new Vector3(.2,1.4,1.65);
const box=(min:number[],max:number[])=>new Box3(new Vector3().fromArray(min),new Vector3().fromArray(max));

test('static authored transforms retain their exact world pose without recomputing every frame',()=>{
 const root=new Group(),child=new Group();root.position.set(2,3,4);root.rotation.y=.6;child.position.set(1,2,3);root.add(child);root.updateMatrixWorld(true);
 const original=child.matrixWorld.clone();freezeStaticTransforms(root);
 let updates=0;child.updateMatrix=()=>{updates++};root.updateMatrixWorld(true);
 assert.equal(updates,0);assert(child.matrixWorld.equals(original));assert(!child.matrixAutoUpdate&&!child.matrixWorldAutoUpdate);
});

test('the solid closed-door core hides a fully covered distant box',()=>{
 assert(entryDoorOccludes(box([-.7,.8,-3.9],[-.3,1.4,-3.3]),camera));
});

test('door occlusion keeps partial, nearby, invalid and side views visible',()=>{
 for(const bounds of [box([-4,0,-4],[4,4,-3]),box([-.3,.8,-1],[.3,1.4,.1]),box([-.3,.8,.5],[.3,1.4,1]),new Box3(),box([NaN,0,-2],[1,1,-1]),box([-.7,.8,-Infinity],[-.3,1.4,-3.3])])assert(!entryDoorOccludes(bounds,camera));
 const hidden=box([-.7,.8,-3.9],[-.3,1.4,-3.3]);
 assert(!entryDoorOccludes(hidden,new Vector3(0,1,-1)),'camera behind door');
 assert(!entryDoorOccludes(hidden,new Vector3(4,1,1)),'side sightline');
});

test('shadow refresh ignores stationary actors at their endpoints',()=>{
 for(let moving=0;moving<3;moving++){
  const actors:[boolean,number][]=[[false,0],[false,1],[false,0]];actors[moving]=[true,.5];
  assert(!shouldRefreshShadow(.01,...actors),'unrelated endpoints must not bypass the interval');
  assert(shouldRefreshShadow(1/24,...actors),'moving shadow refreshes when due');
  actors[moving]=[true,1];assert(shouldRefreshShadow(.001,...actors),'final pose must refresh');
  actors[moving]=[true,0];assert(shouldRefreshShadow(.001,...actors),'return to starting pose must refresh');
 }
 assert(!shouldRefreshShadow(1,[false,0],[false,1],[false,0]),'idle actors never dirty the map');
});

test('render visibility restores casters, first door motion and each camera independently',()=>{
 const j=new Journey();j.progress=.32;const assets={cake:new Group(),flames:new Group()},bounds=new Map(Object.keys(assets).map(name=>[name,box([-.7,.8,-3.9],[-.3,1.4,-3.3])]));
 const apply=(dirty=false,pos=camera)=>applyEntryDoorOcclusion(assets,bounds,pos,j,dirty);
 apply();assert(!assets.cake.visible&&!assets.flames.visible);
 apply(true);assert(assets.cake.visible&&assets.flames.visible,'all required shadow casters restored');
 apply();assert(!assets.cake.visible,'cached shadow allows colour-only culling again');
 apply(false,new Vector3(4,1,1));assert(assets.cake.visible,'second camera cannot inherit first camera culling');
 for(const patch of [{doorT:.001},{doorOpen:true},{exitDoorT:.1},{giftT:.1},{progress:.4},{mode:'freeLook' as const},{mode:'portrait' as const},{mode:'teddy' as const}]){
  Object.assign(j,new Journey(),{progress:.32});apply();Object.assign(j,patch);apply();assert(assets.cake.visible,JSON.stringify(patch));
 }
 Object.assign(j,new Journey(),{progress:.56,doorOpen:true,doorT:1,extinguished:true});apply();assert(assets.cake.visible&&!assets.flames.visible,'extinguished flames remain hidden');
 apply(true);assert(!assets.flames.visible,'shadow refresh must not revive flames');
 j.replay();j.progress=.32;apply(true);assert(assets.cake.visible&&assets.flames.visible);apply();assert(!assets.cake.visible,'replay restores closed-door optimization');
});

test('authored door covers the conservative core and actual later asset bounds',async()=>{
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(parser=>{
  (parser as unknown as {loadTextureImage:()=>Promise<Texture>}).loadTextureImage=()=>Promise.resolve(new Texture());return {name:'HEADLESS_TEXTURE'};
 });
 const assets:Partial<Record<string,Group>>={},bounds=new Map<string,Box3>();
 for(const name of ['door','cake','flames','exit-door','gift','ending']){
  const bytes=await readFile(new URL(`../public/world/${name}.glb`,import.meta.url)),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assets[name]=gltf.scene;gltf.scene.updateMatrixWorld(true);if(name!=='door')bounds.set(name,new Box3().setFromObject(gltf.scene).expandByScalar(.05));
 }
 const oak:Mesh[]=[];assets.door!.traverse(o=>{if(o instanceof Mesh&&String(o.userData.source_name||o.name).replaceAll('_',' ').toLowerCase().includes('solid oak door'))oak.push(o)});assert(oak.length);
 for(const x of [-.68,0,.68])for(const y of [.12,1,1.95]){
  const ray=new Raycaster(camera,new Vector3(x,y,-.06).sub(camera).normalize());assert(ray.intersectObjects(oak).length,'door core must remain physically opaque');
 }
 const j=new Journey();j.progress=.32;applyEntryDoorOcclusion(assets,bounds,camera,j,false);
 for(const name of bounds.keys())assert.equal(assets[name]!.visible,false,`${name} is covered by the closed oak leaf`);
 j.doorT=.00001;applyEntryDoorOcclusion(assets,bounds,camera,j,false);for(const name of bounds.keys())assert(assets[name]!.visible,'first door motion restores every hidden group');
});
