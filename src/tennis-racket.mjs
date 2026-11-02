import * as THREE from 'three';

// A broad, thick tennis hoop and an open Y throat, rather than a long single shaft.
export const RACKET_PROFILE=Object.freeze({rx:.28,ry:.36,center:.78,beam:.028,gripLength:.30,ballRadius:.08,mains:16,crosses:19});
export function buildTennisRacket(){
  const group=new THREE.Group();group.name='tennis-racket';group.userData.action='tennis';
  const material=(color,roughness=.45)=>new THREE.MeshPhysicalMaterial({color,roughness,clearcoat:.22});
  const frame=material('#245e58'),trim=material('#b6d7b8'),grip=material('#303a3a',.9);
  function tube(points,radius,mat,name){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*3),radius,8,false),mat);mesh.name=name;group.add(mesh);return mesh;}
  const {rx,ry,center,beam}=RACKET_PROFILE,oval=[];
  for(let i=0;i<=80;i++){const a=i/80*Math.PI*2;oval.push([Math.cos(a)*rx,center+Math.sin(a)*ry,0]);}
  tube(oval,beam,frame,'thick-oval-frame');
  for(const sign of[-1,1]){
    tube([[0,.19,0],[sign*.045,.30,0],[sign*.15,.477,0]],.023,frame,`open-y-throat-${sign}`);
    const accent=[];for(let i=0;i<=12;i++){const a=(sign<0?Math.PI:0)-.35+i/12*.70;accent.push([Math.cos(a)*rx,center+Math.sin(a)*ry,.002]);}tube(accent,.029,trim,'frame-accent');
  }
  tube([[-.15,.477,0],[0,.438,0],[.15,.477,0]],.017,frame,'throat-bridge');
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.042,.047,.30,8),grip);handle.position.y=.05;handle.name='octagonal-grip';group.add(handle);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,.025,8),trim);cap.position.y=-.105;group.add(cap);
  const wrap=[];for(let i=0;i<=160;i++){const t=i/160,a=t*Math.PI*2*6;wrap.push([Math.cos(a)*.045,-.085+t*.27,Math.sin(a)*.045]);}tube(wrap,.003,material('#697c78',.9),'grip-wrap');
  const strings=[];
  for(let i=0;i<RACKET_PROFILE.mains;i++){const x=(i/(RACKET_PROFILE.mains-1)*2-1)*rx*.91,y=ry*Math.sqrt(1-(x/rx)**2);strings.push(x,center-y,.006,x,center+y,.006);}
  for(let i=0;i<RACKET_PROFILE.crosses;i++){const y=(i/(RACKET_PROFILE.crosses-1)*2-1)*ry*.94,x=rx*Math.sqrt(1-(y/ry)**2);strings.push(-x,center+y,.007,x,center+y,.007);}
  const bed=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(strings,3)),new THREE.LineBasicMaterial({color:'#e3e8c9'}));bed.name='16x19-string-bed';group.add(bed);
  return group;
}
