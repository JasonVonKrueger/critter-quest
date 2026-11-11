import type { ActionResult, MissionAction, MissionState, Role } from '@critter-quest/shared';
export const animals=['bunny','snake','hawk','owl','bobcat','wolf'];
export const bunnyGarden = { carrotsRequired: 3, growthStages: 3, rewardStars: 3 };
export const levelOffset=(level:number)=>Math.floor((level-1)/3)*6+((level-1)%3)*(((level-1)%3)+1)/2;
export const levelCount=(level:number)=>(level-1)%3+1;
export function nextHungerAt(now=Date.now(),random=Math.random()){
  return now+10000+Math.floor(random*10001);
}
export function createMission(round=1): MissionState {
  return { level:1, hungryAt:nextHungerAt(), round, patches: [1], basket: [], fed: [], discovered: false, complete: false, stars: 0, unlockedAnimals: [] };
}
// Expected stages and stable carrot IDs make repeated or delayed packets harmless.
export function applyMissionAction(state: MissionState, role: Role, action: MissionAction): ActionResult {
  const fail = (error: string): ActionResult => ({ ok: false, error });
  if (!action || typeof action.id !== 'string' || !action.id.length || action.id.length > 100) return fail('Invalid action.');
  if(action.round!==state.round)return fail('That tap belongs to an earlier adventure.');
  if (state.complete) return fail('This adventure is complete!');
  if (action.type === 'discover') {
    if (role !== 'explorer') return fail('The explorer can greet the bunny.');
    state.discovered = true; return { ok: true };
  }
  if (action.type === 'grow') {
    if (role !== 'helper') return fail('The grower creates supplies.');
    const { patch, stage } = action;
    if (!Number.isInteger(patch) || patch < 0 || patch >= state.patches.length || !Number.isInteger(stage) || stage < 0 || stage >= bunnyGarden.growthStages) return fail('Invalid growing patch.');
    if (state.patches[patch] !== stage) return fail('That patch has already grown.');
    state.patches[patch]++;
    if (state.patches[patch] === bunnyGarden.growthStages) state.basket.push(levelOffset(state.level)+patch);
    return { ok: true };
  }
  if (action.type === 'feed') {
    if (role !== 'explorer') return fail('The feeder takes care of the animal.');
    const index = state.basket.indexOf(action.carrot);
    if (index < 0) return fail('That item has already been used or has not arrived.');
    state.basket.splice(index, 1); state.fed.push(action.carrot);
    state.hungryAt=nextHungerAt();
    if(state.fed.length===levelOffset(state.level)+levelCount(state.level)&&state.level<animals.length*3){
      state.level++;state.round++;
      state.patches=Array.from({length:levelCount(state.level)},()=>1);
      if((state.level-1)%3===0){
        const chapters=Math.floor((state.level-1)/3);
        state.stars=chapters*3;state.unlockedAnimals=animals.slice(0,chapters);
      }
    }
    if (state.level===animals.length*3&&state.fed.length === animals.length*6) {
      state.complete = true; state.hungryAt=0; state.stars = animals.length*3; state.unlockedAnimals = [...animals];
    }
    return { ok: true };
  }
  return fail('Unknown action.');
}
