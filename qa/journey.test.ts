import {test} from 'node:test';import assert from 'node:assert/strict';
import {Journey,DOOR,WISH,EXIT,GIFT,LETTER} from '../lib/world/journey.ts';
function step(j:Journey,s=2){for(let i=0;i<s*60;i++)j.tick(1/60,false)}
function forward(j:Journey,n=100){for(let i=0;i<n&&j.travelling;i++){j.input(1000);step(j,.25)}}
test('rapid input cannot bypass door; event does not retain scroll',()=>{const j=new Journey();j.loaded();j.begin();forward(j);assert.equal(j.phase,'doorway');assert.equal(j.progress,DOOR);assert(j.openDoor());assert(!j.openDoor());forward(j);step(j,4);assert(j.doorOpen);assert(j.progress>=DOOR);});
test('wish, denied microphone fallback, reverse and replay preserve event rules',()=>{const j=new Journey();j.loaded();j.begin();forward(j);j.openDoor();step(j,4);assert.equal(j.progress,DOOR);forward(j);assert.equal(j.phase,'wish');j.listen();j.stopListening();assert(j.makeWish());assert(!j.makeWish());for(let i=0;i<100;i++)j.input(99);step(j,20);assert(j.extinguished);assert.equal(j.progress,WISH);for(let i=0;i<80;i++){j.input(-99);step(j,.25)}assert(j.extinguished);assert(j.doorOpen);forward(j,200);assert.equal(j.phase,'exitDoor');assert.equal(j.progress,EXIT);assert(j.openExitDoor());assert(!j.openExitDoor());step(j,4);assert.equal(j.progress,EXIT);forward(j,200);assert.equal(j.phase,'gift');assert.equal(j.progress,GIFT);assert(j.unwrapGift());step(j,8);assert(j.giftOpened);assert(j.finishGift());forward(j,200);assert.equal(j.phase,'reading');assert.equal(j.progress,LETTER);assert(j.finishReading());forward(j);assert.equal(j.phase,'ending');j.replay();assert.equal(j.progress,0);assert(!j.extinguished);assert(!j.doorOpen);assert(!j.exitDoorOpen);assert(!j.giftOpened);assert.equal(j.mode,'journey');assert.equal(j.phase,'ready')});


test('holding movement covers the same distance at 60, 20, 10, 5 and 3 fps without crossing a story gate',()=>{
 const travel=(fps:number,seconds:number,position=.4,direction=1)=>{const j=new Journey();j.loaded();j.begin();j.doorOpen=true;j.progress=j.target=position;for(let i=0;i<fps*seconds;i++)j.tick(1/fps,false,direction);return j};
 const smooth=travel(60,3);
 for(const fps of [20,10,5,3])assert(Math.abs(travel(fps,3).progress-smooth.progress)<.002,'frame rate must not slow the controls');
 for(const fps of [60,10,3]){const j=travel(fps,12);assert.equal(j.phase,'wish');assert.equal(j.progress,WISH);assert.equal(j.target,WISH);j.tick(.25,false,1);assert.equal(j.progress,WISH);assert(j.makeWish());j.tick(.25,false,1);assert.equal(j.progress,WISH)}
 const reverse=travel(10,2,.5,-1);assert(reverse.progress<.46);assert(reverse.progress>.4);
 const hidden=travel(10,1);hidden.suspended=true;const before=hidden.progress;hidden.tick(.25,false,1);assert.equal(hidden.progress,before);
});
