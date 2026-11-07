import type { ActionResult, MissionAction, MissionState, Role } from '@critter-quest/shared';
export const bunnyGarden = { carrotsRequired: 3, growthStages: 3, rewardStars: 3 };
export function createMission(round=1): MissionState {
  return { round, patches: [1,1,1], basket: [], fed: [], discovered: false, complete: false, stars: 0, unlockedAnimals: [] };
}
// Expected stages and stable carrot IDs make repeated or delayed packets harmless.
export function applyMissionAction(state: MissionState, role: Role, action: MissionAction): ActionResult {
  const fail = (error: string): ActionResult => ({ ok: false, error });
  if (!action || typeof action.id !== 'string' || !action.id.length || action.id.length > 100) return fail('Invalid action.');
  if(action.round!==state.round)return fail('That tap belongs to an earlier adventure.');
  if (state.complete) return fail('The bunny is already happy!');
  if (action.type === 'discover') {
    if (role !== 'explorer') return fail('The explorer can greet the bunny.');
    state.discovered = true; return { ok: true };
  }
  if (action.type === 'grow') {
    if (role !== 'helper') return fail('The helper grows carrots.');
    const { patch, stage } = action;
    if (!Number.isInteger(patch) || patch < 0 || patch >= state.patches.length || !Number.isInteger(stage) || stage < 0 || stage >= bunnyGarden.growthStages) return fail('Invalid carrot patch.');
    if (state.patches[patch] !== stage) return fail('That patch has already grown.');
    state.patches[patch]++;
    if (state.patches[patch] === bunnyGarden.growthStages) state.basket.push(patch);
    return { ok: true };
  }
  if (action.type === 'feed') {
    if (role !== 'explorer') return fail('The explorer feeds the bunny.');
    if (!state.discovered) return fail('Tap the bunny to say hello first.');
    const index = state.basket.indexOf(action.carrot);
    if (index < 0) return fail('That carrot is not in your basket.');
    state.basket.splice(index, 1); state.fed.push(action.carrot);
    if (state.fed.length === bunnyGarden.carrotsRequired) {
      state.complete = true; state.stars = bunnyGarden.rewardStars; state.unlockedAnimals = ['bunny'];
    }
    return { ok: true };
  }
  return fail('Unknown action.');
}
