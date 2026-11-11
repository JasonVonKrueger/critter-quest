import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RoomManager} from './rooms.js';
import type {GameStore,SavedGame} from './store.js';
function enterJungle(store?:GameStore){
 const manager=new RoomManager(store),a=manager.create();assert.ok(a.ok);const b=manager.join(a.room.code);assert.ok(b.ok);
 manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
 for(let level=1;level<=3;level++)for(let patch=0;patch<level;patch++){
  for(let stage=1;stage<3;stage++)assert.ok(manager.act(b.token,{round:level,id:`g${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(a.token,{round:level,id:`f${level}-${patch}`,type:'feed',carrot:level*(level-1)/2+patch}).ok);
 }
 return {manager,a,b};
}
test('level four swaps jobs exactly once and only the new roles can grow and feed',()=>{
 const {manager,a,b}=enterJungle();const state=manager.state(a.token)!;
 assert.equal(state.mission.level,4);assert.equal(state.mission.round,4);assert.deepEqual(state.mission.patches,[1]);
 assert.equal(state.players[0].role,'helper');assert.equal(state.players[1].role,'explorer');assert.equal(state.mission.complete,false);
 assert.deepEqual(state.sanctuary,{stars:3,unlockedAnimals:['bunny']});
 assert.equal(manager.act(a.token,{round:3,id:'duplicate-last-carrot',type:'feed',carrot:5}).ok,false);
 assert.equal(manager.act(b.token,{round:4,id:'wrong-grower',type:'grow',patch:0,stage:1}).ok,false);
 assert.ok(manager.act(a.token,{round:4,id:'grow-rabbit',type:'grow',patch:0,stage:1}).ok);
 assert.ok(manager.act(a.token,{round:4,id:'send-rabbit',type:'grow',patch:0,stage:2}).ok);assert.deepEqual(state.mission.basket,[6]);
 assert.equal(manager.act(a.token,{round:4,id:'wrong-feeder',type:'feed',carrot:6}).ok,false);
 assert.ok(manager.act(b.token,{round:4,id:'snake-meal',type:'feed',carrot:6}).ok);
 assert.equal(state.mission.complete,false);assert.equal(state.mission.level,5);
 for(let level=5;level<=6;level++)for(let patch=0;patch<level-3;patch++){
  for(let stage=1;stage<3;stage++)assert.ok(manager.act(a.token,{round:level,id:`r${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(b.token,{round:level,id:`eat${level}-${patch}`,type:'feed',carrot:6+(level-4)*(level-3)/2+patch}).ok);
 }
 assert.equal(state.mission.level,7);assert.equal(state.players[0].role,'explorer');assert.equal(state.players[1].role,'helper');
 for(let level=7;level<=9;level++)for(let patch=0;patch<level-6;patch++){
  for(let stage=1;stage<3;stage++)assert.ok(manager.act(b.token,{round:level,id:`hawk${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(a.token,{round:level,id:`hawkmeal${level}-${patch}`,type:'feed',carrot:12+(level-7)*(level-6)/2+patch}).ok);
 }
 assert.equal(state.mission.level,10);assert.equal(state.players[0].role,'helper');assert.equal(state.players[1].role,'explorer');
 for(let level=10;level<=12;level++)for(let patch=0;patch<level-9;patch++){
  for(let stage=1;stage<3;stage++)assert.ok(manager.act(a.token,{round:level,id:`owl${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(b.token,{round:level,id:`owlmeal${level}-${patch}`,type:'feed',carrot:18+(level-10)*(level-9)/2+patch}).ok);
 }
 assert.equal(state.mission.level,13);assert.equal(state.players[0].role,'explorer');assert.equal(state.players[1].role,'helper');
 assert.equal(state.mission.complete,false);
 assert.equal(manager.act(a.token,{round:13,id:'wrong-bobcat-grower',type:'grow',patch:0,stage:1}).ok,false);
 for(let level=13;level<=15;level++)for(let patch=0;patch<level-12;patch++){
  for(let stage=1;stage<3;stage++)assert.ok(manager.act(b.token,{round:level,id:`bobcat${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
  assert.ok(manager.act(a.token,{round:level,id:`bobcatmeal${level}-${patch}`,type:'feed',carrot:24+(level-13)*(level-12)/2+patch}).ok);
 }
 assert.equal(state.mission.complete,true);assert.deepEqual(state.sanctuary,{stars:15,unlockedAnimals:['bunny','snake','hawk','owl','bobcat']});
 assert.equal(manager.act(b.token,{round:4,id:'duplicate-rabbit',type:'feed',carrot:6}).ok,false);
 manager.replay(a.token,15,true);manager.replay(b.token,15,true);
 assert.equal(state.players[0].role,'explorer');assert.equal(state.players[1].role,'helper');assert.equal(state.mission.level,1);
});
test('a server restart preserves the jungle and exchanged jobs without swapping twice',()=>{
 let data:SavedGame|undefined;
 const store:GameStore={load:()=>data&&structuredClone(data),save:value=>{data=structuredClone(value);}};
 const {a,b}=enterJungle(store);const restarted=new RoomManager(store);
 const resumed=restarted.resume(a.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.level,4);assert.equal(resumed.room.players[0].role,'helper');
 restarted.resume(b.token);assert.equal(resumed.room.players[1].role,'explorer');
});
test('an older completed single snake level continues at level five without losing rewards',()=>{
 const {manager,a,b}=enterJungle();const room=structuredClone(manager.state(a.token)!);
 room.mission.complete=true;room.mission.fed=[0,1,2,3,4,5,6];room.mission.patches=[3];room.mission.stars=6;room.mission.unlockedAnimals=['bunny','snake'];room.sanctuary={stars:6,unlockedAnimals:['bunny','snake']};
 const store:GameStore={load:()=>({version:1,rooms:[[room.code,room]],sessions:[[a.token,{code:room.code,id:a.playerId}],[b.token,{code:room.code,id:b.playerId}]]}),save:()=>{}};
 const restored=new RoomManager(store).resume(a.token);assert.ok(restored.ok);
 assert.equal(restored.room.mission.level,5);assert.equal(restored.room.mission.complete,false);assert.deepEqual(restored.room.mission.patches,[1,1]);assert.equal(restored.room.sanctuary.stars,6);assert.equal(restored.room.players[0].role,'helper');
});
test('completed snake saves open the hawk chapter with a second job swap, once',()=>{
 const {manager,a,b}=enterJungle();const room=structuredClone(manager.state(a.token)!);
 room.mission.level=6;room.mission.round=6;room.mission.complete=true;room.mission.fed=Array.from({length:12},(_,i)=>i);room.mission.patches=[3,3,3];room.mission.stars=6;room.mission.unlockedAnimals=['bunny','snake'];room.sanctuary={stars:6,unlockedAnimals:['bunny','snake']};
 let data:SavedGame={version:1,rooms:[[room.code,room]],sessions:[[a.token,{code:room.code,id:a.playerId}],[b.token,{code:room.code,id:b.playerId}]]};
 const store:GameStore={load:()=>structuredClone(data),save:snapshot=>{data=structuredClone(snapshot);}};
 const resumed=new RoomManager(store).resume(a.token);assert.ok(resumed.ok);
 assert.equal(resumed.room.mission.level,7);assert.equal(resumed.room.mission.complete,false);assert.deepEqual(resumed.room.mission.patches,[1]);assert.equal(resumed.room.players[0].role,'explorer');assert.equal(resumed.room.sanctuary.stars,6);
 const again=new RoomManager(store).resume(a.token);assert.ok(again.ok);assert.equal(again.room.players[0].role,'explorer');assert.equal(again.room.mission.level,7);
});
test('completed hawk saves enter the owl chapter and preserve the third job swap across restarts',()=>{
 const {manager,a,b}=enterJungle();const room=structuredClone(manager.state(a.token)!);
 room.mission.level=9;room.mission.round=9;room.mission.complete=true;room.mission.fed=Array.from({length:18},(_,i)=>i);room.mission.patches=[3,3,3];room.mission.stars=9;room.mission.unlockedAnimals=['bunny','snake','hawk'];room.sanctuary={stars:9,unlockedAnimals:['bunny','snake','hawk']};room.players[0].role='explorer';room.players[1].role='helper';
 let data:SavedGame={version:1,rooms:[[room.code,room]],sessions:[[a.token,{code:room.code,id:a.playerId}],[b.token,{code:room.code,id:b.playerId}]]};
 const store:GameStore={load:()=>structuredClone(data),save:snapshot=>{data=structuredClone(snapshot);}};
 const resumed=new RoomManager(store).resume(a.token);assert.ok(resumed.ok);
 assert.equal(resumed.room.mission.level,10);assert.equal(resumed.room.mission.complete,false);assert.deepEqual(resumed.room.mission.patches,[1]);assert.equal(resumed.room.players[0].role,'helper');assert.equal(resumed.room.sanctuary.stars,9);
 const again=new RoomManager(store).resume(a.token);assert.ok(again.ok);assert.equal(again.room.players[0].role,'helper');assert.equal(again.room.mission.level,10);
});

test('completed owl saves enter level thirteen and swap jobs exactly once across restarts',()=>{
 const {manager,a,b}=enterJungle();const room=structuredClone(manager.state(a.token)!);
 room.mission.level=12;room.mission.round=12;room.mission.complete=true;room.mission.fed=Array.from({length:24},(_,i)=>i);room.mission.patches=[3,3,3];room.mission.stars=12;room.mission.unlockedAnimals=['bunny','snake','hawk','owl'];room.sanctuary={stars:12,unlockedAnimals:['bunny','snake','hawk','owl']};room.players[0].role='helper';room.players[1].role='explorer';
 let data:SavedGame={version:1,rooms:[[room.code,room]],sessions:[[a.token,{code:room.code,id:a.playerId}],[b.token,{code:room.code,id:b.playerId}]]};
 const store:GameStore={load:()=>structuredClone(data),save:snapshot=>{data=structuredClone(snapshot);}};
 const resumed=new RoomManager(store).resume(a.token);assert.ok(resumed.ok);
 assert.equal(resumed.room.mission.level,13);assert.equal(resumed.room.mission.round,13);assert.equal(resumed.room.mission.complete,false);assert.deepEqual(resumed.room.mission.patches,[1]);assert.equal(resumed.room.players[0].role,'explorer');assert.equal(resumed.room.sanctuary.stars,12);
 const again=new RoomManager(store).resume(a.token);assert.ok(again.ok);assert.equal(again.room.players[0].role,'explorer');assert.equal(again.room.mission.level,13);
});
