import * as THREE from 'three';
import './style.css';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b2835');
scene.fog = new THREE.FogExp2('#1b2835', 0.012);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 420);
camera.position.set(0, 2.8, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.querySelector('#game').prepend(renderer.domElement);

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const chapters = [
  { title:'Denial', kicker:'CHAPTER I · THE VEIL', copy:'The world has not disappeared. It has become difficult to look at directly.', fog:'#9ba9ad', density:.022, sky:'#344655', ground:'#59646a', accent:'#c3c9c2', light:'#b9c9cc', mood:'veil' },
  { title:'Anger', kicker:'CHAPTER II · THE THING IN THE WOODS', copy:'The shape looks like a threat from far away. Get close enough to see what it is guarding.', fog:'#6d4844', density:.014, sky:'#34252b', ground:'#473c3d', accent:'#df8b61', light:'#f08a5c', mood:'anger' },
  { title:'Bargaining', kicker:'CHAPTER III · THE THREAD', copy:'Every path offers a different version of the past. None of them can be walked backwards.', fog:'#75827c', density:.013, sky:'#45565a', ground:'#59675e', accent:'#d6c18d', light:'#e4c58c', mood:'thread' },
  { title:'Depression', kicker:'CHAPTER IV · THE LOW PLACE', copy:'The quiet is heavy, but it is not proof that nothing is growing.', fog:'#52687b', density:.025, sky:'#1d2c3b', ground:'#354958', accent:'#9fb8c6', light:'#a5c0d0', mood:'quiet' },
  { title:'Acceptance', kicker:'CHAPTER V · THE OPENING', copy:'The light does not replace what was lost. It shows you where you can go while carrying it.', fog:'#9b9a82', density:.008, sky:'#b0a18a', ground:'#718071', accent:'#f0d7a6', light:'#ffe1a8', mood:'open' }
];

let activeChapter = 0, paused = false, playerSpeed = 0, walkPhase = 0, noteTimeout;
const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 0);
const keys = {};
let yaw = 0, pitch = 0.12, dragging = false, lastPointer = {x:0,y:0};
const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();

const mat = (color, roughness=.85, metalness=0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
const mats = {
  coat: mat('#303a43'), coatDark: mat('#1c252d'), cloth: mat('#4a5155'),
  skin: mat('#b18d73'), hair: mat('#211f20'), boots: mat('#171b20'),
  stone: mat('#5d6260'), bark: mat('#3c3430'), leaf: mat('#43544b'),
  gold: new THREE.MeshStandardMaterial({color:'#d5b77d', roughness:.4, metalness:.35}),
};

function addMesh(parent, geometry, material, position, cast=true, receive=true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  parent.add(mesh); return mesh;
}

// A human-scale, understated third-person traveller. Separate limbs allow a walk cycle.
function makePerson() {
  const g = new THREE.Group();
  const torso = addMesh(g, new THREE.CapsuleGeometry(.34,.72,6,10), mats.coat, [0,1.2,0]);
  torso.scale.set(1,.92,.72);
  addMesh(g, new THREE.BoxGeometry(.5,.18,.38), mats.coatDark, [0,1.78,0]);
  const backpack = addMesh(g, new THREE.BoxGeometry(.42,.52,.22), mat('#27323b'), [0,1.38,.25]);
  backpack.rotation.x=-.06;
  addMesh(g, new THREE.CylinderGeometry(.12,.14,.18,10), mats.skin, [0,1.82,0]);
  const head = new THREE.Group(); g.add(head); head.position.set(0,2.02,0);
  addMesh(head, new THREE.SphereGeometry(.22,18,14), mats.skin, [0,0,0]);
  const hair = addMesh(head, new THREE.SphereGeometry(.225,16,12,0,Math.PI*2,0,Math.PI*.62), mats.hair, [0,.07,-.025]);
  hair.scale.set(1.02,.9,1.02);
  const arms=[], legs=[];
  for (const sign of [-1,1]) {
    const armPivot=new THREE.Group();armPivot.position.set(sign*.39,1.65,0);g.add(armPivot);
    const arm=addMesh(armPivot,new THREE.CapsuleGeometry(.105,.48,5,8),mats.coat,[0,-.32,0]);arm.rotation.z=sign*.09;
    addMesh(armPivot,new THREE.SphereGeometry(.105,10,8),mats.skin,[0,-.64,-.005]);
    arms.push(armPivot);
    const legPivot=new THREE.Group();legPivot.position.set(sign*.18,.62,0);g.add(legPivot);
    addMesh(legPivot,new THREE.CapsuleGeometry(.14,.48,5,8),mats.coatDark,[0,-.28,0]);
    addMesh(legPivot,new THREE.BoxGeometry(.27,.14,.48),mats.boots,[0,-.58,-.09]);
    legs.push(legPivot);
  }
  g.userData={arms,legs,head,torso};
  return g;
}
const avatar=makePerson(); player.add(avatar); avatar.position.z=.2;

// Lights and sky dome
const hemi = new THREE.HemisphereLight('#d9e0df','#252d32',1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#f5e8d2',2.2); sun.position.set(-12,22,-10); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-28; sun.shadow.camera.right=28; sun.shadow.camera.top=28; sun.shadow.camera.bottom=-28; scene.add(sun);
const fill = new THREE.PointLight('#a8c5d1',35,40); fill.position.set(0,5,-12); scene.add(fill);

const ground = addMesh(world,new THREE.PlaneGeometry(180,520,1,1),mat('#59646a'),[0,-.12,-210],false,true);
ground.rotation.x=-Math.PI/2;

const terrainGroup = new THREE.Group(); world.add(terrainGroup);
const props = new THREE.Group(); world.add(props);
const landmarks = new THREE.Group(); world.add(landmarks);
const dust = new THREE.Group(); world.add(dust);

function seeded(n){const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function makeRock(x,y,z,scale,color='#646763'){
 const geo=new THREE.DodecahedronGeometry(1,1); const m=addMesh(props,geo,mat(color),[x,y,z]);m.scale.set(scale*.8,scale*.65,scale);m.rotation.set(seeded(z)*.7,seeded(x)*3,seeded(z+x)*.4);return m;
}
function makeTree(x,z,scale,dead=false){
 const tree=new THREE.Group();tree.position.set(x,0,z);props.add(tree);
 const bark=mat(dead?'#302b2b':'#403a32');
 const trunk=addMesh(tree,new THREE.CylinderGeometry(.12*scale,.22*scale,2.7*scale,7),bark,[0,1.35*scale,0]);
 trunk.rotation.z=(seeded(x+z)-.5)*.22;
 if(!dead){
  for(let i=0;i<5;i++){const y=(1.5+i*.34)*scale;const branch=addMesh(tree,new THREE.CylinderGeometry(.035*scale,.09*scale,1.1*scale,5),bark,[(seeded(i+x)*.5-.25)*scale,y,-.04]);branch.rotation.z=(i%2?-.8:.8);const crown=addMesh(tree,new THREE.IcosahedronGeometry(.55*scale,1),mat(i%2?'#48584c':'#566458'),[(seeded(i+z)-.5)*.8*scale,y+.45*scale,0]);crown.scale.set(1.1,.8,.9);}
 }else{
  for(let i=0;i<4;i++){const b=addMesh(tree,new THREE.CylinderGeometry(.025*scale,.075*scale,1.45*scale,5),bark,[0,(2+i*.3)*scale,0]);b.rotation.z=(i%2?-.9:.9);}
 }
 return tree;
}
function makeLantern(x,z){
 const g=new THREE.Group();g.position.set(x,1.2,z);props.add(g);
 addMesh(g,new THREE.BoxGeometry(.35,.48,.3),mat('#3b3830',.4,.45),[0,0,0]);
 const glow=addMesh(g,new THREE.SphereGeometry(.12,12,10),new THREE.MeshBasicMaterial({color:'#ffdc9a'}),[0,0,0]);
 const light=new THREE.PointLight('#ffd59a',12,8);light.position.set(0,0,0);g.add(light);
 const top=addMesh(g,new THREE.ConeGeometry(.25,.2,4),mat('#302e2b'),[0,.34,0]);top.rotation.y=Math.PI/4;
 return g;
}

// Text is drawn into weathered canvas textures and placed on actual objects in the scene.
function inscriptionTexture(lines, tint='#e5d7bb'){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');
 x.clearRect(0,0,c.width,c.height);
 x.fillStyle='rgba(20,24,25,.18)';x.fillRect(0,0,c.width,c.height);
 x.font='italic 43px Georgia';x.fillStyle=tint;x.globalAlpha=.88;
 x.shadowColor='#111';x.shadowBlur=8;x.fillText(lines,28,142);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function makeInscription(text,x,y,z,rotation=0,tint){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.05),new THREE.MeshBasicMaterial({map:inscriptionTexture(text,tint),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 m.position.set(x,y,z);m.rotation.y=rotation;props.add(m);return m;
}

// Build five distinct spaces with a continuous walkable route.
function buildWorld(){
 for(let i=0;i<5;i++){
  const start=-i*82-20, mood=chapters[i].mood;
  for(let j=0;j<30;j++){
   const z=start-j*2.65, side=seeded(i*100+j)*2-1, x=side*(5+seeded(j+33)*9);
   if(mood==='quiet') makeRock(x,.15,z,.5+seeded(j)*1.3,'#43515a');
   else if(mood==='anger') makeRock(x,.1,z,.7+seeded(j)*1.5,'#514443');
   else if(mood==='open') makeRock(x,.1,z,.4+seeded(j)*1.2,'#778173');
   else makeRock(x,.1,z,.45+seeded(j)*1.3,'#626a68');
  }
  for(let j=0;j<18;j++){
   const z=start-j*4.2, side=j%2?1:-1, x=side*(6+seeded(i*50+j)*6);
   makeTree(x,z,.8+seeded(j+i)*1.3,mood==='quiet'||mood==='anger');
  }
  if(i===0){
   // The veiled glass: a fractured reflective plane in the fog.
   const mirror=addMesh(landmarks,new THREE.BoxGeometry(3.3,4.4,.16),new THREE.MeshPhysicalMaterial({color:'#aab8b9',metalness:.72,roughness:.2,transparent:true,opacity:.48}),[-3,2.2,start-28]);mirror.rotation.y=.32;mirror.rotation.z=.04;
   makeInscription('I can look when I am ready.',-5.2,4.9,start-28,.32,'#dbe3df');
  }
  if(i===1){
   // The beast is built as a heavy, grounded silhouette, not a cartoon monster.
   const beast=new THREE.Group();beast.position.set(3,0,start-31);landmarks.add(beast);
   const hide=mat('#211d20',.96), ember=new THREE.MeshStandardMaterial({color:'#b95f45',emissive:'#6f2419',emissiveIntensity:1.6});
   const body=addMesh(beast,new THREE.SphereGeometry(1.1,24,18),hide,[0,1.4,0]);body.scale.set(1.2,1.15,.72);
   addMesh(beast,new THREE.SphereGeometry(.58,20,16),hide,[0,2.35,-.05]).scale.set(.9,1.1,.8);
   for(const s of [-1,1]){
    const horn=addMesh(beast,new THREE.ConeGeometry(.22,1.15,8),hide,[s*.48,3.08,-.02]);horn.rotation.z=-s*.38;horn.rotation.x=.12;
    const eye=addMesh(beast,new THREE.SphereGeometry(.055,10,8),ember,[s*.2,2.4,-.55]);
    const claw=addMesh(beast,new THREE.ConeGeometry(.16,.55,7),hide,[s*.92,.65,-.2]);claw.rotation.z=Math.PI;
   }
   const glow=new THREE.PointLight('#c15a3f',16,9);glow.position.set(0,2,-1);beast.add(glow);
   makeInscription('It is guarding something tender.',-1.5,4.4,start-31,-.1,'#e7ad91');
  }
  if(i===2){
   // Threads converge at a small, suspended knot: choices held together by regret.
   for(let k=0;k<5;k++){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-7+k*3.5,1.2,start-8),new THREE.Vector3(-4+k*1.7,3.4,start-22),new THREE.Vector3(0,2.6,start-40),new THREE.Vector3(4-k*1.7,3.2,start-58)]);
    const tube=addMesh(landmarks,new THREE.TubeGeometry(curve,48,.018,5,false),mats.gold,[0,0,0],false);
   }
   makeInscription('A different ending is not the same as a different past.',-5,5,start-37,.18,'#e6d5a9');
  }
  if(i===3){
   // Still water: a dark, low plane with scattered rings.
   const water=addMesh(landmarks,new THREE.PlaneGeometry(16,42),new THREE.MeshStandardMaterial({color:'#283d4c',roughness:.24,metalness:.35,transparent:true,opacity:.8}),[0,.03,start-38],false);
   water.rotation.x=-Math.PI/2;
   for(let k=0;k<8;k++){const ring=addMesh(landmarks,new THREE.TorusGeometry(.45+k*.1,.012,5,48),new THREE.MeshBasicMaterial({color:'#9cb4c1',transparent:true,opacity:.18}),[(seeded(k)*8-4),.05,start-25-k*2],false);ring.rotation.x=Math.PI/2;}
   makeInscription('Even here, something is taking root.',-5,2.9,start-35,-.15,'#c0d0d8');
   for(let k=0;k<7;k++){const sprout=addMesh(landmarks,new THREE.ConeGeometry(.12,.8,5),mat('#657c6d'),[(seeded(k+90)*8-4),.4,start-45-k*1.5]);sprout.rotation.z=.25;}
  }
  if(i===4){
   for(let k=0;k<6;k++)makeLantern((k-2.5)*2.5,start-25-k*7);
   const sunDisc=addMesh(landmarks,new THREE.SphereGeometry(5,32,24),new THREE.MeshBasicMaterial({color:'#f2d9a8'}),[0,13,start-64],false);
   const glow=new THREE.PointLight('#ffe0a9',85,100);glow.position.set(0,9,start-48);landmarks.add(glow);
   makeInscription('You can carry the light without carrying the storm.',-5,4.5,start-38,0,'#fff0cc');
  }
 }
}
buildWorld();

// A faint dust field reacts to the current biome.
const dustGeo=new THREE.BufferGeometry(), dustCount=650, dustPositions=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){dustPositions[i*3]=(seeded(i)*34)-17;dustPositions[i*3+1]=seeded(i+700)*9+.3;dustPositions[i*3+2]=-seeded(i+1400)*390;}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
const dustPoints=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#d8d2c4',size:.035,transparent:true,opacity:.5}));
scene.add(dustPoints);

function setChapter(index){
 if(index===activeChapter)return;
 activeChapter=index;
 const c=chapters[index];
 document.querySelector('#chapter-kicker').textContent=c.kicker;
 document.querySelector('#chapter-title').textContent=c.title;
 document.querySelector('#chapter-copy').textContent=c.copy;
 document.querySelectorAll('.chapter-progress i').forEach((el,i)=>el.classList.toggle('active',i<=index));
 scene.fog.color.set(c.fog);scene.fog.density=c.density;scene.background.set(c.sky);
 ground.material.color.set(c.ground);sun.color.set(c.light);fill.color.set(c.accent);
 showNote(c.copy);
}
function showNote(text){
 const el=document.querySelector('#center-note');el.textContent=text;el.classList.add('show');
 clearTimeout(noteTimeout);noteTimeout=setTimeout(()=>el.classList.remove('show'),4200);
}
function chapterForZ(z){return Math.min(4,Math.max(0,Math.floor((-z+3)/82)));}
function updatePlayer(dt){
 if(paused)return;
 const fwd=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
 const str=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
 const input=new THREE.Vector2(str,fwd);if(input.lengthSq()>1)input.normalize();
 const speed=(keys.ShiftLeft||keys.ShiftRight)?5.8:3.3;
 const dir=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
 const side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
 velocity.copy(dir).multiplyScalar(input.y).addScaledVector(side,input.x);
 if(velocity.lengthSq()>0){velocity.normalize().multiplyScalar(speed);player.position.addScaledVector(velocity,dt);player.rotation.y=Math.atan2(velocity.x,-velocity.z);walkPhase+=dt*speed*2.5;playerSpeed=speed;}
 else playerSpeed=0;
 player.position.x=THREE.MathUtils.clamp(player.position.x,-13,13);
 player.position.z=THREE.MathUtils.clamp(player.position.z,-396,4);
 const bob=playerSpeed?Math.sin(walkPhase*2)*.035:0;
 avatar.position.y=bob;
 avatar.userData.legs.forEach((leg,i)=>{leg.rotation.x=playerSpeed?Math.sin(walkPhase*2+i*Math.PI)*.58:THREE.MathUtils.damp(leg.rotation.x,0,8,dt);});
 avatar.userData.arms.forEach((arm,i)=>{arm.rotation.x=playerSpeed?Math.sin(walkPhase*2+i*Math.PI)*.38:THREE.MathUtils.damp(arm.rotation.x,0,8,dt);});
 const next=chapterForZ(player.position.z);setChapter(next);
}
function updateCamera(dt){
 const lookDir=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
 cameraDesired.copy(player.position).addScaledVector(lookDir,-5.1).add(new THREE.Vector3(0,2.55,0));
 camera.position.lerp(cameraDesired,1-Math.exp(-5*dt));
 cameraTarget.copy(player.position).add(new THREE.Vector3(0,1.55,0)).addScaledVector(lookDir,2.2);
 camera.lookAt(cameraTarget);
 camera.fov=THREE.MathUtils.damp(camera.fov,playerSpeed>4?69:66,4,dt);camera.updateProjectionMatrix();
}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04);
 updatePlayer(dt);updateCamera(dt);
 const t=clock.elapsedTime;
 dustPoints.position.z=Math.sin(t*.08)*.8;
 // Gentle movement in the scene: fog, lanterns and the world breathe rather than pulse.
 landmarks.traverse(o=>{if(o.isPointLight && o.intensity>8)o.intensity=12+Math.sin(t*1.8+o.position.x)*1.2;});
 renderer.render(scene,camera);
}
animate();
setTimeout(()=>document.querySelector('#loading').classList.add('done'),450);

addEventListener('keydown',e=>{
 keys[e.code]=true;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='Space'){paused=!paused;showNote(paused?'Take the time you need.':'The path is still here.');}
 if(e.code==='KeyR')restart();
});
addEventListener('keyup',e=>keys[e.code]=false);
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!dragging)return;
 const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;
 yaw-=dx*.0045;pitch=THREE.MathUtils.clamp(pitch+dy*.002,-.18,.45);
 lastPointer={x:e.clientX,y:e.clientY};
});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
document.querySelector('#restart').addEventListener('click',restart);
function restart(){
 player.position.set(0,0,0);player.rotation.set(0,0,0);yaw=0;pitch=.12;
 activeChapter=-1;setChapter(0);
 document.querySelector('#chapter-kicker').textContent=chapters[0].kicker;
 document.querySelector('#chapter-title').textContent=chapters[0].title;
 document.querySelector('#chapter-copy').textContent=chapters[0].copy;
 document.querySelectorAll('.chapter-progress i').forEach((el,i)=>el.classList.toggle('active',i===0));
 showNote('Begin again, at your own pace.');
}
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
});

// Start in the first chapter.
activeChapter=-1;setChapter(0);
