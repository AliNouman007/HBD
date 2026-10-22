import {AnimationMixer,LoopOnce,type Group,type AnimationAction} from 'three';
/** Clips are in glTF local space. Sidecar Blender Euler values are never applied. */
export class Actor {
 private mixer:AnimationMixer;private action:AnimationAction;private last=-1;
 constructor(public group:Group,public clipName:string){const clip=group.animations.find(a=>a.name===clipName);if(!clip)throw Error(`Missing animation: ${clipName}`);this.mixer=new AnimationMixer(group);this.action=this.mixer.clipAction(clip);this.action.setLoop(LoopOnce,1);this.action.clampWhenFinished=true;this.set(0)}
 set(progress:number){const t=Math.max(0,Math.min(1,progress));if(t===this.last)return false;this.action.reset().play();this.mixer.setTime(this.action.getClip().duration*t);this.group.updateMatrixWorld(true);this.last=t;return true}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.group)}
}
