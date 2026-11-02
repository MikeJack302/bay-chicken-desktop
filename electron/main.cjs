const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage, safeStorage, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { DEFAULTS, validateSettings, streamChat, offlineReply } = require('./core.cjs');
const {clampToArea,dragPosition}=require('./desktop.cjs');
const windowSizes=new WeakMap();
function positionWindow(win,p){win.setBounds({...p,...windowSizes.get(win)});}
let panelSize={width:280,height:390};
const shortcutStatus={toggle:false,panel:false};

let pet, panel, tray, state = { settings: { ...DEFAULTS }, history: [], encryptedKey: '', position: null };
let key = process.env.OPENAI_API_KEY || '', controller, dragTimer, cursorTimer, dragOrigin, writeQueue = Promise.resolve();
let petStatus = { mode: 'idle', posture: 'stand', expression: '自然', paused: false };
const smoke = process.argv.includes('--smoke');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'bay-chicken-smoke-' + process.pid));
const stateFile = () => path.join(app.getPath('userData'), 'companion.json');
const send = (channel, value) => [pet, panel].forEach(w => { if (w && !w.isDestroyed()) w.webContents.send(channel, value); });
const publicState = () => ({ version:app.getVersion(),shortcuts:{...shortcutStatus},settings: state.settings, history: state.history, hasKey: !!key, busy: !!controller, petStatus,
  connected: !!key || (state.settings.provider === 'compatible' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(state.settings.endpoint).hostname)) });
function persist() {
  const snapshot = JSON.stringify(state);
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(stateFile() + '.tmp', snapshot, { mode: 0o600 });
    await fs.rename(stateFile() + '.tmp', stateFile());
  });
  return writeQueue;
}
function clampPosition(position, width, height) {
  const area = screen.getDisplayNearestPoint(position).workArea;
  return clampToArea(position,width,height,area);
}
function placePanel() {
  if (!pet || !panel) return;
  const p = pet.getBounds();
  const area = screen.getDisplayMatching(p).workArea;
  const [pw, ph] = panel.getSize();
  const right = p.x + p.width + 6;
  const x = right + pw <= area.x + area.width ? right : p.x - pw - 6;
  const position = clampPosition({ x, y: p.y + p.height - ph }, pw, ph);
  positionWindow(panel,position);
}
function sizePanel(tab='play') { const height=tab==='play'?390:tab==='chat'?500:520;const width=tab==='play'?280:340;const area=screen.getDisplayMatching(pet.getBounds()).workArea;panel.setResizable(true);panelSize={width,height:Math.min(height,area.height-24)};windowSizes.set(panel,panelSize);panel.setSize(panelSize.width,panelSize.height);panel.setResizable(false);placePanel(); }
function openPanel(tab = 'play') { sizePanel(tab); panel.show(); panel.focus(); panel.webContents.send('panel:tab', tab); }
function openHelp(){openPanel('play');panel.webContents.send('help:open');}
function home(){endDrag();const a=screen.getPrimaryDisplay().workArea;const[w,h]=pet.getSize();const p=clampToArea({x:a.x+a.width-w-40,y:a.y+a.height-h-40},w,h,a);positionWindow(pet,p);pet.show();state.position=p;placePanel();void persist().catch(console.error);}
function toggle() { if (pet.isVisible()) { endDrag();pet.webContents.send('drag:ended');pet.hide(); panel.hide(); } else { pet.show(); } }
function endDrag(options={}) {
  clearInterval(dragTimer); dragTimer = null;
  const origin=dragOrigin;dragOrigin=null;if(!origin)return;
  if (pet && !pet.isDestroyed()) { if(options?.cancel)positionWindow(pet,{x:origin.x,y:origin.y});const [x, y] = pet.getPosition();state.position={x,y};pet.webContents.send('drag:ended');void persist().catch(console.error); }
}
function securedWindow(options, page) {
  const win = new BrowserWindow({ ...options, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  let lastRecovery=0;
  win.webContents.on('render-process-gone',()=>{endDrag();if(!app.isQuitting&&Date.now()-lastRecovery>60000){lastRecovery=Date.now();setTimeout(()=>{if(!win.isDestroyed())win.reload();},700);}});
  win.loadFile(path.join(__dirname, '../dist', page));
  return win;
}
async function boot() {
  try {
    const saved = JSON.parse(await fs.readFile(stateFile(), 'utf8'));
    state.settings = validateSettings(saved.settings);
    state.history = Array.isArray(saved.history) ? saved.history.filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-80) : [];
    state.position = saved.position;
    state.encryptedKey = saved.encryptedKey || '';
    if (state.encryptedKey && await safeStorage.isAsyncEncryptionAvailable()) {
      key = (await safeStorage.decryptStringAsync(Buffer.from(state.encryptedKey, 'base64'))).result;
    }
  } catch (error) { if (error.code !== 'ENOENT') console.warn('Could not restore companion state:', error.message); }
  const area = screen.getPrimaryDisplay().workArea;
  const size = { width: 320, height: 400 };
  const p = state.position && Number.isFinite(state.position.x) && Number.isFinite(state.position.y) ? clampPosition(state.position, size.width, size.height) : { x: area.x + area.width - 390, y: area.y + area.height - 480 };
  pet = securedWindow({ ...size, ...p, title: '湾湾 · 大湾鸡', frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, skipTaskbar: true, alwaysOnTop: state.settings.alwaysOnTop, show: false }, 'pet.html');
  panel = securedWindow({ width: 280, height: Math.min(390, area.height - 24), title: '湾湾', frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, alwaysOnTop: state.settings.alwaysOnTop, show: false }, 'panel.html');
  windowSizes.set(pet,size);windowSizes.set(panel,panelSize);
  pet.once('ready-to-show', () => {positionWindow(pet,p);pet.show();});
  panel.on('close', e => { if (!app.isQuitting) { e.preventDefault(); panel.hide(); } });
  pet.on('closed', () => app.quit());
  pet.on('blur', () => endDrag());
  pet.on('focus', () => pet.setIgnoreMouseEvents(false));
  // Native cursor polling restores interaction even when Windows does not forward
  // mouse movement from an underlying elevated window to a transparent window.
  if (!smoke) cursorTimer = setInterval(() => {
    if (pet.isDestroyed() || !pet.isVisible() || dragTimer) return;
    const cursor = screen.getCursorScreenPoint(), bounds = pet.getBounds();
    pet.webContents.send('cursor', { x: cursor.x - bounds.x, y: cursor.y - bounds.y });
  }, 90);
  const keepVisible=()=>{endDrag();const[w,h]=pet.getSize();const[x,y]=pet.getPosition();const pos=clampPosition({x,y},w,h);positionWindow(pet,pos);state.position=pos;placePanel();void persist().catch(console.error);};
  screen.on('display-metrics-changed',keepVisible);screen.on('display-removed',keepVisible);
  const image = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
  tray = new Tray(image);
  tray.setToolTip('湾湾 · 大湾鸡桌宠');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '陪湾湾玩', click: () => { pet.show(); openPanel('play'); } },
    { label: '找湾湾聊天', click: () => { pet.show(); openPanel('chat'); } },
    { label: '显示 / 隐藏桌宠（F8）', click: toggle },
    { label: '回到屏幕右下角', click: home },
    { label: '操作指南', click: openHelp },
    { type: 'separator' }, { label: '设置', click: () => openPanel('settings') },
    { label: '退出湾湾', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { pet.show(); openPanel(); });
  shortcutStatus.toggle=globalShortcut.register('F8', toggle);
  shortcutStatus.panel=globalShortcut.register('CommandOrControl+Alt+B', () => { pet.show(); openPanel('play'); });
}
function trusted(event) { return [pet, panel].some(w => w && !w.isDestroyed() && w.webContents === event.sender); }
const handle = (name, fn) => ipcMain.handle(name, (event, ...args) => { if (!trusted(event)) throw Error('Unknown window'); return fn(...args); });
const on = (name, fn) => ipcMain.on(name, (event, ...args) => { if (trusted(event)) fn(...args); });
handle('state:get', publicState);
handle('settings:save', async value => {
  try {
    if (controller) throw Error('请先停止当前回复，再修改设置。');
    const settings = validateSettings(value);
    let nextKey = key, encryptedKey = state.encryptedKey;
    if (value.clearKey) { nextKey = ''; encryptedKey = ''; }
    else if (typeof value.apiKey === 'string' && value.apiKey.trim()) {
      if (value.apiKey.length > 4096) throw Error('API Key 过长。');
      if (!await safeStorage.isAsyncEncryptionAvailable()) throw Error('系统加密暂不可用，未保存密钥。');
      nextKey = value.apiKey.trim(); encryptedKey = (await safeStorage.encryptStringAsync(nextKey)).toString('base64');
    }
    // A saved credential belongs to its endpoint; do not silently forward it elsewhere.
    if (new URL(settings.endpoint).origin !== new URL(state.settings.endpoint).origin && !value.apiKey?.trim()) { nextKey = ''; encryptedKey = ''; }
    const before = state;
    state = { ...state, settings, encryptedKey };
    try { await persist(); } catch (error) { state = before; throw error; }
    key = nextKey;
    pet.setAlwaysOnTop(settings.alwaysOnTop); panel.setAlwaysOnTop(settings.alwaysOnTop);
    send('state', publicState()); return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
});
handle('history:clear', async () => { if (controller) return { ok: false, error: '请先停止当前回复。' }; state.history = []; await persist(); send('state', publicState()); return { ok: true }; });
handle('chat:send', async text => {
  if (typeof text !== 'string' || !text.trim() || text.length > 8000) return { ok: false, error: '消息须为 1～8000 个字符。' };
  if (controller) return { ok: false, error: '湾湾正在回复，稍等一下。' };
  controller = new AbortController();
  const active = controller;
  const user = { role: 'user', content: text.trim() };
  state.history.push(user);
  state.history = state.history.slice(-79);
  const messages = state.history.slice();
  const connected = publicState().connected;
  send('chat:status', { busy: true }); send('action', 'think');
  let partial = '';
  const timeout = setTimeout(() => active.abort(), 90000);
  try {
    const answer = connected ? await streamChat({ settings: state.settings, key, messages, signal: active.signal, fetchImpl: net.fetch.bind(net),
      onDelta: delta => { partial += delta; send('chat:delta', delta); } }) : offlineReply(text);
    if (!connected) send('chat:delta', answer);
    state.history.push({ role: 'assistant', content: answer });
    await persist(); send('bubble', answer.slice(0, 90)); send('action', 'talk');
    return { ok: true, offline: !connected };
  } catch (error) {
    if (partial) state.history.push({ role: 'assistant', content: partial + '\n[回复已中断]' });
    else state.history = state.history.filter(m => m !== user);
    await persist().catch(console.error);
    return { ok: false, error: active.signal.aborted ? '回复已停止。' : (error.message.includes('fetch') ? '连接失败，请检查网络和接口地址。' : error.message) };
  } finally { clearTimeout(timeout); controller = null; send('chat:status', { busy: false }); send('action', 'idle'); send('state', publicState()); }
});
on('chat:cancel', () => controller?.abort());
on('panel:open', tab => openPanel(['play','settings','chat'].includes(tab) ? tab : 'play'));
on('panel:toggle', () => { if(panel.isVisible())panel.hide();else openPanel('play'); });
on('panel:resize', tab => { if(['play','settings','chat'].includes(tab))sizePanel(tab); });
on('panel:close', () => panel.hide());
on('app:quit', () => { app.isQuitting = true; app.quit(); });
on('help:open',openHelp);
on('pet:reload',()=>{endDrag();void pet.loadFile(path.join(__dirname,'../dist/pet.html')).catch(console.error);});
on('releases:open',()=>{void shell.openExternal('https://github.com/MikeJack302/bay-chicken-desktop/releases/latest').catch(console.error);});
on('pet:home',home);
on('pet:move',point=>{if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;endDrag();const[x,y]=pet.getPosition(),[w,h]=pet.getSize();const p=clampPosition({x:x+Math.max(-40,Math.min(40,point.x)),y:y+Math.max(-40,Math.min(40,point.y))},w,h);positionWindow(pet,p);state.position=p;placePanel();void persist().catch(console.error);});
on('pet:action', name => { if (['stand','sit','pet','tickle','dance','wave','sleep','idle','jump','stretch','spin','happy','curious','wink','look','pause','walk','nod','shake','bow','balance','peek','yawn','sigh','bounce','eat','ball','pinwheel','reset-view'].includes(name)) send('action', name); });
ipcMain.on('pet:status', (event, value) => {
  if (!pet || event.sender !== pet.webContents || !value || typeof value.mode !== 'string') return;
  petStatus = { mode: value.mode.slice(0,24), posture: value.posture === 'sit' ? 'sit' : 'stand', expression: String(value.expression || '').slice(0,24), paused: !!value.paused };
  panel?.webContents.send('pet:status', petStatus);
});
on('pet:ignore', ignore => { if (!dragTimer) pet.setIgnoreMouseEvents(!!ignore, { forward: true }); });
on('pet:drag-start', point => {
  endDrag(); pet.setIgnoreMouseEvents(false);
  const cursor = screen.getCursorScreenPoint(); const [x,y] = pet.getPosition();
  const start=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Math.hypot(point.x-cursor.x,point.y-cursor.y)<1000?point:cursor;
  dragOrigin = { cursor:start,x,y,time:Date.now() };
  const move=()=>{
    if(!dragOrigin||pet.isDestroyed())return endDrag();
    if (Date.now() - dragOrigin.time > 60000) return endDrag();
    const c = screen.getCursorScreenPoint(); const [w,h] = pet.getSize();
    const p = dragPosition(dragOrigin,c,w,h,screen.getDisplayNearestPoint(c).workArea);
    positionWindow(pet,p); if (panel.isVisible()) placePanel();
  };
  move();dragTimer = setInterval(move,16);
});
on('pet:drag-end', endDrag);
let quitReady=false;
app.on('before-quit', event => {
  app.isQuitting=true;controller?.abort();clearInterval(cursorTimer);
  if(quitReady)return;event.preventDefault();endDrag();
  if(pet&&!pet.isDestroyed()){const[x,y]=pet.getPosition();state.position={x,y};}
  let timer;Promise.race([persist(),new Promise(resolve=>{timer=setTimeout(resolve,3000);})]).catch(console.error).finally(()=>{clearTimeout(timer);quitReady=true;app.quit();});
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (pet) { pet.show(); openPanel(); } }); app.whenReady().then(boot).catch(error => { console.error(error); app.quit(); }); }
