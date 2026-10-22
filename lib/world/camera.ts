import { PerspectiveCamera,Quaternion,Vector3,MathUtils } from 'three';
export type CameraKey={f:number;p:number[];q:number[];lens:number;sensor:number};
const qa=new Quaternion(),qb=new Quaternion(),pa=new Vector3(),pb=new Vector3();
export function portalTargetSize(viewWidth:number,viewHeight:number,dpr:number,screenAspect:number,maxSize:number){
 const width=Math.ceil(Math.max(viewWidth,viewHeight*screenAspect)*dpr);
 const height=Math.ceil(width/screenAspect),scale=Math.min(1,maxSize/Math.max(width,height));
 return [Math.max(1,Math.floor(width*scale)),Math.max(1,Math.floor(height*scale))] as const;
}
export function portalProjection(width:number,height:number,aspect:number,closingFov:number,gardenFov:number){
 const tangent=Math.tan(closingFov*Math.PI/360);
 const distance=Math.min(height/(2*tangent),width/(2*tangent*aspect))*.995;
 const viewHeight=2*distance*tangent;
 return {distance,renderFov:2*Math.atan(Math.tan(gardenFov*Math.PI/360)*height/viewHeight)*180/Math.PI};
}
export function sampleCamera(camera:PerspectiveCamera,keys:CameraKey[],frame:number,aspect:number,viewHeight=Infinity){
 let lo=0,hi=keys.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(keys[mid].f<=frame)lo=mid;else hi=mid-1}
 const a=keys[lo],b=keys[Math.min(lo+1,keys.length-1)],t=(a.f===180&&b.f===181)?0:Math.max(0,Math.min(1,(frame-a.f)/(b.f-a.f||1)));
 camera.position.copy(pa.fromArray(a.p).lerp(pb.fromArray(b.p),t));camera.quaternion.copy(qa.fromArray(a.q).normalize().slerp(qb.fromArray(b.q).normalize(),t)).normalize();
 const lens=MathUtils.lerp(a.lens,b.lens,t),sensor=MathUtils.lerp(a.sensor,b.sensor,t);
 // The final route is authored with a horizontal sensor. Preserve hero width on portrait.
 // Give the cake more of a portrait screen, with room below for wish controls.
 // Ease in and out along the route so travelling or rotating the device never jumps.
 const portrait=1-MathUtils.smoothstep(aspect,.65,1);
 const moment=MathUtils.smoothstep(frame,780,945)*(1-MathUtils.smoothstep(frame,945,1200));
 const cake=portrait*moment,landscape=(1-MathUtils.smoothstep(viewHeight,500,650))*MathUtils.smoothstep(aspect,1,1.5)*moment;
 const vertical=2*Math.atan(sensor*(1-.22*cake+.5*landscape)/(2*lens*Math.max(aspect,.36)))*180/Math.PI;
 camera.clearViewOffset();
 if(cake>0||landscape>0)camera.setViewOffset(aspect,1,.17*aspect*landscape,.16*cake+.10*landscape,aspect,1);
 camera.fov=vertical;camera.aspect=aspect;camera.near=.01;camera.far=250;camera.updateProjectionMatrix();
}
