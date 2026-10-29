const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage, safeStorage, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { DEFAULTS, validateSettings, streamChat, offlineReply } = require('./core.cjs');

let pet, panel, tray, state = { settings: { ...DEFAULTS }, history: [], encryptedKey: '', position: null };
let key = process.env.OPENAI_API_KEY || '', controller, dragTimer, cursorTimer, dragOrigin, writeQueue = Promise.resolve();
let petStatus = { mode: 'idle', posture: 'stand', expression: '自然', paused: false };
const smoke = process.argv.includes('--smoke');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'bay-chicken-smoke-' + process.pid));
const stateFile = () => path.join(app.getPath('userData'), 'companion.json');
const send = (channel, value) => [pet, panel].forEach(w => { if (w && !w.isDestroyed()) w.webContents.send(channel, value); });
const publicState = () => ({ settings: state.settings, history: state.history, hasKey: !!key, busy: !!controller, petStatus,
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
  return { x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, position.x))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, position.y))) };
}
function placePanel() {
  if (!pet || !panel) return;
  const p = pet.getBounds();
  const area = screen.getDisplayMatching(p).workArea;
  const [pw, ph] = panel.getSize();
  const right = p.x + p.width + 6;
  const x = right + pw <= area.x + area.width ? right : p.x - pw - 6;
  const position = clampPosition({ x, y: p.y + p.height - ph }, pw, ph);
  panel.setPosition(position.x, position.y);
}
function sizePanel(tab='play') { const height=tab==='play'?390:tab==='chat'?500:520;const width=tab==='play'?280:340;const area=screen.getDisplayMatching(pet.getBounds()).workArea;panel.setResizable(true);panel.setSize(width,Math.min(height,area.height-24));panel.setResizable(false);placePanel(); }
function openPanel(tab = 'play') { sizePanel(tab); panel.show(); panel.focus(); panel.webContents.send('panel:tab', tab); }
function toggle() { if (pet.isVisible()) { pet.hide(); panel.hide(); } else { pet.show(); } }
function endDrag() {
  clearInterval(dragTimer); dragTimer = null;
  if (pet && !pet.isDestroyed()) { const [x, y] = pet.getPosition(); state.position = { x, y }; void persist().catch(console.error); }
}
function securedWindow(options, page) {
  const win = new BrowserWindow({ ...options, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
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
  pet.once('ready-to-show', () => pet.show());
  panel.on('close', e => { if (!app.isQuitting) { e.preventDefault(); panel.hide(); } });
  pet.on('closed', () => app.quit());
  pet.on('blur', endDrag);
  pet.on('focus', () => pet.setIgnoreMouseEvents(false));
  // Native cursor polling restores interaction even when Windows does not forward
  // mouse movement from an underlying elevated window to a transparent window.
  if (!smoke) cursorTimer = setInterval(() => {
    if (pet.isDestroyed() || !pet.isVisible() || dragTimer) return;
    const cursor = screen.getCursorScreenPoint(), bounds = pet.getBounds();
    pet.webContents.send('cursor', { x: cursor.x - bounds.x, y: cursor.y - bounds.y });
  }, 90);
  screen.on('display-metrics-changed', () => { const [w,h] = pet.getSize(); const [x,y] = pet.getPosition(); const pos = clampPosition({x,y},w,h); pet.setPosition(pos.x,pos.y); placePanel(); });
  const image = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
  tray = new Tray(image);
  tray.setToolTip('湾湾 · 大湾鸡桌宠');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '陪湾湾玩', click: () => { pet.show(); openPanel('play'); } },
    { label: '找湾湾聊天', click: () => { pet.show(); openPanel('chat'); } },
    { label: '显示 / 隐藏桌宠（F8）', click: toggle },
    { label: '回到屏幕右下角', click: () => { const a = screen.getPrimaryDisplay().workArea; pet.setPosition(a.x+a.width-390,a.y+a.height-480); pet.show(); placePanel(); } },
    { type: 'separator' }, { label: '设置', click: () => openPanel('settings') },
    { label: '退出湾湾', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { pet.show(); openPanel(); });
  globalShortcut.register('F8', toggle);
  globalShortcut.register('CommandOrControl+Alt+B', () => { pet.show(); openPanel('play'); });
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
on('pet:action', name => { if (['stand','sit','pet','tickle','dance','wave','sleep','idle','jump','stretch','spin','happy','curious','wink','look','pause','walk','nod','shake','bow','balance','peek','yawn','sigh','bounce','eat','ball','pinwheel','reset-view'].includes(name)) send('action', name); });
ipcMain.on('pet:status', (event, value) => {
  if (!pet || event.sender !== pet.webContents || !value || typeof value.mode !== 'string') return;
  petStatus = { mode: value.mode.slice(0,24), posture: value.posture === 'sit' ? 'sit' : 'stand', expression: String(value.expression || '').slice(0,24), paused: !!value.paused };
  panel?.webContents.send('pet:status', petStatus);
});
on('pet:ignore', ignore => { if (!dragTimer) pet.setIgnoreMouseEvents(!!ignore, { forward: true }); });
on('pet:drag-start', () => {
  endDrag(); pet.setIgnoreMouseEvents(false);
  const cursor = screen.getCursorScreenPoint(); const [x,y] = pet.getPosition();
  dragOrigin = { cursor, x,y, time: Date.now() };
  dragTimer = setInterval(() => {
    if (Date.now() - dragOrigin.time > 15000) return endDrag();
    const c = screen.getCursorScreenPoint(); const [w,h] = pet.getSize();
    const p = clampPosition({x:dragOrigin.x+c.x-cursor.x,y:dragOrigin.y+c.y-cursor.y},w,h);
    pet.setPosition(p.x,p.y); if (panel.isVisible()) placePanel();
  }, 16);
});
on('pet:drag-end', endDrag);
app.on('before-quit', () => { app.isQuitting = true; controller?.abort(); clearInterval(dragTimer); clearInterval(cursorTimer); });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (pet) { pet.show(); openPanel(); } }); app.whenReady().then(boot).catch(error => { console.error(error); app.quit(); }); }
