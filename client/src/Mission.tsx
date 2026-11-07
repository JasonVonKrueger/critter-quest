import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientEvents, MissionAction, RoomState, ServerEvents } from '@critter-quest/shared';
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
  useEffect(()=>{setSanctuary(false);setError('');},[state.round]);
  useEffect(()=>{document.body.classList.add('playing');return()=>document.body.classList.remove('playing');},[]);
  const send=(action:MissionAction)=>{
    if(!connected||pending.current||!me||state.complete)return;
    audio.unlock();audio.chime();
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
      else {audio.unlock();audio.chime();}
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
  const helper=me?.role==='helper';
  const instruction=sanctuary?(room.sanctuary.unlockedAnimals.includes('bunny')?'Welcome home, bunny! Tap your friend to say hello.':'Help the hungry bunny to open its cozy home!'):state.complete?'You did it together! The bunny is happy!':helper?(state.patches.includes(1)?'Drag the blue watering can onto a planted patch!':'Drag the blue watering can over a sprout!'):!state.discovered?'Tap the bunny to say hello!':state.basket.length?'Tap a landed carrot to feed bunny!':'Your friend is growing carrots. Give bunny a little hello!';
  useEffect(()=>{
    const receive=()=>{setHug(n=>n+1);audio.chime('gift');audio.speak('A big hug for you! Pip loves your teamwork!',true);};
    socket.on('hug:received',receive);
    return()=>{socket.off('hug:received',receive);clearTimeout(hugTimer.current);audio.stop();};
  },[socket,audio]);
  useEffect(()=>{if(connected)audio.speak(instruction);},[instruction,connected,audio,muted]);
  const previous=useRef(state);
  useEffect(()=>{
    const before=previous.current;
    if(state.complete&&!before.complete)audio.chime('win');
    else if(state.basket.length>before.basket.length||state.fed.length>before.fed.length)audio.chime('gift');
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
  return <main className="play" onPointerDownCapture={()=>audio.unlock()}><header><a className="brand" href="/" aria-label="Critter Quest — main page" onClick={event=>{event.preventDefault();socket.disconnect();goHome();}}>🌿 <span>critter quest</span></a><button className="sound-toggle" aria-label={muted?"Turn sound on":"Mute sound"} aria-pressed={muted} onClick={()=>{audio.setMuted(!muted);setMuted(!muted);}}> {muted?"🔇":"🔊"} </button><span className="connection">{connected?'● Connected':'Reconnecting…'}</span></header><div className="mission-heading"><span className="tag">THE BUNNY’S GARDEN</span><h1>{sanctuary?'Our Sanctuary':helper?'Garden Patch':'Bunny’s Meadow'}</h1><p>{me.name} · {helper?'Helper':'Explorer'} <span>Room {room.code}</span></p></div>
    <div className="progress" aria-label={`${state.fed.length} of 3 carrots fed`}>{[0,1,2].map(i=><span key={i}>{i<state.fed.length?'⭐':'🥕'}</span>)}<b>{state.fed.length} / 3</b></div>
    <div className="pip" role="status"><button className="pip-repeat" aria-label="Hear Pip’s instructions" onClick={()=>{audio.unlock();audio.speak(instruction,true);}}>✨</button><p>{!connected?"Reconnecting… Your place is saved.":room.players.some(p=>!p.connected&&p.id!==playerId)?"Your friend is reconnecting. Their place is saved.":error||instruction}</p></div>
    {sanctuary&&!room.sanctuary.unlockedAnimals.includes('bunny')?<section className="empty-habitat"><span>🌳 🏡 🌷</span><h2>A little home is waiting</h2><p>Feed bunny three carrots together to welcome your first friend.</p></section>:<MissionWorld key={sanctuary?'sanctuary':'mission'} hug={hug} hungry={!sanctuary&&state.fed.length===0} state={state} water={sanctuary?undefined:water} feed={sanctuary?undefined:feed} role={sanctuary?'explorer':me.role} tap={sanctuary?()=>{audio.unlock();audio.chime('gift');audio.speak('Bunny loves its new home. Thank you, friends!',true);}:tap}/>}

    {sanctuary?<section className="habitat-card" role="status"><h2>{room.sanctuary.unlockedAnimals.includes('bunny')?'🐰 Bunny’s cozy meadow':'🔒 Bunny habitat'}</h2><p>⭐ {room.sanctuary.stars} shared stars · {room.sanctuary.unlockedAnimals.length} animal friend</p><small>Shared garden · saved on the server</small></section>:state.complete?<section className="mission-reward" role="status"><h2>⭐ ⭐ ⭐</h2><h2>Hooray, team!</h2><p>You both earned three stars. 🐰 Bunny unlocked!</p></section>:<div className="mission-controls">{helper?<><div className="patch-controls">{state.patches.map((stage,i)=><button key={i} disabled={!connected||busy||stage===3} onClick={()=>tap(i)}><span>{['🌱','💧','🥕','💌'][stage]}</span>{['Drag can here','Drag can here','Send','Sent!'][stage]}<small>Patch {i+1}</small></button>)}</div></>:<p className="bunny-tap-hint" role="status">{!state.discovered?'👆 🐰 Tap bunny to say hello':state.basket.length?`🥕 ${state.basket.length} ready · Tap a carrot to feed`:'🌱 Your friend is growing carrots'}</p>}</div>}
    {<div className="replay-controls"><button disabled={!connected||busy} aria-pressed={room.replayReady.includes(playerId)} onClick={replay}>{room.replayReady.includes(playerId)?'✓ Restart requested · tap to cancel':state.complete?'🌱 Play again together':'↶ Start over'}</button>{room.replayReady.length>0&&<small role="status">{room.replayReady.includes(playerId)?'Waiting for your friend to agree…':'Your friend wants to start over. Tap to agree.'}</small>}</div>}
    <div className="play-actions"><button className="sanctuary-button" onClick={()=>{setSanctuary(!sanctuary);setError('');}}> {sanctuary?'🌱 Adventure':'🏡 Sanctuary'} </button><button className="hug-button" disabled={!connected||hugWaiting} onClick={sendHug}>💗 {hugWaiting?"Hug on its way!":"Send a hug"}</button></div>
</main>;
}
