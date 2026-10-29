const {_electron}=require(process.env.BAY_PLAYWRIGHT||'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const out=path.resolve('docs/share/raw');
(async()=>{
  await fs.mkdir(out,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[path.resolve('.'),'--smoke'],env});
  try{
    const pet=app.windows().find(p=>p.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:p=>p.url().endsWith('pet.html')});
    pet.setDefaultTimeout(20000);await pet.waitForFunction(()=>window.petDiagnostics?.ready);
    await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('大湾鸡'));w.setResizable(true);w.setSize(620,750);w.setResizable(false);});
    await pet.waitForFunction(()=>innerWidth>600);
    const set=async values=>pet.evaluate(async values=>{const s=await bay.getState();await bay.saveSettings({...s.settings,...values});},values);
    const act=async name=>pet.evaluate(name=>bay.action(name),name);
    await set({autoMotion:false,eyeTracking:false,scale:1});
    const capture=async(name,delay=700)=>{await pet.waitForTimeout(delay);await pet.screenshot({path:path.join(out,name+'.png'),omitBackground:true});console.log('Captured:',name);};
    await pet.mouse.move(2,2);await capture('window',800);
    await pet.addStyleTag({content:'.pet-bubble,.pet-dock,.sleepy{visibility:hidden!important}'});
    await act('stand');await capture('white-front');
    for(const[name,delta]of[['white-side',Math.PI/2],['white-back',Math.PI/2]]){await pet.keyboard.down('Shift');await pet.mouse.wheel(0,delta/.004);await pet.keyboard.up('Shift');await capture(name,900);}
    await act('reset-view');await pet.waitForTimeout(900);
    await pet.mouse.move(310,320);await pet.mouse.down();await pet.mouse.move(310,395,{steps:12});await pet.mouse.up();await capture('white-top',900);
    await act('reset-view');await pet.waitForTimeout(850);await pet.mouse.move(2,2);
    await act('sit');await capture('seat-find',550);await capture('seat-walk',1200);
    await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await capture('seat-done',500);
    await act('eat');await capture('candy-three',1650);await pet.waitForFunction(()=>petDiagnostics.props.bites>=1);await capture('candy-two',150);await pet.waitForFunction(()=>petDiagnostics.props.bites>=2);await capture('candy-one',150);
    await pet.waitForFunction(()=>petDiagnostics.mode==='idle');
    await act('ball');await capture('white-ball',1900);await act('pinwheel');await capture('white-pinwheel',1800);
    await act('stand');await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await act('pet');await capture('white-happy',850);
    await set({skin:'pink'});await act('stand');await capture('pink-front',900);await act('wave');await capture('pink-wave',1100);
    await act('sit');await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await act('pinwheel');await capture('pink-pinwheel',1800);
    await act('stand');await pet.waitForFunction(()=>petDiagnostics.mode==='idle');await act('wink');await capture('pink-wink',600);
    await pet.evaluate(()=>bay.openPanel('play'));const panel=app.windows().find(p=>p.url().endsWith('panel.html'));
    await panel.waitForFunction(()=>innerWidth<300);await panel.screenshot({path:path.join(out,'panel.png'),omitBackground:true});
    await panel.locator('#more-behaviors summary').click();await panel.screenshot({path:path.join(out,'panel-toys.png'),omitBackground:true});
    await fs.writeFile(path.join(out,'provenance.json'),JSON.stringify({capturedAt:new Date().toISOString(),applicationVersion:require('../package.json').version,method:'Actual Electron + Three.js app screenshots, isolated --smoke profile. Transparent character captures hide only the HTML toolbar and speech bubble; model, textures, poses and props are unchanged.',images:(await fs.readdir(out)).filter(f=>f.endsWith('.png'))},null,2));
  }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
