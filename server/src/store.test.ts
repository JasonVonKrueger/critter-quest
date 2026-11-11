import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteGameStore } from './store.js';
import { RoomManager } from './rooms.js';
test('SQLite store restores shared completion, tokens, names and rewards after restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-save-'));
 let store:SqliteGameStore|undefined;
 try{
  store=new SqliteGameStore(join(dir,'games.sqlite'));const rooms=new RoomManager(store);
  const a=rooms.create();assert.ok(a.ok);const b=rooms.join(a.room.code);assert.ok(b.ok);
  rooms.select(a.token,'Raelyn','explorer');rooms.select(b.token,'Cooper','helper');rooms.ready(a.token,true);rooms.ready(b.token,true);
  rooms.act(a.token,{round:1,id:'hello',type:'discover'});
  for(let level=1;level<=15;level++){
   const round=rooms.state(a.token)!.mission.round;
   const count=[1,2,3,1,2,3,1,2,3,1,2,3,1,2,3][level-1],grower=Math.floor((level-1)/3)%2===1?a.token:b.token,feeder=Math.floor((level-1)/3)%2===1?b.token:a.token;
   for(let patch=0;patch<count;patch++){
    for(let stage=1;stage<3;stage++)assert.ok(rooms.act(grower,{round,id:`${level}-${patch}-${stage}`,type:'grow',patch,stage}).ok);
    assert.ok(rooms.act(feeder,{round,id:`f${level}-${patch}`,type:'feed',carrot:([0,1,3,6,7,9,12,13,15,18,19,21,24,25,27][level-1])+patch}).ok);
   }
  }
  store.close();store=new SqliteGameStore(join(dir,'games.sqlite'));
  const restarted=new RoomManager(store);const resumed=restarted.resume(a.token);assert.ok(resumed.ok);
  assert.equal(resumed.playerId,a.playerId);assert.equal(resumed.room.players[1].connected,false);
  assert.equal(resumed.room.mission.stars,15);assert.deepEqual(resumed.room.mission.unlockedAnimals,['bunny','snake','hawk','owl','bobcat']);
  assert.ok(restarted.resume(b.token).ok);assert.equal(restarted.join(a.room.code).ok,false);
  assert.equal(restarted.act(a.token,{round:1,id:'duplicate',type:'feed',carrot:2}).ok,false);
  assert.equal(restarted.state(a.token)?.mission.stars,15);
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
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
 try{writeFileSync(path,'{"version":2}');assert.throws(()=>new SqliteGameStore(join(dir,'games.sqlite'),path));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('restart preserves partially grown patches and basket inventory',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-partial-'));
 let store:SqliteGameStore|undefined;
 try{
  store=new SqliteGameStore(join(dir,'games.sqlite'));const manager=new RoomManager(store);
  const a=manager.create();assert.ok(a.ok);const b=manager.join(a.room.code);assert.ok(b.ok);
  manager.select(a.token,'Raelyn','explorer');manager.select(b.token,'Cooper','helper');manager.ready(a.token,true);manager.ready(b.token,true);
  for(let stage=1;stage<3;stage++){
   manager.act(b.token,{round:1,id:`g${stage}`,type:'grow',patch:0,stage});
  }
  manager.act(b.token,{round:1,id:'partial',type:'grow',patch:1,stage:0});
  store.close();store=new SqliteGameStore(join(dir,'games.sqlite'));
  const restarted=new RoomManager(store);const resumed=restarted.resume(a.token);assert.ok(resumed.ok);
  assert.deepEqual(resumed.room.mission.patches,[3]);assert.deepEqual(resumed.room.mission.basket,[0]);assert.equal(resumed.room.mission.complete,false);
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('legacy JSON imports once, preserving the original and later SQLite changes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cq-import-'));
 const legacy=join(dir,'games.json'),path=join(dir,'games.sqlite');
 let store:SqliteGameStore|undefined;
 try{
  const manager=new RoomManager();const a=manager.create();assert.ok(a.ok);
  const data={version:1 as const,rooms:[[a.room.code,a.room] as [string,typeof a.room]],sessions:[[a.token,{code:a.room.code,id:a.playerId}] as [string,{code:string;id:string}]]};
  writeFileSync(legacy,JSON.stringify(data));
  store=new SqliteGameStore(path,legacy);const restored=new RoomManager(store);assert.ok(restored.resume(a.token).ok);
  assert.ok(restored.select(a.token,'Raelyn','explorer').ok);store.close();
  // Even a subsequently damaged legacy file must not replace a committed SQLite snapshot.
  writeFileSync(legacy,'original backup is no longer valid JSON');
  store=new SqliteGameStore(path,legacy);assert.equal(store.load()?.rooms[0][1].players[0].name,'Raelyn');
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
test('a database transaction rolls back rooms and sessions together',()=>{
 const store=new SqliteGameStore(':memory:');
 try{
  const manager=new RoomManager(store);const a=manager.create();assert.ok(a.ok);
  const before=store.load()!;const invalid=structuredClone(before);
  invalid.rooms[0][1].players[0].name='Cooper';
  invalid.sessions.push(['invalid',{code:'missing',id:'missing'}]);
  assert.throws(()=>store.save(invalid));assert.deepEqual(store.load(),before);
 }finally{store.close();}
});
