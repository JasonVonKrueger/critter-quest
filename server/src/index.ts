import { resolve } from 'node:path';
import { SqliteGameStore } from './store.js';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@critter-quest/shared';
import { RoomManager } from './rooms.js';
import { registerConnections } from './connections.js';
const app = express();
const http = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(http, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' } });
const store = new SqliteGameStore(
  resolve(process.env.DATABASE_FILE || 'data/games.sqlite'),
  resolve(process.env.LEGACY_DATA_FILE || process.env.DATA_FILE || 'data/games.json'),
);
const rooms = new RoomManager(store);
app.get('/api/health', (_req, res) => res.json({ ok: true, game: 'Critter Quest' }));
registerConnections(io,rooms);
const port = Number(process.env.PORT || 3001);
http.listen(port, '0.0.0.0', () => console.log(`Critter Quest server: http://localhost:${port}`));

let stopping=false;
function shutdown(){
  if(stopping)return;stopping=true;
  io.close(()=>{store.close();process.exit(0);});
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
