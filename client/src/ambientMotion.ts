import type { Environment } from './environment';
export const isNightScene=(kind:Environment)=>kind==='moonlit'||kind==='pine';
export interface AmbientInsect {x:number;y:number;baseY:number;direction:number;speed:number;elapsed:number;phase:number}
export function advanceInsect(insect:AmbientInsect,delta:number,night:boolean){
  // Returning from a background tab must not teleport the insects.
  const step=Math.max(0,Math.min(delta,100));
  insect.elapsed+=step;
  insect.x+=insect.direction*insect.speed*step/1000;
  if(insect.x>475){insect.x=475;insect.direction=-1;}
  if(insect.x<25){insect.x=25;insect.direction=1;}
  insect.y=insect.baseY+(night?Math.sin(insect.elapsed/1300+insect.phase)*12:0);
}
