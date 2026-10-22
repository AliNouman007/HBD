import {Scene,Group,PerspectiveCamera,WebGLRenderer,Color,Fog,WebGLRenderTarget,HalfFloatType,MeshBasicMaterial,Mesh,CanvasTexture,MeshStandardMaterial,SRGBColorSpace,AgXToneMapping,PCFSoftShadowMap,Quaternion,Vector3,PMREMGenerator,DoubleSide,Raycaster,Vector2,Texture,LinearMipmapLinearFilter,Box3,Matrix4} from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';
import {Journey,frameAt,DOOR,EXIT} from './journey';
import {sampleCamera,portalProjection,portalTargetSize,type CameraKey} from './camera';
import {loadAsset,downloadAsset,findSource,projectSurfaceUV,applyPhotos,applyGiftTag,applyIndirectMap,disposeGroup,type AssetName} from './assets';
import {lightScene,authoredFill,SUN_DIRECTION,type AuthoredLight} from './lighting';
import {CandleEffects} from './effects';
import type {PersonalContent} from './content';
import {worldUrl} from './revision';
import {prepareInBatches} from './preparation';
import {Actor} from './actors';
import {instanceRepeatedSiblings,type InstanceBatch} from './instances';
import {TexturePool} from './texture-pool';
import {ViewController,type Anchor} from './view-mode';
import {guardLightWork} from './light-work';
import {installRoomDepthPrepass} from './room-depth-prepass';
import {RoomRenderer} from './room-renderer';
import {ArrivalWelcome} from './arrival-welcome';
import {applyEntryDoorOcclusion,shouldRefreshShadow,opaqueFrontToBack,freezeStaticTransforms} from './render-work';
export class WorldEngine {
 renderer:WebGLRenderer;camera=new PerspectiveCamera();bedroom=new Scene();world=new Scene();assets:Partial<Record<AssetName,Group>>={};actors:Partial<Record<'door'|'exit-door'|'gift',Actor>>={};
 arrivalWelcome:ArrivalWelcome|undefined;roomRenderer:RoomRenderer;depthCleanup:Array<()=>void>=[];instanceBatches:InstanceBatch[]=[];renderTimes:number[]=[];occlusionBounds=new Map<AssetName,Box3>();
 downloads=new Map<AssetName,Promise<ArrayBuffer>>();bedroomDirty=true;worldDirty=true;bedroomMatrix=new Matrix4();bedroomProjection=new Matrix4();bedroomPortalFrame=-1;bedroomFrames=0;roomReadyMs=0;roomGateWaitMs=0;
 texturePool=new TexturePool();loadController=new AbortController();keys:CameraKey[]=[];anchors:Record<string,Anchor>={};view=new ViewController();disposed=false;upcomingReady=false;interiorReady=false;allReady=false;breath=0;moving=0;paused=false;reduced=false;frames:number[]=[];frameCount=0;last=0;raf=0;clock=0;lastPublish=0;wind={value:0};
 portalCamera=new PerspectiveCamera();portal=new WebGLRenderTarget(16,16,{type:HalfFloatType});portalDirty=true;portalEnd:Vector3|null=null;portalOffset=new Vector3();lastPortalAt=-10;portalFrames=0;portalMs=0;
 effects:CandleEffects;effectsRoot=new Group();bedroomSun:ReturnType<typeof lightScene>;sun:ReturnType<typeof lightScene>;environment:WebGLRenderTarget;sky:Sky;shadowZone='';lastShadowTime=-1;
 loadedAt=0;worldReadyMs=0;preparationMs=0;preparedGroups=0;started=performance.now();loadStage='Opening your room…';downloadProgress:number|null=null;downloadedBytes=0;qualityChanges=0;recording:MediaRecorder|null=null;photoWarnings:string[]=[];longTasks:number[]=[];observer:PerformanceObserver|null=null;
 constructor(public host:HTMLElement,public journey:Journey,public content:PersonalContent,public onUpdate:()=>void){
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{this.renderer=new WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}catch{this.renderer=new WebGLRenderer({antialias:false,alpha:false,powerPreference:'default'})}
  this.renderer.outputColorSpace=SRGBColorSpace;this.renderer.toneMapping=AgXToneMapping;this.renderer.toneMappingExposure=Math.pow(2,-.08);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=PCFSoftShadowMap;
  this.renderer.domElement.setAttribute('aria-label','Interactive birthday world');this.renderer.domElement.setAttribute('role','img');host.appendChild(this.renderer.domElement);this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.bedroom.background=new Color('#d7c5bc');this.world.background=new Color('#dfe7e9');this.world.fog=new Fog('#dfe7e9',32,95);
  this.sky=new Sky();this.sky.scale.setScalar(100);const u=this.sky.material.uniforms;u.turbidity.value=3;u.rayleigh.value=1.6;u.mieCoefficient.value=.003;u.mieDirectionalG.value=.78;u.sunPosition.value.copy(SUN_DIRECTION).negate();this.world.add(this.sky);
  this.bedroomSun=lightScene(this.bedroom,true);this.sun=lightScene(this.world,false);
  const pmrem=new PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();this.bedroom.environment=this.world.environment=this.environment.texture;this.bedroom.environmentIntensity=.10;this.world.environmentIntensity=.14;
  this.world.add(this.effectsRoot);this.effects=new CandleEffects(this.effectsRoot);this.roomRenderer=new RoomRenderer(this.renderer);this.journey.setAssetLimit(.165);
  if(PerformanceObserver.supportedEntryTypes.includes('longtask')){this.observer=new PerformanceObserver(l=>{this.longTasks.push(...l.getEntries().map(e=>e.duration));if(this.longTasks.length>400)this.longTasks.splice(0,this.longTasks.length-400)});this.observer.observe({type:'longtask'})}
  this.resize();this.last=performance.now();this.raf=requestAnimationFrame(this.tick);
 }
 contextLost=(e:Event)=>{e.preventDefault();this.moving=0;this.journey.fail('The 3D view was interrupted. Reload this world to restore it.');this.onUpdate()};
 resize=()=>{const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.setSize(r.width,r.height);this.camera.aspect=r.width/r.height;this.portalDirty=true;this.bedroomDirty=true;this.worldDirty=true};
 async json<T=unknown>(file:string):Promise<T>{const r=await fetch(worldUrl(file),{signal:this.loadController.signal});if(!r.ok)throw Error(`Missing world data: ${file}`);return r.json()}
 async prepare(asset:Group,scene:Scene,depth?:ReturnType<typeof installRoomDepthPrepass>){
  const start=performance.now(),textures=new Set<Texture>();asset.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v instanceof Texture)textures.add(v)});
  await prepareInBatches(textures,t=>this.renderer.initTexture(t),{cancelled:()=>this.disposed});if(this.disposed)return;
  if(scene===this.world){
   // RoomRenderer already warms the native display and linear HDR variants.
   await this.roomRenderer.warmup(asset,this.camera,scene);if(this.disposed)return;
  }else{await this.renderer.compileAsync(asset,this.camera,scene);if(this.disposed)return;}
  if(depth){
   await depth.compileAsync(this.renderer,this.camera,scene);if(this.disposed)return;
   const previous=this.renderer.getRenderTarget();let compiled:Promise<unknown>;
   try{this.renderer.setRenderTarget(this.portal);compiled=depth.compileAsync(this.renderer,this.portalCamera,scene)}finally{this.renderer.setRenderTarget(previous)}
   await compiled;if(this.disposed)return;
  }
  this.preparationMs+=performance.now()-start;this.preparedGroups++;this.onUpdate();
 }
 async add(name:AssetName,download:Promise<ArrayBuffer>){
  const asset=await loadAsset(name,download,this.texturePool);if(this.disposed){disposeGroup(asset);return}
  // Own the decoded group immediately so unmount/error paths also dispose
  // groups awaiting their indirect map or personal photograph.
  this.assets[name]=asset;
  this.photoWarnings.push(...await applyPhotos(asset,this.content));
  if(['bedroom','salon','courtyard','ending'].includes(name)){
   const map=await new EXRLoader().setDataType(HalfFloatType).loadAsync(worldUrl(`lightmaps/${name}-indirect.exr`));map.channel=1;map.flipY=false;map.generateMipmaps=true;map.minFilter=LinearMipmapLinearFilter;
   applyIndirectMap(asset,name,map);
  }
  if(name==='ending')this.letterTexture(asset);
  if(name==='courtyard'){const niche=findSource(asset,'P2 arrival niche blush back');if(niche){this.arrivalWelcome=new ArrivalWelcome(niche,this.content);asset.add(this.arrivalWelcome.root)}}
  if(['door','exit-door','gift'].includes(name)){const n=name as 'door'|'exit-door'|'gift';this.actors[n]=new Actor(asset,n==='door'?'EntryDoor.Open':n==='exit-door'?'ExitDoor.Open':'Gift.Unwrap')}
  if(name==='exit-door')this.instanceBatches.push(...instanceRepeatedSiblings(asset));
  if(name==='gift'){applyGiftTag(asset,this.content.gift.tag);asset.traverse(o=>{if(o.userData.source_name==='P2.Gift.Teddy')this.view.bindTeddy(o)})}
  if(!this.reduced&&name==='garden')asset.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&/foliage|leaf|petal|leaves/i.test(m.name)){
   m.onBeforeCompile=shader=>{shader.uniforms.uGardenWind=this.wind;shader.vertexShader='uniform float uGardenWind;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(position.y*5.0 + position.x*2.0 + uGardenWind)*0.0015;')};m.customProgramCacheKey=()=> 'birthday-subtle-garden-wind';
  }});
  if(this.disposed){disposeGroup(asset);return}
  if(name!=='bedroom'){guardLightWork(asset);this.roomRenderer.prepare(asset)}
  const depth=name==='cake'?installRoomDepthPrepass(asset):undefined;if(depth)this.depthCleanup.push(depth);
  const scene=name==='bedroom'?this.bedroom:this.world;await this.prepare(asset,scene,depth);if(this.disposed)return;scene.add(asset);if(!['door','exit-door','gift','flames'].includes(name))freezeStaticTransforms(asset);if(['cake','flames','exit-door','gift','ending'].includes(name))this.occlusionBounds.set(name,new Box3().setFromObject(asset).expandByScalar(.05));(scene===this.bedroom?this.bedroomSun:this.sun).shadow.needsUpdate=true;this.portalDirty=true;this.bedroomDirty=true;
 }
 download(name:AssetName){
  let pending=this.downloads.get(name);
  if(!pending){pending=downloadAsset(name,this.loadController.signal);this.downloads.set(name,pending);void pending.catch(()=>{})}
  return pending;
 }
 async prefetch(names:AssetName[]){
  // Fetch bytes while the visitor explores; defer decode/upload/shaders to the closed door.
  for(let i=0;i<names.length&&!this.disposed;i+=2)await Promise.allSettled(names.slice(i,i+2).map(name=>this.download(name)));
 }
 async stage(names:AssetName[],label:string){
  this.loadStage=label;this.onUpdate();
  // Two transfers at a time; one decode/upload/compile at a time. Late sets never
  // compete with the first bedroom transfer, and remain gated until prepared.
  for(let i=0;i<names.length;i+=2){const batch=names.slice(i,i+2),downloads=batch.map(n=>this.download(n));void Promise.allSettled(downloads);for(let k=0;k<batch.length;k++){if(this.disposed)return;await this.add(batch[k],downloads[k]);this.downloads.delete(batch[k]);await new Promise<void>(r=>requestAnimationFrame(()=>setTimeout(r,0)))}}
 }
 async load(){try{
  const metadata=Promise.all([this.json<CameraKey[]>('cameras.json'),this.json<Record<string,Anchor>>('anchors.json'),this.json<Record<string,AuthoredLight[]>>('lighting.json')]);
  const opening=downloadAsset('bedroom',this.loadController.signal,(n,total)=>{this.downloadedBytes=n;this.downloadProgress=total?Math.min(1,n/total):null;this.onUpdate()});void opening.catch(()=>{});
  const [keys,anchors,lighting]=await metadata;if(this.disposed)return;this.keys=keys;this.anchors=anchors;
  authoredFill(this.bedroom,lighting.bedroom,true);authoredFill(this.world,Object.values(lighting).flat() as AuthoredLight[],false);sampleCamera(this.camera,this.keys,1,this.host.clientWidth/this.host.clientHeight);
  this.roomRenderer.prepare(this.world);
  this.loadStage='Preparing the sunlight and textures…';await this.add('bedroom',opening);if(this.disposed)return;
  this.loadedAt=performance.now()-this.started;this.downloadProgress=null;this.journey.loaded();this.onUpdate();
  await this.roomRenderer.warmup(this.world,this.camera,this.world);if(this.disposed)return;
  await this.stage(['garden','door'],'Bringing the garden to life…');if(this.disposed)return;
  this.upcomingReady=true;this.configurePortal();this.renderPortal();this.journey.setAssetLimit(DOOR);
  void this.prefetch(['salon','cake','flames','exit-door','courtyard']);
  // The closed entry door hides the later rooms while their full-quality assets prepare.
  while(!this.disposed&&this.journey.progress<DOOR)await new Promise<void>(r=>setTimeout(r,100));if(this.disposed)return;
  const roomGateStarted=performance.now();
  await this.stage(['salon','cake','flames','exit-door','courtyard'],'Preparing the birthday room…');if(this.disposed)return;
  this.interiorReady=true;this.roomReadyMs=performance.now()-this.started;this.roomGateWaitMs=performance.now()-roomGateStarted;this.journey.setAssetLimit(EXIT);this.loadStage='';this.onUpdate();
  void this.prefetch(['gift','ending']);
  while(!this.disposed&&this.journey.progress<EXIT)await new Promise<void>(r=>setTimeout(r,100));if(this.disposed)return;
  await this.stage(['gift','ending'],'Preparing your memories…');if(this.disposed)return;this.allReady=true;this.journey.setAssetLimit(1);this.worldReadyMs=performance.now()-this.started;this.loadStage='';this.onUpdate();
 }catch(e){if(!this.disposed){this.journey.fail('Part of your world could not load. Please retry when your connection is ready.');console.error(e);this.onUpdate()}}}
 letterTexture(group:Group){
  const paper=findSource(group,'06 LETTER');if(!paper)return;const canvas=document.createElement('canvas');canvas.width=1448;canvas.height=1024;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#fff5e9';ctx.fillRect(0,0,1448,1024);const blush=ctx.createLinearGradient(0,0,1448,1024);blush.addColorStop(0,'#f4dce4aa');blush.addColorStop(.45,'#fff5e900');blush.addColorStop(1,'#f5dfbb80');ctx.fillStyle=blush;ctx.fillRect(0,0,1448,1024);ctx.strokeStyle='#d3b598';ctx.lineWidth=2;ctx.strokeRect(55,55,1338,914);ctx.strokeStyle='#dfbec680';ctx.strokeRect(67,67,1314,890);
  for(const [x,y,scale] of [[107,111,1],[1341,913,.8]]){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#cc91a2';ctx.beginPath();ctx.moveTo(0,17);ctx.bezierCurveTo(-48,-12,-27,-44,0,-20);ctx.bezierCurveTo(27,-44,48,-12,0,17);ctx.fill();ctx.restore()}
  ctx.fillStyle='#966471';ctx.textAlign='center';ctx.font='20px Georgia';ctx.fillText('A POCKETFUL OF GOOD WISHES',724,105);ctx.font='66px Georgia';ctx.fillText(this.content.letter.title,724,200,1190);ctx.fillStyle='#59403d';
  let font=37,lines:string[]=[];const wrap=()=>{lines=[];ctx.font=`${font}px Georgia`;for(const paragraph of this.content.letter.paragraphs){let line='';for(const word of paragraph.split(/\s+/)){const test=line+word+' ';if(ctx.measureText(test).width>1190&&line){lines.push(line);line=word+' '}else line=test}lines.push(line,'')}};wrap();while(lines.length*font*1.5>525&&font>19){font--;wrap()}
  ctx.textAlign='left';let y=300;for(const line of lines){if(y>825)break;ctx.fillText(line,124,y,1200);y+=font*1.5}if(lines.length*font*1.5>525){ctx.font='22px Georgia';ctx.fillText('Open the letter to read the full message.',124,847)}ctx.font='italic 31px Georgia';ctx.fillText(this.content.letter.signature,124,925,1180);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.flipY=false;projectSurfaceUV(paper,0,2);group.userData.retiredMaterials??=[];group.userData.retiredMaterials.push(...(Array.isArray(paper.material)?paper.material:[paper.material]));paper.material=new MeshStandardMaterial({map:texture,roughness:.9,side:DoubleSide});
 }
 configurePortal(){
  if(!this.assets.bedroom||!this.keys.length)return;const screen=findSource(this.assets.bedroom,'Portal_screen');if(!screen)throw Error('The laptop display is missing');this.assets.bedroom.updateMatrixWorld(true);screen.geometry.computeBoundingBox();const size=screen.geometry.boundingBox!.getSize(new Vector3()).multiply(screen.getWorldScale(new Vector3()));const aspect=this.host.clientWidth/this.host.clientHeight;
  const [w,h]=portalTargetSize(this.host.clientWidth,this.host.clientHeight,this.renderer.getPixelRatio(),size.x/size.y,this.renderer.capabilities.maxTextureSize);if(w!==this.portal.width||h!==this.portal.height)this.portal.setSize(w,h);
  const closing=new PerspectiveCamera();sampleCamera(closing,this.keys,180,aspect);sampleCamera(this.portalCamera,this.keys,181,aspect);const framing=portalProjection(size.x,size.y,aspect,closing.fov,this.portalCamera.fov);
  this.portalEnd=screen.getWorldPosition(new Vector3()).addScaledVector(new Vector3(0,0,1).applyQuaternion(screen.getWorldQuaternion(new Quaternion())),framing.distance);this.portalOffset.copy(this.portalEnd).sub(closing.position);this.portalCamera.aspect=size.x/size.y;this.portalCamera.fov=framing.renderFov;this.portalCamera.updateProjectionMatrix();
  if(!screen.userData.livePortal){projectSurfaceUV(screen,0,1);this.assets.bedroom.userData.retiredMaterials??=[];this.assets.bedroom.userData.retiredMaterials.push(...(Array.isArray(screen.material)?screen.material:[screen.material]));screen.material=new MeshBasicMaterial({map:this.portal.texture,toneMapped:true,side:DoubleSide});screen.userData.livePortal=true}
  this.portalDirty=false;
 }
 renderPortal(){if(!this.upcomingReady)return;if(this.portalDirty)this.configurePortal();const start=performance.now(),old=this.renderer.getRenderTarget();this.renderer.setRenderTarget(this.portal);this.renderWorld(this.portalCamera);this.renderer.setRenderTarget(old);this.portalFrames++;this.portalMs+=performance.now()-start;this.lastPortalAt=this.clock}
 renderBedroom(){
  this.camera.updateMatrixWorld(true);
  if(!this.bedroomDirty&&this.bedroomPortalFrame===this.portalFrames&&this.bedroomMatrix.equals(this.camera.matrixWorld)&&this.bedroomProjection.equals(this.camera.projectionMatrix))return;
  this.renderer.render(this.bedroom,this.camera);this.bedroomFrames++;
  this.bedroomMatrix.copy(this.camera.matrixWorld);this.bedroomProjection.copy(this.camera.projectionMatrix);this.bedroomPortalFrame=this.portalFrames;this.bedroomDirty=false;
 }
 renderWorld(camera:PerspectiveCamera){
  // Keep the last room frame while its shader variants prepare behind the loading gate.
  if(this.roomRenderer.preparing)return;
  if(!this.worldDirty&&this.journey.assetBlocked&&['doorway','exitDoor'].includes(this.journey.phase))return;
  // Restore every caster for shadow refreshes; only the colour pass may skip hidden objects.
  applyEntryDoorOcclusion(this.assets,this.occlusionBounds,camera.position,this.journey,this.sun.shadow.needsUpdate);
  this.renderer.setOpaqueSort(opaqueFrontToBack);
  try{this.roomRenderer.render(this.world,camera);this.worldDirty=false}finally{this.renderer.setOpaqueSort(null)}
 }
 updateShadowZone(p:number){const zone=p<.40?'garden':p<.675?'salon':'courtyard';if(zone===this.shadowZone)return;this.shadowZone=zone;const center=new Vector3(0,1,zone==='garden'?-.5:zone==='salon'?-4.5:-10.5),extent=zone==='garden'?9:zone==='salon'?5:4.8;this.sun.target.position.copy(center);this.sun.position.copy(center).addScaledVector(SUN_DIRECTION,-15);Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.needsUpdate=true}
 tick=(now:number)=>{
  if(this.disposed)return;const raw=(now-this.last)/1000;this.last=now;const j=this.journey;
  const previousPhase=j.phase;
  if(!document.hidden&&!j.suspended){this.clock+=Math.min(raw,.1);this.wind.value=this.reduced?0:this.clock;j.tick(raw,this.reduced,this.moving)}
  if(j.phase!==previousPhase&&!j.travelling)this.moving=0;
  if(!j.travelling&&j.phase!=='gift'||j.assetBlocked&&this.moving>0)this.moving=0;
  const frame=['exitDoor','exitOpening'].includes(j.phase)?1330:frameAt(j.progress),aspect=this.host.clientWidth/this.host.clientHeight;
  if(this.keys.length){sampleCamera(this.camera,this.keys,frame,aspect,this.host.clientHeight);if(j.progress<.18&&j.progress>.165&&this.portalEnd){const t=(j.progress-.165)/.015;this.camera.position.addScaledVector(this.portalOffset,t*t*(3-2*t))}this.view.update(this.camera,j,this.keys,this.anchors,aspect,raw,this.reduced)}
  const entryMoved=this.actors.door?.set(j.doorT),exitMoved=this.actors['exit-door']?.set(j.exitDoorT),giftMoved=this.actors.gift?.set(j.giftT);
  if(entryMoved||exitMoved||giftMoved){if(shouldRefreshShadow(this.clock-this.lastShadowTime,[entryMoved,j.doorT],[exitMoved,j.exitDoorT],[giftMoved,j.giftT])){this.sun.shadow.needsUpdate=true;this.lastShadowTime=this.clock}if(entryMoved)this.portalDirty=true}
  this.effects.update(this.assets.flames,this.clock,j.extinguished,j.wishT,this.breath,this.reduced,this.camera.position,this.interiorReady&&j.progress>=.18);
  this.arrivalWelcome?.update(document.hidden||j.suspended?0:raw,j.exitDoorT>.3,this.reduced,j.progress<.79);
  const bedroom=j.progress<.18;this.updateShadowZone(bedroom?.18:j.progress);
  if(bedroom&&this.upcomingReady&&(this.portalDirty||!this.reduced&&this.clock-this.lastPortalAt>=(j.progress>.125?0:1/12)))this.renderPortal();
  if(!document.hidden&&(!this.paused||this.worldDirty)){const renderStart=performance.now();if(bedroom)this.renderBedroom();else{this.bedroomDirty=true;this.renderWorld(this.camera)}this.renderTimes.push(performance.now()-renderStart);if(this.renderTimes.length>120)this.renderTimes.shift();if(raw>0&&raw<1&&this.keys.length&&j.phase!=='loading'){this.frames.push(raw*1000);if(this.frames.length>1200)this.frames.shift();this.frameCount++}}
  if(now-this.lastPublish>150){this.onUpdate();this.lastPublish=now}this.raf=requestAnimationFrame(this.tick);
 };
 openDoorAt(x:number,y:number){const name=this.journey.phase==='doorway'?'door':this.journey.phase==='exitDoor'?'exit-door':null;if(!name||!this.assets[name])return false;const r=this.host.getBoundingClientRect(),ray=new Raycaster();this.camera.updateMatrixWorld(true);ray.setFromCamera(new Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);return ray.intersectObject(this.assets[name]!,true).length?(name==='door'?this.journey.openDoor():this.journey.openExitDoor()):false}
 hitsArrival(x:number,y:number){const art=this.arrivalWelcome;if(!art||!art.root.visible)return false;const r=this.host.getBoundingClientRect(),ray=new Raycaster();this.camera.updateMatrixWorld(true);ray.setFromCamera(new Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);return ray.intersectObject(art.root,true).length>0}
 reset(){this.moving=0;this.breath=0;this.view.reset();for(const a of Object.values(this.actors))a.set(0);this.portalDirty=true;this.sun.shadow.needsUpdate=true;this.journey.replay();this.arrivalWelcome?.update(0,false,this.reduced)}
 compareInstancing(enabled:boolean){for(const batch of this.instanceBatches){batch.instance.visible=enabled;for(const mesh of batch.originals)mesh.visible=!enabled}this.sun.shadow.needsUpdate=true;this.frames=[];this.renderTimes=[];return this.diagnostics()}
 diagnostics(){const sorted=[...this.frames].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)]||0,p95=sorted[Math.floor(sorted.length*.95)]||0;const submissions=[...this.renderTimes].sort((a,b)=>a-b);return {...this.journey.snapshot(),instancing:{enabled:this.instanceBatches.some(b=>b.instance.visible),batches:this.instanceBatches.length,originalMeshes:this.instanceBatches.reduce((n,b)=>n+b.originals.length,0)},renderSubmissionMedianMs:+(submissions[Math.floor(submissions.length/2)]||0).toFixed(2),sampledFrames:this.frames.length,frame:frameAt(this.journey.progress),flamesVisible:this.assets.flames?.visible,flameLights:this.effects.lights.map(l=>l.intensity),allReady:this.allReady,portalReady:this.upcomingReady,interiorReady:this.interiorReady,preparedGroups:this.preparedGroups,bedroomFrames:this.bedroomFrames,roomReadyMs:Math.round(this.roomReadyMs),roomGateWaitMs:Math.round(this.roomGateWaitMs),roomRendererFallback:this.roomRenderer.lastFallback,openingLoadMs:Math.round(this.loadedAt),worldReadyMs:Math.round(this.worldReadyMs),preparationMs:Math.round(this.preparationMs),medianFrameMs:+median.toFixed(1),p95FrameMs:+p95.toFixed(1),medianFPS:median?Math.round(1000/median):0,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,textures:this.renderer.info.memory.textures,geometries:this.renderer.info.memory.geometries,programs:this.renderer.info.programs?.length,dpr:this.renderer.getPixelRatio(),resolution:[this.renderer.domElement.width,this.renderer.domElement.height],portalPasses:this.portalFrames,portalSubmissionMs:+(this.portalMs/Math.max(1,this.portalFrames)).toFixed(2),longTasks:this.longTasks.length,longestTaskMs:Math.round(Math.max(0,...this.longTasks)),photoWarnings:this.photoWarnings,texturePool:this.texturePool.diagnostics(),userAgent:navigator.userAgent}}
 dispose(){this.disposed=true;this.depthCleanup.forEach(dispose=>dispose());this.roomRenderer.dispose();this.loadController.abort();this.downloads.clear();cancelAnimationFrame(this.raf);this.observer?.disconnect();if(this.recording?.state==='recording')this.recording.stop();for(const actor of Object.values(this.actors))actor.dispose();for(const batch of this.instanceBatches)batch.instance.dispose();Object.values(this.assets).forEach(disposeGroup);disposeGroup(this.effectsRoot);this.effects.lights.forEach(l=>l.dispose());this.sky.geometry.dispose();this.sky.material.dispose();this.bedroomSun.dispose();this.sun.dispose();this.environment.dispose();this.portal.dispose();this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.renderer.dispose();this.renderer.domElement.remove()}
}
