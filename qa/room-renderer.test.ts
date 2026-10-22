import assert from 'node:assert/strict';
import test from 'node:test';
import {AgXToneMapping,BoxGeometry,Color,DoubleSide,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,Scene,ShaderLib,SRGBColorSpace,UnsignedByteType,Vector2,Vector4,WebGLRenderer} from 'three';
import {RoomRenderer,roomOutputFragment} from '../lib/world/room-renderer.ts';

function fixture(samples=4){
 let target:unknown=null;
 const calls:{kind:string;target?:unknown;names?:string[];background?:unknown;autoClear?:boolean}[]=[];
 const gl={MAX_DRAW_BUFFERS:1,MAX_COLOR_ATTACHMENTS:2,SAMPLES:3,FRAMEBUFFER:4,FRAMEBUFFER_COMPLETE:5,RGBA16F:6,RGBA8:7,DEPTH_COMPONENT24:8,RENDERBUFFER:9,getParameter:(key:number)=>key===3?samples:4,getContextAttributes:()=>({alpha:true}),getInternalformatParameter:()=>new Int32Array([4]),checkFramebufferStatus:()=>5};
 const renderer={getContext:()=>gl,capabilities:{maxSamples:4},
  extensions:{has:(name:string)=>name==='EXT_color_buffer_float'},xr:{isPresenting:false},
  toneMapping:AgXToneMapping,outputColorSpace:SRGBColorSpace,autoClear:true,shadowMap:{needsUpdate:false,enabled:true,autoUpdate:true},
  info:{autoReset:true,reset(){calls.push({kind:'reset'})}},
  getRenderTarget:()=>target,setRenderTarget(value:unknown){target=value},
  getScissorTest:()=>false,getViewport:(out:Vector4)=>out.set(0,0,1280,720),getSize:(out:Vector2)=>out.set(1280,720),getDrawingBufferSize:(out:Vector2)=>out.set(1280,720),
  initRenderTarget(value:unknown){calls.push({kind:'init',target:value})},copyTextureToTexture(){calls.push({kind:'copy'})},
  compile(..._args:unknown[]){calls.push({kind:'compile'})},compileAsync:async(..._args:unknown[]):Promise<unknown>=>undefined,
  render(scene:Scene){
   if(scene.matrixWorldAutoUpdate)scene.updateMatrixWorld();
   if(scene===experiment.screenScene){calls.push({kind:experiment.screenMesh.material===experiment.backgroundMaterial?'background':'output'});return}
   const names:string[]=[];
   scene.traverseVisible(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.visible)names.push(material.name)});
   calls.push({kind:'render',target,names,background:scene.background,autoClear:this.autoClear});
  },
 };
 const scene=new Scene();scene.background=new Color('#abcdee');
 let sceneMatrixUpdates=0;const updateMatrixWorld=scene.updateMatrixWorld;
 scene.updateMatrixWorld=function(force){sceneMatrixUpdates++;updateMatrixWorld.call(this,force)};
 const opaque=new MeshBasicMaterial({name:'opaque'}),glass=new MeshPhysicalMaterial({name:'glass',transmission:1,roughness:.045,ior:1.45,thickness:0}),transparent=new MeshBasicMaterial({name:'transparent',transparent:true,opacity:.5});
 for(const material of[opaque,glass,transparent]){const mesh=new Mesh(new BoxGeometry(),material);mesh.position.z=-4;scene.add(mesh)}
 const camera=new PerspectiveCamera(50,1280/720,.1,100);
 const experiment=new RoomRenderer(renderer as unknown as WebGLRenderer);

 return{renderer,calls,scene,camera,experiment,opaque,glass,transparent,gl,get sceneMatrixUpdates(){return sceneMatrixUpdates}};
}

test('one opaque shading pass, separate glass and transparent stages, one output stage',async()=>{
 const f=fixture(),background=f.scene.background;
 f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);
 assert.equal(f.experiment.render(f.scene,f.camera),true);
 const passes=f.calls.filter(call=>call.kind==='render');
 assert.deepEqual(passes.map(pass=>pass.names),[['opaque'],['glass'],['transparent']]);
 assert.ok(passes.every(pass=>pass.target===f.experiment.hdr));
 assert.deepEqual(passes.map(pass=>pass.autoClear),[false,false,false]);
 assert.deepEqual(passes.map(pass=>pass.background),[null,null,null]);
 assert.deepEqual(f.calls.filter(call=>['copy','render','output'].includes(call.kind)).map(call=>call.kind),['render','copy','render','render','output']);
 assert.equal(f.experiment.hdr.textures.length,2);assert.equal(f.experiment.hdr.textures[1].type,UnsignedByteType);assert.equal(f.experiment.hdr.samples,4);assert.equal(f.experiment.hdr.resolveDepthBuffer,true);assert.equal(f.experiment.snapshot.texture.generateMipmaps,true);
 assert.equal(f.experiment.snapshot.texture,f.experiment.sampler.value);
 assert.equal(f.scene.background,background);assert.equal(f.renderer.getRenderTarget(),null);assert.equal(f.renderer.toneMapping,AgXToneMapping);assert.equal(f.renderer.shadowMap.autoUpdate,true);assert.equal(f.renderer.info.autoReset,true);
 assert.deepEqual(f.scene.children.map(object=>(object as Mesh).material),[f.opaque,f.glass,f.transparent]);
 assert.ok([f.opaque,f.glass,f.transparent].every(material=>material.visible));
 f.experiment.dispose();
});

test('external physical transmission keeps stock shader and avoids built-in replay classification',async()=>{
 const f=fixture();f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);f.experiment.render(f.scene,f.camera);
 const binding=f.experiment.glass.get(f.glass)!;
 assert.equal(binding.material.transmission,0);assert.equal(binding.material.transparent,true);
 const shader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader,uniforms:{}};
 binding.material.onBeforeCompile(shader as never,f.renderer as unknown as WebGLRenderer);
 assert.equal(shader.vertexShader,ShaderLib.physical.vertexShader);assert.ok(shader.fragmentShader.includes('layout(location = 1)'));assert.ok(shader.fragmentShader.includes('birthdayDisplayColor.rgb = AgXToneMapping'));assert.ok(shader.fragmentShader.includes('birthdayDisplayFogColor'));
 const uniforms=shader.uniforms as Record<string,{value:unknown}>;
 assert.equal(uniforms.transmission.value,1);assert.equal(uniforms.transmissionSamplerMap.value,f.experiment.snapshot.texture);
 assert.equal(uniforms.transmissionSamplerSize.value,f.experiment.samplerSize.value);
 assert.deepEqual((binding.material as unknown as{defines:Record<string,string>}).defines.USE_TRANSMISSION,'');
 f.experiment.dispose();
});

test('shared passes update moving scene matrices once and restore the prior update setting',async()=>{
 for(const automatic of[true,false]){
  const f=fixture();f.scene.matrixWorldAutoUpdate=automatic;
  f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);
  assert.equal(f.experiment.render(f.scene,f.camera),true);
  assert.equal(f.sceneMatrixUpdates,1);assert.equal(f.scene.matrixWorldAutoUpdate,automatic);
  f.scene.children[0].position.x=2;
  assert.equal(f.experiment.render(f.scene,f.camera),true);
  assert.equal(f.sceneMatrixUpdates,2);assert.equal(f.scene.children[0].matrixWorld.elements[12],2);
  assert.equal(f.scene.matrixWorldAutoUpdate,automatic);f.experiment.dispose();
 }
});

test('native fallback keeps the renderer scene update active',async()=>{
 const f=fixture(0);f.scene.children[0].position.x=2;
 assert.equal(f.experiment.render(f.scene,f.camera),false);
 assert.equal(f.sceneMatrixUpdates,1);assert.equal(f.scene.children[0].matrixWorld.elements[12],2);
 assert.equal(f.scene.matrixWorldAutoUpdate,true);f.experiment.dispose();
});

test('native fallback preserves shadow refreshes and unsupported glass',async()=>{
 const f=fixture();f.renderer.shadowMap.needsUpdate=true;
 assert.equal(f.experiment.render(f.scene,f.camera),false);assert.equal(f.experiment.lastFallback,'shadow refresh');
 assert.equal(f.scene.matrixWorldAutoUpdate,true);
 assert.equal(f.calls.filter(call=>call.kind==='render').length,1);assert.deepEqual(f.calls.at(-1)?.names,['opaque','glass','transparent']);
 f.renderer.shadowMap.needsUpdate=false;f.glass.side=DoubleSide;
 assert.equal(f.experiment.render(f.scene,f.camera),false);assert.equal(f.experiment.lastFallback,'unsupported transmissive material');
 f.experiment.dispose();
});

test('all scene, material and renderer state restores when a later stage throws',async()=>{
 const f=fixture(),background=f.scene.background,render=f.renderer.render;
 let count=0;f.renderer.render=function(scene:Scene){if(++count===3)throw Error('test stage failure');render.call(this,scene)};
 f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);assert.throws(()=>f.experiment.render(f.scene,f.camera),/test stage failure/);
 assert.equal(f.sceneMatrixUpdates,1);assert.equal(f.scene.matrixWorldAutoUpdate,true);
 assert.equal(f.scene.background,background);assert.equal(f.renderer.getRenderTarget(),null);assert.equal(f.renderer.autoClear,true);assert.equal(f.renderer.toneMapping,AgXToneMapping);assert.equal(f.renderer.info.autoReset,true);assert.equal(f.renderer.shadowMap.autoUpdate,true);
 assert.deepEqual(f.scene.children.map(object=>(object as Mesh).material),[f.opaque,f.glass,f.transparent]);
 assert.ok([f.opaque,f.glass,f.transparent].every(material=>material.visible));
 f.experiment.dispose();
});

test('physical display output converts before fog and retains independent HDR chunks',async()=>{
 const source=ShaderLib.physical.fragmentShader,result=roomOutputFragment(source,true);
 const capture=result.indexOf('birthdayDisplayColor = gl_FragColor;'),tone=result.indexOf('birthdayDisplayColor.rgb = AgXToneMapping'),transfer=result.indexOf('birthdayDisplayColor = sRGBTransferOETF'),fog=result.indexOf('mix( birthdayDisplayColor.rgb, birthdayDisplayFogColor'),premultiply=result.indexOf('birthdayDisplayColor.rgb *= birthdayDisplayColor.a'),dither=result.indexOf('birthdayDisplayColor.rgb = dithering');
 assert.ok(capture<tone&&tone<transfer&&transfer<fog&&fog<premultiply&&premultiply<dither);
 for(const chunk of['tonemapping_fragment','colorspace_fragment','fog_fragment','premultiplied_alpha_fragment','dithering_fragment'])assert.ok(result.includes(`#include <${chunk}>`));
 assert.ok(result.includes('birthdayDisplayFogFactor'));assert.ok(result.includes('#ifndef TONE_MAPPING'));
});

test('smoke-like toneMapped false shader converts without tone mapping',async()=>{
 const source='void main(){gl_FragColor=vec4(.7,.72,.74,.4);\n#include <colorspace_fragment>\n}';
 const result=roomOutputFragment(source,false);
 assert.ok(result.includes('birthdayDisplayColor = gl_FragColor;'));
 assert.ok(result.includes('birthdayDisplayColor = sRGBTransferOETF'));
 assert.equal(result.includes('birthdayDisplayColor.rgb = AgXToneMapping'),false);
 assert.throws(()=>roomOutputFragment('void main(){gl_FragColor=vec4(1.);}',false),/standard color-space stage/);
});

test('disposing restores original material compile hooks and keys',async()=>{
 const f=fixture(),compile=f.opaque.onBeforeCompile,key=f.opaque.customProgramCacheKey;
 f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);f.experiment.render(f.scene,f.camera);
 assert.notEqual(f.opaque.onBeforeCompile,compile);
 f.experiment.dispose();
 assert.equal(f.opaque.onBeforeCompile,compile);assert.equal(f.opaque.customProgramCacheKey,key);
});

test('warmup serializes native and HDR variants and restores state before yielding',async()=>{
 const f=fixture(),stages:unknown[]=[],releases:Array<()=>void>=[];
 f.experiment.prepare(f.scene);
 f.renderer.compileAsync=()=>{stages.push(f.renderer.getRenderTarget());return new Promise<void>(resolve=>releases.push(resolve))};
 const warming=f.experiment.warmup(f.scene,f.camera,f.scene);
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.deepEqual(stages,[null]);assert.equal(f.renderer.getRenderTarget(),null);
 releases.shift()!();await new Promise<void>(resolve=>setImmediate(resolve));
 assert.deepEqual(stages,[null,null]);assert.equal(f.renderer.getRenderTarget(),null);
 releases.shift()!();await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(stages.length,3);
 while(releases.length){releases.shift()!();await new Promise<void>(resolve=>setImmediate(resolve))}
 await warming;
 assert.equal(stages.length,9);assert.equal(f.experiment.render(f.scene,f.camera),true);f.experiment.dispose();
});

test('owned program resources survive cancellation until pending warmup settles',async()=>{
 const f=fixture();f.experiment.prepare(f.scene);
 let release!:()=>void,disposed=0;
 f.experiment.displayMaterial.addEventListener('dispose',()=>disposed++);
 f.renderer.compileAsync=()=>new Promise<void>(resolve=>{release=resolve});
 const warming=f.experiment.warmup(f.scene,f.camera,f.scene);
 await new Promise<void>(resolve=>setImmediate(resolve));
 f.experiment.dispose();assert.equal(disposed,0);
 release();await warming;assert.equal(disposed,1);
});

test('null background and incomplete MRT keep the native renderer',async()=>{
 const f=fixture();f.experiment.prepare(f.scene);await f.experiment.warmup(f.scene,f.camera,f.scene);
 f.scene.background=null;assert.equal(f.experiment.render(f.scene,f.camera),false);assert.equal(f.experiment.lastFallback,'non-color background');f.experiment.dispose();
 const broken=fixture();broken.gl.checkFramebufferStatus=()=>0;
 broken.experiment.prepare(broken.scene);await broken.experiment.warmup(broken.scene,broken.camera,broken.scene);
 assert.equal(broken.experiment.render(broken.scene,broken.camera),false);assert.equal(broken.experiment.lastFallback,'incomplete shared framebuffer');broken.experiment.dispose();
});

test('cleanup never overwrites a newer material owner',async()=>{
 const f=fixture();f.experiment.prepare(f.scene);
 const newer:typeof f.opaque.onBeforeCompile=()=>{};f.opaque.onBeforeCompile=newer;
 f.experiment.dispose();assert.equal(f.opaque.onBeforeCompile,newer);
});

test('native fallback still warms every leaf and both canvas/HDR output variants',async()=>{
 const f=fixture(0),targets:unknown[]=[],names:string[]=[];
 f.renderer.compileAsync=async(root)=>{targets.push(f.renderer.getRenderTarget());names.push(((root as Mesh).material as MeshBasicMaterial).name)};
 f.experiment.prepare(f.scene);assert.equal(f.experiment.patched.size,0);
 await f.experiment.warmup(f.scene,f.camera,f.scene);
 assert.deepEqual(names,['opaque','glass','transparent','opaque','glass','transparent']);
 assert.ok(targets.slice(0,3).every(target=>target===null));
 const hdr=targets[3] as {width:number;height:number;textures:unknown[]};
 assert.equal(hdr.width,1);assert.equal(hdr.height,1);assert.equal(hdr.textures.length,1);
 assert.equal(f.experiment.render(f.scene,f.camera),false);assert.equal(f.experiment.lastFallback,'different drawing-buffer sample count');f.experiment.dispose();
});
