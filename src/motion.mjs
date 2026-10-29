export const ACTIONS=Object.freeze({stand:'站立',sit:'找凳子坐',wave:'招手',jump:'跳跃',dance:'跳舞',stretch:'伸懒腰',spin:'转圈',pet:'摸头',tickle:'挠痒痒',sleep:'打瞌睡',happy:'开心',curious:'好奇',wink:'眨眼',look:'张望',walk:'踏步',nod:'点头',shake:'摇头',bow:'鞠躬',balance:'金鸡独立',peek:'探头',yawn:'打哈欠',sigh:'放松',bounce:'连跳',eat:'吃糖葫芦',ball:'玩小球',pinwheel:'吹风车',sitDown:'找凳子坐',standUp:'起身'});
const durations={wave:3.6,jump:2.1,dance:9,stretch:5.2,spin:3.5,pet:3,tickle:3,happy:3.2,curious:4.1,wink:1.6,look:5,walk:5.5,nod:2.8,shake:3,bow:3.6,balance:4.5,peek:4.2,yawn:4.6,sigh:3.5,bounce:3.7,eat:6.8,ball:6.5,pinwheel:6,sitDown:4.5,standUp:2.6,talk:5,think:90};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
function start(m,name,automatic=false){
  m.from=m.output?{...m.output}:null;m.blendTime=0;m.blendDuration=['sit','stand','sleep'].includes(name)?.75:.38;
  m.paused=false;m.lastMode=m.mode;m.elapsed=0;
  const wasSeated=m.posture==='sit';m.afterSeat=null;
  if(name==='rest'){m.mode='idle';}
  else if(name==='sit'){m.posture='sit';m.chair=true;m.mode=wasSeated?'idle':'sitDown';}
  else if(name==='stand'){m.posture='stand';m.chair=false;m.mode=wasSeated?'standUp':'idle';}
  else if(name==='sleep'){if(m.mode==='sleep')m.mode='idle';else{m.posture='sit';m.chair=true;m.mode=wasSeated?'sleep':'sitDown';if(!wasSeated)m.afterSeat='sleep';}}
  else {m.mode=name;if(['jump','bounce','dance','spin','stretch','walk','balance','bow'].includes(name)){m.posture='stand';m.chair=false;}}
  if(!automatic){m.lastInteraction=m.clock;m.nextAuto=m.clock+9+m.random()*8;}
  m.variant=m.random();
}
export function createMotion(random=Math.random){return{mode:'idle',posture:'stand',chair:false,afterSeat:null,expression:'自然',paused:false,elapsed:0,clock:0,lastInteraction:0,nextAuto:5+random()*4,nextBlink:2+random()*3,blinkAt:-100,doubleBlink:false,gazeX:0,gazeY:0,headLookX:0,headLookY:0,glanceX:0,glanceY:0,nextGlance:1+random()*2,phase:random()*6.28,random,output:null,from:null,blendTime:1,blendDuration:.4,variant:random(),turnBase:0,lastMode:''};}
export function trigger(m,name){
  if(name==='pause'){m.paused=!m.paused;return;}
  if(name==='reset-view')return;
  if(name==='idle'){if(['talk','think'].includes(m.mode))start(m,'rest',true);return;}
  if(!ACTIONS[name]&&!['think','talk'].includes(name))return;
  if(m.mode==='spin'&&m.output)m.turnBase=Math.round(m.output.spin/(Math.PI*2))*Math.PI*2;
  start(m,name);
}
function blink(now,at){const t=now-at;return smooth(0,.065,t)*(1-smooth(.065,.23,t));}
export function stepMotion(m,dt,settings={},cursor={x:0,y:0,near:false}){
  if(m.paused&&m.output)return{...m.output};
  const speed=settings.motionSpeed||1;m.clock+=dt;m.elapsed+=dt*speed;m.blendTime+=dt;
  let now=m.clock,t=m.elapsed;
  if(durations[m.mode]&&t>durations[m.mode]){if(m.mode==='spin')m.turnBase+=Math.PI*2;const next=m.mode==='sitDown'&&m.afterSeat?'sleep':'rest';start(m,next,true);t=0;}
  if(m.mode==='idle'&&settings.autoMotion!==false&&now>m.nextAuto){
    const pool=m.posture==='sit'?['look','curious','nod','happy','yawn','sigh','wave','pinwheel']:['look','curious','wave','nod','peek','sigh','stretch','walk','balance','bow','yawn','ball','pinwheel'];
    if(now-m.lastInteraction>45)pool.push(m.posture==='sit'?'stand':'sit');
    const choices=pool.filter(n=>n!==m.lastMode);const selected=choices[Math.floor(m.random()*choices.length)];start(m,selected,true);m.nextAuto=now+11+m.random()*13;t=0;
  }
  if(now>m.nextGlance){m.glanceX=(m.random()-.5)*1.2;m.glanceY=(m.random()-.5)*.6;m.nextGlance=now+1.5+m.random()*3.5;}
  if(now>m.nextBlink){m.blinkAt=now;m.doubleBlink=m.random()<.18;m.nextBlink=now+2.7+m.random()*4.2;}
  let bl=blink(now,m.blinkAt),br=blink(now-.012,m.blinkAt);
  if(m.doubleBlink){bl=Math.max(bl,blink(now,m.blinkAt+.35));br=Math.max(br,blink(now-.012,m.blinkAt+.35));}
  const sleep=m.mode==='sleep',happy=['pet','tickle','happy'].includes(m.mode),focus=settings.eyeTracking!==false&&cursor.near&&!sleep;
  let gx=focus?cursor.x:m.glanceX,gy=focus?cursor.y:m.glanceY;
  if(m.mode==='look'){gx=Math.sin(t*1.1)*.8;gy=Math.cos(t*.8)*.25;}
  if(m.mode==='think'){gx=.5;gy=.6;}
  if(m.mode==='peek')gx=.7;
  m.gazeX=mix(m.gazeX,gx,1-Math.exp(-dt*13));m.gazeY=mix(m.gazeY,gy,1-Math.exp(-dt*13));
  m.headLookX=mix(m.headLookX,m.gazeX,1-Math.exp(-dt*3));m.headLookY=mix(m.headLookY,m.gazeY,1-Math.exp(-dt*3));
  const phase=m.phase,breath=Math.sin(now*1.9+phase),weight=Math.sin(now*.71+phase)*.65+Math.sin(now*1.13)*.35;
  const sitting=m.posture==='sit'?1:0;
  const p={sit:sitting,x:(m.chair?-.52:0)+weight*.018,y:0,z:m.chair?-.13:0,chair:m.chair?1:0,seatLift:m.chair?.25:0,seatProgress:m.chair?1:0,eat:0,bites:0,ball:0,pinwheel:0,toyTime:t,scaleY:1+breath*.004,scaleX:1,spin:m.turnBase,yaw:0,sway:weight*.013,breath:breath*.006,torsoX:0,
    headX:-m.headLookY*.12,headY:m.headLookX*.19,headZ:Math.sin(now*.67+phase)*.014,
    armL:-.025+Math.sin(now*1.32+phase)*.022,armR:.025+Math.sin(now*1.17+phase+1)*.022,armLX:0,armRX:0,
    legL:Math.sin(now*.71+phase)*.016,legR:-Math.sin(now*.71+phase)*.016,tail:Math.sin(now*1.55+phase+.7)*.065+Math.sin(now*2.3)*.02,
    gazeX:m.gazeX,gazeY:m.gazeY,eyeL:(1-bl)*(happy?.38:sleep?.035:1),eyeR:(1-br)*(happy?.38:sleep?.035:1),wide:m.mode==='curious'?1.07:1,
    expression:sleep?'困困':happy?'开心':focus?'看着你':'自然'};
  if(sitting){p.armL=-.1;p.armR=.1;p.headX+=.025;}
  const duration=durations[m.mode]||100,e=smooth(0,.5,t)*(1-smooth(duration-.65,duration,t)),s=settings.motionIntensity||1;
  const beat=t*(5.5+m.variant*1.1),swing=Math.sin(beat);
  if(m.mode==='sitDown'){
    const move=smooth(.85,2.45,t),seated=smooth(2.45,3.7,t),steps=smooth(.8,1,t)*(1-smooth(2.1,2.5,t));
    p.chair=smooth(0,.5,t);p.sit=seated;p.seatProgress=seated;p.seatLift=seated*.25;p.x=-.52*move;p.z=-.13*move;p.y=Math.abs(Math.sin((t-.85)*7))*.025*steps;
    p.headY-=.28*(1-smooth(1.4,2.6,t));p.headX+=seated*.04;p.yaw=-.1*steps;
    p.legL=Math.sin((t-.85)*7)*.28*steps;p.legR=-p.legL;p.armLX=-p.legL*.35;p.armRX=p.legL*.35;p.expression=t<.85?'找到小凳子':t<2.5?'挪过去':'坐稳啦';
  }
  if(m.mode==='standUp'){
    const seated=1-smooth(.1,1.3,t),move=1-smooth(1,2.5,t);p.sit=seated;p.chair=1-smooth(1.35,2.5,t);p.seatProgress=seated;p.seatLift=seated*.25;p.x=-.52*move;p.z=-.13*move;
    p.headX+=.08*Math.sin(t/2.6*Math.PI);p.expression='起来走走';
  }
  if(m.mode==='eat'){
    p.eat=e;p.bites=t>5.1?3:t>3.8?2:t>2.5?1:0;p.armR=2.12*e;p.armRX=1.05*e;
    p.headX+=Math.sin(t*7)*.016*e;p.eyeL*=1-e*.32;p.eyeR*=1-e*.32;p.gazeX=.15;p.gazeY=-.2;p.expression=p.bites===3?'甜甜的':'吃糖葫芦';
  }
  if(m.mode==='ball'){
    p.ball=e;p.armR=(.5+Math.sin(t*6)*.12)*e;p.armRX=.2*e;p.headY+=.1*e;p.gazeX=.7;p.gazeY=Math.abs(Math.sin((t-.7)*3.8))*.8-.35;p.expression='接住小球';
  }
  if(m.mode==='pinwheel'){
    p.pinwheel=e;p.armL=-.65*e;p.armLX=.2*e;p.gazeX=-.6;p.gazeY=.15;p.headY-=.08*e;p.eyeL*=1-e*.12;p.eyeR*=1-e*.12;p.expression='呼——转起来';
  }
  if(m.mode==='wave'){p.armR=(.9+Math.sin(t*8.4)*.18)*e;p.headZ-=.045*e;p.armRX=-.1*e;p.tail+=Math.sin(t*4)*.08*e;}
  if(m.mode==='dance'){
    const side=Math.sin(t*2.8),phrase=Math.floor(t/2.4)%3;
    p.x+=side*.07*s*e;p.sway+=Math.sin(beat-.3)*.085*s*e;p.y+=Math.max(0,swing)*.055*s*e;p.yaw=Math.sin(t*1.4)*.17*e;
    p.armL=(-.42+Math.sin(beat-.6)*.32)*e;p.armR=(.42+Math.sin(beat+.9)*.32)*e;p.armLX=Math.cos(beat)*.1*e;p.armRX=-Math.cos(beat)*.1*e;
    p.legL=Math.max(0,swing)*.35*e;p.legR=Math.max(0,-swing)*.35*e;p.headZ-=Math.sin(beat-.7)*.045*e;
    if(phrase===1){p.armR+=.28*e;p.headY+=Math.sin(t*2)*.09*e;}if(phrase===2){p.x+=Math.sin(t*5)*.025*e;p.sway*=.7;}
    p.expression='跟着节奏';
  }
  if(m.mode==='jump'||m.mode==='bounce'){
    let q=t;if(m.mode==='bounce')q=t<1.65?t:t-1.65;
    const crouch=smooth(0,.22,q)*(1-smooth(.22,.34,q)),flight=clamp((q-.34)/.66,0,1),air=q>.34&&q<1;
    const land=q>=1?Math.exp(-(q-1)*7)*Math.sin((q-1)*13):0;
    p.y=air?4*flight*(1-flight)*.40*s:-crouch*.035;p.scaleY=1-crouch*.10-land*.10;p.armL=-((air?Math.sin(flight*Math.PI):0)*.5+crouch*.1);p.armR=-p.armL;p.headX-=Math.max(land,0)*.06;p.expression='蹦蹦';
  }
  if(m.mode==='stretch'){const u=Math.sin(t/duration*Math.PI)*e;p.armL=-u*1.05;p.armR=u*1.05;p.headX-=u*.09;p.scaleY+=u*.035;p.eyeL*=1-u*.6;p.eyeR*=1-u*.6;p.expression='伸个懒腰';}
  if(m.mode==='spin'){p.spin=m.turnBase+2*Math.PI*smooth(.35,3.05,t);p.armL=-.32*e;p.armR=.32*e;p.sway+=Math.sin(t*3)*.025*e;p.expression='转圈';}
  if(m.mode==='pet'||m.mode==='tickle'){p.headZ+=Math.sin(t*4.5)*.035*e;p.headX+=.045*e;p.tail+=Math.sin(t*7)*.16*e;p.armL-=.18*e;p.armR+=.18*e;if(m.mode==='tickle'){p.sway+=Math.sin(t*10)*.026*e;p.headX+=Math.sin(t*8)*.025*e;}p.expression=m.mode==='pet'?'喜欢摸摸':'有点痒';}
  if(m.mode==='curious'){p.headZ+=.15*e;p.headY+=Math.sin(t*1.3)*.08*e;p.eyeL*=.97;p.expression='好奇';}
  if(m.mode==='wink'){p.eyeL=1-.97*smooth(.1,.45,t)*(1-smooth(.8,1.35,t));p.headZ-=.035*e;p.expression='眨眼';}
  if(m.mode==='walk'){p.legL=Math.sin(t*6)*.38*e;p.legR=-p.legL;p.armLX=-p.legL*.5;p.armRX=p.legL*.5;p.y+=Math.abs(Math.sin(t*6))*.025*e;p.x+=Math.sin(t*3)*.04*e;p.yaw=Math.sin(t*3)*.08*e;p.sway+=Math.sin(t*3)*.045*e;p.expression='踏踏步';}
  if(m.mode==='nod'){p.headX+=Math.sin(t*5.3)*.12*e;p.expression='嗯嗯';}
  if(m.mode==='shake'){p.headY+=Math.sin(t*4.5)*.21*e;p.expression='摇摇头';}
  if(m.mode==='bow'){const u=smooth(.2,1.35,t)*(1-smooth(2,3.3,t));p.torsoX=u*.19;p.headX+=u*.14;p.y-=u*.055;p.armLX=-u*.12;p.armRX=-u*.12;p.expression='谢谢你';}
  if(m.mode==='balance'){p.x-=.07*e;p.sway-=.075*e;p.legR=-.55*e;p.armL=-.48*e;p.armR=.36*e;p.headZ+=Math.sin(t*3)*.025*e;p.expression='站稳稳';}
  if(m.mode==='peek'){p.x+=.07*e;p.sway+=.07*e;p.headZ-=.15*e;p.headY+=.20*e;p.expression='探头看看';}
  if(m.mode==='yawn'){const u=Math.sin(t/duration*Math.PI)*e;p.eyeL*=1-u*.95;p.eyeR*=1-u*.95;p.headX-=u*.13;p.armR=.5*u;p.scaleY+=u*.018;p.expression='困了吗';}
  if(m.mode==='sigh'){p.scaleY+=Math.sin(t/duration*Math.PI)*.018;p.headX+=.06*e;p.armL+=.045*e;p.armR-=.045*e;p.eyeL*=1-e*.3;p.eyeR*=1-e*.3;p.expression='放松一下';}
  if(sleep){p.headX=.15+Math.sin(now*.8)*.035;p.headZ=.06;p.gazeX=p.gazeY=0;p.tail=0;p.sway=Math.sin(now*.6)*.01;}
  if(m.mode==='talk'){p.headX+=Math.sin(t*3.7)*.025*e;p.armR+=.15*e;p.expression='回应你';}
  if(m.mode==='think'){p.headZ+=Math.sin(t*.9)*.04;p.expression='想一想';}
  if(m.from){const blend=smooth(0,m.blendDuration,m.blendTime);for(const key of Object.keys(p))if(typeof p[key]==='number'&&typeof m.from[key]==='number')p[key]=mix(m.from[key],p[key],blend);if(blend>=1)m.from=null;}
  p.eyeL=clamp(p.eyeL,0,1);p.eyeR=clamp(p.eyeR,0,1);m.expression=p.expression;m.output={...p};return p;
}
