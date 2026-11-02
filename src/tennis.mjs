const clamp=x=>Math.max(0,Math.min(1,x));
export function tennisSample(kind,t){
  const serve=kind===1,celebrate=kind===2;
  const hit=serve?3.1:1.8+Math.floor(Math.max(0,t-.8)/2.2)*2.2;
  const delta=t-hit;
  const swing=Math.exp(-Math.pow(delta/.23,2));
  const follow=Math.exp(-Math.pow((delta-.23)/.35,2));
  const prepare=Math.exp(-Math.pow((delta+.40)/.33,2));
  return{hit,delta,swing,follow,prepare,toss:serve&&t<3.1,celebrate,flight:clamp((delta+.85)/1.65),phase:celebrate?'庆祝':serve&&t<3.1?'抛球':Math.abs(delta)<.22?'击球':delta<0?'准备接球':'追着球看'};
}
