'use client';
import {useEffect,useRef,useState} from 'react';
import {Mesh,MeshStandardMaterial,ShaderChunk,FrontSide,DoubleSide,type Material} from 'three';
import {Journey,DOOR,frameAt} from '@/lib/world/journey';
import {sampleCamera} from '@/lib/world/camera';
import {validateContent} from '@/lib/world/content';
import type {WorldEngine} from '@/lib/world/engine';

type Variant='original'|'front-to-back'|'point-guard'|'area-guard'|'light-guards'|'lights-front-to-back'|'cake-front-faces';
type SortItem={groupOrder:number;renderOrder:number;z:number;material:{id:number};id:number};
type Result={variant:Variant;progress:number;frame:number;candles:boolean;sampleCount:number;medianMs:number;p95Ms:number;samplesMs:number[];drawCalls:number;triangles:number;resolution:number[];dpr:number;pixelDifference:null|{changedPixels:number;maximumChannelDifference:number;meanChannelDifference:number};image:string};
const variants:Variant[]=['original','front-to-back','point-guard','area-guard','light-guards','lights-front-to-back','cake-front-faces'];
const frontToBack=(a:SortItem,b:SortItem)=>a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||a.z-b.z||a.material.id-b.material.id||a.id-b.id;
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const rounded=(n:number)=>Math.round(n*100)/100;
const viewFrame=(progress:number)=>progress===.65?1330:frameAt(progress);

export default function PerformanceReview(){
 const host=useRef<HTMLDivElement>(null),run=useRef<((variant:Variant,progress:number,samples:number,candles:boolean)=>Promise<Omit<Result,'image'>>)|null>(null);
 const [status,setStatus]=useState('Preparing the original world…'),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[results,setResults]=useState<Result[]>([]),[progress,setProgress]=useState(.56),[candles,setCandles]=useState(true),[loadTrace,setLoadTrace]=useState('');
 useEffect(()=>{
  let cancelled=false,engine:WorldEngine|null=null,running=false;
  const activities:{name:string;started:number}[]=[];
  const tracked=async<T,>(name:string,work:()=>Promise<T>)=>{const entry={name,started:performance.now()};activities.push(entry);try{return await work()}finally{activities.splice(activities.indexOf(entry),1)}};
  const controller=new AbortController(),originals=new Map<Material,{compile:Material['onBeforeCompile'];cache:Material['customProgramCacheKey'];key:string;side:Material['side'];shadowSide:Material['shadowSide']}>(),references=new Map<string,Uint8ClampedArray>(),cakeMaterials=new Set<Material>();
  const restore=()=>{if(!engine)return;engine.renderer.setOpaqueSort(null);for(const [m,original] of originals){m.onBeforeCompile=original.compile;m.customProgramCacheKey=original.cache;m.side=original.side;m.shadowSide=original.shadowSide;m.needsUpdate=true}};
  const apply=(variant:Variant)=>{
   restore();if(!engine)return;
   if(variant==='front-to-back'||variant==='lights-front-to-back')engine.renderer.setOpaqueSort(frontToBack);
   if(variant==='cake-front-faces')for(const material of cakeMaterials){const original=originals.get(material);if(original?.side===DoubleSide){material.side=FrontSide;material.shadowSide=original.shadowSide??DoubleSide;material.needsUpdate=true}}
   if(!['point-guard','area-guard','light-guards','lights-front-to-back'].includes(variant))return;
   for(const [m,original] of originals){
    m.onBeforeCompile=function(shader,renderer){
     original.compile.call(this,shader,renderer);
     if(variant==='point-guard'||variant==='light-guards'||variant==='lights-front-to-back'){
      const call='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
      const chunk=ShaderChunk.lights_fragment_begin.replace(call,`if ( directLight.visible ) { ${call} }`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',chunk);
     }
     if(variant==='area-guard'||variant==='light-guards'||variant==='lights-front-to-back'){
      const chunk=ShaderChunk.lights_physical_pars_fragment.replace('vec2 uv = LTC_Uv( normal, viewDir, roughness );','if ( dot( cross( rectCoords[ 1 ] - rectCoords[ 0 ], rectCoords[ 3 ] - rectCoords[ 0 ] ), position - rectCoords[ 0 ] ) < 0.0 ) return;\n\t\tvec2 uv = LTC_Uv( normal, viewDir, roughness );');
      shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_pars_fragment>',chunk);
     }
    };
    m.customProgramCacheKey=()=>`${original.key}:qa-performance:${variant}`;m.needsUpdate=true;
   }
  };
  const pose=(p:number,lit:boolean)=>{
   if(!engine)return;const e=engine,j=e.journey;j.progress=j.target=p;j.phase=p===.65?'exitDoor':'travel';j.mode='journey';j.doorOpen=true;j.doorT=1;j.exitDoorOpen=false;j.exitDoorT=0;j.extinguished=!lit;j.wishT=lit?0:12;j.giftT=0;
   e.clock=3;e.wind.value=3;e.actors.door?.set(1);e.actors['exit-door']?.set(0);e.actors.gift?.set(0);
   sampleCamera(e.camera,e.keys,viewFrame(p),e.host.clientWidth/e.host.clientHeight);e.updateShadowZone(p);
   e.effects.update(e.assets.flames,3,!lit,lit?0:12,0,false,e.camera.position,true);e.sun.shadow.needsUpdate=true;
  };
  const benchmark=async(variant:Variant,p:number,samples:number,lit:boolean):Promise<Omit<Result,'image'>>=>{
   if(!engine?.allReady||cancelled)throw Error('Wait for all world assets to finish preparing.');
   if(running)throw Error('A measurement is already running.');
   if(!variants.includes(variant)||![.25,.378,.43,.5,.56,.65].includes(p)||!Number.isInteger(samples)||samples<4||samples>12)throw Error('Use a listed variant/view and 4–12 samples.');
   running=true;setBusy(true);setStatus(`Warming ${variant} at progress ${p}…`);const e=engine;
   try{
    apply(variant);pose(p,lit);
    const gl=e.renderer.getContext();
    for(let i=0;i<2;i++){await nextFrame();if(cancelled)throw Error('Review closed.');e.renderer.render(e.world,e.camera);gl.finish()}
    setStatus(`Measuring ${variant}: synchronized GPU completion, ${samples} frames…`);
    const times:number[]=[];let image='',pixels:Uint8ClampedArray|null=null;
    for(let i=0;i<samples;i++){
     await nextFrame();if(cancelled)throw Error('Review closed.');const start=performance.now();e.renderer.render(e.world,e.camera);gl.finish();times.push(performance.now()-start);
     if(i===samples-1){const canvas=document.createElement('canvas');canvas.width=e.renderer.domElement.width;canvas.height=e.renderer.domElement.height;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(e.renderer.domElement,0,0);pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;image=canvas.toDataURL('image/png')}
    }
    const sorted=[...times].sort((a,b)=>a-b),key=`${p}:${lit}:${e.renderer.domElement.width}:${e.renderer.domElement.height}`,base=references.get(key);
    let difference:Result['pixelDifference']=null;
    if(variant==='original'&&pixels)references.set(key,pixels);
    else if(base&&pixels&&base.length===pixels.length){let changed=0,maximum=0,total=0;for(let i=0;i<base.length;i+=4){let pixelChanged=false;for(let c=0;c<3;c++){const d=Math.abs(base[i+c]-pixels[i+c]);if(d)pixelChanged=true;maximum=Math.max(maximum,d);total+=d}if(pixelChanged)changed++}difference={changedPixels:changed,maximumChannelDifference:maximum,meanChannelDifference:Math.round(total/(base.length/4*3)*1000000)/1000000}}
    const result:Result={variant,progress:p,frame:viewFrame(p),candles:lit,sampleCount:samples,medianMs:rounded(sorted[Math.floor(sorted.length/2)]),p95Ms:rounded(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]),samplesMs:times.map(rounded),drawCalls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,resolution:[e.renderer.domElement.width,e.renderer.domElement.height],dpr:e.renderer.getPixelRatio(),pixelDifference:difference,image};
    setResults(previous=>[...previous,result].slice(-12));setStatus(`Finished ${variant}. Timing includes gl.finish; it is not normal animation FPS.`);const {image:_,...summary}=result;return summary;
   }finally{restore();running=false;if(!cancelled)setBusy(false)}
  };
  const readStatus=()=>({ready:!!run.current,running,visibility:document.visibilityState,activity:activities.map(entry=>({name:entry.name,elapsedMs:Math.round(performance.now()-entry.started)})),stage:engine?.loadStage,assetLimit:engine?.journey.assetLimit,assetNames:engine?Object.keys(engine.assets):[],diagnostics:engine?.diagnostics(),host:[engine?.host.clientWidth,engine?.host.clientHeight]});
  const traceTimer=setInterval(()=>{if(!cancelled&&!run.current)setLoadTrace(JSON.stringify(readStatus(),null,2))},1000);
  const context=(document as any).modelContext;
  if(context?.registerTool)Promise.resolve(context.registerTool({name:'birthday_performance_status',description:'Read benchmark loading state, active preparation operation, journey asset gate, engine readiness and diagnostics.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:readStatus},{signal:controller.signal})).catch(console.warn);
  if(context?.registerTool)Promise.resolve(context.registerTool({name:'birthday_performance_flush',description:'Flush queued GPU commands in the isolated benchmark and report its current loading state.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{engine?.renderer.getContext().flush();return readStatus()}},{signal:controller.signal})).catch(console.warn);
  const init=async()=>{
   try{
    const response=await fetch('/personal-content.json',{signal:controller.signal});if(!response.ok)throw Error('Personal content unavailable.');const content=validateContent(await response.json());const {WorldEngine}=await import('@/lib/world/engine');if(cancelled)return;
    const journey=new Journey();engine=new WorldEngine(host.current!,journey,content,()=>{if(cancelled)return;if(journey.assetLimit>=DOOR&&!engine?.allReady){journey.progress=journey.target=journey.assetLimit;journey.phase=journey.assetLimit===DOOR?'doorway':'exitDoor'}setStatus(engine?.loadStage||'Preparing world assets…')});
    const add=engine.add.bind(engine),prepare=engine.prepare.bind(engine),compile=engine.renderer.compileAsync.bind(engine.renderer);
    engine.add=(name,download)=>tracked(`add:${name}`,()=>add(name,download));
    engine.prepare=(asset,scene,depth)=>tracked(`prepare:${Object.entries(engine!.assets).find(([,group])=>group===asset)?.[0]??asset.name}`,()=>prepare(asset,scene,depth));
    engine.renderer.compileAsync=(...args)=>tracked(`compile:${args[0].name||args[0].type}:${engine!.renderer.getRenderTarget()?'offscreen':'screen'}`,()=>{const compilation=compile(...args);engine!.renderer.getContext().flush();return compilation});
    await tracked('load',()=>engine!.load());if(cancelled)return;if(!engine.allReady)throw Error(journey.error||'World assets did not prepare.');cancelAnimationFrame(engine.raf);
    engine.world.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material instanceof MeshStandardMaterial&&!originals.has(material))originals.set(material,{compile:material.onBeforeCompile,cache:material.customProgramCacheKey,key:material.customProgramCacheKey(),side:material.side,shadowSide:material.shadowSide})});
    engine.assets.cake?.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])cakeMaterials.add(material)});
    pose(.56,true);engine.renderer.render(engine.world,engine.camera);engine.renderer.getContext().finish();run.current=benchmark;setReady(true);setStatus('Ready. Original quality and fixed animation state. Run Original before each candidate for pixel comparison.');
    if(context?.registerTool){
     await context.registerTool({name:'birthday_performance_measure',description:'Measure 4–12 fixed-pose frames for one rendering variant. Original should run before each candidate/view for image pixel comparison. Restores original material hooks and ordering after every run.',inputSchema:{type:'object',properties:{variant:{type:'string',enum:variants},progress:{type:'number',enum:[.25,.378,.43,.5,.56,.65]},samples:{type:'integer',minimum:4,maximum:12},candles:{type:'boolean'}},required:['variant','progress','samples','candles'],additionalProperties:false},execute:({variant,progress,samples,candles}:{variant:Variant;progress:number;samples:number;candles:boolean})=>benchmark(variant,progress,samples,candles)},{signal:controller.signal});
    }
   }catch(error){if(!cancelled)setStatus(`Unable to prepare review: ${(error as Error).message}`)}
  };void init();
  return()=>{cancelled=true;clearInterval(traceTimer);run.current=null;controller.abort();restore();engine?.dispose()};
 },[]);
 return <main style={{minHeight:'100dvh',background:'#241e24',color:'#fff4e9',overflow:'auto',position:'absolute',inset:0,font:'14px/1.5 Arial,sans-serif'}}>
  <section style={{padding:16}}><h1 style={{fontSize:22}}>Fixed-view rendering review</h1><p>Same assets, lighting, resolution and render quality. Timings include explicit GPU completion; they are not normal animation FPS. Wind, candles, doors and camera remain fixed.</p><p role="status">{status}</p><label>View <select value={progress} disabled={busy} onChange={e=>setProgress(Number(e.target.value))} style={{color:'#241e24'}}>{[.25,.378,.43,.5,.56,.65].map(p=><option key={p} value={p}>{p}</option>)}</select></label>{' '}<label><input type="checkbox" checked={candles} disabled={busy} onChange={e=>setCandles(e.target.checked)}/> Candles lit</label><div>{variants.map(variant=><button key={variant} disabled={!ready||busy} onClick={()=>void run.current?.(variant,progress,10,candles).catch(error=>setStatus(error.message))} style={{margin:'8px 8px 0 0',padding:'8px 12px',color:'#241e24',background:'#f6dfd2',borderRadius:6,opacity:(!ready||busy)?0.5:1}}>{variant}</button>)}</div></section>
  {!ready&&<pre data-testid="performance-loading" style={{padding:16,whiteSpace:'pre-wrap'}}>{loadTrace}</pre>}
  <div ref={host} style={{height:'100dvh',width:'100%',position:'relative'}}/>
  <section style={{padding:16}}><h2>Measurements</h2><pre data-testid="performance-results" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(results.map(({image:_,...result})=>result),null,2)}</pre><div style={{display:'flex',flexWrap:'wrap',gap:16}}>{results.map((result,i)=><figure key={i} style={{width:'min(45%,600px)',margin:0}}><figcaption>{result.variant} · {result.progress} · {result.medianMs} ms</figcaption><img src={result.image} alt={`${result.variant} fixed view at ${result.progress}`} style={{width:'100%'}}/></figure>)}</div></section>
 </main>;
}
