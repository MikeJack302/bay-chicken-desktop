const DEFAULTS = Object.freeze({
  provider: 'openai', endpoint: 'https://api.openai.com/v1', model: 'gpt-6-astra',
  voice: false, alwaysOnTop: true, skin: 'white', scale: 1, nickname: '湾湾',
  autoMotion: true, eyeTracking: true, motionSpeed: 1, motionIntensity: 1,
});
const PERSONA = '你是用户的三维桌宠湾湾，一只以大湾鸡为灵感的可爱白色小伙伴。主要用简体中文，温暖、机灵，偶尔自然说一句粤语。闲聊回复尽量简短，遇到认真问题就认真回答。不要自称官方吉祥物。不要假装看得到屏幕、操作电脑、拥有本应用没有的能力，或声称记得未提供的对话。';

function validateSettings(value) {
  const s = { ...DEFAULTS, ...value };
  if (!['openai', 'compatible'].includes(s.provider)) throw Error('请选择有效的接口类型。');
  let url;
  try { url = new URL(s.endpoint); } catch { throw Error('接口地址格式不正确。'); }
  if (url.username || url.password || url.search || url.hash) throw Error('接口地址不能包含账号、查询参数或片段。');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw Error('远程接口请使用 HTTPS，本机接口可以使用 HTTP。');
  if (s.provider === 'openai' && url.origin !== 'https://api.openai.com') throw Error('OpenAI 模式请使用官方接口；其他服务请选择兼容接口。');
  if (typeof s.model !== 'string' || !s.model.trim() || s.model.length > 100) throw Error('请填写模型名称。');
  return { provider: s.provider, endpoint: url.href.replace(/\/+$/, ''), model: s.model.trim(),
    voice: !!s.voice, alwaysOnTop: !!s.alwaysOnTop, skin: s.skin === 'pink' ? 'pink' : 'white',
    scale: Math.max(0.7, Math.min(1.35, Number(s.scale) || 1)), nickname: String(s.nickname || '湾湾').slice(0, 16),
    autoMotion: s.autoMotion !== false, eyeTracking: s.eyeTracking !== false,
    motionSpeed: Math.max(.6, Math.min(1.6, Number(s.motionSpeed)||1)), motionIntensity: Math.max(.5, Math.min(1.3, Number(s.motionIntensity)||1)) };
}
function extractText(data, provider) {
  if (provider === 'compatible') return data.choices?.[0]?.delta?.content || '';
  if (data.type === 'response.output_text.delta') return data.delta || '';
  if (data.type === 'response.refusal.delta') return data.delta || '';
  return '';
}
async function* sseEvents(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    if (buffer.length > 2_000_000) throw Error('接口返回的数据过大。');
    let match;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const packet = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = packet.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (data && data !== '[DONE]') yield JSON.parse(data);
    }
  }
  buffer += decoder.decode();
  const tail = buffer.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
  if (tail && tail !== '[DONE]') yield JSON.parse(tail);
}
async function streamChat({ settings, key, messages, signal, onDelta, fetchImpl = fetch }) {
  const s = validateSettings(settings);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(s.endpoint).hostname);
  if (!key && !local) throw Error('先在设置中填写 API Key，或使用本机模型接口。');
  const input = messages.slice(-24).map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
  const body = s.provider === 'openai'
    ? { model: s.model, instructions: PERSONA, input, stream: true, store: false, max_output_tokens: 1600 }
    : { model: s.model, messages: [{ role: 'system', content: PERSONA }, ...input], stream: true, max_tokens: 1600 };
  const response = await fetchImpl(s.endpoint + (s.provider === 'openai' ? '/responses' : '/chat/completions'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body), signal, redirect: 'error',
  });
  if (!response.ok) {
    const errors = { 401: 'API Key 无效或已失效。', 403: '当前接口拒绝了访问，请检查账号和地区权限。', 404: '找不到模型或接口，请检查地址和模型名称。', 429: '请求过多或额度不足，请稍后重试并检查账户额度。' };
    throw Error(errors[response.status] || `模型接口暂时不可用（HTTP ${response.status}）。`);
  }
  let full = '';
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const data = await response.json();
    full = s.provider === 'openai' ? data.output?.flatMap(x => x.content || []).map(x => x.text || '').join('') : data.choices?.[0]?.message?.content;
    if (full) onDelta(full);
  } else {
    for await (const data of sseEvents(response.body)) {
      if (data.type === 'error' || data.type === 'response.failed' || data.error) throw Error('模型生成失败，请检查接口配置后重试。');
      const delta = extractText(data, s.provider);
      if (delta) { full += delta; onDelta(delta); }
      if (full.length > 24000) throw Error('回复过长，已停止生成。');
    }
  }
  if (!full?.trim()) throw Error('模型没有返回文字，请检查模型是否支持文字对话。');
  return full;
}
function offlineReply(text) {
  if (/你好|嗨|hello|在吗/i.test(text)) return '在呀！湾湾报到～点点我的脑袋，我会给你一个开心蹦蹦。';
  if (/累|难过|烦|压力/.test(text)) return '先陪你歇一会儿。伸伸肩膀、饮啖水，我在这里陪着你。';
  if (/跳舞|整活/.test(text)) return '收到，湾区舞王申请出战！点一下「跳舞」，看我发挥～';
  return '我现在是离线陪伴模式，只会几句小回应。打开设置接上 AI，就能认真和你聊这个啦。';
}
module.exports = { DEFAULTS, PERSONA, validateSettings, streamChat, sseEvents, extractText, offlineReply };
