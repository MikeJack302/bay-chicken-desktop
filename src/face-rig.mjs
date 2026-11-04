import * as THREE from 'three';
export function createFaceRig(bones,eyeMesh,body,skin){
 const uniforms={uClosedL:{value:0},uClosedR:{value:0}},arcs=[];
 eyeMesh.material.transparent=true;eyeMesh.material.depthWrite=false;
 eyeMesh.material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float eyeSide;').replace('#include <begin_vertex>','#include <begin_vertex>\neyeSide=position.x;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float eyeSide;uniform float uClosedL;uniform float uClosedR;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.0-(eyeSide<0.0?uClosedL:uClosedR);');
 };eyeMesh.material.customProgramCacheKey=()=> 'expressive-eye';
 for(const side of['L','R']){
  const material=new THREE.MeshStandardMaterial({color:skin==='pink'?'#692139':'#122c49',roughness:.78,transparent:true,depthWrite:false});
  const arc=new THREE.Mesh(new THREE.TorusGeometry(.102,.014,8,24,Math.PI),material);arc.name='smiling-eye-'+side;arc.position.set(side==='L'?-.60:.626,.445,side==='L'?.785:.765);arc.rotation.y=side==='L'?-.18:.18;arc.userData.bodyPart='eyes';bones.head.add(arc);arcs.push(arc);
 }
 const rest=body.geometry.attributes.position.array.slice(),morph=new Float32Array(rest.length),mask=new Float32Array(rest.length/3);
 for(let i=0;i<mask.length;i++){
  const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];mask[i]=THREE.MathUtils.smoothstep(z,.78,.96)*(1-THREE.MathUtils.smoothstep(y,1.65,1.82))*THREE.MathUtils.smoothstep(y,1.38,1.52)*(1-THREE.MathUtils.smoothstep(Math.abs(x),.48,.65));
  morph[i*3]=rest[i*3];morph[i*3+1]=y+.025*Math.pow(Math.min(1,Math.abs(x)/.48),1.3)*mask[i];morph[i*3+2]=z;
 }
 body.geometry.morphAttributes.position=[new THREE.BufferAttribute(morph,3)];body.updateMorphTargets();
 let left=0,right=0,smile=0,curve=1;
 function update(p,dt){const a=1-Math.exp(-dt*18);left=THREE.MathUtils.lerp(left,p.closedL||0,a);right=THREE.MathUtils.lerp(right,p.closedR||0,a);smile=THREE.MathUtils.lerp(smile,p.mouthSmile||0,a);curve=THREE.MathUtils.lerp(curve,p.lidCurve??1,a);
  const displayL=THREE.MathUtils.smoothstep(left,.15,.55),displayR=THREE.MathUtils.smoothstep(right,.15,.55);
  uniforms.uClosedL.value=displayL;uniforms.uClosedR.value=displayR;body.morphTargetInfluences[0]=smile;
  arcs.forEach((arc,i)=>{const value=i===0?displayL:displayR;arc.visible=value>.015;arc.material.opacity=value;arc.scale.y=curve;});
 }
 return{update,arcs,diagnostics:()=>({left,right,smile,curve})};
}
