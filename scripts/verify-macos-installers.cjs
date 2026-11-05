const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {_electron}=require('playwright');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  assert.equal(process.platform,'darwin');
  const folder=path.resolve('release/macos'),files=await fs.readdir(folder),dmg=files.find(n=>n.endsWith('.dmg')),zip=files.find(n=>n.endsWith('.zip'));
  assert.ok(dmg&&zip);const mount=await fs.mkdtemp(path.join(os.tmpdir(),'bay-installer-'));let attached=false,app;
  try{
    execFileSync('/usr/bin/hdiutil',['attach','-nobrowse','-readonly','-mountpoint',mount,path.join(folder,dmg)],{stdio:'inherit'});attached=true;
    const names=(await fs.readdir(mount)).filter(n=>n.endsWith('.app'));assert.equal(names.length,1);assert.equal(await fs.readlink(path.join(mount,'Applications')),'/Applications');
    const bundle=path.join(mount,names[0]),plist=path.join(bundle,'Contents/Info.plist');
    const info=k=>execFileSync('/usr/bin/plutil',['-extract',k,'raw','-o','-',plist],{encoding:'utf8'}).trim();
    assert.equal(info('CFBundleShortVersionString'),require('../package.json').version);assert.equal(info('CFBundleIdentifier'),'cn.baychicken.desktop.beta');
    execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',bundle],{stdio:'inherit'});
    const asar=hash(await fs.readFile(path.join(bundle,'Contents/Resources/app.asar')));
    assert.equal(hash(execFileSync('/usr/bin/unzip',['-p',path.join(folder,zip),names[0]+'/Contents/Resources/app.asar'],{maxBuffer:128*1024*1024})),asar);
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const args=['--smoke',...(process.arch==='x64'?['--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader']:[])];
    app=await _electron.launch({executablePath:path.join(bundle,'Contents/MacOS',info('CFBundleExecutable')),args,env,timeout:60000});
    const page=app.windows().find(w=>w.url().endsWith('pet.html'))||await app.waitForEvent('window',{predicate:w=>w.url().endsWith('pet.html')});
    await page.waitForFunction(()=>window.petDiagnostics?.ready,null,{timeout:90000});
    await page.evaluate(()=>bay.action('barbell'));await page.waitForFunction(()=>petDiagnostics.props.visible.includes('blue-barbell'),null,{timeout:30000});
    console.log(JSON.stringify({passed:true,arch:process.arch,checks:['read-only DMG mount','application and Applications shortcut','signed mounted application','matching ZIP and DMG app resources','launch directly from DMG','3D model and props'],asar}));
  }finally{if(app)await app.close();if(attached)execFileSync('/usr/bin/hdiutil',['detach',mount],{stdio:'inherit'});}
})().catch(e=>{console.error(e);process.exitCode=1;});
