import type {Box3,Group,Vector3} from 'three';
import {DOOR,type Snapshot} from './journey.ts';

/** Call only after the static set has its final parent; actors keep their live transforms. */
export function freezeStaticTransforms(root:Group){
 root.updateWorldMatrix(true,true);
 root.traverse(object=>{object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false});
}

/** This inset rectangle is inside the closed, solid oak leaf, below its arch. */
export function entryDoorOccludes(bounds:Box3,camera:Vector3){
 if(![...bounds.min.toArray(),...bounds.max.toArray(),...camera.toArray()].every(Number.isFinite))return false;
 if(bounds.isEmpty()||camera.z<=0||bounds.max.z>=-.06)return false;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const t=(-.06-camera.z)/(z-camera.z),px=camera.x+t*(x-camera.x),py=camera.y+t*(y-camera.y);
  if(!Number.isFinite(px)||!Number.isFinite(py)||px<-.68||px>.68||py<.12||py>1.95)return false;
 }
 return true;
}

export function applyEntryDoorOcclusion(assets:Partial<Record<string,Group>>,bounds:Map<string,Box3>,camera:Vector3,j:Pick<Snapshot,'mode'|'progress'|'doorOpen'|'doorT'|'exitDoorT'|'giftT'|'extinguished'>,shadowRefresh:boolean){
 const closed=!shadowRefresh&&j.mode==='journey'&&j.progress<=DOOR&&!j.doorOpen&&j.doorT===0&&j.exitDoorT===0&&j.giftT===0;
 for(const [name,box]of bounds){const asset=assets[name];if(asset)asset.visible=(name!=='flames'||!j.extinguished)&&!(closed&&entryDoorOccludes(box,camera));}
}

export function shouldRefreshShadow(elapsed:number,...actors:readonly [moved:boolean|undefined,progress:number][]){
 return actors.some(([moved,t])=>moved&&(elapsed>=1/24||t===0||t===1));
}


type OpaqueItem={groupOrder:number;renderOrder:number;z:number;material:{id:number};id:number};
// Keep authored order and depth ties; nearer opaque surfaces can reject hidden fragment work early.
export function opaqueFrontToBack(a:OpaqueItem,b:OpaqueItem){
 return a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||a.z-b.z||a.material.id-b.material.id||a.id-b.id;
}
