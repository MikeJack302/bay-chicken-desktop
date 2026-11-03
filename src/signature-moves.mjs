const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const window=(a,b,c,d,t)=>ease(a,b,t)*(1-ease(c,d,t));
export const SIGNATURE_DURATIONS=Object.freeze({lion:9.2,ballet:6.6,mushroom:8.8});

// Trial choreography: the original mesh, head scale and camera stay unchanged.
// "ballet" is deliberately provisional until the exact Oi clip is available.
export function signaturePose(action,t,intensity=1){
  const d=SIGNATURE_DURATIONS[action];if(!d)return null;
  const e=window(0,.65,d-.75,d,t),s=clamp(intensity,.5,1.3);
  const p={hipsDrop:0,torsoDrop:0,legRollL:0,legRollR:0,legYawL:0,legYawR:0,legSpread:0,hipPitch:0,legLiftL:0,legLiftR:0,
    armL:0,armR:0,armLX:0,armRX:0,headX:0,headY:0,headZ:0,torsoX:0,x:0,y:0,yaw:0,sway:0,legL:0,legR:0};
  if(action==='lion'){
    const bow=window(.35,1.05,1.5,2.2,t),steps=window(1.7,2.15,5.25,5.8,t),u=(t-2.15)*Math.PI*2/1.2;
    const left=Math.pow(Math.max(0,Math.sin(u)),1.5),right=Math.pow(Math.max(0,-Math.sin(u)),1.5);
    const finalBow=window(7.4,8.0,8.5,9.15,t),lean=(bow*.18+finalBow*.14)*e;
    const flight=clamp((t-6.02)/.56),air=t>6.02&&t<6.58?4*flight*(1-flight)*.13*s:0;
    const crouch=window(5.65,5.9,6.02,6.15,t),land=window(6.58,6.72,6.88,7.18,t);
    p.hipsDrop=(.04*steps+.085*crouch+.035*land)*e;p.torsoDrop=(.035*crouch+.02*land)*e;
    p.legL=(-left*.42*steps-.12*crouch)*e;p.legR=(-right*.42*steps-.12*crouch)*e;
    p.legLiftL=.11*left*steps*e;p.legLiftR=.11*right*steps*e;
    p.legRollL=-.13*e;p.legRollR=.13*e;p.legYawL=-.06*e;p.legYawR=.06*e;
    p.x=Math.sin(u)*.055*steps*e;p.y=air*e;
    p.yaw=(Math.sin(u*.5)*.18*steps+.12*bow-.10*finalBow)*e;p.sway=Math.sin(u)*.018*steps*e;
    p.armL=(-.25-.12*left*steps-.12*air/.13)*e;p.armR=(.25+.12*right*steps+.12*air/.13)*e;
    p.armLX=p.armRX=.12*e;p.torsoX=lean;p.headX=lean*.45+Math.sin(u-.4)*.055*steps*e;
    p.headY=Math.sin(u*.5-.35)*.12*steps*e;p.headZ=Math.sin(u-.25)*.032*steps*e;
    p.expression=t<1.8?'低头问好':t<5.8?'踩着小狮步':t<7.3?'轻轻弹起':'收步致意';
  }else if(action==='ballet'){
    const greet=window(.55,.90,1.35,1.75,t),again=window(2.0,2.25,2.65,3.05,t),pose=window(3.1,3.7,4.7,5.4,t);
    p.armR=(.95*greet+.95*again+.55*pose)*e;p.armL=(-.22*greet-.22*again-.50*pose)*e;
    p.armRX=-.12*(greet+again)*e;p.armLX=.12*pose*e;
    p.headZ=(-.09*greet+.075*again)*e;p.headY=.06*(greet-again)*e;p.headX=-.025*(greet+again)*e;
    p.legR=-.26*pose*e;p.legRollR=.18*pose*e;p.legYawL=-.06*pose*e;p.legYawR=.10*pose*e;
    p.x=-.025*pose*e;p.sway=-.018*pose*e;p.yaw=.08*pose*e;
    p.expression=t<3?'Oi～（待对照）':t<5.4?'轻轻点个脚尖':'收好小手';
  }else{
    const depth=window(.8,2.6,5.8,7.9,t),hold=window(2.6,3.0,5.3,5.8,t);
    p.hipsDrop=.08*depth;p.torsoDrop=.065*depth;
    p.legL=-.36*depth;p.legR=-.36*depth;p.legRollL=-.68*depth;p.legRollR=.68*depth;
    p.legYawL=-.10*depth;p.legYawR=.10*depth;p.legSpread=.018*depth;p.hipPitch=.02*depth;
    p.armL=-.13*depth;p.armR=.13*depth;p.armLX=p.armRX=-.18*depth;
    p.torsoX=.075*depth;p.headX=-.10*depth;p.headZ=Math.sin((t-2.8)*1.6)*.025*hold;
    p.headY=Math.sin((t-3.0)*.8)*.045*hold;
    p.expression=t<.8?'准备蹲蹲':t<2.6?'小脚慢慢打开':t<5.8?'蹲成一朵小蘑菇':t<7.9?'慢慢站起来':'站稳啦';
  }
  return p;
}
