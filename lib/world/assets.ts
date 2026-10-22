import { Group,Mesh,MeshStandardMaterial,SRGBColorSpace,TextureLoader,CanvasTexture,Float32BufferAttribute,Texture,Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {photoForSlot,type PersonalContent,type Photo} from './content.ts';
import {worldUrl} from './revision.ts';
import type {TexturePool} from './texture-pool';
export type AssetName='bedroom'|'garden'|'door'|'salon'|'cake'|'flames'|'exit-door'|'courtyard'|'gift'|'ending';
export const ASSET_NAMES:AssetName[]=['bedroom','garden','door','salon','cake','flames','exit-door','courtyard','gift','ending'];
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const decoderStatus={workers:0};
let decoderSetup:Promise<void>|undefined;
function prepareDecoder(){
 if(decoderSetup)return decoderSetup;
 decoderSetup=(async()=>{
  await MeshoptDecoder.ready;
  if(typeof Worker==='undefined')return;
  // Some embedded browsers block blob workers. Probe first and keep the
  // original decoder as a functional fallback, with identical geometry.
  const usable=await new Promise<boolean>(resolve=>{
   let worker:Worker|undefined,url='',timer:ReturnType<typeof setTimeout>|undefined,finished=false;
   const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);resolve(ok)};
   try{url=URL.createObjectURL(new Blob(['postMessage("ready")'],{type:'text/javascript'}));worker=new Worker(url);worker.onmessage=()=>finish(true);worker.onerror=e=>{e.preventDefault();finish(false)};timer=setTimeout(()=>finish(false),1000)}catch{finish(false)}
  });
  if(usable){try{decoderStatus.workers=Math.min(2,Math.max(1,(navigator.hardwareConcurrency||2)-1));MeshoptDecoder.useWorkers(decoderStatus.workers)}catch{decoderStatus.workers=0;MeshoptDecoder.useWorkers(0)}}
 })();return decoderSetup;
}
export async function downloadAsset(name:AssetName,signal?:AbortSignal,onBytes?:(received:number,total:number|null)=>void){
 const r=await fetch(worldUrl(`${name}.glb`),{signal,priority:name==='bedroom'?'high':'low'});if(!r.ok)throw Error(`The ${name} set could not download (${r.status}).`);
 const length=r.headers.get('content-encoding')?null:Number(r.headers.get('content-length'))||null;if(!r.body)return r.arrayBuffer();const reader=r.body.getReader(),parts:Uint8Array[]=[];let n=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;parts.push(value);n+=value.length;onBytes?.(n,length)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(n);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}return bytes.buffer;
}
export async function loadAsset(name:AssetName,bytes?:Promise<ArrayBuffer>,pool?:TexturePool):Promise<Group>{
 await prepareDecoder();const gltf=bytes?await loader.parseAsync(await bytes,'/world/'):await loader.loadAsync(worldUrl(`${name}.glb`));const group=gltf.scene;group.animations=gltf.animations;if(pool){try{await pool.share(group,gltf.parser)}catch(e){disposeGroup(group);throw e}}
 group.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;
  // GLTFLoader expands a multi-material glTF node into a Group of meshes.
  // The export extras stay on that parent, so retain them on each primitive.
  for(const key of ['p2_indirect','content_slot'])if(!o.userData[key]){
   for(let parent=o.parent;parent&&parent!==group;parent=parent.parent)if(parent.userData[key]){o.userData[key]=parent.userData[key];break}
  }
  for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat instanceof MeshStandardMaterial){
   if(mat.map)mat.map.anisotropy=4;
   if(mat.transparent&&mat.opacity<.2||/flame/i.test(mat.name))o.castShadow=false;
   // The final assets already encode sidedness, roughness, metal, normal and
   // transmission intent. Do not reapply the old global glass/bump overrides.
  }
 }});return group;
}
export function findSource(group:Group,part:string){let found:Mesh|undefined;group.traverse(o=>{if(o instanceof Mesh&&String(o.userData.source_name||o.name).includes(part))found=o});return found}
export function sourceName(o:{name:string;userData:Record<string,any>}){return String(o.userData.source_name||o.name).replaceAll('_',' ')}
export function projectSurfaceUV(mesh:Mesh,uAxis:0|1|2,vAxis:0|1|2,flipV=false){
 const g=mesh.geometry.clone();g.computeBoundingBox();const b=g.boundingBox!,p=g.getAttribute('position'),lo=b.min.toArray(),hi=b.max.toArray(),uv:number[]=[];
 for(let i=0;i<p.count;i++){const a=[p.getX(i),p.getY(i),p.getZ(i)];const u=(a[uAxis]-lo[uAxis])/Math.max(1e-8,hi[uAxis]-lo[uAxis]),v=(a[vAxis]-lo[vAxis])/Math.max(1e-8,hi[vAxis]-lo[vAxis]);uv.push(u,flipV?1-v:v)}
 g.setAttribute('uv',new Float32BufferAttribute(uv,2));mesh.userData.retiredGeometries??=[];mesh.userData.retiredGeometries.push(mesh.geometry);mesh.geometry=g;
}
function surfaceAspect(mesh:Mesh){
 const g=mesh.geometry,uv=g.getAttribute('uv'),p=g.getAttribute('position');if(!uv)return 1;
 for(let i=0;i<Math.min(p.count-2,80);i+=3){const ids=[0,1,2].map(k=>g.index?g.index.getX(i+k):i+k);const [a,b,c]=ids,du1=uv.getX(b)-uv.getX(a),dv1=uv.getY(b)-uv.getY(a),du2=uv.getX(c)-uv.getX(a),dv2=uv.getY(c)-uv.getY(a),det=du1*dv2-du2*dv1;
  if(Math.abs(det)<1e-8)continue;const A=new Vector3().fromBufferAttribute(p,a),B=new Vector3().fromBufferAttribute(p,b).sub(A),C=new Vector3().fromBufferAttribute(p,c).sub(A),u=B.clone().multiplyScalar(dv2).addScaledVector(C,-dv1).divideScalar(det),v=C.clone().multiplyScalar(du1).addScaledVector(B,-du2).divideScalar(det);return u.length()/v.length();
 }return 1;
}
async function photograph(photo:Photo,aspect:number){
 const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Photo unavailable'));im.src=photo.image});
 const canvas=document.createElement('canvas');canvas.width=aspect>=1?1536:Math.round(1536*aspect);canvas.height=aspect>=1?Math.round(1536/aspect):1536;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f5eee4';ctx.fillRect(0,0,canvas.width,canvas.height);
 const crop=photo.crop??[0,0,1,1],sx=crop[0]*image.width,sy=crop[1]*image.height,sw=crop[2]*image.width,sh=crop[3]*image.height,scale=Math.min(canvas.width/sw,canvas.height/sh),w=sw*scale,h=sh*scale;
 ctx.drawImage(image,sx,sy,sw,sh,(canvas.width-w)/2,(canvas.height-h)/2,w,h);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;return texture;
}
export async function applyPhotos(group:Group,content:PersonalContent){
 const meshes:Mesh[]=[];group.traverse(o=>{if(o instanceof Mesh&&photoForSlot(content,o.userData.content_slot||''))meshes.push(o)});const warnings:string[]=[];
 for(const mesh of meshes){const photo=photoForSlot(content,mesh.userData.content_slot)!;let map:Texture;
  try{map=await photograph(photo,surfaceAspect(mesh))}catch{if(!photo.fallback||photo.fallback===photo.image){warnings.push(mesh.userData.content_slot);continue}try{map=await photograph({...photo,image:photo.fallback,crop:undefined},surfaceAspect(mesh))}catch{warnings.push(mesh.userData.content_slot);continue}}
  const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];group.userData.retiredMaterials??=[];group.userData.retiredMaterials.push(...originals);
  const replacements=originals.map(material=>{const next=material.clone();if(next instanceof MeshStandardMaterial){next.map=map;next.color.set(0xffffff);next.needsUpdate=true}return next});mesh.material=Array.isArray(mesh.material)?replacements:replacements[0];
 }
 group.userData.photoWarnings=warnings;return warnings;
}
export function applyGiftTag(group:Group,text:string){
 group.traverse(o=>{if(!(o instanceof Mesh)||o.userData.content_slot!=='gift.tag')return;
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const c=canvas.getContext('2d')!;
  c.fillStyle='#f1e6d8';c.fillRect(0,0,768,512);c.strokeStyle='#b3916b';c.lineWidth=2;c.strokeRect(30,30,708,452);c.fillStyle='#685047';c.font='italic 52px Georgia';c.textAlign='center';c.textBaseline='middle';
  const words=text.split(/\s+/),lines:string[]=[];let line='';for(const word of words){const next=line?`${line} ${word}`:word;if(c.measureText(next).width>650&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);const height=Math.min(74,330/Math.max(1,lines.length));lines.forEach((l,i)=>c.fillText(l,384,256+(i-(lines.length-1)/2)*height,650));
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.flipY=false;const originals=Array.isArray(o.material)?o.material:[o.material];group.userData.retiredMaterials??=[];group.userData.retiredMaterials.push(...originals);const replacements=originals.map(m=>{const copy=m.clone();if(copy instanceof MeshStandardMaterial){copy.map=texture;copy.color.set(0xffffff)}return copy});o.material=Array.isArray(o.material)?replacements:replacements[0];
 });
}
export function applyIndirectMap(group:Group,key:string,map:Texture){
 const copies=new Map<MeshStandardMaterial,MeshStandardMaterial>();let receivers=0;
 group.traverse(o=>{if(!(o instanceof Mesh)||o.userData.p2_indirect!==key)return;
  if(!o.geometry.getAttribute('uv1'))throw Error(`Missing indirect-light UVs: ${key}`);receivers++;
  const originals=Array.isArray(o.material)?o.material:[o.material];
  const materials=originals.map(m=>{if(!(m instanceof MeshStandardMaterial))return m;let copy=copies.get(m);if(!copy){copy=m.clone();copy.lightMap=map;copy.lightMapIntensity=1;copies.set(m,copy)}return copy});
  group.userData.retiredMaterials??=[];group.userData.retiredMaterials.push(...originals);o.material=Array.isArray(o.material)?materials:materials[0];
 });
 if(!receivers)throw Error(`No indirect-light receivers found: ${key}`);return receivers;
}
export function disposeGroup(group:Group){
 const geometries=new Set<any>(),materials=new Set<any>(),textures=new Set<Texture>(),images=new Set<any>();
 group.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const g of o.userData.retiredGeometries??[])geometries.add(g);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});for(const m of group.userData.retiredMaterials??[])materials.add(m);
 for(const m of materials){for(const v of Object.values(m))if(v instanceof Texture)textures.add(v);m.dispose()}
 for(const t of textures){images.add(t.source.data);t.dispose()}const managed=(group.userData.texturePool as TexturePool|undefined)?.release(group)??new Set();for(const i of images)if(!managed.has(i)&&typeof i?.close==='function')i.close();for(const g of geometries)g.dispose();
}
