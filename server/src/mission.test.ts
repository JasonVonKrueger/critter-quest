import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMissionAction, createMission } from './mission.js';
import { RoomManager } from './rooms.js';
test('invalid roles and payloads leave mission unchanged',()=>{
 const state=createMission();
 assert.equal(applyMissionAction(state,'explorer',{round:1,id:'1',type:'grow',patch:0,stage:0}).ok,false);
 assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'feed',carrot:0}).ok,false);
 for(const patch of [-1,3,0.5,NaN])assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'grow',patch,stage:0}).ok,false);
 assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'grow',patch:0,stage:3}).ok,false);
 assert.deepEqual(state,createMission());
});
test('duplicate growth, collection, and feeding cannot duplicate items or rewards',()=>{
 const state=createMission();
 for(let patch=0;patch<3;patch++)for(let stage=0;stage<3;stage++){
   const action={round:1,id:`${patch}-${stage}`,type:'grow' as const,patch,stage};
   assert.ok(applyMissionAction(state,'helper',action).ok);
   assert.equal(applyMissionAction(state,'helper',action).ok,false);
 }
 assert.deepEqual(state.basket,[0,1,2]);
 assert.equal(applyMissionAction(state,'explorer',{round:1,id:'f',type:'feed',carrot:0}).ok,false);
 applyMissionAction(state,'explorer',{round:1,id:'hello',type:'discover'});
 for(let carrot=0;carrot<3;carrot++){
   const action={round:1,id:`feed-${carrot}`,type:'feed' as const,carrot};
   assert.ok(applyMissionAction(state,'explorer',action).ok);
   assert.equal(applyMissionAction(state,'explorer',action).ok,false);
   assert.equal(state.complete,carrot===2);
 }
 assert.equal(state.stars,3);assert.deepEqual(state.unlockedAnimals,['bunny']);assert.equal(state.basket.length,0);
});
test('room gates mission actions and reconnect restores progress',()=>{
 const manager=new RoomManager();const a=manager.create();assert.ok(a.ok);
 assert.equal(manager.act(a.token,{round:1,id:'a',type:'discover'}).ok,false);
 const b=manager.join(a.room.code);assert.ok(b.ok);
 manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
 assert.ok(manager.act(b.token,{round:1,id:'g',type:'grow',patch:0,stage:0}).ok);
 manager.disconnect(b.token);assert.equal(manager.act(b.token,{round:1,id:'g2',type:'grow',patch:0,stage:1}).ok,false);
 const resumed=manager.resume(b.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.patches[0],1);
 assert.ok(manager.act(b.token,{round:1,id:'g2',type:'grow',patch:0,stage:1}).ok);
});
