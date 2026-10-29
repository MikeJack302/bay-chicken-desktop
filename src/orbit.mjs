export function createOrbit(){return{yaw:0,pitch:.045,distance:7.8,targetYaw:0,targetPitch:.045,targetDistance:7.8,velocityX:0,velocityY:0,dragging:false};}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function rotateOrbit(v,dx,dy){v.targetYaw-=dx*.009;v.targetPitch=clamp(v.targetPitch+dy*.008,-1.25,1.35);v.velocityX=-dx*.009;v.velocityY=dy*.008;}
export function zoomOrbit(v,delta){v.targetDistance=clamp(v.targetDistance*Math.exp(delta*.001),5.5,11.5);}
export function resetOrbit(v){v.targetYaw=Math.round(v.targetYaw/(Math.PI*2))*Math.PI*2;v.targetPitch=.045;v.targetDistance=7.8;v.velocityX=v.velocityY=0;}
export function stepOrbit(v,dt){
  if(!v.dragging){v.targetYaw+=v.velocityX*dt*16;v.targetPitch=clamp(v.targetPitch+v.velocityY*dt*16,-1.25,1.35);v.velocityX*=Math.exp(-dt*10);v.velocityY*=Math.exp(-dt*10);}
  const a=1-Math.exp(-dt*(v.dragging?22:12));v.yaw+=(v.targetYaw-v.yaw)*a;v.pitch+=(v.targetPitch-v.pitch)*a;v.distance+=(v.targetDistance-v.distance)*a;
  return v;
}
