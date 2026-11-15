import type { ActionResult, MissionAction, MissionState, Role } from '@critter-quest/shared';
type Context={state:MissionState;connected:boolean;role?:Role};
export function createMissionQueue(context:()=>Context,emit:(action:MissionAction,done:(error:Error|null,result?:ActionResult)=>void)=>void,report:(busy:boolean,error:string)=>void){
  let active:MissionAction|undefined;
  const waiting:MissionAction[]=[];
  let confirmed:MissionAction[]=[];
  const valid=(action:MissionAction)=>{
    const {state,connected,role}=context();
    if(!connected||state.complete||action.round!==state.round)return false;
    if(action.type==='grow')return role==='helper'&&state.patches[action.patch]===action.stage;
    if(action.type==='feed')return role==='explorer'&&state.basket.includes(action.carrot);
    return role==='explorer'&&!state.discovered;
  };
  const same=(a:MissionAction,b:MissionAction)=>a.round===b.round&&a.type===b.type&&
    (a.type==='grow'&&b.type==='grow'?a.patch===b.patch&&a.stage===b.stage:
      a.type==='feed'&&b.type==='feed'?a.carrot===b.carrot:true);
  const sync=()=>{
    const now=context();
    if(active&&(!now.connected||active.round!==now.state.round)){
      active=undefined;waiting.length=0;report(false,'');
    }
  };
  const drain=()=>{
    if(active)return;
    let next:MissionAction|undefined;
    while((next=waiting.shift())&&!valid(next)){/* Discard actions invalidated by newer server state. */}
    if(!next){report(false,'');return;}
    active=next;report(true,'');
    const sent=next;
    emit(sent,(error,result)=>{
      if(active!==sent)return;
      active=undefined;
      if(!error&&result?.ok)confirmed.push(sent);
      const current=context();
      const message=sent.round!==current.state.round?'':error?'Connection interrupted. Please try again.':result?.ok?'':result?.error||'Please try again.';
      if(error)waiting.length=0;
      if(waiting.length)drain();else report(false,message);
    });
  };
  return {
    sync,
    send(action:MissionAction){
      sync();
      confirmed=confirmed.filter(other=>other.round===context().state.round);
      if(!valid(action)||confirmed.some(other=>same(other,action))||active&&same(active,action)||waiting.some(other=>same(other,action)))return;
      waiting.push(action);drain();
    },
    get busy(){return !!active;},
  };
}
