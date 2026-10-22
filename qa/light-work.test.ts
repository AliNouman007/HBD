import assert from 'node:assert/strict';
import test from 'node:test';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,MeshPhysicalMaterial,ShaderMaterial,ShaderChunk,type WebGLProgramParametersWithUniforms,type WebGLRenderer,type Texture} from 'three';
import {RectAreaLightTexturesLib} from 'three/examples/jsm/lights/RectAreaLightTexturesLib.js';
import {guardLightWork} from '../lib/world/light-work.ts';

const renderer={} as WebGLRenderer;
const shader=()=>({uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <lights_fragment_begin>\n#include <lights_physical_pars_fragment>'}) as WebGLProgramParametersWithUniforms;
const areaCondition='#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )';
const compile=(material=new MeshStandardMaterial())=>{
 const root=new Group();root.add(new Mesh(new BoxGeometry(),material));guardLightWork(root);
 const compiled=shader();material.onBeforeCompile(compiled,renderer);return compiled;
};

test('retains point visibility guard and leaves spot, directional and indirect light sections unchanged',()=>{
 const compiled=compile().fragmentShader,source=ShaderChunk.lights_fragment_begin;
 const pointStart=compiled.indexOf('#if ( NUM_POINT_LIGHTS > 0 )'),spotStart=compiled.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
 assert.match(compiled.slice(pointStart,spotStart),/if \( directLight\.visible \) \{ RE_Direct\(/);
 assert.equal((compiled.match(/if \( directLight\.visible \) \{ RE_Direct\(/g)||[]).length,1);
 const spot=source.slice(source.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )'),source.indexOf(areaCondition));
 assert(compiled.slice(spotStart).startsWith(spot));
 const indirect=source.slice(source.indexOf('#if defined( RE_IndirectDiffuse )'));
 assert(compiled.includes(indirect));
});

test('prepares the same lookup, Fresnel, basis and transforms once before the unchanged unrolled area loop',()=>{
 const compiled=compile().fragmentShader,start=compiled.indexOf(areaCondition),end=compiled.indexOf('#if defined( RE_IndirectDiffuse )',start);
 const area=compiled.slice(start,end),loop=area.indexOf('#pragma unroll_loop_start');
 for(const expression of ['LTC_Uv( geometryNormal, geometryViewDir, material.roughness )','texture2D( ltc_1, birthdayLtcUv )','texture2D( ltc_2, birthdayLtcUv )','normalize( geometryViewDir - geometryNormal * dot( geometryViewDir, geometryNormal ) )','- cross( geometryNormal, birthdayLtcT1 )','transposeMat3( mat3( birthdayLtcT1, birthdayLtcT2, geometryNormal ) )','birthdayLtcInverse * birthdayLtcDiffuseTransform','material.specularColor * birthdayLtc2.x + ( vec3( 1.0 ) - material.specularColor ) * birthdayLtc2.y']){
  assert(area.indexOf(expression)>0&&area.indexOf(expression)<loop,expression);
  assert.equal(area.split(expression).length,2);
 }
 const original=ShaderChunk.lights_fragment_begin.slice(ShaderChunk.lights_fragment_begin.indexOf(areaCondition),ShaderChunk.lights_fragment_begin.indexOf('#if defined( RE_IndirectDiffuse )'));
 const originalLoop=original.slice(original.indexOf('#pragma unroll_loop_start'));
 assert.equal(area.slice(loop).replace('reflectedLight, birthdayLtcDiffuseTransform, birthdayLtcSpecularTransform, birthdayLtcFresnel );','reflectedLight );'),originalLoop);
 assert(!compiled.includes('birthdayAreaLightStep'));
});

test('preserves rectangle geometry and backplane guard; the entire spherical integration stays byte-identical',()=>{
 const compiled=compile(new MeshPhysicalMaterial()).fragmentShader,source=ShaderChunk.lights_physical_pars_fragment;
 const integration=source.slice(source.indexOf('\tvec3 coords[ 4 ];',source.indexOf('vec3 LTC_Evaluate(')),source.indexOf('#if defined( USE_SHEEN )'));
 assert(compiled.includes(integration));
 assert(compiled.includes('vec3 BirthdayLTC_Evaluate( const in vec3 P, const in mat3 mat, const in vec3 rectCoords[ 4 ] )'));
 const area=compiled.slice(compiled.indexOf('void RE_Direct_RectArea_Physical(')),guard='if ( dot( lightNormal, position - rectCoords[ 0 ] ) < 0.0 ) return;';
 assert(area.includes(guard));
 assert(area.indexOf(guard)<area.indexOf('reflectedLight.directSpecular +='));
 assert(area.indexOf(guard)<area.indexOf('reflectedLight.directDiffuse +='));
 for(const expression of ['rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;','rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;','rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;','rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;','vec3 lightNormal = cross( v1, v2 );','lightColor * birthdayLtcFresnel * BirthdayLTC_Evaluate( position, birthdayLtcSpecularTransform, rectCoords )','lightColor * material.diffuseColor * BirthdayLTC_Evaluate( position, birthdayLtcDiffuseTransform, rectCoords )'])assert(area.includes(expression),expression);
 assert.equal(compiled.slice(compiled.indexOf('void RE_Direct_Physical(')),source.slice(source.indexOf('void RE_Direct_Physical(')));
 RectAreaLightTexturesLib.init();
 const textures=RectAreaLightTexturesLib as unknown as Record<string,Texture>;
 for(const texture of [textures.LTC_FLOAT_1,textures.LTC_FLOAT_2,textures.LTC_HALF_1,textures.LTC_HALF_2]){assert.equal(texture.generateMipmaps,false);assert.equal(texture.mipmaps.length,0)}
});

test('retains wind hooks, uniforms, receivers and keys and only wraps each shared material once',()=>{
 const root=new Group(),material=new MeshPhysicalMaterial(),custom=new ShaderMaterial();let calls=0;
 material.onBeforeCompile=function(compiled,received){assert.equal(this,material);assert.equal(received,renderer);calls++;compiled.uniforms.uGardenWind={value:3};compiled.vertexShader+='\ntransformed.x += uGardenWind;'};
 material.customProgramCacheKey=()=> 'birthday-subtle-garden-wind';const previousKey=material.customProgramCacheKey(),customHook=custom.onBeforeCompile;
 root.add(new Mesh(new BoxGeometry(),material),new Mesh(new BoxGeometry(),[material,custom]));guardLightWork(root);
 const hook=material.onBeforeCompile;guardLightWork(root);assert.equal(material.onBeforeCompile,hook);
 assert.equal(material.customProgramCacheKey(),`${previousKey}:birthday-light-guard-shared-area-v1`);
 assert.equal(custom.onBeforeCompile,customHook);
 const compiled=shader();material.onBeforeCompile(compiled,renderer);assert.equal(calls,1);
 assert.equal(compiled.uniforms.uGardenWind.value,3);assert.match(compiled.vertexShader,/transformed\.x \+= uGardenWind/);
});

test('a hook that already expands either include keeps the original compatible area-call signature',()=>{
 for(const expanded of ['lights_fragment_begin','lights_physical_pars_fragment'] as const){
  const material=new MeshStandardMaterial();material.onBeforeCompile=compiled=>{compiled.fragmentShader=compiled.fragmentShader.replace(`#include <${expanded}>`,ShaderChunk[expanded])};
  const compiled=compile(material).fragmentShader;
  assert(!compiled.includes('BirthdayLTC_Evaluate('));assert(!compiled.includes('birthdayLtcDiffuseTransform'));
  assert(compiled.includes('RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );'));
 }
});

test('zero-light and nonphysical cases retain the original preprocessor gates around shared preparation',()=>{
 const compiled=compile().fragmentShader,start=compiled.indexOf(areaCondition),next=compiled.indexOf('#if defined( RE_IndirectDiffuse )',start),area=compiled.slice(start,next);
 assert(area.startsWith(areaCondition));
 assert(area.indexOf('vec2 birthdayLtcUv')>area.indexOf(areaCondition));
 assert(area.trimEnd().endsWith('#endif'));
 const physicalArea=compiled.slice(compiled.indexOf('void RE_Direct_RectArea_Physical('));
 assert.equal((physicalArea.match(/BirthdayLTC_Evaluate\(/g)||[]).length,2);
});

test('a changed pinned transform or area-call anchor falls back as a matched pair',async()=>{
 const originalPhysical=ShaderChunk.lights_physical_pars_fragment,originalBegin=ShaderChunk.lights_fragment_begin;
 for(const variant of ['transform','call','signature']){
  try{
   if(variant==='transform')ShaderChunk.lights_physical_pars_fragment=originalPhysical.replace('\tvec3 coords[ 4 ];','    vec3 coords[ 4 ];');
   if(variant==='call')ShaderChunk.lights_fragment_begin=originalBegin.replace('RE_Direct_RectArea( rectAreaLight,','RE_Direct_RectArea(  rectAreaLight,');
   if(variant==='signature')ShaderChunk.lights_physical_pars_fragment=originalPhysical.replace('inout ReflectedLight reflectedLight ) {','inout ReflectedLight reflectedLight  ) {');
   const fresh=await import('../lib/world/light-work.ts?anchor-check='+variant);
   const material=new MeshStandardMaterial(),root=new Group();root.add(new Mesh(new BoxGeometry(),material));fresh.guardLightWork(root);
   const compiled=shader();material.onBeforeCompile(compiled,renderer);
   assert(!compiled.fragmentShader.includes('BirthdayLTC_Evaluate('));
   assert(!compiled.fragmentShader.includes('birthdayLtcDiffuseTransform'));
   assert(compiled.fragmentShader.includes('if ( directLight.visible ) { RE_Direct('));
   assert(compiled.fragmentShader.includes('if ( dot( lightNormal, position - rectCoords[ 0 ] ) < 0.0 ) return;'));
  }finally{ShaderChunk.lights_physical_pars_fragment=originalPhysical;ShaderChunk.lights_fragment_begin=originalBegin}
 }
});
