import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, flatten, join, instance, simplify, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { mkdir, copyFile, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input=process.argv[2], output=process.argv[3];
if(!input||!output) throw new Error('Usage: node tools/export/optimize.mjs INPUT OUTPUT');
await mkdir(output,{recursive:true});await MeshoptEncoder.ready;await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const names=['bedroom','garden','door','salon','cake','flames','terrace','ending'];
const only=process.argv[4];if(only&&!names.includes(only))throw Error('Unknown group');
const report=only?JSON.parse(await readFile(path.join(output,'optimization-report.json'),'utf8')):{};
for(const name of only?[only]:names) {
 const doc=await io.read(path.join(input,`${name}-raw.glb`));
 // Transmission shaders become lightweight transparent panes in the browser.
 for(const material of doc.getRoot().listMaterials())if(/glass|glazing/i.test(material.getName()))material.setAlphaMode('BLEND').setAlpha(.08).setRoughnessFactor(.15);
 const root=doc.getRoot();const selected=root.listScenes().find(s=>s.getName()===`WEB EXPORT ${name}`);if(!selected)throw Error('Export scene missing');root.setDefaultScene(selected);for(const scene of root.listScenes())if(scene!==selected)scene.dispose();
 const reachable=new Set();selected.traverse(n=>reachable.add(n));for(const n of root.listNodes())if(!reachable.has(n))n.dispose();await doc.transform(prune({keepExtras:true,keepAttributes:true}));
 await doc.transform(dedup(),weld());
 // Tiny botanical faces are silhouettes: do not collapse their open borders.
 if(['garden','terrace','salon','cake','bedroom'].includes(name)) await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:name==='garden'?.55:.65,error:name==='garden'?.001:.0003,lockBorder:true}));
 if(!['door','flames'].includes(name)) {
  // Keep image/letter surfaces in a separate subtree so they remain configurable.
  await doc.transform(flatten(),instance({min:3}));
  const canJoin=n=>!n.getExtension('EXT_mesh_gpu_instancing')&&!String(n.getExtras().source_name||n.getName()).match(/matte ivory insert|folded archival note|06 LETTER|Portal_screen/);
  if(name==='garden'){
   // Spatial batches keep distant foliage eligible for frustum culling.
   // Merging every plant into one world-sized mesh defeats that culling.
   const cells=new Map();
   for(const n of root.listNodes()){
    if(!n.getMesh()||!canJoin(n))continue;
    const b=getBounds(n);const span=Math.max(b.max[0]-b.min[0],b.max[2]-b.min[2]);
    if(span>12)continue; // Large terrain surfaces stay separate.
    const cell=[0,2].map(i=>Math.floor((b.max[i]+b.min[i])/16)).join(',');
    if(!cells.has(cell))cells.set(cell,new Set());cells.get(cell).add(n);
   }
   for(const members of cells.values())await doc.transform(join({filter:n=>members.has(n),cleanup:false}));
  }else await doc.transform(join({filter:canJoin,cleanup:false}));
  await doc.transform(prune({keepExtras:true,keepAttributes:true}));
  await doc.transform(instance({min:3}));
 }
 await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',quality:85}));
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:name==='garden'?'high':'medium'}));
 await io.write(path.join(output,`${name}.glb`),doc);
 report[name]={bytes:(await stat(path.join(output,`${name}.glb`))).size,nodes:doc.getRoot().listNodes().length,meshes:doc.getRoot().listMeshes().length,materials:doc.getRoot().listMaterials().length};
 if(report[name].bytes>25*1024*1024)throw Error(name+' exceeds the 25 MiB hosted-file limit');
 console.log(name,report[name]);
}
for(const file of ['cameras.json','door-event.json','lights.json','export-report.json'])await copyFile(path.join(input,file),path.join(output,file));
await writeFile(path.join(output,'optimization-report.json'),JSON.stringify(report,null,2));
