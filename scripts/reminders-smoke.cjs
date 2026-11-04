const{_electron}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('test-results/reminders');await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:process.env.BAY_EXECUTABLE||path.resolve('node_modules/electron/dist/electron.exe'),args:[...(process.env.BAY_EXECUTABLE?[]:[path.resolve('.')]),'--smoke'],env});const errors=[];
 try{
  const pet=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});pet.on('pageerror',e=>errors.push(e.message));await pet.waitForFunction(()=>window.petDiagnostics?.ready);
  await pet.addStyleTag({content:'body.pet-page{background:#f7f7f5}'});await pet.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,skin:'pink',scale:.95,autoMotion:false,eyeTracking:false});bay.openPanel('settings');});
  const panel=app.windows().find(p=>p.url().endsWith('panel.html'));panel.on('pageerror',e=>errors.push(e.message));await panel.waitForSelector('#reminder-settings',{state:'visible'});
  await panel.locator('[data-preview-reminder="water"]').click();await pet.waitForSelector('#reminder-card:not([hidden])');assert.match(await pet.locator('#reminder-content').textContent(),/喝口水/);assert.ok(!(await pet.evaluate(()=>bay.getState())).settings.reminders.items[0].enabled);await pet.screenshot({path:path.join(out,'water-preview.png')});await pet.locator('#reminder-dismiss').click();
  await panel.locator('#reminder-water-enabled').check();await panel.locator('#reminder-water-minutes').fill('1');await panel.locator('#save-reminders').click();await panel.waitForFunction(()=>document.querySelector('#reminder-feedback').textContent.includes('已保存'));
  const enabled=await pet.evaluate(()=>bay.getState());assert.equal(enabled.settings.reminders.items[0].minutes,1);assert.ok(enabled.settings.reminders.items[0].enabled);const deadline=enabled.reminderStatus.next[0].due;
  await panel.screenshot({path:path.join(out,'reminder-settings.png')});await panel.evaluate(()=>bay.closePanel());
  // Exercise the real minute timer, not only the preview button.
  await pet.waitForFunction(()=>window.reminderDiagnostics?.automatic>=1,null,{timeout:70000});assert.match(await pet.locator('#reminder-content').textContent(),/喝口水/);await pet.screenshot({path:path.join(out,'water-automatic.png')});
  await pet.locator('#reminder-snooze').click();await pet.waitForSelector('#reminder-card',{state:'hidden'});const after=await pet.evaluate(()=>bay.getState());assert.ok(after.reminderStatus.next[0].due>Date.now()+290000);
  await pet.evaluate(async()=>{const s=await bay.getState();await bay.saveSettings({...s.settings,reminders:{...s.settings.reminders,paused:true}});bay.openPanel('settings');});await panel.waitForFunction(()=>document.querySelector('#reminder-status').textContent.includes('暂停'));
  await panel.locator('#reminder-custom-text').fill('<喝水> 记得休息 🐔');await panel.locator('[data-preview-reminder="custom"]').click();await pet.waitForSelector('#reminder-card:not([hidden])');assert.equal(await pet.locator('#reminder-content').textContent(),'<喝水> 记得休息 🐔');assert.equal(await pet.locator('#reminder-content').locator('*').count(),0);
  await pet.evaluate(()=>bay.dockEdge('bottom'));await pet.waitForTimeout(1700);const box=await pet.locator('#reminder-card').boundingBox(),visible=await pet.evaluate(()=>inputDiagnostics.visible);assert.ok(box.y>=visible.top);assert.ok(box.x>=visible.left);await pet.screenshot({path:path.join(out,'edge-reminder.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,deadline,checks:['preview without enabling','settings save','real one-minute automatic reminder','five-minute snooze','pause','plain custom text','visible while perched'],errors}));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
