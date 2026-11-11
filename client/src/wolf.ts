import Phaser from 'phaser';
import {foodGaze,type Gaze} from './gaze';
import {howlSize,howlY} from './wolfHowlConfig';
import type {BunnyPose} from './bunny';
const howlKey='wolf-howl-v1';
export function preloadWolf(scene:Phaser.Scene){
  scene.load.atlas('wolf-v1','/assets/characters/wolf/wolf-v1.png','/assets/characters/wolf/wolf-v1.json');
  scene.load.atlas('wolf-howl-v1','/assets/characters/wolf/wolf-howl-v1.png','/assets/characters/wolf/wolf-howl-v1.json');
  scene.load.atlas('bobcat-items-v1','/assets/objects/bobcats/bobcat-items-v1.png','/assets/objects/bobcats/bobcat-items-v1.json');
}
class Wolf extends Phaser.GameObjects.Container {
  private image:Phaser.GameObjects.Sprite;
  private timer?:Phaser.Time.TimerEvent;
  private howlTimer?:Phaser.Time.TimerEvent;
  private howling=false;
  private gaze:Gaze='forward';
  private hungry=false;
  private currentPose:BunnyPose='idle';
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.sprite(0,0,'wolf-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    if(scene.textures.exists('wolf-howl-v1')&&!scene.anims.exists(howlKey))scene.anims.create({
      key:howlKey,frames:Array.from({length:6},(_,i)=>({key:'wolf-howl-v1',frame:`howl-${i+1}`,duration:i===3?650:0})),frameRate:6,repeat:0,
    });
    this.image.on(Phaser.Animations.Events.ANIMATION_UPDATE,()=>this.image.setDisplaySize(howlSize,howlSize).setY(howlY));
    this.image.on(`${Phaser.Animations.Events.ANIMATION_COMPLETE_KEY}${howlKey}`,()=>{
      this.howling=false;this.idle();this.scheduleHowl();
    });
    this.idle();this.scheduleHowl();
    this.once('destroy',()=>{this.timer?.remove(false);this.howlTimer?.remove(false);});
  }
  private show(pose:BunnyPose){
    this.currentPose=pose;
    this.image.setTexture('wolf-v1',pose==='idle'?(this.gaze!=='forward'?this.gaze:this.hungry?'sad':'idle'):pose).setDisplaySize(270,270).setY(0);
  }
  private idle(){
    this.show('idle');
    this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{this.show('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());});
  }
  private scheduleHowl(){
    this.howlTimer?.remove(false);
    this.howlTimer=this.scene.time.delayedCall(Phaser.Math.Between(8000,14000),()=>{
      if(this.currentPose!=='idle'||this.howling||matchMedia('(prefers-reduced-motion: reduce)').matches||!this.scene.anims.exists(howlKey)){
        this.scheduleHowl();return;
      }
      this.timer?.remove(false);this.howling=true;
      this.image.play(howlKey).setDisplaySize(howlSize,howlSize).setY(howlY);
    });
  }
  setHungry(hungry:boolean){if(this.hungry!==hungry){this.hungry=hungry;if(this.currentPose==='idle'&&!this.howling)this.show('idle');}}
  lookAt(x:number|null){const gaze=foodGaze(this.x,x);if(gaze!==this.gaze){this.gaze=gaze;if(this.currentPose==='idle'&&!this.howling)this.show('idle');}}
  pose(pose:BunnyPose,duration=900){
    this.timer?.remove(false);this.image.stop();this.howling=false;this.scheduleHowl();
    this.show(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());
  }
}
export function createWolf(scene:Phaser.Scene,x:number,y:number){return new Wolf(scene,x,y);}
export function setWolfPose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Wolf)actor.pose(pose,duration);}
export function setWolfGaze(actor:Phaser.GameObjects.GameObject,x:number|null){if(actor instanceof Wolf)actor.lookAt(x);}
export function setWolfHungry(actor:Phaser.GameObjects.GameObject,hungry:boolean){if(actor instanceof Wolf)actor.setHungry(hungry);}
