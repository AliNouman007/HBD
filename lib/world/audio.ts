import {MARKERS,FLAME_OUT,type Journey} from './journey.ts';
import type {PersonalContent} from './content';
import {dateEnvelope} from './date-particles.ts';
/** Local playback only. Microphone streams never enter this graph. */
export class Soundscape {
 context:AudioContext|null=null;muted=false;unlocked=false;error='';micActive=false;
 private master:GainNode|null=null;private music:GainNode|null=null;private musicDuck:GainNode|null=null;private musicDuckUntil=0;private musicDuckLevel=1;private ambience:GainNode|null=null;private fx:GainNode|null=null;private room:GainNode|null=null;private garden:GainNode|null=null;private ribbon:GainNode|null=null;
 private noise:AudioBuffer|null=null;private crispNoise:AudioBuffer|null=null;private birthdayReached=false;private birthday:AudioBuffer|null=null;private birthdaySource:AudioBufferSourceNode|null=null;private sources=new Set<AudioScheduledSourceNode>();private oneShots=new Set<AudioScheduledSourceNode>();private seen=new Set<string>();private revision=0;private elapsed=0;private previousGift=0;private previousMode='journey';private nextBird=6;private disposed=false;private loading:Promise<void>|null=null;
 private applauseBuffer:AudioBuffer|null=null;private magic:AudioBuffer|null=null;private magicSource:AudioBufferSourceNode|null=null;private magicGain:GainNode|null=null;
 private content:PersonalContent;private prefetched:Promise<(ArrayBuffer|null)[]>|null=null;
 constructor(content:PersonalContent){this.content=content;try{this.muted=localStorage.getItem('birthday-world-sound')==='off'}catch{}
 // Download the songs while the room is still loading, so music can start the moment she taps.
 this.prefetched=Promise.all([content.audio.birthday,'/audio/crowd-applause.mp3','/audio/fairy-dust.mp3'].map(url=>fetch(url).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null)));
 }
 async unlock(){
  if(this.disposed)return;
  try{
   if(!this.context){this.context=new AudioContext();const c=this.context;this.master=c.createGain();this.music=c.createGain();this.ambience=c.createGain();this.fx=c.createGain();this.musicDuck=c.createGain();this.musicDuck.gain.value=1;this.music.connect(this.musicDuck).connect(this.master);this.ambience.connect(this.master);this.fx.connect(this.master);this.master.connect(c.destination);this.master.gain.value=this.muted?0:.62;
    this.noise=c.createBuffer(1,c.sampleRate*24,c.sampleRate);this.crispNoise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0),crisp=this.crispNoise.getChannelData(0);let smooth=0,seed=251025;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/4294967296*2-1;smooth=.985*smooth+.015*white;data[i]=smooth*3;if(i<crisp.length)crisp[i]=white}
    this.room=this.bed(450,this.ambience,.018);this.garden=this.bed(2200,this.ambience,0);this.ribbon=this.bed(4300,this.fx,0);
   }
   await this.context.resume();this.unlocked=true;this.error='';if(!this.loading)this.loading=this.loadRecordings();await this.loading;
  }catch{this.error='Sound is unavailable. Your journey still works without it.'}
 }
 private async loadRecordings(){
  const context=this.context!;
  const raw=await (this.prefetched??Promise.resolve([null,null,null]));
  const decode=async(data:ArrayBuffer|null)=>{if(!data)throw Error('missing');return this.disposed?null:context.decodeAudioData(data.slice(0))};
  const [birthday,applause,magic]=await Promise.allSettled([decode(raw[0]),decode(raw[1]),decode(raw[2])]);if(this.disposed)return;
  this.birthday=birthday.status==='fulfilled'?birthday.value:null;this.applauseBuffer=applause.status==='fulfilled'?applause.value:null;this.magic=magic.status==='fulfilled'?magic.value:null;
  if(!this.birthday)this.error='The birthday recording could not load. Other sounds and the journey remain available.';
  else if(!this.applauseBuffer||!this.magic)this.error='Some celebration sounds could not load. The birthday song and your journey still work.';
 }
 private own<T extends AudioScheduledSourceNode>(source:T,oneShot=true){this.sources.add(source);if(oneShot)this.oneShots.add(source);source.onended=()=>{source.disconnect();this.sources.delete(source);this.oneShots.delete(source)};return source}
 private bed(frequency:number,bus:GainNode,value:number){const c=this.context!,source=this.own(c.createBufferSource(),false),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;source.loop=true;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=value;source.connect(filter).connect(gain).connect(bus);source.start();return gain}
 private gain(node:GainNode|null,value:number,time=.45){if(!this.context||!node)return;node.gain.setTargetAtTime(value,this.context.currentTime,time)}
 setMuted(muted:boolean){this.muted=muted;if(muted)this.stopMagic(true);try{localStorage.setItem('birthday-world-sound',muted?'off':'on')}catch{}this.gain(this.master,muted||this.micActive?0:.62,.08);if(!muted)void this.unlock()}
 duckMic(active:boolean){this.micActive=active;if(active)this.stopMagic(true);this.gain(this.master,active||this.muted?0:.62,active?.025:.3)}
 private note(frequency:number,duration:number,volume=.04,delay=0,bus=this.fx){if(!this.context||!bus||this.muted||this.micActive)return;const c=this.context,time=c.currentTime+delay,osc=this.own(c.createOscillator()),gain=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(.00001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.035);gain.gain.exponentialRampToValueAtTime(.00001,time+duration);osc.connect(gain).connect(bus);osc.start(time);osc.stop(time+duration+.04)}
 private noiseCue(duration:number,frequency:number,volume:number,delay=0){if(!this.context||!this.fx||this.muted||this.micActive)return;const c=this.context,time=c.currentTime+delay,source=this.own(c.createBufferSource()),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.45;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.025);gain.gain.exponentialRampToValueAtTime(.00001,time+duration);source.connect(filter).connect(gain).connect(this.fx);source.start(time,2);source.stop(time+duration+.03)}
 private crispCue(duration:number,frequency:number,volume:number,delay=0,pan=0){
  if(!this.context||!this.fx||!this.crispNoise||this.muted||this.micActive)return;
  const c=this.context,time=c.currentTime+delay,source=this.own(c.createBufferSource()),filter=c.createBiquadFilter(),gain=c.createGain(),stereo=c.createStereoPanner();
  source.buffer=this.crispNoise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;stereo.pan.value=pan;
  gain.gain.setValueAtTime(.00001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.003);gain.gain.exponentialRampToValueAtTime(.00001,time+duration);
  source.connect(filter).connect(gain).connect(stereo).connect(this.fx);source.start(time,(delay*.37)%Math.max(.001,this.crispNoise.duration-duration-.03));source.stop(time+duration+.02);
 }
 private duckMusic(level:number,duration:number){
  if(!this.context||!this.musicDuck)return;
  const now=this.context.currentTime,gain=this.musicDuck.gain,current=gain.value;
  this.musicDuckLevel=now<this.musicDuckUntil?Math.min(this.musicDuckLevel,level):level;
  this.musicDuckUntil=Math.max(this.musicDuckUntil,now+duration);
  // Audio-clock recovery must survive a delayed animation frame or another music-volume update.
  gain.cancelScheduledValues(now);gain.setValueAtTime(current,now);gain.linearRampToValueAtTime(this.musicDuckLevel,now+.025);
  gain.setValueAtTime(this.musicDuckLevel,this.musicDuckUntil);gain.linearRampToValueAtTime(1,this.musicDuckUntil+.28);
 }
 private applause(){
  if(!this.context||!this.fx||!this.applauseBuffer)return;
  const c=this.context,source=this.own(c.createBufferSource()),gain=c.createGain();source.buffer=this.applauseBuffer;gain.gain.value=1.15;
  source.connect(gain).connect(this.fx);source.start();source.stop(c.currentTime+this.applauseBuffer.duration);this.duckMusic(.18,this.applauseBuffer.duration);
 }
 private magicDust(t:number){
  if(!this.context||!this.fx||!this.magic)return;
  const c=this.context;
  if(!this.magicSource){
   const source=this.own(c.createBufferSource()),gain=c.createGain();source.buffer=this.magic;source.loop=true;gain.gain.value=0;
   source.connect(gain).connect(this.fx);source.start(c.currentTime,t%this.magic.duration);this.magicSource=source;this.magicGain=gain;this.seen.add('celebration-fairy-dust');
  }
  // Follow the visible particles, including a delayed frame or an early Continue.
  this.gain(this.magicGain,.85*dateEnvelope(t),.06);this.duckMusic(.2,.6);
 }
 private stopMagic(immediate=false){
  if(!this.magicSource)return;
  const now=this.context?.currentTime??0;this.magicGain?.gain.cancelScheduledValues(now);this.magicGain?.gain.setTargetAtTime(0,now,.035);
  this.magicSource.stop(now+(immediate?0:.15));this.magicSource=null;this.magicGain=null;
 }
 private doorCue(exit:boolean){
  const settle=exit?2.84:2.78;
  this.crispCue(.045,exit?1850:2100,.075);this.crispCue(.09,exit?520:430,.06,.055);this.note(exit?110:98,.12,.015,.055);
  this.noiseCue(2.3,exit?380:300,.095,.22);this.crispCue(.12,exit?650:500,.065,settle);this.note(exit?92:82,.16,.018,settle);
 }
 private once(id:string,play:()=>void){if(this.seen.has(id))return;this.seen.add(id);if(this.unlocked&&!this.muted&&!this.micActive)play()}
 private chord(notes:number[],volume=.028){notes.forEach((n,i)=>this.note(n,2.8,volume,.12*i,this.music))}
 sparkle(){if(!this.unlocked||this.muted||this.micActive)return;[1046.5,1318.51,1567.98,2093].forEach((f,i)=>this.note(f,.8,.028,i*.06))}
 endingSoft=false;
 setEndingSoft(soft:boolean){this.endingSoft=soft}
 ding(i=0){if(!this.unlocked||this.muted||this.micActive)return;this.note(1046.5+i*110,.45,.03);this.note(1567.98+i*110,.35,.018,.05)}
 blip(){if(!this.unlocked||this.muted||this.micActive)return;this.note(660+Math.random()*440,.22,.02)}
 pop(){if(!this.unlocked||this.muted||this.micActive)return;this.noiseCue(.5,380,.14);this.crispCue(.05,2600,.05)}
 finale(){if(!this.unlocked||this.muted||this.micActive)return;this.chord([523.25,659.25,783.99,1046.5],.03);this.applause()}
 popper(){if(!this.unlocked||this.muted||this.micActive)return;this.crispCue(.04,3200,.09);this.noiseCue(.4,1500,.13)}
 update(j:Journey,dt:number){
  if(j.revision!==this.revision){this.reset();this.revision=j.revision}if(j.suspended)return;this.elapsed+=Math.min(dt,.25);const p=j.progress;
  const silent=['loading','error','wish','listening','extinguishing'].includes(j.phase),outside=p>=.18&&p<MARKERS.door||p>MARKERS.exit;
  this.gain(this.room,silent?0:outside?.007:.021,1);this.gain(this.garden,silent?0:outside?.085:.015,1.2);
  if(j.doorOpen&&p>=MARKERS.salonThreshold)this.birthdayReached=true;
  const birthdayActive=!['loading','ready','error'].includes(j.phase);
  this.gain(this.music,!birthdayActive?0:j.phase==='reading'||j.phase==='ending'&&this.endingSoft?.3:this.birthdayReached?.8:.45,j.phase==='reading'||this.endingSoft?1.2:this.birthdayReached?.15:.6);this.gain(this.ambience,this.micActive?0:1,.08);this.gain(this.fx,this.micActive?0:1,.08);
  if(p>=.15)this.once('portal',()=>{this.noiseCue(1.6,850,.12);this.note(523.25,2,.025,.35)});
  if(j.phase==='opening')this.once('entry-door',()=>this.doorCue(false));
  if(!birthdayActive)this.stopBirthday();
  else if(this.unlocked&&!this.muted&&!this.micActive&&this.context&&this.music&&this.birthday&&!this.birthdaySource){
   const source=this.own(this.context.createBufferSource(),false);source.buffer=this.birthday;source.loop=true;source.connect(this.music);source.start();this.birthdaySource=source;
  }
  if(j.wishT>=FLAME_OUT){this.once('puff',()=>this.noiseCue(.32,850,.16));this.once('applause',()=>this.applause())}
  if(j.wishT>=FLAME_OUT+.1)this.once('wish-rise',()=>[659.25,783.99,987.77,1318.51].forEach((f,i)=>this.note(f,1.4,.022,i*.2)));
  if(j.phase==='celebration'&&j.celebrationT>.85)this.once('wish-burst',()=>this.chord([1046.5,1318.51,1567.98],.014));
  if(j.phase==='celebration'&&this.unlocked&&!this.muted&&!this.micActive)this.magicDust(j.celebrationT);else this.stopMagic();
  if(j.phase==='exitOpening')this.once('exit-door',()=>this.doorCue(true));
  if(j.exitDoorT>.3)this.once('arrival-chime',()=>this.chord([523.25,659.25,783.99,1046.5],.016));
  const giftSpeed=Math.min(1,Math.abs(j.giftT-this.previousGift)/Math.max(dt,.016)*3);this.previousGift=j.giftT;this.gain(this.ribbon,j.phase==='gift'?giftSpeed*.09:0,.1);
  if(j.giftOpened)this.once('gift',()=>this.chord([392,493.88,587.33],.023));
  if(j.mode!==this.previousMode&&['portrait','receivedCard'].includes(j.mode))this.noiseCue(.35,1800,.14);this.previousMode=j.mode;
  if(j.phase==='reading')this.once('letter',()=>{this.noiseCue(.4,1400,.15);this.chord([261.63,392],.012)});
  if(j.phase==='ending'&&j.endingT>1)this.once('ending',()=>this.chord([261.63,329.63,392],.02));
  if(this.elapsed>this.nextBird){this.nextBird=this.elapsed+9+Math.random()*13;if(outside&&!silent){this.note(2100,.16,.010);this.note(2750,.13,.009,.16);this.note(2380,.23,.007,.33)}}
 }
 visibility(hidden:boolean){if(hidden){void this.context?.suspend()}else if(this.unlocked&&!this.muted){void this.context?.resume().catch(()=>{this.error='Tap Sound on to resume.'})}}
 private stopBirthday(){if(this.birthdaySource){this.birthdaySource.stop();this.birthdaySource=null}}
 reset(){this.stopMagic(true);this.stopBirthday();this.birthdayReached=false;this.musicDuckUntil=0;this.musicDuckLevel=1;if(this.context&&this.musicDuck){this.musicDuck.gain.cancelScheduledValues(this.context.currentTime);this.gain(this.musicDuck,1,.03)}for(const s of this.oneShots){try{s.stop()}catch{}}this.oneShots.clear();this.seen.clear();this.elapsed=0;this.previousGift=0;this.nextBird=6;this.previousMode='journey';this.duckMic(false);this.gain(this.ribbon,0,.01)}
 diagnostics(){return {unlocked:this.unlocked,muted:this.muted,state:this.context?.state??'not-created',micDucked:this.micActive,recordingLoaded:!!this.birthday,applauseLoaded:!!this.applauseBuffer,magicLoaded:!!this.magic,magicPlaying:!!this.magicSource,birthdayLooping:!!this.birthdaySource,recordingSeconds:this.birthday?.duration??0,activeSources:this.sources.size,oneShots:this.oneShots.size,cues:[...this.seen],error:this.error}}
 dispose(){this.disposed=true;this.stopMagic(true);this.stopBirthday();for(const s of this.sources){try{s.stop()}catch{}s.disconnect()}this.sources.clear();this.oneShots.clear();void this.context?.close();this.context=null;this.birthday=this.applauseBuffer=this.magic=this.noise=this.crispNoise=null}
}
