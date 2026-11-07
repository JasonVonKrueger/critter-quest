import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { RoomState } from '@critter-quest/shared';
export interface SavedGame {
  version: 1;
  rooms: [string, RoomState][];
  sessions: [string, {code:string;id:string}][];
}
export interface GameStore { load(): SavedGame | undefined; save(data:SavedGame): void }

/** Atomic room/session snapshots. RoomManager remains the single state authority. */
export class SqliteGameStore implements GameStore {
  private db: Database.Database;
  constructor(path:string, legacyJsonPath?:string) {
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new Database(path);
    try {
      if(path!==':memory:')for(const file of [path,`${path}-wal`,`${path}-shm`])if(existsSync(file))chmodSync(file,0o600);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = FULL');
      this.db.pragma('foreign_keys = ON');
      const version=this.db.pragma('user_version',{simple:true});
      if(version!==0&&version!==1)throw new Error('Unsupported database version. Back up the database before changing it.');
      this.db.transaction(()=>{
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL CHECK(json_valid(state)));
          CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, room_code TEXT NOT NULL REFERENCES rooms(code), player_id TEXT NOT NULL);
          CREATE INDEX IF NOT EXISTS sessions_room ON sessions(room_code);
          CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          PRAGMA user_version = 1;
        `);
      })();
      // Import once, only into a store without a committed snapshot. Leave the source untouched.
      if(!this.load()&&legacyJsonPath&&existsSync(legacyJsonPath)) {
        const data=JSON.parse(readFileSync(legacyJsonPath,'utf8')) as SavedGame;
        this.save(data);
      }
    } catch(error) { this.db.close();throw error; }
  }
  load():SavedGame|undefined {
    if(!this.db.prepare("SELECT value FROM metadata WHERE key='initialized'").get())return;
    const rooms=this.db.prepare('SELECT code, state FROM rooms ORDER BY rowid').all() as {code:string;state:string}[];
    const sessions=this.db.prepare('SELECT token, room_code, player_id FROM sessions ORDER BY rowid').all() as {token:string;room_code:string;player_id:string}[];
    return {version:1,rooms:rooms.map(row=>[row.code,JSON.parse(row.state) as RoomState]),sessions:sessions.map(row=>[row.token,{code:row.room_code,id:row.player_id}])};
  }
  save(data:SavedGame):void {
    if(data.version!==1||!Array.isArray(data.rooms)||!Array.isArray(data.sessions))throw new Error('Unsupported or invalid game save.');
    const insertRoom=this.db.prepare('INSERT INTO rooms(code,state) VALUES (?,?)');
    const insertSession=this.db.prepare('INSERT INTO sessions(token,room_code,player_id) VALUES (?,?,?)');
    this.db.transaction(()=>{
      this.db.prepare('DELETE FROM sessions').run();
      this.db.prepare('DELETE FROM rooms').run();
      for(const [code,room] of data.rooms){
        if(room.code!==code||!Array.isArray(room.players)||!room.mission)throw new Error('Invalid room in game save.');
        insertRoom.run(code,JSON.stringify(room));
      }
      for(const [token,session] of data.sessions){
        const room=data.rooms.find(([code])=>code===session.code)?.[1];
        if(!room?.players.some(player=>player.id===session.id))throw new Error('Invalid player session in game save.');
        insertSession.run(token,session.code,session.id);
      }
      this.db.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES ('initialized','1')").run();
    })();
  }
  close():void { if(this.db.open)this.db.close(); }
}
