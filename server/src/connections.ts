import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents, RoomResult } from '@critter-quest/shared';
import type { RoomManager } from './rooms.js';

export function registerConnections(io:Server<ClientEvents,ServerEvents>,rooms:RoomManager){
  const owners=new Map<string,string>();
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
  socket.on('room:create', reply => { if (typeof reply === 'function') accept(token?rooms.resume(token):rooms.create(), reply); });
  socket.on('room:join', (code, reply) => { if (typeof reply === 'function') {
    if(token){
      const room=rooms.state(token);
      if(typeof code!=='string'||room?.code!==code.trim().toUpperCase()){reply({ok:false,error:'You’re already in a game. Go home to join another.'});return;}
    }
    accept(token?rooms.resume(token):rooms.join(code),reply);
  } });
  socket.on('room:resume', (session, reply) => { if (typeof reply === 'function') {
    if(token&&token!==session){reply({ok:false,error:'You’re already in a game. Go home to join another.'});return;}
    accept(rooms.resume(session),reply);
  } });
  socket.on('player:select', (name, role, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.select(token, name, role) : { ok: false as const, error: 'Join a game first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('player:ready', (ready, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.ready(token, ready) : { ok: false as const, error: 'Join a game first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('mission:action', (action, reply) => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.act(token, action) : { ok: false as const, error: 'Join a game first.' };
    if (result.ok && token) { const room = rooms.state(token); if (room) io.to(room.code).emit('room:state', room); }
    reply(result);
  });
  socket.on('mission:replay', (round,ready,reply)=>{
    if(typeof reply!=='function')return;
    const result=token?rooms.replay(token,round,ready):{ok:false as const,error:'Join a game first.'};
    if(result.ok&&token){const room=rooms.state(token);if(room)io.to(room.code).emit('room:state',room);}
    reply(result);
  });
  socket.on('hug:send', reply => {
    if (typeof reply !== 'function') return;
    const result = token ? rooms.hug(token) : {ok:false as const,error:'Join a game first.'};
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
}
