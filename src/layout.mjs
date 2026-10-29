const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function dockAnchor(bounds,viewport,dock={width:130,height:48}){
  const w=viewport.width,h=viewport.height,margin=5,gap=8;
  const x=clamp((bounds.left+bounds.right)/2,dock.width/2+margin,w-dock.width/2-margin);
  const limit=h-dock.height-margin;
  let y=Math.min(bounds.bottom+gap,limit),placement=limit>=bounds.bottom?'below':'overlay';
  return{x,y:clamp(y,margin,Math.max(margin,h-dock.height-margin)),placement};
}
