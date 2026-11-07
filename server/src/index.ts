import { resolve } from 'node:path';
import { SqliteGameStore } from './store.js';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientEvents, ServerEvents, RoomResult } from '@critter-quest/shared';
import { RoomManager } from './rooms.js';
const app = express();
const http = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(http, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' } });
const store = new SqliteGameStore(
  resolve(process.env.DATABASE_FILE || 'data/games.sqlite'),
  resolve(process.env.LEGACY_DATA_FILE || process.env.DATA_FILE || 'data/games.json'),
);
const rooms = new RoomManager(store);
const owners = new Map<string, string>();
app.get('/api/health', (_req, res) => res.json({ ok: true, game: 'Critter Quest' }));
io.on('connection', socket => {
  let token: string | undefined;
  const accept = (result: RoomResult, reply: (r: RoomResult) => void) => {
    if (result.ok) {
      token = result.token;
      const previous = owners.get(token);
      owners.set(token, socket.id);
      if (previous && previous !== socket.id) io.sockets.sockets.get(previous)?.disconnect(true);
      void socket.join(result.room.code);
      io.to(result.room.code).emit('room:state', result.room);
    }
    reply(result);
  };
  socket.on('room:create', reply => { if (typeof reply === 'function' && !token) accept(rooms.create(), reply); });
  socket.on('room:join', (code, reply) => { if (typeof reply === 'function' && !token) accept(rooms.join(code), reply); });
  socket.on('room:resume', (session, reply) => { if (typeof reply === 'function' && !token) accept(rooms.resume(session), reply); });
  socket.on('player:select', (name, role, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.select(token, name, role) : { ok: false as const, error: 'Join a garden first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('player:ready', (ready, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.ready(token, ready) : { ok: false as const, error: 'Join a garden first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('mission:action', (action, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.act(token, action) : { ok: false as const, error: 'Join a garden first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('mission:replay', (round,ready,reply)=>{
    if(typeof reply!=='function')return;
    const result=token?rooms.replay(token,round,ready):{ok:false as const,error:'Join a garden first.'};
    if(result.ok&&token){const room=rooms.state(token);if(room)io.to(room.code).emit('room:state',room);}
    reply(result);
  });
  socket.on('hug:send', reply => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.hug(token) : {ok:false as const,error:'Join a garden first.'};
    if (result.ok && token) { const room=rooms.state(token); if(room) socket.to(room.code).emit('hug:received'); }
    reply(result);
  });
  socket.on('disconnect', () => {
    if (token && owners.get(token) === socket.id) {
      owners.delete(token);
      const room = rooms.disconnect(token);
      if (room) io.to(room.code).emit('room:state', room);
    }
  });
});
const port = Number(process.env.PORT || 3001);
http.listen(port, '0.0.0.0', () => console.log(`Critter Quest server: http://localhost:${port}`));

let stopping=false;
function shutdown(){
  if(stopping)return;stopping=true;
  io.close(()=>{store.close();process.exit(0);});
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
