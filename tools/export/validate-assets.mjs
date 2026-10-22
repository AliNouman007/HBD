import {NodeIO} from '@gltf-transform/core';import{ALL_EXTENSIONS}from'@gltf-transform/extensions';import{MeshoptDecoder}from'meshoptimizer';import{writeFile,readFile,stat}from'node:fs/promises';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});const result={groups:{},failures:[]};
for(const name of ['bedroom','garden','door','salon','cake','flames','exit-door','courtyard','gift','ending']){
 const doc=await io.read(`public/world/${name}.glb`),root=doc.getRoot(),scenes=root.listScenes();const reachable=new Set();scenes[0].traverse(n=>reachable.add(n));
 let triangles=0,drawCalls=0,badNumbers=0;
 for(const n of reachable){const mesh=n.getMesh();if(!mesh)continue;const inst=n.getExtension('EXT_mesh_gpu_instancing');const instances=inst?.getAttribute('TRANSLATION')?.getCount()||1;for(const p of mesh.listPrimitives()){triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3*instances;drawCalls++;for(const a of p.listAttributes()){const ar=a.getArray();for(let i=0;i<ar.length;i++)if(!Number.isFinite(ar[i]))badNumbers++}}}
 const sourceNames=root.listNodes().map(n=>String(n.getExtras().source_name||n.getName()));
 if(name==='bedroom'){
  const screen=root.listNodes().find(n=>n.getExtras().source_name==='Portal_screen');
  if(!screen?.getMesh()?.listPrimitives().every(p=>p.getAttribute('TEXCOORD_0')))result.failures.push('portal-uv');
 }
 if(name==='door')for(const part of ['DOOR • inward hinge','HANDLE • lever spindle'])if(!sourceNames.includes(part))result.failures.push(part);
 if(name==='courtyard'&&!['heroPortrait','receivedCard'].every(slot=>root.listNodes().some(n=>n.getExtras().content_slot===slot)))result.failures.push('photo-slots');
 if(name==='bedroom'&&sourceNames.some(n=>n.startsWith('P2.Bedroom.Teddy')))result.failures.push('bedroom-teddy');
 if(name==='gift'&&!sourceNames.includes('P2.Gift.Teddy'))result.failures.push('gift-teddy');
 if(['door','exit-door','gift'].includes(name)&&root.listAnimations().length!==1)result.failures.push(name+'-clip');
 for(const n of root.listNodes())if(n.getExtras().p2_indirect&&!n.getMesh()?.listPrimitives().every(p=>p.getAttribute('TEXCOORD_1')))result.failures.push(name+'-indirect-uv');
 if(sourceNames.some(n=>/Outlook • natural cypress|Olive • silver green lanceolate|Olive canopy • fine/.test(n)))result.failures.push(name+'-retired-trees');
 result.groups[name]={bytes:(await stat(`public/world/${name}.glb`)).size,reachableNodes:reachable.size,totalNodes:root.listNodes().length,renderedTriangles:triangles,estimatedPrimitiveDraws:drawCalls,badNumbers,sceneName:scenes[0].getName(),contentSlots:sourceNames.filter(n=>/Portal_screen|matte ivory insert|06 LETTER|inward hinge|lever spindle|motion pivot/.test(n))};
 if(badNumbers||scenes.length!==1||reachable.size!==root.listNodes().length)result.failures.push(name);
}
const keys=JSON.parse(await readFile('public/world/cameras.json','utf8'));result.cameras={samples:keys.length,start:keys[0].f,end:keys.at(-1).f,portal180:keys.find(k=>k.f===180),portal181:keys.find(k=>k.f===181)};
await writeFile('qa/phase3-asset-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.failures.length)process.exitCode=1;
