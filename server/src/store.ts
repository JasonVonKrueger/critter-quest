import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RoomState } from '@critter-quest/shared';
export interface SavedGame {
  version: 1;
  rooms: [string, RoomState][];
  sessions: [string, {code:string;id:string}][];
}
export interface GameStore { load(): SavedGame | undefined; save(data:SavedGame): void }
/** One server process; atomic replacement avoids partially written saves. */
export class JsonGameStore implements GameStore {
  constructor(private path:string) {}
  load():SavedGame|undefined {
    if(!existsSync(this.path))return;
    const data=JSON.parse(readFileSync(this.path,'utf8')) as SavedGame;
    if(data.version!==1 || !Array.isArray(data.rooms) || !Array.isArray(data.sessions))throw new Error('Unsupported or invalid game save. Back up the save before changing it.');
    return data;
  }
  save(data:SavedGame){
    mkdirSync(dirname(this.path),{recursive:true});
    writeFileSync(`${this.path}.tmp`,JSON.stringify(data,null,2),{mode:0o600});
    renameSync(`${this.path}.tmp`,this.path);
  }
}
