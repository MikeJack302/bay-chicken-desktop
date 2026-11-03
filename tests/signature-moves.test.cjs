const{test}=require('node:test'),assert=require('node:assert/strict');
const actions=['lion','ballet','mushroom'];
test('trial actions finish on the floor, clear the stool and keep the head scale intact',async()=>{
  const{createMotion,trigger,stepMotion,setPerch}=await import('../src/motion.mjs');
  for(const action of actions)for(const speed of[.6,1,1.6]){
    const m=createMotion(()=>.5);trigger(m,'sit');for(let i=0;i<300;i++)stepMotion(m,.02,{autoMotion:false});setPerch(m,'bottom');for(let i=0;i<70;i++)stepMotion(m,.02,{autoMotion:false});trigger(m,action);
    for(let i=0;i<900;i++){const p=stepMotion(m,.02,{autoMotion:false,motionSpeed:speed});for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));assert.ok(Math.abs(p.scaleY-1)<.01,action+' preserves the model size');}
    assert.equal(m.mode,'idle');assert.equal(m.posture,'stand');assert.equal(m.edgeSide,null);assert.equal(m.output.chair,0);assert.equal(m.output.torsoDrop,0);
  }
});
test('deep squat has gradual entry, a held pose and a gradual recovery',async()=>{
  const{signaturePose}=await import('../src/signature-moves.mjs');
  assert.equal(signaturePose('mushroom',0).torsoDrop,0);assert.ok(signaturePose('mushroom',3.2).torsoDrop>.06);assert.equal(signaturePose('mushroom',8.8).torsoDrop,0);
  const{createMotion,trigger,stepMotion}=await import('../src/motion.mjs');const m=createMotion(()=>.5);trigger(m,'mushroom');let old=stepMotion(m,.02,{autoMotion:false});
  for(let i=0;i<450;i++){const p=stepMotion(m,.02,{autoMotion:false});for(const k of['headX','headZ','legRollL','legRollR','hipsDrop','torsoDrop'])assert.ok(Math.abs(p[k]-old[k])<.045,k);old=p;}
});
test('interruptions and pause preserve the trial pose',async()=>{
  const{createMotion,trigger,stepMotion}=await import('../src/motion.mjs');const m=createMotion(()=>.5);trigger(m,'mushroom');for(let i=0;i<180;i++)stepMotion(m,.02,{autoMotion:false});const old={...m.output};trigger(m,'pause');assert.deepEqual(stepMotion(m,1),old);trigger(m,'wave');const p=stepMotion(m,.016,{autoMotion:false});for(const k of['hipsDrop','torsoDrop','legRollL','headX'])assert.ok(Math.abs(p[k]-old[k])<.01,k);
});
