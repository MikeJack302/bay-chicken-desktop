const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function geometryOnlyGlb(file){
 const b=fs.readFileSync(file),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));delete j.images;delete j.textures;delete j.materials;
 for(const m of j.meshes)for(const p of m.primitives)delete p.material;
 let s=JSON.stringify(j);while(Buffer.byteLength(s)%4)s+=' ';const json=Buffer.from(s),bin=b.subarray(20+n),out=Buffer.alloc(20+json.length+bin.length);
 out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);bin.copy(out,20+json.length);return out;
}
test('both original models step into a lunge, plant their feet during the lift and return to standing',async()=>{
 const THREE=await import('three'),{loadCharacter,poseCharacter}=await import('../src/character.js'),{createMotion,trigger,stepMotion}=await import('../src/motion.mjs');
 for(const skin of['white','pink']){
  const c=await loadCharacter(geometryOnlyGlb(require('node:path').join(__dirname,'../assets/models',skin+'.glb')),skin),m=createMotion(()=>.5);trigger(m,'barbell');
  c.group.updateMatrixWorld(true);
  for(const mesh of c.meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i+=7){const rest=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i),posed=mesh.getVertexPosition(i,new THREE.Vector3());assert.ok(rest.distanceTo(posed)<.000002,skin+' original rest shape is preserved');}
  for(let i=0;i<495;i++){
   const p=stepMotion(m,.02,{autoMotion:false,eyeTracking:false});poseCharacter(c,p,.02);c.group.updateMatrixWorld(true);
   if(p.footPlant>.999){
    for(const side of['L','R']){const v=c.bone['foot'+side].getWorldPosition(new THREE.Vector3()),goal=new THREE.Vector3((side==='L'?-.36:.36)+p['foot'+side+'X'],.14+p['footLift'+side],.11+p['foot'+side+'Z']);assert.ok(v.distanceTo(goal)<.0001,skin+' foot follows its step target');
     if(p.toyTime>2.5&&p.toyTime<6.3){const q=c.bone['foot'+side].getWorldQuaternion(new THREE.Quaternion()),normal=new THREE.Vector3(0,1,0).applyQuaternion(q);assert.ok(normal.distanceTo(new THREE.Vector3(0,1,0))<.025,skin+' sole stays flat');assert.ok(Math.abs(p['footLift'+side])<1e-8);}
    }
   }
  }
 }
});
module.exports={geometryOnlyGlb};
