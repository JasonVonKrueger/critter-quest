import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Server } from 'socket.io';
import { io as client, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, RoomResult, RoomState } from '@critter-quest/shared';
import { registerConnections } from './connections.js';
import { RoomManager } from './rooms.js';
import { levelCount,levelOffset } from './mission.js';

test('room requests acknowledge retries without creating duplicate seats, and resume survives reconnect',{timeout:10000},async t=>{
 const http=createServer();const io=new Server<ClientEvents,ServerEvents>(http);
 const rooms=new RoomManager();registerConnections(io,rooms);
 const sockets:Socket<ServerEvents,ClientEvents>[]=[];
 t.after(()=>{for(const socket of sockets)socket.disconnect();io.close();});
 http.listen(0,'127.0.0.1');await once(http,'listening');
 const address=http.address();assert.ok(address&&typeof address==='object');
 const connect=async()=>{
  const socket:Socket<ServerEvents,ClientEvents>=client(`http://127.0.0.1:${address.port}`,{transports:['websocket'],forceNew:true});
  sockets.push(socket);await new Promise<void>(resolve=>socket.once('connect',resolve));return socket;
 };
 const first=await connect();
 const created:RoomResult=await first.timeout(2000).emitWithAck('room:create');assert.ok(created.ok);
 const retry:RoomResult=await first.timeout(2000).emitWithAck('room:create');assert.ok(retry.ok);
 assert.equal(retry.token,created.token);assert.equal(retry.room.players.length,1);
 const resumed:RoomResult=await first.timeout(2000).emitWithAck('room:resume',created.token);assert.ok(resumed.ok);
 assert.equal(resumed.playerId,created.playerId);
 const other=await connect();
 const joined:RoomResult=await other.timeout(2000).emitWithAck('room:join',created.room.code);assert.ok(joined.ok);
 const joinedAgain:RoomResult=await other.timeout(2000).emitWithAck('room:join',created.room.code);assert.ok(joinedAgain.ok);
 assert.equal(joinedAgain.token,joined.token);assert.equal(joinedAgain.room.players.length,2);
 const wrongRoom:RoomResult=await other.timeout(2000).emitWithAck('room:join','NOPE');assert.equal(wrongRoom.ok,false);
 const wrongSession:RoomResult=await other.timeout(2000).emitWithAck('room:resume',created.token);assert.equal(wrongSession.ok,false);
 first.disconnect();
 const reconnected=await connect();
 const restored:RoomResult=await reconnected.timeout(2000).emitWithAck('room:resume',created.token);assert.ok(restored.ok);
 assert.equal(restored.playerId,created.playerId);assert.equal(restored.room.players.length,2);
 // Taking over a seat disconnects its former socket but keeps the restored seat connected.
 const takeover=await connect();
 const kicked=new Promise<void>(resolve=>reconnected.once('disconnect',()=>resolve()));
 const moved:RoomResult=await takeover.timeout(2000).emitWithAck('room:resume',created.token);assert.ok(moved.ok);
 await kicked;assert.equal(moved.room.players.find(p=>p.id===created.playerId)?.connected,true);
 assert.equal(rooms.state(created.token)?.players.find(p=>p.id===created.playerId)?.connected,true);
 assert.ok((await takeover.timeout(2000).emitWithAck('player:select','Eater','explorer')).ok);
 assert.ok((await other.timeout(2000).emitWithAck('player:select','Grower','helper')).ok);
 assert.ok((await takeover.timeout(2000).emitWithAck('player:ready',true)).ok);
 assert.ok((await other.timeout(2000).emitWithAck('player:ready',true)).ok);
 let packet=0;
 // Exercise the actual socket handlers through every chapter and automatic role swap.
 for(let level=1;level<=21;level++){
  const room:RoomState=rooms.state(created.token)!;assert.equal(room.mission.level,level);
  const round=room.mission.round;
  const grower=room.players.find(p=>p.id===created.playerId)?.role==='helper'?takeover:other;
  const eater=grower===takeover?other:takeover;
  for(let patch=0;patch<levelCount(level);patch++){
   for(const stage of [1,2])assert.ok((await grower.timeout(2000).emitWithAck('mission:action',{round,id:String(++packet),type:'grow',patch,stage})).ok);
  }
  for(let patch=0;patch<levelCount(level);patch++)assert.ok((await eater.timeout(2000).emitWithAck('mission:action',{round,id:String(++packet),type:'feed',carrot:levelOffset(level)+patch})).ok);
 }
 assert.equal(rooms.state(created.token)?.mission.complete,true);

});
