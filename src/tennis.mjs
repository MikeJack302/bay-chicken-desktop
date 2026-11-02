const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*u*(u*(u*6-15)+10);};
export function tennisSample(kind,t){
  const serve=kind===1,celebrate=kind===2;
  const hit=serve?3.1:1.8+Math.floor(Math.max(0,t-.8)/2.2)*2.2;
  const delta=t-hit;
  const swing=Math.exp(-Math.pow(delta/.23,2));
  const follow=Math.exp(-Math.pow((delta-.23)/.35,2));
  const prepare=Math.exp(-Math.pow((delta+.40)/.33,2));
  const windup=ease(-1.05,-.30,delta)*(1-ease(-.23,.10,delta));
  const stroke=ease(-.28,.28,delta),recovery=ease(.48,1.03,delta);
  return{hit,delta,swing,follow,prepare,windup,stroke,recovery,followThrough:ease(-.05,.32,delta)*(1-recovery),toss:serve&&t<3.1,celebrate,flight:clamp((delta+.85)/1.65),phase:celebrate?'庆祝':serve&&t<2.1?'抛球':serve&&t<2.8?'引拍蓄力':Math.abs(delta)<.17?'击球':delta<0?'侧身引拍':delta<.65?'顺势随挥':'回到准备位'};
}
