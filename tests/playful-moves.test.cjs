const{test}=require('node:test'),assert=require('node:assert/strict');
test('barbell grip stays at a fixed width during the lift, with no torso compression',async()=>{
  const THREE=await import('three'),{barbellPose,BARBELL_GRIP:g}=await import('../src/playful-moves.mjs');
  for(let t=.7;t<9.1;t+=.02){
    const p=barbellPose(t),a=new THREE.Vector3(-g.palmX,g.palmY,g.palmZ).applyEuler(new THREE.Euler(p.armLX,p.armLY,p.armL)).add(new THREE.Vector3(-.60,1.04,0));
    const b=new THREE.Vector3(g.palmX,g.palmY,g.palmZ).applyEuler(new THREE.Euler(p.armRX,p.armRY,p.armR)).add(new THREE.Vector3(.60,1.04,0));
    assert.ok(Math.abs(a.y-b.y)<1e-9);assert.ok(Math.abs(a.z-b.z)<1e-9);assert.ok(Math.abs(a.distanceTo(b)-1.8)<1e-9);
    assert.equal(p.scaleY,undefined);assert.equal(p.torsoDrop,undefined);
  }
  assert.equal(barbellPose(0).barbell,0);assert.equal(barbellPose(9.9).barbell,0);
});
test('spring hops have three airborne phases, ground contact and a settled finish',async()=>{
  const{springPose}=await import('../src/playful-moves.mjs');let phases=0,air=false,max=0,old=0;
  for(let t=0;t<6.8;t+=.01){const p=springPose(t);assert.ok(p.y>=0);assert.ok(Math.abs(p.y-old)<.025);old=p.y;
    if(p.y>0&&!air){phases++;air=true;}if(p.y===0)air=false;max=Math.max(max,p.y);
    for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));
  }
  assert.equal(phases,3);assert.ok(max>.3&&max<.36);assert.equal(springPose(6.8).y,0);
});
