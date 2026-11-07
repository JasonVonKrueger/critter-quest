import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createBunny } from './bunny';
import type { MissionState, Role } from '@critter-quest/shared';
interface Props { hug: number; state: MissionState; role: Role; tap: (patch?: number) => void }
export default function MissionWorld({state,role,tap,hug}: Props) {
  const host=useRef<HTMLDivElement>(null), game=useRef<Phaser.Game|null>(null);
  const latest=useRef({state,tap}); latest.current={state,tap};
  useEffect(()=>{
    if(!host.current)return;
    class Garden extends Phaser.Scene {
      create(){
        const fit=()=>{this.cameras.main.setZoom(Math.min(this.scale.width/500,this.scale.height/450)).centerOn(250,225);};
        fit();this.scale.on('resize',fit);this.events.once('shutdown',()=>this.scale.off('resize',fit));
        this.cameras.main.setBackgroundColor(role==='helper'?'#bde6d9':'#cceac9');
        const g=this.add.graphics();g.fillStyle(0xe6f1bc);g.fillEllipse(250,390,10000,400);g.fillRect(-5000,390,10000,5000);
        this.add.text(25,45,role==='helper'?'🌻 💧 🌳':'🌳 🏡 🦋',{fontSize:'48px'});
        this.add.text(400,50,'✨',{fontSize:'35px'});
        for(let i=0;i<8;i++)this.add.text(i*65,380+(i%2)*20,'🌼',{fontSize:'28px'});
        const bunny=role==='explorer'?createBunny(this,250,220):this.add.text(250,220,'🌱',{fontSize:'110px'}).setOrigin(.5);
        if(role==='explorer')bunny.setInteractive({useHandCursor:true}).on('pointerdown',()=>latest.current.tap());
        this.tweens.add({targets:bunny,y:210,yoyo:true,repeat:-1,duration:1200,ease:'Sine.inOut'});
        const patches=role==='helper'?[0,1,2].map(i=>{
          this.add.ellipse(100+i*150,310,130,65,0x9a6d43);
          return this.add.text(100+i*150,285,'🌱',{fontSize:'64px'}).setOrigin(.5).setInteractive({useHandCursor:true}).on('pointerdown',()=>latest.current.tap(i));
        }):[];
        let previous=latest.current.state;
        const update=(next:MissionState)=>{
          patches.forEach((p,i)=>p.setText(['🌱','🌿','🥕','✓'][next.patches[i]]));
          if(next.fed.length>previous.fed.length)this.tweens.add({targets:bunny,scale:1.25,duration:220,yoyo:true,repeat:1});
          const sent=next.patches.filter(s=>s===3).length>previous.patches.filter(s=>s===3).length;
          if(sent){
            const carrot=this.add.text(role==='helper'?250:30,role==='helper'?300:40,'🥕',{fontSize:'55px'});
            const curve=new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(carrot.x,carrot.y),new Phaser.Math.Vector2(340,-100),new Phaser.Math.Vector2(role==='helper'?480:250,role==='helper'?-40:300));
            const flight={t:0};
            this.tweens.add({targets:flight,t:1,duration:900,onUpdate:()=>{const point=curve.getPoint(flight.t);carrot.setPosition(point.x,point.y).setAngle(flight.t*160);},onComplete:()=>carrot.destroy()});
            for(let i=0;i<5;i++){
              const sparkle=this.add.text(160+i*50,160-i*18,'✨',{fontSize:'24px'});
              this.tweens.add({targets:sparkle,alpha:0,y:sparkle.y-35,duration:800,onComplete:()=>sparkle.destroy()});
            }
          }
          if(next.complete&&!previous.complete){
            for(let i=0;i<28;i++){
              const star=this.add.text(Phaser.Math.Between(15,480),-40-i*12,['⭐','🎉','✨'][i%3],{fontSize:'28px'});
              this.tweens.add({targets:star,y:470,angle:Phaser.Math.Between(-180,180),duration:1800+i*35,onComplete:()=>star.destroy()});
            }
            this.tweens.add({targets:bunny,scale:1.3,duration:400,yoyo:true,repeat:3});
          }
          previous=structuredClone(next);
        };
        const hearts=()=>{
          for(let i=0;i<12;i++){
            const heart=this.add.text(Phaser.Math.Between(60,430),420+i*10,'💗',{fontSize:'36px'});
            this.tweens.add({targets:heart,y:40,x:heart.x+Phaser.Math.Between(-40,40),alpha:0,duration:1600+i*60,onComplete:()=>heart.destroy()});
          }
        };
        this.game.events.on('hug',hearts);this.events.once('shutdown',()=>this.game.events.off('hug',hearts));
        update(latest.current.state);this.game.events.on('mission-state',update);
        this.events.once('shutdown',()=>this.game.events.off('mission-state',update));
      }
    }
    game.current=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:500,height:450,scene:Garden,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true}});
    const resize=new ResizeObserver(()=>game.current?.scale.resize(host.current!.clientWidth,host.current!.clientHeight));
    resize.observe(host.current);
    return()=>{resize.disconnect();game.current?.destroy(true);game.current=null;};
  },[role]);
  useEffect(()=>{game.current?.events.emit('mission-state',state);},[state]);
  useEffect(()=>{if(hug)game.current?.events.emit('hug');},[hug]);
  return <div className="mission-world" ref={host} aria-label={role==='helper'?'Garden with three carrot patches':'Bunny’s meadow'}/>;
}
