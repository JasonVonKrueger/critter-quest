import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMissionAction, createMission, nextHungerAt } from './mission.js';
import { RoomManager } from './rooms.js';
test('invalid roles and payloads leave mission unchanged',()=>{
 const state=createMission();const before=structuredClone(state);
 assert.equal(applyMissionAction(state,'explorer',{round:1,id:'1',type:'grow',patch:0,stage:0}).ok,false);
 assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'feed',carrot:0}).ok,false);
 for(const patch of [-1,3,0.5,NaN])assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'grow',patch,stage:0}).ok,false);
 assert.equal(applyMissionAction(state,'helper',{round:1,id:'1',type:'grow',patch:0,stage:3}).ok,false);
 assert.deepEqual(state,before);
});
test('levels advance through carrots and snake feeding without duplicate rewards',()=>{
 const state=createMission();assert.deepEqual(state.patches,[1]);
 for(let level=1;level<=12;level++){
  const count=[1,2,3,1,2,3,1,2,3,1,2,3][level-1];
  const round=state.round,offset=[0,1,3,6,7,9,12,13,15,18,19,21][level-1];
  for(let patch=0;patch<count;patch++)for(let stage=1;stage<3;stage++){
   const action={round,id:`${level}-${patch}-${stage}`,type:'grow' as const,patch,stage};
   assert.ok(applyMissionAction(state,'helper',action).ok);
   assert.equal(applyMissionAction(state,'helper',action).ok,false);
  }
  for(let patch=0;patch<count;patch++){
   const action={round,id:`feed-${level}-${patch}`,type:'feed' as const,carrot:offset+patch};
   assert.ok(applyMissionAction(state,'explorer',action).ok);
   assert.equal(applyMissionAction(state,'explorer',action).ok,false);
  }
  assert.equal(state.complete,level===12);
  if(level<3){assert.equal(state.level,level+1);assert.equal(state.patches.length,level+1);assert.equal(state.stars,0);}
 }
 assert.equal(state.fed.length,24);assert.equal(state.stars,12);assert.deepEqual(state.unlockedAnimals,['bunny','snake','hawk','owl']);
});
test('room gates mission actions and reconnect restores progress',()=>{
 const manager=new RoomManager();const a=manager.create();assert.ok(a.ok);
 assert.equal(manager.act(a.token,{round:1,id:'a',type:'discover'}).ok,false);
 const b=manager.join(a.room.code);assert.ok(b.ok);
 manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
 assert.equal(manager.state(b.token)?.mission.patches[0],1);
 manager.disconnect(b.token);assert.equal(manager.act(b.token,{round:1,id:'g2',type:'grow',patch:0,stage:1}).ok,false);
 const resumed=manager.resume(b.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.patches[0],1);
 assert.ok(manager.act(b.token,{round:1,id:'g2',type:'grow',patch:0,stage:1}).ok);
});
test('the watering can waters every planted patch without refills',()=>{
 const state=createMission();state.level=3;state.patches=[1,1,1];
 for(let patch=0;patch<3;patch++){
  assert.equal(state.patches[patch],1);
  const water={round:1,id:`water-${patch}`,type:'grow' as const,patch,stage:1};
  assert.equal(applyMissionAction(state,'explorer',water).ok,false);
  assert.ok(applyMissionAction(state,'helper',water).ok);
  assert.equal(applyMissionAction(state,'helper',water).ok,false);
 }
 assert.deepEqual(state.patches,[2,2,2]);
});

test('hunger deadlines are 10–20 seconds and reset after feeding',()=>{
 assert.equal(nextHungerAt(1000,0),11000);
 assert.equal(nextHungerAt(1000,0.999999),21000);
 const state=createMission();state.hungryAt=1;state.discovered=true;state.level=3;state.patches=[1,1,1];state.fed=[0,1,2];state.basket=[3];
 const before=Date.now();assert.ok(applyMissionAction(state,'explorer',{round:1,id:'meal',type:'feed',carrot:3}).ok);
 assert.ok(state.hungryAt>=before+10000&&state.hungryAt<=Date.now()+20000);
 state.basket=[4,5];
 applyMissionAction(state,'explorer',{round:1,id:'meal2',type:'feed',carrot:4});
 applyMissionAction(state,'explorer',{round:1,id:'meal3',type:'feed',carrot:5});
 assert.equal(state.level,4);for(let carrot=6;carrot<24;carrot++){state.basket=[carrot];applyMissionAction(state,'explorer',{round:state.round,id:`snake-${carrot}`,type:'feed',carrot});}
 assert.equal(state.complete,true);assert.equal(state.hungryAt,0);
});

test('the first carrot can be fed without greeting the bunny',()=>{
 const state=createMission();state.basket=[0];
 assert.equal(state.discovered,false);
 assert.ok(applyMissionAction(state,'explorer',{round:1,id:'first-carrot',type:'feed',carrot:0}).ok);
 assert.deepEqual(state.fed,[0]);assert.deepEqual(state.basket,[]);
});
