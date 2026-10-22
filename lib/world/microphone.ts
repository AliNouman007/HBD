export type BreathStatus='calibrating'|'listening'|'ended';
// Local, transient analysis. No recording, persistence or network.
function hasAirflowSpectrum(frequencies:Float32Array,binHz:number,rms:number){
 let total=0;const bands=[];
 for(const [low,high] of [[70,700],[700,3000],[3000,8000]]){
  let energy=0,logEnergy=0,count=0;
  for(let i=Math.ceil(low/binHz);i<Math.min(frequencies.length,Math.ceil(high/binHz));i++){
   const power=Math.max(1e-20,10**(frequencies[i]/10));
   energy+=power;logEnergy+=Math.log(power);count++;
  }
  total+=energy;bands.push({energy,flatness:count?Math.exp(logEnergy/count)/(energy/count):0});
 }
 // A meaningful band must contain distributed wind noise, not a tone plus a tiny noise floor.
 // Low-frequency airflow remains valid for headsets that filter out treble.
 return total>rms*rms*.02&&bands.some(b=>b.energy>total*.35&&b.flatness>.18);
}
export class BreathInput {
 private stream:MediaStream|null=null;private context:AudioContext|null=null;private timer:ReturnType<typeof setTimeout>|null=null;private generation=0;private disconnect:(()=>void)|null=null;
 private state:BreathStatus|'idle'='idle';private sensitive=false;private armed=false;private quietMs=0;private candidateSamples=0;private rejectedMs=0;private airflow=false;private deviceLabel='';private rms=0;private threshold=.006;private level=0;private sustainedMs=0;private hasSignal=false;
 setSensitivity(sensitive:boolean){this.sensitive=sensitive;this.sustainedMs=0;this.candidateSamples=0;this.rejectedMs=0;this.quietMs=0;this.armed=false}
 diagnostics(){return {state:this.state,active:!!this.stream,deviceLabel:this.deviceLabel,rms:this.rms,threshold:this.threshold,level:this.level,sustainedMs:this.sustainedMs,hasSignal:this.hasSignal,airflow:this.airflow,armed:this.armed}}
 async start(onLevel:(n:number)=>void,onBlow:()=>void,onStatus:(message:string,state:BreathStatus)=>void,options:{deviceId?:string;sensitive?:boolean}={}){
  this.stop();const generation=this.generation;if(options.sensitive!==undefined)this.sensitive=options.sensitive;
  this.deviceLabel='';this.rms=0;this.hasSignal=false;this.threshold=this.sensitive ? .002 : .006;this.airflow=false;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access needs HTTPS and an available microphone. You can still tap to make your wish.');
  // Resume within the button gesture, before a permission prompt can consume it.
  const context=new AudioContext();this.context=context;const resumed=context.resume().then(()=>null,(error:unknown)=>error);let stream:MediaStream|null=null;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(options.deviceId?{deviceId:{exact:options.deviceId}}:{})},video:false});
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());void context.close().catch(()=>{});return}
   this.stream=stream;const resumeError=await resumed;
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());void context.close().catch(()=>{});return}
   if(resumeError)throw resumeError;
   const track=stream.getAudioTracks()[0];if(!track||track.readyState==='ended')throw new Error('The microphone disconnected. Reconnect it and try again, or tap to make your wish.');
   this.deviceLabel=track.label||'Selected microphone';
   const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;source.connect(analyser);
   const samples=new Float32Array(analyser.fftSize),frequencies=new Float32Array(analyser.frequencyBinCount),quiet:number[]=[];let started=performance.now(),last=started,baseline=.001,calibrated=false,previousAbove=false,noSignalNotice=false;
   const roomFloor=()=>{const sorted=[...quiet].sort((a,b)=>a-b);return Math.max(.0001,sorted[Math.floor((sorted.length-1)*.8)])};
   const status=(message:string,state:BreathStatus)=>{this.state=state;onStatus(message,state)};
   const end=(message:string)=>{if(generation!==this.generation)return;this.stop();status(message,'ended')};
   const disconnected=()=>end('Your microphone disconnected. Reconnect it and try again, or choose Tap to make a wish.');
   track.addEventListener('ended',disconnected);
   this.disconnect=()=>{track.removeEventListener('ended',disconnected);source.disconnect();analyser.disconnect()};
   status('Stay quiet for one moment while your microphone gets ready…','calibrating');
   const sample=()=>{
    if(generation!==this.generation)return;
    const now=performance.now(),dt=now-last;last=now;analyser.getFloatTimeDomainData(samples);
    let mean=0;for(const value of samples)mean+=value;mean/=samples.length;
    let energy=0;for(const value of samples)energy+=(value-mean)**2;this.rms=Math.sqrt(energy/samples.length);this.hasSignal||=this.rms>.00001;
    if(!calibrated){
     // Initial zeroes and capture gain settling must not become a permanently quiet floor.
     if(now-started>=300)quiet.push(this.rms);
     if(now-started>=1600&&quiet.length>=20){baseline=roomFloor();calibrated=true;quiet.splice(0,Math.max(0,quiet.length-20))}
    }else{
     this.threshold=Math.max(this.sensitive ? .002 : .006,baseline*(this.sensitive?1.7:3));
     analyser.getFloatFrequencyData(frequencies);this.airflow=hasAirflowSpectrum(frequencies,context.sampleRate/analyser.fftSize,this.rms);
     const wasArmed=this.armed;
     if(dt>500){this.sustainedMs=0;this.candidateSamples=0;this.rejectedMs=0;this.armed=false;this.quietMs=0}
     const loud=this.armed&&this.rms>this.threshold;
     if(loud&&!this.airflow)this.rejectedMs+=Math.min(dt,100);
     const candidate=loud&&this.rejectedMs<=200,above=candidate&&this.airflow;
     if(candidate){
      // Brief uncertain FFT frames must not teach the noise floor that a real breath is ambient sound.
      // They earn no evidence, and the total grace budget prevents separate noises from accumulating.
      if(above){this.sustainedMs+=previousAbove?Math.min(dt,100):0;this.candidateSamples++}
     }else{
      this.sustainedMs=0;this.candidateSamples=0;this.rejectedMs=0;
      if(this.rms<this.threshold*.75){
       this.quietMs+=Math.min(dt,100);
       if(!this.armed&&this.quietMs>=350){this.armed=true;status('Ready! Blow steadily toward your microphone for 2 seconds.','listening')}
      }else{this.quietMs=0;if(this.rms>this.threshold)this.armed=false}
      quiet.push(this.rms);if(quiet.length>20)quiet.shift();baseline=roomFloor();
     }
     if(wasArmed&&!this.armed)status('Pause for a quiet moment, then blow steadily for 2 seconds.','calibrating');
     previousAbove=above;
     if(this.sustainedMs>=700&&this.candidateSamples>=8){this.stop();onBlow();return}
     if(!this.hasSignal&&now-started>=5000&&!noSignalNotice){noSignalNotice=true;status('No sound is reaching this microphone. Check its mute switch or open Mic options to choose your headset. You can still choose Tap to make a wish.','listening')}
     else if(noSignalNotice&&this.hasSignal){noSignalNotice=false;status('Sound is reaching your microphone. Blow steadily toward it for 2 seconds.','listening')}
    }
    this.level=Math.min(1,this.rms/this.threshold);onLevel(this.level);
    if(now-started>=20000){end(this.hasSignal?'No breath detected yet. Open Mic options to try Gentle blow or choose your headset, or choose Tap to make a wish.':'No sound reached this microphone. Check its mute switch or choose your headset in Mic options, or choose Tap to make a wish.');return}
    this.timer=setTimeout(sample,40);
   };sample();
  }catch(error){
   stream?.getTracks().forEach(t=>t.stop());void context.close().catch(()=>{});
   if(generation!==this.generation)return;this.stop();throw error;
  }
 }
 stop(){this.generation++;if(this.timer!==null)clearTimeout(this.timer);this.timer=null;this.disconnect?.();this.disconnect=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;void this.context?.close().catch(()=>{});this.context=null;this.state='idle';this.level=0;this.sustainedMs=0;this.candidateSamples=0;this.rejectedMs=0;this.quietMs=0;this.armed=false;this.airflow=false}
}
