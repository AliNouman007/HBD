import {test} from 'node:test';import assert from 'node:assert/strict';
import {Journey,DOOR,WISH,EXIT,GIFT} from '../lib/world/journey.ts';
import {validateContent} from '../lib/world/content.ts';
import {readFileSync} from 'node:fs';
const step=(j:Journey,s:number)=>{for(let i=0;i<s*60;i++)j.tick(1/60,false)};
test('streaming gate discards queued input and requires fresh travel',()=>{const j=new Journey();j.loaded();j.begin();j.setAssetLimit(.165);for(let i=0;i<1000;i++){j.input(999);j.tick(1/60,false)}assert.equal(j.phase,'preparing');assert.equal(j.progress,.165);j.setAssetLimit(DOOR);step(j,2);assert.equal(j.progress,.165);j.input(.01);step(j,1);assert(j.progress>.165)});
test('the entry gate waits for the complete interior assets',()=>{const j=new Journey();j.phase='doorway';j.progress=j.target=DOOR;j.assetLimit=DOOR;assert(!j.openDoor());j.setAssetLimit(EXIT);assert(j.openDoor())});
test('independent second door cannot unlock the wish or retain input',()=>{const j=new Journey();j.phase='exitDoor';j.doorOpen=j.extinguished=true;j.progress=j.target=EXIT;assert(j.openExitDoor());assert(!j.openExitDoor());for(let i=0;i<190&&String(j.phase)==='exitOpening';i++){j.input(999);j.tick(1/60,false)}assert(j.exitDoorOpen);assert.equal(j.progress,EXIT);assert.equal(j.target,EXIT);assert.equal(j.exitDoorT,1)});
test('inspection preserves position, blocks travel, and returns without a queued jump',()=>{for(const [mode,progress] of [['freeLook',.05],['portrait',.73],['receivedCard',.79]] as const){const j=new Journey();j.phase='travel';j.progress=j.target=progress;j.doorOpen=j.exitDoorOpen=j.extinguished=true;assert(j.enterMode(mode));j.input(1000);j.input(-1000);step(j,3);assert.equal(j.progress,progress);assert(j.exitMode());step(j,2);assert.equal(j.progress,progress);assert.equal(j.target,progress)}});
test('gift opening stays on its camera anchor, supports partial reverse and inspect pause',()=>{const j=new Journey();j.phase='gift';j.progress=j.target=GIFT;j.doorOpen=j.exitDoorOpen=j.extinguished=true;for(let i=0;i<20;i++){j.input(.004);step(j,.1)}const partial=j.giftT;assert(partial>0&&partial<1);j.input(-.018);step(j,.4);assert(j.giftT<partial);assert.equal(j.progress,GIFT);j.unwrapGift();step(j,8);assert(j.giftOpened);assert(j.enterMode('teddy'));j.input(999);step(j,2);assert.equal(j.progress,GIFT);assert(!j.finishGift());j.exitMode();assert(j.finishGift());step(j,1);assert.equal(j.progress,GIFT);j.replay();assert.equal(j.giftT,0);assert(!j.giftOpened);assert(!j.exitDoorOpen);assert.equal(j.mode,'journey')});
test('hidden-tab suspension freezes timed events and ignores input',()=>{const j=new Journey();j.phase='wish';j.doorOpen=true;j.progress=j.target=WISH;j.makeWish();j.suspended=true;step(j,30);j.input(999);assert.equal(j.wishT,0);assert.equal(j.progress,WISH);j.suspended=false;step(j,2);assert(j.extinguished)});
test('personal configuration retains the recipient and real portrait and keepsake images',()=>{
 const value=JSON.parse(readFileSync('public/personal-content.json','utf8')),content=validateContent(value);
 assert.equal(content.recipientName,'Musfira');assert.equal(content.birthday!.month,10);assert.equal(content.birthday!.day,25);
 assert.equal(content.portrait.image,'/personal/musfira-portrait.jpg');assert.deepEqual(content.portrait.crop,[0,0,1,1]);
 assert.equal(content.receivedCard.image,'/personal/received-card.jpg');
 for(const photo of [content.portrait,content.receivedCard]){
  assert.equal(photo.placeholder,false);assert(photo.transcription?.trim(),'personal images have a heartfelt note');
  const image=readFileSync(`public${photo.image}`);
  assert(image.length>3,`${photo.image} is not empty`);assert.equal(image.subarray(0,3).toString('hex'),'ffd8ff',`${photo.image} is a JPEG`);
 }
 assert.equal(content.bedroomPhotos.length,2);assert(content.letter.paragraphs.length);
 assert.equal(new Set(content.bedroomPhotos.map(photo=>photo.image)).size,2,'bedroom frames use two distinct photographs');
 for(const photo of content.bedroomPhotos){
  assert.equal(photo.placeholder,false);assert.deepEqual(photo.crop,[0,0,1,1]);
  assert.notEqual(photo.image,content.portrait.image,'bedroom decoration does not reuse the personal portrait');
  assert.notEqual(photo.image,content.receivedCard.image,'bedroom decoration does not reuse the personal keepsake');
  const image=readFileSync(`public${photo.image}`);
  assert(image.length>12,`${photo.image} is not empty`);assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');
 }
 assert.throws(()=>validateContent({...value,portrait:{...value.portrait,image:'https://untrusted.example/photo'}}));
});

test('gift inspection turns around the glTF Y-up axis without rolling the teddy',async()=>{const {ViewController}=await import('../lib/world/view-mode.ts');const {Object3D,PerspectiveCamera,Vector3}=await import('three');const j=new Journey();j.phase='giftReady';j.giftOpened=true;j.progress=GIFT;j.enterMode('teddy');const teddy=new Object3D(),v=new ViewController();v.bindTeddy(teddy);const camera=new PerspectiveCamera(),anchors=JSON.parse(readFileSync('public/world/anchors.json','utf8')),keys=JSON.parse(readFileSync('public/world/cameras.json','utf8'));v.update(camera,j,keys,anchors,1.5,1/60,false);v.rotate(90,0);v.update(camera,j,keys,anchors,1.5,1/60,false);const up=new Vector3(0,1,0).applyQuaternion(teddy.quaternion);assert(up.distanceTo(new Vector3(0,1,0))<1e-6);v.reset();assert(teddy.quaternion.angleTo(new Object3D().quaternion)<1e-6)});

test('idle zero-delta events do not cancel the accessible gift auto-open button',()=>{const j=new Journey();j.phase='gift';j.progress=j.target=GIFT;j.unwrapGift();for(let i=0;i<8*60;i++){j.input(0);j.tick(1/60,false)}assert(j.giftOpened);assert.equal(j.phase,'giftReady')});

test('indirect illumination does not leak through shared wood materials onto unbaked props',async()=>{const {Group,Mesh,PlaneGeometry,MeshStandardMaterial,Texture}=await import('three');const {applyIndirectMap}=await import('../lib/world/assets.ts');const group=new Group(),material=new MeshStandardMaterial(),receiver=new Mesh(new PlaneGeometry(),material),prop=new Mesh(new PlaneGeometry(),material);receiver.geometry.setAttribute('uv1',receiver.geometry.getAttribute('uv').clone());receiver.userData.p2_indirect='bedroom';group.add(receiver,prop);const map=new Texture();map.channel=1;assert.equal(applyIndirectMap(group,'bedroom',map),1);assert.equal((receiver.material as InstanceType<typeof MeshStandardMaterial>).lightMap,map);assert.equal(prop.material.lightMap,null);assert.notEqual(receiver.material,prop.material)});

test('shared image lifetime survives disposal of an earlier staged scene',async()=>{const {TexturePool}=await import('../lib/world/texture-pool.ts');const {Group,Mesh,PlaneGeometry,MeshStandardMaterial,Texture}=await import('three');let firstClosed=0,secondClosed=0;const a=new Texture({width:4,height:4,close:()=>firstClosed++} as never),b=new Texture({width:4,height:4,close:()=>secondClosed++} as never),one=new Group(),two=new Group();one.add(new Mesh(new PlaneGeometry(),new MeshStandardMaterial({map:a})));two.add(new Mesh(new PlaneGeometry(),new MeshStandardMaterial({map:b})));const parser=(texture:InstanceType<typeof Texture>)=>({json:{textures:[{source:0}],images:[{bufferView:0}]},associations:new Map([[texture,{textures:0}]]),getDependency:async()=>new Uint8Array([1,2,3,4]).buffer});const pool=new TexturePool();await pool.share(one,parser(a) as never);await pool.share(two,parser(b) as never);assert.equal(a.source,b.source);assert.equal(secondClosed,1);pool.release(one);assert.equal(firstClosed,0);pool.release(two);assert.equal(firstClosed,1);assert.equal(pool.diagnostics().uniqueEmbeddedImages,0)});


test('gift auto-opening ignores repeated wheel, swipe and held-key input until ready',()=>{
 for(const reduced of [false,true])for(const fps of [60,3]){
  const j=new Journey();j.phase='gift';j.progress=j.target=GIFT;j.doorOpen=j.exitDoorOpen=j.extinguished=true;
  assert(j.unwrapGift());
  for(let i=0;i<8*fps;i++){
   const before=j.giftT;j.input(i%2?.01:-.01);j.input(i%3?.002:-.002);j.tick(1/fps,reduced,i%2?1:-1);
   assert(j.giftT>=before,'incidental input cannot reverse automatic unwrapping');
   assert.equal(j.progress,GIFT);assert.equal(j.target,GIFT);
  }
  assert(j.giftOpened);assert.equal(j.phase,'giftReady');assert.equal(j.giftT,1);assert(j.finishGift());
  j.tick(1/60,reduced);assert.equal(j.progress,GIFT,'opening input cannot queue onward travel');
 }
});

test('replay cancels automatic gift opening and restores manual scrubbing',()=>{
 const j=new Journey();j.phase='gift';j.progress=j.target=GIFT;j.unwrapGift();step(j,1);assert(j.giftT>0);
 j.replay();assert(!j.giftAuto);assert.equal(j.giftT,0);assert.equal(j.giftTarget,0);step(j,8);assert.equal(j.phase,'ready');assert(!j.giftOpened);
 j.phase='gift';j.progress=j.target=GIFT;j.input(.004);step(j,.2);const partial=j.giftT;assert(partial>0);
 j.input(-.004);step(j,.2);assert(j.giftT<partial,'manual reversal before Unwrap is preserved');
});
