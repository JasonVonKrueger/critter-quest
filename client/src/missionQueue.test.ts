import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActionResult, MissionAction, MissionState, Role } from '@critter-quest/shared';
import { createMissionQueue } from './missionQueue';
function setup(){
 const state:MissionState={round:1,level:2,patches:[1,1],basket:[0,1],fed:[],discovered:false,complete:false,hungryAt:0,stars:0,unlockedAnimals:[]};
 const context={state,role:'helper' as Role,connected:true};
 const sent:MissionAction[]=[];
 const callbacks:((error:Error|null,result?:ActionResult)=>void)[]=[];
 const reports:{busy:boolean;error:string}[]=[];
 const queue=createMissionQueue(()=>context,(action,done)=>{sent.push(action);callbacks.push(done);},(busy,error)=>reports.push({busy,error}));
 const grow=(patch:number,id=String(patch)):MissionAction=>({round:1,type:'grow',id,patch,stage:1});
 return {state,context,sent,callbacks,reports,queue,grow};
}
test('rapid repeat taps never duplicate an in-flight action and other patches drain in order',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(0,'repeat'));s.queue.send(s.grow(1));
 assert.equal(s.sent.length,1);s.state.patches[0]=2;s.callbacks[0](null,{ok:true});
 assert.equal(s.sent.length,2);assert.deepEqual(s.sent[1],s.grow(1));
 s.callbacks[1](null,{ok:true});assert.equal(s.queue.busy,false);
});
test('level and role changes discard queued actions and suppress old failures',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(1));
 s.state.round++;s.context.role='explorer';s.callbacks[0](null,{ok:false,error:'Old patch'});
 assert.equal(s.sent.length,1);assert.deepEqual(s.reports.at(-1),{busy:false,error:''});
});
test('new authoritative state invalidates queued patches even within the same level',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(1));s.state.patches[1]=2;
 s.callbacks[0](null,{ok:true});assert.equal(s.sent.length,1);assert.equal(s.queue.busy,false);
});
test('connection failures clear waiting taps and allow an explicit retry',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(1));s.callbacks[0](new Error('timeout'));
 assert.equal(s.sent.length,1);assert.match(s.reports.at(-1)!.error,/Connection interrupted/);
 s.queue.send(s.grow(1));assert.equal(s.sent.length,2);
});
test('eater actions deduplicate food taps and reject wrong-role and consumed items',()=>{
 const s=setup();s.context.role='explorer';s.queue.send(s.grow(0));assert.equal(s.sent.length,0);
 const feed=(carrot:number):MissionAction=>({round:1,id:String(carrot),type:'feed',carrot});
 s.queue.send(feed(0));s.queue.send(feed(0));s.queue.send(feed(1));s.state.basket=[];
 s.callbacks[0](null,{ok:true});assert.equal(s.sent.length,1);
 s.queue.send(feed(1));assert.equal(s.sent.length,1);
});

test('acknowledgement arriving before the UI update cannot resend the same tap',()=>{
 const s=setup();s.queue.send(s.grow(0));s.callbacks[0](null,{ok:true});
 // The render still contains stage 1 until React processes the room-state event.
 s.queue.send(s.grow(0,'second tap'));assert.equal(s.sent.length,1);
});

test('a new round releases an old in-flight request and its late acknowledgement cannot finish a new request',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(1));
 s.state.round=2;s.queue.sync();assert.equal(s.queue.busy,false);
 s.queue.send({...s.grow(0),round:2});assert.equal(s.sent.length,2);
 s.callbacks[0](new Error('old timeout'));assert.equal(s.queue.busy,true);
 assert.deepEqual(s.reports.at(-1),{busy:true,error:''});
 s.callbacks[1](null,{ok:true});assert.equal(s.queue.busy,false);
});
test('disconnect discards waiting actions and permits fresh taps after restoration',()=>{
 const s=setup();s.queue.send(s.grow(0));s.queue.send(s.grow(1));
 s.context.connected=false;s.queue.sync();assert.equal(s.queue.busy,false);
 s.context.connected=true;s.queue.send(s.grow(1,'retry'));assert.equal(s.sent.length,2);
 s.callbacks[0](null,{ok:true});assert.equal(s.queue.busy,true);
 s.callbacks[1](null,{ok:true});assert.equal(s.queue.busy,false);
});
