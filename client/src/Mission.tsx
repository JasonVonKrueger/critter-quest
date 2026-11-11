import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientEvents, MissionAction, RoomState, ServerEvents } from '@critter-quest/shared';
import { levelOffset } from './levels';
import { goHome } from './navigation';
import { AudioManager } from './audio';
import MissionWorld from './MissionWorld';
interface Props {room:RoomState;playerId:string;connected:boolean;socket:Socket<ServerEvents,ClientEvents>}
export default function Mission({room,playerId,connected,socket}:Props){
  const me=room.players.find(p=>p.id===playerId);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [sanctuary,setSanctuary]=useState(false);
  const pending=useRef(false);
  const queuedWater=useRef<MissionAction|null>(null);
  const [audio]=useState(()=>new AudioManager());
  const [muted,setMuted]=useState(audio.muted),[hug,setHug]=useState(0),[hugWaiting,setHugWaiting]=useState(false);
  const hugTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const state=room.mission;
  const [hungry,setHungry]=useState(false);
  useEffect(()=>{
    if(state.complete||!state.hungryAt){setHungry(false);return;}
    const check=()=>setHungry(Date.now()>=state.hungryAt);
    check();
    const timer=setTimeout(check,Math.max(0,state.hungryAt-Date.now()));
    const visible=()=>{if(!document.hidden)check();};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[state.hungryAt,state.round,state.complete]);
  useEffect(()=>{setSanctuary(false);setError('');},[state.round]);
  useEffect(()=>{document.body.classList.add('playing');return()=>document.body.classList.remove('playing');},[]);
  const send=(action:MissionAction)=>{
    if(!connected||pending.current||!me||state.complete)return;
    audio.unlock();
    pending.current=true;setBusy(true);setError('');
    socket.timeout(7000).emit('mission:action',action,(err,result)=>{
      pending.current=false;setBusy(false);setError(err?'Reconnecting? Your progress is saved. Try again when connected.':result.ok?'':result.error);
      const queued=queuedWater.current;queuedWater.current=null;
      if(!err&&result.ok&&queued)send(queued);
    });
  };
  const tap=(patch?:number)=>{
    const id=crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    if(me?.role==='helper'&&patch!==undefined&&state.patches[patch]===1){setError('Drag the blue watering can onto this patch!');return;}
    if(me?.role==='helper'&&patch!==undefined&&state.patches[patch]<3)send({round:state.round,id,type:'grow',patch,stage:state.patches[patch]});
    else if(me?.role==='explorer'){
      if(!state.discovered)send({round:state.round,id,type:'discover'});
      else {audio.unlock();}
    }
  };
  const feed=(carrot:number)=>{
    if(me?.role!=='explorer'||!state.basket.includes(carrot))return;
    send({round:state.round,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,type:'feed',carrot});
  };
  const water=(patch:number)=>{
    if(me?.role==='helper'&&state.patches[patch]===1){
      const action:MissionAction={round:state.round,id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,type:'grow',patch,stage:1};
      if(pending.current)queuedWater.current=action;else send(action);
    }
  };
  const wolf=state.level>=16;
  const bobcat=state.level>=13&&state.level<=15;
  const owl=state.level>=10&&state.level<=12;
  const hawk=state.level>=7&&state.level<=9;
  const snake=state.level>=4&&state.level<=6;
  const helper=me?.role==='helper';
  useEffect(()=>{
    const receive=()=>{setHug(n=>n+1);audio.chime('gift');};
    socket.on('hug:received',receive);
    return()=>{socket.off('hug:received',receive);clearTimeout(hugTimer.current);audio.stop();};
  },[socket,audio]);
  const previous=useRef(state);
  useEffect(()=>{
    const before=previous.current;
    if(state.complete&&!before.complete)audio.chime('win');
    previous.current=state;
  },[state,audio]);
  const sendHug=()=>{
    if(!connected||hugWaiting)return;
    audio.unlock();setHugWaiting(true);
    hugTimer.current=setTimeout(()=>setHugWaiting(false),3000);
    socket.timeout(5000).emit('hug:send',(err,result)=>{if(err)setError('Your hug couldn’t connect. Try again.');else if(!result.ok)setError(result.error);});
  };
  const replay=()=>{
    if(!connected||pending.current)return;
    pending.current=true;setBusy(true);setError('');
    socket.timeout(7000).emit('mission:replay',state.round,!room.replayReady.includes(playerId),(err,result)=>{
      pending.current=false;setBusy(false);
      if(err)setError('Couldn’t connect. Please try again.');else if(!result.ok)setError(result.error);
    });
  };
  if(!me)return <p role="status">Returning to your garden…</p>;
  return <main className="play" onPointerDownCapture={()=>audio.unlock()}><header><a className="brand" href="/" aria-label="Critter Quest — main page" onClick={event=>{event.preventDefault();socket.disconnect();goHome();}}>🌿 <span>critter quest</span></a><button className="sound-toggle" aria-label={muted?"Turn sound on":"Mute sound"} aria-pressed={muted} onClick={()=>{audio.setMuted(!muted);setMuted(!muted);}}> {muted?"🔇":"🔊"} </button><span className="connection" title={error||undefined}>{connected?'● Connected':'Reconnecting…'}</span></header><div className="mission-heading"><span className="tag">THE BUNNY’S GARDEN</span><h1>{sanctuary?'Our Sanctuary':wolf?(helper?'Bobcat Burrows':'Wolf’s Pine Forest'):bobcat?(helper?'Owl Nests':'Bobcat’s Woodland'):owl?(helper?'Hawk Nests':'Owl’s Moonlit Hollow'):hawk?(helper?'Snake Nests':'Hawk’s Highland'):snake?(helper?'Rabbit Burrows':'Snake’s Riverbank'):helper?'Garden Patch':'Bunny’s Meadow'}</h1><p>{me.name} · {helper?'Helper':'Explorer'} <span>Room {room.code}</span></p></div>
    <div className="progress" aria-label={`Level ${state.level}, ${state.fed.length-levelOffset(state.level)} of ${state.patches.length} meals fed`}><b>Level {state.level}</b>{Array.from({length:state.patches.length},(_,i)=><span key={i}>{i<state.fed.length-levelOffset(state.level)?'⭐':wolf?'🐾':bobcat?'🦉':owl?'🦅':hawk?'🐍':snake?'🐇':'🥕'}</span>)}<b>{state.fed.length-levelOffset(state.level)} / {state.patches.length}</b></div>
    {sanctuary&&!room.sanctuary.unlockedAnimals.includes('bunny')?<section className="empty-habitat"><span>🌳 🏡 🌷</span><h2>A little home is waiting</h2><p>Feed bunny three carrots together to welcome your first friend.</p></section>:<MissionWorld key={sanctuary?'sanctuary':'mission'} hug={hug} onPour={()=>audio.pourRain()} onThrow={()=>audio.whoosh()} hungry={!sanctuary&&hungry} state={state} water={sanctuary?undefined:water} feed={sanctuary?undefined:feed} role={sanctuary?'explorer':me.role} tap={sanctuary?()=>{audio.unlock();audio.chime('gift');}:tap}/>}

    {sanctuary?<section className="habitat-card" role="status"><h2>{room.sanctuary.unlockedAnimals.includes('bunny')?'🐰 Bunny’s cozy meadow':'🔒 Bunny habitat'}</h2><p>⭐ {room.sanctuary.stars} shared stars · {room.sanctuary.unlockedAnimals.length} animal friend</p><small>Shared garden · saved on the server</small></section>:state.complete?<section className="mission-reward" role="status"><h2>Hooray, team!</h2></section>:<div className="mission-controls">{helper||!state.basket.length?null:<p className="bunny-tap-hint" role="status">{`${wolf?'🐾':bobcat?'🦉':owl?'🦅':hawk?'🐍':snake?'🐇':'🥕'} ${state.basket.length} ready · Tap ${wolf?'a bobcat':bobcat?'an owl':owl?'a hawk':hawk?'a snake':snake?'a rabbit':'a carrot'} to feed`}</p>}</div>}
    {<div className="replay-controls"><button disabled={!connected||busy} aria-pressed={room.replayReady.includes(playerId)} onClick={replay}>{room.replayReady.includes(playerId)?'✓ Restart requested · tap to cancel':state.complete?'🌱 Play again together':'↶ Start over'}</button>{room.replayReady.length>0&&<small role="status">{room.replayReady.includes(playerId)?'Waiting for your friend to agree…':'Your friend wants to start over. Tap to agree.'}</small>}</div>}
    <div className="play-actions"><button className="hug-button" disabled={!connected||hugWaiting} onClick={sendHug}>💗 {hugWaiting?"Hug on its way!":"Send a hug"}</button></div>
</main>;
}
