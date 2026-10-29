export const REACTIONS=Object.freeze({
  head:['pet','nod','happy','peek'],crown:['curious','shake','wink','look'],eyes:['wink','look','curious','happy'],
  belly:['tickle','happy','bounce','sigh'],hands:['wave','ball','pinwheel','eat','bow'],feet:['jump','walk','balance','bounce'],
  tail:['shake','spin','peek','wave'],back:['stretch','look','shake','sit'],
});
export const PART_LABELS={head:'脑袋',crown:'头顶水花',eyes:'眼睛',belly:'肚皮',hands:'小手',feet:'脚丫',tail:'尾巴',back:'后背'};
export function surfacePart({x,y,z},semantic='body'){
  if(['crown','eyes','back'].includes(semantic))return semantic;
  if(z<-.58&&y<1.25)return 'tail';
  if(y<.48)return 'feet';
  if(Math.abs(x)>.70&&y<1.18)return 'hands';
  if(z<-.25)return 'back';
  return y>1.32?'head':'belly';
}
export function createInteractionState(){return{last:{},lastPart:null,lastAction:null};}
export function chooseReaction(state,part,{sleeping=false,current='idle'}={},random=Math.random){
  const pool=REACTIONS[part]||REACTIONS.head;
  let action;
  if(sleeping&&['head','crown','eyes'].includes(part))action='pet';
  else {let choices=pool.filter(a=>a!==state.last[part]&&a!==current);if(!choices.length)choices=pool.filter(a=>a!==state.last[part]);action=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];}
  state.last[part]=action;state.lastPart=part;state.lastAction=action;return action;
}
