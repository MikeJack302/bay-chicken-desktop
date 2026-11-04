const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
const cue=(a,b,c,d,t)=>ease(a,b,t)*(1-ease(c,d,t));
export function faceCue(mode,t,duration=8){
 const e=cue(0,.35,duration-.5,duration,t),f={closedL:0,closedR:0,lidCurve:1,mouthSmile:0,aperture:1,tilt:0,nod:0,gazeWeight:0,gazeX:0,gazeY:0};
 const grin=(amount=1)=>{f.closedL=f.closedR=amount;f.mouthSmile=amount*.7;};
 if(['pet','tickle','happy','victory'].includes(mode)){grin(e);f.tilt=Math.sin(t*3.2)*.025*e;}
 if(mode==='dance'){grin(e*(.88+.12*Math.sin(t*3)**2));f.tilt=Math.sin(t*3-.3)*.028*e;}
 if(mode==='jump'){grin(cue(.4,.62,1.35,1.75,t));}
 if(mode==='bounce'||mode==='spin'){grin(.9*e);}
 if(mode==='stretch'){grin(cue(1.45,1.8,3.15,3.65,t)*.9);f.mouthSmile=.45*e;}
 if(mode==='ball'){grin(Math.max(...[1.4,3.05,4.7].map(s=>cue(s-.12,s,s+.15,s+.35,t))));}
 if(mode==='pinwheel'){f.mouthSmile=.4*e;}
 if(mode==='tennis'||mode==='serve'){f.aperture=1-.07*e;f.mouthSmile=.20*e;}
 if(mode==='curious'||mode==='peek'){f.mouthSmile=.3*e;}
 if(mode==='standUp'){grin(cue(1.3,1.55,2.0,2.5,t)*.8);}
 if(mode==='wave'||mode==='wink'){const wink=cue(.55,.75,1.1,1.4,t);f.closedL=wink;f.closedR=.18*e;f.mouthSmile=.6*e;f.tilt=-.025*wink;}
 if(mode==='eat'){const yum=Math.max(...[2.15,3.45,4.75].map(s=>cue(s,s+.18,s+.45,s+.75,t)));grin(yum);f.nod=Math.sin(t*8)*.008*yum;}
 if(mode==='sitDown'){grin(cue(2.9,3.2,3.7,4.1,t)*.8);f.gazeWeight=cue(.1,.4,1.2,1.7,t);f.gazeX=-.5;f.gazeY=-.35;}
 if(mode==='spring'){
  const air=Math.max(...[[1.1,.64],[2.7,.72],[4.42,.60]].map(([s,d])=>cue(s+.04,s+.16,s+d-.17,s+d+.02,t)));
  const end=cue(5.1,5.45,6.1,6.7,t);grin(Math.max(air,end));f.tilt=Math.sin(t*3.5)*.024*air;
  f.gazeWeight=cue(.55,.85,1.0,1.15,t);f.gazeY=.35;
 }
 if(mode==='barbell'){
  const strain=cue(3.9,4.2,6.0,6.4,t),relief=cue(7.65,8.05,9.15,9.7,t),blink=cue(4.75,4.84,4.91,5.02,t);
  grin(relief);f.aperture=1-.17*strain-.65*blink;f.tilt=.04*relief;f.nod=.02*Math.sin(t*2.7)*relief;
  const prep=cue(.1,.45,2.1,2.7,t);f.gazeWeight=Math.max(prep,strain*.85);f.gazeY=-.45*prep-.12*strain;f.gazeX=.25*prep;
 }
 if(mode==='lion'){grin(Math.max(cue(.5,.8,1.2,1.6,t)*.5,cue(6.08,6.2,6.5,6.7,t),cue(7.6,8,8.5,9.15,t)*.85));}
 if(mode==='ballet'){f.closedL=cue(.7,.9,1.3,1.65,t);f.closedR=cue(2.1,2.3,2.65,2.95,t);f.mouthSmile=.55*e;}
 if(mode==='mushroom'){grin(cue(3.0,3.4,4.0,4.4,t));f.closedL=Math.max(f.closedL,cue(4.8,5.0,5.3,5.6,t));f.mouthSmile=.45*e;}
 if(mode==='bow'||mode==='nod'){grin(.65*e);}
 if(mode==='sleep'){grin(1);f.lidCurve=-1;f.mouthSmile=0;}
 if(mode==='yawn'){f.closedL=f.closedR=.65*cue(1,1.5,2.4,3.1,t);f.lidCurve=-1;}
 return f;
}
export function applyExpression(p,mode,t,duration){
 const f=faceCue(mode,t,duration);p.closedL=f.closedL;p.closedR=f.closedR;p.lidCurve=f.lidCurve;p.mouthSmile=f.mouthSmile;
 p.eyeL*=f.aperture;p.eyeR*=f.aperture;p.headZ+=f.tilt;p.headX+=f.nod;
 p.gazeX+=(f.gazeX-p.gazeX)*f.gazeWeight;p.gazeY+=(f.gazeY-p.gazeY)*f.gazeWeight;
}
