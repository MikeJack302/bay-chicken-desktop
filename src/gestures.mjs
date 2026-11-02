export const DRAG_THRESHOLD=6;
export function beginGesture(e,forceMove=false){
  if(![0,1,2].includes(e.button))return null;
  return{id:e.pointerId,button:e.button,purpose:forceMove||e.button!==2?'move':'rotate',x:e.screenX,y:e.screenY,lastX:e.screenX,lastY:e.screenY,moved:false};
}
export function moveGesture(g,e){
  if(e.pointerId!==g.id)return null;
  const dx=e.screenX-g.lastX,dy=e.screenY-g.lastY;g.lastX=e.screenX;g.lastY=e.screenY;
  const started=!g.moved&&Math.hypot(e.screenX-g.x,e.screenY-g.y)>=DRAG_THRESHOLD;
  if(started)g.moved=true;
  return{started,purpose:g.purpose,dx,dy,moving:g.moved};
}
export function gestureResult(g,cancelled=false){return cancelled?'cancel':g.moved?g.purpose:g.button===0?'click':g.button===2?'menu':'none';}
