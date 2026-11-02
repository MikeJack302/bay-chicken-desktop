const SIDES=['left','right','top','bottom'];
function nearestEdge(bounds,area,threshold=24){
  const distances={left:Math.abs(bounds.x-area.x),right:Math.abs(bounds.x+bounds.width-area.x-area.width),top:Math.abs(bounds.y-area.y),bottom:Math.abs(bounds.y+bounds.height-area.y-area.height)};
  const side=SIDES.reduce((a,b)=>distances[b]<distances[a]?b:a);
  return distances[side]<=threshold?side:null;
}
function dockPosition(bounds,area,side,anchor){
  let{x,y}=bounds;
  if(side==='left')x=area.x-anchor.x;
  if(side==='right')x=area.x+area.width-anchor.x;
  if(side==='top')y=area.y-anchor.y;
  if(side==='bottom')y=area.y+area.height-anchor.y;
  if(side==='left'||side==='right')y=Math.max(area.y,Math.min(area.y+Math.max(0,area.height-bounds.height),y));
  else x=Math.max(area.x,Math.min(area.x+Math.max(0,area.width-bounds.width),x));
  return{x:Math.round(x),y:Math.round(y)};
}
function visibleRect(bounds,area){return{left:Math.max(0,area.x-bounds.x),top:Math.max(0,area.y-bounds.y),right:Math.min(bounds.width,area.x+area.width-bounds.x),bottom:Math.min(bounds.height,area.y+area.height-bounds.y)};}
module.exports={SIDES,nearestEdge,dockPosition,visibleRect};
