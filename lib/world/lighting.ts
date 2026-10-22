import {Scene,Group,DirectionalLight,HemisphereLight,PointLight,RectAreaLight,Vector3,Quaternion,Color} from 'three';
import {RectAreaLightUniformsLib} from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
export type AuthoredLight={name:string;type:string;energy:number;color:number[];p:number[];q:number[];size:number|null};
export const SUN_QUATERNION=[-.1336355507,.8612880707,.2926570177,.3932890594];
export const SUN_DIRECTION=new Vector3(0,0,-1).applyQuaternion(new Quaternion().fromArray(SUN_QUATERNION)).normalize();
export function lightScene(scene:Scene,bedroom:boolean){
 const sun=new DirectionalLight(new Color(1,.93,.82),2.8);const center=new Vector3(bedroom?-40:0,bedroom?.5:1,bedroom?0:-3);
 sun.position.copy(center).addScaledVector(SUN_DIRECTION,-15);sun.target.position.copy(center);sun.name='P2.Sun';scene.add(sun,sun.target);sun.castShadow=true;
 const extent=bedroom?3.6:10;Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:38});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00015;sun.shadow.normalBias=.005;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
 // Low ambient contribution: the authored UV1 maps supply static bounce.
 scene.add(new HemisphereLight('#e5ecf1','#a78d79',bedroom?.12:.25));return sun;
}
export function authoredFill(scene:Scene,lights:AuthoredLight[],bedroom:boolean){
 RectAreaLightUniformsLib.init();const group=new Group();group.name='Authored practical and aperture lights';const seen=new Set<string>();
 for(const source of lights){
  if(seen.has(source.name)||source.type==='SUN'||source.name.includes('flame light'))continue;seen.add(source.name);
  const inBedroom=source.name.startsWith('R01');if(inBedroom!==bedroom)continue;
  let light:PointLight|RectAreaLight;
  if(source.type==='POINT'){light=new PointLight(new Color().fromArray(source.color),source.energy/(4*Math.PI),5,2)}
  else if(source.type==='AREA'){
   const size=source.size??1;light=new RectAreaLight(new Color().fromArray(source.color),source.energy/(Math.PI*size*size),size,size);light.quaternion.fromArray(source.q);
  }else continue;
  light.name=source.name;light.position.fromArray(source.p);group.add(light);
 }
 scene.add(group);return group;
}
