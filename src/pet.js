import * as THREE from 'three';
import { loadCharacter, poseCharacter, footHeight } from './character.js';
import { createMotion, trigger, stepMotion, ACTIONS, setPerch } from './motion.mjs';
import { decorateIcons } from './icons.js';
import { createOrbit,rotateOrbit,zoomOrbit,resetOrbit,stepOrbit } from './orbit.mjs';
import { createProps } from './props.js';
import { dockAnchor } from './layout.mjs';
import { createInteractionState,chooseReaction,surfacePart } from './interactions.mjs';
import { beginGesture,moveGesture,gestureResult } from './gestures.mjs';
import whiteBytes from '../assets/models/white.glb';
import pinkBytes from '../assets/models/pink.glb';

const api=window.bay,canvas=document.querySelector('canvas'),bubble=document.querySelector('#bubble'),dock=document.querySelector('#pet-dock');
decorateIcons();
function showError(message){document.querySelector('#load-status').hidden=true;document.querySelector('#load-error').hidden=false;document.querySelector('#error-message').textContent=message;document.querySelector('#pet-dock').hidden=true;}
document.querySelector('#retry-load').onclick=()=>api.reloadPet();
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'}); }
catch { showError('三维显示暂时不可用，请重试或更新显卡驱动。');throw Error('WebGL unavailable'); }
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
let edgeMode=null,edgeVisible=null,edgeTransition=0,lastGeometry=0;
function updateEdge(side){if(side===edgeMode)return;edgeMode=side;document.body.classList.toggle('perched',!!side);setPerch(motion,side);if(side){const distance=orbit.targetDistance;resetOrbit(orbit);orbit.targetDistance=distance;}lastPose=null;edgeTransition=performance.now()+1400;if(side)say({left:'抓住左边啦。',right:'在右边偷偷看你。',top:'抓牢啦，探头看看你。',bottom:'趴在这里陪你。'}[side]);}
function inVisible(x,y){return !edgeVisible||(x>=edgeVisible.left&&x<=Math.min(innerWidth,edgeVisible.right)&&y>=edgeVisible.top&&y<=Math.min(innerHeight,edgeVisible.bottom));}
api.on('edge:changed',({side,visible})=>{updateEdge(side);edgeVisible=visible;canvas.style.clipPath=visible?`inset(${visible.top}px ${Math.max(0,innerWidth-visible.right)}px ${Math.max(0,innerHeight-visible.bottom)}px ${visible.left}px)`:'';});
let config={skin:'white',scale:1,autoMotion:true,eyeTracking:true,motionSpeed:1,motionIntensity:1},ready=false;
Promise.all([[whiteBytes,'white'],[pinkBytes,'pink']].map(async([bytes,name])=>{const c=await loadCharacter(bytes,name);models[name]=c;modelInfo[name]=c.info;root.add(c.group);})).then(()=>{ready=true;selectModel();document.querySelector('#load-status').hidden=true;dock.hidden=false;say('左键拖动搬家 · 右键拖动旋转\n轻点互动 · 滚轮缩放',7000);}).catch(error=>{showError('模型未能加载。点击重试，或重新打开桌宠。');console.error(error);});
function selectModel(){for(const [name,c]of Object.entries(models))c.group.visible=name===config.skin;}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.15)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.1,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.position.set(0,.20,.02);shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const hearts=[],heartShape=new THREE.Shape();heartShape.moveTo(0,.15);heartShape.bezierCurveTo(-.3,.42,-.55,.02,0,-.35);heartShape.bezierCurveTo(.55,.02,.3,.42,0,.15);
for(let i=0;i<6;i++){const h=new THREE.Mesh(new THREE.ShapeGeometry(heartShape),new THREE.MeshBasicMaterial({color:i%2?'#b6a8d1':'#e8a6b5',transparent:true,side:THREE.DoubleSide}));h.visible=false;scene.add(h);hearts.push(h);}
let pointer=null,dragging=false,lastFrame=0,ignore=null,cursor={x:0,y:0,near:false},lastStatus='',lastPose=null,lastLayout=0,layout=null,dockPosition=null;
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
function pick(x,y){if(!ready||!inVisible(x,y))return null;mouse.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(mouse,camera);return raycaster.intersectObjects([models[config.skin].group,...props.pickables()],true)[0]||null;}
function hit(x,y){return !!pick(x,y);}
function say(text,duration=4200){bubble.textContent=text;bubble.classList.remove('quiet');clearTimeout(say.timer);say.timer=setTimeout(()=>bubble.classList.add('quiet'),duration);}
const lines={stand:'站好啦。',sit:'找到小凳子啦，挪过去坐一会儿。',wave:'嗨，看这里～',jump:'一、二、三！',dance:'跟我一起摇一摇 ♫',stretch:'你也伸个懒腰呀。',spin:'转一圈。',sleep:'我眯一会儿。',tickle:'哈哈，有点痒！',happy:'开心分你一半。',curious:'嗯？',wink:'默契的眼神。',look:'左看看，右看看。',walk:'踏踏小碎步。',nod:'嗯嗯，听着呢。',shake:'摇摇头，放松一下。',bow:'谢谢你的陪伴。',balance:'看我站稳稳。',peek:'偷偷看一眼。',yawn:'哈——有一点困。',sigh:'呼，慢慢来。',bounce:'再跳一下！',eat:'一口糖葫芦，甜甜的。',ball:'把小球抛起来，再接住！',pinwheel:'呼——小风车转起来啦。',tennis:'来回挥几拍，接住小网球！',serve:'抛球，准备发球！',victory:'好球！这分给你。'};
function action(name){
  if(name==='reset-view'){resetOrbit(orbit);return;}
  if(name==='pet')say(['摸摸头，烦恼飞走～','嘿嘿，再摸一下嘛。','被你摸摸，开心加倍。'][Math.floor(Math.random()*3)]);
  else if(lines[name])say(lines[name],['tennis','serve'].includes(name)?900:4200);
  trigger(motion,name);
}
api.on('action',action);api.on('bubble',text=>say(text,7000));
function settings(state){const previous=config.nickname;config=state.settings;document.title=`${config.nickname} · 大湾鸡`;document.querySelector('#pet-name').textContent=config.nickname;document.querySelector('#load-status').textContent=`${config.nickname}正在醒来…`;if(previous&&previous!==config.nickname)say(`以后就叫我${config.nickname}啦。`);updateEdge(state.edge||null);if(ready)selectModel();}
api.on('state',settings);api.getState().then(settings);
function updateCursor(x,y){cursor={x:THREE.MathUtils.clamp((x-innerWidth/2)/(innerWidth*.65),-1,1),y:THREE.MathUtils.clamp((innerHeight*.44-y)/(innerHeight*.55),-1,1),near:x> -innerWidth*.4&&x<innerWidth*1.4&&y> -innerHeight*.3&&y<innerHeight*1.3};document.body.classList.toggle('near',x>0&&x<innerWidth&&y>0&&y<innerHeight);}
function updateHit(x,y){if(pointer||dragging)return;const inside=x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&inVisible(x,y);
  const ui=inside&&document.elementsFromPoint(x,y).some(el=>el.matches('button,nav,[data-interactive]'));
  const next=!(inside&&(ui||hit(x,y)));ignore=next;api.ignoreMouse(next);
}
api.on('cursor',({x,y})=>{updateCursor(x,y);updateHit(x,y);});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>api.action(b.dataset.action));
document.querySelector('#more-actions').onclick=()=>api.togglePanel();
document.querySelector('#reset-view').onclick=()=>action('reset-view');
const mover=document.querySelector('#move-pet');
let clickTimer;
mover.onpointerdown=e=>{if(e.button===0)press(e,true);};
window.addEventListener('pointermove',e=>{
  updateCursor(e.clientX,e.clientY);updateHit(e.clientX,e.clientY);
  canvas.style.cursor=pointer?.moved?'grabbing':hit(e.clientX,e.clientY)?'grab':'default';
  if(pointer){
    if(e.buttons===0)return finish(e,true);
    const change=moveGesture(pointer,e);if(!change)return;
    if(change.started){clearTimeout(clickTimer);if(edgeMode&&change.purpose==='rotate')api.leaveEdge();}
    if(change.moving){if(change.purpose==='move'){if(!dragging){dragging=true;api.dragStart({x:pointer.x,y:pointer.y});}}else{orbit.dragging=true;rotateOrbit(orbit,change.dx,change.dy);}}
  }
});
const facePoint=new THREE.Vector3(),faceVertex=new THREE.Vector3();
function pickedPart(selected){
  const attr=selected.object.geometry.attributes.position,face=selected.face;facePoint.set(0,0,0);
  if(face){for(const index of [face.a,face.b,face.c])facePoint.add(faceVertex.fromBufferAttribute(attr,index));facePoint.multiplyScalar(1/3);}else facePoint.copy(root.worldToLocal(selected.point.clone()));
  return surfacePart(facePoint,selected.object.userData.bodyPart);
}
function press(e,forceMove=false){
  if(pointer)return;const selected=forceMove?null:pick(e.clientX,e.clientY);if(!forceMove&&!selected)return;
  const gesture=beginGesture(e,forceMove);if(!gesture)return;e.preventDefault();canvas.focus({preventScroll:true});
  pointer={...gesture,element:e.currentTarget,propAction:selected?props.actionFor(selected.object):null,part:selected?pickedPart(selected):null};
  orbit.velocityX=orbit.velocityY=0;e.currentTarget.setPointerCapture(e.pointerId);ignore=false;api.ignoreMouse(false);
}
function finish(e,cancelled=false,rollback=false){
  if(!pointer||(e?.pointerId!==undefined&&e.pointerId!==pointer.id))return;
  const old=pointer,result=gestureResult(old,cancelled);pointer=null;orbit.dragging=false;
  if(cancelled)orbit.velocityX=orbit.velocityY=0;
  if(old.element.hasPointerCapture(old.id))old.element.releasePointerCapture(old.id);
  if(dragging){dragging=false;api.dragEnd({cancel:rollback});}
  if(result==='click'&&(old.part||old.propAction)){
    clearTimeout(clickTimer);clickTimer=setTimeout(()=>{let selected=old.propAction;if(selected==='sit'&&motion.posture==='sit')selected='stand';if(!selected)selected=chooseReaction(interaction,old.part,{sleeping:motion.mode==='sleep',current:motion.mode});api.action(selected);},350);
  }else if(result==='menu')api.openPanel('play');
  canvas.style.cursor='grab';ignore=null;
}
canvas.addEventListener('pointerdown',e=>press(e));
window.addEventListener('pointerup',e=>{if(pointer&&e.button===pointer.button)finish(e);});
window.addEventListener('pointercancel',e=>finish(e,true));
for(const el of[canvas,mover])el.addEventListener('lostpointercapture',e=>finish(e,true));
window.addEventListener('blur',()=>{clearTimeout(clickTimer);finish(null,true);});
api.on('drag:ended',()=>finish(null,true));
canvas.addEventListener('dblclick',e=>{clearTimeout(clickTimer);if(e.button===0&&hit(e.clientX,e.clientY))action('reset-view');});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();clearTimeout(clickTimer);finish(null,true);if(edgeMode)api.leaveEdge();showError('三维显示已中断，点击重新加载恢复。');});
canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)orbit.targetYaw+=e.deltaY*.004;else zoomOrbit(orbit,e.deltaY);},{passive:false});
canvas.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();clearTimeout(clickTimer);finish(null,true,true);return;}
  if(pointer)return;
  const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(arrows[e.key]){e.preventDefault();const[x,y]=arrows[e.key];if(e.altKey)rotateOrbit(orbit,x*16,y*16);else api.movePet(x*(e.shiftKey?40:10),y*(e.shiftKey?40:10));return;}
  if(['+','=','-','_'].includes(e.key)){e.preventDefault();zoomOrbit(orbit,['-','_'].includes(e.key)?100:-100);return;}
  const keys={'1':'stand','2':'sit','3':'dance','4':'jump','5':'wave','6':'sleep',' ':'pet'};
  if(!e.repeat&&keys[e.key]){e.preventDefault();api.action(keys[e.key]);}
  if(e.key==='Enter')api.openPanel('play');if(e.key.toLowerCase()==='r')action('reset-view');if(e.key==='F1'){e.preventDefault();api.openHelp();}
});
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
      if(edgeVisible){
        const r=edgeVisible,w=dock.offsetWidth,h=dock.offsetHeight;
        anchor.x=THREE.MathUtils.clamp((Math.max(r.left,bounds.left)+Math.min(r.right,bounds.right))/2,r.left+w/2+5,Math.min(innerWidth,r.right)-w/2-5);
        const top=Math.max(r.top,bounds.top),bottom=Math.min(r.bottom,bounds.bottom);
        anchor.y=edgeMode==='bottom'?Math.max(r.top+5,top-h-8):Math.max(r.top+5,Math.min(bottom+8,r.bottom-h-5));anchor.placement='edge';
      }
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
  const p=pointer?.moved&&lastPose&&ms>edgeTransition?lastPose:stepMotion(motion,dt,pointer?{...config,autoMotion:false}:config,tracking);lastPose=p;
  if(!motion.paused){const s=.88*config.scale;root.scale.x=damp(root.scale.x,s*(1+(1-p.scaleY)*.4),dt);root.scale.y=damp(root.scale.y,s*p.scaleY,dt);root.scale.z=damp(root.scale.z,s,dt);
    root.rotation.y=p.spin+(p.yaw||0);root.rotation.z=damp(root.rotation.z,p.sway+(p.edgeRoll||0),dt);
    if(ready)poseCharacter(models[config.skin],p,dt);
    const support=ready?footHeight(models[config.skin]):0;
    const pivot=1.55*s,roll=p.edgeRoll||0;
    root.position.set(damp(root.position.x,(p.x||0)+Math.sin(roll)*pivot,dt),damp(root.position.y,.22-support*s+p.y+(p.seatLift||0)*config.scale+(1-Math.cos(roll))*pivot,dt,18),damp(root.position.z,p.z||0,dt));
  }
  if(ready)props.update(models[config.skin],root,p,dt,motion.paused);
  const petting=motion.mode==='pet',t=motion.elapsed;
  hearts.forEach((h,i)=>{h.visible=petting&&t<2.4;if(h.visible){h.position.set((i-2.5)*.23+Math.sin(t*3+i)*.10,1.9+t*.55+i*.10,.9);h.scale.setScalar(.14+i*.02);h.material.opacity=Math.max(0,1-t/2.4);h.rotation.z=Math.sin(t*3+i)*.2;}});
  shadow.visible=!(p.edgeAmount>.05);shadow.scale.setScalar(config.scale*(1-p.y*.35));shadow.material.opacity=Math.max(0,Math.cos(orbit.pitch))*(1-p.y*.6);
  const status={edge:edgeMode,mode:motion.mode,posture:motion.posture,expression:motion.expression,paused:motion.paused},statusKey=JSON.stringify(status);
  if(statusKey!==lastStatus){lastStatus=statusKey;api.reportPet(status);document.querySelector('#pet-state').textContent=motion.paused?'暂停中':motion.mode==='idle'?(edgeMode?'趴边陪你':motion.posture==='sit'?'坐着陪你':'站着陪你'):(ACTIONS[motion.mode]||motion.expression);document.querySelector('#sleepy').hidden=motion.mode!=='sleep';}
  renderer.render(scene,camera);updateDock(ms,dt);
  window.inputDiagnostics={edge:edgeMode,visible:edgeVisible,active:!!pointer,dragging,purpose:pointer?.purpose||null,moved:!!pointer?.moved};
  const b=models[config.skin]?.bone;
  if(edgeMode&&b&&ms-lastGeometry>66){lastGeometry=ms;const hand=new THREE.Vector3(),other=new THREE.Vector3();b.armL.localToWorld(hand.set(-.50,-.22,.18));b.armR.localToWorld(other.set(.50,-.22,.18));hand.add(other).multiplyScalar(.5).project(camera);const anchor={x:(hand.x*.5+.5)*innerWidth,y:(-hand.y*.5+.5)*innerHeight};api.reportGeometry({side:edgeMode,ready:(p.edgeAmount||0)>.94,anchor});window.edgeAnchor=anchor;}
  window.petDiagnostics={ready,mode:motion.mode,posture:motion.posture,sleeping:motion.mode==='sleep',skin:config.skin,paused:motion.paused,expression:motion.expression,view:{yaw:orbit.yaw,pitch:orbit.pitch,distance:orbit.distance,perspective:camera.isPerspectiveCamera},gaze:[motion.gazeX,motion.gazeY],pose:lastPose,props:props.diagnostics(),interaction:{part:interaction.lastPart,action:interaction.lastAction},layout,dock:dockPosition,rig:b?{eyeL:b.eyeL.scale.y,eyeR:b.eyeR.scale.y,eyeYaw:b.eyeL.rotation.y,headYaw:b.head.rotation.y,hipsY:b.hips.position.y,legPitch:b.legL.rotation.x}:null,models:modelInfo,meshes:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
requestAnimationFrame(animate);
