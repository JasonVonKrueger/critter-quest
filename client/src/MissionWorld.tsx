import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { addEnvironment, preloadEnvironment } from './environment';
import { createBunny, preloadBunny, setBunnyPose, setBunnyHungry } from './bunny';
import type { MissionState, Role } from '@critter-quest/shared';
interface Props { hungry?:boolean; hug: number; state: MissionState; role: Role; tap: (patch?: number) => void; feed?: (carrot:number) => void; water?:(patch:number)=>void }
export default function MissionWorld({state,role,tap,hug,feed,water,hungry=false}: Props) {
  const host=useRef<HTMLDivElement>(null), game=useRef<Phaser.Game|null>(null);
  const latest=useRef({state,tap,feed,water,hungry}); latest.current={state,tap,feed,water,hungry};
  useEffect(()=>{
    if(!host.current)return;
    class Garden extends Phaser.Scene {
      preload(){if(role==='explorer')preloadBunny(this);preloadEnvironment(this,role==='helper'?'garden':'meadow');if(role==='helper')this.load.image('watering-can','/assets/objects/watering-can-v1.png');}
      create(){
        const fit=()=>{this.cameras.main.setZoom(Math.min(this.scale.width/500,this.scale.height/450)).centerOn(250,225);};
        fit();this.scale.on('resize',fit);this.events.once('shutdown',()=>this.scale.off('resize',fit));
        this.cameras.main.setBackgroundColor(role==='helper'?'#bde6d9':'#cceac9');
        const environment=addEnvironment(this,role==='helper'?'garden':'meadow',450);
        let retryWaterWhileDragging:(()=>void)|undefined;
        if(role==='helper'&&environment){
          const can=this.add.image(60,160,'watering-can').setDisplaySize(120,80).setDepth(20).setInteractive({useHandCursor:true});
          this.input.setDraggable(can);
          const home=new Phaser.Math.Vector2();
          const placeCan=()=>{
            home.set(Math.max(55,environment.x-environment.displayWidth*.41),environment.y-environment.displayHeight*.12);
            can.setPosition(home.x,home.y).setAngle(0);
          };
          const returnHome=()=>this.tweens.add({targets:can,x:home.x,y:home.y,angle:0,duration:250});
          placeCan();this.scale.on('resize',placeCan);this.events.once('shutdown',()=>this.scale.off('resize',placeCan));
          let pouring=false;
          let requested=false;
          let dragging=false;
          const pourWater=(patch:number)=>{
            const round=latest.current.state.round;
            pouring=true;
            this.tweens.killTweensOf(can);
            this.tweens.add({targets:can,x:100+patch*150-45,y:225,angle:55,duration:220,onComplete:()=>{
              const angle=Phaser.Math.DegToRad(can.angle);
              const spoutX=can.x+Math.cos(angle)*44-Math.sin(angle)*-8;
              const spoutY=can.y+Math.sin(angle)*44+Math.cos(angle)*-8;
              for(let i=0;i<14;i++){
                this.time.delayedCall(i*40,()=>{
                  const drop=this.add.ellipse(spoutX,spoutY,7,13,0x39baff).setDepth(21);
                  this.tweens.add({targets:drop,x:100+patch*150+Phaser.Math.Between(-22,22),y:305,alpha:0.2,duration:420,ease:'Quad.in',onComplete:()=>drop.destroy()});
                });
              }
              this.time.delayedCall(1000,()=>{if(latest.current.state.round===round)latest.current.water?.(patch);pouring=false;returnHome();});
            }});
          };
          const tryWater=()=>{
            if(requested||pouring)return;
            const patch=[0,1,2].find(id=>Phaser.Math.Distance.Between(can.x,can.y,100+id*150,285)<85&&latest.current.state.patches[id]===1);
            if(patch===undefined)return;
            requested=true;
            pourWater(patch);
          };
          retryWaterWhileDragging=()=>{if(dragging)tryWater();};
          can.on('dragstart',()=>{dragging=true;if(!pouring){requested=false;this.tweens.killTweensOf(can);}});
          can.on('drag',(_pointer:Phaser.Input.Pointer,x:number,y:number)=>{
            if(pouring)return;
            can.setPosition(x,y);tryWater();
          });
          can.on('dragend',()=>{
            dragging=false;
            tryWater();
            if(!pouring&&!requested)returnHome();
            else if(requested)this.time.delayedCall(1500,()=>{if(!pouring)returnHome();});
          });
        }
        const bunny=role==='explorer'?createBunny(this,250,220):this.add.container(250,220);
        if(role==='explorer')bunny.setInteractive({useHandCursor:true}).on('pointerdown',()=>{setBunnyPose(bunny,'happy',700);latest.current.tap();});
        const patches=role==='helper'?[0,1,2].map(i=>{
          this.add.ellipse(100+i*150,310,130,65,0x9a6d43);
          return this.add.text(100+i*150,285,'🌱',{fontSize:'64px'}).setOrigin(.5).setInteractive({useHandCursor:true}).on('pointerdown',()=>latest.current.tap(i));
        }):[];
        const landedCarrots=role==='explorer'?[0,1,2].map(id=>{
          const carrot=this.add.text(100+id*150,350,'🥕',{fontSize:'44px'}).setOrigin(.5).setPadding(16).setVisible(false);
          carrot.setInteractive({useHandCursor:true}).on('pointerdown',()=>{
            if(carrot.visible)latest.current.feed?.(id);
          });
          return carrot;
        }):[];
        let previous=latest.current.state;
        let displayedState=previous;
        const arriving=new Set<number>();
        const renderSupplies=()=>{
          landedCarrots.forEach((carrot,id)=>carrot.setVisible(displayedState.basket.includes(id)&&!arriving.has(id)));
        };
        const update=(next:MissionState)=>{
          if(next.round!==displayedState.round)arriving.clear();
          displayedState=next;
          setBunnyHungry(bunny,latest.current.hungry);
          retryWaterWhileDragging?.();
          patches.forEach((p,i)=>p.setText(['🌱','🌱','🥕','✓'][next.patches[i]]));
          if(next.fed.length>previous.fed.length){
            if(role==='explorer'){
              const fedId=next.fed.find(id=>!previous.fed.includes(id))??0;
              const food=this.add.text(100+fedId*150,350,'🥕',{fontSize:'40px'}).setOrigin(.5);
              this.tweens.add({targets:food,x:250,y:230,alpha:0,duration:400,onComplete:()=>food.destroy()});
            }
            setBunnyPose(bunny,'eat',1200);this.tweens.add({targets:bunny,scale:1.12,duration:220,yoyo:true,repeat:1});}
          const sent=next.patches.flatMap((stage,id)=>stage===3&&previous.patches[id]!==3?[id]:[]);
          for(const id of sent){
            if(role==='explorer')arriving.add(id);
            const round=next.round;
            const carrot=this.add.text(role==='helper'?250:30,role==='helper'?300:40,'🥕',{fontSize:'44px'}).setOrigin(.5);
            const curve=new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(carrot.x,carrot.y),new Phaser.Math.Vector2(340,-100),new Phaser.Math.Vector2(role==='helper'?480:100+id*150,role==='helper'?-40:350));
            const flight={t:0};
            this.tweens.add({targets:flight,t:1,duration:900,onUpdate:()=>{const point=curve.getPoint(flight.t);carrot.setPosition(point.x,point.y).setAngle(flight.t*160);},onComplete:()=>{carrot.destroy();if(displayedState.round===round){arriving.delete(id);renderSupplies();}}});
            for(let i=0;i<5;i++){
              const sparkle=this.add.text(160+i*50,160-i*18,'✨',{fontSize:'24px'});
              this.tweens.add({targets:sparkle,alpha:0,y:sparkle.y-35,duration:800,onComplete:()=>sparkle.destroy()});
            }
          }
          renderSupplies();
          if(next.complete&&!previous.complete){
            this.time.delayedCall(1200,()=>setBunnyPose(bunny,'happy',2400));
            for(let i=0;i<28;i++){
              const star=this.add.text(Phaser.Math.Between(15,480),-40-i*12,['⭐','🎉','✨'][i%3],{fontSize:'28px'});
              this.tweens.add({targets:star,y:470,angle:Phaser.Math.Between(-180,180),duration:1800+i*35,onComplete:()=>star.destroy()});
            }
            this.tweens.add({targets:bunny,scale:1.3,duration:400,yoyo:true,repeat:3});
          }
          previous=structuredClone(next);
        };
        const hearts=()=>{
          setBunnyPose(bunny,'happy',1400);
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
