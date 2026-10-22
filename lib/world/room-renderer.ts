import {
 Camera, ColorManagement, FrontSide, Frustum, HalfFloatType, Material, Matrix4,
 Mesh, MeshPhysicalMaterial, NoBlending, NoToneMapping, Scene,
 UnsignedByteType, Vector2, Vector4, WebGLRenderer, WebGLRenderTarget,
 LinearFilter, LinearMipmapLinearFilter, type ColorSpace, AgXToneMapping, SRGBColorSpace,
 NoColorSpace, NearestFilter, ShaderChunk, RawShaderMaterial, GLSL3, Vector4 as Vec4, Color,
 Object3D, MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial, PlaneGeometry, DoubleSide, BackSide,
} from 'three';

const toneAnchor='#include <tonemapping_fragment>',colorAnchor='#include <colorspace_fragment>';
/** Keep linear output untouched; construct the original display stages separately. */
export function roomOutputFragment(fragment:string,toneMapped:boolean){
 if(!fragment.includes(colorAnchor))throw Error('Dual-output shader needs the standard color-space stage');
 const capture=fragment.includes(toneAnchor)?toneAnchor:colorAnchor;
 let next=`layout(location = 1) out highp vec4 birthdayDisplayColor;
uniform vec3 birthdayDisplayFogColor;
#ifndef TONE_MAPPING
${ShaderChunk.tonemapping_pars_fragment}
#endif
${fragment}`;
 next=next.replace(capture,`birthdayDisplayColor = gl_FragColor;
${toneMapped&&fragment.includes(toneAnchor)?'birthdayDisplayColor.rgb = AgXToneMapping(birthdayDisplayColor.rgb);':''}
${capture}`);
 next=next.replace(colorAnchor,`${colorAnchor}\nbirthdayDisplayColor = sRGBTransferOETF(birthdayDisplayColor);`);
 for(const chunk of['fog_fragment','premultiplied_alpha_fragment','dithering_fragment']as const){
  const anchor=`#include <${chunk}>`;
  const display=ShaderChunk[chunk].replaceAll('gl_FragColor','birthdayDisplayColor').replaceAll('fogColor','birthdayDisplayFogColor').replaceAll('fogFactor','birthdayDisplayFogFactor');
  next=next.replace(anchor,`${anchor}\n${display}`);
 }
 return next;
}

const quadVertex='precision highp float; in vec3 position; void main(){gl_Position=vec4(position.xy,0.0,1.0);}';

type GlassBinding={material:MeshPhysicalMaterial;transmission:{value:number};thickness:{value:number};attenuationDistance:{value:number};attenuationColor:{value:MeshPhysicalMaterial['attenuationColor']}};
type Drawable=Mesh & {material:Material|Material[]};

/** Share opaque shading between physical glass and the original display output. */
export class RoomRenderer{
 readonly renderer:WebGLRenderer;
 readonly hdr:WebGLRenderTarget;
 readonly snapshot:WebGLRenderTarget;
 readonly backgroundLinear={value:new Vec4()};
 readonly backgroundDisplay={value:new Vec4()};
 readonly displayFog={value:new Color()};
 readonly backgroundMaterial=new RawShaderMaterial({glslVersion:GLSL3,depthTest:false,depthWrite:false,uniforms:{linearBackground:this.backgroundLinear,displayBackground:this.backgroundDisplay},vertexShader:quadVertex,fragmentShader:'precision highp float; uniform vec4 linearBackground; uniform vec4 displayBackground; layout(location=0) out vec4 linearColor; layout(location=1) out vec4 displayColor; void main(){linearColor=linearBackground;displayColor=displayBackground;}'});
 readonly screenGeometry=new PlaneGeometry(2,2);
 readonly screenCamera=new Camera();
 readonly screenScene=new Scene();
 readonly screenMesh=new Mesh(this.screenGeometry,this.backgroundMaterial);
 readonly displayMaterial:RawShaderMaterial;
 readonly patched=new Map<Material,{compile:Material['onBeforeCompile'];key:Material['customProgramCacheKey'];wrappedCompile:Material['onBeforeCompile'];wrappedKey:Material['customProgramCacheKey']}>();
 readonly samplerSize={value:new Vector2(1,1)};
 readonly sampler:{value:WebGLRenderTarget['texture']};
 readonly glass=new Map<MeshPhysicalMaterial,GlassBinding>();
 private size=new Vector2();
 private viewport=new Vector4();
 private projection=new Matrix4();
 private frustum=new Frustum();
 lastFallback='';
 private unavailable='';
 private disposed=false;
 private screensWarmed=false;
 private warming=0;
 private resourcesReleased=false;
 private readyMaterials=new WeakSet<Material>();
 get preparing(){return this.warming>0}

 constructor(renderer:WebGLRenderer){
  this.renderer=renderer;
  const type=renderer.extensions.has('EXT_color_buffer_half_float')||renderer.extensions.has('EXT_color_buffer_float')?HalfFloatType:UnsignedByteType;
  this.hdr=new WebGLRenderTarget(1,1,{type,count:2,samples:4,depthBuffer:true,stencilBuffer:false,generateMipmaps:false,minFilter:LinearFilter,colorSpace:ColorManagement.workingColorSpace as ColorSpace,resolveDepthBuffer:true,resolveStencilBuffer:false});
  Object.assign(this.hdr.textures[1],{type:UnsignedByteType,colorSpace:NoColorSpace,minFilter:NearestFilter,magFilter:NearestFilter,generateMipmaps:false});
  this.snapshot=new WebGLRenderTarget(1,1,{type,samples:0,depthBuffer:false,stencilBuffer:false,generateMipmaps:true,minFilter:LinearMipmapLinearFilter,colorSpace:ColorManagement.workingColorSpace as ColorSpace});
  this.sampler={value:this.snapshot.texture};
  this.displayMaterial=new RawShaderMaterial({glslVersion:GLSL3,depthTest:false,depthWrite:false,uniforms:{displayTexture:{value:this.hdr.textures[1]}},vertexShader:quadVertex,fragmentShader:'precision highp float; uniform sampler2D displayTexture; layout(location=0) out vec4 displayColor; void main(){displayColor=texelFetch(displayTexture,ivec2(gl_FragCoord.xy),0);}'});
  this.screenMesh.frustumCulled=false;this.screenScene.add(this.screenMesh);
  const gl=renderer.getContext() as WebGL2RenderingContext;
  if(renderer.capabilities.maxSamples<4||gl.getParameter(gl.MAX_DRAW_BUFFERS)<2||gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)<2)this.unavailable='insufficient framebuffer support';
  else if(renderer.extensions.has('WEBGL_multisampled_render_to_texture'))this.unavailable='implicit multisample resolve backend';
  else if(typeof navigator!=='undefined'&&/OculusBrowser/.test(navigator.userAgent))this.unavailable='multisample invalidation backend';
  else if(renderer.getRenderTarget()!==null||gl.getParameter(gl.SAMPLES)!==4)this.unavailable='different drawing-buffer sample count';
  else if(![type===HalfFloatType?gl.RGBA16F:gl.RGBA8,gl.RGBA8,gl.DEPTH_COMPONENT24].every(format=>(gl.getInternalformatParameter(gl.RENDERBUFFER,format,gl.SAMPLES) as Int32Array|null)?.includes(4)))this.unavailable='unsupported four-sample attachment format';
 }

 private patchOutput(material:Material){
  if(this.patched.has(material))return;
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey,keyValue=key.call(material),displayFog=this.displayFog;
  const owner=this;
  const wrappedCompile:Material['onBeforeCompile']=function(this:Material,shader,renderer){
   compile.call(this,shader,renderer);
   if(owner.unavailable||owner.disposed)return;
   if(!shader.fragmentShader.includes(colorAnchor)){owner.disable('unsupported material output shader');return}
   shader.fragmentShader=roomOutputFragment(shader.fragmentShader,this.toneMapped);
   shader.uniforms.birthdayDisplayFogColor=displayFog;
  };
  const wrappedKey=()=>owner.unavailable||owner.disposed?keyValue:`${keyValue}:birthday-room-output-v1`;
  this.patched.set(material,{compile,key,wrappedCompile,wrappedKey});
  material.onBeforeCompile=wrappedCompile;material.customProgramCacheKey=wrappedKey;
  material.needsUpdate=true;
 }

 private disable(reason:string){
  if(this.unavailable)return;
  this.unavailable=reason;
  for(const material of this.patched.keys())material.needsUpdate=true;
  if(!this.warming)this.releaseResources();
 }

 /** Install before depth wrappers so their shader-identity checks remain valid. */
 prepare(root:Object3D){
  if(this.unavailable||this.disposed)return;
  root.traverse(object=>{
   if(this.unavailable)return;
   const material=(object as Mesh).material;if(!material)return;
   if(object.children.length){this.disable('unsupported renderable hierarchy');return}
   for(const item of Array.isArray(material)?material:[material]){
    if(item instanceof RawShaderMaterial||!(item instanceof MeshStandardMaterial)&&!(item instanceof MeshBasicMaterial)&&!(item instanceof ShaderMaterial)||item instanceof ShaderMaterial&&!item.fragmentShader.includes(colorAnchor)){
     this.disable('unsupported material output shader');return;
    }
    this.patchOutput(item);
   }
  });
 }

 private sizeTargets(){
  const renderer=this.renderer,previous=renderer.getRenderTarget();renderer.getDrawingBufferSize(this.size);
  const resized=this.hdr.width!==this.size.x||this.hdr.height!==this.size.y;
  if(resized){this.hdr.setSize(this.size.x,this.size.y);this.snapshot.setSize(this.size.x,this.size.y)}
  this.samplerSize.value.copy(this.size);
  if(resized||!this.screensWarmed){
   try{
    renderer.setRenderTarget(this.hdr);
    const gl=renderer.getContext();
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)this.disable('incomplete shared framebuffer');
    if(!this.unavailable)renderer.initRenderTarget(this.snapshot);
   }finally{renderer.setRenderTarget(previous)}
  }
 }

 private async compileVariant(root:Object3D,camera:Camera,scene:Scene,target:WebGLRenderTarget|null,externalGlass=false,side?:typeof BackSide|typeof FrontSide,nativeOnly=false){
  const drawables:Object3D[]=[];
  root.traverse(object=>{
   const material=(object as Mesh).material;if(!material)return;
   if(externalGlass&&!(Array.isArray(material)?material:[material]).some(item=>item instanceof MeshPhysicalMaterial&&item.transmission>0))return;
   drawables.push(object);
  });
  if(!drawables.length)return;
  // Start this target/side's programs together, then wait on each exact leaf variant.
  await this.compileObject(root,camera,scene,target,externalGlass,side,nativeOnly,true);
  // A shared material can have several instancing/morph/attribute programs. Await each leaf.
  for(const object of drawables)await this.compileObject(object,camera,scene,target,externalGlass,side,nativeOnly);
 }

 private async compileObject(root:Object3D,camera:Camera,scene:Scene,target:WebGLRenderTarget|null,externalGlass=false,side?:typeof BackSide|typeof FrontSide,nativeOnly=false,startOnly=false){
  if(this.disposed||this.unavailable&&!nativeOnly)return;
  const renderer=this.renderer,previous=renderer.getRenderTarget(),toneMapping=renderer.toneMapping,originals=new Map<Mesh,Mesh['material']>(),sides=new Map<Material,{side:Material['side'];forceSinglePass:boolean}>();
  let compiled:Promise<unknown>;
  try{
   renderer.setRenderTarget(target);if(target)renderer.toneMapping=NoToneMapping;
   root.traverse(object=>{
    const drawable=object as Mesh;if(!drawable.material)return;
    originals.set(drawable,drawable.material);
    const replace=(material:Material)=>{
     if(side!==undefined&&material.transparent&&material.side===DoubleSide&&!material.forceSinglePass){sides.set(material,{side:material.side,forceSinglePass:material.forceSinglePass});material.side=side;material.forceSinglePass=true}
     return externalGlass&&material instanceof MeshPhysicalMaterial&&material.transmission>0?this.glassBinding(material).material:material;
    };
    drawable.material=Array.isArray(drawable.material)?drawable.material.map(replace):replace(drawable.material);
   });
   if(startOnly){renderer.compile(root,camera,scene);compiled=Promise.resolve()}
   else compiled=renderer.compileAsync(root,camera,scene);
  }finally{
   for(const [object,material]of originals)object.material=material;
   for(const [material,state]of sides)Object.assign(material,state);
   renderer.toneMapping=toneMapping;renderer.setRenderTarget(previous);
  }
  await compiled;
 }

 private async warmNative(root:Object3D,camera:Camera,scene:Scene){
  if(this.disposed)return;
  // Compilation needs the HDR color-space variant, not a full-size or multisample target.
  const target=new WebGLRenderTarget(1,1,{type:this.hdr.texture.type,depthBuffer:false,stencilBuffer:false,colorSpace:ColorManagement.workingColorSpace as ColorSpace});
  let twoSided=false;
  root.traverse(object=>{const material=(object as Mesh).material;if(material)for(const item of Array.isArray(material)?material:[material])if(item.transparent&&item.side===DoubleSide&&!item.forceSinglePass)twoSided=true});
  this.warming++;
  try{
   for(const output of[null,target]){
    if(twoSided){await this.compileVariant(root,camera,scene,output,false,BackSide,true);await this.compileVariant(root,camera,scene,output,false,FrontSide,true)}
    else await this.compileVariant(root,camera,scene,output,false,undefined,true);
   }
  }finally{
   target.dispose();this.warming--;if(!this.warming&&(this.disposed||this.unavailable))this.releaseResources();
  }
 }

 /** Call on the sky/effects after lights are configured, and on each asset before scene.add. */
 async warmup(root:Object3D,camera:Camera,scene:Scene){
  if(this.disposed)return;
  if(this.unavailable){await this.warmNative(root,camera,scene);return}
  this.warming++;
  try{
   this.sizeTargets();if(this.unavailable){await this.warmNative(root,camera,scene);return}
  let twoSided=false;
  root.traverse(object=>{const material=(object as Mesh).material;if(material)for(const item of Array.isArray(material)?material:[material])if(item.transparent&&item.side===DoubleSide&&!item.forceSinglePass)twoSided=true});
  try{
   // r180 waits on material.currentProgram, so finish one variant before starting another.
   for(const target of[null,this.hdr]){
    if(twoSided){await this.compileVariant(root,camera,scene,target,false,BackSide);await this.compileVariant(root,camera,scene,target,false,FrontSide)}
    else await this.compileVariant(root,camera,scene,target);
   }
   await this.compileVariant(root,camera,scene,this.hdr,true);
   if(!this.screensWarmed&&!this.disposed&&!this.unavailable){
    try{
     this.screenMesh.material=this.backgroundMaterial;await this.compileVariant(this.screenScene,this.screenCamera,this.screenScene,this.hdr);
     this.screenMesh.material=this.displayMaterial;await this.compileVariant(this.screenScene,this.screenCamera,this.screenScene,null);
    }finally{this.screenMesh.material=this.backgroundMaterial}
    if(!this.disposed&&!this.unavailable)this.screensWarmed=true;
   }
   if(!this.disposed&&!this.unavailable)root.traverse(object=>{const material=(object as Mesh).material;if(material)for(const item of Array.isArray(material)?material:[material])this.readyMaterials.add(item)});
  }catch{this.disable('shared shader preparation failed');await this.warmNative(root,camera,scene)}
  }finally{this.warming--;if(!this.warming&&(this.disposed||this.unavailable))this.releaseResources()}
 }

 private fallback(scene:Scene,camera:Camera,reason:string){
  this.lastFallback=reason;
  this.renderer.render(scene,camera);
  return false;
 }

 private glassBinding(source:MeshPhysicalMaterial){
  let binding=this.glass.get(source);
  if(!binding){
   const material=source.clone() as MeshPhysicalMaterial&{defines:Record<string,string>};
   // Renderer classification is separate from the physical shader's transmission.
   material.transmission=0;material.transparent=true;material.blending=NoBlending;material.forceSinglePass=true;
   material.defines={...material.defines,USE_TRANSMISSION:''};
   const previousCompile=source.onBeforeCompile,previousKey=source.customProgramCacheKey();
   binding={material,transmission:{value:source.transmission},thickness:{value:source.thickness},attenuationDistance:{value:source.attenuationDistance},attenuationColor:{value:source.attenuationColor}};
   const own=binding;
   material.onBeforeCompile=function(shader,renderer){
    previousCompile.call(this,shader,renderer);
    Object.assign(shader.uniforms,{
     transmission:own.transmission,thickness:own.thickness,attenuationDistance:own.attenuationDistance,attenuationColor:own.attenuationColor,
     transmissionSamplerMap:thisExperiment.sampler,transmissionSamplerSize:thisExperiment.samplerSize,
    });
   };
   const thisExperiment=this;
   material.customProgramCacheKey=()=>`${previousKey}:birthday-room-glass-v1`;
   this.glass.set(source,binding);
  }
  binding.material.visible=source.visible;
  binding.transmission.value=source.transmission;
  binding.thickness.value=source.thickness;
  binding.attenuationDistance.value=source.attenuationDistance;
  binding.attenuationColor.value=source.attenuationColor;
  return binding;
 }

 /** Returns false when a conservative native-renderer fallback was used. */
 render(scene:Scene,camera:Camera){
  const renderer=this.renderer;
  if(this.unavailable||this.disposed)return this.fallback(scene,camera,this.unavailable||'disposed');
  if(renderer.toneMapping!==AgXToneMapping||renderer.outputColorSpace!==SRGBColorSpace)return this.fallback(scene,camera,'unsupported display conversion');
  if(!scene.background||!((scene.background as Color).isColor))return this.fallback(scene,camera,'non-color background');
  if(renderer.getRenderTarget()!==null)return this.fallback(scene,camera,'non-canvas target');
  if(scene.overrideMaterial)return this.fallback(scene,camera,'scene override');
  if(renderer.xr.isPresenting||(camera as Camera&{isArrayCamera?:boolean;viewport?:unknown}).isArrayCamera||(camera as Camera&{viewport?:unknown}).viewport)return this.fallback(scene,camera,'nonstandard camera');
  if(renderer.getScissorTest())return this.fallback(scene,camera,'scissor');
  const viewport=renderer.getViewport(this.viewport);
  renderer.getSize(this.size);
  if(viewport.x!==0||viewport.y!==0||viewport.z!==this.size.x||viewport.w!==this.size.y)return this.fallback(scene,camera,'partial viewport');

  scene.updateMatrixWorld();if(camera.parent===null)camera.updateMatrixWorld();
  this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);
  const drawables:Drawable[]=[],sources=new Map<Material,boolean>();
  let dirtyShadow=renderer.shadowMap.needsUpdate,unsupported='',visibleGlass=false;
  scene.traverseVisible(object=>{
   const shadowObject=object as typeof object&{isLight?:boolean;castShadow?:boolean;shadow?:{autoUpdate:boolean;needsUpdate:boolean}};
   if(shadowObject.isLight&&shadowObject.castShadow&&shadowObject.shadow&&(shadowObject.shadow.autoUpdate||shadowObject.shadow.needsUpdate))dirtyShadow=true;
   const drawable=object as Drawable;
   if(!drawable.material)return;
   drawables.push(drawable);
   for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material]){
    sources.set(material,material.visible);
    if(!(material as MeshPhysicalMaterial).transmission||!material.visible)continue;
    if(!(material instanceof MeshPhysicalMaterial)||material.transmissionMap||material.thicknessMap||material.side!==FrontSide||material.transparent||material.opacity!==1||material.dispersion!==0)unsupported='unsupported transmissive material';
    else if(!drawable.frustumCulled||this.frustum.intersectsObject(drawable))visibleGlass=true;
   }
  });
  if(dirtyShadow&&renderer.shadowMap.enabled)return this.fallback(scene,camera,'shadow refresh');
  if(unsupported)return this.fallback(scene,camera,unsupported);
  if(!visibleGlass)return this.fallback(scene,camera,'no visible glass');

  for(const material of sources.keys()){
   if(!this.patched.has(material))return this.fallback(scene,camera,'material not prepared');
   if(!this.readyMaterials.has(material))return this.fallback(scene,camera,'room shaders preparing');
  }
  if(scene.fog)scene.fog.color.getRGB(this.displayFog.value,SRGBColorSpace);

  this.sizeTargets();if(this.unavailable)return this.fallback(scene,camera,this.unavailable);
  const originals=new Map(drawables.map(object=>[object,object.material]));
  const old={background:scene.background,matrixWorldAutoUpdate:scene.matrixWorldAutoUpdate,toneMapping:renderer.toneMapping,autoClear:renderer.autoClear,autoReset:renderer.info.autoReset,shadowAutoUpdate:renderer.shadowMap.autoUpdate};
  try{
   // All shared passes use the matrices updated above, including moving actors.
   scene.matrixWorldAutoUpdate=false;
   renderer.info.autoReset=false;if(old.autoReset)renderer.info.reset();
   renderer.shadowMap.autoUpdate=false;
   renderer.toneMapping=NoToneMapping;renderer.autoClear=true;
   const background=scene.background as Color|null,linearColor=background??renderer.getClearColor(new Color()),alpha=background?1:renderer.getClearAlpha();
   this.backgroundLinear.value.set(linearColor.r,linearColor.g,linearColor.b,alpha);
   const displayColor=linearColor.clone();linearColor.getRGB(displayColor,SRGBColorSpace);
   this.backgroundDisplay.value.set(displayColor.r,displayColor.g,displayColor.b,alpha);
   scene.background=null;
   renderer.setRenderTarget(this.hdr);this.screenMesh.material=this.backgroundMaterial;renderer.render(this.screenScene,this.screenCamera);
   renderer.autoClear=false;
   for(const [material,visible]of sources)material.visible=visible&&!material.transparent&&!((material as MeshPhysicalMaterial).transmission>0);
   renderer.setRenderTarget(this.hdr);renderer.render(scene,camera);

   // render() has resolved the color. Public copying generates destination mipmaps.
   renderer.initRenderTarget(this.snapshot);
   renderer.copyTextureToTexture(this.hdr.texture,this.snapshot.texture);

   // A Color background forces a clear even when autoClear is false.
   scene.background=null;renderer.autoClear=false;
   for(const material of sources.keys())material.visible=false;
   for(const [object,original]of originals){
    const replace=(material:Material)=>{
     if(material instanceof MeshPhysicalMaterial&&material.transmission>0){
      material.visible=sources.get(material)??false;
      const replacement=this.glassBinding(material).material;
      material.visible=false;return replacement;
     }
     return material;
    };
    object.material=Array.isArray(original)?original.map(replace):replace(original);
   }
   renderer.setRenderTarget(this.hdr);renderer.render(scene,camera);

   // Keep the original transmissive-before-transparent sequence and sorting.
   for(const [object,material]of originals)object.material=material;
   for(const [material,visible]of sources)material.visible=visible&&material.transparent&&!((material as MeshPhysicalMaterial).transmission>0);
   renderer.setRenderTarget(this.hdr);renderer.render(scene,camera);

   renderer.toneMapping=old.toneMapping;
   renderer.setRenderTarget(null);renderer.autoClear=true;
   this.screenMesh.material=this.displayMaterial;renderer.render(this.screenScene,this.screenCamera);
   this.lastFallback='';return true;
  }finally{
   for(const [object,material]of originals)object.material=material;
   for(const [material,visible]of sources)material.visible=visible;
   scene.background=old.background;scene.matrixWorldAutoUpdate=old.matrixWorldAutoUpdate;renderer.toneMapping=old.toneMapping;renderer.autoClear=old.autoClear;
   renderer.info.autoReset=old.autoReset;renderer.shadowMap.autoUpdate=old.shadowAutoUpdate;renderer.setRenderTarget(null);
   this.screenMesh.material=this.backgroundMaterial;
  }
 }

 private releaseResources(){
  if(this.resourcesReleased)return;this.resourcesReleased=true;
  this.hdr.dispose();this.snapshot.dispose();this.backgroundMaterial.dispose();this.displayMaterial.dispose();this.screenGeometry.dispose();
  for(const {material}of this.glass.values())material.dispose();this.glass.clear();
 }

 dispose(){
  if(this.disposed)return;this.disposed=true;
  if(!this.warming)this.releaseResources();
  // Depth wrappers must be disposed first; never overwrite a newer owner's hook.
  for(const [material,{compile,key,wrappedCompile,wrappedKey}]of this.patched){
   if(material.onBeforeCompile===wrappedCompile&&material.customProgramCacheKey===wrappedKey){material.onBeforeCompile=compile;material.customProgramCacheKey=key;material.needsUpdate=true}
  }
  this.patched.clear();
 }
}
