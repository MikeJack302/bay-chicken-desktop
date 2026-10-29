const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=()=>import('../src/motion.mjs');
test('sitting survives temporary interactions and explicit standing restores posture',async()=>{
  const {createMotion,trigger,stepMotion}=await load(),m=createMotion(()=>.5);
  trigger(m,'sit');trigger(m,'wave');
  for(let i=0;i<200;i++)stepMotion(m,.02,{autoMotion:false});
  assert.equal(m.mode,'idle');assert.equal(m.posture,'sit');
  trigger(m,'stand');assert.ok(stepMotion(m,.02).sit>.9,'standing up blends out of seated pose');for(let i=0;i<160;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.output.sit,0);
});
test('interrupting a gesture preserves continuity instead of snapping to bind pose',async()=>{
  const {createMotion,trigger,stepMotion}=await load(),m=createMotion(()=>.5);
  trigger(m,'wave');for(let i=0;i<60;i++)stepMotion(m,.02,{autoMotion:false});const old={...m.output};
  trigger(m,'bow');const next=stepMotion(m,.016,{autoMotion:false});
  for(const key of ['armR','headX','headY','headZ','y'])assert.ok(Math.abs(next[key]-old[key])<.025,key);
});
test('all poses stay finite and eyes remain in range at different speeds',async()=>{
  const {ACTIONS,createMotion,trigger,stepMotion}=await load();
  for(const speed of [.6,1.6])for(const action of Object.keys(ACTIONS)){
    const m=createMotion(()=>.5);trigger(m,action);
    for(let i=0;i<800;i++){const p=stepMotion(m,.02,{autoMotion:false,motionSpeed:speed});for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v),action);assert.ok(p.eyeL>=0&&p.eyeL<=1);assert.ok(p.eyeR>=0&&p.eyeR<=1);}
  }
});
test('pause freezes time and pose; automatic motion respects opt-out',async()=>{
  const {createMotion,trigger,stepMotion}=await load(),m=createMotion(()=>.5);
  trigger(m,'dance');stepMotion(m,.7);trigger(m,'pause');const p=stepMotion(m,0);assert.deepEqual(stepMotion(m,4),p);
  trigger(m,'stand');for(let i=0;i<2000;i++)stepMotion(m,.03,{autoMotion:false});assert.equal(m.mode,'idle');
  m.nextAuto=m.clock;stepMotion(m,.1,{autoMotion:true});assert.notEqual(m.mode,'idle');
});
test('eyes acquire a new target before the head follows',async()=>{
  const {createMotion,stepMotion}=await load(),m=createMotion(()=>.5);
  stepMotion(m,.03,{autoMotion:false},{x:1,y:.5,near:true});
  assert.ok(m.gazeX>m.headLookX*3);assert.ok(m.gazeY>m.headLookY*3);
});
