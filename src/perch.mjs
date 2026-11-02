const ease=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*t*(t*(t*6-15)+10);};
export function perchPose(side,elapsed,clock,phase=0){
  const sideway=side==='left'||side==='right',sign=side==='left'?-1:1;
  const reach=1-ease(.12,.65,elapsed),u=Math.max(0,elapsed-.58),settle=Math.sin(u*10)*Math.exp(-u*4.5)*.018;
  // Head counters the body's lean, while the two paws carry unequal weight.
  const look=Math.sin(clock*.47+phase)*.028,rest=ease(0,.8,Math.sin(clock*.24+phase));
  const roll=sideway?sign*1.30:side==='top'?Math.PI:0;
  let armL=sideway?(sign<0?-1.30:0):-1.42;
  let armR=sideway?(sign>0?1.30:0):1.42;
  armL-=reach*.13;armR+=reach*.13;
  return{edgeRoll:roll,headZ:sideway?-sign*.65+look:look,
    torsoX:.34+rest*.035,headX:-.39-rest*.025,armL,armR,armLX:.27,armRX:.27,
    y:.22+settle,legL:-.32+Math.sin(clock*1.35+phase)*.065,legR:-.29+Math.sin(clock*1.1+phase+1.7)*.055,
    settle:elapsed<.65?'伸手抓稳':elapsed<1.35?'靠稳啦':'趴边陪你'};
}
