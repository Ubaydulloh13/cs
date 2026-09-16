import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/game/simulation.js';
import {weaponPresentation,orbitCamera} from '../src/game/presentation.js';
test('slot presses toggle stow once; held input never toggles repeatedly or fires while stowed',()=>{
 const sim=new Simulation({size:1});const p=sim.addPlayer('local','Test');p.protect=0;
 sim.setInput(p.id,{slot:1,slotSeq:1,fire:true});for(let n=0;n<90;n++)sim.step(1/60);
 assert.equal(p.holstered,true);assert.equal(p.shots,0);assert.equal(weaponPresentation(p,sim.time).visible,false);
 sim.setInput(p.id,{slot:1,slotSeq:2});sim.step(1/60);assert.equal(p.holstered,false);
 sim.setInput(p.id,{slot:2,slotSeq:3});sim.step(1/60);assert.equal(p.weapon,'pistol');assert.equal(p.holstered,false);
 sim.setInput(p.id,{slot:2,slotSeq:3,inspectSeq:1});sim.step(1/60);const stamp=p.inspectAt;
 for(let n=0;n<50;n++)sim.step(1/60);assert.equal(p.inspectAt,stamp);assert.ok(weaponPresentation(p,sim.time).inspect>.9);
 sim.setInput(p.id,{slot:2,slotSeq:3,inspectSeq:1,fire:true});sim.step(1/60);assert.equal(p.inspectAt,-10);
});
test('camera stays behind and above player and stops before a wall',()=>{
 const p={x:0,y:0,z:0,yaw:0};const pose=orbitCamera(p,{orbitPitch:.38},[]);
 assert.ok(pose.position[1]>1.7);assert.ok(pose.position[2]>2.5);
 const blocked=orbitCamera(p,{orbitPitch:.38},[{x:0,z:2,w:5,d:.5,h:5}]);
 assert.ok(blocked.position[2]<1.75);
});
