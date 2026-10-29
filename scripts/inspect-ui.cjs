const {_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.resolve('release/BayChicken/electron.exe'),args:['--smoke'],env});
  try{
    const pet=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});
    await pet.waitForFunction(()=>petDiagnostics?.ready);
    await pet.evaluate(()=>bay.openPanel('play'));
    const panel=app.windows().find(p=>p.url().endsWith('panel.html'));
    await panel.waitForFunction(()=>innerWidth<290);
    const layout=await panel.evaluate(()=>{const el=document.querySelector('#play-view');return{width:innerWidth,height:innerHeight,scroll:el.scrollHeight,client:el.clientHeight};});
    assert.ok(layout.scroll<=layout.client+2,JSON.stringify(layout));
    await panel.screenshot({path:'test-results/interaction-panel.png'});
    await pet.locator('#more-actions').click();
    await panel.waitForTimeout(120);
    assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.getTitle().includes('大湾鸡')).isVisible()),false);
    console.log('Compact view fits; three-dot button toggles panel.',layout);
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
