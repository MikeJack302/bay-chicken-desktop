import { cp, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const electronDir = path.join(path.dirname(require.resolve('electron/package.json')), 'dist');
const target = path.resolve('release/BayChicken');
await mkdir(target, { recursive: true });
// Existing Electron DLLs can be locked by the running pet. Reuse only the same
// runtime version, and copy missing runtime files without overwriting them.
const runtimeVersion = (await readFile(path.join(electronDir, 'version'),'utf8')).trim();
let installedVersion;
try { installedVersion = (await readFile(path.join(target, 'version'),'utf8')).trim(); } catch {}
if (installedVersion && installedVersion !== runtimeVersion) throw Error('Electron version changed. Choose a fresh release directory.');
await cp(electronDir, target, { recursive: true, force: false, errorOnExist: false });
const appDir = path.join(target, 'resources/app');
await mkdir(appDir, { recursive: true });
for (const dir of ['electron','dist','assets']) await cp(dir, path.join(appDir, dir), { recursive: true });
const pkg = JSON.parse(await readFile('package.json','utf8'));
await writeFile(path.join(appDir,'package.json'), JSON.stringify({name:pkg.name,version:pkg.version,main:pkg.main}));
await copyFile('README.md', path.join(target,'README.md'));
await writeFile(path.join(target,'启动湾湾.vbs'), 'Set s = CreateObject("WScript.Shell")\r\ns.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)\r\ns.Run """" & s.CurrentDirectory & "\\electron.exe""", 1, False\r\n');
console.log('Portable app: ' + target + '\\electron.exe');
