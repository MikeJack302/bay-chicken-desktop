import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const smooth = (a,b,x) => { const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };
function smoothNormals(geometry) {
  const p=geometry.attributes.position,index=geometry.index,acc=new Map(),keys=[];
  for(let i=0;i<p.count;i++) { const k=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e5)).join(',');keys.push(k);if(!acc.has(k))acc.set(k,new THREE.Vector3()); }
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3();
  for(let i=0;i<(index?.count||p.count);i+=3) { const ids=[0,1,2].map(n=>index?index.getX(i+n):i+n);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);cross.subVectors(b,a).cross(c.sub(a));for(const n of ids)acc.get(keys[n]).add(cross); }
  for(const n of acc.values())n.normalize();const normals=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++)acc.get(keys[i]).toArray(normals,i*3);
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
}

export async function loadCharacter(bytes,name) {
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const factor=3.28/size.y;
  const normalization=new THREE.Matrix4().makeScale(factor,factor,factor).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  const group=new THREE.Group(),bones=[],bone={};
  function add(id,parent,pos) { const b=new THREE.Bone();b.name=id;b.position.set(...pos);(parent?bone[parent]:group).add(b);bone[id]=b;bones.push(b);return bones.length-1; }
  const ids={};
  ids.base=add('base',null,[0,0,0]);ids.hips=add('hips','base',[0,.5,0]);ids.torso=add('torso','hips',[0,.5,0]);
  ids.head=add('head','torso',[0,.45,0]);ids.armL=add('armL','torso',[-.60,.04,0]);ids.armR=add('armR','torso',[.60,.04,0]);
  ids.legL=add('legL','hips',[-.36,-.12,.03]);ids.legR=add('legR','hips',[.36,-.12,.03]);ids.tail=add('tail','hips',[0,-.08,-.5]);
  ids.eyeL=add('eyeL','head',[-.60,.451,.62]);ids.eyeR=add('eyeR','head',[.626,.451,.60]);
  const skeleton=new THREE.Skeleton(bones);group.updateMatrixWorld(true);skeleton.calculateInverses();
  const meshes=[],feet=[],screenSamples=[];let eyeMeshCount=0;
  gltf.scene.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry.clone().applyMatrix4(normalization.clone().multiply(object.matrixWorld));smoothNormals(geometry);
    const positions=geometry.attributes.position,box=new THREE.Box3().setFromBufferAttribute(positions);
    // The exported eyes are two disconnected pieces in one mesh. They have
    // their own bones, so gaze/blink move the original eyes and original UVs.
    const eyes=box.min.y>1.6&&box.max.y<2.2&&box.min.z>.4;
    if(eyes)eyeMeshCount++;
    const skinIndices=new Uint16Array(positions.count*4),skinWeights=new Float32Array(positions.count*4);
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),side=x<0?'L':'R';let weights;
      if(eyes)weights=[[ids['eye'+side],1]];
      else {
        const head=smooth(1.13,1.52,y),arm=smooth(.57,.88,Math.abs(x))*(1-smooth(.96,1.14,y))*smooth(.42,.60,y);
        const tail=(1-smooth(-.95,-.58,z))*(1-smooth(.8,1.25,y));
        const leg=(1-smooth(.28,.64,y))*(1-tail);
        const remaining=Math.max(0,1-head-arm-tail-leg),torso=smooth(.4,.9,y);
        weights=[[ids.head,head],[ids['arm'+side],arm],[ids.tail,tail],[ids['leg'+side],leg],[ids.torso,remaining*torso],[ids.hips,remaining*(1-torso)]].filter(w=>w[1]>.0001).sort((a,b)=>b[1]-a[1]).slice(0,4);
      }
      const total=weights.reduce((sum,w)=>sum+w[1],0);
      weights.forEach(([index,weight],j)=>{skinIndices[i*4+j]=index;skinWeights[i*4+j]=weight/total;});
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
    const material=object.material.clone();material.metalness=.025;material.roughness=.57;material.side=THREE.FrontSide;
    const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=object.name;mesh.frustumCulled=false;group.add(mesh);mesh.bind(skeleton,new THREE.Matrix4());meshes.push(mesh);
    mesh.userData.bodyPart=eyes?'eyes':box.min.y>2.55?'crown':box.max.z<-.2&&box.min.y>1.5?'back':'body';
    for(let i=0;i<positions.count;i+=3)if(positions.getY(i)<.18)feet.push({mesh,index:i});
    for(let i=0;i<positions.count;i+=3)screenSamples.push({mesh,index:i});
  });
  group.visible=false;
  return {group,bone,meshes,feet,screenSamples,info:{source:'published-source-glb',meshes:meshes.length,texturedMeshes:meshes.filter(m=>m.material.map).length,bones:bones.length,eyeMeshes:eyeMeshCount,normalizedHeight:3.28,skin:name}};
}
const footPoint=new THREE.Vector3();
export function footHeight(character){character.group.updateMatrixWorld(true);let low=Infinity;for(const {mesh,index}of character.feet){mesh.getVertexPosition(index,footPoint);low=Math.min(low,footPoint.y);}return Number.isFinite(low)?low:0;}

export function poseCharacter(character,p,dt) {
  const {bone:b}=character,alpha=1-Math.exp(-dt*15);
  function rot(id,x=0,y=0,z=0) { const r=b[id].rotation;r.x=THREE.MathUtils.lerp(r.x,x,alpha);r.y=THREE.MathUtils.lerp(r.y,y,alpha);r.z=THREE.MathUtils.lerp(r.z,z,alpha); }
  b.hips.position.y=THREE.MathUtils.lerp(b.hips.position.y,.5-p.sit*.30,alpha);
  b.hips.position.z=THREE.MathUtils.lerp(b.hips.position.z,-p.sit*.12,alpha);
  rot('hips',p.sit*.09);rot('torso',-p.sit*.08+p.breath+(p.torsoX||0),0,p.sway*.12);
  rot('head',p.headX,p.headY,p.headZ);rot('armL',p.armLX,0,p.armL);rot('armR',p.armRX,0,p.armR);
  rot('legL',-p.sit*1.22+p.legL,p.sit*-.15,-p.sit*.12);rot('legR',-p.sit*1.22+p.legR,p.sit*.15,p.sit*.12);rot('tail',0,p.tail,0);
  for(const side of ['L','R']) { const eye=b['eye'+side];rot('eye'+side,-p.gazeY*.20,p.gazeX*.26,0);eye.scale.y=THREE.MathUtils.lerp(eye.scale.y,Math.max(.025,p['eye'+side]),1-Math.exp(-dt*32));eye.scale.x=THREE.MathUtils.lerp(eye.scale.x,p.wide,alpha); }
}
