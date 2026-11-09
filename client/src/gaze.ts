export type Gaze='forward'|'left'|'down'|'right';
/** Food has three fixed landing lanes; preserve the head pose and change eye direction only. */
export function foodGaze(actorX:number,foodX:number|null):Gaze{
  if(foodX===null)return 'forward';
  return foodX<actorX-30?'left':foodX>actorX+30?'right':'down';
}
