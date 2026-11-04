import { decorateIcons } from './icons.js';
decorateIcons();
(async () => {
const api = window.bay;
const $ = s => document.querySelector(s);
let state, busy = false, pending = null, responseText = '', dirty = false, sizeChanged = false, lastError = '';
const name=()=>state?.settings.nickname||'湾湾';
function toast(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 4500); }
function tab(name) {
  api.resizePanel(name);
  $('#chat-view').hidden = name !== 'chat'; $('#settings-view').hidden = name !== 'settings'; $('#play-view').hidden = name !== 'play';
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'chat') $('#message-input').focus();
}
function message(role, content, extra = '') {
  const div = document.createElement('div'); div.className = `message ${role} ${extra}`;
  const label = document.createElement('span'); label.className = 'message-label'; label.textContent = role === 'user' ? '你' : (state?.connected ? name() : `${name()} · 离线预设`);
  const body = document.createElement('div'); body.className = 'message-content'; body.textContent = content;
  div.append(label, body); $('#messages').append(div); scroll(); return div;
}
function scroll() { $('#messages').scrollTop = $('#messages').scrollHeight; }
const welcome = $('#messages').innerHTML;
function renderHistory() {
  if (busy) return;
  $('#messages').innerHTML = state.history.length ? '' : welcome;
  for (const m of state.history) message(m.role, m.content);
  if (lastError) message('assistant', lastError, 'error');
  $('#suggestions').hidden = state.history.length > 0;
}
function fillSettings() {
  const s = state.settings;
  sizeChanged=false;
  for (const id of ['nickname', 'provider', 'endpoint', 'model', 'scale', 'motionSpeed', 'motionIntensity']) $('#' + id).value = s[id];
  for (const id of ['voice', 'alwaysOnTop','edgeSnap']) $('#' + id).checked = s[id];
  $(`input[name=skin][value=${s.skin}]`).checked = true;
  $('#key-status').textContent = state.hasKey ? '已保存 · 留空保留' : '未设置';
  for(const item of s.reminders.items){$('#reminder-'+item.id+'-enabled').checked=item.enabled;$('#reminder-'+item.id+'-minutes').value=item.minutes;if(item.id==='custom')$('#reminder-custom-text').value=item.text;}
  $('#reminders-paused').checked=s.reminders.paused;
}
function renderReminders(){const s=state?.reminderStatus;if(!s)return;$('#reminder-status').textContent=s.paused?'提醒已暂停，恢复后重新计时。':s.next.length?s.next.map(j=>{const seconds=Math.max(0,Math.ceil((j.due-Date.now())/1000));return `${j.label} · ${seconds===0?'等待合适时机':seconds<60?seconds+'秒后':Math.ceil(seconds/60)+'分钟后'}`;}).join(' / '):'尚未开启提醒，可以先点「试播」看看。';}
function reminderValues(){return{paused:$('#reminders-paused').checked,items:['water','move','eyes','custom'].map(id=>({id,enabled:$('#reminder-'+id+'-enabled').checked,minutes:Number($('#reminder-'+id+'-minutes').value),...(id==='custom'?{text:$('#reminder-custom-text').value}:{})}))};}
function update(next) {
  state = next;
  document.title=name();
  $('#rename-pet').textContent=name();$('#rename-pet').title=`${name()} · 点击改名`;
  $('#hello-chip').textContent=`你好，${name()}`;$('#help-title').textContent=`陪${name()}玩`;
  $('#message-input').placeholder=`和${name()}说点什么…`;
  $('#app-version').textContent=`湾湾 v${state.version}`;
  $('#shortcut-status').textContent=state.version.includes('beta')?'Beta：使用托盘显示 / 隐藏桌宠，点「…」打开面板。':`${state.shortcuts?.toggle?'F8 显示 / 隐藏':'F8 被占用，请使用托盘'} · ${state.shortcuts?.panel?'Ctrl + Alt + B 打开面板':'面板快捷键被占用，可点「…」'}`;
  $('.connection').classList.toggle('online', state.connected);
  $('#connection-label').textContent = state.connected ? `AI 已配置 · ${state.settings.model}` : '离线陪伴 · 预设回应';
  $('#connect-link').textContent = state.connected ? '连接设置 ↗' : '连接 AI ↗';
  $('#privacy-note').textContent = state.connected ? '对话发送至所选模型服务 · 记录保存在本机' : '离线回应是预设台词 · 不发送到网络';
  if (!dirty) fillSettings();
  $('#quick-auto').checked = state.settings.autoMotion;
  $('#quick-eyes').checked = state.settings.eyeTracking;
  renderPet(state.petStatus);
  renderReminders();
  renderHistory();
}
function setBusy(value) {
  busy = value; $('#send').hidden = value; $('#stop').hidden = !value; $('#message-input').disabled = value;
}
function speak(text) {
  if (!state.settings.voice || !window.speechSynthesis) return;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'zh-CN'; utterance.rate = 1.05;
  const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('zh')); if (voice) utterance.voice = voice; speechSynthesis.speak(utterance);
}
async function submit(text) {
  if (busy || !text.trim()) return;
  lastError = '';
  if (!state.history.length) $('#messages').innerHTML = '';
  $('#suggestions').hidden = true; message('user', text); $('#message-input').value = '';
  pending = message('assistant', '想一想…', 'streaming'); responseText = ''; setBusy(true);
  let result;
  try { result = await api.chat(text); } catch { result = { ok: false, error: '桌宠连接中断，请重新打开。' }; }
  pending?.classList.remove('streaming');
  if (!result.ok) { lastError = result.error; if (!responseText) pending?.remove(); message('assistant', result.error, 'error'); }
  else speak(responseText);
  pending = null; setBusy(false); $('#message-input').focus();
  // Main-process state events arrive before invoke resolution. Refresh the durable history
  // without removing transient error feedback from a failed request.
  state = await api.getState(); renderHistory();
}
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); void submit($('#message-input').value); });
$('#message-input').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void submit(e.target.value); } });
$('#stop').onclick = () => api.cancelChat();
$('#close').onclick = () => { speechSynthesis?.cancel(); api.closePanel(); };
$('#connect-link').onclick = () => tab('settings');
$('#rename-pet').onclick=()=>{tab('settings');$('#nickname').focus();$('#nickname').select();};
document.querySelectorAll('.tab').forEach(b => b.onclick = () => tab(b.dataset.tab));
document.querySelectorAll('.suggestions button').forEach(b => b.onclick = () => b.id === 'dance-chip' ? api.action('dance') : void submit(b.textContent));
$('#clear-history').onclick = async () => { if (busy) return toast('请先停止当前回复。'); const r = await api.clearHistory(); if (!r.ok) toast(r.error); else { lastError = ''; state = await api.getState(); renderHistory(); speechSynthesis?.cancel(); toast('聊天记录已清空。'); } };
$('#settings-form').oninput = () => { dirty = true; $('#settings-feedback').textContent = ''; };
$('#scale').oninput=()=>{sizeChanged=true;};
$('#nickname').oninput=e=>{const n=Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(e.target.value.trim())).length;e.target.setCustomValidity(n>16?'名字最多 16 个字。':'');};
$('#provider').onchange = () => {
  if ($('#provider').value === 'openai') { $('#endpoint').value = 'https://api.openai.com/v1'; $('#model').value = 'gpt-6-astra'; }
  else { $('#endpoint').value = 'http://localhost:11434/v1'; $('#model').value = 'qwen3:8b'; }
};
$('#settings-form').onsubmit = async e => {
  e.preventDefault(); const button = $('.save-button'); button.disabled = true;
  try {
    const result = await api.saveSettings({ ...state.settings, provider: $('#provider').value, endpoint: $('#endpoint').value, model: $('#model').value,
      nickname:$('#nickname').value,apiKey: $('#apiKey').value, clearKey: $('#clearKey').checked, scale: sizeChanged?Number($('#scale').value):state.settings.scale,
      skin: $('input[name=skin]:checked').value, edgeSnap:$('#edgeSnap').checked,voice: $('#voice').checked, alwaysOnTop: $('#alwaysOnTop').checked,
      motionSpeed: Number($('#motionSpeed').value), motionIntensity: Number($('#motionIntensity').value),reminders:reminderValues() });
    $('#settings-feedback').textContent = result.ok ? '已保存，准备好啦。' : result.error;
    if (result.ok) { dirty = false; $('#apiKey').value = ''; $('#clearKey').checked = false; update(await api.getState()); }
  } catch { $('#settings-feedback').textContent = '保存失败，请重新打开桌宠后重试。'; } finally { button.disabled = false; }
};
$('#quit').onclick = () => api.quit();
const help=$('#controls-help');
function showHelp(){if(!help.open)help.showModal();}
$('#show-help').onclick=showHelp;
$('#home-pet').onclick=()=>api.home();
$('#edge-rest').onclick=()=>api.dockEdge('auto');
$('#edge-leave').onclick=()=>api.leaveEdge();
$('#release-link').onclick=()=>api.openReleases();
api.on('help:open',showHelp);
function renderPet(p) {
  if (!p) return;
  const labels={barbell:'举杠铃',spring:'弹簧连跳',lion:'跳小狮步',ballet:'Oi 招呼（试作）',mushroom:'劈腿蹲',wave:'招手',dance:'跳舞',jump:'开心蹦蹦',stretch:'伸懒腰',spin:'转圈',pet:'享受摸头',tickle:'被挠痒痒',sleep:'打瞌睡',curious:'歪头想事情',wink:'给你眨眼',look:'左顾右盼',happy:'开心眯眼',sitDown:'找凳子坐',standUp:'从凳子起身',eat:'吃糖葫芦',ball:'玩小球',pinwheel:'吹风车',tennis:'网球对打',serve:'抛球发球',victory:'好球庆祝'};
  $('#presence-text').textContent = p.paused ? `${name()}在这里，静静陪你` : `${name()}正在${labels[p.mode] || (p.edge?'趴边陪你':p.posture === 'sit' ? '坐着陪你' : '站着陪你')}`;
  $('#expression-text').textContent = p.expression;
  document.querySelectorAll('#play-view [data-action]').forEach(b => { const active=b.dataset.action === (p.mode === 'idle' ? p.posture : p.mode); b.classList.toggle('selected',active); b.setAttribute('aria-pressed',String(active)); });
  $('#pause-motion span').textContent = p.paused ? '继续' : '暂停';
  $('#pause-motion i').dataset.icon = p.paused ? 'play' : 'pause'; decorateIcons($('#pause-motion'));
}
document.querySelectorAll('#play-view [data-action]').forEach(b=>b.onclick=()=>api.action(b.dataset.action));
$('#pause-motion').onclick=()=>api.action('pause');
$('#panel-reset-view').onclick=()=>api.action('reset-view');
for (const [id,key] of [['quick-auto','autoMotion'],['quick-eyes','eyeTracking']]) {
  $('#' + id).onchange=async e=>{
    const input=e.target;input.disabled=true;
    try { const latest=await api.getState();const result=await api.saveSettings({...latest.settings,[key]:input.checked}); if(!result.ok){input.checked=latest.settings[key];toast(result.error);} }
    finally { input.disabled=false; }
  };
}
api.on('pet:status',renderPet);
document.querySelectorAll('[data-preview-reminder]').forEach(button=>button.onclick=async()=>{const result=await api.previewReminder({id:button.dataset.previewReminder,text:$('#reminder-custom-text').value});if(!result.ok)toast(result.error);});
$('#save-reminders').onclick=async e=>{const button=e.target;button.disabled=true;try{const latest=await api.getState(),result=await api.saveSettings({...latest.settings,reminders:reminderValues()});if(result.ok){state=await api.getState();renderReminders();$('#reminder-feedback').textContent='提醒已保存。';}else $('#reminder-feedback').textContent=result.error;}catch{$('#reminder-feedback').textContent='保存失败，请稍后重试。';}finally{button.disabled=false;}};
api.on('reminder:status',value=>{if(state){state.reminderStatus=value;renderReminders();}});setInterval(renderReminders,1000);
api.on('state', update);
api.on('panel:tab', tab);
api.on('chat:delta', delta => { responseText += delta; if (pending) { pending.querySelector('.message-content').textContent = responseText; scroll(); } });
update(await api.getState());
})();
