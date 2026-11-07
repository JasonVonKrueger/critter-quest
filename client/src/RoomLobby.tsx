import { useState } from 'react';
import type { ActionResult, ClientEvents, PlayerName, Role, RoomState, ServerEvents } from '@critter-quest/shared';
import type { Socket } from 'socket.io-client';
interface Props { room: RoomState; playerId: string; connected: boolean; socket: Socket<ServerEvents, ClientEvents> }
export default function RoomLobby({room, playerId, connected, socket}: Props) {
  const me = room.players.find(p => p.id === playerId);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false), [copied,setCopied] = useState(false);
  const [name,setName] = useState<PlayerName>(me?.name || 'Raelyn');
  const [role,setRole] = useState<Role>(me?.role || 'explorer');
  const reply = (err: Error | null, result: ActionResult) => {
    setBusy(false);
    setError(err ? 'Connection timed out. Please try again.' : result.ok ? '' : result.error);
  };
  return <>
    <div className="room-code"><small>YOUR GARDEN CODE</small><strong>{room.code}</strong></div>
    <button className="invite" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/?room=${room.code}`);setCopied(true);}catch{setError('Share the garden code above with your friend.');}}}>{copied?'✓ Invitation copied':'↗ Copy invitation link'}</button>
    <div className="players" aria-live="polite">{room.players.map(p=><div key={p.id}><span>{p.role==='explorer'?'🐰':'🥕'}</span><b>{p.name || 'Choosing…'}{p.id===playerId?' (you)':''}</b><small>{p.name?(p.role==='explorer'?'Explorer · ':'Helper · '):''}{!p.connected?'Reconnecting…':p.ready?'Ready!':'Getting ready'}</small></div>)}{room.players.length===1&&<div><span>🌱</span><b>A friend’s spot</b><small>Waiting to join</small></div>}</div>
    {!connected && <p className="notice" role="status">Reconnecting… Your place is saved.</p>}
    {room.phase==='started' ? <div className="start-card" role="status"><span>🎉</span><h3>Your adventure team is ready!</h3><p>{me?.role==='explorer'?'🐰 You’ll explore Bunny’s Meadow.':'🥕 You’ll grow carrots in the Garden Patch.'}</p><p>The Bunny’s Garden gameplay is coming in Phase 3.</p>{room.players.some(p=>!p.connected)&&<p>Waiting for your friend to reconnect. Their place is saved.</p>}</div> : <>
      <fieldset disabled={!connected||busy||!me}><legend>Who’s playing?</legend><div className="choices">{(['Raelyn','Cooper'] as const).map(n=><button key={n} aria-pressed={name===n} disabled={room.players.some(p=>p.id!==playerId&&p.name===n)} onClick={()=>{setName(n);setRole(n==='Raelyn'?'explorer':'helper');}}>{n==='Raelyn'?'🌸':'🌻'} {n}</button>)}</div></fieldset>
      <fieldset disabled={!connected||busy||!me}><legend>Choose your adventure job</legend><div className="choices">{(['explorer','helper'] as const).map(r=><button key={r} aria-pressed={role===r} disabled={room.players.some(p=>p.id!==playerId&&p.name&&p.role===r)} onClick={()=>setRole(r)}>{r==='explorer'?'🐰 Explorer':'🥕 Helper'}</button>)}</div></fieldset>
      <p className="hint">{role==='explorer'?'Meet critters and help them feel better.':'Grow and send supplies to your friend.'}</p>
      {me?.name!==name||me?.role!==role ? <button className="primary" disabled={!connected||busy||!me} onClick={()=>{setBusy(true);socket.timeout(7000).emit('player:select',name,role,reply);}}>✓ Choose {name}</button> : <button className="primary" disabled={!connected||busy} onClick={()=>{setBusy(true);socket.timeout(7000).emit('player:ready',!me.ready,reply);}}>{me.ready?'↶ Not ready yet':'✦ I’m ready!'}</button>}
      <p className="notice" role="status">{room.players.length<2?'Invite your friend to join your garden.':me?.ready?'Waiting for your friend to get ready…':'Choose your name and job, then tap “I’m ready!”'}</p>
    </>}
    {error&&<p className="error" role="alert">{error}</p>}
  </>;
}
