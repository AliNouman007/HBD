import {readFile,writeFile,mkdir,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const [inputArgument,outputArgument,preset='preserve-curtains',...extra]=process.argv.slice(2);
if(!inputArgument||!outputArgument||extra.length||!['conservative','review','preserve-curtains','cake-only'].includes(preset)){
 throw Error('Usage: node tools/export/optimize-room-geometry.mjs INPUT_WORLD_DIR OUTPUT_WORLD_DIR [conservative|review|preserve-curtains|cake-only]');
}
const inputWorld=await realpath(path.resolve(inputArgument));
await mkdir(path.resolve(outputArgument),{recursive:true});
const outputWorld=await realpath(path.resolve(outputArgument));
if(inputWorld===outputWorld)throw Error('Input and output directories must differ; keep the original assets for visual comparison.');

const packages=['@gltf-transform/core','@gltf-transform/extensions','@gltf-transform/functions','meshoptimizer'];
let requireDependencies;
for(const directory of [inputWorld,process.cwd(),path.dirname(fileURLToPath(import.meta.url))]){
 const candidate=createRequire(path.join(directory,'package.json'));
 try{packages.forEach(name=>candidate.resolve(name));requireDependencies=candidate;break}catch{}
}
if(!requireDependencies)throw Error('Existing glTF Transform and meshoptimizer packages were not found. Run from the installed app directory or pass its public/world directory as input.');
const {NodeIO}=requireDependencies('@gltf-transform/core');
const {ALL_EXTENSIONS}=requireDependencies('@gltf-transform/extensions');
const {compactPrimitive}=requireDependencies('@gltf-transform/functions');
const {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier}=requireDependencies('meshoptimizer');
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const hash=data=>createHash('sha256').update(data).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

function decoded(accessor){
 const size=accessor.getElementSize(),result=new Float32Array(accessor.getCount()*size),element=[];
 for(let i=0;i<accessor.getCount();i++){accessor.getElement(i,element);result.set(element,i*size)}
 return result;
}
function attributeSnapshot(accessor){
 const data=accessor.getArray();
 return {type:accessor.getType(),component:accessor.getComponentType(),normalized:accessor.getNormalized(),count:accessor.getCount(),hash:hash(Buffer.from(data.buffer,data.byteOffset,data.byteLength))};
}
function geometrySnapshot(primitive){
 return {attributes:primitive.listSemantics().sort().map(semantic=>({semantic,...attributeSnapshot(primitive.getAttribute(semantic))})),targets:primitive.listTargets().map(target=>target.listSemantics().sort().map(semantic=>({semantic,...attributeSnapshot(target.getAttribute(semantic))}))),indices:primitive.getIndices().getArray().slice()};
}
function sceneTriangles(root){
 let total=0;
 root.listScenes()[0].traverse(node=>{
  const count=node.getExtension('EXT_mesh_gpu_instancing')?.listAttributes()[0].getCount()??1;
  for(const primitive of node.getMesh()?.listPrimitives()??[])total+=primitive.getIndices().getCount()/3*count;
 });
 return total;
}
function preservationSnapshot(root){
 return {
  nodes:root.listNodes().map(node=>({name:node.getName(),extras:node.getExtras(),translation:node.getTranslation(),rotation:node.getRotation(),scale:node.getScale(),weights:node.getWeights(),mesh:node.getMesh()?.getName(),children:node.listChildren().map(child=>child.getName()),instances:node.getExtension('EXT_mesh_gpu_instancing')?.listAttributes().map(attributeSnapshot)})),
  meshes:root.listMeshes().map(mesh=>({name:mesh.getName(),weights:mesh.getWeights()})),
  images:root.listTextures().map(texture=>({name:texture.getName(),mime:texture.getMimeType(),hash:hash(texture.getImage())})),
  animations:root.listAnimations().map(animation=>animation.getName()),
 };
}
function glbJSON(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('Expected a GLB with a JSON first chunk.');
 return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
}

const results=[];
for(const asset of preset==='cake-only'?['cake']:['cake','salon']){
 const sourceFile=path.join(inputWorld,`${asset}.glb`),sourceBytes=await readFile(sourceFile),sourceJSON=glbJSON(sourceBytes);
 const document=await io.read(sourceFile),root=document.getRoot(),before=preservationSnapshot(root),beforeSceneTriangles=sceneTriangles(root),expected=new Map(),changes=[];
 // These presets were reviewed only for the static cake and salon assets.
 if(root.listAnimations().length)throw Error(`${asset}: animated assets require a separate review.`);
 for(const [meshIndex,mesh] of root.listMeshes().entries()){
  const selected=/individual drupelet|fluted shell piping|piped blush rosette|curtain.*linen|runner.*draped linen/i.test(mesh.getName())&&!(preset==='preserve-curtains'&&/curtain/i.test(mesh.getName()));
  if(selected&&(mesh.getWeights().some(weight=>weight!==0)||root.listNodes().some(node=>node.getMesh()===mesh&&node.getWeights().some(weight=>weight!==0))))throw Error(`${mesh.getName()}: nonzero morph weights require a separate visual review.`);
  for(const [primitiveIndex,primitive] of mesh.listPrimitives().entries()){
   if(selected){
    if(primitive.getMode()!==4)throw Error(`${mesh.getName()}: expected triangle geometry.`);
    const position=decoded(primitive.getAttribute('POSITION')),indices=new Uint32Array(primitive.getIndices().getArray());
    const attributes=primitive.listSemantics().filter(semantic=>/^(NORMAL|TEXCOORD_|COLOR_)/.test(semantic));
    const stride=attributes.reduce((total,semantic)=>total+primitive.getAttribute(semantic).getElementSize(),0);
    const data=new Float32Array(primitive.getAttribute('POSITION').getCount()*stride),weights=[];
    let offset=0;
    for(const semantic of attributes){
     const accessor=primitive.getAttribute(semantic),size=accessor.getElementSize(),values=decoded(accessor);
     weights.push(...Array(size).fill(1));
     for(let i=0;i<accessor.getCount();i++)for(let j=0;j<size;j++)data[i*stride+offset+j]=values[i*size+j];
     offset+=size;
    }
    const errorLimit=/drupelet/.test(mesh.getName())?(!['review','cake-only'].includes(preset)?.003:.01):asset==='cake'?(!['review','cake-only'].includes(preset)?.0003:.001):(!['review','cake-only'].includes(preset)?.0001:.0003);
    const [reducedIndices,reportedError]=MeshoptSimplifier.simplifyWithAttributes(indices,position,3,data,stride,weights,null,Math.floor(indices.length*.25/3)*3,errorLimit,['LockBorder']);
    const oldIndices=primitive.getIndices();
    primitive.setIndices(oldIndices.clone().setArray(reducedIndices));
    if(oldIndices.listParents().length===1)oldIndices.dispose();
    compactPrimitive(primitive);
    changes.push({mesh:mesh.getName(),primitive:primitiveIndex,before:indices.length/3,after:reducedIndices.length/3,errorLimit,reportedError,localErrorEstimate:reportedError*MeshoptSimplifier.getScale(position,3),attributes});
   }
   expected.set(`${meshIndex}:${primitiveIndex}`,geometrySnapshot(primitive));
  }
 }
 if(!changes.length)throw Error(`${asset}: none of the intended geometry targets were found.`);
 const filename=path.join(outputWorld,`${asset}.glb`);
 await io.write(filename,document);
 const outputBytes=await readFile(filename),outputJSON=glbJSON(outputBytes),reloaded=(await io.read(filename)).getRoot();
 if(!equal(before,preservationSnapshot(reloaded)))throw Error(`${asset}: node, image or instance data changed.`);
 for(const key of ['materials','textures','samplers','scenes'])if(!equal(sourceJSON[key],outputJSON[key]))throw Error(`${asset}: ${key} definitions changed.`);
 let uv1Primitives=0;
 for(const [meshIndex,mesh] of reloaded.listMeshes().entries())for(const [primitiveIndex,primitive] of mesh.listPrimitives().entries()){
  const original=expected.get(`${meshIndex}:${primitiveIndex}`),actual=geometrySnapshot(primitive);
  if(!equal(original.attributes,actual.attributes))throw Error(`${asset}: retained vertex attributes changed.`);
  if(!equal(original.targets,actual.targets))throw Error(`${asset}: retained morph-target attributes changed.`);
  if(original.indices.length!==actual.indices.length)throw Error(`${asset}: triangle count changed during output.`);
  // Meshopt may cyclically rotate each triangle's indices while preserving winding.
  for(let i=0;i<actual.indices.length;i+=3)if(![0,1,2].some(rotation=>[0,1,2].every(corner=>original.indices[i+corner]===actual.indices[i+(corner+rotation)%3])))throw Error(`${asset}: triangle order or winding changed.`);
  if(primitive.getAttribute('TEXCOORD_1'))uv1Primitives++;
 }
 for(const node of reloaded.listNodes())if(node.getExtras().p2_indirect&&!node.getMesh()?.listPrimitives().every(primitive=>primitive.getAttribute('TEXCOORD_1')))throw Error(`${asset}: indirect-light UVs are missing.`);
 const result={preset,asset,filename,sourceSha256:hash(sourceBytes),outputSha256:hash(outputBytes),bytes:(await stat(filename)).size,beforeSceneTriangles,afterSceneTriangles:sceneTriangles(reloaded),changedPrimitives:changes,verification:{materialsTexturesSamplersScenesExact:true,metadataAndInstanceStreamsExact:true,embeddedImagesExact:true,retainedAttributeStreamsExact:true,retainedMorphStreamsAndWeightsExact:true,triangleWindingPreserved:true,uv1Primitives,indirectUVRequirementPassed:true,visualApproval:false}};
 results.push(result);
 console.log(`${asset}: ${beforeSceneTriangles.toLocaleString('en-US')} → ${result.afterSceneTriangles.toLocaleString('en-US')} scene triangles. Structural checks passed; visual comparison still required.`);
}
await writeFile(path.join(outputWorld,'geometry-report.json'),JSON.stringify(results,null,2)+'\n');
