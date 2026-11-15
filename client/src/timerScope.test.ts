import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimerScope } from './timerScope';
test('a level reset cancels all pending water drops and completion without blocking new pours',()=>{
 const pending:{callback:()=>void;cancelled:boolean}[]=[];
 const scope=createTimerScope((_ms,callback)=>{
  const item={callback,cancelled:false};pending.push(item);
  return {remove(){item.cancelled=true;}};
 });
 let watered=0,drops=0;
 scope.schedule(40,()=>drops++);scope.schedule(1000,()=>watered++);
 scope.clear();assert.ok(pending.every(timer=>timer.cancelled));
 // Even a callback already queued by the runtime must not affect the new level.
 for(const timer of pending)timer.callback();assert.equal(watered,0);assert.equal(drops,0);
 scope.schedule(1000,()=>watered++);pending[2].callback();assert.equal(watered,1);
});
test('clearing a scope does not remove timers that have already completed',()=>{
 let run:()=>void=()=>{};let removed=0;
 const scope=createTimerScope((_ms,callback)=>{run=callback;return {remove(){removed++;}};});
 let completed=0;scope.schedule(1,()=>completed++);run();scope.clear();
 assert.equal(completed,1);assert.equal(removed,0);
});
