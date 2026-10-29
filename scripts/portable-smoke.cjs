const{chromium}=require(process.env.BAY_PLAYWRIGHT||'playwright');
const{spawn,execFileSync}=require('node:child_process'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const file=path.resolve('release/exe/BayChicken-Portable-0.4.0-x64.exe');
  const child=spawn(file,['--smoke','--remote-debugging-address=127.0.0.1',`--remote-debugging-port=${port}`],{env,stdio:'ignore',windowsHide:true});
  let browser,pet;const errors=[];
  try{
    let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok){ready=true;break;}}catch{}await delay(400);}
    assert.ok(ready,'single-file portable app extracted and started');
    browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    pet=browser.contexts()[0].pages().find(p=>p.url().endsWith('pet.html'));assert.ok(pet,'actual Electron pet page');
    pet.on('pageerror',e=>errors.push(e.message));await pet.waitForFunction(()=>window.petDiagnostics?.ready);
    assert.equal((await pet.evaluate(()=>bay.getState())).history.length,0,'isolated smoke profile');
    await pet.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false});});
    await pet.evaluate(()=>bay.action('sit'));await pet.waitForFunction(()=>petDiagnostics.mode==='idle'&&petDiagnostics.posture==='sit');
    for(const[action,prop]of[['eat','tanghulu'],['ball','little-ball'],['pinwheel','little-pinwheel']]){
      await pet.evaluate(a=>bay.action(a),action);await pet.waitForTimeout(1200);assert.ok((await pet.evaluate(()=>petDiagnostics.props.visible)).includes(prop));
    }
    await pet.screenshot({path:'test-results/portable-exe.png',omitBackground:true});assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,artifact:path.basename(file),checks:['self extraction','packaged asar/preload/model startup','isolated profile','stool and all three props','renderer without errors']},null,2));
  }finally{
    if(pet)await pet.evaluate(()=>bay.quit()).catch(()=>{});if(browser)await browser.close().catch(()=>{});
    for(let i=0;i<20&&child.exitCode===null;i++)await delay(200);
    if(child.exitCode===null)try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
