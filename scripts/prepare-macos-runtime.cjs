const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const source = require('../assets/runtime/vulkan-source.json');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const run = (file,args) => execFileSync(file,args,{stdio:'inherit'});

(async()=>{
  assert.equal(process.platform,'darwin','Build the macOS runtime on a Mac.');
  assert.ok(['arm64','x64'].includes(process.arch));
  const root=path.resolve('.cache/mac-runtime',`${source.version}-${process.arch}`);
  await fs.mkdir(root,{recursive:true});
  for(const key of ['headers','loader']){
    const spec=source[key],archive=path.join(root,key+'.tar.gz');let bytes;
    try{bytes=await fs.readFile(archive);}catch{}
    if(!bytes||hash(bytes)!==spec.sha256){
      const response=await fetch(spec.url,{signal:AbortSignal.timeout(60000)});
      assert.ok(response.ok,`Download ${key}: HTTP ${response.status}`);
      bytes=Buffer.from(await response.arrayBuffer());assert.equal(hash(bytes),spec.sha256);
      await fs.writeFile(archive,bytes);
    }
    assert.equal(hash(bytes),spec.sha256);
    const folder=path.join(root,key);await fs.mkdir(folder,{recursive:true});
    run('/usr/bin/tar',['-xzf',archive,'--strip-components=1','-C',folder]);
  }
  const prefix=path.join(root,'headers-install');
  run('cmake',['-S',path.join(root,'headers'),'-B',path.join(root,'headers-build'),`-DCMAKE_INSTALL_PREFIX=${prefix}`,'-DVULKAN_HEADERS_ENABLE_TESTS=OFF']);
  run('cmake',['--install',path.join(root,'headers-build')]);
  const build=path.join(root,'loader-build');
  run('cmake',['-S',path.join(root,'loader'),'-B',build,'-DCMAKE_BUILD_TYPE=Release',`-DCMAKE_PREFIX_PATH=${prefix}`,'-DCMAKE_OSX_DEPLOYMENT_TARGET=13.0',`-DCMAKE_OSX_ARCHITECTURES=${process.arch==='arm64'?'arm64':'x86_64'}`,'-DBUILD_TESTS=OFF','-DBUILD_WERROR=OFF','-DLOADER_CODEGEN=OFF','-DUPDATE_DEPS=OFF']);
  run('cmake',['--build',build,'--target','vulkan','--parallel','2']);
  const output=path.join(root,'libvulkan.dylib');await fs.copyFile(path.join(build,'loader/libvulkan.dylib'),output);
  const arch=execFileSync('/usr/bin/lipo',['-archs',output],{encoding:'utf8'}).trim();assert.equal(arch,process.arch==='arm64'?'arm64':'x86_64');
  const info=execFileSync('/usr/bin/otool',['-l',output],{encoding:'utf8'});assert.match(info,/minos\s+13\.0\b/);
  const record={version:source.version,arch:process.arch,minimumSystemVersion:'13.0',sha256:hash(await fs.readFile(output)),source};
  await fs.writeFile(path.join(root,'runtime.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
})().catch(e=>{console.error(e);process.exitCode=1;});
