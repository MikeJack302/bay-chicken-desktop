const{test}=require('node:test'),assert=require('node:assert/strict');
test('expressions follow gesture phases and settle when the gesture ends',async()=>{
 const{faceCue}=await import('../src/expressions.mjs');
 assert.ok(faceCue('wave',.95,3.6).closedL>.95);assert.ok(faceCue('wave',.95,3.6).closedR<.3);
 assert.ok(faceCue('eat',2.5,6.8).closedL>.9);assert.ok(faceCue('barbell',4.4,9.9).aperture<.9);assert.ok(faceCue('barbell',8.4,9.9).closedL>.9);
 assert.equal(faceCue('sleep',2,100).lidCurve,-1);assert.equal(faceCue('idle',1).closedL,0);
 for(const [mode,d]of[['barbell',9.9],['spring',6.8],['wave',3.6],['dance',9],['eat',6.8]]){const f=faceCue(mode,d,d);assert.equal(f.closedL,0);assert.equal(f.closedR,0);assert.equal(f.mouthSmile,0);}
});
test('all expression values and blends stay finite, including interruption and pause',async()=>{
 const{createMotion,trigger,stepMotion,ACTIONS}=await import('../src/motion.mjs');const m=createMotion(()=>.5);
 for(const mode of Object.keys(ACTIONS)){trigger(m,mode);for(let i=0;i<120;i++){const p=stepMotion(m,.02,{autoMotion:false});for(const k of['closedL','closedR','mouthSmile'])assert.ok(p[k]>=0&&p[k]<=1,`${mode} ${k}`);assert.ok(Number.isFinite(p.lidCurve));}}
 trigger(m,'dance');for(let i=0;i<50;i++)stepMotion(m,.02,{autoMotion:false});const old={...m.output};trigger(m,'wave');const p=stepMotion(m,.016,{autoMotion:false});assert.ok(Math.abs(old.closedR-p.closedR)<.02);trigger(m,'pause');assert.deepEqual(stepMotion(m,1),p);
});
