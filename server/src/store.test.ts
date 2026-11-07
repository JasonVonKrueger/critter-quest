import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonGameStore } from './store.js';
import { RoomManager } from './rooms.js';
test('JSON store restores shared completion, tokens, names and rewards after restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-save-'));
 try{
  const store=new JsonGameStore(join(dir,'games.json'));const rooms=new RoomManager(store);
  const a=rooms.create();assert.ok(a.ok);const b=rooms.join(a.room.code);assert.ok(b.ok);
  rooms.select(a.token,'Raelyn','explorer');rooms.select(b.token,'Cooper','helper');rooms.ready(a.token,true);rooms.ready(b.token,true);
  rooms.act(a.token,{round:1,id:'hello',type:'discover'});
  for(let patch=0;patch<3;patch++){
   for(let stage=0;stage<3;stage++)rooms.act(b.token,{round:1,id:`${patch}-${stage}`,type:'grow',patch,stage});
   rooms.act(a.token,{round:1,id:`feed-${patch}`,type:'feed',carrot:patch});
  }
  const restarted=new RoomManager(store);const resumed=restarted.resume(a.token);assert.ok(resumed.ok);
  assert.equal(resumed.playerId,a.playerId);assert.equal(resumed.room.players[1].connected,false);
  assert.equal(resumed.room.mission.stars,3);assert.deepEqual(resumed.room.mission.unlockedAnimals,['bunny']);
  assert.ok(restarted.resume(b.token).ok);assert.equal(restarted.join(a.room.code).ok,false);
  assert.equal(restarted.act(a.token,{round:1,id:'duplicate',type:'feed',carrot:2}).ok,false);
  assert.equal(restarted.state(a.token)?.mission.stars,3);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('a failed save rolls back game actions and returns an error',()=>{
 let fail=false;
 const manager=new RoomManager({load:()=>undefined,save:()=>{if(fail)throw new Error('disk full');}});
 const a=manager.create();assert.ok(a.ok);fail=true;
 const log=console.error;console.error=()=>{};
 try{assert.equal(manager.select(a.token,'Raelyn','explorer').ok,false);assert.equal(manager.state(a.token)?.players[0].name,undefined);}finally{console.error=log;}
});
test('invalid save files fail explicitly rather than overwriting progress',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-invalid-'));const path=join(dir,'games.json');
 try{writeFileSync(path,'{"version":2}');assert.throws(()=>new RoomManager(new JsonGameStore(path)));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('restart preserves partially grown patches and basket inventory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-partial-'));
 try{
  const store=new JsonGameStore(join(dir,'games.json'));const manager=new RoomManager(store);
  const a=manager.create();assert.ok(a.ok);const b=manager.join(a.room.code);assert.ok(b.ok);
  manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
  for(let stage=0;stage<3;stage++)manager.act(b.token,{round:1,id:`g${stage}`,type:'grow',patch:0,stage});
  manager.act(b.token,{round:1,id:'partial',type:'grow',patch:1,stage:0});
  const restarted=new RoomManager(store);const resumed=restarted.resume(a.token);assert.ok(resumed.ok);
  assert.deepEqual(resumed.room.mission.patches,[3,1,0]);assert.deepEqual(resumed.room.mission.basket,[0]);assert.equal(resumed.room.mission.complete,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
