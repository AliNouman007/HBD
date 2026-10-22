import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {WebGLRenderer} from 'three';
import * as work from '../lib/world/render-work.ts';

test('opaque depth order preserves explicit layers and stable ties',()=>{
 const sort=(work as unknown as {opaqueFrontToBack?:Parameters<WebGLRenderer['setOpaqueSort']>[0]}).opaqueFrontToBack;
 assert.equal(typeof sort,'function','an explicit front-to-back comparator must exist');
 const item=(id:number,z:number,materialId:number,groupOrder=0,renderOrder=0)=>({id,z,material:{id:materialId},groupOrder,renderOrder}) as Parameters<NonNullable<typeof sort>>[0];
 const near=item(8,.1,9),far=item(1,.9,1);
 assert(sort!(near,far)<0,'near opaque surfaces cover far shading even when materials sort in reverse');
 assert(sort!(item(3,.9,5,0),item(2,.1,1,1))<0,'authored group ordering wins over depth');
 assert(sort!(item(3,.9,5,0,0),item(2,.1,1,0,1))<0,'authored render ordering wins over depth');
 assert(sort!(item(3,.5,1),item(2,.5,2))<0,'equal depth retains the original material tie-break');
 assert(sort!(item(1,.5,2),item(2,.5,2))<0,'identical depth/material retains object tie-break');
 assert.equal(sort!(near,near),0);
});
