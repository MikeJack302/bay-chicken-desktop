const{_electron}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('test-results/playful');await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env,recordVideo:{dir:path.join(out,'video'),size:{width:640,height:800}}});let video,pinkSeconds;const epoch=Date.now(),errors=[],samples=[];
 try{
  const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>window.petDiagnostics?.ready);video=p.video();
  await p.addStyleTag({content:'body.pet-page{background:#f7f7f5}'});
  await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false,eyeTracking:false,scale:.95,skin:'pink'});});await p.mouse.move(2,2);
  for(const skin of['pink','white']){
   await p.evaluate(async skin=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin});},skin);
   for(const action of['barbell','spring']){
    await p.evaluate(a=>bay.action(a),action);await p.waitForFunction(({action})=>petDiagnostics.mode===action&&petDiagnostics.time>=(action==='barbell'?4.3:1.4),{action});
    const d=await p.evaluate(()=>petDiagnostics);if(action==='barbell'){
     assert.ok(d.props.visible.includes('blue-barbell'));await p.mouse.move(170,250);await p.mouse.down({button:'right'});await p.mouse.move(105,250,{steps:15});await p.mouse.up({button:'right'});
    }
    await p.waitForFunction(()=>petDiagnostics.mode==='idle');
    if(action==='barbell'){await p.evaluate(()=>bay.action('reset-view'));await p.waitForTimeout(400);}
   }
   if(skin==='pink')pinkSeconds=(Date.now()-epoch)/1000;
  }
  // The continuous recording comes first. Stills are paused separately so capture time cannot skip a phase.
  for(const skin of['pink','white']){
   await p.evaluate(async skin=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin});},skin);
   for(const[action,times]of[['barbell',[.8,3.6,6.5]],['spring',[.9,1.42,1.91,3.05]]]){
    await p.evaluate(a=>bay.action(a),action);
    for(const t of times){await p.waitForFunction(({action,t})=>petDiagnostics.mode===action&&petDiagnostics.time>=t,{action,t});
     await p.evaluate(()=>bay.action('pause'));await p.waitForFunction(()=>petDiagnostics.paused);
     await p.screenshot({path:path.join(out,`${skin}-${action}-${t}.png`)});const d=await p.evaluate(()=>petDiagnostics);assert.equal(d.mode,action);samples.push({skin,action,t,actual:d.pose.toyTime,pose:d.pose,props:d.props,view:d.view,rig:d.rig});
     if(action==='barbell'&&t>1.0&&t<6){assert.ok(d.props.visible.includes('blue-barbell'));assert.ok(Math.abs(d.props.barGripSpan-1.8)<.12,`grip span ${d.props.barGripSpan}`);}
     await p.evaluate(()=>bay.action('pause'));await p.waitForFunction(()=>!petDiagnostics.paused);
    }
    await p.waitForFunction(()=>petDiagnostics.mode==='idle');assert.equal(await p.evaluate(()=>petDiagnostics.props.visible.includes('blue-barbell')),false);
   }
  }
  await p.evaluate(()=>bay.action('barbell'));await p.waitForTimeout(3200);await p.mouse.move(175,200);await p.mouse.down({button:'right'});await p.mouse.move(105,200,{steps:15});await p.mouse.up({button:'right'});await p.waitForTimeout(300);await p.screenshot({path:path.join(out,'white-barbell-side.png')});
  await p.evaluate(()=>bay.action('wave'));await p.waitForTimeout(1000);assert.equal(await p.evaluate(()=>petDiagnostics.props.visible.includes('blue-barbell')),false);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'diagnostics.json'),JSON.stringify({errors,samples,pinkSeconds},null,2));console.log(JSON.stringify({passed:true,samples:samples.length,pinkSeconds,errors},null,2));
 }finally{await app.close();}if(video)await video.saveAs(path.join(out,'playful-trial.webm'));
})().catch(e=>{console.error(e);process.exitCode=1;});
