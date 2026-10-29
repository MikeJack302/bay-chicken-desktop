import * as THREE from 'three';

const up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),mouth=new THREE.Vector3(),direction=new THREE.Vector3(),q=new THREE.Quaternion();
const clamp=THREE.MathUtils.clamp;
const mat=(color,roughness=.5)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:.12});
function mesh(parent,geometry,material,position=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);parent.add(m);return m;}
function cylinder(parent,r1,r2,h,material,position){return mesh(parent,new THREE.CylinderGeometry(r1,r2,h,24),material,position);}
function sphere(parent,r,material,position){return mesh(parent,new THREE.SphereGeometry(r,24,16),material,position);}
function fade(group,alpha){group.visible=alpha>.015;group.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=alpha;}});}

export function createProps(scene){
  const wood=mat('#b78b5e'),seatMat=mat('#d2ad7c'),rungMat=mat('#b18a61');
  const stool=new THREE.Group();stool.userData.action='sit';stool.name='small-wooden-stool';scene.add(stool);
  cylinder(stool,.43,.40,.08,seatMat,[0,.26,0]);
  cylinder(stool,.39,.37,.035,wood,[0,.205,0]);
  for(const x of [-1,1])for(const z of [-1,1]){
    const leg=cylinder(stool,.035,.045,.23,wood,[x*.25,.115,z*.25]);leg.rotation.z=-x*.09;leg.rotation.x=z*.09;
  }
  for(const z of [-.25,.25]){const rung=cylinder(stool,.014,.014,.50,rungMat,[0,.09,z]);rung.rotation.z=Math.PI/2;}
  for(const x of [-.25,.25]){const rung=cylinder(stool,.014,.014,.50,rungMat,[x,.09,0]);rung.rotation.x=Math.PI/2;}

  const candy=new THREE.Group();candy.userData.action='eat';candy.name='tanghulu';scene.add(candy);
  const stickMat=mat('#d4b18c'),sugar=new THREE.MeshPhysicalMaterial({color:'#c72b29',roughness:.16,clearcoat:1,clearcoatRoughness:.12});
  cylinder(candy,.012,.012,1.35,stickMat,[0,.075,0]);
  const berries=[];
  for(let i=0;i<3;i++){
    const berry=new THREE.Group();berry.position.y=.20+i*.22;candy.add(berry);sphere(berry,.125,sugar,[0,0,0]);
    const glint=mesh(berry,new THREE.SphereGeometry(.029,12,8),new THREE.MeshBasicMaterial({color:'#fff2df'}),[-.04,.055,.103]);glint.scale.set(1,.6,.24);berries.push(berry);
  }

  const ball=new THREE.Group();ball.userData.action='ball';ball.name='little-ball';scene.add(ball);
  const ballColors=['#efcc83','#f8f1dd','#9fbaa8','#f8f1dd','#d5a5ac','#f8f1dd'];
  for(let i=0;i<6;i++){const slice=new THREE.SphereGeometry(.19,12,16,i*Math.PI/3,Math.PI/3);mesh(ball,slice,mat(ballColors[i],.38));}

  const pinwheel=new THREE.Group();pinwheel.userData.action='pinwheel';pinwheel.name='little-pinwheel';scene.add(pinwheel);
  const stem=cylinder(pinwheel,.015,.015,Math.hypot(.74,.62),stickMat,[0,.25,.31]);stem.rotation.x=Math.atan2(.62,.74);
  const rotor=new THREE.Group();rotor.position.set(0,.62,.62);rotor.scale.setScalar(.9);pinwheel.add(rotor);
  const petal=new THREE.Shape();petal.moveTo(0,0);petal.bezierCurveTo(.03,.23,.23,.32,.28,.12);petal.quadraticCurveTo(.18,.02,0,0);
  for(let i=0;i<4;i++){const p=mesh(rotor,new THREE.ExtrudeGeometry(petal,{depth:.014,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.005,curveSegments:12}),mat(['#e8b09c','#afcbb3','#d0bfdc','#efd491'][i],.35));p.rotation.z=i*Math.PI/2;}
  sphere(rotor,.045,mat('#f8e8c9'),[0,0,.05]);
  const all=[stool,candy,ball,pinwheel];all.forEach(o=>{o.visible=false;o.traverse(m=>{if(m.material)m.material=m.material.clone();});});
  const pose={chair:0,eat:0,bites:0,ball:0,pinwheel:0};
  function update(character,root,p,dt,paused=false){
    Object.assign(pose,{chair:p.chair,eat:p.eat,bites:p.bites,ball:p.ball,pinwheel:p.pinwheel});
    root.updateMatrixWorld(true);const s=root.scale.x;
    fade(stool,clamp(p.chair,0,1));stool.position.set(-.52,.20,-.13);stool.scale.setScalar(s*(.82+.18*p.chair));
    fade(candy,clamp(p.eat,0,1));
    if(candy.visible){
      character.bone.armR.localToWorld(v.set(.52,-.22,.25));character.bone.head.localToWorld(mouth.set(0,.20,1.32));
      direction.subVectors(mouth,v).normalize();const bites=clamp(Math.floor(p.bites+.02),0,3);
      candy.position.copy(v);candy.quaternion.setFromUnitVectors(up,direction);candy.scale.setScalar(s);
      const slide=Math.max(0,v.distanceTo(mouth)-.64*s)+bites*.22*s;
      candy.position.addScaledVector(direction,slide);
      berries.forEach((b,i)=>{b.visible=i<3-bites;});
    }
    fade(ball,clamp(p.ball,0,1));
    if(ball.visible){
      const t=p.toyTime,throwWindow=Math.max(0,Math.min(1,(t-.65)/.4));
      const bounce=Math.abs(Math.sin(Math.max(0,t-.65)*3.8));
      root.localToWorld(v.set(.76,.23+bounce*.95*throwWindow,.72));ball.position.copy(v);ball.scale.setScalar(s);
      if(!paused){ball.rotation.x+=dt*3.4;ball.rotation.z+=dt*2;}
    }
    fade(pinwheel,clamp(p.pinwheel,0,1));
    if(pinwheel.visible){
      character.bone.armL.localToWorld(v.set(-.36,-.22,.12));pinwheel.position.copy(v);root.getWorldQuaternion(q);pinwheel.quaternion.copy(q);pinwheel.scale.setScalar(s);
      if(!paused)rotor.rotation.z+=dt*(4+Math.sin(p.toyTime*2)*2)*p.pinwheel;
    }
  }
  function pickables(){const result=[];function visit(o){if(!o.visible)return;if(o.isMesh)result.push(o);for(const c of o.children)visit(c);}all.forEach(visit);return result;}
  function actionFor(object){for(let o=object;o;o=o.parent)if(o.userData.action)return o.userData.action;return null;}
  return{all,update,pickables,actionFor,diagnostics:()=>({...pose,visible:all.filter(o=>o.visible).map(o=>o.name)})};
}
