const{test}=require('node:test');const assert=require('node:assert/strict');
test('every region has varied reactions and never immediately repeats',async()=>{
  const{REACTIONS,createInteractionState,chooseReaction,surfacePart}=await import('../src/interactions.mjs');const state=createInteractionState();
  for(const[part,pool]of Object.entries(REACTIONS)){let last;const seen=new Set();for(let i=0;i<50;i++){const a=chooseReaction(state,part,{},()=>.5);assert.ok(pool.includes(a));assert.notEqual(a,last);seen.add(a);last=a;}assert.ok(seen.size>=2);}
  assert.equal(chooseReaction(state,'head',{sleeping:true}),'pet');
  assert.equal(surfacePart({x:0,y:.6,z:-.9}),'tail');assert.equal(surfacePart({x:.9,y:.8,z:0}),'hands');assert.equal(surfacePart({x:0,y:.1,z:0}),'feet');assert.equal(surfacePart({x:0,y:3,z:0},'crown'),'crown');
});
test('dock follows the object rather than the viewport bottom',async()=>{
  const{dockAnchor}=await import('../src/layout.mjs');const box={left:40,right:240,top:80,bottom:300};
  for(const height of[400,760,1100]){const a=dockAnchor(box,{width:320,height});assert.equal(a.y,308);assert.equal(a.x,140);assert.equal(a.placement,'below');}
  const close=dockAnchor({...box,bottom:342},{width:320,height:402},{width:130,height:52});assert.equal(close.placement,'below');assert.equal(close.y,345);
  const a=dockAnchor({left:-60,right:380,top:0,bottom:500},{width:320,height:400});assert.ok(a.x>=70&&a.x<=250);assert.ok(a.y>=5&&a.y<=347);
});
test('seat sequence completes and sleeping on the stool wakes without losing it',async()=>{
  const{createMotion,trigger,stepMotion}=await import('../src/motion.mjs');const m=createMotion(()=>.5);
  trigger(m,'sit');assert.equal(m.mode,'sitDown');for(let i=0;i<250;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.mode,'idle');assert.equal(m.output.chair,1);assert.equal(m.output.sit,1);
  trigger(m,'eat');for(let i=0;i<350;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.posture,'sit');assert.equal(m.output.chair,1);
  trigger(m,'stand');for(let i=0;i<160;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.output.chair,0);assert.equal(m.output.sit,0);
  trigger(m,'sleep');for(let i=0;i<260;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.mode,'sleep');assert.equal(m.output.chair,1);
  trigger(m,'pet');for(let i=0;i<200;i++)stepMotion(m,.02,{autoMotion:false});assert.equal(m.mode,'idle');assert.equal(m.posture,'sit');assert.equal(m.output.chair,1);
});
