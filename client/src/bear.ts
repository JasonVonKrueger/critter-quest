import Phaser from 'phaser';
import {foodGaze,type Gaze} from './gaze';
import type {BunnyPose} from './bunny';
export function preloadBear(scene:Phaser.Scene){
  scene.load.atlas('bear-v1','/assets/characters/bear/bear-v1.png','/assets/characters/bear/bear-v1.json');
  scene.load.atlas('wolf-items-v1','/assets/objects/wolves/wolf-items-v1.png','/assets/objects/wolves/wolf-items-v1.json');
}
class Bear extends Phaser.GameObjects.Container {
  private image:Phaser.GameObjects.Sprite;
  private timer?:Phaser.Time.TimerEvent;
  private gaze:Gaze='forward';
  private hungry=false;
  private currentPose:BunnyPose='idle';
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.sprite(0,0,'bear-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    this.idle();
    this.once('destroy',()=>{this.timer?.remove(false);});
  }
  private show(pose:BunnyPose){
    this.currentPose=pose;
    this.image.setTexture('bear-v1',pose==='idle'?(this.gaze!=='forward'?this.gaze:this.hungry?'sad':'idle'):pose).setDisplaySize(270,270);
  }
  private idle(){
    this.show('idle');
    this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{this.show('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());});
  }
  setHungry(hungry:boolean){if(this.hungry!==hungry){this.hungry=hungry;if(this.currentPose==='idle')this.show('idle');}}
  lookAt(x:number|null){const gaze=foodGaze(this.x,x);if(gaze!==this.gaze){this.gaze=gaze;if(this.currentPose==='idle')this.show('idle');}}
  pose(pose:BunnyPose,duration=900){
    this.timer?.remove(false);this.image.stop();
    this.show(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());
  }
}
export function createBear(scene:Phaser.Scene,x:number,y:number){return new Bear(scene,x,y);}
export function setBearPose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Bear)actor.pose(pose,duration);}
export function setBearGaze(actor:Phaser.GameObjects.GameObject,x:number|null){if(actor instanceof Bear)actor.lookAt(x);}
export function setBearHungry(actor:Phaser.GameObjects.GameObject,hungry:boolean){if(actor instanceof Bear)actor.setHungry(hungry);}
