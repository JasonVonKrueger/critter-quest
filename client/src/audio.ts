/** Lightweight sound effects for game interactions. */
export class AudioManager {
  muted = localStorage.getItem('cq-muted') === 'true';
  private context?: AudioContext;
  private waterDrops=new Set<OscillatorNode>();
  private whooshBuffer?:AudioBuffer;
  private whooshes=new Set<AudioBufferSourceNode>();
  unlock() {
    if(this.muted)return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(()=>{}); } catch { /* Text guidance remains available. */ }
  }
  setMuted(muted: boolean) {
    this.muted=muted; localStorage.setItem('cq-muted',String(muted));
    if(muted){this.stopWater();for(const sound of this.whooshes)sound.stop();this.whooshes.clear();}
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
  whoosh(){
    if(this.muted||!this.context||this.context.state!=='running')return;
    const ctx=this.context,duration=.55,start=ctx.currentTime;
    if(!this.whooshBuffer){
      this.whooshBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);
      const data=this.whooshBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=this.whooshBuffer;
    filter.type='bandpass';filter.Q.value=.65;
    filter.frequency.setValueAtTime(450,start);
    filter.frequency.exponentialRampToValueAtTime(2600,start+.16);
    filter.frequency.exponentialRampToValueAtTime(300,start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.3,start+.12);
    gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    this.whooshes.add(source);
    source.onended=()=>{this.whooshes.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
    source.start(start);source.stop(start+duration);
  }
  private stopWater(){
    for(const drop of this.waterDrops)drop.stop();
    this.waterDrops.clear();
  }
  pourRain(){
    if(this.muted||!this.context||this.context.state!=='running')return;
    this.stopWater();
    const ctx=this.context,start=ctx.currentTime;
    // Dampened falling-pitch bubbles: no broadband noise or static layer.
    const droplet=(at:number,frequency:number,volume:number,duration:number)=>{
      const bubble=ctx.createOscillator(),gain=ctx.createGain();
      bubble.type='sine';
      bubble.frequency.setValueAtTime(frequency,at);
      bubble.frequency.exponentialRampToValueAtTime(frequency*.42,at+duration);
      gain.gain.setValueAtTime(0,at);
      gain.gain.linearRampToValueAtTime(volume,at+.004);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      bubble.connect(gain);gain.connect(ctx.destination);
      this.waterDrops.add(bubble);
      bubble.onended=()=>{this.waterDrops.delete(bubble);bubble.disconnect();gain.disconnect();};
      bubble.start(at);bubble.stop(at+duration+.01);
    };
    for(let i=0;i<30;i++){
      const offset=i*.028+Math.random()*.012;
      const fade=Math.min(1,(i+1)/4,(30-i)/6);
      droplet(start+offset,650+Math.random()*1050,.035*fade,.045+Math.random()*.045);
      if(i%4===0)droplet(start+offset,160+Math.random()*120,.022*fade,.13);
    }
  }
  stop(){for(const sound of this.whooshes)sound.stop();this.whooshes.clear();this.stopWater();void this.context?.close().catch(()=>{});}
}
