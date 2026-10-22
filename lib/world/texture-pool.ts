import {Group,Mesh,Texture} from 'three';
import type {GLTFParser} from 'three/examples/jsm/loaders/GLTFLoader.js';
type Entry={source:Texture['source'];references:number;bytes:number;fingerprint?:Uint8Array};
/** Share byte-identical embedded images across staged GLBs. Samplers, colour
 * spaces, UV transforms and material roles remain on each original Texture. */
export class TexturePool {
 private entries=new Map<string,Entry>();private groups=new Map<Group,Map<Texture,string>>();private saved=0;
 async share(group:Group,parser:GLTFParser){
  const textures=new Set<Texture>(),owned=new Map<Texture,string>(),hashes=new Map<number,Promise<{hash:string;fingerprint?:Uint8Array}>>(),replaced=new Set<ImageBitmap>();
  this.groups.set(group,owned);group.userData.texturePool=this;
  group.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof Texture)textures.add(v)});
  for(const texture of textures){
   const index=parser.associations.get(texture)?.textures;if(index===undefined)continue;
   const definition=parser.json.textures[index],source=definition.extensions?.EXT_texture_webp?.source??definition.source,image=parser.json.images[source];if(!image||image.bufferView===undefined)continue;
   if(!hashes.has(source))hashes.set(source,(async()=>{const data=await parser.getDependency('bufferView',image.bufferView) as ArrayBuffer;
    if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',data);return {hash:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')}}
    // The HTTP review preview has no SubtleCrypto. A fast bucket hash plus
    // complete byte comparison keeps reuse exact in that environment too.
    const bytes=new Uint8Array(data);let hash=2166136261;for(const byte of bytes)hash=Math.imul(hash^byte,16777619);return {hash:`bytes-${hash>>>0}-${bytes.length}`,fingerprint:bytes};
   })());
   const result=await hashes.get(source)!;let hash=result.hash,entry=this.entries.get(hash);
   while(entry&&result.fingerprint&&entry.fingerprint&&!result.fingerprint.every((v,i)=>v===entry!.fingerprint![i])){hash+='-collision';entry=this.entries.get(hash)}
   if(entry){if(texture.source!==entry.source){if(texture.source.data!==entry.source.data)replaced.add(texture.source.data);texture.source=entry.source;this.saved+=entry.bytes}}
   else {const image=texture.source.data;entry={source:texture.source,references:0,fingerprint:result.fingerprint,bytes:(image?.width||0)*(image?.height||0)*4};this.entries.set(hash,entry)}
   entry.references++;owned.set(texture,hash);
  }
  const used=new Set([...textures].map(t=>t.source.data));for(const image of replaced)if(!used.has(image)&&typeof image?.close==='function')image.close();
 }
 release(group:Group){const managed=new Set<unknown>(),owned=this.groups.get(group);if(!owned)return managed;
  for(const [texture,hash] of owned){managed.add(texture.source.data);const entry=this.entries.get(hash);if(entry&&--entry.references===0){if(typeof entry.source.data?.close==='function')entry.source.data.close();this.entries.delete(hash)}}this.groups.delete(group);return managed;
 }
 diagnostics(){return {uniqueEmbeddedImages:this.entries.size,decodedImageMiB:+([...this.entries.values()].reduce((n,e)=>n+e.bytes,0)/1048576).toFixed(1),duplicateImageMiBSaved:+(this.saved/1048576).toFixed(1),gpuMemoryMeasured:false}}
}
