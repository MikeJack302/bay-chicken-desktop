const{test}=require('node:test'),assert=require('node:assert/strict');
test('left moves, right rotates, and small hand tremors still count as clicks',async()=>{
  const{beginGesture,moveGesture,gestureResult}=await import('../src/gestures.mjs');const e={pointerId:1,button:0,screenX:500,screenY:300};
  const g=beginGesture(e);moveGesture(g,{...e,screenX:503});assert.equal(gestureResult(g),'click');
  assert.equal(moveGesture(g,{...e,screenX:508}).started,true);assert.equal(gestureResult(g),'move');
  moveGesture(g,{...e,screenX:500});assert.equal(gestureResult(g),'move','return to origin does not turn a drag into a click');
  const r=beginGesture({...e,button:2});assert.equal(gestureResult(r),'menu');moveGesture(r,{...e,screenY:320});assert.equal(gestureResult(r),'rotate');assert.equal(gestureResult(r,true),'cancel');
  assert.equal(moveGesture(r,{...e,pointerId:2}),null);assert.equal(beginGesture({...e,button:4}),null);
});
test('Option or Alt plus left drag rotates while the move handle still moves',async()=>{
  const{beginGesture,moveGesture,gestureResult}=await import('../src/gestures.mjs');const e={pointerId:1,button:0,altKey:true,screenX:120,screenY:100},g=beginGesture(e);moveGesture(g,{...e,screenX:145});assert.equal(gestureResult(g),'rotate');assert.equal(beginGesture(e,true).purpose,'move');
});
test('window placement stays visible on small, negative-coordinate and mixed DPI work areas',()=>{
  const{clampToArea,dragPosition}=require('../electron/desktop.cjs');const a={x:-1536,y:-200,width:1536,height:824};
  assert.deepEqual(clampToArea({x:-9999,y:9999},320,400,a),{x:-1536,y:224});
  assert.deepEqual(dragPosition({x:-1000,y:0,cursor:{x:-900,y:100}},{x:-850,y:150},320,400,a),{x:-950,y:50});
  assert.deepEqual(clampToArea({x:50,y:60},320,400,{x:0,y:0,width:280,height:300}),{x:0,y:0});
});
