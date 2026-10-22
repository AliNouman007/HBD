import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BreathInput} from '../lib/world/microphone.ts';

type Sound='wind'|'headset-wind'|'tone'|'speech'|'noisy-speech';
// Deterministic FFT-bin signals keep the time samples and spectrum consistent.
// Wind spans many frequencies; voiced audio has a few harmonic peaks.
const waveforms=new Map<string,{wave:Float32Array;magnitudes:Float64Array}>();
function waveform(sound:Sound,size:number){
 const key=`${sound}-${size}`,cached=waveforms.get(key);if(cached)return cached;
 const weights=new Float64Array(size/2),wave=new Float32Array(size),fundamental=Math.round(280*size/48000);
 for(let bin=1;bin<weights.length;bin++){
  const hz=bin*48000/size;
  weights[bin]=sound==='wind'||sound==='headset-wind'?(hz>=70&&hz<=(sound==='headset-wind'?1400:6000)?1/(1+hz/600):0):sound==='tone'?(bin===Math.round(560*size/48000)?1:0):(bin%fundamental===0&&bin/fundamental<=10?1/(bin/fundamental):0);
 }
 if(sound==='noisy-speech'){
  const noise=Float64Array.from(weights,(_,bin)=>{const hz=bin*48000/size;return hz>=70&&hz<=6000?1/(1+hz/600):0});
  const power=(values:Float64Array)=>values.reduce((sum,n)=>sum+n*n,0);
  // Mix a background noise floor at 20% of the voiced signal's RMS.
  const noiseScale=.2*Math.sqrt(power(weights)/power(noise));
  for(let bin=1;bin<weights.length;bin++)weights[bin]=Math.hypot(weights[bin],noise[bin]*noiseScale);
 }
 let seed=73691;
 for(let bin=1;bin<weights.length;bin++)if(weights[bin]){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const phase=seed/2**32*Math.PI*2;
  for(let i=0;i<size;i++)wave[i]+=weights[bin]*Math.sin(2*Math.PI*bin*i/size+phase);
 }
 const scale=1/Math.sqrt(wave.reduce((sum,n)=>sum+n*n,0)/size);
 for(let i=0;i<size;i++)wave[i]*=scale;
 const result={wave,magnitudes:Float64Array.from(weights,n=>n*scale/2)};waveforms.set(key,result);return result;
}

function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve}}
class Track extends EventTarget {label='USB headset';readyState='live';stopped=false;stop(){this.stopped=true;this.readyState='ended'}end(){this.readyState='ended';this.dispatchEvent(new Event('ended'))}}
class Stream {track=new Track();getTracks(){return [this.track]}getAudioTracks(){return [this.track]}}
async function fixture(run:(f:ReturnType<typeof environment>,mic:BreathInput)=>Promise<void>){
 const f=environment(),keys=['window','navigator','AudioContext','performance','setTimeout','clearTimeout','requestAnimationFrame','cancelAnimationFrame'] as const;
 const originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{value:f.globals[key],configurable:true,writable:true});
 const mic=new BreathInput();try{await run(f,mic)}finally{mic.stop();for(const key of keys){const descriptor=originals.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}}
}
function environment(){
 let now=0,next=1,rms=.001,sound:Sound='wind';const timers=new Map<number,{at:number;fn:()=>void}>(),frames=new Map<number,(t:number)=>void>();
 const streams:Stream[]=[],contexts:Context[]=[],constraints:MediaStreamConstraints[]=[];
 let permission:Promise<void>|undefined,resuming:Promise<void>|undefined,error:Error|undefined;
 class Context {
  state='suspended';closed=0;source:Stream|null=null;sampleRate=48000;
  constructor(){contexts.push(this)}
  async resume(){await resuming;if(this.state!=='closed')this.state='running'}
  async close(){this.closed++;this.state='closed'}
  createMediaStreamSource(stream:Stream){this.source=stream;return {connect(){},disconnect(){}}}
  createAnalyser(){return {
   fftSize:1024,get frequencyBinCount(){return this.fftSize/2},minDecibels:-100,maxDecibels:-30,smoothingTimeConstant:0,disconnect(){},
   getFloatTimeDomainData(samples:Float32Array){const {wave}=waveform(sound,this.fftSize),offset=Math.floor(now*48);for(let i=0;i<samples.length;i++)samples[i]=wave[(i+offset)%wave.length]*rms},
   getFloatFrequencyData(freq:Float32Array){const {magnitudes}=waveform(sound,this.fftSize);for(let i=0;i<freq.length;i++)freq[i]=magnitudes[i]*rms>0?20*Math.log10(magnitudes[i]*rms):-Infinity},
   getByteFrequencyData(freq:Uint8Array){const values=new Float32Array(freq.length);this.getFloatFrequencyData(values);for(let i=0;i<freq.length;i++)freq[i]=Math.max(0,Math.min(255,Math.round((values[i]-this.minDecibels)/(this.maxDecibels-this.minDecibels)*255)))}
  }}
 }
 const globals={window:{isSecureContext:true},navigator:{mediaDevices:{async getUserMedia(options:MediaStreamConstraints){constraints.push(options);const wait=permission;await wait;if(error)throw error;const s=new Stream();streams.push(s);return s}}},AudioContext:Context,performance:{now:()=>now},setTimeout:(fn:()=>void,delay=0)=>{const id=next++;timers.set(id,{at:now+delay,fn});return id},clearTimeout:(id:number)=>timers.delete(id),requestAnimationFrame:(fn:(t:number)=>void)=>{const id=next++;frames.set(id,fn);return id},cancelAnimationFrame:(id:number)=>frames.delete(id)};
 return {globals,streams,contexts,constraints,timers,frames,set signal(value:{rms:number;sound?:Sound}){rms=value.rms;sound=value.sound??'wind'},set permission(value:Promise<void>|undefined){permission=value},set resuming(value:Promise<void>|undefined){resuming=value},set error(value:Error|undefined){error=value},async settle(){for(let i=0;i<8;i++)await Promise.resolve()},jump(ms:number){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn()}},advance(ms:number,frameInterval=16){const end=now+ms;let frameAt=now+frameInterval;while(now<end){let due=Math.min(end,frameAt);for(const timer of timers.values())due=Math.min(due,timer.at);now=due;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn()}if(frameAt<=now){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));frameAt+=frameInterval}}}};
}

test('a mobile stream settling after silent startup learns the room instead of blowing out candles',async()=>fixture(async(f,mic)=>{
 let blows=0;f.signal={rms:0};await mic.start(()=>{},()=>blows++,()=>{});f.advance(640);
 f.signal={rms:.018,sound:'wind'};f.advance(3600);assert.equal(blows,0,'steady background arriving during capture startup must become the room baseline');
}));

test('sustained music tones are not mistaken for a breath above a quiet room',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);
 f.signal={rms:.08,sound:'tone'};f.advance(2000);assert.equal(blows,0,'a loud sustained tone has energy but no turbulent breath spectrum');
}));

test('voiced harmonic audio does not extinguish candles without a blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);
 f.signal={rms:.045,sound:'speech'};f.advance(1600);assert.equal(blows,0,'ordinary voiced harmonics should not be classified as microphone wind');
}));

test('speech mixed with background noise and short gaps is not an intentional blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);
 f.signal={rms:.06,sound:'noisy-speech'};f.advance(1600);assert.equal(blows,0,'sustained voice remains voice when its spectrum includes background noise');
 for(const [rms,duration] of [[.005,600],[.022,520],[.075,780],[.041,640],[.09,920]]){
  f.signal={rms,sound:'noisy-speech'};f.advance(duration);f.signal={rms:.001};f.advance(120);
  assert.equal(blows,0,'changes in speech volume and brief pauses must not accumulate as wind');
 }
 f.signal={rms:.001};f.advance(2400);f.signal={rms:.012,sound:'headset-wind'};f.advance(1200);
 assert.equal(blows,1,'a real headset blow still works after surrounding conversation becomes quiet');
}));

test('quiet headset wind is detected without a treble-only frequency gate',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);f.signal={rms:.012,sound:'headset-wind'};f.advance(280);assert.equal(blows,0,'a brief onset is not yet a deliberate blow');f.advance(920);
 assert.equal(blows,1,'a sustained quiet, low-frequency headset blow should make the wish');assert(f.streams[0].track.stopped);assert.equal(f.contexts[0].state,'closed');f.advance(2000);assert.equal(blows,1);
}));

test('one inconclusive audio frame does not discard a sustained headset blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);
 f.signal={rms:.012,sound:'headset-wind'};f.advance(200);
 f.signal={rms:.012,sound:'tone'};f.advance(40);
 f.signal={rms:.012,sound:'headset-wind'};f.advance(900);
 assert.equal(blows,1,'a single inconclusive frame must not learn ongoing wind as the new room floor');
}));

test('alternating short noise and tone bursts cannot accumulate into a blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);
 for(let i=0;i<10;i++){
  f.signal={rms:.012,sound:'headset-wind'};f.advance(120);
  f.signal={rms:.012,sound:'tone'};f.advance(120);
 }
 assert.equal(blows,0,'repeated unrelated bursts do not prove sustained airflow');
}));

test('microphone sampling continues while animation frames are stalled',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400,100000);f.signal={rms:.08};f.advance(1200,100000);
 assert.equal(blows,1,'render stalls must not stall microphone calibration or detection');
}));

test('brief taps and a steady noisy room do not extinguish candles',async()=>fixture(async(f,mic)=>{
 let blows=0;f.signal={rms:.02};await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);f.signal={rms:.15};f.advance(160);f.signal={rms:.02};f.advance(1800);assert.equal(blows,0);
 f.signal={rms:.07};f.advance(1200);assert.equal(blows,1,'a sustained rise above the room floor still works');
}));

test('early blowing cannot poison calibration after the microphone becomes quiet',async()=>fixture(async(f,mic)=>{
 let blows=0;f.signal={rms:.08};await mic.start(()=>{},()=>blows++,()=>{});f.advance(640);f.signal={rms:.001};f.advance(2400);assert.equal(blows,0);f.signal={rms:.012,sound:'headset-wind'};f.advance(1200);assert.equal(blows,1);
}));

test('a gentle blow can rise through the gap between quiet and trigger levels',async()=>fixture(async(f,mic)=>{
 let blows=0;f.signal={rms:.0003};await mic.start(()=>{},()=>blows++,()=>{},{sensitive:true});f.advance(2400);
 f.signal={rms:.0017,sound:'headset-wind'};f.advance(40);
 f.signal={rms:.003,sound:'headset-wind'};f.advance(1200);
 assert.equal(blows,1,'a normal rising onset must not disarm a microphone already ready for a gentle blow');
}));

test('raising sensitivity needs fresh quiet before a deliberate headset blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{},{deviceId:'headset-1'});f.advance(2400);f.signal={rms:.003};f.advance(800);assert.equal(blows,0);
 mic.setSensitivity(true);f.advance(1200);assert.equal(blows,0,'changing sensitivity must not turn ongoing room noise into a blow');
 f.signal={rms:.001};f.advance(1000);f.signal={rms:.003,sound:'headset-wind'};f.advance(1200);assert.equal(blows,1);assert.equal(f.streams.length,1);assert.deepEqual((f.constraints[0].audio as MediaTrackConstraints).deviceId,{exact:'headset-1'});
}));

test('silent input gives useful guidance and ends with all microphone resources released',async()=>fixture(async(f,mic)=>{
 f.signal={rms:0};const statuses:{message:string;state:string}[]=[];await mic.start(()=>{},()=>assert.fail('silence is not a blow'),(message,state)=>statuses.push({message,state}));
 f.advance(6500);assert(statuses.some(s=>/no sound|not receiving/i.test(s.message)));f.advance(15000);assert.equal(statuses.at(-1)?.state,'ended');assert(f.streams[0].track.stopped);assert.equal(f.contexts[0].state,'closed');assert.equal(f.timers.size+f.frames.size,0);
}));

test('device unplug ends listening immediately and keeps the tap fallback available',async()=>fixture(async(f,mic)=>{
 const statuses:{message:string;state:string}[]=[];await mic.start(()=>{},()=>assert.fail('unplug is not a blow'),(message,state)=>statuses.push({message,state}));f.advance(2400);f.streams[0].track.end();
 assert.equal(statuses.at(-1)?.state,'ended');assert.match(statuses.at(-1)?.message??'',/disconnected|stopped/i);assert.equal(f.contexts[0].state,'closed');assert.equal(f.timers.size+f.frames.size,0);
}));

test('permission denial rejects without leaking a context or capture timer',async()=>fixture(async(f,mic)=>{
 f.error=new DOMException('Permission denied','NotAllowedError');await assert.rejects(mic.start(()=>{},()=>{},()=>{}),{name:'NotAllowedError'});assert.equal(f.timers.size+f.frames.size,0);assert(f.contexts.every(c=>c.state==='closed'));
}));

test('stopping while permission is pending discards a late stream without callbacks',async()=>fixture(async(f,mic)=>{
 const permission=deferred();f.permission=permission.promise;let callbacks=0;const start=mic.start(()=>callbacks++,()=>callbacks++,()=>callbacks++);mic.stop();permission.resolve();await start;
 assert(f.streams.every(s=>s.track.stopped));assert(f.contexts.every(c=>c.state==='closed'));assert.equal(callbacks,0);assert.equal(f.timers.size+f.frames.size,0);
}));

test('a stale resume cannot close a newer listening session',async()=>fixture(async(f,mic)=>{
 const oldResume=deferred();f.resuming=oldResume.promise;const old=mic.start(()=>{},()=>{},()=>{});await f.settle();mic.stop();f.resuming=undefined;await mic.start(()=>{},()=>{},()=>{});const fresh=f.streams.at(-1)!;assert(!fresh.track.stopped);oldResume.resolve();await old;
 assert(!fresh.track.stopped,'late old initialization must not stop the new headset stream');assert.equal(f.contexts.at(-1)?.state,'running');
}));

test('diagnostics show calibration, selected microphone and input activity without recording data',async()=>fixture(async(f,mic)=>{
 await mic.start(()=>{},()=>{},()=>{});assert.equal(mic.diagnostics().state,'calibrating');assert.equal(mic.diagnostics().deviceLabel,'USB headset');f.advance(2400);assert.equal(mic.diagnostics().state,'listening');f.signal={rms:.01};f.advance(160);
 assert(mic.diagnostics().rms>0);assert(mic.diagnostics().hasSignal);assert(mic.diagnostics().level>0);mic.stop();assert.equal(mic.diagnostics().active,false);
}));

test('a long stall and isolated audio samples cannot prove a sustained blow',async()=>fixture(async(f,mic)=>{
 let blows=0;await mic.start(()=>{},()=>blows++,()=>{});f.advance(2400);f.signal={rms:.05};f.jump(333);f.jump(2000);assert.equal(blows,0,'one sample after a long freeze cannot prove sustained wind');f.jump(333);assert.equal(blows,0);f.jump(333);assert.equal(blows,0,'three distant loud samples are not enough evidence');f.signal={rms:.001};f.advance(1000);f.signal={rms:.05};f.advance(1200);assert.equal(blows,1,'regular microphone samples still detect a deliberate blow');
}));

test('a failed audio resume releases the granted stream and preserves an actionable error',async()=>fixture(async(f,mic)=>{
 f.resuming=Promise.reject(new DOMException('Microphone audio could not start','NotAllowedError'));await assert.rejects(mic.start(()=>{},()=>{},()=>{}),{name:'NotAllowedError'});assert(f.streams.every(s=>s.track.stopped));assert(f.contexts.every(c=>c.state==='closed'));assert.equal(f.timers.size+f.frames.size,0);
}));
