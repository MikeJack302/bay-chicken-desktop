import * as THREE from 'three';
import { loadCharacter, poseCharacter, footHeight } from './character.js';
import { createMotion, trigger, stepMotion, ACTIONS } from './motion.mjs';
import { decorateIcons } from './icons.js';
import { createOrbit,rotateOrbit,zoomOrbit,resetOrbit,stepOrbit } from './orbit.mjs';
import { createProps } from './props.js';
import { dockAnchor } from './layout.mjs';
import { createInteractionState,chooseReaction,surfacePart } from './interactions.mjs';
import whiteBytes from '../assets/models/white.glb';
import pinkBytes from '../assets/models/pink.glb';

const api=window.bay,canvas=document.querySelector('canvas'),bubble=document.querySelector('#bubble'),dock=document.querySelector('#pet-dock');
decorateIcons();
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'}); }
catch { bubble.textContent='三维渲染不可用，请更新显卡驱动后重启。';throw Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight,false);renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const scene=new THREE.Scene(),aspect=innerWidth/innerHeight;
const camera=new THREE.PerspectiveCamera(32,aspect,.1,40),orbit=createOrbit();
const cameraTarget=new THREE.Vector3(0,1.75,0);
camera.position.set(0,2.1,7.8);camera.lookAt(cameraTarget);
scene.add(new THREE.HemisphereLight(0xffffff,0xa4adb2,2.2));
const key=new THREE.DirectionalLight(0xfff7ee,2.6);key.position.set(-3,5,5);scene.add(key);
const fill=new THREE.DirectionalLight(0xe3eeff,1.3);fill.position.set(4,2,3);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.8);rim.position.set(0,4,-4);scene.add(rim);
const root=new THREE.Group();scene.add(root);
const models={},modelInfo={},motion=createMotion(),props=createProps(scene),interaction=createInteractionState();
const viewport={width:innerWidth,height:innerHeight,dpr:Math.min(devicePixelRatio,1.75)};
function resizeScene(){const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio,1.75);if(w<1||h<1)return;viewport.width=w;viewport.height=h;viewport.dpr=dpr;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastLayout=0;dockPosition=null;}
new ResizeObserver(resizeScene).observe(document.documentElement);window.addEventListener('resize',resizeScene);
function watchDpi(){matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change',()=>{resizeScene();watchDpi();},{once:true});}watchDpi();
let config={skin:'white',scale:1,autoMotion:true,eyeTracking:true,motionSpeed:1,motionIntensity:1},ready=false;
Promise.all([[whiteBytes,'white'],[pinkBytes,'pink']].map(async([bytes,name])=>{const c=await loadCharacter(bytes,name);models[name]=c;modelInfo[name]=c.info;root.add(c.group);})).then(()=>{ready=true;selectModel();}).catch(error=>{say('模型加载失败，请重新打开桌宠。',60000);console.error(error);});
function selectModel(){for(const [name,c]of Object.entries(models))c.group.visible=name===config.skin;}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.15)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.1,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.position.set(0,.20,.02);shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const hearts=[],heartShape=new THREE.Shape();heartShape.moveTo(0,.15);heartShape.bezierCurveTo(-.3,.42,-.55,.02,0,-.35);heartShape.bezierCurveTo(.55,.02,.3,.42,0,.15);
for(let i=0;i<6;i++){const h=new THREE.Mesh(new THREE.ShapeGeometry(heartShape),new THREE.MeshBasicMaterial({color:i%2?'#b6a8d1':'#e8a6b5',transparent:true,side:THREE.DoubleSide}));h.visible=false;scene.add(h);hearts.push(h);}
let pointer=null,dragging=false,lastFrame=0,ignore=null,cursor={x:0,y:0,near:false},lastStatus='',lastPose=null,lastLayout=0,layout=null,dockPosition=null;
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
function pick(x,y){if(!ready)return null;mouse.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.intersectObjects([models[config.skin].group,...props.pickables()],true)[0]||null;}
function hit(x,y){return !!pick(x,y);}
function say(text,duration=4200){bubble.textContent=text;bubble.classList.remove('quiet');clearTimeout(say.timer);say.timer=setTimeout(()=>bubble.classList.add('quiet'),duration);}
const lines={stand:'站好啦。',sit:'找到小凳子啦，挪过去坐一会儿。',wave:'嗨，看这里～',jump:'一、二、三！',dance:'跟我一起摇一摇 ♫',stretch:'你也伸个懒腰呀。',spin:'转一圈。',sleep:'我眯一会儿。',tickle:'哈哈，有点痒！',happy:'开心分你一半。',curious:'嗯？',wink:'默契的眼神。',look:'左看看，右看看。',walk:'踏踏小碎步。',nod:'嗯嗯，听着呢。',shake:'摇摇头，放松一下。',bow:'谢谢你的陪伴。',balance:'看我站稳稳。',peek:'偷偷看一眼。',yawn:'哈——有一点困。',sigh:'呼，慢慢来。',bounce:'再跳一下！',eat:'一口糖葫芦，甜甜的。',ball:'把小球抛起来，再接住！',pinwheel:'呼——小风车转起来啦。'};
function action(name){
  if(name==='reset-view'){resetOrbit(orbit);return;}
  if(name==='pet')say(['摸摸头，烦恼飞走～','嘿嘿，再摸一下嘛。','被你摸摸，开心加倍。'][Math.floor(Math.random()*3)]);
  else if(lines[name])say(lines[name]);
  trigger(motion,name);
}
api.on('action',action);api.on('bubble',text=>say(text,7000));
function settings(state){config=state.settings;if(ready)selectModel();}
api.on('state',settings);api.getState().then(settings);say('拖动转一转，看看我的另一面。',3800);
function updateCursor(x,y){cursor={x:THREE.MathUtils.clamp((x-innerWidth/2)/(innerWidth*.65),-1,1),y:THREE.MathUtils.clamp((innerHeight*.44-y)/(innerHeight*.55),-1,1),near:x> -innerWidth*.4&&x<innerWidth*1.4&&y> -innerHeight*.3&&y<innerHeight*1.3};document.body.classList.toggle('near',x>0&&x<innerWidth&&y>0&&y<innerHeight);}
function updateHit(x,y){if(pointer)return;const inside=x>=0&&y>=0&&x<innerWidth&&y<innerHeight;
  const ui=inside&&document.elementsFromPoint(x,y).some(el=>el.matches('button,nav,[data-interactive]'));
  const next=!(inside&&(ui||hit(x,y)));ignore=next;api.ignoreMouse(next);
}
api.on('cursor',({x,y})=>{updateCursor(x,y);updateHit(x,y);});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>api.action(b.dataset.action));
document.querySelector('#more-actions').onclick=()=>api.togglePanel();
document.querySelector('#reset-view').onclick=()=>action('reset-view');
const mover=document.querySelector('#move-pet');
mover.onpointerdown=e=>{e.preventDefault();mover.setPointerCapture(e.pointerId);api.ignoreMouse(false);api.dragStart();dragging=true;};
function endMove(){if(dragging&&!pointer){dragging=false;api.dragEnd();}}
mover.onpointerup=endMove;mover.onpointercancel=endMove;mover.onlostpointercapture=endMove;
window.addEventListener('pointermove',e=>{
  updateCursor(e.clientX,e.clientY);updateHit(e.clientX,e.clientY);
  canvas.style.cursor=hit(e.clientX,e.clientY)?(pointer?'grabbing':'grab'):'default';
  if(pointer){const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;
    if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>4)pointer.moved=true;
    if(pointer.moved){if(pointer.moveWindow){if(!dragging){dragging=true;api.dragStart();}}else{orbit.dragging=true;rotateOrbit(orbit,dx,dy);}}
  }
});
const facePoint=new THREE.Vector3(),faceVertex=new THREE.Vector3();
function pickedPart(selected){
  const attr=selected.object.geometry.attributes.position,face=selected.face;facePoint.set(0,0,0);
  if(face){for(const index of [face.a,face.b,face.c])facePoint.add(faceVertex.fromBufferAttribute(attr,index));facePoint.multiplyScalar(1/3);}else facePoint.copy(root.worldToLocal(selected.point.clone()));
  return surfacePart(facePoint,selected.object.userData.bodyPart);
}
canvas.addEventListener('pointerdown',e=>{const selected=pick(e.clientX,e.clientY);if(!selected)return;pointer={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,button:e.button,moveWindow:e.shiftKey||e.button===1,propAction:props.actionFor(selected.object),part:pickedPart(selected)};orbit.velocityX=orbit.velocityY=0;canvas.setPointerCapture(e.pointerId);api.ignoreMouse(false);});
function release(e){if(!pointer)return;const old=pointer;pointer=null;orbit.dragging=false;if(dragging){dragging=false;api.dragEnd();}if(e?.type!=='pointercancel'&&!old.moved){if(old.button===0){let selected=old.propAction;if(selected==='sit'&&motion.posture==='sit')selected='stand';if(!selected)selected=chooseReaction(interaction,old.part,{sleeping:motion.mode==='sleep',current:motion.mode});api.action(selected);}else if(old.button===2)api.openPanel('play');}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);window.addEventListener('blur',()=>{pointer=null;orbit.dragging=false;dragging=false;api.dragEnd();});
canvas.addEventListener('dblclick',e=>{if(hit(e.clientX,e.clientY))action('reset-view');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)orbit.targetYaw+=e.deltaY*.004;else zoomOrbit(orbit,e.deltaY);},{passive:false});
canvas.addEventListener('keydown',e=>{const keys={'1':'stand','2':'sit','3':'dance','4':'jump','5':'wave','6':'sleep',' ':'pet'};if(keys[e.key]){e.preventDefault();api.action(keys[e.key]);}if(e.key==='Enter')api.openPanel('play');if(e.key==='Escape'||e.key==='r')action('reset-view');});
const damp=(a,b,dt,speed=10)=>THREE.MathUtils.lerp(a,b,1-Math.exp(-dt*speed));
const screenPoint=new THREE.Vector3();
function updateDock(ms,dt){
  if(!ready)return;
  if(ms-lastLayout>90){
    lastLayout=ms;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    function include(mesh,index){mesh.getVertexPosition(index,screenPoint);screenPoint.applyMatrix4(mesh.matrixWorld).project(camera);if(screenPoint.z>1)return;const x=(screenPoint.x*.5+.5)*innerWidth,y=(-screenPoint.y*.5+.5)*innerHeight;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    for(const sample of models[config.skin].screenSamples)include(sample.mesh,sample.index);
    for(const mesh of props.pickables()){const count=mesh.geometry.attributes.position.count;for(let i=0;i<count;i+=8)include(mesh,i);}
    if(Number.isFinite(left)){
      const bounds={left:Math.max(0,left),right:Math.min(innerWidth,right),top:Math.max(0,top),bottom:Math.min(innerHeight,bottom)};
      const anchor=dockAnchor(bounds,{width:innerWidth,height:innerHeight},{width:dock.offsetWidth,height:dock.offsetHeight});
      layout={bounds,anchor,viewport:{...viewport},canvas:{width:canvas.clientWidth,height:canvas.clientHeight,pixelsX:canvas.width,pixelsY:canvas.height}};
    }
  }
  if(layout&&!dragging){
    const a=layout.anchor;dockPosition=dockPosition?{x:damp(dockPosition.x,a.x,dt,18),y:damp(dockPosition.y,a.y,dt,18)}:{x:a.x,y:a.y};
    dock.style.left=`${dockPosition.x}px`;dock.style.top=`${dockPosition.y}px`;
  }
}
function animate(ms){requestAnimationFrame(animate);if(ms-lastFrame<32)return;const dt=Math.min(.08,(ms-lastFrame)/1000);lastFrame=ms;
  stepOrbit(orbit,dt);const distance=orbit.distance*Math.max(1,config.scale*.93);
  camera.position.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch)*distance,Math.sin(orbit.pitch)*distance,Math.cos(orbit.yaw)*Math.cos(orbit.pitch)*distance).add(cameraTarget);camera.lookAt(cameraTarget);
  const tracking={...cursor,near:cursor.near&&!pointer&&Math.cos(orbit.yaw)>.2};
  const p=stepMotion(motion,dt,pointer?{...config,autoMotion:false}:config,tracking);lastPose=p;
  if(!motion.paused){const s=.88*config.scale;root.scale.x=damp(root.scale.x,s*(1+(1-p.scaleY)*.4),dt);root.scale.y=damp(root.scale.y,s*p.scaleY,dt);root.scale.z=damp(root.scale.z,s,dt);
    root.rotation.y=p.spin+(p.yaw||0);root.rotation.z=damp(root.rotation.z,p.sway,dt);
    if(ready)poseCharacter(models[config.skin],p,dt);
    const support=ready?footHeight(models[config.skin]):0;
    root.position.set(damp(root.position.x,p.x||0,dt),damp(root.position.y,.22-support*s+p.y+(p.seatLift||0)*config.scale,dt,18),damp(root.position.z,p.z||0,dt));
  }
  if(ready)props.update(models[config.skin],root,p,dt,motion.paused);
  const petting=motion.mode==='pet',t=motion.elapsed;
  hearts.forEach((h,i)=>{h.visible=petting&&t<2.4;if(h.visible){h.position.set((i-2.5)*.23+Math.sin(t*3+i)*.10,1.9+t*.55+i*.10,.9);h.scale.setScalar(.14+i*.02);h.material.opacity=Math.max(0,1-t/2.4);h.rotation.z=Math.sin(t*3+i)*.2;}});
  shadow.scale.setScalar(config.scale*(1-p.y*.35));shadow.material.opacity=Math.max(0,Math.cos(orbit.pitch))*(1-p.y*.6);
  const status={mode:motion.mode,posture:motion.posture,expression:motion.expression,paused:motion.paused},statusKey=JSON.stringify(status);
  if(statusKey!==lastStatus){lastStatus=statusKey;api.reportPet(status);document.querySelector('#pet-state').textContent=motion.paused?'暂停中':motion.mode==='idle'?(motion.posture==='sit'?'坐着陪你':'站着陪你'):(ACTIONS[motion.mode]||motion.expression);document.querySelector('#sleepy').hidden=motion.mode!=='sleep';}
  renderer.render(scene,camera);updateDock(ms,dt);
  const b=models[config.skin]?.bone;
  window.petDiagnostics={ready,mode:motion.mode,posture:motion.posture,sleeping:motion.mode==='sleep',skin:config.skin,paused:motion.paused,expression:motion.expression,view:{yaw:orbit.yaw,pitch:orbit.pitch,distance:orbit.distance,perspective:camera.isPerspectiveCamera},gaze:[motion.gazeX,motion.gazeY],pose:lastPose,props:props.diagnostics(),interaction:{part:interaction.lastPart,action:interaction.lastAction},layout,dock:dockPosition,rig:b?{eyeL:b.eyeL.scale.y,eyeR:b.eyeR.scale.y,eyeYaw:b.eyeL.rotation.y,headYaw:b.head.rotation.y,hipsY:b.hips.position.y,legPitch:b.legL.rotation.x}:null,models:modelInfo,meshes:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
requestAnimationFrame(animate);
