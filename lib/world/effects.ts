import {Group,Mesh,PointLight,PlaneGeometry,ShaderMaterial,DoubleSide,Vector3} from 'three';
import {FLAME_OUT,WISH_RELEASE} from './journey.ts';
import {sourceName} from './assets.ts';
export const WICKS=[[-.625,1.188,-3.523],[-.55,1.221,-3.60],[-.475,1.201,-3.535]];
const smokeFragment=`
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
void main(){
 float y=vUv.y;
 float drift=sin(y*8.-uTime*1.25)*(.02+y*.13)+sin(y*19.-uTime*1.8)*y*.025;
 float x=vUv.x-.5-drift;
 float width=.023+y*.085;
 float core=exp(-x*x/(width*width));
 float curl=x-.065*sin(y*15.-uTime);
 float veil=exp(-curl*curl/(width*width*2.2))*.22;
 float lift=smoothstep(0.,.035,y)*(1.-smoothstep(.45,1.,y));
 float detail=.84+.16*sin(y*25.-uTime*2.8);
 float alpha=clamp((core+veil)*lift*detail*uOpacity,0.,.48);
 gl_FragColor=vec4(mix(vec3(.70,.72,.74),vec3(.82,.83,.84),y),alpha);
 #include <colorspace_fragment>
}`;
export class CandleEffects {
 lights:PointLight[]=[];smoke:Mesh[]=[];pivots:Group[]=[];
 constructor(scene:Group){
  WICKS.forEach((p,i)=>{const l=new PointLight('#ffad5b',0,.45,2);l.position.fromArray(p);this.lights.push(l);scene.add(l);
   const mat=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false,uniforms:{uTime:{value:0},uOpacity:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:smokeFragment});
   const smoke=new Mesh(new PlaneGeometry(.11,.26),mat);smoke.position.set(p[0],p[1]+.127,p[2]);smoke.renderOrder=6+i;smoke.frustumCulled=false;this.smoke.push(smoke);scene.add(smoke);
  });
 }
 update(flames:Group|undefined,t:number,extinguished:boolean,eventT:number,breath:number,reduced:boolean,cameraPos:Vector3,enabled=true){
  const strength=eventT>0?Math.max(0,1-eventT/FLAME_OUT):1;
  if(flames){flames.visible=!extinguished;flames.traverse(o=>{
   if(o instanceof Mesh)o.castShadow=false;
   if(sourceName(o).includes('motion pivot')){
    o.rotation.z=reduced?0:Math.sin(t*8+o.position.x)*.035+breath*.3+(eventT>0?Math.sin(eventT*15)*.18:0);
    o.scale.set(1,strength,1);
   }
  })}
  this.lights.forEach((l,i)=>l.intensity=!enabled||extinguished?0:.08*strength*(1+(reduced?0:Math.sin(t*9+i)*.07)));
  const age=eventT-FLAME_OUT;
  const opacity=enabled&&age>0&&eventT<WISH_RELEASE?Math.min(1,age/.55)*Math.max(0,Math.min(1,(WISH_RELEASE-eventT)/2))*.42:0;
  this.smoke.forEach((m,i)=>{const mat=m.material as ShaderMaterial;mat.uniforms.uTime.value=reduced?i:eventT+i*.3;mat.uniforms.uOpacity.value=opacity;m.visible=opacity>0;m.quaternion.setFromUnitVectors(new Vector3(0,0,1),cameraPos.clone().sub(m.position).normalize())});
 }
}
