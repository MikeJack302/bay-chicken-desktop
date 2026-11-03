const{_electron}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const out=path.resolve('test-results/signature');await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env,recordVideo:{dir:path.join(out,'video'),size:{width:640,height:800}}});
  let video;const errors=[];
  try{
    const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>window.petDiagnostics?.ready);video=p.video();
    await p.addStyleTag({content:'body.pet-page{background:#f7f7f5}'});await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false,eyeTracking:false,scale:.95});});await p.mouse.move(2,2);
    const shot=async(name)=>{await p.screenshot({path:path.join(out,name+'.png')});};
    await p.evaluate(()=>bay.action('stand'));await p.waitForTimeout(850);await shot('baseline');
    for(const[skin,prefix]of[['white','white'],['pink','pink']]){
      await p.evaluate(async skin=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin});},skin);
      for(const[action,times]of[['lion',[1.3,3.2,6.3,8.1]],['ballet',[1.1,2.5,4.2]],['mushroom',[1.2,2.8,4.2,7.2]]]){
        await p.evaluate(a=>bay.action(a),action);let elapsed=0;
        for(const t of times){await p.waitForTimeout((t-elapsed)*1000);await shot(`${prefix}-${action}-${t}`);elapsed=t;assert.equal(await p.evaluate(()=>petDiagnostics.mode),action);}
        await p.waitForFunction(()=>petDiagnostics.mode==='idle');assert.equal(await p.evaluate(()=>petDiagnostics.posture),'stand');
      }
    }
    await p.evaluate(()=>bay.action('mushroom'));await p.waitForTimeout(3300);
    await p.mouse.move(160,180);await p.mouse.down({button:'right'});await p.mouse.move(62,180,{steps:20});await p.mouse.up({button:'right'});await p.waitForTimeout(400);await shot('mushroom-side');
    await p.evaluate(()=>bay.action('stand'));await p.waitForTimeout(1000);assert.equal((await p.evaluate(()=>petDiagnostics.pose)).torsoDrop,0);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,video:!!video,checks:['three complete trial timelines','white and pink skins','no global resizing','clear stool and finish standing','side view of squat','no renderer exceptions'],errors},null,2));
  }finally{await app.close();}
  if(video)await video.saveAs(path.join(out,'signature-trial.webm'));
})().catch(e=>{console.error(e);process.exitCode=1;});
