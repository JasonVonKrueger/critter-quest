import Phaser from 'phaser';
import {foodGaze,type Gaze} from './gaze';
import type {BunnyPose} from './bunny';
export function preloadHawk(scene:Phaser.Scene){
  scene.load.atlas('hawk-v1','/assets/characters/hawk/hawk-v1.png','/assets/characters/hawk/hawk-v1.json');
  scene.load.atlas('snake-items-v1','/assets/objects/snakes/snake-items-v1.png','/assets/objects/snakes/snake-items-v1.json');
}
class Hawk extends Phaser.GameObjects.Container {
  private image:Phaser.GameObjects.Image;
  private timer?:Phaser.Time.TimerEvent;
  private gaze:Gaze='forward';
  private hungry=false;
  private currentPose:BunnyPose='idle';
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.image(0,0,'hawk-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    this.idle();this.once('destroy',()=>this.timer?.remove(false));
  }
  private show(pose:BunnyPose){this.currentPose=pose;this.image.setFrame(pose==='idle'?(this.gaze!=='forward'?this.gaze:this.hungry?'sad':'idle'):pose);}
  private idle(){this.show('idle');this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{this.show('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());});}
  setHungry(hungry:boolean){if(this.hungry!==hungry){this.hungry=hungry;if(this.currentPose==='idle')this.show('idle');}}
  lookAt(x:number|null){const gaze=foodGaze(this.x,x);if(gaze!==this.gaze){this.gaze=gaze;if(this.currentPose==='idle')this.show('idle');}}
  pose(pose:BunnyPose,duration=900){this.timer?.remove(false);this.show(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());}
}
export function createHawk(scene:Phaser.Scene,x:number,y:number){return new Hawk(scene,x,y);}
export function setHawkPose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Hawk)actor.pose(pose,duration);}
export function setHawkGaze(actor:Phaser.GameObjects.GameObject,x:number|null){if(actor instanceof Hawk)actor.lookAt(x);}

export function setHawkHungry(actor:Phaser.GameObjects.GameObject,hungry:boolean){if(actor instanceof Hawk)actor.setHungry(hungry);}
