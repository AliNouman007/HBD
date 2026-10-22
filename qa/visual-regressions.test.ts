import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,PlaneGeometry,MeshBasicMaterial,PointLight,PropertyBinding,Vector3} from 'three';
import {sourceName,projectSurfaceUV} from '../lib/world/assets.ts';
import {CandleEffects} from '../lib/world/effects.ts';
import {Journey,WISH_RELEASE,DATE_DURATION,frameAt} from '../lib/world/journey.ts';
import {portalProjection,sampleCamera} from '../lib/world/camera.ts';
test('sanitized glTF door and flame control names still resolve',()=>{
 for(const name of ['DOOR • inward hinge.001','HANDLE • lever spindle.001','Hero flame 1 • motion pivot']){
  const o=new Group();o.name=PropertyBinding.sanitizeNodeName(name);
  assert(sourceName(o).includes(name.includes('hinge')?'inward hinge':name.includes('HANDLE')?'lever spindle':'motion pivot'));
 }
});
test('an older exported portal without UVs receives all four texture corners',()=>{
 const g=new PlaneGeometry(.3314,.197);g.deleteAttribute('uv');const mesh=new Mesh(g,new MeshBasicMaterial());
 projectSurfaceUV(mesh,0,1);const uv=mesh.geometry.getAttribute('uv');
 assert.deepEqual(new Set(Array.from({length:uv.count},(_,i)=>`${uv.getX(i)},${uv.getY(i)}`)),new Set(['0,0','0,1','1,0','1,1']));
});
test('portal display covers both desktop and portrait viewports at the cut',()=>{
 for(const aspect of [.462,1.6,2.4]){
  const result=portalProjection(.3314,.197,aspect,45,40);
  const viewHeight=2*result.distance*Math.tan(45*Math.PI/360);
  assert(viewHeight<=.197);assert(viewHeight*aspect<=.3314);
  const visibleGardenTan=Math.tan(result.renderFov*Math.PI/360)*viewHeight/.197;
  assert(Math.abs(visibleGardenTan-Math.tan(40*Math.PI/360))<1e-6);
 }
});
test('three visible smoke plumes and zero flame lights persist during the held wish',()=>{
 const effects=new CandleEffects(new Group());const flames=new Group();const camera=new Vector3(-.55,1.27,-2.7);
 effects.update(flames,3,true,3,0,false,camera);
 assert.equal(effects.smoke.length,3);
 assert(effects.smoke.every(m=>m.visible&&(m.material as any).uniforms.uOpacity.value>.25&&(m.material as any).uniforms.uOpacity.value<.5));
 assert(effects.lights.every(l=>l.intensity===0));assert.equal(flames.visible,false);
 effects.update(flames,8,true,WISH_RELEASE,0,false,camera);assert(effects.smoke.every(m=>!m.visible));
 effects.update(flames,0,false,0,0,false,camera);assert(flames.visible);assert(effects.lights.every(l=>l.intensity>0));
});
test('candle lighting stays mounted through portal entry, reversal and extinguishing',()=>{
 const group=new Group(),effects=new CandleEffects(group),camera=new Vector3(-.55,1.27,-2.7),ids=effects.lights.map(l=>l.id);
 assert.equal(ids.length,3);assert(effects.lights.every(l=>l.intensity===0));
 for(const state of [
  {enabled:false,extinguished:false,eventT:0,intensity:0,smoke:false},
  {enabled:true,extinguished:false,eventT:0,intensity:.08,smoke:false},
  {enabled:false,extinguished:false,eventT:0,intensity:0,smoke:false},
  {enabled:false,extinguished:true,eventT:3,intensity:0,smoke:false},
  {enabled:true,extinguished:true,eventT:3,intensity:0,smoke:true}
 ]){
  effects.update(undefined,3,state.extinguished,state.eventT,0,true,camera,state.enabled);
  const visible:number[]=[];group.traverseVisible(o=>{if(o instanceof PointLight)visible.push(o.id)});assert.deepEqual(visible,ids);
  assert(effects.lights.every(l=>l.intensity===state.intensity&&l.color.getHexString()==='ffad5b'));
  assert(effects.smoke.every(m=>m.visible===state.smoke&&(m.material as any).uniforms.uOpacity.value===(state.smoke?.42:0)));
 }
});
test('camera gate holds through overlapping smoke and birthday sparkles without retaining movement',()=>{
 const j=new Journey();j.phase='wish';j.doorOpen=true;j.progress=j.target=.56;j.makeWish();
 const effects=new CandleEffects(new Group()),flames=new Group(),camera=new Vector3(-.55,1.27,-2.7);
 for(let i=0;i<240;i++){j.input(i%2?1000:-1000);j.tick(1/60,false)}
 assert.equal(j.phase,'celebration');assert.equal(j.progress,.56);assert.equal(j.target,.56);assert(j.extinguished);assert(!j.finishCelebration(),'the birthday message must finish forming first');
 effects.update(flames,4,j.extinguished,j.wishT,0,false,camera);
 assert(effects.smoke.every(m=>m.visible),'the original smoke overlaps the birthday particles');assert(!flames.visible);assert(effects.lights.every(l=>l.intensity===0));
 for(let i=0;i<210;i++){j.input(i%2?1000:-1000);j.tick(1/60,false)}
 effects.update(flames,7.5,j.extinguished,j.wishT,0,false,camera);
 assert(effects.smoke.every(m=>!m.visible),'the smoke finishes fading while celebration continues');assert.equal(j.phase,'celebration');
 for(let i=0;i<Math.ceil(DATE_DURATION*60)+1&&String(j.phase)==='celebration';i++){j.input(i%2?1000:-1000);j.tick(1/60,false)}
 assert.equal(j.phase,'travel');assert.equal(j.progress,.56);assert.equal(j.target,.56);
 j.tick(.25,false);assert.equal(j.progress,.56,'movement during the moment is discarded');
});

test('letter gate holds the authored close view without skipping ahead',()=>{assert.equal(frameAt(.96),2520);assert(Math.abs(frameAt(.96-1e-7)-2520)<.01)});


test('portrait cake framing enlarges the cake above controls and restores other views',async()=>{
 const {PerspectiveCamera}=await import('three');
 const keys=[{f:1,p:[0,0,0],q:[0,0,0,1],lens:42,sensor:36},{f:1500,p:[0,0,0],q:[0,0,0,1],lens:42,sensor:36}];
 const camera=new PerspectiveCamera(),aspect=390/844,point=new Vector3(.2,0,-2);
 sampleCamera(camera,keys,780,aspect);camera.updateMatrixWorld();
 const before=point.clone().project(camera),baseFov=camera.fov;
 sampleCamera(camera,keys,945,aspect);camera.updateMatrixWorld();const cake=point.clone().project(camera);
 assert(cake.x>before.x*1.25,'cake should occupy more of a narrow screen');
 assert(cake.y>before.y,'cake should sit above its previous position');
 assert(camera.fov<baseFov);
 sampleCamera(camera,keys,1200,aspect);assert.equal(camera.fov,baseFov);assert(!camera.view?.enabled);
 for(const frame of [1,180,181,385,780,945,1200,1500]){
  sampleCamera(camera,keys,frame,16/9);
  assert(Math.abs(camera.fov-2*Math.atan(36/(2*42*(16/9)))*180/Math.PI)<1e-10);
  assert(!camera.view?.enabled,'desktop projection must stay authored');
 }
 for(const boundary of [780,945,1200]){
  sampleCamera(camera,keys,boundary-.001,aspect);const before=camera.projectionMatrix.clone();
  sampleCamera(camera,keys,boundary+.001,aspect);
  assert(before.elements.every((v,i)=>Math.abs(v-camera.projectionMatrix.elements[i])<.0001),'framing transitions must be continuous');
 }
});


test('short landscape cake view leaves the right side for controls without changing desktop',async()=>{
 const {PerspectiveCamera}=await import('three');
 const keys=[{f:945,p:[0,0,0],q:[0,0,0,1],lens:42,sensor:36}];
 const camera=new PerspectiveCamera();sampleCamera(camera,keys,945,844/390,720);const desktop=camera.fov;
 sampleCamera(camera,keys,945,844/390,390);camera.updateMatrixWorld();
 assert(camera.fov>desktop,'landscape phone should fit more vertical cake detail');
 const center=new Vector3(0,0,-2).project(camera);assert(center.x<0&&center.y>0);
 sampleCamera(camera,keys,945,844/390,720);assert.equal(camera.fov,desktop);assert(!camera.view?.enabled);
});
