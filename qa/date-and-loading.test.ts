import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Journey,WISH,FLAME_OUT,WISH_RELEASE,DATE_FORMED,DATE_DURATION} from '../lib/world/journey.ts';
import {prepareInBatches} from '../lib/world/preparation.ts';
import {portalTargetSize} from '../lib/world/camera.ts';
test('portal image retains viewport pixel density on desktop and mobile',()=>{
 for(const [width,height,dpr] of [[1440,900,1.5],[390,844,1.25]]){
  const [w,h]=portalTargetSize(width,height,dpr,1.68,8192);
  assert(w>=width*dpr&&h>=height*dpr);assert(Math.abs(w/h-1.68)<.003);
 }
 const limited=portalTargetSize(8000,6000,2,1.68,4096);assert(Math.max(...limited)<=4096);
});
test('the date reveal cannot be skipped while forming or repeated by reverse input',()=>{
 const j=new Journey();j.phase='wish';j.doorOpen=true;j.progress=j.target=WISH;j.makeWish();
 for(let i=0;i<8*60&&String(j.phase)==='extinguishing';i++)j.tick(1/60,false);
 assert.equal(j.phase,'celebration');assert(j.extinguished);assert(!j.finishCelebration());
 for(let i=0;i<Math.ceil(DATE_FORMED*60)+1;i++){j.input(999);j.input(-999);j.tick(1/60,false)}
 assert.equal(j.progress,WISH);assert.equal(j.target,WISH);assert(j.finishCelebration());assert(!j.finishCelebration());
 j.input(-.01);for(let i=0;i<200;i++)j.tick(1/60,false);
 assert(j.celebrationSeen);assert(j.extinguished);assert.notEqual(j.phase,'celebration');
 j.replay();assert(!j.celebrationSeen);assert.equal(j.celebrationT,0);assert(!j.extinguished);
});
test('date auto-completes without input and releases at the unchanged camera pose',()=>{
 const j=new Journey();j.phase='celebration';j.doorOpen=j.extinguished=true;j.progress=j.target=WISH;
 for(let i=0;i<Math.ceil(DATE_DURATION*60)+1;i++)j.tick(1/60,true);
 assert.equal(j.phase,'travel');assert.equal(j.progress,WISH);assert.equal(j.target,WISH);assert(j.celebrationSeen);
});
test('budgeted texture preparation yields and preserves every item in order',async()=>{
 let time=0,yields=0;const seen:number[]=[];
 await prepareInBatches([1,2,3,4,5,6],n=>{seen.push(n);time+=2},{budgetMs:4,now:()=>time,yieldFrame:async()=>{yields++}});
 assert.deepEqual(seen,[1,2,3,4,5,6]);assert.equal(yields,3);
 const stopped:number[]=[];
 await prepareInBatches([1,2,3],n=>stopped.push(n),{cancelled:()=>stopped.length===1});assert.deepEqual(stopped,[1]);
});


test('birthday sparkles start 450 ms after candle-out, while the full smoke tail continues',()=>{
 for(const reduced of [false,true]){
  const j=new Journey();j.phase='wish';j.doorOpen=true;j.progress=j.target=WISH;assert(j.makeWish());
  for(let i=0;i<74;i++)j.tick(1/60,reduced);
  assert(!j.extinguished);assert(j.wishT<FLAME_OUT);
  for(let i=74;i<101;i++)j.tick(1/60,reduced);
  assert(j.extinguished);assert.equal(j.phase,'extinguishing');
  for(let i=0;i<2;i++)j.tick(1/60,reduced);
  assert.equal(j.phase,'celebration');assert(j.wishT>=1.7&&j.wishT<1.75);assert(j.celebrationT<=1/60);
  assert.equal(j.progress,WISH);assert.equal(j.target,WISH);
  const before=j.wishT;j.tick(1/60,reduced);assert(Math.abs(j.wishT-before-1/60)<1e-9,'the smoke clock advances exactly once per frame');
  for(let i=0;i<Math.ceil(DATE_FORMED*60);i++)j.tick(1/60,reduced);
  assert(j.wishT<WISH_RELEASE,'the original smoke tail is still running when Continue becomes ready');assert(j.finishCelebration());
  const tailBefore=j.wishT;j.tick(1/60,reduced);assert(j.wishT>tailBefore,'early Continue does not freeze the smoke');
  for(let i=0;i<2*60;i++)j.tick(1/60,reduced);
  assert.equal(j.wishT,WISH_RELEASE,'smoke reaches its original fade-out endpoint');assert(j.extinguished);
 }
});
