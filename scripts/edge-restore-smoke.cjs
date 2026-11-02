const{_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  await fs.mkdir('.cache',{recursive:true});const seed=path.resolve('.cache/edge-restore-fixture.json');
  const entry=process.env.BAY_EXECUTABLE?path.join(path.dirname(process.env.BAY_EXECUTABLE),'resources/app.asar/electron/main.cjs'):path.resolve('electron/main.cjs');
  for(const side of[null,'top']){
    await fs.writeFile(seed,JSON.stringify({settings:{skin:'white',scale:1,autoMotion:false,edgeSnap:side?false:true,...(side?{nickname:'茶茶🎾',scale:1.15}:{})},history:[],encryptedKey:'',position:{x:100,y:100},edgeSide:side}));
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[path.resolve('scripts/edge-restore-main.cjs'),'--smoke','--seed='+seed,'--entry='+entry],env});
    try{const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});await p.waitForFunction(s=>window.petDiagnostics?.ready&&inputDiagnostics.edge===s,side);if(side){await p.waitForTimeout(2400);assert.equal((await p.evaluate(()=>bay.getState())).settings.nickname,'茶茶🎾');assert.equal((await p.evaluate(()=>bay.getState())).settings.scale,1.15);assert.equal(await p.locator('#pet-name').textContent(),'茶茶🎾');const d=await p.evaluate(()=>({anchor:edgeAnchor,state:inputDiagnostics}));const b=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡'));return{rect:w.getBounds(),area:screen.getDisplayMatching(w.getBounds()).workArea};});assert.ok(Math.abs(b.rect.y+d.anchor.y-b.area.y)<5);assert.equal((await p.evaluate(()=>bay.getState())).settings.edgeSnap,false,'manual perch restores even when automatic snapping is off');}}
    finally{await app.close();}
  }
  console.log('Legacy settings, custom name, saved size and persisted top-edge startup restored successfully.');
})().catch(e=>{console.error(e);process.exitCode=1;});
