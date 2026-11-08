import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { observeSceneSize } from './resizeScene';
import { addEnvironment, preloadEnvironment } from './environment';
import { createBunny, preloadBunny, setBunnyPose } from './bunny';
export default function World() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    class Meadow extends Phaser.Scene {
      preload(){preloadBunny(this);preloadEnvironment(this,'meadow');}
      create() {
        const fit=()=>this.cameras.main.setZoom(Math.min(this.scale.width/500,this.scale.height/350)).centerOn(250,175);
        fit();this.scale.on('resize',fit);this.events.once('shutdown',()=>this.scale.off('resize',fit));
        this.cameras.main.setBackgroundColor('#c8e9c5');
        addEnvironment(this,'meadow',350);
        this.add.ellipse(250, 300, 110, 20, 0x6b8b62, 0.2);
        const bunny = createBunny(this, 250, 200).setInteractive({ useHandCursor:true });
        bunny.on('pointerdown', () => {setBunnyPose(bunny,'happy');this.tweens.add({ targets:bunny, scaleX:1.08, scaleY:0.94, duration:140, yoyo:true });});

      }
    }
    const game = new Phaser.Game({ type:Phaser.AUTO, parent:host.current, width:500, height:350, transparent:false, scene:Meadow, scale:{ mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH }, audio:{noAudio:true} });
    const stopResize=observeSceneSize(host.current,game);
    return () => {stopResize();game.destroy(true);};
  }, []);
  return <div className="world" ref={host} aria-label="Animated meadow preview with a blinking bunny sprite" />;
}
