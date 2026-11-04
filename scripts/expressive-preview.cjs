const{_electron}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('test-results/expressive');await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[path.resolve('.'),'--smoke'],env,recordVideo:{dir:path.join(out,'video'),size:{width:640,height:800}}});const epoch=Date.now(),errors=[],samples=[];let video,clipSeconds;
 try{
  const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,250));});await p.waitForFunction(()=>window.petDiagnostics?.ready);video=p.video();
  await p.addStyleTag({content:'body.pet-page{background:#f7f7f5}'});await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin:'pink',scale:.95,autoMotion:false,eyeTracking:false});});await p.mouse.move(2,2);
  const wait=async(action,t)=>p.waitForFunction(({action,t})=>petDiagnostics.mode===action&&petDiagnostics.time>=t,{action,t});
  const shot=async(name)=>{await p.evaluate(()=>bay.action('pause'));await p.waitForFunction(()=>petDiagnostics.paused);await p.screenshot({path:path.join(out,name+'.png')});samples.push({name,...await p.evaluate(()=>({time:petDiagnostics.time,face:petDiagnostics.face,pose:petDiagnostics.pose,model:petDiagnostics.models[petDiagnostics.skin]}))});await p.evaluate(()=>bay.action('pause'));await p.waitForFunction(()=>!petDiagnostics.paused);};
  await p.evaluate(()=>bay.action('barbell'));await wait('barbell',4.3);await p.mouse.move(170,250);await p.mouse.down({button:'right'});await p.mouse.move(105,250,{steps:15});await p.mouse.up({button:'right'});await p.waitForFunction(()=>petDiagnostics.mode==='idle');
  await p.evaluate(()=>bay.action('reset-view'));await p.waitForTimeout(400);await p.evaluate(()=>bay.action('spring'));await p.waitForFunction(()=>petDiagnostics.mode==='spring');await p.waitForFunction(()=>petDiagnostics.mode==='idle');
  await p.evaluate(()=>bay.action('wave'));await p.waitForFunction(()=>petDiagnostics.mode==='wave');await p.waitForFunction(()=>petDiagnostics.mode==='idle');
  await p.evaluate(()=>bay.action('dance'));await wait('dance',4.0);clipSeconds=(Date.now()-epoch)/1000;
  for(const skin of['pink','white']){
   await p.evaluate(async skin=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin});},skin);
   for(const[action,t]of[['barbell',4.4],['barbell',8.4],['wave',.95],['dance',1.5],['eat',2.55],['spring',1.43],['sleep',1.1]]){
    await p.evaluate(a=>bay.action(a),action);await wait(action,t);await shot(`${skin}-${action}-${t}`);
    if(action==='barbell'&&t<5){await p.mouse.move(170,250);await p.mouse.down({button:'right'});await p.mouse.move(105,250,{steps:15});await p.mouse.up({button:'right'});await shot(`${skin}-lunge-side`);await p.evaluate(()=>bay.action('reset-view'));await p.waitForTimeout(350);}
   }
  }
  assert.deepEqual(errors,[]);assert.ok(samples.find(s=>s.name==='pink-dance-1.5').face.left>.8);await fs.writeFile(path.join(out,'diagnostics.json'),JSON.stringify({clipSeconds,samples,errors},null,2));console.log(JSON.stringify({passed:true,samples:samples.length,clipSeconds,errors}));
 }finally{await app.close();}if(video)await video.saveAs(path.join(out,'expressive-trial.webm'));
})().catch(e=>{console.error(e);process.exitCode=1;});
