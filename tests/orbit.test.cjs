const {test}=require('node:test');const assert=require('node:assert/strict');
test('orbit supports full horizontal turn, upper/lower views, zoom limits and reset',async()=>{
  const {createOrbit,rotateOrbit,zoomOrbit,resetOrbit,stepOrbit}=await import('../src/orbit.mjs');const v=createOrbit();
  rotateOrbit(v,1000,1000);assert.ok(Math.abs(v.targetYaw)>Math.PI*2);assert.equal(v.targetPitch,1.35);
  rotateOrbit(v,0,-1000);assert.equal(v.targetPitch,-1.25);
  zoomOrbit(v,-100000);assert.equal(v.targetDistance,5.5);zoomOrbit(v,100000);assert.equal(v.targetDistance,11.5);
  resetOrbit(v);for(let i=0;i<150;i++)stepOrbit(v,.016);assert.ok(Math.abs(Math.sin(v.yaw))<.001);assert.ok(Math.abs(v.pitch-.045)<.001);assert.ok(Math.abs(v.distance-7.8)<.001);
});
