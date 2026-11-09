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
 for(let level=1;level<=12;level++){
  const current=manager.state(a)!.mission.round;
  const count=[1,2,3,1,2,3,1,2,3,1,2,3][level-1],grower=Math.floor((level-1)/3)%2===1?a:b,feeder=Math.floor((level-1)/3)%2===1?b:a;
  for(let patch=0;patch<count;patch++){
   for(let stage=1;stage<3;stage++)assert.ok(manager.act(grower,{round:current,id:`${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
   assert.ok(manager.act(feeder,{round:current,id:`f${level}-${patch}`,type:'feed',carrot:([0,1,3,6,7,9,12,13,15,18,19,21][level-1])+patch}).ok);
  }
 }
}
test('replay requires both connected votes and preserves sanctuary rewards across rounds',()=>{
 const {manager,a,b}=team();assert.equal(manager.replay('unknown',1,true).ok,false);
 finish(manager,a.token,b.token,1);
 assert.ok(manager.replay(a.token,12,true).ok);assert.ok(manager.replay(a.token,12,true).ok);
 assert.equal(manager.state(a.token)?.replayReady.length,1);
 assert.equal(manager.state(a.token)?.mission.complete,true);
 assert.ok(manager.replay(a.token,12,false).ok);assert.equal(manager.state(a.token)?.replayReady.length,0);
 manager.replay(a.token,12,true);manager.replay(b.token,12,true);
 const state=manager.state(a.token)!;assert.equal(state.mission.round,13);assert.deepEqual(state.mission.patches,[1]);
 assert.deepEqual(state.sanctuary,{stars:12,unlockedAnimals:['bunny','snake','hawk','owl']});assert.equal(state.players[0].name,'Raelyn');
 assert.equal(manager.replay(a.token,12,true).ok,false);
 assert.equal(manager.act(b.token,{round:1,id:'old',type:'grow',patch:0,stage:0}).ok,false);
 assert.equal(manager.act(a.token,{round:1,id:'old-feed',type:'feed',carrot:0}).ok,false);
 finish(manager,a.token,b.token,13);assert.deepEqual(manager.state(a.token)?.sanctuary,{stars:12,unlockedAnimals:['bunny','snake','hawk','owl']});
 assert.equal(manager.replay(a.token,12,true).ok,false);
});
test('disconnect cancels that player’s replay consent',()=>{
 const {manager,a,b}=team();finish(manager,a.token,b.token,1);
 manager.replay(a.token,12,true);manager.disconnect(a.token);manager.replay(b.token,12,true);
 assert.equal(manager.state(b.token)?.mission.round,12);assert.equal(manager.replay(a.token,12,true).ok,false);
 manager.resume(a.token);assert.equal(manager.state(a.token)?.replayReady.includes(a.playerId),false);
 manager.replay(a.token,12,true);assert.equal(manager.state(a.token)?.mission.round,13);
});
test('old saves migrate sanctuary progress; restart retains replay rounds but clears consent',()=>{
 let data:SavedGame|undefined;
 const store:GameStore={load:()=>data&&structuredClone(data),save:value=>{data=structuredClone(value);}};
 const {manager,a,b}=team(store);finish(manager,a.token,b.token,1);
 // Simulate the previous save schema, which kept rewards only on the mission.
 const legacy=data!.rooms[0][1] as unknown as Record<string,unknown>;delete legacy.sanctuary;delete legacy.replayReady;
 delete (legacy.mission as Record<string,unknown>).round;
 let restored=new RoomManager(store);restored.resume(a.token);restored.resume(b.token);
 assert.deepEqual(restored.state(a.token)?.sanctuary,{stars:12,unlockedAnimals:['bunny','snake','hawk','owl']});
 restored.replay(a.token,1,true);restored.replay(b.token,1,true);
 restored=new RoomManager(store);const resumed=restored.resume(a.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.round,2);assert.deepEqual(resumed.room.replayReady,[]);assert.equal(resumed.room.sanctuary.stars,12);
});

test('start over resets an unfinished mission only after both players agree',()=>{
 const {manager,a,b}=team();
 manager.act(a.token,{round:1,id:'hello',type:'discover'});
 manager.act(b.token,{round:1,id:'plant',type:'grow',patch:0,stage:0});
 assert.ok(manager.replay(a.token,1,true).ok);
 assert.equal(manager.state(a.token)?.mission.patches[0],1);
 manager.replay(a.token,1,false);assert.equal(manager.state(a.token)?.replayReady.length,0);
 manager.replay(a.token,1,true);assert.ok(manager.replay(b.token,1,true).ok);
 const state=manager.state(a.token)!;
 assert.equal(state.mission.round,2);assert.deepEqual(state.mission.patches,[1]);
 assert.deepEqual(state.mission.basket,[]);assert.deepEqual(state.mission.fed,[]);assert.equal(state.mission.discovered,false);
 assert.equal(state.players[0].name,'Raelyn');assert.equal(state.players[1].role,'helper');
 assert.deepEqual(state.sanctuary,{stars:0,unlockedAnimals:[]});
 assert.equal(manager.act(b.token,{round:1,id:'late',type:'grow',patch:0,stage:0}).ok,false);
});
test('level two progress survives reconnect and restart',()=>{
 let data:SavedGame|undefined;
 const store:GameStore={load:()=>data&&structuredClone(data),save:value=>{data=structuredClone(value);}};
 const {manager,a,b}=team(store);
 manager.act(b.token,{round:1,id:'water',type:'grow',patch:0,stage:1});
 manager.act(b.token,{round:1,id:'send',type:'grow',patch:0,stage:2});
 manager.act(a.token,{round:1,id:'feed',type:'feed',carrot:0});
 manager.act(b.token,{round:2,id:'water2',type:'grow',patch:1,stage:1});
 const restarted=new RoomManager(store),resumed=restarted.resume(a.token);assert.ok(resumed.ok);
 assert.equal(resumed.room.mission.level,2);assert.deepEqual(resumed.room.mission.patches,[1,2]);assert.deepEqual(resumed.room.mission.fed,[0]);
});
test('legacy three-patch missions retain their feeding progress at level three',()=>{
 const {manager,a}=team();
 const room=structuredClone(manager.state(a.token)!);
 Reflect.deleteProperty(room.mission,'level');room.mission.patches=[3,2,3];room.mission.fed=[0];room.mission.basket=[2];
 const store:GameStore={load:()=>({version:1,rooms:[[room.code,room]],sessions:[[a.token,{code:room.code,id:a.playerId}]]}),save:()=>{}};
 const restored=new RoomManager(store).resume(a.token);assert.ok(restored.ok);
 assert.equal(restored.room.mission.level,3);assert.deepEqual(restored.room.mission.patches,[3,2,3]);assert.deepEqual(restored.room.mission.fed,[0,1,2,3]);assert.deepEqual(restored.room.mission.basket,[5]);
});
