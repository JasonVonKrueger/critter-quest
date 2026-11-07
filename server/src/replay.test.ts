import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RoomManager} from './rooms.js';
import type {GameStore,SavedGame} from './store.js';
function team(store?:GameStore){
 const manager=new RoomManager(store),a=manager.create();assert.ok(a.ok);
 const b=manager.join(a.room.code);assert.ok(b.ok);
 manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
 return {manager,a,b};
}
function finish(manager:RoomManager,a:string,b:string,round:number){
 assert.ok(manager.act(a,{round,id:'hello',type:'discover'}).ok);
 for(let patch=0;patch<3;patch++){
  for(let stage=0;stage<3;stage++)assert.ok(manager.act(b,{round,id:`g${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(a,{round,id:`f${patch}`,type:'feed',carrot:patch}).ok);
 }
}
test('replay requires both connected votes and preserves sanctuary rewards across rounds',()=>{
 const {manager,a,b}=team();assert.equal(manager.replay(a.token,1,true).ok,false);
 finish(manager,a.token,b.token,1);
 assert.ok(manager.replay(a.token,1,true).ok);assert.ok(manager.replay(a.token,1,true).ok);
 assert.equal(manager.state(a.token)?.replayReady.length,1);
 assert.equal(manager.state(a.token)?.mission.complete,true);
 assert.ok(manager.replay(a.token,1,false).ok);assert.equal(manager.state(a.token)?.replayReady.length,0);
 manager.replay(a.token,1,true);manager.replay(b.token,1,true);
 const state=manager.state(a.token)!;assert.equal(state.mission.round,2);assert.deepEqual(state.mission.patches,[0,0,0]);
 assert.deepEqual(state.sanctuary,{stars:3,unlockedAnimals:['bunny']});assert.equal(state.players[0].name,'Raelyn');
 assert.equal(manager.replay(a.token,1,true).ok,false);
 assert.equal(manager.act(b.token,{round:1,id:'old',type:'grow',patch:0,stage:0}).ok,false);
 assert.equal(manager.act(a.token,{round:1,id:'old-feed',type:'feed',carrot:0}).ok,false);
 finish(manager,a.token,b.token,2);assert.deepEqual(manager.state(a.token)?.sanctuary,{stars:3,unlockedAnimals:['bunny']});
 assert.equal(manager.replay(a.token,1,true).ok,false);
});
test('disconnect cancels that player’s replay consent',()=>{
 const {manager,a,b}=team();finish(manager,a.token,b.token,1);
 manager.replay(a.token,1,true);manager.disconnect(a.token);manager.replay(b.token,1,true);
 assert.equal(manager.state(b.token)?.mission.round,1);assert.equal(manager.replay(a.token,1,true).ok,false);
 manager.resume(a.token);assert.equal(manager.state(a.token)?.replayReady.includes(a.playerId),false);
 manager.replay(a.token,1,true);assert.equal(manager.state(a.token)?.mission.round,2);
});
test('old saves migrate sanctuary progress; restart retains replay rounds but clears consent',()=>{
 let data:SavedGame|undefined;
 const store:GameStore={load:()=>data&&structuredClone(data),save:value=>{data=structuredClone(value);}};
 const {manager,a,b}=team(store);finish(manager,a.token,b.token,1);
 // Simulate the previous save schema, which kept rewards only on the mission.
 const legacy=data!.rooms[0][1] as unknown as Record<string,unknown>;delete legacy.sanctuary;delete legacy.replayReady;
 delete (legacy.mission as Record<string,unknown>).round;
 let restored=new RoomManager(store);restored.resume(a.token);restored.resume(b.token);
 assert.deepEqual(restored.state(a.token)?.sanctuary,{stars:3,unlockedAnimals:['bunny']});
 restored.replay(a.token,1,true);restored.replay(b.token,1,true);
 restored=new RoomManager(store);const resumed=restored.resume(a.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.round,2);assert.deepEqual(resumed.room.replayReady,[]);assert.equal(resumed.room.sanctuary.stars,3);
});
