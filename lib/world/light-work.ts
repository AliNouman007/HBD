import {Group,Mesh,MeshStandardMaterial,ShaderChunk} from 'three';

const pointCall='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const pointChunk=ShaderChunk.lights_fragment_begin.replace(pointCall,`if ( directLight.visible ) { ${pointCall} }`);
const areaAnchor='\t\tvec2 uv = LTC_Uv( normal, viewDir, roughness );';
// LTC already returns zero behind the emitter; avoid its lookups on that same halfspace.
const areaChunk=ShaderChunk.lights_physical_pars_fragment.replace(areaAnchor,`\t\tvec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
\t\tvec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
\t\tvec3 lightNormal = cross( v1, v2 );
\t\tif ( dot( lightNormal, position - rectCoords[ 0 ] ) < 0.0 ) return;

${areaAnchor}`);
function prepareAreaLightWork(physical:string,begin:string) {
 const evaluateStart=physical.indexOf('vec3 LTC_Evaluate(');
 const evaluateTransform=physical.indexOf('\tvec3 coords[ 4 ];',evaluateStart);
 const evaluateEnd=physical.indexOf('#if defined( USE_SHEEN )',evaluateTransform);
 const areaStart=physical.indexOf('\tvoid RE_Direct_RectArea_Physical(');
 const areaEnd=physical.indexOf('\n#endif',areaStart);
 const uvStart=physical.indexOf('\t\tvec2 uv = LTC_Uv(',areaStart);
 const contributionStart=physical.indexOf('\t\treflectedLight.directSpecular +=',uvStart);
 const declaration='\tRectAreaLight rectAreaLight;';
 const areaCall='RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
 if([evaluateStart,evaluateTransform,evaluateEnd,areaStart,areaEnd,uvStart,contributionStart].some(i=>i<0)||!begin.includes(declaration)||!begin.includes(areaCall)||!physical.slice(areaStart,areaEnd).includes('inout ReflectedLight reflectedLight ) {')||!physical.slice(areaStart,areaEnd).includes('lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords )')||!physical.slice(areaStart,areaEnd).includes('LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords )'))return {physical,begin,changed:false};

 const preparedEvaluate='vec3 BirthdayLTC_Evaluate( const in vec3 P, const in mat3 mat, const in vec3 rectCoords[ 4 ] ) {\n\n'+physical.slice(evaluateTransform,evaluateEnd);
 let area=physical.slice(areaStart,areaEnd);
 area=area.replace('inout ReflectedLight reflectedLight ) {','inout ReflectedLight reflectedLight, const in mat3 birthdayLtcDiffuseTransform, const in mat3 birthdayLtcSpecularTransform, const in vec3 birthdayLtcFresnel ) {');
 area=area.replace(physical.slice(uvStart,contributionStart),'');
 area=area.replace('lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords )','lightColor * birthdayLtcFresnel * BirthdayLTC_Evaluate( position, birthdayLtcSpecularTransform, rectCoords )');
 area=area.replace('LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords )','BirthdayLTC_Evaluate( position, birthdayLtcDiffuseTransform, rectCoords )');
 const prepared=`${declaration}
\tvec2 birthdayLtcUv = LTC_Uv( geometryNormal, geometryViewDir, material.roughness );
\tvec4 birthdayLtc1 = texture2D( ltc_1, birthdayLtcUv );
\tvec4 birthdayLtc2 = texture2D( ltc_2, birthdayLtcUv );
\tmat3 birthdayLtcInverse = mat3(
\t\tvec3( birthdayLtc1.x, 0, birthdayLtc1.y ),
\t\tvec3( 0, 1, 0 ),
\t\tvec3( birthdayLtc1.z, 0, birthdayLtc1.w )
\t);
\tvec3 birthdayLtcT1 = normalize( geometryViewDir - geometryNormal * dot( geometryViewDir, geometryNormal ) );
\tvec3 birthdayLtcT2 = - cross( geometryNormal, birthdayLtcT1 );
\tmat3 birthdayLtcDiffuseTransform = transposeMat3( mat3( birthdayLtcT1, birthdayLtcT2, geometryNormal ) );
\tmat3 birthdayLtcSpecularTransform = birthdayLtcInverse * birthdayLtcDiffuseTransform;
\tvec3 birthdayLtcFresnel = ( material.specularColor * birthdayLtc2.x + ( vec3( 1.0 ) - material.specularColor ) * birthdayLtc2.y );`;
 return {
  physical:physical.slice(0,evaluateStart)+preparedEvaluate+physical.slice(evaluateEnd,areaStart)+area+physical.slice(areaEnd),
  begin:begin.replace(declaration,prepared).replace(areaCall,areaCall.replace('reflectedLight );','reflectedLight, birthdayLtcDiffuseTransform, birthdayLtcSpecularTransform, birthdayLtcFresnel );')),
  changed:true,
 };
}

// These fragment inputs are identical for every area emitter.
const shared=prepareAreaLightWork(areaChunk,pointChunk);
const guarded=new WeakSet<MeshStandardMaterial>();

/** Preserve direct light results while skipping computations whose contribution is already zero. */
export function guardLightWork(root:Group){
 root.traverse(object=>{
  if(!(object instanceof Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!(material instanceof MeshStandardMaterial)||guarded.has(material))continue;
   guarded.add(material);
   const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){
    previousCompile.call(this,shader,renderer);
    const canShare=shared.changed&&shader.fragmentShader.includes('#include <lights_fragment_begin>')&&shader.fragmentShader.includes('#include <lights_physical_pars_fragment>');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',canShare?shared.begin:pointChunk).replace('#include <lights_physical_pars_fragment>',canShare?shared.physical:areaChunk);
   };
   // Capture the old key first: Three's default derives it from the current hook.
   material.customProgramCacheKey=()=>`${previousKey}:birthday-light-guard-shared-area-v1`;
   material.needsUpdate=true;
  }
 });
}
