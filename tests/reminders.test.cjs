const{test}=require('node:test'),assert=require('node:assert/strict');
const{normalizeReminders,createReminderClock,previewReminder}=require('../electron/reminders.cjs');
const config=(changes={},paused=false)=>({paused,items:['water','move','eyes','custom'].map(id=>({id,enabled:id in changes,minutes:1,...changes[id]}))});
test('reminders validate intervals, preserve safe text, and remain opt-in',()=>{
 assert.ok(normalizeReminders().items.every(i=>!i.enabled));assert.throws(()=>normalizeReminders(config({water:{minutes:0}})),/1–240/);assert.throws(()=>normalizeReminders(config({water:{minutes:1.5}})),/1–240/);
 assert.throws(()=>normalizeReminders(config({custom:{text:'\n '}})),/内容/);assert.equal(previewReminder({id:'custom',text:' <休息>\n一下 '}).text,'<休息> 一下');assert.throws(()=>previewReminder({id:'not-real'}));
 assert.equal(normalizeReminders(config({custom:{text:'🐔'.repeat(100)}})).items[3].text,'🐔'.repeat(60));
});
test('interval deadlines survive unrelated saves, coalesce due reminders, and never replay a backlog',()=>{
 let time=0;const clock=createReminderClock(()=>time),c=config({water:{},eyes:{}});clock.configure(c);time=30000;clock.configure(c);assert.equal(clock.status().next[0].due,60000);
 time=60000;assert.deepEqual(clock.poll().map(i=>i.id),['water','eyes']);assert.equal(clock.poll().length,0);time=9*60000;assert.equal(clock.poll(false).length,0);assert.equal(clock.poll().length,2);assert.ok(clock.status().next.every(j=>j.due===10*60000));
});
test('pause, wake reset and snooze have predictable new deadlines',()=>{
 let time=0;const clock=createReminderClock(()=>time);clock.configure(config({water:{}}));time=30000;clock.configure(config({water:{}},true));time=120000;assert.deepEqual(clock.poll(),[]);clock.configure(config({water:{}}));assert.equal(clock.status().next[0].due,180000);
 clock.snooze(['water']);assert.equal(clock.status().next[0].due,420000);time=300000;clock.reset();assert.equal(clock.status().next[0].due,360000);clock.configure(config());assert.deepEqual(clock.status().next,[]);
});
test('system clock rollback resets timing instead of leaving a stale deadline',()=>{let time=600000;const c=createReminderClock(()=>time);c.configure(config({water:{}}));time=0;assert.deepEqual(c.poll(),[]);assert.equal(c.status().next[0].due,60000);});
