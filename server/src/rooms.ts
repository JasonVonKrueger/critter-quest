import type { GameStore, SavedGame } from './store.js';
import { createMission, applyMissionAction } from './mission.js';
import type { MissionAction } from '@critter-quest/shared';
import { randomBytes, randomUUID } from 'node:crypto';
import type { RoomState, RoomResult, PlayerName, Role, ActionResult } from '@critter-quest/shared';
export class RoomManager {
  private hugs = new Map<string, number>();
  private rooms = new Map<string, RoomState>();
  private sessions = new Map<string, { code: string; id: string }>();
  constructor(private store?: GameStore) {
    const data=store?.load();
    if(data){
      this.rooms=new Map(data.rooms);this.sessions=new Map(data.sessions);
      for(const room of this.rooms.values()){
        // Upgrade saves made before replay and independent sanctuary progress.
        room.sanctuary ??= {stars:room.mission.stars,unlockedAnimals:[...room.mission.unlockedAnimals]};
        Reflect.deleteProperty(room.mission,'water');Reflect.deleteProperty(room.mission,'waterVersion');
        room.mission.patches=room.mission.patches.map(stage=>stage===0?1:stage);
        room.mission.round ??= 1;room.replayReady=[];
        for(const player of room.players){player.connected=false;if(room.phase!=='started')player.ready=false;}
      }
    }
  }
  private snapshot():SavedGame{return structuredClone({version:1,rooms:[...this.rooms],sessions:[...this.sessions]});}
  private transaction<T extends {ok:boolean}>(run:()=>T):T | {ok:false;error:string}{
    const before=this.snapshot();
    const result=run();
    if(result.ok && this.store)try{this.store.save(this.snapshot());}catch(error){
      this.rooms=new Map(before.rooms);this.sessions=new Map(before.sessions);
      console.error('Could not save game progress:',error);
      return {ok:false,error:'Your garden could not save. Please try again.'};
    }
    return result;
  }
  create():RoomResult{return this.transaction(()=>this.createRoom());}
  join(code:string):RoomResult{return this.transaction(()=>this.joinRoom(code));}
  resume(token:string):RoomResult{return this.transaction(()=>this.resumeRoom(token));}
  select(token:string,name:PlayerName,role:Role):ActionResult{return this.transaction(()=>this.selectPlayer(token,name,role));}
  ready(token:string,ready:boolean):ActionResult{return this.transaction(()=>this.readyPlayer(token,ready));}
  act(token:string,action:MissionAction):ActionResult{return this.transaction(()=>this.actMission(token,action));}
  disconnect(token:string):RoomState|undefined{
    // Connection presence is reconstructed on startup; no disk write is needed.
    return this.disconnectPlayer(token);
  }
  private createRoom(): RoomResult {
    let code: string;
    do { code = randomBytes(3).toString('hex').toUpperCase(); } while (this.rooms.has(code));
    this.rooms.set(code, { code, players: [], phase: 'waiting', mission: createMission(), sanctuary:{stars:0,unlockedAnimals:[]}, replayReady:[] });
    return this.joinRoom(code);
  }
  private joinRoom(input: string): RoomResult {
    if (typeof input !== 'string') return { ok: false, error: 'Please enter a room code.' };
    const room = this.rooms.get(input.trim().toUpperCase());
    if (!room) return { ok: false, error: 'We couldn’t find that garden. Check your code.' };
    if (room.players.length >= 2) return { ok: false, error: 'This garden already has two friends.' };
    const id = randomUUID(), token = randomBytes(24).toString('hex');
    room.players.push({ id, role: room.players.length ? 'helper' : 'explorer', connected: true, ready: false });
    room.phase = room.players.length === 2 ? 'ready' : 'waiting';
    this.sessions.set(token, { code: room.code, id });
    return { ok: true, room, token, playerId: id };
  }
  private resumeRoom(token: string): RoomResult {
    const session = this.sessions.get(token);
    const room = session && this.rooms.get(session.code);
    const player = room?.players.find(p => p.id === session?.id);
    if (!room || !player) return { ok: false, error: 'Your garden has closed. Please create or join a new one.' };
    player.connected = true;
    return { ok: true, room, token, playerId: player.id };
  }
  private locate(token: string) {
    const session = this.sessions.get(token);
    const room = session && this.rooms.get(session.code);
    const player = room?.players.find(p => p.id === session?.id);
    return { room, player };
  }
  state(token: string): RoomState | undefined { return this.locate(token).room; }
  private selectPlayer(token: string, name: PlayerName, role: Role): ActionResult {
    const { room, player } = this.locate(token);
    if (!room || !player || !player.connected) return { ok: false, error: 'Reconnect to your garden first.' };
    if (room.phase === 'started') return { ok: false, error: 'The adventure has already started.' };
    if (!['Raelyn', 'Cooper'].includes(name) || !['explorer', 'helper'].includes(role)) return { ok: false, error: 'Choose a name and role.' };
    if (room.players.some(p => p.id !== player.id && p.name === name)) return { ok: false, error: 'Your friend has already picked that name.' };
    if (room.players.some(p => p.id !== player.id && p.name && p.role === role)) return { ok: false, error: 'Your friend has already picked that role.' };
    if (player.name !== name || player.role !== role) player.ready = false;
    player.name = name;
    player.role = role;
    return { ok: true };
  }
  private readyPlayer(token: string, ready: boolean): ActionResult {
    const { room, player } = this.locate(token);
    if (!room || !player || !player.connected) return { ok: false, error: 'Reconnect to your garden first.' };
    if (typeof ready !== 'boolean') return { ok: false, error: 'Invalid ready state.' };
    if (room.phase === 'started') return { ok: true };
    if (!player.name) return { ok: false, error: 'Choose your name and role first.' };
    player.ready = ready;
    if (room.players.length === 2 && room.players.every(p => p.connected && p.ready && p.name) && room.players[0].role !== room.players[1].role) room.phase = 'started';
    return { ok: true };
  }
  private actMission(token: string, action: MissionAction): ActionResult {
    const { room, player } = this.locate(token);
    if (!room || !player?.connected || room.phase !== 'started') return { ok: false, error: 'Join your adventure first.' };
    const result=applyMissionAction(room.mission, player.role, action);
    if(result.ok&&room.mission.complete&&!room.sanctuary.unlockedAnimals.includes('bunny')){
      room.sanctuary.unlockedAnimals.push('bunny');room.sanctuary.stars+=room.mission.stars;
    }
    return result;
  }
  replay(token:string,round:number,ready:boolean):ActionResult {
    return this.transaction(()=>{
      const {room,player}=this.locate(token);
      if(!room||!player?.connected||room.phase!=='started')return {ok:false,error:'Join your adventure first.'};
      if(round!==room.mission.round||typeof ready!=='boolean')return {ok:false,error:'That request belongs to a different round.'};
      room.replayReady=room.replayReady.filter(id=>id!==player.id);
      if(ready)room.replayReady.push(player.id);
      if(room.players.length===2&&room.players.every(p=>p.connected&&room.replayReady.includes(p.id))){
        room.mission=createMission(room.mission.round+1);room.replayReady=[];
      }
      return {ok:true};
    });
  }
  hug(token: string, now = Date.now()): ActionResult {
    const {room, player} = this.locate(token);
    if (!room || !player?.connected) return {ok:false,error:'Join your garden first.'};
    if (now - (this.hugs.get(token) ?? -Infinity) < 3000) return {ok:false,error:'A little moment between hugs!'};
    this.hugs.set(token,now);
    return {ok:true};
  }
  private disconnectPlayer(token: string): RoomState | undefined {
    const session = this.sessions.get(token), room = session && this.rooms.get(session.code);
    const player = room?.players.find(p => p.id === session?.id);
    if (player) { if(room)room.replayReady=room.replayReady.filter(id=>id!==player.id); player.connected = false; if (room?.phase !== 'started') player.ready = false; }
    return room;
  }
}
