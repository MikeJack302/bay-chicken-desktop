function clampToArea(position,width,height,area){
  return{x:Math.round(Math.max(area.x,Math.min(area.x+Math.max(0,area.width-width),position.x))),y:Math.round(Math.max(area.y,Math.min(area.y+Math.max(0,area.height-height),position.y)))};
}
function dragPosition(origin,cursor,width,height,area){return clampToArea({x:origin.x+cursor.x-origin.cursor.x,y:origin.y+cursor.y-origin.cursor.y},width,height,area);}
module.exports={clampToArea,dragPosition};
