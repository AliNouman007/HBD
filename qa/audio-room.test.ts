import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Soundscape} from '../lib/world/audio.ts';
import {Journey,MARKERS,FLAME_OUT,DATE_FORMED,DATE_DURATION} from '../lib/world/journey.ts';
import type {PersonalContent} from '../lib/world/content.ts';

class Param {
 value=0;events:{value:number;time:number}[]=[];now:()=>number;
 constructor(now=()=>0){this.now=now}
 private schedule(value:number,time:number){this.events.push({value,time});this.events.sort((a,b)=>a.time-b.time);this.advance(this.now())}
 setTargetAtTime(v:number,time=0){this.schedule(v,time)}setValueAtTime(v:number,time=0){this.schedule(v,time)}
 exponentialRampToValueAtTime(v:number,time=0){this.schedule(v,time)}linearRampToValueAtTime(v:number,time=0){this.schedule(v,time)}
 cancelScheduledValues(time:number){this.events=this.events.filter(e=>e.time<time)}
 advance(time:number){const event=this.events.filter(e=>e.time<=time).at(-1);if(event)this.value=event.value}
}
class Node {gain:Param;frequency=new Param();Q=new Param();pan=new Param();next:Node|null=null;constructor(now=()=>0){this.gain=new Param(now)}connect<T>(next:T){this.next=next as Node;return next}disconnect(){}}
class Source extends Node {
 buffer:unknown=null;loop=false;started=false;stopped=false;startAt=0;offset=0;stopAt:number|null=null;onended:(()=>void)|null=null;context:Context;
 constructor(context:Context){super();this.context=context}
 start(time=this.context.currentTime,offset=0){this.started=true;this.startAt=time;this.offset=offset}
 stop(time=this.context.currentTime){this.stopAt=time;if(time<=this.context.currentTime)this.finish()}
 finish(){if(this.stopped)return;this.stopped=true;this.onended?.()}
}
class Context {
 currentTime=0;sampleRate=1000;state='suspended';destination=new Node();recording={duration:25.86};applause={duration:3.2};magic={duration:4.2};sources:Source[]=[];buffers:Source[]=[];gains:Node[]=[];
 createGain(){const n=new Node(()=>this.currentTime);this.gains.push(n);return n}createBiquadFilter(){return new Node()}createStereoPanner(){return new Node()}
 createOscillator(){const s=new Source(this);this.sources.push(s);return s}
 createBufferSource(){const s=new Source(this);this.sources.push(s);this.buffers.push(s);return s}
 createBuffer(_channels:number,length:number,sampleRate:number){const data=new Float32Array(length);return {duration:length/sampleRate,getChannelData:()=>data}}
 async decodeAudioData(data:ArrayBuffer){const [id,fail]=new Uint8Array(data);if(fail)throw Error('Undecodable fixture');return [this.recording,this.applause,this.magic][id-1]}async resume(){this.state='running'}async suspend(){this.state='suspended'}async close(){this.state='closed'}
 advance(seconds:number){if(this.state!=='running')return;this.currentTime+=seconds;for(const n of this.gains)n.gain.advance(this.currentTime);for(const s of this.sources)if(s.stopAt!==null&&s.stopAt<=this.currentTime)s.finish()}
}
async function withSound(run:(sound:Soundscape,j:Journey,c:Context)=>void|Promise<void>,failure?:{id:number;decode?:boolean}){
 const originalContext=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),originalFetch=globalThis.fetch;
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});
 globalThis.fetch=async input=>{const id=['/audio/happy-birthday.mp3','/audio/crowd-applause.mp3','/audio/fairy-dust.mp3'].indexOf(String(input))+1;assert(id>0,'known local recording');return failure?.id===id&&!failure.decode?new Response(null,{status:404}):new Response(new Uint8Array([id,Number(failure?.id===id&&failure.decode)]))};
 const sound=new Soundscape({audio:{birthday:'/audio/happy-birthday.mp3',credits:'/audio/credits.json'}} as PersonalContent),j=new Journey();
 try{j.loaded();j.begin();await sound.unlock();await run(sound,j,sound.context as unknown as Context)}
 finally{sound.dispose();globalThis.fetch=originalFetch;if(originalContext)Object.defineProperty(globalThis,'AudioContext',originalContext);else Reflect.deleteProperty(globalThis,'AudioContext')}
}

test('birthday music starts at room entry and continues through the ending until replay',async()=>withSound(async(sound,j,c)=>{
 const songs=()=>c.buffers.filter(s=>s.buffer===c.recording);
 sound.update(j,.1);assert.equal(songs().length,0);
 j.doorOpen=true;j.progress=MARKERS.salonThreshold;sound.update(j,.01);
 assert.equal(songs().length,1);const first=songs()[0];assert(first.started&&first.loop);
 for(const [phase,progress] of [['wish',.56],['listening',.56],['extinguishing',.56],['celebration',.56],['exitDoor',.65],['exitOpening',.65],['memories',.73],['giftReady',.85],['reading',.96],['ending',1]] as const){
  j.phase=phase;j.progress=progress;c.advance(35);sound.update(j,35);
  assert.equal(songs().length,1);assert(!first.stopped,`music continues during ${phase}`);assert(c.gains[1].gain.value>0);
 }
 j.phase='travel';j.progress=.1;sound.update(j,.1);assert(!first.stopped,'reverse movement does not restart or stop the song');
 sound.setMuted(true);assert.equal(c.gains[0].gain.value,0);sound.setMuted(false);await sound.unlock();sound.update(j,.1);assert.equal(songs().length,1);assert(c.gains[0].gain.value>0);
 sound.duckMic(true);assert.equal(c.gains[0].gain.value,0);sound.duckMic(false);assert(c.gains[0].gain.value>0);
 sound.visibility(true);assert.equal(c.state,'suspended');sound.visibility(false);assert.equal(c.state,'running');
 j.replay();sound.update(j,.1);assert(first.stopped);sound.setMuted(true);j.begin();j.doorOpen=true;j.progress=.5;sound.update(j,.1);
 j.phase='ending';j.progress=1;sound.update(j,.1);assert.equal(songs().length,1,'muted entry must preserve the later opportunity to hear the song');
 sound.setMuted(false);await sound.unlock();sound.update(j,.1);assert.equal(songs().length,2,'unmuting after leaving the room starts the song');
 j.replay();sound.update(j,.1);assert(songs()[1].stopped);j.begin();sound.update(j,.1);assert.equal(songs().length,2);
 j.doorOpen=true;j.progress=.5;sound.update(j,.1);assert.equal(songs().length,3);sound.dispose();assert(songs().every(s=>s.stopped));assert.equal(sound.diagnostics().activeSources,0);
}));

function recordingSources(c:Context,buffer:object){return c.buffers.filter(s=>s.buffer===buffer)}
function level(source:Source,c:Context){let value=1;for(let n=source.next;n&&n!==c.gains[0];n=n.next)if(c.gains.includes(n))value*=n.gain.value;return value}

test('doors keep their finite movement cues and candle extinction plays one real applause recording',async()=>withSound((sound,j,c)=>{
 for(const phase of ['opening','exitOpening'] as const){
  j.phase=phase;j.progress=phase==='opening'?MARKERS.door:MARKERS.exit;const before=c.sources.length;sound.update(j,.1);
  const added=c.sources.slice(before);assert(added.some(s=>s.startAt>=c.currentTime+2.5),'door movement ends with a settling contact');
  assert(added.every(s=>!s.loop&&s.stopAt!==null&&s.stopAt<=c.currentTime+3.3));
  const count=c.sources.length;sound.update(j,.1);assert.equal(c.sources.length,count);c.advance(4);
 }
 j.doorOpen=true;j.progress=MARKERS.wish;j.phase='extinguishing';j.wishT=FLAME_OUT-.001;sound.update(j,.1);
 assert.equal(recordingSources(c,c.applause).length,0);const before=c.buffers.length;
 j.wishT=FLAME_OUT;sound.update(j,.01);const applause=recordingSources(c,c.applause);assert.equal(applause.length,1,'use the decoded crowd recording');
 assert(applause[0].started&&!applause[0].loop);assert.equal(applause[0].stopAt,c.currentTime+c.applause.duration);assert(level(applause[0],c)>=1,'the applause has a clear foreground level');
 assert.equal(c.buffers.length-before,2,'only the puff and recording start; no synthesized clap crowd');
 const song=recordingSources(c,c.recording)[0],count=c.sources.length;c.advance(.08);sound.update(j,.08);assert.equal(c.sources.length,count);assert(level(song,c)<.2);
 assert.equal(c.gains[0].gain.value,.62);assert.equal(c.gains[2].gain.value,1);assert.equal(c.gains[3].gain.value,1);
 c.advance(c.applause.duration+1);assert(applause[0].stopped);assert.equal(level(song,c),.8,'the audio clock restores music without another frame');assert(!song.stopped);
}));

test('one fairy-dust recording follows the whole celebration and its final fade while music keeps playing',async()=>withSound((sound,j,c)=>{
 j.doorOpen=true;j.progress=MARKERS.wish;sound.update(j,.1);c.advance(4);const song=recordingSources(c,c.recording)[0];
 j.phase='celebration';j.celebrationT=0;sound.update(j,.1);const magic=recordingSources(c,c.magic)[0];assert(magic?.started&&magic.loop);assert.equal(magic.startAt,c.currentTime);assert.equal(magic.offset,0);
 let previous=0,fullLevel=0;
 for(const at of [.6,2.6,DATE_FORMED,7.5,9.5,10.1,10.8]){
  c.advance(at-previous);previous=at;j.celebrationT=at;sound.update(j,.1);c.advance(.04);
  assert.equal(recordingSources(c,c.magic).length,1,'the same recording continues through every particle stage');assert(!magic.stopped&&magic.stopAt===null);assert(level(magic,c)>0);
  if(at===9.5)fullLevel=level(magic,c);if(at>9.5)assert(level(magic,c)<fullLevel,'fairy dust fades with the particles instead of stopping after the name');
  assert(level(song,c)<.2,'the song makes room for the active fairy dust');assert(!song.stopped);
 }
 j.celebrationT=DATE_DURATION-.001;j.tick(.01,false);assert.equal(j.phase,'travel');sound.update(j,.1);
 assert(magic.stopAt!==null&&magic.stopAt<=c.currentTime+.16);c.advance(.16);assert(magic.stopped);c.advance(1);assert.equal(level(song,c),.8);assert(!song.stopped);
 assert.equal(sound.diagnostics().oneShots,0,'the finished fairy loop releases its owned source');
}));

test('late fairy-dust entry uses the current audio time and early Continue fades it out without restarting the song',async()=>withSound((sound,j,c)=>{
 j.doorOpen=true;j.progress=MARKERS.wish;sound.update(j,.1);c.advance(20);const song=recordingSources(c,c.recording)[0];
 j.phase='celebration';j.celebrationT=8.3;sound.update(j,.1);const magic=recordingSources(c,c.magic)[0];
 assert(magic?.loop);assert.equal(magic.startAt,c.currentTime,'a late start is not scheduled in the audio context past');assert.equal(magic.offset,j.celebrationT%c.magic.duration);
 sound.update(j,.1);assert.equal(recordingSources(c,c.magic).length,1);assert(j.finishCelebration());sound.update(j,.1);
 assert.equal(level(magic,c),0);assert(magic.stopAt!==null&&magic.stopAt>c.currentTime&&magic.stopAt<=c.currentTime+.16,'Continue gives the recording a short fade');
 c.advance(.16);assert(magic.stopped);c.advance(1);assert.equal(level(song,c),.8);assert(!song.stopped);assert.equal(recordingSources(c,c.recording).length,1);
 j.replay();sound.update(j,.1);j.begin();j.doorOpen=true;j.progress=MARKERS.wish;j.phase='celebration';j.celebrationT=1;sound.update(j,.1);
 const second=recordingSources(c,c.magic)[1];assert(second&&!second.stopped);c.advance(.04);assert(level(recordingSources(c,c.recording)[1],c)<.2);
 j.replay();sound.update(j,.1);assert(second.stopped);c.advance(.6);assert.equal(c.gains[4].gain.value,1,'replay cancels the former music-duck deadline');assert.equal(sound.diagnostics().oneShots,0);
}));

test('recorded celebration effects obey mute, microphone, visibility, replay and disposal',async()=>withSound(async(sound,j,c)=>{
 j.doorOpen=true;j.progress=MARKERS.wish;sound.update(j,.1);c.advance(4);sound.setMuted(true);
 j.phase='extinguishing';j.wishT=FLAME_OUT;sound.update(j,.1);j.phase='celebration';j.celebrationT=2;sound.update(j,.1);
 assert.equal(recordingSources(c,c.applause).length,0);assert.equal(recordingSources(c,c.magic).length,0);assert.equal(c.gains[0].gain.value,0);
 sound.setMuted(false);await sound.unlock();j.celebrationT=3;sound.update(j,.1);const first=recordingSources(c,c.magic)[0];assert(first&&!first.stopped);assert.equal(first.offset,3);assert.equal(recordingSources(c,c.applause).length,0,'unmuting does not replay old applause');
 sound.duckMic(true);assert(first.stopped);assert.equal(c.gains[0].gain.value,0);c.advance(1);sound.update(j,.1);assert.equal(recordingSources(c,c.magic).length,1);
 sound.duckMic(false);j.celebrationT=5;sound.update(j,.1);const second=recordingSources(c,c.magic)[1];assert(second&&!second.stopped);assert.equal(second.offset,5%c.magic.duration);
 j.suspended=true;sound.visibility(true);const now=c.currentTime,count=c.sources.length;c.advance(5);sound.update(j,.1);assert.equal(c.state,'suspended');assert.equal(c.currentTime,now);assert.equal(c.sources.length,count);assert(!second.stopped);
 j.suspended=false;sound.visibility(false);sound.update(j,.1);assert.equal(c.state,'running');assert.equal(recordingSources(c,c.magic).length,2,'visibility resumes the same recording');
 sound.setMuted(true);assert(second.stopped);sound.setMuted(false);await sound.unlock();sound.update(j,.1);const third=recordingSources(c,c.magic)[2];assert(third&&!third.stopped);
 j.replay();sound.update(j,.1);assert(third.stopped);assert.equal(sound.diagnostics().oneShots,0);
 j.begin();j.doorOpen=true;j.progress=MARKERS.wish;j.phase='extinguishing';j.wishT=FLAME_OUT;sound.update(j,.1);assert.equal(recordingSources(c,c.applause).length,1,'replay permits the new applause');
 j.phase='celebration';j.celebrationT=.5;sound.update(j,.1);sound.dispose();assert(c.sources.every(s=>s.stopped));assert.equal(c.state,'closed');assert.equal(sound.diagnostics().activeSources,0);
}));

test('a failed or undecodable recording leaves the other recordings and the journey available',async()=>{
 for(const failure of [{id:1},{id:2},{id:3,decode:true}])await withSound((sound,j,c)=>{
  assert(sound.diagnostics().error.length>0);j.doorOpen=true;j.progress=MARKERS.wish;j.phase='extinguishing';j.wishT=FLAME_OUT;sound.update(j,.1);
  assert.equal(recordingSources(c,c.recording).length,failure.id===1?0:1);assert.equal(recordingSources(c,c.applause).length,failure.id===2?0:1);
  j.phase='celebration';j.celebrationT=2;sound.update(j,.1);assert.equal(recordingSources(c,c.magic).length,failure.id===3?0:1);
  j.celebrationT=DATE_FORMED;assert(j.finishCelebration());sound.update(j,.1);c.advance(5);
  assert(recordingSources(c,c.magic).every(s=>s.stopped));assert(recordingSources(c,c.applause).every(s=>s.stopped));if(failure.id!==1)assert(!recordingSources(c,c.recording)[0].stopped);
 },failure);
});


test('the shorter wish transition overlaps full applause with fairy dust without restarting music',async()=>withSound((sound,j,c)=>{
 j.doorOpen=true;j.progress=j.target=MARKERS.wish;j.phase='wish';sound.update(j,0);assert(j.makeWish());
 for(let i=0;i<2*60;i++){j.tick(1/60,false);c.advance(1/60);sound.update(j,1/60)}
 const [applause]=recordingSources(c,c.applause),[magic]=recordingSources(c,c.magic),[song]=recordingSources(c,c.recording);
 assert(applause&&magic&&song);assert(Math.abs(applause.startAt-FLAME_OUT)<.02);assert(Math.abs(magic.startAt-1.7)<.02);
 assert(!applause.stopped&&!magic.stopped&&!song.stopped,'the celebration keeps all three recordings in their intended overlap');
 assert.equal(applause.stopAt,applause.startAt+c.applause.duration,'applause retains its complete recording');
 for(let i=0;i<11*60;i++){j.tick(1/60,false);c.advance(1/60);sound.update(j,1/60)}
 c.advance(.2);assert(applause.stopped&&magic.stopped);assert(!song.stopped);assert.equal(recordingSources(c,c.applause).length,1);assert.equal(recordingSources(c,c.magic).length,1);assert.equal(recordingSources(c,c.recording).length,1);
}));
