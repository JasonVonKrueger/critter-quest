import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RoomState, RoomResult } from '@critter-quest/shared';
import { RoomManager } from './rooms.js';
import { levelCount, levelOffset } from './mission.js';

for(const firstRole of ['helper','explorer'] as const)test(`both jobs complete all 21 levels, starting as ${firstRole}`,()=>{
  const manager=new RoomManager();
  const first=manager.create();assert.ok(first.ok);
  const second=manager.join(first.room.code);assert.ok(second.ok);
  const otherRole=firstRole==='helper'?'explorer':'helper';
  assert.ok(manager.select(first.token,firstRole==='helper'?'Grower':'Eater',firstRole).ok);
  assert.ok(manager.select(second.token,otherRole==='helper'?'Grower':'Eater',otherRole).ok);
  assert.ok(manager.ready(first.token,true).ok);assert.ok(manager.ready(second.token,true).ok);
  let sequence=0;
  for(let level=1;level<=21;level++){
    const room:RoomState=manager.state(first.token)!;
    assert.equal(room.mission.level,level);
    assert.equal(room.mission.patches.length,levelCount(level));
    const grower:Extract<RoomResult,{ok:true}>=room.players[0].role==='helper'?first:second;
    const eater:Extract<RoomResult,{ok:true}>=grower===first?second:first;
    const round=room.mission.round;
    // Reconnection must preserve the current jobs and waterable patches.
    manager.disconnect(grower.token);assert.ok(manager.resume(grower.token).ok);
    for(let patch=0;patch<levelCount(level);patch++){
      assert.equal(room.mission.patches[patch],1);
      const water={round,id:String(++sequence),type:'grow' as const,patch,stage:1};
      assert.equal(manager.act(eater.token,water).ok,false);
      assert.ok(manager.act(grower.token,water).ok);
      assert.equal(manager.act(grower.token,water).ok,false);
      assert.ok(manager.act(grower.token,{...water,id:String(++sequence),stage:2}).ok);
    }
    for(let patch=0;patch<levelCount(level);patch++){
      assert.ok(manager.act(eater.token,{round,id:String(++sequence),type:'feed',carrot:levelOffset(level)+patch}).ok);
    }
    if(level<21){
      assert.equal(room.mission.round,round+1);
      assert.equal(manager.act(grower.token,{round,id:String(++sequence),type:'grow',patch:0,stage:1}).ok,false);
      assert.deepEqual(room.mission.patches,Array(levelCount(level+1)).fill(1));
      assert.equal(room.players.find(p=>p.id===grower.playerId)?.role,level%3===0?'explorer':'helper');
    }
  }
  const room:RoomState=manager.state(first.token)!;
  assert.equal(room.mission.complete,true);assert.equal(room.mission.fed.length,42);
  assert.equal(room.sanctuary.stars,21);
  assert.ok(manager.replay(first.token,room.mission.round,true).ok);
  assert.ok(manager.replay(second.token,room.mission.round,true).ok);
  assert.equal(room.mission.level,1);assert.deepEqual(room.mission.patches,[1]);
  assert.equal(room.players[0].role,firstRole);
});
