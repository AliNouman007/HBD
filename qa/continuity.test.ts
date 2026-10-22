import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PerspectiveCamera,Vector3} from 'three';
import {Journey,frameAt,DOOR,WISH,EXIT,PORTRAIT,CARD,GIFT} from '../lib/world/journey.ts';
import {sampleCamera,type CameraKey} from '../lib/world/camera.ts';
import {WICKS} from '../lib/world/effects.ts';

const keys=JSON.parse(readFileSync('public/world/cameras.json','utf8')) as CameraKey[];
const cameraAt=(p:number,aspect=1.5)=>{
 const camera=new PerspectiveCamera();sampleCamera(camera,keys,frameAt(p),aspect);camera.updateMatrixWorld(true);return camera;
};
test('actual exported camera is continuous at every travel boundary except the portal',()=>{
 for(const p of [DOOR,.5,WISH,EXIT,.68,PORTRAIT,CARD,GIFT,.89,.96]){
  const a=cameraAt(p-1e-7),b=cameraAt(p+1e-7);
  assert(a.position.distanceTo(b.position)<.001,`position discontinuity at ${p}`);
  assert(a.quaternion.angleTo(b.quaternion)<.001,`rotation discontinuity at ${p}`);
  assert(Math.abs(a.fov-b.fov)<.01,`lens discontinuity at ${p}`);
 }
});
test('completed door and wish hold exactly the same camera pose on release',()=>{
 for(const phase of ['doorway','wish'] as const){
  const j=new Journey();j.phase=phase;j.progress=j.target=phase==='doorway'?DOOR:WISH;j.doorOpen=phase==='wish';
  const before=cameraAt(j.progress);
  phase==='doorway'?j.openDoor():j.makeWish();
  for(let i=0;i<1300&&['opening','extinguishing','celebration'].includes(j.phase);i++){j.input(100);j.tick(1/60,false)}
  const after=cameraAt(j.progress);
  assert.equal(j.phase,'travel');assert.equal(j.target,j.progress);
  assert(before.position.distanceTo(after.position)<1e-8);
  assert(before.quaternion.angleTo(after.quaternion)<1e-5);
  assert.equal(before.fov,after.fov);
 }
});
test('wheel bursts accelerate and settle without bypassing or retaining gate input',()=>{
 const j=new Journey();j.loaded();j.begin();
 j.input(.018);const deltas:number[]=[];
 for(let i=0;i<120;i++){const before=j.progress;j.tick(1/60,false);deltas.push(j.progress-before);assert(j.progress<=j.target)}
 assert(deltas[0]<deltas[4]);assert.equal(j.progress,j.target);assert.equal(j.velocity,0);
 for(let i=0;i<1800;i++){j.input(1000);j.tick(1/60,false)}
 assert.equal(j.phase,'doorway');assert.equal(j.progress,DOOR);assert.equal(j.target,DOOR);assert.equal(j.velocity,0);
});
test('all three wick and short smoke centres fit the actual desktop and mobile wish camera',()=>{
 for(const aspect of [1.5,390/844]){
  const camera=cameraAt(WISH,aspect);
  for(const wick of WICKS)for(const height of [0,.23]){
   const p=new Vector3(wick[0],wick[1]+height,wick[2]).project(camera);
   assert(Math.abs(p.x)<.95&&Math.abs(p.y)<.95,`clipped wish composition ${aspect}: ${p.toArray()}`);
  }
 }
});
