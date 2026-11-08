export type Role = 'explorer' | 'helper';
export type PlayerName = 'Raelyn' | 'Cooper';
export interface Player { id: string; role: Role; name?: PlayerName; ready: boolean; connected: boolean }
export interface SanctuaryState { stars:number; unlockedAnimals:string[] }
export interface RoomState { sanctuary:SanctuaryState; replayReady:string[]; code: string; players: Player[]; mission: MissionState; phase: 'waiting' | 'ready' | 'started' }
export type RoomResult = { ok: true; room: RoomState; token: string; playerId: string } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };
export interface ClientEvents {
  'mission:replay': (round:number, ready:boolean, reply:(result:ActionResult)=>void) => void;
  'hug:send': (reply: (result: ActionResult) => void) => void;
  'mission:action': (action: MissionAction, reply: (result: ActionResult) => void) => void;
  'player:select': (name: PlayerName, role: Role, reply: (result: ActionResult) => void) => void;
  'player:ready': (ready: boolean, reply: (result: ActionResult) => void) => void;
  'room:create': (reply: (result: RoomResult) => void) => void;
  'room:join': (code: string, reply: (result: RoomResult) => void) => void;
  'room:resume': (token: string, reply: (result: RoomResult) => void) => void;
}
export interface ServerEvents { 'hug:received': () => void; 'room:state': (room: RoomState) => void }
export interface MissionState { level:number; hungryAt:number; round:number; patches: number[]; basket: number[]; fed: number[]; discovered: boolean; complete: boolean; stars: number; unlockedAnimals: string[] }
export type MissionAction = {round:number} & ({ id: string; type: 'discover' } | { id: string; type: 'grow'; patch: number; stage: number } | { id: string; type: 'feed'; carrot: number });
