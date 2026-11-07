import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createBunny } from './bunny';
export default function World() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    class Meadow extends Phaser.Scene {
      create() {
        const fit=()=>this.cameras.main.setZoom(Math.min(this.scale.width/500,this.scale.height/350)).centerOn(250,175);
        fit();this.scale.on('resize',fit);this.events.once('shutdown',()=>this.scale.off('resize',fit));
        this.cameras.main.setBackgroundColor('#c8e9c5');
        const g = this.add.graphics();
        g.fillStyle(0xe4f2cd); g.fillEllipse(240, 270, 10000, 240);
        g.fillRect(-5000,270,10000,5000);
        g.fillStyle(0xadc98c); g.fillEllipse(40, 330, 300, 180); g.fillEllipse(460, 325, 300, 160);
        const flowers = ['🌼','🌷','🌿','🌸'];
        for (let i=0;i<16;i++) this.add.text((i*83)%480, 200+(i*37)%140, flowers[i%4], { fontSize: '30px' });
        this.add.ellipse(250, 300, 110, 20, 0x6b8b62, 0.2);
        const bunny = createBunny(this, 250, 200).setInteractive({ useHandCursor:true });
        this.tweens.add({ targets:bunny, y:188, duration:1400, yoyo:true, repeat:-1, ease:'Sine.inOut' });
        bunny.on('pointerdown', () => this.tweens.add({ targets:bunny, scaleX:1.13, scaleY:0.9, duration:140, yoyo:true }));
        this.add.text(397, 75, '✨', {fontSize:'34px'});
      }
    }
    const game = new Phaser.Game({ type:Phaser.AUTO, parent:host.current, width:500, height:350, transparent:false, scene:Meadow, scale:{ mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH }, audio:{noAudio:true} });
    const resize=new ResizeObserver(()=>game.scale.resize(host.current!.clientWidth,host.current!.clientHeight));
    resize.observe(host.current);
    return () => {resize.disconnect();game.destroy(true);};
  }, []);
  return <div className="world" ref={host} aria-label="Animated meadow preview with a placeholder bunny" />;
}
