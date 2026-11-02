const{_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  const out=path.resolve('test-results/refinement');await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env});
  let profile;const errors=[];
  try{
    const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>petDiagnostics?.ready);
    profile=await app.evaluate(({app})=>app.getPath('userData'));
    await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false,eyeTracking:false,scale:1.13});});
    await p.mouse.move(160,190);await p.mouse.wheel(0,-110);await p.waitForTimeout(850);await p.mouse.move(2,2);
    const initial=await p.evaluate(()=>({view:petDiagnostics.view,models:petDiagnostics.models}));
    const size=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html')).getSize());
    await p.evaluate(()=>bay.openPanel('play'));const panel=app.windows().find(p=>p.url().endsWith('panel.html'));panel.on('pageerror',e=>errors.push(e.message));
    await panel.locator('#rename-pet').click();await panel.locator('#nickname').fill('鸡'.repeat(17));assert.equal(await panel.locator('#nickname').evaluate(el=>el.validity.valid),false);
    await panel.locator('#nickname').fill('<茶茶&>');await panel.locator('.save-button').click();await p.waitForFunction(()=>document.querySelector('#pet-name').textContent==='<茶茶&>');assert.equal(await panel.locator('#rename-pet').textContent(),'<茶茶&>');assert.equal(await panel.locator('#rename-pet').locator('*').count(),0);
    await panel.locator('#nickname').fill('茶茶🎾');await panel.locator('.save-button').click();await p.waitForFunction(()=>document.querySelector('#pet-name').textContent==='茶茶🎾');await panel.locator('#settings-view').evaluate(el=>el.scrollTop=0);await panel.screenshot({path:path.join(out,'rename-settings.png'),omitBackground:true});
    assert.equal((await p.evaluate(()=>bay.getState())).settings.scale,1.13);assert.ok(Math.abs((await p.evaluate(()=>petDiagnostics.view.distance))-initial.view.distance)<.02);
    await panel.evaluate(()=>bay.closePanel());
    await p.evaluate(()=>bay.action('tennis'));await p.waitForTimeout(950);await p.screenshot({path:path.join(out,'tennis-prepare.png'),omitBackground:true});
    await p.waitForFunction(()=>petDiagnostics.mode==='tennis'&&petDiagnostics.props.tennis>.9&&Math.abs(petDiagnostics.props.contactDelta)<.055&&petDiagnostics.props.contactGap<.08);await p.screenshot({path:path.join(out,'tennis-contact.png'),omitBackground:true});await p.waitForTimeout(320);await p.screenshot({path:path.join(out,'tennis-follow.png'),omitBackground:true});
    for(const a of['serve','victory']){await p.evaluate(a=>bay.action(a),a);await p.waitForTimeout(a==='serve'?1700:1200);await p.screenshot({path:path.join(out,`${a}.png`),omitBackground:true});}
    await p.evaluate(()=>bay.action('stand'));await p.waitForTimeout(800);
    for(const side of['left','right','top','bottom']){
      await p.evaluate(s=>bay.dockEdge(s),side);await p.waitForTimeout(2300);
      const d=await p.evaluate(()=>({view:petDiagnostics.view,edge:inputDiagnostics.edge,anchor:edgeAnchor,config:null}));assert.equal(d.edge,side);assert.ok(Math.abs(d.view.distance-initial.view.distance)<.02,`${side} preserves zoom`);
      const n=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html'));return{b:w.getBounds(),a:screen.getDisplayMatching(w.getBounds()).workArea};});
      const actual=['left','right'].includes(side)?n.b.x+d.anchor.x:n.b.y+d.anchor.y,target=side==='left'?n.a.x:side==='right'?n.a.x+n.a.width:side==='top'?n.a.y:n.a.y+n.a.height;
      assert.ok(Math.abs(actual-target)<5,`${side} grips the screen`);await p.screenshot({path:path.join(out,`edge-${side}.png`),omitBackground:true});
      const currentSize=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('pet.html')).getSize());assert.ok(currentSize.every((v,i)=>Math.abs(v-size[i])<=1),'nominal size is unchanged (fractional DPI can round one DIP)');
    }
    await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,nickname:'茶茶🎾'});});assert.equal((await p.evaluate(()=>bay.getState())).edge,'bottom');assert.equal((await p.evaluate(()=>bay.getState())).settings.scale,1.13);
    const response=await p.evaluate(()=>bay.chat('你好'));assert.ok(response.ok);assert.match((await p.evaluate(()=>bay.getState())).history.at(-1).content,/茶茶🎾报到/);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['rename using the actual settings UI','emoji and literal HTML labels','reject 17-character names','name saved without resizing or zooming','racket contact and follow-through','four natural grips retain the zoom and window size','rename while gripping','offline reply uses the chosen name'],errors},null,2));
  }finally{await app.close();}
  const saved=JSON.parse(await fs.readFile(path.join(profile,'companion.json'),'utf8'));assert.equal(saved.settings.nickname,'茶茶🎾');assert.equal(saved.settings.scale,1.13);assert.equal(saved.edgeSide,'bottom');console.log('Name, scale and edge state persisted.');
})().catch(e=>{console.error(e);process.exitCode=1;});
