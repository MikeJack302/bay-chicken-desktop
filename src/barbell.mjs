import * as THREE from 'three';
export const BARBELL_PROFILE=Object.freeze({length:3.22,radius:.49,plateCenters:[1.24,1.39]});
export function buildBarbell(){
  const g=new THREE.Group();g.name='blue-barbell';g.userData.action='barbell';
  const material=(color,roughness=.5,metalness=0)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.12});
  const steel=material('#b8c2c9',.28,.75),blue=material('#268dc4',.65),rim=material('#65bbdc',.55),hub=material('#126591',.5);
  function cylinder(name,r,height,mat,x){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,48),mat);m.name=name;m.rotation.z=Math.PI/2;m.position.x=x;g.add(m);return m;}
  cylinder('steel-bar',.024,BARBELL_PROFILE.length,steel,0);
  for(const side of[-1,1]){
    cylinder('bumper-plate',.49,.15,blue,side*1.24);cylinder('outer-plate',.47,.12,rim,side*1.38);
    cylinder('outer-face',.435,.016,blue,side*1.447);cylinder('hub',.09,.04,hub,side*1.47);
    cylinder('sleeve-collar',.06,.10,steel,side*1.1);
    for(let i=0;i<8;i++)cylinder('grip-knurl',.026,.012,hub,side*(.80+i*.025));
  }
  return g;
}
