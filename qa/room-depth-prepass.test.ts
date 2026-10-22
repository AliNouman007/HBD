import assert from 'node:assert/strict';
import test from 'node:test';
import {BoxGeometry,DoubleSide,Group,InstancedMesh,LessDepth,Material,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,MeshStandardMaterial,NormalBlending,Object3D,PerspectiveCamera,Plane,Scene,SkinnedMesh,Texture,Vector3,type WebGLRenderer} from 'three';
import {canPrepass,installRoomDepthPrepass} from '../lib/world/room-depth-prepass.ts';

function fixture(){
 const root=new Group(),material=new MeshStandardMaterial({side:DoubleSide}),object=new Mesh(new BoxGeometry(),material);
 root.add(object);const scene=new Scene(),camera=new PerspectiveCamera(),draws:any[][]=[];
 const renderer={clippingPlanes:[],renderBufferDirect(...args:any[]){draws.push(args)}} as unknown as WebGLRenderer;
 return {root,material,object,scene,camera,renderer,draws,draw(){material.onBeforeRender(renderer,scene,camera,object.geometry,object,null as any)}};
}

test('depth-only draw keeps active target, geometry, group, side and original material unchanged',()=>{
 const f=fixture(),group={start:3,count:6,materialIndex:0};let prior=0;
 f.material.onBeforeRender=function(){assert.equal(this,f.material);prior++};
 const previous=f.material.onBeforeRender,dispose=installRoomDepthPrepass(f.root);
 f.material.onBeforeRender(f.renderer,f.scene,f.camera,f.object.geometry,f.object,group as any);
 assert.equal(prior,1);assert.equal(f.draws.length,1);
 const [camera,scene,geometry,depth,object,drawGroup]=f.draws[0];
 assert.equal(camera,f.camera);assert.equal(scene,f.scene);assert.equal(geometry,f.object.geometry);assert.equal(object,f.object);assert.equal(drawGroup,group);
 assert.equal(depth.isMeshDepthMaterial,true);assert.equal(depth.side,DoubleSide);assert.equal(depth.colorWrite,false);assert.equal(depth.depthWrite,true);assert.equal(depth.depthTest,true);
 assert.equal(f.material.colorWrite,true);assert.equal(f.material.side,DoubleSide);assert.equal(f.material.blending,NormalBlending);
 let disposed=false;depth.addEventListener('dispose',()=>disposed=true);dispose();assert.equal(disposed,true);assert.equal(f.material.onBeforeRender,previous);
});

test('both vertex programs declare invariant position and preserve previous compile hooks',()=>{
 const f=fixture();let compiled=0;
 f.material.onBeforeCompile=shader=>{compiled++;shader.fragmentShader+='\n// existing fragment-only work'};
 f.material.customProgramCacheKey=()=>`${Material.prototype.onBeforeCompile.toString()}:birthday-light-guard-v2`;
 const previous=f.material.onBeforeCompile,previousKey=f.material.customProgramCacheKey;
 const dispose=installRoomDepthPrepass(f.root),color={vertexShader:'void main() {}',fragmentShader:''} as any;
 f.material.onBeforeCompile(color,f.renderer);assert.equal(compiled,1);assert.equal(color.vertexShader,'invariant gl_Position;\nvoid main() {}');
 assert.match(color.fragmentShader,/existing fragment-only work/);assert.match(f.material.customProgramCacheKey(),/:birthday-depth-prepass-v1$/);
 f.draw();const depth=f.draws[0][3],depthShader={vertexShader:'void main() {}'};
 depth.onBeforeCompile(depthShader,f.renderer);assert.equal(depthShader.vertexShader,'invariant gl_Position;\nvoid main() {}');
 dispose();assert.equal(f.material.onBeforeCompile,previous);assert.equal(f.material.customProgramCacheKey,previousKey);
});

test('normal and transmission callbacks each draw once without nested callbacks',()=>{
 const f=fixture();let prior=0;f.material.onBeforeRender=()=>{prior++};installRoomDepthPrepass(f.root);
 f.draw();f.draw();assert.equal(prior,2);assert.equal(f.draws.length,2);
});

test('shared material outside the installed root stays untouched',()=>{
 const f=fixture();installRoomDepthPrepass(f.root);const other=new Mesh(f.object.geometry,f.material);
 f.material.onBeforeRender(f.renderer,f.scene,f.camera,other.geometry,other,null as any);assert.equal(f.draws.length,0);
});

test('stock instancing and position morphs are supported by the standard depth shader',()=>{
 const f=fixture(),instance=new InstancedMesh(f.object.geometry,f.material,3);
 assert.equal(canPrepass(f.material,instance),true);f.object.geometry.morphAttributes.position=[f.object.geometry.attributes.position.clone()];
 assert.equal(canPrepass(f.material,f.object),true);
});

test('fragment-only current light hook is allowed; unknown vertex hooks fail open',()=>{
 const f=fixture();f.material.customProgramCacheKey=()=>`${Material.prototype.onBeforeCompile.toString()}:birthday-light-guard-v2`;
 assert.equal(canPrepass(f.material,f.object),true);
 f.material.customProgramCacheKey=()=>`${Material.prototype.onBeforeCompile.toString()}:birthday-light-guard-shared-area-v1:birthday-room-output-v1`;
 assert.equal(canPrepass(f.material,f.object),true);const dispose=installRoomDepthPrepass(f.root);f.draw();assert.equal(f.draws.length,1);dispose();
 f.material.customProgramCacheKey=()=>`birthday-subtle-garden-wind:birthday-light-guard-v2`;
 assert.equal(canPrepass(f.material,f.object),false);
});

test('coverage, displacement, custom depth, draw-state and unsupported objects fail open',()=>{
 const mutations=[
  (m:MeshStandardMaterial)=>m.transparent=true,(m:MeshStandardMaterial)=>m.opacity=.8,
  (m:MeshStandardMaterial)=>m.alphaTest=.5,(m:MeshStandardMaterial)=>m.alphaHash=true,
  (m:MeshStandardMaterial)=>m.alphaToCoverage=true,(m:MeshStandardMaterial)=>m.alphaMap=new Texture(),
  (m:MeshStandardMaterial)=>m.displacementMap=new Texture(),(m:MeshStandardMaterial)=>m.wireframe=true,
  (m:MeshStandardMaterial)=>m.polygonOffset=true,(m:MeshStandardMaterial)=>m.stencilWrite=true,
  (m:MeshStandardMaterial)=>m.clippingPlanes=[new Plane(new Vector3(1,0,0),0)],
  (m:MeshStandardMaterial)=>m.depthTest=false,(m:MeshStandardMaterial)=>m.depthWrite=false,
  (m:MeshStandardMaterial)=>m.colorWrite=false,(m:MeshStandardMaterial)=>m.depthFunc=LessDepth,
  (m:MeshStandardMaterial)=>m.visible=false,
 ];
 for(const mutate of mutations){const f=fixture();mutate(f.material);assert.equal(canPrepass(f.material,f.object),false)}
 const f=fixture();assert.equal(canPrepass(new MeshBasicMaterial(),f.object),false);
 assert.equal(canPrepass(new MeshPhysicalMaterial({transmission:1}),f.object),false);
 assert.equal(canPrepass(f.material,new SkinnedMesh(f.object.geometry,f.material)),false);
 f.object.onBeforeRender=()=>{};assert.equal(canPrepass(f.material,f.object),false);
 f.object.onBeforeRender=Object3D.prototype.onBeforeRender;f.object.customDepthMaterial=new MeshBasicMaterial();assert.equal(canPrepass(f.material,f.object),false);
});

test('runtime state changes and renderer clipping fail open after installation',()=>{
 const f=fixture();installRoomDepthPrepass(f.root);f.material.alphaHash=true;f.draw();assert.equal(f.draws.length,0);
 f.material.alphaHash=false;f.renderer.clippingPlanes.push(new Plane());f.draw();assert.equal(f.draws.length,0);
 f.renderer.clippingPlanes=[];f.scene.overrideMaterial=new MeshBasicMaterial();f.draw();assert.equal(f.draws.length,0);
 f.scene.overrideMaterial=null;f.material.side=0;f.draw();assert.equal(f.draws.length,0);
 f.material.side=DoubleSide;f.material.onBeforeCompile=()=>{};f.draw();assert.equal(f.draws.length,0);
});

test('warmup compiles actual mesh and instance variants then restores materials before awaiting',async()=>{
 const f=fixture(),instance=new InstancedMesh(f.object.geometry,f.material,232);f.root.add(instance);
 const pass=installRoomDepthPrepass(f.root),originalGeometry=f.object.geometry;let finish!:()=>void,compiledDepth:any;
 const pending=new Promise<void>(resolve=>finish=resolve);
 f.renderer.compileAsync=async(root,camera,scene)=>{
  assert.equal(root,f.root);assert.equal(camera,f.camera);assert.equal(scene,f.scene);
  assert.equal(f.object.geometry,originalGeometry);assert.equal(instance.count,232);assert.equal(instance.isInstancedMesh,true);
  assert.equal(f.object.material,instance.material);assert.equal((f.object.material as any).isMeshDepthMaterial,true);
  compiledDepth=f.object.material;await pending;return root;
 };
 const warming=pass.compileAsync(f.renderer,f.camera,f.scene);
 assert.equal(f.object.material,f.material);assert.equal(instance.material,f.material);
 f.draw();assert.equal(f.draws[0][3],compiledDepth);
 finish();await warming;pass();
});

test('synchronous compiler failures restore every original material',async()=>{
 const f=fixture(),pass=installRoomDepthPrepass(f.root);
 f.renderer.compileAsync=()=>{throw Error('compile failed')};
 await assert.rejects(pass.compileAsync(f.renderer,f.camera,f.scene),/compile failed/);
 assert.equal(f.object.material,f.material);pass();
});

test('disposal waits for an in-flight compilation and later warmups are no-ops',async()=>{
 const f=fixture(),pass=installRoomDepthPrepass(f.root);let reject!:(_error:Error)=>void,disposed=0,calls=0;
 const pending=new Promise<void>((_resolve,fail)=>reject=fail);
 f.renderer.compileAsync=async root=>{calls++;(f.object.material as any).addEventListener('dispose',()=>disposed++);await pending;return root};
 const warming=pass.compileAsync(f.renderer,f.camera,f.scene);assert.equal(f.object.material,f.material);
 pass();assert.equal(disposed,0);await pass.compileAsync(f.renderer,f.camera,f.scene);assert.equal(calls,1);
 reject(Error('compile failed'));await assert.rejects(warming,/compile failed/);assert.equal(disposed,1);
 pass();assert.equal(disposed,1);
});
