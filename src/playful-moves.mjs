const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const gate=(a,b,c,d,t)=>ease(a,b,t)*(1-ease(c,d,t));
export const BARBELL_GRIP=Object.freeze({palmX:.57,palmY:-.34,palmZ:.10,halfWidth:.30});

export function barbellPose(t){
  const e=gate(.05,.65,9.1,9.8,t),lift=gate(2.0,3.8,6.4,7.8,t),hold=gate(3.9,4.2,6.0,6.45,t);
  const rightStep=ease(.55,1.35,t)*(1-ease(7.95,8.65,t)),leftStep=ease(1.3,1.9,t)*(1-ease(8.6,9.2,t));
  const lunge=gate(1.65,2.35,6.55,7.75,t);
  const stepLift=(a,b)=>Math.sin(Math.PI*ease(a,b,t));
  const rightLift=.13*(stepLift(.55,1.35)+stepLift(7.95,8.65)),leftLift=.085*(stepLift(1.3,1.9)+stepLift(8.6,9.2));
  const dy=-.43+.70*lift+Math.sin(t*25)*.005*hold;
  const{palmX:a,palmY,palmZ:c}=BARBELL_GRIP,b=-palmY;
  const planar=Math.hypot(a,b),angle=Math.atan2(b,a)+Math.asin(clamp(dy/planar,-1,1));
  const afterZ=Math.sqrt(Math.max(0,planar*planar-dy*dy));
  const yaw=Math.atan2(c,afterZ)-Math.acos(clamp(BARBELL_GRIP.halfWidth/Math.hypot(afterZ,c),-1,1));
  return{barbell:e,armL:-angle*e,armR:angle*e,armLX:0,armRX:0,armLY:-yaw*e,armRY:yaw*e,armForward:(.24+.12*lift)*e,
    headX:(.035+.045*lift)*e,headZ:Math.sin(t*3.5)*.022*hold,headY:.025*hold,
    torsoYaw:-.15*lift*e,torsoX:Math.sin(t*19)*.003*hold,hipsDrop:.095*lunge,hipPitch:.035*lunge,
    legL:.24*lunge,legR:-.44*lunge,legRollL:-.10*lunge,legRollR:.26*lunge,footControl:e,footPlant:e,
    footLX:-.08*leftStep,footLZ:-.12*leftStep,footRX:.40*rightStep,footRZ:.30*rightStep,footLiftL:leftLift,footLiftR:rightLift,
    footPitchL:.06*leftLift/.085,footPitchR:.09*rightLift/.13,footYawL:-.10*leftStep,footYawR:.20*rightStep,
    eyeL:-.30*hold,eyeR:-.30*hold,gazeY:-.15*lift,
    expression:t<1.9?'迈开弓步，先站稳':t<3.9?'用力往上举':t<6.4?'顶住…顶唔顺啦':t<7.8?'慢慢放下来':t<9.2?'收脚站稳':'放稳啦'};
}

// A description-led trial, not a reconstruction of the inaccessible clip.
export function springPose(t,intensity=1){
  const e=gate(0,.45,6.0,6.7,t),s=clamp(intensity,.5,1.3);let air=0,prepare=0,land=0,tuck=0,push=0,heel=0,free=0;
  for(const[start,duration,height]of[[1.10,.64,.25],[2.70,.72,.34],[4.42,.60,.22]]){
    const u=clamp((t-start)/duration),f=t>start&&t<start+duration?4*u*(1-u):0;
    air+=f*height;prepare+=gate(start-.38,start-.18,start-.02,start+.1,t);
    land+=gate(start+duration,start+duration+.10,start+duration+.20,start+duration+.46,t);
    push+=gate(start-.18,start-.035,start+.10,start+.22,t);heel+=gate(start+duration-.05,start+duration+.02,start+duration+.08,start+duration+.16,t);
    free+=gate(start+.015,start+.11,start+duration-.12,start+duration+.03,t);
    tuck+=f;
  }
  return{y:air*e*s,legL:(-.20*prepare+.22*tuck-.16*land)*e,legR:(-.20*prepare+.22*tuck-.16*land)*e,
    hipsDrop:(.055*prepare+.045*land)*e,footControl:e,footPlant:(1-clamp(free))*e,footPitchL:(.18*push+.13*tuck-.065*heel)*e,footPitchR:(.18*push+.13*tuck-.065*heel)*e,
    armL:(-.10-.40*tuck-.08*land)*e,armR:(.10+.40*tuck+.08*land)*e,armLX:-.04*tuck*e,armRX:-.04*tuck*e,
    headX:(.05*prepare-.035*tuck+.075*land)*e,headZ:Math.sin(t*2.4)*.018*tuck*e,
    torsoX:(.035*prepare+.035*land)*e,wide:.025*tuck*e,
    expression:t<1.1?'小弹簧蓄力':t<5.25?(air>.02?'蹦起来啦':'轻轻落地'):t<6?'再晃一下':'站稳啦'};
}
