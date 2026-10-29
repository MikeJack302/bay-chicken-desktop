const{_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs/promises');
(async()=>{
  await fs.mkdir('test-results',{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env});const errors=[];
  try{
    const pet=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});pet.setDefaultTimeout(18000);pet.on('pageerror',e=>{errors.push(e.message);console.log('Renderer:',e.message);});
    await pet.waitForFunction(()=>window.petDiagnostics?.ready&&petDiagnostics.layout);
    await pet.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false});});
    async function settle(){await pet.mouse.move(2,2);await pet.waitForTimeout(900);}
    async function checkDock(){await settle();const d=await pet.evaluate(()=>({diag:petDiagnostics,dock:document.querySelector('#pet-dock').getBoundingClientRect().toJSON()}));const{layout}=d.diag;
      assert.equal(layout.canvas.width,layout.viewport.width);assert.equal(layout.canvas.height,layout.viewport.height);assert.ok(Math.abs(layout.canvas.pixelsX-layout.viewport.width*layout.viewport.dpr)<=2);
      if(layout.anchor.placement==='below'){assert.ok(d.dock.top-layout.bounds.bottom>=2&&d.dock.top-layout.bounds.bottom<18,JSON.stringify({dock:d.dock,bounds:layout.bounds}));}
      assert.ok(Math.abs(d.dock.x+d.dock.width/2-layout.anchor.x)<4);return d;
    }
    assert.equal((await checkDock()).diag.layout.anchor.placement,'below');await pet.screenshot({path:'test-results/dock-attached.png',omitBackground:true});
    await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡'));w.setResizable(true);w.setSize(520,760);w.setResizable(false);});
    await pet.waitForFunction(()=>petDiagnostics.layout.viewport.height>700);await checkDock();await pet.screenshot({path:'test-results/dock-resized.png',omitBackground:true});
    await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡'));w.setResizable(true);w.setSize(320,400);w.setResizable(false);});
    await pet.waitForFunction(()=>petDiagnostics.layout.viewport.height<430);
    for(const scale of[.7,1.35,1]){await pet.evaluate(async scale=>{const s=await bay.getState();await bay.saveSettings({...s.settings,scale});},scale);await checkDock();}
    await pet.evaluate(()=>bay.action('sit'));await pet.waitForTimeout(1100);await pet.screenshot({path:'test-results/stool-found.png',omitBackground:true});
    await pet.waitForFunction(()=>petDiagnostics.mode==='idle'&&petDiagnostics.posture==='sit');await checkDock();await pet.screenshot({path:'test-results/stool-seated.png',omitBackground:true});
    assert.ok((await pet.evaluate(()=>petDiagnostics.props)).visible.includes('small-wooden-stool'));
    await pet.mouse.move(160,180);await pet.keyboard.down('Shift');await pet.mouse.wheel(0,210);await pet.keyboard.up('Shift');await pet.waitForTimeout(800);await pet.screenshot({path:'test-results/stool-side.png',omitBackground:true});
    await pet.evaluate(()=>bay.action('reset-view'));await settle();
    await pet.evaluate(()=>bay.openPanel('play'));const panel=app.windows().find(p=>p.url().endsWith('panel.html'));
    await panel.locator('#more-behaviors summary').click();await panel.screenshot({path:'test-results/toys-panel.png'});
    await panel.locator('[data-action=eat]').click();await pet.waitForTimeout(1800);await pet.screenshot({path:'test-results/tanghulu.png',omitBackground:true});
    assert.ok((await pet.evaluate(()=>petDiagnostics.props)).visible.includes('tanghulu'));
    await pet.waitForFunction(()=>petDiagnostics.props.bites>=1);await pet.screenshot({path:'test-results/tanghulu-bite.png',omitBackground:true});
    await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await pet.waitForTimeout(600);assert.ok(!(await pet.evaluate(()=>petDiagnostics.props)).visible.includes('tanghulu'));
    for(const name of['ball','pinwheel']){await panel.locator(`[data-action=${name}]`).click();await pet.waitForTimeout(1800);await checkDock();await pet.screenshot({path:`test-results/toy-${name}.png`,omitBackground:true});assert.ok((await pet.evaluate(()=>petDiagnostics.props)).visible.includes(name==='ball'?'little-ball':'little-pinwheel'));}
    await panel.locator('#close').click();await pet.mouse.click(114,320);await pet.waitForFunction(()=>petDiagnostics.mode==='standUp');await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await checkDock();
    assert.equal((await pet.evaluate(()=>petDiagnostics.props)).visible.length,0);
    const reactions=[];
    for(let i=0;i<6;i++){await pet.mouse.click(160,170);await pet.waitForTimeout(600);const d=await pet.evaluate(()=>petDiagnostics.interaction);assert.equal(d.part,'head');assert.notEqual(d.action,reactions.at(-1));reactions.push(d.action);}
    assert.ok(new Set(reactions).size>=2);
    for(const[part,x,y]of[['crown',176,92],['eyes',104,185],['belly',160,275],['hands',83,281],['feet',140,325]]){
      await pet.evaluate(()=>bay.action('stand'));await settle();if(part==='eyes')await pet.waitForFunction(()=>petDiagnostics.rig.eyeL>.9&&petDiagnostics.rig.eyeR>.9);
      await pet.mouse.click(x,y);await pet.waitForTimeout(250);assert.equal((await pet.evaluate(()=>petDiagnostics.interaction)).part,part);
    }
    await pet.evaluate(()=>bay.action('stand'));await pet.mouse.move(160,180);await pet.keyboard.down('Shift');await pet.mouse.wheel(0,Math.PI/.004);await pet.keyboard.up('Shift');
    for(const[part,x,y]of[['back',160,200],['tail',160,300]]){
      await pet.evaluate(()=>bay.action('stand'));await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await settle();
      await pet.mouse.click(x,y);await pet.waitForTimeout(250);assert.equal((await pet.evaluate(()=>petDiagnostics.interaction)).part,part);
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['canvas resize and pixel ratio','dock proximity at three scales and tall viewport','find stool and sit','stool retained during toy interactions','toy buttons and sugar fruit eaten in stages','ball and pinwheel','click stool to stand and clean props','eight actual body regions and nonrepeating head reactions'],reactions},null,2));
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
