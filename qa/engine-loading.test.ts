import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as three from 'three';
import * as journey from '../lib/world/journey.ts';
import * as renderWork from '../lib/world/render-work.ts';

// Exercise the real engine coordinator without a browser/GPU constructor.
const source=readFileSync(new URL('../lib/world/engine.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const required=createRequire(import.meta.url),exports:Record<string,any>={};
new Function('require','exports',code)((name:string)=>name==='three'?three:name==='./journey'?journey:name==='./render-work'?renderWork:name==='./assets'?{downloadAsset:async()=>new ArrayBuffer(0)}:name==='./lighting'?{authoredFill:()=>{}}:name==='./camera'?{sampleCamera:()=>{}}:name.startsWith('.')?{}:required(name),exports);
const Engine=exports.WorldEngine;
const until=async(predicate:()=>boolean)=>{for(let i=0;i<150&&!predicate();i++)await new Promise(r=>setTimeout(r,10));assert(predicate(),'engine did not reach expected loading checkpoint')};

test('the birthday room releases its door before preparing later surprises',async()=>{
 const j=new journey.Journey(),stages:string[][]=[];
 const engine=Object.assign(Object.create(Engine.prototype),{
  journey:j,disposed:false,started:performance.now(),host:{clientWidth:1280,clientHeight:720},loadController:new AbortController(),downloads:new Map(),
  bedroom:new three.Scene(),world:new three.Scene(),camera:new three.PerspectiveCamera(),portalCamera:new three.PerspectiveCamera(),
  renderer:{compileAsync:async()=>{},getRenderTarget:()=>null,setRenderTarget:()=>{}},roomRenderer:{prepare:()=>{},warmup:async()=>{}},
  json:async(name:string)=>name==='cameras.json'?[]:{},add:async()=>{},stage:async(names:string[])=>{stages.push(names)},
  onUpdate:()=>{},configurePortal:()=>{},renderPortal:()=>{},
 });
 const loading=engine.load();
 try{
  await until(()=>engine.upcomingReady);
  j.progress=j.target=journey.DOOR;j.phase='doorway';
  await until(()=>engine.interiorReady);
  assert.equal(j.assetLimit,journey.EXIT);
  assert(j.openDoor(),'the complete birthday room must be accessible immediately');
  assert.equal(stages.length,2,'gift decoding must not interrupt the birthday room');
  assert.deepEqual(stages[1],['salon','cake','flames','exit-door','courtyard'],'the courtyard is visible through the room window');
  assert(!engine.allReady);
  j.progress=j.target=journey.EXIT;j.phase='exitDoor';
  await loading;
  assert(engine.allReady);assert.equal(j.assetLimit,1);assert(j.openExitDoor());
  assert.deepEqual(stages[2],['gift','ending']);
 }finally{engine.disposed=true;await loading}
});

test('stationary bedroom reuses its frame but camera, portal and resize changes redraw',()=>{
 const camera=new three.PerspectiveCamera();camera.updateMatrixWorld(true);
 let draws=0;
 const engine=Object.assign(Object.create(Engine.prototype),{camera,bedroom:new three.Scene(),bedroomDirty:true,bedroomMatrix:new three.Matrix4(),bedroomProjection:new three.Matrix4(),bedroomPortalFrame:-1,portalFrames:0,bedroomFrames:0,renderer:{render:()=>{draws++}}});
 assert.equal(typeof engine.renderBedroom,'function','bedroom needs change-based rendering');
 engine.renderBedroom();engine.renderBedroom();assert.equal(draws,1);
 camera.position.x=1;engine.renderBedroom();assert.equal(draws,2);
 camera.fov=40;camera.updateProjectionMatrix();engine.renderBedroom();assert.equal(draws,3);
 engine.portalFrames++;engine.renderBedroom();assert.equal(draws,4);
 engine.bedroomDirty=true;engine.renderBedroom();assert.equal(draws,5);
});

test('closed-door loading retains the last view and resumes rendering when ready or backing away',()=>{
 const j=new journey.Journey();let draws=0;
 const engine=Object.assign(Object.create(Engine.prototype),{journey:j,assets:{},occlusionBounds:new Map(),sun:{shadow:{needsUpdate:false}},renderer:{setOpaqueSort:()=>{}},world:new three.Scene(),roomRenderer:{preparing:false,render:()=>{draws++}}});
 const camera=new three.PerspectiveCamera();
 for(const [limit,phase] of [[journey.DOOR,'doorway'],[journey.EXIT,'exitDoor']] as const){
  j.doorOpen=limit===journey.EXIT;j.extinguished=j.doorOpen;j.progress=j.target=limit;j.phase=phase;j.assetLimit=limit;
  engine.renderWorld(camera);assert.equal(draws,0,'preparation should not compete with redundant door rendering');
 }
 j.setAssetLimit(1);engine.renderWorld(camera);assert.equal(draws,1,'ready view resumes');
 j.assetLimit=journey.EXIT;j.input(-.01);engine.renderWorld(camera);assert.equal(draws,2,'backward movement is still visible');
});
