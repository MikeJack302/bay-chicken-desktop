import { decorateIcons } from './icons.js';
decorateIcons();
(async () => {
const api = window.bay;
const $ = s => document.querySelector(s);
let state, busy = false, pending = null, responseText = '', dirty = false, lastError = '';
function toast(text) { $('#toast').textContent = text; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').hidden = true, 4500); }
function tab(name) {
  api.resizePanel(name);
  $('#chat-view').hidden = name !== 'chat'; $('#settings-view').hidden = name !== 'settings'; $('#play-view').hidden = name !== 'play';
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'chat') $('#message-input').focus();
}
function message(role, content, extra = '') {
  const div = document.createElement('div'); div.className = `message ${role} ${extra}`;
  const label = document.createElement('span'); label.className = 'message-label'; label.textContent = role === 'user' ? '你' : (state?.connected ? '湾湾' : '湾湾 · 离线预设');
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
  for (const id of ['provider', 'endpoint', 'model', 'scale', 'motionSpeed', 'motionIntensity']) $('#' + id).value = s[id];
  for (const id of ['voice', 'alwaysOnTop']) $('#' + id).checked = s[id];
  $(`input[name=skin][value=${s.skin}]`).checked = true;
  $('#key-status').textContent = state.hasKey ? '已保存 · 留空保留' : '未设置';
}
function update(next) {
  state = next;
  $('.connection').classList.toggle('online', state.connected);
  $('#connection-label').textContent = state.connected ? `AI 已配置 · ${state.settings.model}` : '离线陪伴 · 预设回应';
  $('#connect-link').textContent = state.connected ? '连接设置 ↗' : '连接 AI ↗';
  $('#privacy-note').textContent = state.connected ? '对话发送至所选模型服务 · 记录保存在本机' : '离线回应是预设台词 · 不发送到网络';
  if (!dirty) fillSettings();
  $('#quick-auto').checked = state.settings.autoMotion;
  $('#quick-eyes').checked = state.settings.eyeTracking;
  renderPet(state.petStatus);
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
document.querySelectorAll('.tab').forEach(b => b.onclick = () => tab(b.dataset.tab));
document.querySelectorAll('.suggestions button').forEach(b => b.onclick = () => b.id === 'dance-chip' ? api.action('dance') : void submit(b.textContent));
$('#clear-history').onclick = async () => { if (busy) return toast('请先停止当前回复。'); const r = await api.clearHistory(); if (!r.ok) toast(r.error); else { lastError = ''; state = await api.getState(); renderHistory(); speechSynthesis?.cancel(); toast('聊天记录已清空。'); } };
$('#settings-form').oninput = () => { dirty = true; $('#settings-feedback').textContent = ''; };
$('#provider').onchange = () => {
  if ($('#provider').value === 'openai') { $('#endpoint').value = 'https://api.openai.com/v1'; $('#model').value = 'gpt-6-astra'; }
  else { $('#endpoint').value = 'http://localhost:11434/v1'; $('#model').value = 'qwen3:8b'; }
};
$('#settings-form').onsubmit = async e => {
  e.preventDefault(); const button = $('.save-button'); button.disabled = true;
  try {
    const result = await api.saveSettings({ ...state.settings, provider: $('#provider').value, endpoint: $('#endpoint').value, model: $('#model').value,
      apiKey: $('#apiKey').value, clearKey: $('#clearKey').checked, scale: Number($('#scale').value),
      skin: $('input[name=skin]:checked').value, voice: $('#voice').checked, alwaysOnTop: $('#alwaysOnTop').checked,
      motionSpeed: Number($('#motionSpeed').value), motionIntensity: Number($('#motionIntensity').value) });
    $('#settings-feedback').textContent = result.ok ? '已保存，湾湾准备好啦。' : result.error;
    if (result.ok) { dirty = false; $('#apiKey').value = ''; $('#clearKey').checked = false; update(await api.getState()); }
  } catch { $('#settings-feedback').textContent = '保存失败，请重新打开桌宠后重试。'; } finally { button.disabled = false; }
};
$('#quit').onclick = () => api.quit();
function renderPet(p) {
  if (!p) return;
  const labels={wave:'招手',dance:'跳舞',jump:'开心蹦蹦',stretch:'伸懒腰',spin:'转圈',pet:'享受摸头',tickle:'被挠痒痒',sleep:'打瞌睡',curious:'歪头想事情',wink:'给你眨眼',look:'左顾右盼',happy:'开心眯眼',sitDown:'找凳子坐',standUp:'从凳子起身',eat:'吃糖葫芦',ball:'玩小球',pinwheel:'吹风车'};
  $('#presence-text').textContent = p.paused ? '湾湾在这里，静静陪你' : `湾湾正在${labels[p.mode] || (p.posture === 'sit' ? '坐着陪你' : '站着陪你')}`;
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
api.on('state', update);
api.on('panel:tab', tab);
api.on('chat:delta', delta => { responseText += delta; if (pending) { pending.querySelector('.message-content').textContent = responseText; scroll(); } });
update(await api.getState());
})();
