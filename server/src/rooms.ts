import type { GameStore, SavedGame } from './store.js';
import { createMission, applyMissionAction, nextHungerAt, animals } from './mission.js';
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
        if(room.mission.level===undefined){
          room.mission.level=3;
          room.mission.basket=room.mission.basket.map(id=>id+3);
          room.mission.fed=[0,1,2,...room.mission.fed.map(id=>id+3)];
        }
        room.mission.hungryAt ??= room.mission.complete?0:nextHungerAt();
        room.mission.round ??= 1;
        if(room.mission.complete&&room.mission.level===4&&room.mission.fed.length===7){
          room.mission.complete=false;room.mission.level=5;room.mission.round++;
          room.mission.patches=[1,1];room.mission.hungryAt=nextHungerAt();
        }
        if(room.mission.complete&&(room.mission.level%3===0&&room.mission.level<animals.length*3)){
          room.mission.complete=false;room.mission.level++;room.mission.round++;
          room.mission.patches=[1];room.mission.hungryAt=nextHungerAt();
          for(const member of room.players)member.role=member.role==='helper'?'explorer':'helper';
        }
        room.replayReady=[];
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
    if (room.players.length === 2 && room.players.every(p => p.connected && p.ready && p.name) && room.players[0].role !== room.players[1].role) {room.phase = 'started';room.mission.hungryAt=nextHungerAt();}
    return { ok: true };
  }
  private actMission(token: string, action: MissionAction): ActionResult {
    const { room, player } = this.locate(token);
    if (!room || !player?.connected || room.phase !== 'started') return { ok: false, error: 'Join your adventure first.' };
    const oldLevel=room.mission.level;
    const oldRound=room.mission.round;
    const result=applyMissionAction(room.mission, player.role, action);
    if(room.mission.round!==oldRound)room.replayReady=[];
    if(result.ok&&(oldLevel%3===0)&&room.mission.level===oldLevel+1){
      for(const member of room.players)member.role=member.role==='helper'?'explorer':'helper';
    }
    if(result.ok)for(const animal of room.mission.unlockedAnimals){
      if(!room.sanctuary.unlockedAnimals.includes(animal)){room.sanctuary.unlockedAnimals.push(animal);room.sanctuary.stars+=3;}
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
        if(Math.floor((room.mission.level-1)/3)%2===1)for(const member of room.players)member.role=member.role==='helper'?'explorer':'helper';
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
