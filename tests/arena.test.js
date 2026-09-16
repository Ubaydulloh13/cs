import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_MAP} from '../src/game/arena-map.js';
import {Simulation,blocked,movePlayer,sanitizeInput,wallDistance} from '../src/game/simulation.js';
import {orbitCamera,thirdPersonAim} from '../src/game/presentation.js';
const boxes=ARENA_MAP.boxes;
function player(x=0,z=12){return {id:'test',x,z,y:0,vy:0,health:100,yaw:0,pitch:0};}

test('Arena warehouse and both containers have traversable interiors and real doorways',()=>{
  for(const [x,z] of [[0,0],[0,6],[0,-6],[-17,-11],[17,11]])assert.equal(blocked(x,z,boxes),false,`${x},${z}`);
  const p=player();for(let n=0;n<120;n++)movePlayer(p,sanitizeInput({mz:1}),1/60,boxes);
  assert.ok(p.z<3,'player enters the warehouse through the open doorway');
  for(const x of [-17,17]){const p=player(x,x<0?-5:17);for(let n=0;n<70;n++)movePlayer(p,sanitizeInput({mz:1}),1/60,boxes);assert.ok(p.z<(x<0?-8:13),'container entrance is open');}
});
test('Thin walls stop slow-frame movement, diagonal sliding and jumping',()=>{
  const p=player(6,4);movePlayer(p,sanitizeInput({mx:1,sprint:true}),.8,boxes);
  assert.ok(p.x<7.53,'cannot tunnel through a thin warehouse wall');
  for(let n=0;n<150;n++)movePlayer(p,sanitizeInput({mx:1,mz:-.25,jump:n%35===0}),1/30,boxes);
  assert.ok(p.x<7.53);assert.equal(blocked(p.x,p.z,boxes,.35,p.y),false);
  const edge=player(23,0);for(let n=0;n<180;n++)movePlayer(edge,sanitizeInput({mx:1,jump:n%30===0}),1/30,boxes);assert.ok(edge.x<24.75);
});
test('Bullets hit opaque Arena walls while passing through doorways',()=>{
  assert.ok(Math.abs(wallDistance([0,1.43,4],[1,0,0],boxes)-7.88)<.01);
  assert.ok(wallDistance([0,1.43,10],[0,0,-1],boxes)>25,'doorway remains open to shots');
  const sim=new Simulation({map:'arena',size:1});const a=sim.addPlayer('a','A',0),b=sim.addPlayer('b','B',1);
  Object.assign(a,{x:6,y:0,z:4,yaw:-Math.PI/2,pitch:0,protect:0});Object.assign(b,{x:10,y:0,z:4,protect:0});sim.time=5;
  for(let n=0;n<12;n++){a.cooldown=0;sim.shoot(a);}assert.equal(b.health,100);
});
test('Raised lintels allow walking below and stop a jumping head',()=>{
  const p=player(0,7.5);assert.equal(blocked(p.x,p.z,boxes),false);
  for(let n=0;n<20;n++)movePlayer(p,sanitizeInput({jump:n===0}),1/60,boxes);
  assert.ok(p.y<=.701);assert.ok(p.y>=0);
});
test('Shoulder camera stays outside walls and third-person shots converge on the crosshair',()=>{
  const p={...player(0,11),weapon:'m4'},input={yaw:0,pitch:.24};
  const pose=orbitCamera(p,input,boxes);assert.ok(pose.position[0]>p.x);assert.ok(pose.position[2]>p.z);
  const aim=thirdPersonAim(p,input,boxes,[]);assert.ok(Number.isFinite(aim.shotYaw)&&Number.isFinite(aim.shotPitch));
  const near={...p,x:7.3,z:4};const camera=orbitCamera(near,{yaw:-Math.PI/2},boxes);
  assert.equal(blocked(camera.position[0],camera.position[2],boxes,.06,camera.position[1],.06),false);
});
