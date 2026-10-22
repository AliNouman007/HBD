'use client';
import {useEffect,useState} from 'react';
import {Box3,PerspectiveCamera,Quaternion,Vector3,Mesh,MeshStandardMaterial,FloatType,DataTexture,RGBAFormat} from 'three';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {loadAsset,downloadAsset,decoderStatus,findSource,sourceName,applyPhotos,applyGiftTag,applyIndirectMap,disposeGroup,ASSET_NAMES} from '@/lib/world/assets';
import {Actor} from '@/lib/world/actors';
import {TexturePool} from '@/lib/world/texture-pool';
import {sampleCamera,type CameraKey} from '@/lib/world/camera';
import {validateContent} from '@/lib/world/content';
import {worldUrl} from '@/lib/world/revision';
export default function AssetAudit(){
 const [rows,setRows]=useState<object[]>([]),[status,setStatus]=useState('Loading browser assets…');
 useEffect(()=>{
  let cancelled=false;const pool=new TexturePool(),controller=new AbortController(),loaded:Awaited<ReturnType<typeof loadAsset>>[]=[],actors:Actor[]=[];
  const longTasks:number[]=[],observer=PerformanceObserver.supportedEntryTypes.includes('longtask')?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration))):null;
  observer?.observe({type:'longtask'});
  const run=async()=>{try{
   const content=validateContent(await (await fetch('/personal-content.json',{signal:controller.signal})).json());
   const keys=await (await fetch(worldUrl('cameras.json'),{signal:controller.signal})).json() as CameraKey[];
   const report:object[]=[{environment:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,webglRendererCreated:false}}],start=performance.now();
   for(let i=0;i<ASSET_NAMES.length;i+=2){
    const names=ASSET_NAMES.slice(i,i+2),downloads=names.map(n=>downloadAsset(n,controller.signal));void Promise.allSettled(downloads);
    for(let k=0;k<names.length;k++){
     const name=names[k],begin=performance.now(),group=await loadAsset(name,downloads[k],pool);if(cancelled){disposeGroup(group);return}loaded.push(group);
     const entry:Record<string,unknown>={asset:name,loadMs:Math.round(performance.now()-begin),textures:0,meshes:0,slots:[]};
     group.updateMatrixWorld(true);group.traverse(o=>{if(o instanceof Mesh){entry.meshes=Number(entry.meshes)+1;if(o.userData.content_slot)(entry.slots as string[]).push(o.userData.content_slot);for(const m of Array.isArray(o.material)?o.material:[o.material])for(const t of Object.values(m))if(t&&typeof t==='object'&&'isTexture' in t){entry.textures=Number(entry.textures)+1;if(!(t as any).image?.width)throw Error(name+': decoded texture missing')}}});
     if(name==='bedroom'){
      let teddy=0;group.traverse(o=>{if(String(o.userData.source_name||o.name).startsWith('P2.Bedroom.Teddy'))teddy++});entry.bedroomTeddyParts=teddy;if(teddy)throw Error('Bedroom teddy was not removed');
      const screen=findSource(group,'Portal_screen');if(!screen?.geometry.getAttribute('uv'))throw Error('Laptop screen or UVs missing');
      const centre=new Box3().setFromObject(screen).getCenter(new Vector3()),camera=new PerspectiveCamera();sampleCamera(camera,keys,180,1.6);camera.updateMatrixWorld(true);
      entry.portalOriginOffsetMetres=centre.distanceTo(screen.getWorldPosition(new Vector3()));entry.portalAlignment=Math.abs(camera.getWorldDirection(new Vector3()).dot(new Vector3(0,0,1).applyQuaternion(screen.getWorldQuaternion(new Quaternion()))));
      if(Number(entry.portalAlignment)<.995)throw Error('Camera does not align with the laptop screen');
     }
     if(['door','exit-door','gift'].includes(name)){
      const clip=name==='door'?'EntryDoor.Open':name==='exit-door'?'ExitDoor.Open':'Gift.Unwrap',actor=new Actor(group,clip);actors.push(actor);
      const sources=name==='door'?['DOOR • inward hinge']:name==='exit-door'?['Hero French leaf • left','Hero French leaf • right']:['P2.Gift.Lid','P2.Gift.FrontFlap'];
      const rotations=sources.map(source=>{let node:any;group.traverse(o=>{if(o.userData.source_name===source)node=o});if(!node)throw Error('Missing pivot '+source);actor.set(0);const q=node.quaternion.clone();actor.set(1);return {source,angle:q.angleTo(node.quaternion)*180/Math.PI}});entry.clip=clip;entry.pivots=rotations;if(rotations.some(r=>r.angle<60))throw Error(name+': native clip does not open correctly');actor.set(0);
      if(name==='gift'){applyGiftTag(group,content.gift.tag);let teddy=false;group.traverse(o=>{if(o.userData.source_name==='P2.Gift.Teddy')teddy=true});entry.giftTeddyPreserved=teddy;if(!teddy)throw Error('Gift teddy missing')}
     }
     if(['bedroom','salon','courtyard','ending'].includes(name)){
      const bytes=await(await fetch(worldUrl(`lightmaps/${name}-indirect.exr`),{signal:controller.signal})).arrayBuffer(),d=new EXRLoader().setDataType(FloatType).parse(bytes);let max=0;for(const n of d.data){if(!Number.isFinite(n))throw Error(name+': invalid lightmap');max=Math.max(max,n)}let receivers=0;
      group.traverse(o=>{if(o instanceof Mesh&&o.userData.p2_indirect===name){receivers++;if(!o.geometry.getAttribute('uv1'))throw Error(name+': missing lightmap UV channel')}});const map=new DataTexture(d.data,d.width,d.height,RGBAFormat,FloatType);map.channel=1;applyIndirectMap(group,name,map);let leaks=0;group.traverse(o=>{if(o instanceof Mesh&&o.userData.p2_indirect!==name)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&m.lightMap===map)leaks++});if(leaks)throw Error(name+': indirect map leaked onto props');entry.indirect={materialLeaks:leaks,bytes:bytes.byteLength,width:d.width,height:d.height,max,receivers};if(!receivers||max<=1)throw Error(name+': missing indirect receiver or black lightmap');
     }
     if(name==='bedroom'||name==='courtyard'){entry.photoWarnings=await applyPhotos(group,content);if((entry.photoWarnings as string[]).length)throw Error('Photograph fallback failed');entry.photographsApplied=true}
     if(name==='cake'){const centre=new Box3().setFromObject(group).getCenter(new Vector3()),camera=new PerspectiveCamera();sampleCamera(camera,keys,474,1.5);camera.updateMatrixWorld(true);const p=centre.project(camera);entry.visibleInDoorComposition=Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1;if(!entry.visibleInDoorComposition)throw Error('Cake falls outside doorway framing')}
     if(name==='ending'){entry.letterFound=!!findSource(group,'06 LETTER');entry.woodMaps=0;group.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&/oak/i.test(m.name)&&m.map)entry.woodMaps=Number(entry.woodMaps)+1});if(!entry.letterFound||!entry.woodMaps)throw Error('Letter or oak texture missing')}
     report.push(entry);if(!cancelled)setRows([...report]);
    }
   }
   longTasks.push(...(observer?.takeRecords().map(e=>e.duration)??[]));observer?.disconnect();report.push({pipeline:{elapsedMs:Math.round(performance.now()-start),decoderWorkers:decoderStatus.workers,longTasks:longTasks.length,longestTaskMs:Math.round(Math.max(0,...longTasks)),gpuPreparationMeasured:false,texturePool:pool.diagnostics()}});if(!cancelled){setRows(report);setStatus('Asset checks complete — rendering remains a separate check.')}
  }catch(e){if(!cancelled)setStatus('FAILED: '+(e as Error).message)}};void run();
  return()=>{cancelled=true;controller.abort();observer?.disconnect();actors.forEach(a=>a.dispose());loaded.forEach(disposeGroup)};
 },[]);
 return <main style={{padding:32,background:'#f6f1e9',color:'#30272a',minHeight:'100vh',overflow:'auto',position:'absolute',inset:0}}><h1>Browser asset diagnostics</h1><p>The ten Phase 3 exports, native animation clips, photographs and linear indirect maps are decoded here. This page does not render the world or measure GPU performance.</p><p role="status">{status}</p><pre data-testid="asset-results" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(rows,null,2)}</pre><a href="/qa">Return to journey QA</a></main>;
}
