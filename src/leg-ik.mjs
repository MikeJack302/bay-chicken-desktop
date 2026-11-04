import * as THREE from 'three';
export const LEG_REST=Object.freeze({hipY:.52,hipZ:.01,knee:[0,-.22,.15],ankle:[0,-.16,-.05]});
export const UPPER_LENGTH=Math.hypot(.22,.15),LOWER_LENGTH=Math.hypot(.16,.05);
// Fixed segment lengths keep a small step from becoming a stretched ribbon.
export function solveLeg(hip,ankle,pole=new THREE.Vector3(0,0,1)){
  const direction=new THREE.Vector3().subVectors(ankle,hip),requested=direction.length();direction.normalize();
  const distance=THREE.MathUtils.clamp(requested,Math.abs(UPPER_LENGTH-LOWER_LENGTH)+1e-5,UPPER_LENGTH+LOWER_LENGTH-1e-5);
  const along=(UPPER_LENGTH**2-LOWER_LENGTH**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,UPPER_LENGTH**2-along**2));
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction));if(bend.lengthSq()<1e-8)bend.set(1,0,0).addScaledVector(direction,-direction.x);bend.normalize();
  return{knee:hip.clone().addScaledVector(direction,along).addScaledVector(bend,height),ankle:hip.clone().addScaledVector(direction,distance),reachable:Math.abs(distance-requested)<.0001};
}
