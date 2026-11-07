import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClientEvents, MissionAction, RoomState, ServerEvents } from '@critter-quest/shared';
import { AudioManager } from './audio';
import MissionWorld from './MissionWorld';
interface Props {room:RoomState;playerId:string;connected:boolean;socket:Socket<ServerEvents,ClientEvents>}
export default function Mission({room,playerId,connected,socket}:Props){
  const me=room.players.find(p=>p.id===playerId);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [sanctuary,setSanctuary]=useState(false);
  const pending=useRef(false);
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
    });
  };
  const tap=(patch?:number)=>{
    const id=crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    if(me?.role==='helper'&&patch!==undefined&&state.patches[patch]<3)send({round:state.round,id,type:'grow',patch,stage:state.patches[patch]});
    else if(me?.role==='explorer'){
      if(!state.discovered)send({round:state.round,id,type:'discover'});
      else if(state.basket.length)send({round:state.round,id,type:'feed',carrot:state.basket[0]});
    }
  };
  const helper=me?.role==='helper';
  const instruction=sanctuary?(room.sanctuary.unlockedAnimals.includes('bunny')?'Welcome home, bunny! Tap your friend to say hello.':'Help the hungry bunny to open its cozy home!'):state.complete?'You did it together! The bunny is happy!':helper?'Tap a patch to plant, water, then send a carrot!':!state.discovered?'Tap the bunny to say hello!':state.basket.length?'Tap your basket to feed the bunny!':'Your friend is growing carrots. Give bunny a little hello!';
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
  return <main className="play" onPointerDownCapture={()=>audio.unlock()}><header><span className="brand">🌿 critter quest</span><button className="sound-toggle" aria-label={muted?"Turn sound on":"Mute sound"} aria-pressed={muted} onClick={()=>{audio.setMuted(!muted);setMuted(!muted);}}> {muted?"🔇":"🔊"} </button><span className="connection">{connected?'● Connected':'Reconnecting…'}</span></header><div className="mission-heading"><span className="tag">THE BUNNY’S GARDEN</span><h1>{sanctuary?'Our Sanctuary':helper?'Garden Patch':'Bunny’s Meadow'}</h1><p>{me.name} · {helper?'Helper':'Explorer'} <span>Room {room.code}</span></p></div>
    <div className="progress" aria-label={`${state.fed.length} of 3 carrots fed`}>{[0,1,2].map(i=><span key={i}>{i<state.fed.length?'⭐':'🥕'}</span>)}<b>{state.fed.length} / 3</b></div>
    <div className="pip" role="status"><button className="pip-repeat" aria-label="Hear Pip’s instructions" onClick={()=>{audio.unlock();audio.speak(instruction,true);}}>✨</button><p>{!connected?"Reconnecting… Your place is saved.":room.players.some(p=>!p.connected&&p.id!==playerId)?"Your friend is reconnecting. Their place is saved.":error||instruction}</p></div>
    {sanctuary&&!room.sanctuary.unlockedAnimals.includes('bunny')?<section className="empty-habitat"><span>🌳 🏡 🌷</span><h2>A little home is waiting</h2><p>Feed bunny three carrots together to welcome your first friend.</p></section>:<MissionWorld key={sanctuary?'sanctuary':'mission'} hug={hug} state={state} role={sanctuary?'explorer':me.role} tap={sanctuary?()=>{audio.unlock();audio.chime('gift');audio.speak('Bunny loves its new home. Thank you, friends!',true);}:tap}/>}

    {sanctuary?<section className="habitat-card" role="status"><h2>{room.sanctuary.unlockedAnimals.includes('bunny')?'🐰 Bunny’s cozy meadow':'🔒 Bunny habitat'}</h2><p>⭐ {room.sanctuary.stars} shared stars · {room.sanctuary.unlockedAnimals.length} animal friend</p><small>Shared garden · saved on the server</small></section>:state.complete?<section className="mission-reward" role="status"><h2>⭐ ⭐ ⭐</h2><h2>Hooray, team!</h2><p>You both earned three stars. 🐰 Bunny unlocked!</p></section>:<div className="mission-controls">{helper?<div className="patch-controls">{state.patches.map((stage,i)=><button key={i} disabled={!connected||busy||stage===3} onClick={()=>tap(i)}><span>{['🌱','💧','🥕','💌'][stage]}</span>{['Plant','Water','Send','Sent!'][stage]}<small>Patch {i+1}</small></button>)}</div>:<><button className="primary feed" disabled={!connected||busy} onClick={()=>{if(state.discovered&&!state.basket.length){setError('Bunny is happy you’re here! Your friend is growing carrots.');}else tap();}}>{!state.discovered?'🐰 Say hello':`🧺 ${state.basket.length} carrots · ${state.basket.length?'Feed bunny':'Say hello to bunny'}`}</button><p className="hint">Every carrot is a little gift from your friend.</p></>}</div>}
    {state.complete&&<div className="replay-controls"><button disabled={!connected||busy} aria-pressed={room.replayReady.includes(playerId)} onClick={replay}>{room.replayReady.includes(playerId)?'✓ Ready again · tap to cancel':'🌱 Play again together'}</button><small role="status">{room.replayReady.length?'Waiting for your friend to tap play again…':'Both friends choose when to start again.'}</small></div>}
    <div className="play-actions"><button className="sanctuary-button" onClick={()=>{setSanctuary(!sanctuary);setError('');}}> {sanctuary?'🌱 Adventure':'🏡 Sanctuary'} </button><button className="hug-button" disabled={!connected||hugWaiting} onClick={sendHug}>💗 {hugWaiting?"Hug on its way!":"Send a hug"}</button></div>
    <p className="asset-note-inline">Temporary artwork · no time limits</p></main>;
}
