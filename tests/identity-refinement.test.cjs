const{test}=require('node:test'),assert=require('node:assert/strict');
const{validateSettings,DEFAULTS,offlineReply,streamChat}=require('../electron/core.cjs');

test('names preserve emoji graphemes, remove control text, and keep the saved size',()=>{
  const emoji='👩🏽‍🚀',name=emoji.repeat(17),settings=validateSettings({...DEFAULTS,nickname:name,scale:1.15});
  assert.equal(settings.nickname,emoji.repeat(16));assert.equal(settings.scale,1.15);
  assert.equal(validateSettings({nickname:'  茶茶\u202e\u0000  🎾  '}).nickname,'茶茶 🎾');
  assert.equal(validateSettings({nickname:' \n '}).nickname,'湾湾');
  assert.equal(validateSettings({nickname:'<茶茶&>'}).nickname,'<茶茶&>');
  assert.match(offlineReply('你好','茶茶🎾'),/茶茶🎾报到/);
});
test('the AI introduction uses the saved name on both supported protocols',async()=>{
  for(const provider of ['openai','compatible']){
    let body;await streamChat({settings:{...DEFAULTS,provider,nickname:'茶茶🎾'},key:'test-only',messages:[],onDelta:()=>{},fetchImpl:async(_url,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify(provider==='openai'?{output:[{content:[{text:'你好'}]}]}:{choices:[{message:{content:'你好'}}]}),{headers:{'content-type':'application/json'}});}});
    assert.match(provider==='openai'?body.instructions:body.messages[0].content,/茶茶🎾/);
  }
});
test('tennis racket has an open Y throat, thick oval frame and a 16 by 19 string bed',async()=>{
  const{buildTennisRacket,RACKET_PROFILE:p}=await import('../src/tennis-racket.mjs');const racket=buildTennisRacket();
  for(const name of ['thick-oval-frame','open-y-throat--1','open-y-throat-1','throat-bridge','octagonal-grip','grip-wrap'])assert.ok(racket.getObjectByName(name),name);
  const bed=racket.getObjectByName('16x19-string-bed');assert.equal(bed.geometry.attributes.position.count,2*(16+19));
  assert.ok(p.beam/p.rx>.09);assert.ok(p.ballRadius/p.rx<.30);
  for(const child of racket.children){const pos=child.geometry.attributes.position;for(let i=0;i<pos.array.length;i++)assert.ok(Number.isFinite(pos.array[i]));}
});
test('perching settles once, keeps the face upright, and allows touch reactions while gripping',async()=>{
  const{createMotion,stepMotion,setPerch,trigger}=await import('../src/motion.mjs');
  for(const side of ['left','right','bottom','top']){
    const m=createMotion(()=>.5);for(let i=0;i<20;i++)stepMotion(m,.02,{autoMotion:false});setPerch(m,side);
    let old=m.output,maxStep=0;
    for(let i=0;i<150;i++){const p=stepMotion(m,.02,{autoMotion:false});maxStep=Math.max(maxStep,Math.abs(p.headZ-old.headZ),Math.abs(p.edgeRoll-old.edgeRoll));old=p;}
    assert.ok(maxStep<.13,`${side} smooth entry`);assert.equal(m.output.edgeAmount,1);
    if(side==='left'||side==='right')assert.ok(Math.abs(m.output.edgeRoll+m.output.headZ)<.75,'head counters the lean');
    const elapsed=m.edgeElapsed;trigger(m,'pet');for(let i=0;i<20;i++)stepMotion(m,.02,{autoMotion:false});assert.ok(m.edgeElapsed>elapsed,'touch does not restart grabbing');assert.equal(m.edgeSide,side);
    assert.ok(Math.abs(m.output.scaleY-1)<.01,'perching does not change body size');
  }
});
