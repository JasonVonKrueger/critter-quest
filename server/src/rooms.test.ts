import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from './rooms.js';
test('creates a room, assigns complementary roles, and rejects a third player',()=>{
 const manager=new RoomManager(); const first=manager.create(); assert.ok(first.ok);
 assert.equal(first.room.players[0].role,'explorer');
 const second=manager.join(first.room.code.toLowerCase()); assert.ok(second.ok);
 assert.equal(second.room.players[1].role,'helper'); assert.equal(second.room.phase,'ready');
 assert.equal(manager.join(first.room.code).ok,false);
});
test('rejects missing rooms and restores the same player on reconnection',()=>{
 const manager=new RoomManager(); assert.equal(manager.join('NOPE').ok,false); assert.equal(manager.resume('bad').ok,false);
 const first=manager.create(); assert.ok(first.ok); const id=first.room.players[0].id;
 manager.disconnect(first.token); assert.equal(first.room.players[0].connected,false);
 const resumed=manager.resume(first.token); assert.ok(resumed.ok); assert.equal(resumed.room.players[0].id,id); assert.equal(resumed.room.players.length,1); assert.equal(resumed.room.players[0].connected,true);
});
test('selection is validated and names and roles are exclusive', () => {
 const manager = new RoomManager(); const a = manager.create(); assert.ok(a.ok);
 const b = manager.join(a.room.code); assert.ok(b.ok);
 assert.equal(manager.ready(a.token, true).ok, false);
 assert.equal(manager.select('bad', 'Raelyn', 'explorer').ok, false);
 assert.equal(manager.select(a.token, 'Other' as 'Raelyn', 'explorer').ok, false);
 assert.equal(manager.select(a.token, 'Raelyn', 'wizard' as 'explorer').ok, false);
 assert.ok(manager.select(a.token, 'Raelyn', 'helper').ok);
 assert.equal(manager.select(b.token, 'Raelyn', 'explorer').ok, false);
 assert.equal(manager.select(b.token, 'Cooper', 'helper').ok, false);
 assert.ok(manager.select(b.token, 'Cooper', 'explorer').ok);
 assert.ok(manager.ready(a.token, true).ok); assert.equal(a.room.phase, 'ready');
 assert.ok(manager.ready(b.token, true).ok); assert.equal(a.room.phase, 'started');
 assert.equal(manager.select(a.token, 'Cooper', 'explorer').ok, false);
 assert.ok(manager.ready(a.token, true).ok); assert.equal(a.room.phase, 'started');
});
test('disconnect before start resets readiness; reconnect retains identity and role', () => {
 const manager = new RoomManager(); const a = manager.create(); assert.ok(a.ok);
 const b = manager.join(a.room.code); assert.ok(b.ok);
 manager.select(a.token, 'Raelyn', 'explorer'); manager.select(b.token, 'Cooper', 'helper');
 manager.ready(a.token, true); manager.disconnect(a.token);
 assert.equal(manager.ready(b.token, true).ok, true); assert.equal(a.room.phase, 'ready');
 assert.equal(manager.ready(a.token, true).ok, false);
 const resumed = manager.resume(a.token); assert.ok(resumed.ok);
 assert.equal(resumed.playerId, a.playerId); assert.equal(resumed.room.players[0].name, 'Raelyn');
 assert.equal(resumed.room.players[0].ready, false);
 manager.ready(a.token, true); assert.equal(a.room.phase, 'started');
 manager.disconnect(a.token); manager.resume(a.token); assert.equal(a.room.phase, 'started');
});
test('changing selection clears readiness and invalid ready payloads are rejected', () => {
 const manager = new RoomManager(); const a = manager.create(); assert.ok(a.ok);
 manager.select(a.token, 'Raelyn', 'explorer'); manager.ready(a.token, true);
 manager.select(a.token, 'Cooper', 'helper'); assert.equal(a.room.players[0].ready, false);
 assert.equal(manager.ready(a.token, 'yes' as unknown as boolean).ok, false);
});
test('hugs require a connected room member and enforce cooldown across reconnects',()=>{
 const manager=new RoomManager();assert.equal(manager.hug('missing',0).ok,false);
 const a=manager.create();assert.ok(a.ok);const b=manager.join(a.room.code);assert.ok(b.ok);
 assert.ok(manager.hug(a.token,0).ok);assert.equal(manager.hug(a.token,2999).ok,false);
 assert.ok(manager.hug(b.token,1000).ok);
 manager.disconnect(a.token);assert.equal(manager.hug(a.token,3000).ok,false);
 manager.resume(a.token);assert.equal(manager.hug(a.token,2000).ok,false);assert.ok(manager.hug(a.token,3000).ok);
});
