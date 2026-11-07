/** Browser fallback audio. Replace speak() with recorded clips without changing scenes. */
export class AudioManager {
  muted = localStorage.getItem('cq-muted') === 'true';
  private context?: AudioContext;
  private lastSpoken = '';
  unlock() {
    if(this.muted)return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(()=>{}); } catch { /* Text guidance remains available. */ }
  }
  setMuted(muted: boolean) {
    this.muted=muted; localStorage.setItem('cq-muted',String(muted));
    if(muted && 'speechSynthesis' in window) speechSynthesis.cancel();
    if(!muted)this.unlock();
  }
  chime(kind: 'tap'|'gift'|'win'='tap') {
    if(this.muted || !this.context || this.context.state!=='running')return;
    const ctx=this.context;
    const notes=kind==='win'?[523,659,784,1047]:kind==='gift'?[659,880]:[660];
    notes.forEach((frequency,i)=>{
      const oscillator=ctx.createOscillator(), gain=ctx.createGain(),start=ctx.currentTime+i*.13;
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.06,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.23);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.25);
    });
  }
  speak(text: string, force=false) {
    if(this.muted || !('speechSynthesis' in window) || (!force && this.lastSpoken===text))return;
    this.lastSpoken=text;speechSynthesis.cancel();
    const voice=new SpeechSynthesisUtterance(text);voice.rate=.88;voice.pitch=1.15;voice.volume=.8;speechSynthesis.speak(voice);
  }
  stop(){if('speechSynthesis' in window)speechSynthesis.cancel();void this.context?.close().catch(()=>{});}
}
