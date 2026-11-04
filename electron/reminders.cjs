const PRESETS=Object.freeze([
 Object.freeze({id:'water',label:'喝水',minutes:45,text:'喝口水，陪我休息一下吧～'}),
 Object.freeze({id:'move',label:'起身活动',minutes:60,text:'坐了好一会儿，起来伸伸懒腰吧～'}),
 Object.freeze({id:'eyes',label:'放松眼睛',minutes:30,text:'看看远处，让眼睛放松一小会儿吧～'}),
 Object.freeze({id:'custom',label:'自定义',minutes:60,text:'记得给自己一点休息时间～'}),
]);
const DEFAULT_REMINDERS=Object.freeze({paused:false,items:Object.freeze(PRESETS.map(p=>Object.freeze({...p,enabled:false})))});
function cleanText(value){return Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b\u202a-\u202e\u2066-\u2069\ufeff]/gu,' ').replace(/\s+/gu,' ').trim()),s=>s.segment).slice(0,60).join('');}
function normalizeReminders(value){
 const rows=Array.isArray(value?.items)?value.items:[];
 return{paused:value?.paused===true,items:PRESETS.map(p=>{
  const row=rows.find(r=>r&&r.id===p.id)||{},minutes=row.minutes===undefined?p.minutes:Number(row.minutes);
  if(!Number.isInteger(minutes)||minutes<1||minutes>240)throw Error('提醒间隔请填写 1–240 的整数（分钟）。');
  const text=p.id==='custom'?cleanText(row.text===undefined?p.text:row.text):p.text,enabled=row.enabled===true;
  if(enabled&&!text)throw Error('请先填写自定义提醒内容。');return{...p,enabled,minutes,text};
 })};
}
function previewReminder(value){const p=PRESETS.find(p=>p.id===value?.id);if(!p)throw Error('请选择有效的提醒。');const text=p.id==='custom'?cleanText(value.text):p.text;if(!text)throw Error('请先填写自定义提醒内容。');return{...p,text};}
function createReminderClock(now=Date.now){
 let config=normalizeReminders(),jobs=new Map(),last=now();
 function reset(){const time=now();for(const job of jobs.values())job.due=time+job.minutes*60000;last=time;}
 function configure(value){const next=normalizeReminders(value),time=now(),resumed=config.paused&&!next.paused,newJobs=new Map();
  for(const item of next.items)if(item.enabled){const old=jobs.get(item.id),same=old&&old.minutes===item.minutes&&old.text===item.text;newJobs.set(item.id,{...item,due:!resumed&&same?old.due:time+item.minutes*60000});}
  config=next;jobs=newJobs;last=time;return status();
 }
 function poll(available=true){const time=now();if(time<last-5000)reset();last=time;if(config.paused||!available)return[];
  const due=[...jobs.values()].filter(job=>job.due<=time);for(const job of due)job.due=time+job.minutes*60000;
  return due.map(({id,label,text})=>({id,label,text}));
 }
 function snooze(ids,minutes=5){const time=now();for(const id of Array.isArray(ids)?ids:[])if(jobs.has(id))jobs.get(id).due=time+minutes*60000;}
 function status(){return{paused:config.paused,next:[...jobs.values()].map(({id,label,due})=>({id,label,due}))};}
 return{configure,poll,snooze,reset,status};
}
module.exports={PRESETS,DEFAULT_REMINDERS,normalizeReminders,previewReminder,createReminderClock};
