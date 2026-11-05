const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage, safeStorage, net, shell,powerMonitor } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { DEFAULTS, validateSettings, streamChat, offlineReply } = require('./core.cjs');
const {clampToArea,dragPosition}=require('./desktop.cjs');
const {SIDES,nearestEdge,dockPosition,visibleRect}=require('./edges.cjs');
const {createReminderClock,previewReminder}=require('./reminders.cjs');
const reminderClock=createReminderClock();let reminderTimer,reminderVisibleUntil=0,systemQuiet=false;
let edgeSide=null,edgeArea=null,edgeTimer=null,edgeTarget=null;
const windowSizes=new WeakMap();
function positionWindow(win,p){win.setBounds({...p,...windowSizes.get(win)});}
let panelSize={width:280,height:390};
const shortcutStatus={toggle:false,panel:false};

let pet, panel, tray, state = { settings: { ...DEFAULTS }, history: [], encryptedKey: '', position: null };
let key = '', controller, dragTimer, cursorTimer, dragOrigin, writeQueue = Promise.resolve();
let petStatus = { mode: 'idle', posture: 'stand', expression: '自然', paused: false };
const smoke = process.argv.includes('--smoke');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'bay-chicken-smoke-' + process.pid));
else app.setPath('userData',path.join(app.getPath('appData'),'bay-chicken-beta'));
const stateFile = () => path.join(app.getPath('userData'), 'companion.json');
const send = (channel, value) => [pet, panel].forEach(w => { if (w && !w.isDestroyed()) w.webContents.send(channel, value); });
const publicState = () => ({ version:app.getVersion(),platform:process.platform,shortcuts:{...shortcutStatus},edge:edgeSide,settings: state.settings,reminderStatus:reminderClock.status(), history: state.history, hasKey: !!key, busy: !!controller, petStatus,
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
function showReminder(items,preview=false){
  if(!pet||pet.isDestroyed())return;reminderVisibleUntil=Date.now()+20000;
  if(preview&&!pet.isVisible())pet.showInactive();send('reminder',{items,preview});send('reminder:status',reminderClock.status());
}
function checkReminders(){
  const available=pet&&!pet.isDestroyed()&&pet.isVisible()&&!systemQuiet&&!dragTimer&&!controller&&!petStatus.paused&&petStatus.mode==='idle'&&Date.now()>=reminderVisibleUntil;
  const due=reminderClock.poll(available);if(due.length)showReminder(due);
}
function refreshIdentity(){
  const name=state.settings.nickname,label=name.replace(/&/g,'&&');
  pet?.setTitle(`${name} · Beta · 大湾鸡`);panel?.setTitle(`${name} · Beta`);
  if(!tray)return;
  let tooltipName='';for(const s of new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(name)){if((tooltipName+s.segment).length>100)break;tooltipName+=s.segment;}
  tray.setToolTip(`${tooltipName}${tooltipName===name?'':'…'} · 大湾鸡 Beta`);
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:`陪${label}玩`,click:()=>{pet.show();openPanel('play');}},
    {label:`找${label}聊天`,click:()=>{pet.show();openPanel('chat');}},
    {label:'显示 / 隐藏桌宠',click:toggle},
    {label:'回到屏幕右下角',click:home},
    {label:'贴边休息',click:()=>setEdge(nearestEdge(pet.getBounds(),screen.getDisplayMatching(pet.getBounds()).workArea,Infinity))},
    {label:'离开边缘',click:()=>setEdge(null)},
    {label:'操作指南',click:openHelp},
    {type:'separator'},{label:'设置',click:()=>openPanel('settings')},
    {label:`退出${label}`,click:()=>{app.isQuitting=true;app.quit();}},
  ]));
}
function home(){endDrag({dock:false});setEdge(null);const a=screen.getPrimaryDisplay().workArea;const[w,h]=pet.getSize();const p=clampToArea({x:a.x+a.width-w-40,y:a.y+a.height-h-40},w,h,a);positionWindow(pet,p);pet.show();state.position=p;placePanel();void persist().catch(console.error);}
function toggle() { if (pet.isVisible()) { endDrag({dock:false});pet.webContents.send('drag:ended');pet.hide(); panel.hide(); } else { pet.show(); } }
function edgeMessage(){if(pet&&!pet.isDestroyed())send('edge:changed',{side:edgeSide,visible:edgeSide&&edgeArea?visibleRect(pet.getBounds(),edgeArea):null});}
function setEdge(side){
  if(side!==null&&!SIDES.includes(side))return;
  clearInterval(edgeTimer);edgeTimer=null;edgeTarget=null;edgeSide=side;state.edgeSide=side;
  if(side)edgeArea=screen.getDisplayMatching(pet.getBounds()).workArea;
  else{edgeArea=null;const[x,y]=pet.getPosition(),[w,h]=pet.getSize();const pos=clampPosition({x,y},w,h);positionWindow(pet,pos);state.position=pos;}
  edgeMessage();send('state',publicState());void persist().catch(console.error);
}
function endDrag(options={}) {
  clearInterval(dragTimer);dragTimer=null;const origin=dragOrigin;dragOrigin=null;if(!origin)return;
  if(pet&&!pet.isDestroyed()){
    if(options?.cancel){positionWindow(pet,origin.restore||origin);if(origin.edgeBefore)setEdge(origin.edgeBefore);}
    else if(options?.dock!==false&&!app.isQuitting&&state.settings.edgeSnap){
      const b=pet.getBounds(),area=screen.getDisplayMatching(b).workArea,side=nearestEdge(b,area);

      if(side&&!(origin.edgeBefore===side))setEdge(side);
    }
    const[x,y]=pet.getPosition();state.position={x,y};pet.webContents.send('drag:ended');void persist().catch(console.error);
  }
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
    state.position = saved.position;state.edgeSide=SIDES.includes(saved.edgeSide)?saved.edgeSide:null;
    state.encryptedKey = saved.encryptedKey || '';
    if (state.encryptedKey && await safeStorage.isAsyncEncryptionAvailable()) {
      key = (await safeStorage.decryptStringAsync(Buffer.from(state.encryptedKey, 'base64'))).result;
    }
  } catch (error) {
    if(error.code==='ENOENT'&&!smoke){
      // First trial launch copies appearance only. Stable data is never written.
      try{const old=JSON.parse(await fs.readFile(path.join(app.getPath('appData'),'bay-chicken','companion.json'),'utf8')).settings;state.settings=validateSettings({...DEFAULTS,scale:old.scale,skin:old.skin,nickname:old.nickname});}catch{}
    }else if(error.code!=='ENOENT')console.warn('Could not restore companion state:',error.message);
  }
  const area = screen.getPrimaryDisplay().workArea;
  const size = { width: 320, height: 400 };
  const p = state.position && Number.isFinite(state.position.x) && Number.isFinite(state.position.y) ? clampPosition(state.position, size.width, size.height) : { x: area.x + area.width - 390, y: area.y + area.height - 480 };
  pet = securedWindow({ ...size, ...p, title: '湾湾 · 大湾鸡', frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, skipTaskbar: true, alwaysOnTop: state.settings.alwaysOnTop, show: false }, 'pet.html');
  panel = securedWindow({ width: 280, height: Math.min(390, area.height - 24), title: '湾湾', frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, alwaysOnTop: state.settings.alwaysOnTop, show: false }, 'panel.html');
  windowSizes.set(pet,size);windowSizes.set(panel,panelSize);
  if(process.platform==='darwin'){
    app.dock?.hide();pet.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});panel.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
    Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'湾湾大湾鸡 Beta',submenu:[{role:'about'},{type:'separator'},{label:'显示桌宠',click:()=>pet.show()},{label:'设置',click:()=>openPanel('settings')},{type:'separator'},{role:'hide'},{role:'quit'}]},{role:'editMenu'}]));
  }
  pet.once('ready-to-show', () => {positionWindow(pet,p);pet.show();if(state.edgeSide)setEdge(state.edgeSide);});
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
  const keepVisible=()=>{endDrag({dock:false});const[w,h]=pet.getSize();const[x,y]=pet.getPosition();const pos=clampPosition({x,y},w,h);positionWindow(pet,pos);state.position=pos;if(edgeSide)setEdge(edgeSide);placePanel();void persist().catch(console.error);};
  screen.on('display-metrics-changed',keepVisible);screen.on('display-removed',keepVisible);
  const image = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
  const trayImage=process.platform==='darwin'?image.resize({width:18,height:18}):image;
  if(process.platform==='darwin')trayImage.setTemplateImage(true);
  tray = new Tray(trayImage);
  refreshIdentity();
  tray.on('double-click', () => { pet.show(); openPanel(); });
  reminderClock.configure(state.settings.reminders);reminderTimer=setInterval(checkReminders,1000);reminderTimer.unref();
  for(const event of['suspend','lock-screen'])powerMonitor.on(event,()=>{systemQuiet=true;});
  for(const event of['resume','unlock-screen'])powerMonitor.on(event,()=>{systemQuiet=false;reminderClock.reset();send('reminder:status',reminderClock.status());});
  // Preview keeps the stable app global shortcuts untouched.

}
function trusted(event) { return [pet, panel].some(w => w && !w.isDestroyed() && w.webContents === event.sender); }
const handle = (name, fn) => ipcMain.handle(name, (event, ...args) => { if (!trusted(event)) throw Error('Unknown window'); return fn(...args); });
const on = (name, fn) => ipcMain.on(name, (event, ...args) => { if (trusted(event)) fn(...args); });
handle('state:get', publicState);
handle('reminders:preview',value=>{try{showReminder([previewReminder(value)],true);return{ok:true};}catch(error){return{ok:false,error:error.message};}});
handle('reminders:snooze',ids=>{reminderClock.snooze(ids,5);reminderVisibleUntil=0;send('reminder:status',reminderClock.status());return{ok:true};});
on('reminders:dismiss',()=>{reminderVisibleUntil=0;});
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
    reminderClock.configure(settings.reminders);
    pet.setAlwaysOnTop(settings.alwaysOnTop); panel.setAlwaysOnTop(settings.alwaysOnTop);
    refreshIdentity();
    if(before.settings.edgeSnap&&!settings.edgeSnap&&edgeSide)setEdge(null);send('state', publicState()); return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
});
handle('history:clear', async () => { if (controller) return { ok: false, error: '请先停止当前回复。' }; state.history = []; await persist(); send('state', publicState()); return { ok: true }; });
handle('chat:send', async text => {
  if (typeof text !== 'string' || !text.trim() || text.length > 8000) return { ok: false, error: '消息须为 1～8000 个字符。' };
  if (controller) return { ok: false, error: `${state.settings.nickname}正在回复，稍等一下。` };
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
      onDelta: delta => { partial += delta; send('chat:delta', delta); } }) : offlineReply(text,state.settings.nickname);
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
on('edge:dock',side=>{if(side==='auto')side=nearestEdge(pet.getBounds(),screen.getDisplayMatching(pet.getBounds()).workArea,Infinity);if(SIDES.includes(side))setEdge(side);});
on('edge:leave',()=>setEdge(null));
on('pet:geometry',g=>{
  if(app.isQuitting||!edgeSide||dragTimer||g?.side!==edgeSide||!g.ready||!Number.isFinite(g.anchor?.x)||!Number.isFinite(g.anchor?.y))return;
  const b=pet.getBounds();if(g.anchor.x<0||g.anchor.x>b.width||g.anchor.y<0||g.anchor.y>b.height)return;
  edgeTarget=dockPosition(b,edgeArea,edgeSide,g.anchor);
  if(edgeTimer)return;
  edgeTimer=setInterval(()=>{if(!edgeSide||!edgeTarget||pet.isDestroyed()){clearInterval(edgeTimer);edgeTimer=null;return;}const[x,y]=pet.getPosition(),dx=edgeTarget.x-x,dy=edgeTarget.y-y;
    const p=Math.max(Math.abs(dx),Math.abs(dy))<=2?edgeTarget:{x:Math.round(x+dx*.38),y:Math.round(y+dy*.38)};positionWindow(pet,p);state.position=p;edgeMessage();if(panel.isVisible())placePanel();
    if(p===edgeTarget){clearInterval(edgeTimer);edgeTimer=null;}
  },16);
});
on('help:open',openHelp);
on('pet:reload',()=>{endDrag();void pet.loadFile(path.join(__dirname,'../dist/pet.html')).catch(console.error);});
on('releases:open',()=>{void shell.openExternal('https://github.com/MikeJack302/bay-chicken-desktop/releases/tag/v'+app.getVersion()).catch(console.error);});
on('pet:home',home);
on('pet:move',point=>{if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;endDrag({dock:false});if(edgeSide)setEdge(null);const[x,y]=pet.getPosition(),[w,h]=pet.getSize();const p=clampPosition({x:x+Math.max(-40,Math.min(40,point.x)),y:y+Math.max(-40,Math.min(40,point.y))},w,h);positionWindow(pet,p);state.position=p;placePanel();void persist().catch(console.error);});
on('pet:action', name => {if(edgeSide&&['stand','sit','tennis','serve','victory','lion','ballet','mushroom','barbell','spring','jump','bounce','dance','spin','stretch','walk','balance','bow'].includes(name))setEdge(null); if (['stand','sit','pet','tickle','dance','wave','sleep','idle','jump','stretch','spin','happy','curious','wink','look','pause','walk','nod','shake','bow','balance','peek','yawn','sigh','bounce','eat','ball','pinwheel','tennis','serve','victory','lion','ballet','mushroom','barbell','spring','reset-view'].includes(name)) send('action', name); });
ipcMain.on('pet:status', (event, value) => {
  if (!pet || event.sender !== pet.webContents || !value || typeof value.mode !== 'string') return;
  petStatus = { edge:edgeSide,mode: value.mode.slice(0,24), posture: value.posture === 'sit' ? 'sit' : 'stand', expression: String(value.expression || '').slice(0,24), paused: !!value.paused };
  panel?.webContents.send('pet:status', petStatus);
});
on('pet:ignore', ignore => { if (!dragTimer) pet.setIgnoreMouseEvents(!!ignore, { forward: true }); });
on('pet:drag-start', point => {
  endDrag({dock:false});const edgeBefore=edgeSide,restore=pet.getBounds();if(edgeSide)setEdge(null);pet.setIgnoreMouseEvents(false);
  const cursor = screen.getCursorScreenPoint(); const [x,y] = pet.getPosition();
  const start=point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Math.hypot(point.x-cursor.x,point.y-cursor.y)<1000?point:cursor;
  dragOrigin = { cursor:start,x:edgeBefore?x-(cursor.x-start.x):x,y:edgeBefore?y-(cursor.y-start.y):y,restore:{x:restore.x,y:restore.y},edgeBefore,time:Date.now() };
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
  app.isQuitting=true;controller?.abort();clearInterval(cursorTimer);clearInterval(edgeTimer);clearInterval(reminderTimer);
  if(quitReady)return;event.preventDefault();endDrag();
  if(pet&&!pet.isDestroyed()){const[x,y]=pet.getPosition();state.position={x,y};}
  let timer;Promise.race([persist(),new Promise(resolve=>{timer=setTimeout(resolve,3000);})]).catch(console.error).finally(()=>{clearTimeout(timer);quitReady=true;app.quit();});
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
if (!app.requestSingleInstanceLock()) app.quit();
else { app.on('second-instance', () => { if (pet) { pet.show(); openPanel(); } }); app.whenReady().then(boot).catch(error => { console.error(error); app.quit(); }); }
