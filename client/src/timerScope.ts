interface Timer {remove(dispatchCallback?:boolean):unknown}
/** Own delayed animation work so a new level can cancel it without reloading the scene. */
export function createTimerScope(delay:(ms:number,callback:()=>void)=>Timer){
  let generation=0;
  const timers=new Set<Timer>();
  return {
    schedule(ms:number,callback:()=>void){
      const scheduled=generation;
      const timer=delay(ms,()=>{
        timers.delete(timer);
        if(scheduled===generation)callback();
      });
      timers.add(timer);
    },
    clear(){generation++;for(const timer of timers)timer.remove(false);timers.clear();},
  };
}
