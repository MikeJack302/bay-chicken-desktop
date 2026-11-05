const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Arch}=require('electron-builder');
const source=require('../assets/runtime/vulkan-source.json');

module.exports=async context=>{
  if(context.electronPlatformName!=='darwin')return;
  const arch=Arch[context.arch],folder=path.resolve('.cache/mac-runtime',`${source.version}-${arch}`);
  const runtime=path.join(folder,'libvulkan.dylib'),record=JSON.parse(await fs.readFile(path.join(folder,'runtime.json'),'utf8'));
  assert.equal(record.arch,arch);assert.equal(record.minimumSystemVersion,'13.0');
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(runtime)).digest('hex'),record.sha256);
  const apps=(await fs.readdir(context.appOutDir)).filter(n=>n.endsWith('.app'));assert.equal(apps.length,1);
  const libraries=path.join(context.appOutDir,apps[0],'Contents/Frameworks/Electron Framework.framework/Libraries');
  await fs.copyFile(runtime,path.join(libraries,'libvulkan.dylib'));
  console.log(`Included source-built Vulkan loader ${source.version} (${arch}, macOS 13+), before bundle signing.`);
};
