import {Group,LessEqualDepth,Material,Mesh,MeshDepthMaterial,MeshStandardMaterial,NormalBlending,Object3D,SkinnedMesh,type Camera,type Scene,type WebGLRenderer} from 'three';

const stockVertexKey=Material.prototype.onBeforeCompile.toString();
const invariantSuffix=':birthday-depth-prepass-v1';
const knownVertexKeys=new Set([stockVertexKey,`${stockVertexKey}:birthday-light-guard-v2`,`${stockVertexKey}:birthday-light-guard-shared-area-v1`].flatMap(key=>[key,key+':birthday-room-output-v1']).flatMap(key=>[key,key+invariantSuffix]));

// Unknown shaders and coverage rules keep the ordinary render path.
export function canPrepass(material:Material,object:Object3D){
 return object instanceof Mesh&&!(object instanceof SkinnedMesh)&&!('isBatchedMesh' in object)
  &&!object.customDepthMaterial&&!object.customDistanceMaterial
  &&object.onBeforeRender===Object3D.prototype.onBeforeRender
  &&material instanceof MeshStandardMaterial&&material.visible&&!material.transparent
  &&!('transmission' in material&&Number(material.transmission)>0)
  &&material.opacity===1&&material.alphaTest===0&&!material.alphaHash&&!material.alphaToCoverage&&!material.alphaMap
  &&!material.displacementMap&&!material.wireframe&&!material.polygonOffset&&!material.stencilWrite
  &&!material.clippingPlanes?.length&&material.depthTest&&material.depthWrite&&material.colorWrite
  &&material.depthFunc===LessEqualDepth&&material.blending===NormalBlending
  &&knownVertexKeys.has(material.customProgramCacheKey());
}

/** Skip hidden cake fragments before their more expensive physical shading. */
export function installRoomDepthPrepass(root:Group){
 const objects=new WeakSet<Mesh>(),materials=new Set<MeshStandardMaterial>();
 root.traverse(object=>{
  if(!(object instanceof Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!canPrepass(material,object))continue;
   objects.add(object);materials.add(material as MeshStandardMaterial);
  }
 });
 const cleanup:Array<()=>void>=[],depthMaterials=new Map<Material,MeshDepthMaterial>();
 let disposed=false,warming=0;
 for(const material of materials){
  const previous=material.onBeforeRender,previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey,baseKey=previousKey.call(material),side=material.side;
  const depth=new MeshDepthMaterial({side,colorWrite:false,depthTest:true,depthWrite:true,depthFunc:LessEqualDepth});
  depthMaterials.set(material,depth);
  const compile:typeof material.onBeforeCompile=function(this:MeshStandardMaterial,shader,renderer){
   previousCompile.call(this,shader,renderer);
   shader.vertexShader='invariant gl_Position;\n'+shader.vertexShader;
  };
  const key=()=>baseKey+invariantSuffix;
  material.onBeforeCompile=compile;material.customProgramCacheKey=key;material.needsUpdate=true;
  depth.onBeforeCompile=shader=>{shader.vertexShader='invariant gl_Position;\n'+shader.vertexShader};
  depth.customProgramCacheKey=()=>'birthday-depth-only-invariant-v1';
  const before:typeof material.onBeforeRender=function(this:MeshStandardMaterial,renderer,scene,camera,geometry,object,group){
   previous.call(this,renderer,scene,camera,geometry,object,group);
   if(!objects.has(object as Mesh)||!canPrepass(this,object)||this.side!==side
    ||this.onBeforeCompile!==compile||this.customProgramCacheKey!==key
    ||renderer.clippingPlanes.length||scene.overrideMaterial)return;
   // Three calls this after updating the object's matrices, in each opaque render target.
   // renderBufferDirect does not invoke object/material render callbacks recursively.
   renderer.renderBufferDirect(camera,scene,geometry,depth,object,group);
  };
  material.onBeforeRender=before;
  cleanup.push(()=>{
   if(material.onBeforeRender===before)material.onBeforeRender=previous;
   if(material.onBeforeCompile===compile)material.onBeforeCompile=previousCompile;
   if(material.customProgramCacheKey===key)material.customProgramCacheKey=previousKey;
   material.needsUpdate=true;
  });
 }
 const disposeDepth=()=>depthMaterials.forEach(material=>material.dispose());
 const dispose=()=>{if(disposed)return;disposed=true;for(const restore of cleanup)restore();if(!warming)disposeDepth()};
 const compileAsync=async(renderer:WebGLRenderer,camera:Camera,scene:Scene)=>{
  if(disposed)return;
  const originals=new Map<Mesh,Material|Material[]>();warming++;
  try{
   let compiled:Promise<unknown>;
   try{
    root.traverse(object=>{
     if(!(object instanceof Mesh)||!objects.has(object))return;
     originals.set(object,object.material);
     object.material=Array.isArray(object.material)?object.material.map(material=>depthMaterials.get(material)??material):depthMaterials.get(object.material)??object.material;
    });
    // r180 starts compilation synchronously; restore the live asset before yielding to a frame.
    compiled=renderer.compileAsync(root,camera,scene);
   }finally{for(const [object,material] of originals)object.material=material}
   await compiled;
  }finally{warming--;if(disposed&&!warming)disposeDepth()}
 };
 return Object.assign(dispose,{compileAsync});
}
