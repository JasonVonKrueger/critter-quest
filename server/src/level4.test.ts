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
 assert.equal(state.mission.complete,true);assert.deepEqual(state.sanctuary,{stars:6,unlockedAnimals:['bunny','snake']});
 assert.equal(manager.act(b.token,{round:4,id:'duplicate-rabbit',type:'feed',carrot:6}).ok,false);
 manager.replay(a.token,4,true);manager.replay(b.token,4,true);
 assert.equal(state.players[0].role,'explorer');assert.equal(state.players[1].role,'helper');assert.equal(state.mission.level,1);
});
test('a server restart preserves the jungle and exchanged jobs without swapping twice',()=>{
 let data:SavedGame|undefined;
 const store:GameStore={load:()=>data&&structuredClone(data),save:value=>{data=structuredClone(value);}};
 const {a,b}=enterJungle(store);const restarted=new RoomManager(store);
 const resumed=restarted.resume(a.token);assert.ok(resumed.ok);assert.equal(resumed.room.mission.level,4);assert.equal(resumed.room.players[0].role,'helper');
 restarted.resume(b.token);assert.equal(resumed.room.players[1].role,'explorer');
});
