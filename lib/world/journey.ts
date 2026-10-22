export type Phase = 'loading'|'ready'|'travel'|'preparing'|'doorway'|'opening'|'wish'|'listening'|'extinguishing'|'celebration'|'exitDoor'|'exitOpening'|'memories'|'gift'|'giftReady'|'reading'|'ending'|'error';
export type ViewMode = 'journey'|'freeLook'|'portrait'|'receivedCard'|'teddy';
export const DOOR=.32,WISH=.56,EXIT=.65,PORTRAIT=.73,CARD=.79,GIFT=.835,LETTER=.96;
export const FLAME_OUT=1.25,CELEBRATION_START=FLAME_OUT+.45,WISH_RELEASE=7.2,DATE_FORMED=4.8,DATE_DURATION=11;
export const MARKERS={portal:.18,door:DOOR,salonThreshold:.378,wish:WISH,exit:EXIT,portrait:PORTRAIT,card:CARD,gift:GIFT,letter:LETTER,ending:1} as const;
export const TRAVEL_SEGMENTS=[[0,.18,1,180],[.18,DOOR,181,385],[DOOR,.5,385,830],[.5,WISH,830,945],[WISH,EXIT,945,1330],[EXIT,.68,1420,1510],[.68,PORTRAIT,1510,1730],[PORTRAIT,CARD,1730,1950],[CARD,GIFT,1950,2100],[GIFT,.89,2300,2420],[.89,LETTER,2420,2520],[LETTER,1,2520,2880]] as const;
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export type Snapshot={phase:Phase;mode:ViewMode;progress:number;doorOpen:boolean;exitDoorOpen:boolean;extinguished:boolean;doorT:number;exitDoorT:number;wishT:number;celebrationT:number;celebrationSeen:boolean;giftT:number;giftOpened:boolean;endingT:number;scene:number;error:string|null;assetBlocked:boolean;revision:number};
/** Story progress, irreversible events and temporary inspection modes are separate. */
export class Journey {
 progress=0;target=0;velocity=0;phase:Phase='loading';mode:ViewMode='journey';doorOpen=false;exitDoorOpen=false;extinguished=false;read=false;doorT=0;exitDoorT=0;wishT=0;eventTime=0;celebrationT=0;celebrationSeen=false;giftT=0;giftTarget=0;giftOpened=false;giftAuto=false;giftHold=0;endingT=0;error:string|null=null;assetLimit=1;revision=0;suspended=false;
 get scene(){const p=this.progress;return p<.18?1:p<=DOOR?2:p<.5?3:p<.68?4:p<.89?5:6}
 get limit(){return !this.doorOpen?DOOR:!this.extinguished?WISH:!this.exitDoorOpen?EXIT:!this.giftOpened?GIFT:!this.read?LETTER:1}
 get assetBlocked(){return this.assetLimit<this.limit&&this.progress>=this.assetLimit-.00002||this.assetLimit===DOOR&&this.phase==='doorway'||this.assetLimit===EXIT&&this.phase==='exitDoor'}
 get travelling(){return this.mode==='journey'&&['travel','memories','preparing','ending'].includes(this.phase)}
 snapshot():Snapshot{return {phase:this.phase,mode:this.mode,progress:this.progress,doorOpen:this.doorOpen,exitDoorOpen:this.exitDoorOpen,extinguished:this.extinguished,doorT:this.doorT,exitDoorT:this.exitDoorT,wishT:this.wishT,celebrationT:this.celebrationT,celebrationSeen:this.celebrationSeen,giftT:this.giftT,giftOpened:this.giftOpened,endingT:this.endingT,scene:this.scene,error:this.error,assetBlocked:this.assetBlocked,revision:this.revision}}
 clearInput(){this.target=this.progress;this.velocity=0;this.giftTarget=this.giftT}
 setAssetLimit(limit:number){if(limit!==this.assetLimit){this.assetLimit=limit;this.clearInput();if(this.phase==='preparing'&&this.progress<limit)this.phase='travel'}}
 loaded(){if(this.phase==='loading')this.phase='ready'}
 begin(){if(this.phase==='ready'){this.phase='travel';this.clearInput()}}
 input(amount:number){
  if(!Number.isFinite(amount)||amount===0||this.suspended||this.mode!=='journey')return;
  if(this.phase==='gift'){
   if(this.giftAuto)return;
   if(amount<0&&this.giftT<.0001&&this.giftTarget===0){this.phase='travel';this.clearInput();this.target=Math.max(0,GIFT-.004);return}
   this.giftTarget=clamp(this.giftTarget+clamp(amount*9,-.12,.12),Math.max(0,this.giftT-.16),Math.min(1,this.giftT+.16));return;
  }
  if(['loading','ready','opening','exitOpening','extinguishing','celebration','listening','giftReady','error'].includes(this.phase))return;
  if(amount>0&&['doorway','exitDoor','wish','reading'].includes(this.phase))return;
  this.target=clamp(this.target+clamp(amount,-.018,.018),Math.max(0,this.progress-.018),Math.min(this.limit,this.assetLimit,this.progress+.018));
  if(amount<0&&['doorway','exitDoor','wish','reading','ending','preparing'].includes(this.phase))this.phase='travel';
 }
 openDoor(){if(this.phase!=='doorway'||this.mode!=='journey'||this.assetLimit<=DOOR)return false;this.phase='opening';this.target=this.progress=DOOR;this.velocity=0;this.eventTime=0;return true}
 openExitDoor(){if(this.phase!=='exitDoor'||this.mode!=='journey'||this.assetLimit<=EXIT)return false;this.phase='exitOpening';this.target=this.progress=EXIT;this.velocity=0;this.eventTime=0;return true}
 listen(){if(this.phase==='wish'&&this.mode==='journey'){this.phase='listening';this.clearInput();return true}return false}
 stopListening(){if(this.phase==='listening')this.phase='wish'}
 makeWish(){if(!['wish','listening'].includes(this.phase)||this.mode!=='journey')return false;this.phase='extinguishing';this.target=this.progress=WISH;this.velocity=0;this.eventTime=0;return true}
 finishReading(){if(this.phase==='reading'){this.read=true;this.phase='travel';this.clearInput();return true}return false}
 finishCelebration(){if(this.phase!=='celebration'||this.celebrationT<DATE_FORMED)return false;this.celebrationSeen=true;this.phase='travel';this.target=this.progress=WISH;this.velocity=0;return true}
 unwrapGift(){if(this.phase!=='gift'||this.mode!=='journey')return false;this.giftAuto=true;return true}
 finishGift(){if(this.phase!=='giftReady'||this.giftHold<1||this.mode!=='journey')return false;this.phase='memories';this.clearInput();return true}
 enterMode(mode:Exclude<ViewMode,'journey'>){
  if(this.mode!=='journey'||this.suspended)return false;
  const allowed=mode==='freeLook'?this.progress<.12&&['ready','travel'].includes(this.phase):mode==='teddy'?this.giftOpened&&this.phase==='giftReady':mode==='portrait'?this.progress>=.70&&this.progress<.78&&this.travelling:this.progress>=.77&&this.progress<GIFT&&this.travelling;
  if(!allowed)return false;this.mode=mode;this.clearInput();return true;
 }
 exitMode(){if(this.mode==='journey')return false;this.mode='journey';this.clearInput();return true}
 replay(){const loaded=this.phase!=='loading';const limit=this.assetLimit,revision=this.revision+1;Object.assign(this,new Journey());this.phase=loaded?'ready':'loading';this.assetLimit=limit;this.revision=revision}
 fail(message:string){this.error=message;this.phase='error';this.clearInput()}
 tick(dt:number,reduced:boolean,movement=0){
  if(this.suspended||this.mode!=='journey')return;dt=clamp(dt,0,.5);
  // Small simulation steps preserve control speed on slow frames without jumping past a pause.
  if(dt>1/60+1e-8){let remaining=dt;while(remaining>1e-8){const phase=this.phase,step=Math.min(remaining,1/60);this.tick(step,reduced,movement);remaining-=step;if(this.phase!==phase)break}return}
  if(movement)this.input(movement*dt*.085);
  // Smoke keeps its full fade while the birthday particles begin sooner.
  if(this.extinguished&&this.phase!=='extinguishing')this.wishT=Math.min(WISH_RELEASE,this.wishT+dt);
  if(this.phase==='opening'||this.phase==='exitOpening'){
   this.eventTime+=dt;const exit=this.phase==='exitOpening',t=clamp(this.eventTime/(exit?3:89/30),0,1);if(exit)this.exitDoorT=t;else this.doorT=t;
   if(t===1){if(exit)this.exitDoorOpen=true;else this.doorOpen=true;this.phase='travel';this.clearInput()}return;
  }
  if(this.phase==='extinguishing'){
   this.eventTime+=dt;this.wishT=this.eventTime;if(this.wishT>=FLAME_OUT)this.extinguished=true;
   if(this.wishT>=CELEBRATION_START){this.phase='celebration';this.celebrationT=0;this.target=this.progress=WISH}return;
  }
  if(this.phase==='celebration'){this.celebrationT+=dt;if(this.celebrationT>=DATE_DURATION)this.finishCelebration();return}
  if(this.phase==='gift'){
   if(this.giftAuto)this.giftTarget=clamp(this.giftTarget+dt/(reduced?3:5.67),0,1);
   this.giftT+= (this.giftTarget-this.giftT)*(1-Math.exp(-dt*10));
   if(this.giftTarget===1&&this.giftT>.998){this.giftT=this.giftTarget=1;this.giftOpened=true;this.phase='giftReady';this.giftHold=0;this.clearInput()}return;
  }
  if(this.phase==='giftReady'){this.giftHold+=dt;return}
  if(this.phase==='ending'){this.endingT+=dt;if(this.target>=this.progress)return}
  if(['loading','ready','listening','reading','error'].includes(this.phase))return;
  const travelDt=Math.min(dt,.05),smoothTime=reduced?.10:.22,omega=2/smoothTime;
  const maxSpeed=(this.progress<.18?.055:this.progress<.32?.028:.032)*(reduced?.65:1);
  const x=omega*travelDt,decay=1/(1+x+.48*x*x+.235*x*x*x);
  const change=clamp(this.progress-this.target,-maxSpeed*smoothTime,maxSpeed*smoothTime),aim=this.progress-change,temp=(this.velocity+omega*change)*travelDt;
  this.velocity=(this.velocity-omega*temp)*decay;let next=aim+(change+temp)*decay;
  if((this.target-this.progress>0)===(next>this.target)){next=this.target;this.velocity=0}
  if(Math.abs(next-this.target)<.000008&&Math.abs(this.velocity)<.00015){next=this.target;this.velocity=0}
  const ceiling=Math.min(this.limit,this.assetLimit);this.progress=clamp(next,0,ceiling);
  if(Math.abs(this.progress-ceiling)<.00001&&Math.abs(this.target-ceiling)<.00001){
   this.progress=this.target=ceiling;this.velocity=0;
   this.phase=ceiling<this.limit?'preparing':!this.doorOpen?'doorway':!this.extinguished?'wish':!this.exitDoorOpen?'exitDoor':!this.giftOpened?'gift':!this.read?'reading':'ending';
  }else if(!['doorway','exitDoor','wish','reading','ending'].includes(this.phase))this.phase=this.scene===5?'memories':'travel';
 }
}
export function frameAt(p:number){const [a,b,c,d]=TRAVEL_SEGMENTS.find((s,i)=>p<s[1]||i===TRAVEL_SEGMENTS.length-1)!;return c+(d-c)*clamp((p-a)/(b-a),0,1)}
