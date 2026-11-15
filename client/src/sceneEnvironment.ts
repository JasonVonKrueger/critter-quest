import type { Role } from '@critter-quest/shared';
import type { Environment } from './environment';

/** The grower raises the previous chapter's animal; the eater lives in the current habitat. */
export function sceneEnvironment(level:number,role:Role):Environment{
  const chapter=Math.min(6,Math.max(0,Math.floor((level-1)/3)));
  const habitats:Environment[]=['meadow','jungle','mountain','moonlit','woodland','pine','ridge'];
  return role==='helper'?(chapter===0?'garden':habitats[chapter-1]):habitats[chapter];
}
