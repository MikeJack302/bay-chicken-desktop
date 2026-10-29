const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { DEFAULTS, validateSettings, streamChat, sseEvents } = require('../electron/core.cjs');

test('remote credentials require TLS and official mode cannot target another service', () => {
  assert.throws(() => validateSettings({endpoint:'http://example.com/v1'}), /HTTPS/);
  assert.throws(() => validateSettings({endpoint:'https://evil.example/v1'}), /兼容/);
  assert.throws(() => validateSettings({endpoint:'https://key@example.com/v1'}), /账号/);
  assert.throws(() => validateSettings({endpoint:'https://api.openai.com/v1?key=secret'}), /参数/);
  assert.equal(validateSettings({provider:'compatible',endpoint:'http://localhost:11434/v1/'}).endpoint,'http://localhost:11434/v1');
});
test('SSE parser retains split UTF-8 and supports CRLF, final packets and DONE', async () => {
  const bytes=new TextEncoder().encode('data: {"text":"你好"}\r\n\r\ndata: {"text":"湾湾"}\n\ndata: [DONE]\n\n');
  async function* chunks(){for(let i=0;i<bytes.length;i+=3)yield bytes.slice(i,i+3);}
  const result=[];for await(const event of sseEvents(chunks()))result.push(event.text);
  assert.deepEqual(result,['你好','湾湾']);
});
test('Responses request keeps persona, limits history, disables remote storage, and streams text', async () => {
  let request;const deltas=[];
  const full=await streamChat({settings:DEFAULTS,key:'test-only',messages:Array.from({length:30},(_,i)=>({role:i%2?'assistant':'user',content:String(i)})),onDelta:d=>deltas.push(d),fetchImpl:async(url,opts)=>{
    request={url,...opts};return new Response('data: {"type":"response.created"}\n\ndata: {"type":"response.output_text.delta","delta":"你好"}\n\ndata: {"type":"response.output_text.delta","delta":"呀"}\n\ndata: {"type":"response.completed"}\n\n',{headers:{'content-type':'text/event-stream'}});
  }});
  assert.equal(full,'你好呀');assert.deepEqual(deltas,['你好','呀']);
  const body=JSON.parse(request.body);assert.equal(body.store,false);assert.equal(body.input.length,24);assert.match(body.instructions,/桌宠/);assert.equal(request.redirect,'error');assert.equal(request.url,'https://api.openai.com/v1/responses');
});
test('real HTTP compatible endpoint receives messages and cancellation aborts generation', async t => {
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;
    assert.equal(req.url,'/v1/chat/completions');assert.equal(JSON.parse(raw).messages.at(-1).content,'嗨');
    res.writeHead(200,{'content-type':'text/event-stream'});
    res.write('data: {"choices":[{"delta":{"content":"收到"}}]}\n\n');
    req.on('close',()=>res.end());
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
  const controller=new AbortController();const chunks=[];
  await assert.rejects(streamChat({settings:{...DEFAULTS,provider:'compatible',endpoint:`http://127.0.0.1:${server.address().port}/v1`},key:'',messages:[{role:'user',content:'嗨'}],signal:controller.signal,onDelta:d=>{chunks.push(d);controller.abort();}}),/abort/i);
  assert.deepEqual(chunks,['收到']);
});
test('authentication failures never expose server response or credentials',async()=>{
  await assert.rejects(streamChat({settings:DEFAULTS,key:'secret',messages:[],onDelta:()=>{},fetchImpl:async()=>new Response('secret',{status:401})}),/API Key 无效/);
});
