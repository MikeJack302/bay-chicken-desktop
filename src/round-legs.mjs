import * as THREE from 'three';
const rings=25,sides=18;
export function createRoundLegs(group,bones,source){
 const original=source.geometry.attributes.position,uv=source.geometry.attributes.uv;
 function nearestUV(point){let best=Infinity,index=0;for(let i=0;i<original.count;i++){const d=(original.getX(i)-point.x)**2+(original.getY(i)-point.y)**2+(original.getZ(i)-point.z)**2;if(d<best){best=d;index=i;}}return new THREE.Vector2(uv.getX(index),uv.getY(index));}
 const coat=nearestUV(new THREE.Vector3(.52,.48,.04)),meshes=[],samples=[];
 const capGeometry=new THREE.SphereGeometry(1,28,16),capPos=capGeometry.attributes.position,capUv=capGeometry.attributes.uv;
 for(let i=0;i<capPos.count;i++){const p=new THREE.Vector3(capPos.getX(i)*.52,.44+capPos.getY(i)*.20,.02+capPos.getZ(i)*.47),u=nearestUV(p);capUv.setXY(i,u.x,u.y);}
 const cap=new THREE.Mesh(capGeometry,source.material.clone());cap.name='rounded-pelvis';cap.scale.set(.52,.20,.47);cap.position.set(0,-.06,.02);bones.hips.add(cap);cap.userData.bodyPart='body';
 // The underside is closed by the cap; the original head, torso and chest artwork remain.
 source.material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float restHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nrestHeight=position.y;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float restHeight;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(restHeight<0.35)discard;');};source.material.customProgramCacheKey=()=> 'round-leg-body-clip';
 const cast=source.raycast.bind(source),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hitPoint=new THREE.Vector3(),bary=new THREE.Vector3();
 source.raycast=(raycaster,hits)=>{const found=[];cast(raycaster,found);for(const hit of found){const f=hit.face;source.getVertexPosition(f.a,a);source.getVertexPosition(f.b,b);source.getVertexPosition(f.c,c);source.worldToLocal(hitPoint.copy(hit.point));THREE.Triangle.getBarycoord(hitPoint,a,b,c,bary);if(original.getY(f.a)*bary.x+original.getY(f.b)*bary.y+original.getY(f.c)*bary.z>=.35)hits.push(hit);}};
 for(const side of['L','R']){
  const geometry=new THREE.BufferGeometry(),positions=new Float32Array((rings*sides+2)*3),uvs=new Float32Array((rings*sides+2)*2),indices=[];
  for(let r=0;r<rings;r++)for(let j=0;j<sides;j++){const i=r*sides+j;uvs.set([coat.x,coat.y],i*2);if(r<rings-1){const n=r*sides+(j+1)%sides;indices.push(i,n,i+sides,n,n+sides,i+sides);}}
  for(let j=0;j<sides;j++){indices.push(rings*sides,(j+1)%sides,j,rings*sides+1,(rings-1)*sides+j,(rings-1)*sides+(j+1)%sides);}uvs.set([coat.x,coat.y,coat.x,coat.y],rings*sides*2);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,source.material.clone());mesh.material.onBeforeCompile=()=>{};mesh.material.customProgramCacheKey=()=> 'round-leg';mesh.name='rounded-leg-'+side;mesh.userData.bodyPart='feet';mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);
  for(let i=0;i<rings*sides;i+=3)samples.push({mesh,index:i});
 }
 const inverse=new THREE.Matrix4(),hip=new THREE.Vector3(),knee=new THREE.Vector3(),ankle=new THREE.Vector3(),ball=new THREE.Vector3(),toe=new THREE.Vector3(),worldQ=new THREE.Quaternion(),rootQ=new THREE.Quaternion(),q=new THREE.Quaternion(),invQ=new THREE.Quaternion();
 const center=new THREE.Vector3(),tangent=new THREE.Vector3(),right=new THREE.Vector3(),other=new THREE.Vector3(),point=new THREE.Vector3(),local=new THREE.Vector3();
 function update(){
  group.updateWorldMatrix(true,true);inverse.copy(group.matrixWorld).invert();group.getWorldQuaternion(rootQ);
  for(let s=0;s<2;s++){
   const side=s===0?'L':'R',mesh=meshes[s],attr=mesh.geometry.attributes.position;
   bones['leg'+side].getWorldPosition(hip).applyMatrix4(inverse);bones['knee'+side].getWorldPosition(knee).applyMatrix4(inverse);bones['foot'+side].getWorldPosition(ankle).applyMatrix4(inverse);
   bones['foot'+side].getWorldQuaternion(worldQ);q.copy(rootQ).invert().multiply(worldQ);invQ.copy(q).invert();
   ball.set(0,-.03,.125).applyQuaternion(q).add(ankle);toe.set(0,-.035,.29).applyQuaternion(q).add(ankle);
   const curve=new THREE.CatmullRomCurve3([hip.clone(),knee.clone(),ankle.clone(),ball.clone(),toe.clone()],false,'centripetal');
   for(let r=0;r<rings;r++){
    const t=r/(rings-1);curve.getPoint(t,center);curve.getTangent(t,tangent).normalize();right.set(1,0,0).applyQuaternion(q).addScaledVector(tangent,-right.dot(tangent)).normalize();other.crossVectors(tangent,right).normalize();
    let rx,ry;if(t<=.75){rx=.153+.022*THREE.MathUtils.smoothstep(t,.4,.75);ry=.145-.040*THREE.MathUtils.smoothstep(t,.35,.75);}else{const u=(t-.75)/.25,cap=Math.sqrt(Math.max(.0001,1-u*u));rx=.175*cap;ry=.105*cap;}
    if(r===0){rx=.075;ry=.075;}
    for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;point.copy(center).addScaledVector(right,Math.cos(a)*rx).addScaledVector(other,Math.sin(a)*ry);
     if(t>.45){local.copy(point).sub(ankle).applyQuaternion(invQ);local.y=Math.max(-.14,local.y);point.copy(local).applyQuaternion(q).add(ankle);}attr.setXYZ(r*sides+j,point.x,point.y,point.z);
    }
   }
   attr.setXYZ(rings*sides,hip.x,hip.y,hip.z);attr.setXYZ(rings*sides+1,toe.x,toe.y,toe.z);attr.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
 }
 update();return{meshes,samples,cap,update};
}
