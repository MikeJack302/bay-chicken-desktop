// Isolated diagnostics for hosted macOS machines; never imported by the app.
const { _electron } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'bay-graphics-'));
  const entry = path.join(folder, 'probe.cjs');
  await fs.writeFile(entry, `
    const {app,BrowserWindow}=require('electron');
    app.setPath('userData',require('node:path').join(${JSON.stringify(folder)},'profile-'+process.pid));
    app.commandLine.appendSwitch('enable-logging','stderr');
    if(process.env.BAY_PROBE_ANGLE){
      app.commandLine.appendSwitch('use-gl','angle');
      app.commandLine.appendSwitch('use-angle',process.env.BAY_PROBE_ANGLE);
      app.commandLine.appendSwitch('ignore-gpu-blocklist');
    }
    if(process.env.BAY_PROBE_ANGLE?.includes('swiftshader'))app.commandLine.appendSwitch('enable-unsafe-swiftshader');
    app.whenReady().then(()=>{
      const win=new BrowserWindow({width:200,height:200,show:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
      win.loadURL('data:text/html,<title>Graphics probe</title><canvas width="8" height="8"></canvas>');
    });
  `);
  const libdir = execFileSync('brew', ['--prefix', 'vulkan-loader'], {encoding:'utf8'}).trim() + '/lib';
  const variants = [
    { name: 'default' },
    { name: 'opengl', angle: 'gl' },
    { name: 'metal', angle: 'metal' },
    { name: 'swiftshader', angle: 'swiftshader-webgl' },
    { name: 'swiftshader-with-loader', angle: 'swiftshader-webgl', libdir },
    { name: 'swiftshader-with-bundled-loader', angle: 'swiftshader-webgl', bundledLoader:true },
  ];
  const results = [];
  for (const variant of variants) {
    let app;
    const stderr = [];
    try {
      if (variant.bundledLoader) {
        const bundle = path.resolve(path.dirname(require('electron')), '../..');
        const libraries = path.join(bundle,'Contents/Frameworks/Electron Framework.framework/Libraries');
        await fs.copyFile(path.join(libdir,'libvulkan.dylib'),path.join(libraries,'libvulkan.dylib'));
        execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',bundle],{stdio:'inherit'});
      }
      const env = {...process.env, BAY_PROBE_ANGLE: variant.angle || ''};
      delete env.ELECTRON_RUN_AS_NODE;
      if (variant.libdir) env.DYLD_LIBRARY_PATH = variant.libdir;
      app = await _electron.launch({executablePath:require('electron'),args:[entry],env,timeout:30000});
      app.process().stderr?.on('data',b=>stderr.push(b.toString()));
      const page = await app.firstWindow();
      await page.waitForSelector('canvas');
      const webgl = await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        if (!gl) return {ok:false};
        gl.clearColor(.25,.75,.5,1); gl.clear(gl.COLOR_BUFFER_BIT);
        const pixel = new Uint8Array(4); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        return {ok:gl.getError()===0,pixel:[...pixel],renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
      });
      const gpu = await app.evaluate(async ({app}) => ({
        switches:app.commandLine.getSwitchValue('use-angle'),
        status:app.getGPUFeatureStatus(),
        info:await Promise.race([app.getGPUInfo('complete').catch(e=>String(e)),new Promise(r=>setTimeout(()=>r('timed out'),5000))]),
      }));
      results.push({variant:variant.name,webgl,gpu});
    } catch(e) {
      results.push({variant:variant.name,error:String(e)});
    } finally {
      if(app) await app.close();
      results.at(-1).stderr=stderr.join('').slice(-7000);
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  await fs.writeFile('macos-graphics-diagnostics.json',JSON.stringify(results,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
