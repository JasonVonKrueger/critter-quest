import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, RoomResult, RoomState } from '@critter-quest/shared';
import { goHome } from './navigation';
import PwaControls from './PwaControls';
import World from './World';
import Mission from './Mission';
import RoomLobby from './RoomLobby';
import './style.css';
const socket: Socket<ServerEvents, ClientEvents> = io(import.meta.env.VITE_SERVER_URL || undefined, { autoConnect:false });
interface SavedSeat { token:string; code:string; name:string }
function App() {
  const [saved,setSaved]=useState<SavedSeat[]>(()=>{try{return JSON.parse(localStorage.getItem('cq-gardens')||'[]');}catch{return [];}});
  const [room,setRoom] = useState<RoomState|null>(null), [code,setCode] = useState(new URLSearchParams(location.search).get('room') || '');
  const [connected,setConnected] = useState(false), [error,setError] = useState(''), [busy,setBusy] = useState(false), [playerId,setPlayerId] = useState('');
  const accept = (result:RoomResult) => { setBusy(false); if(result.ok) { sessionStorage.setItem('cq-session',result.token); setRoom(result.room); setPlayerId(result.playerId); setError(''); } else { sessionStorage.removeItem('cq-session'); setRoom(null); setPlayerId(''); setError(result.error); } };
  useEffect(() => {
    const connect = () => { setConnected(true); const token=sessionStorage.getItem('cq-session'); if(token) socket.emit('room:resume',token,accept); };
    const disconnect = () => {setConnected(false);setBusy(false);};
    socket.on('connect',connect); socket.on('disconnect',disconnect); socket.on('room:state',setRoom); socket.connect();
    return () => {socket.off('connect',connect);socket.off('disconnect',disconnect);socket.off('room:state',setRoom);socket.disconnect();};
  },[]);
  useEffect(()=>{
    const token=sessionStorage.getItem('cq-session');
    const player=room?.players.find(p=>p.id===playerId);
    if(!room||!token||!player)return;
    const seat={token,code:room.code,name:player.name||'Unselected player'};
    setSaved(previous=>{
      const updated=[seat,...previous.filter(s=>s.token!==token)].slice(0,6);
      localStorage.setItem('cq-gardens',JSON.stringify(updated));return updated;
    });
  },[room,playerId]);
  const returnToGarden=(token:string)=>{
    setBusy(true);socket.timeout(7000).emit('room:resume',token,(err,result)=>{
      if(err){setBusy(false);setError('Connection timed out. Try again.');return;}
      if(!result.ok)setSaved(previous=>{const updated=previous.filter(s=>s.token!==token);localStorage.setItem('cq-gardens',JSON.stringify(updated));return updated;});
      accept(result);
    });
  };
  const create = () => {setBusy(true);socket.timeout(7000).emit('room:create', (err:Error|null,result:RoomResult) => err ? (setBusy(false),setError('Connection timed out. Please try again.')) : accept(result));};
  const join = (event:React.FormEvent) => {event.preventDefault();setBusy(true);socket.timeout(7000).emit('room:join',code,(err:Error|null,result:RoomResult) => err ? (setBusy(false),setError('Connection timed out. Please try again.')) : accept(result));};
  if (room?.phase === 'started' && playerId) return <Mission room={room} playerId={playerId} connected={connected} socket={socket}/>;
  return <main className={room?"home in-lobby":"home"}><header><a className="brand" href="/" onClick={event=>{if(room){event.preventDefault();socket.disconnect();goHome();}}}>🌿 <span>critter quest<span className="brand-dot">✦</span></span></a><span className="edition">LITTLE ADVENTURES. BIG HEARTS.</span><span className={'connection '+(connected?'online':'')}>● {connected?'Connected':'Connecting…'}</span></header>
    <PwaControls/><section className="intro"><div className="eyebrow"><span>✦</span> A LITTLE HELP. A LITTLE MAGIC.</div><h1>Better adventures.<br/><em>Together.</em></h1><p>Two little friends. One wonderful world.<br/>Grow, share, and care for the critters you meet.</p></section>
    <section className="adventure"><div className="preview"><div className="chapter">ADVENTURE 01 <span>✦</span></div><World/><div className="preview-caption"><span className="tag">🌱 OUR FIRST ADVENTURE</span><h2>The Bunny’s Garden</h2><p>A hungry bunny. A magical garden. A helping hand.</p></div><span className="asset-note">The Bunny’s Garden · art v1</span></div>
    <div className="lobby"><span className="tag purple">MADE FOR TWO</span><h2>{room?'Your garden is waiting!':'Let’s play together.'}</h2><p className="sub">{room?'Share a little adventure with someone you love.':'A grown-up can help you get started.'}</p>
    {room ? <RoomLobby key={playerId} room={room} playerId={playerId} connected={connected} socket={socket}/> : <>{saved.length>0&&<section className="saved-gardens"><h3>Welcome back</h3>{saved.map(s=><button key={s.token} disabled={!connected||busy} onClick={()=>returnToGarden(s.token)}>🏡 {s.name} · {s.code} <span>Return →</span></button>)}</section>}<button className="primary" disabled={!connected||busy} onClick={create}><span>✦</span> Create a garden <span>→</span></button><p className="hint">Start a new adventure & invite your friend</p><div className="divider"><span>or join a friend</span></div><form onSubmit={join}><label htmlFor="code">Have a garden code?</label><div className="join"><input id="code" placeholder="Enter code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false}/><button disabled={!connected||busy||code.trim().length!==6}>Join →</button></div></form><div className="buddy"><span>🐰</span><p>A little teamwork makes<br/><strong>wonderful things grow.</strong></p><span>🥕</span></div></>}
    {error&&<p role="alert" className="error">{error}</p>}<p className="privacy">♧ Just your family. Always a safe little space.</p></div></section>
    <section className="features"><div><span>🌷</span><p><b>Little taps, big smiles</b><small>Simple play for little hands</small></p></div><div><span>💛</span><p><b>Friends, never rivals</b><small>Every win belongs to both of you</small></p></div><div><span>🌳</span><p><b>A world to care for</b><small>Help critters. Make a little magic.</small></p></div></section><footer><span>Made for little hearts & curious minds.</span><span>GROW KINDNESS, TOGETHER. ✦</span></footer></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
