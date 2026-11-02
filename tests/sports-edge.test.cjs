const{test}=require('node:test'),assert=require('node:assert/strict');
test('screen edges support negative monitor coordinates and exact grip alignment',()=>{
  const{nearestEdge,dockPosition,visibleRect}=require('../electron/edges.cjs'),a={x:-1440,y:100,width:1440,height:800},b={x:-1440,y:300,width:320,height:400};
  assert.equal(nearestEdge(b,a),'left');assert.equal(nearestEdge({...b,x:-900},a),null);
  for(const side of['left','right','top','bottom']){const g={x:148,y:245},p=dockPosition(b,a,side,g);assert.equal(['left','right'].includes(side)?p.x+g.x:p.y+g.y,side==='left'?a.x:side==='right'?a.x+a.width:side==='top'?a.y:a.y+a.height);const r=visibleRect({...b,...p},a);assert.ok(r.right>r.left&&r.bottom>r.top);}
});
test('perched motions remain finite, keep props off the border, and detach smoothly',async()=>{
  const{createMotion,setPerch,stepMotion,trigger}=await import('../src/motion.mjs');
  for(const side of['left','right','top','bottom']){const m=createMotion(()=>.5);setPerch(m,side);for(let i=0;i<100;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.output.edgeAmount,1);assert.equal(m.output.chair,0);trigger(m,'pet');for(let i=0;i<200;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.edgeSide,side);assert.equal(m.output.edgeAmount,1);setPerch(m,null);for(let i=0;i<100;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.output.edgeAmount,0);}
});
test('racket motions share the contact clock and clean up after the action',async()=>{
  const{createMotion,trigger,stepMotion}=await import('../src/motion.mjs'),{tennisSample}=await import('../src/tennis.mjs');
  assert.equal(tennisSample(0,1.8).swing,1);assert.equal(tennisSample(1,3.1).swing,1);assert.ok(tennisSample(1,1.9).toss);
  for(const action of['tennis','serve','victory']){const m=createMotion(()=>.5);trigger(m,action);let saw=false;for(let i=0;i<550;i++){const p=stepMotion(m,.02,{autoMotion:false});for(const v of Object.values(p))if(typeof v==='number')assert.ok(Number.isFinite(v));saw ||=p.tennis>.9;}assert.ok(saw);assert.equal(m.output.tennis,0);}
});
