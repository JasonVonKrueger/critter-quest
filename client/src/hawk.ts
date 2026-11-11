import Phaser from 'phaser';
import {foodGaze,type Gaze} from './gaze';
import {stretchSize,stretchY} from './hawkStretchConfig';
import type {BunnyPose} from './bunny';
const stretchKey='hawk-wing-stretch-v1';
export function preloadHawk(scene:Phaser.Scene){
  scene.load.atlas('hawk-v1','/assets/characters/hawk/hawk-v1.png','/assets/characters/hawk/hawk-v1.json');
  scene.load.atlas('hawk-stretch-v1','/assets/characters/hawk/hawk-stretch-v1.png','/assets/characters/hawk/hawk-stretch-v1.json');
  scene.load.atlas('snake-items-v1','/assets/objects/snakes/snake-items-v1.png','/assets/objects/snakes/snake-items-v1.json');
}
class Hawk extends Phaser.GameObjects.Container {
  private image:Phaser.GameObjects.Sprite;
  private timer?:Phaser.Time.TimerEvent;
  private stretchTimer?:Phaser.Time.TimerEvent;
  private stretching=false;
  private gaze:Gaze='forward';
  private hungry=false;
  private currentPose:BunnyPose='idle';
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.sprite(0,0,'hawk-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    if(scene.textures.exists('hawk-stretch-v1')&&!scene.anims.exists(stretchKey))scene.anims.create({
      key:stretchKey,frames:Array.from({length:6},(_,i)=>({key:'hawk-stretch-v1',frame:`stretch-${i+1}`,duration:i===3?450:0})),frameRate:6,repeat:0,
    });
    this.image.on(Phaser.Animations.Events.ANIMATION_UPDATE,()=>this.image.setDisplaySize(stretchSize,stretchSize).setY(stretchY));
    this.image.on(`${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}${stretchKey}`,()=>{
      this.stretching=false;this.idle();this.scheduleStretch();
    });
    this.idle();this.scheduleStretch();
    this.once('destroy',()=>{this.timer?.remove(false);this.stretchTimer?.remove(false);});
  }
  private show(pose:BunnyPose){
    this.currentPose=pose;
    this.image.setTexture('hawk-v1',pose==='idle'?(this.gaze!=='forward'?this.gaze:this.hungry?'sad':'idle'):pose).setDisplaySize(270,270).setY(0);
  }
  private idle(){
    this.show('idle');
    this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{this.show('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());});
  }
  private scheduleStretch(){
    this.stretchTimer?.remove(false);
    this.stretchTimer=this.scene.time.delayedCall(Phaser.Math.Between(7000,12000),()=>{
      if(this.currentPose!=='idle'||this.stretching||matchMedia('(prefers-reduced-motion: reduce)').matches||!this.scene.anims.exists(stretchKey)){
        this.scheduleStretch();return;
      }
      this.timer?.remove(false);this.stretching=true;
      this.image.play(stretchKey).setDisplaySize(stretchSize,stretchSize).setY(stretchY);
    });
  }
  setHungry(hungry:boolean){if(this.hungry!==hungry){this.hungry=hungry;if(this.currentPose==='idle'&&!this.stretching)this.show('idle');}}
  lookAt(x:number|null){const gaze=foodGaze(this.x,x);if(gaze!==this.gaze){this.gaze=gaze;if(this.currentPose==='idle'&&!this.stretching)this.show('idle');}}
  pose(pose:BunnyPose,duration=900){
    this.timer?.remove(false);this.image.stop();this.stretching=false;this.scheduleStretch();
    this.show(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());
  }
}
export function createHawk(scene:Phaser.Scene,x:number,y:number){return new Hawk(scene,x,y);}
export function setHawkPose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Hawk)actor.pose(pose,duration);}
export function setHawkGaze(actor:Phaser.GameObjects.GameObject,x:number|null){if(actor instanceof Hawk)actor.lookAt(x);}
export function setHawkHungry(actor:Phaser.GameObjects.GameObject,hungry:boolean){if(actor instanceof Hawk)actor.setHungry(hungry);}
