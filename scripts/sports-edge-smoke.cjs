const{_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  await fs.mkdir('test-results',{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env});
  try{
    const p=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.waitForFunction(()=>window.petDiagnostics?.ready);
    await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,autoMotion:false,eyeTracking:false});});
    for(const[name,wait]of[['tennis',1800],['serve',1900],['victory',1400]]){await p.evaluate(a=>bay.action(a),name);await p.waitForTimeout(wait);assert.equal(await p.evaluate(()=>petDiagnostics.mode),name);assert.ok((await p.evaluate(()=>petDiagnostics.props.visible)).includes('tennis-racket'));await p.screenshot({path:`test-results/sports-${name}.png`,omitBackground:true});}
    await p.evaluate(()=>bay.action('stand'));
    for(const side of['left','right','top','bottom']){
      await p.evaluate(s=>bay.dockEdge(s),side);await p.waitForFunction(s=>inputDiagnostics.edge===s,side);await p.waitForTimeout(2200);
      const d=await p.evaluate(()=>({edge:inputDiagnostics,anchor:edgeAnchor,pose:petDiagnostics.pose}));assert.ok(d.pose.edgeAmount>.98);
      const native=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡'));return{bounds:w.getBounds(),area:screen.getDisplayMatching(w.getBounds()).workArea};});
      const{bounds:b,area:a}=native;const target=side==='left'?a.x:side==='right'?a.x+a.width:side==='top'?a.y:a.y+a.height;const actual=['left','right'].includes(side)?b.x+d.anchor.x:b.y+d.anchor.y;assert.ok(Math.abs(actual-target)<5,JSON.stringify({side,target,actual}));
      await p.screenshot({path:`test-results/edge-${side}.png`,omitBackground:true});
      await p.evaluate(()=>bay.action('pet'));await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>inputDiagnostics.edge),side,'touch keeps grip');
    }
    await p.evaluate(()=>bay.action('tennis'));await p.waitForFunction(()=>inputDiagnostics.edge===null);await p.waitForTimeout(1100);assert.ok((await p.evaluate(()=>petDiagnostics.pose)).edgeAmount<.01);assert.equal((await p.evaluate(()=>bay.getState())).edge,null);
    await p.evaluate(()=>bay.action('stand'));await p.waitForTimeout(900);
    const initial=await app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡')),a=screen.getDisplayMatching(w.getBounds()).workArea;w.setBounds({x:a.x+3,y:a.y+100,width:320,height:400});const b=w.getBounds();globalThis.edgeCursor={x:b.x+160,y:b.y+180};screen.getCursorScreenPoint=()=>globalThis.edgeCursor;return b;});
    await p.mouse.move(160,180);await p.mouse.down();await app.evaluate((_e,b)=>{globalThis.edgeCursor={x:b.x+140,y:b.y+180};},initial);await p.mouse.move(140,180,{steps:4});await p.mouse.up();await p.waitForFunction(()=>inputDiagnostics.edge==='left');await p.waitForTimeout(1800);
    async function pull(cancel){const b=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡')).getBounds());const x=await p.evaluate(()=>Math.min(270,inputDiagnostics.visible.left+65));await app.evaluate((_e,v)=>{globalThis.edgeCursor=v;},{x:b.x+x,y:b.y+180});await p.mouse.move(x,180);await p.mouse.down();await app.evaluate((_e,v)=>{globalThis.edgeCursor=v;},{x:b.x+x+60,y:b.y+210});await p.mouse.move(x+60,210,{steps:6});await p.waitForTimeout(100);if(cancel)await p.keyboard.press('Escape');await p.mouse.up();}
    await pull(true);await p.waitForFunction(()=>inputDiagnostics.edge==='left');await p.waitForTimeout(1800);
    await pull(false);await p.waitForFunction(()=>inputDiagnostics.edge===null);await p.waitForTimeout(1000);assert.ok((await p.evaluate(()=>petDiagnostics.pose)).edgeAmount<.01,'dragging away resumes normal pose');
    await p.evaluate(()=>bay.dockEdge('left'));await p.waitForTimeout(1800);await p.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,edgeSnap:false});});await p.waitForFunction(()=>inputDiagnostics.edge===null);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['three racket actions','four edges match actual work area at grip','perch touch interaction','tennis releases edge','drag-drop auto snap','Escape restores grip','dragging away releases edge','automatic docking setting'],errors},null,2));
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
