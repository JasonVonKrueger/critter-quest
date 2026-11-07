import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome:'accepted'|'dismissed' }>;
}
/** Parent controls live on the landing/lobby screen so updates never interrupt play. */
export default function PwaControls(){
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false),[help,setHelp]=useState(false),[installing,setInstalling]=useState(false);
  const [offline,setOffline]=useState(!navigator.onLine);
  const [message,setMessage]=useState('');
  const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW({
    onRegisterError(){setMessage('Offline setup is unavailable. You can still play while connected.');},
  });
  useEffect(()=>{
    const media=matchMedia('(display-mode: standalone)');
    const standalone=()=>setInstalled(media.matches||Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    const available=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt);};
    const done=()=>{setInstalled(true);setPrompt(null);};
    const online=()=>setOffline(!navigator.onLine);
    standalone();media.addEventListener('change',standalone);
    window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',done);
    window.addEventListener('online',online);window.addEventListener('offline',online);
    return()=>{media.removeEventListener('change',standalone);window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',done);window.removeEventListener('online',online);window.removeEventListener('offline',online);};
  },[]);
  const install=async()=>{
    if(!prompt){setHelp(!help);return;}
    setInstalling(true);
    try{await prompt.prompt();await prompt.userChoice;setPrompt(null);}catch{setHelp(true);}finally{setInstalling(false);}
  };
  return <aside className="pwa-controls" aria-label="App installation and updates">
    {!installed&&<button disabled={installing} onClick={install}>📲 {prompt?'Install Critter Quest':'Add to home screen'}</button>}
    {help&&!installed&&<p>On iPhone or iPad, open in Safari, tap Share, then Add to Home Screen. On Android, use your browser menu’s Install app or Add to Home screen option. Installation requires HTTPS (or localhost for testing).</p>}
    {needRefresh&&<div className="pwa-update"><p>A new version is ready. Finish your adventure before updating.</p><button onClick={()=>void updateServiceWorker(true)}>Update & reopen</button><button onClick={()=>setNeedRefresh(false)}>Later</button></div>}
    {offline&&<p role="status">You’re offline. Your saved garden is safe on the server. Reconnect to play together.</p>}
    {message&&<p role="status">{message}</p>}
  </aside>;
}
