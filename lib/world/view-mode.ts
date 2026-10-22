import {PerspectiveCamera,Quaternion,Vector3,MathUtils,Euler,Object3D} from 'three';
import type {Journey,ViewMode} from './journey';
import {sampleCamera,type CameraKey} from './camera.ts';
export type Anchor={p:number[];q:number[];lens?:number;sensor?:number;extras?:Record<string,unknown>};
export class ViewController {
 yaw=0;pitch=0;zoom=0;private mode:ViewMode='journey';private amount=0;private saved=new PerspectiveCamera();private view=new PerspectiveCamera();private teddyBase=new Quaternion();private teddy:Object3D|null=null;
 bindTeddy(object:Object3D){this.teddy=object;this.teddyBase.copy(object.quaternion)}
 rotate(x:number,y:number){this.yaw=MathUtils.clamp(this.yaw+x,this.mode==='freeLook'?-28:-150,this.mode==='freeLook'?35:150);this.pitch=MathUtils.clamp(this.pitch+y,this.mode==='freeLook'?-18:-10,this.mode==='freeLook'?20:10)}
 reset(){this.yaw=this.pitch=this.zoom=0;this.teddy?.quaternion.copy(this.teddyBase)}
 update(camera:PerspectiveCamera,journey:Journey,keys:CameraKey[],anchors:Record<string,Anchor>,aspect:number,dt:number,reduced:boolean){
  const next=journey.mode;
  if(next!==this.mode){if(next!=='journey'){this.saved.copy(camera);this.reset();}this.mode=next}
  const in3D=next==='freeLook'||next==='teddy';const goal=in3D?1:0;this.amount=MathUtils.damp(this.amount,goal,reduced?45:7,Math.min(dt,.05));if(Math.abs(this.amount-goal)<.0001)this.amount=goal;
  if(next==='portrait'||next==='receivedCard'){camera.copy(this.saved);camera.aspect=aspect;camera.updateProjectionMatrix();return}
  if(this.amount<=0){this.teddy?.quaternion.copy(this.teddyBase);return}
  if(next==='freeLook'||!in3D&&this.saved.position.x<-30){sampleCamera(this.view,keys,1,aspect);this.view.quaternion.multiply(new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(this.pitch),MathUtils.degToRad(this.yaw),0,'YXZ')))}
  // Preserve the authored vertical framing on wide screens so the teddy stays in view.
  else {const a=anchors['P2.Camera.GiftInspect'];if(!a)return;this.view.position.fromArray(a.p);this.view.quaternion.fromArray(a.q);this.view.fov=2*Math.atan((a.sensor??36)/(2*(a.lens??42)*Math.min(aspect,1)))*180/Math.PI;this.view.aspect=aspect;this.view.near=.01;this.view.far=80;this.view.position.addScaledVector(new Vector3(0,0,1).applyQuaternion(this.view.quaternion),this.zoom*.06);
   this.teddy?.quaternion.copy(this.teddyBase).multiply(new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(this.pitch),MathUtils.degToRad(this.yaw),0,'YXZ')));
  }
  camera.position.lerp(this.view.position,this.amount);camera.quaternion.slerp(this.view.quaternion,this.amount);camera.fov=MathUtils.lerp(camera.fov,this.view.fov,this.amount);camera.aspect=aspect;camera.updateProjectionMatrix();
 }
}
