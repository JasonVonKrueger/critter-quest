import Phaser from 'phaser';
import { foodGaze,type Gaze } from './gaze';
import type {BunnyPose} from './bunny';
export function preloadSnake(scene:Phaser.Scene){
  scene.load.atlas('snake-gaze-v1','/assets/characters/snake/snake-gaze-v1.png','/assets/characters/snake/snake-gaze-v1.json');
  scene.load.atlas('snake-v1','/assets/characters/snake/snake-v1.png','/assets/characters/snake/snake-v1.json');
  scene.load.atlas('rabbits-v1','/assets/objects/rabbits/rabbits-v1.png','/assets/objects/rabbits/rabbits-v1.json');
}
class Snake extends Phaser.GameObjects.Container {
  private gaze:Gaze='forward';
  private currentPose:BunnyPose='idle';
  private image:Phaser.GameObjects.Image;
  private timer?:Phaser.Time.TimerEvent;
  private tongue:Phaser.GameObjects.Graphics;
  private tongueTimer?:Phaser.Time.TimerEvent;
  private tongueTween?:Phaser.Tweens.Tween;
  private resting=true;
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.image(0,0,'snake-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    this.tongue=scene.add.graphics({x:-5,y:-29});
    this.tongue.lineStyle(5.5,0xd95b7d,1);
    this.tongue.beginPath();this.tongue.moveTo(0,0);this.tongue.lineTo(0,24);
    this.tongue.lineTo(-5,31);this.tongue.moveTo(0,24);this.tongue.lineTo(5,31);this.tongue.strokePath();
    this.tongue.setScale(1,0).setVisible(false);this.add(this.tongue);
    this.idle();this.scheduleTongue();
    this.once('destroy',()=>{this.timer?.remove(false);this.tongueTimer?.remove(false);this.tongueTween?.remove();});
  }
  private showFrame(pose:BunnyPose){
    this.currentPose=pose;
    if(pose==='idle'&&this.gaze!=='forward'&&this.scene.textures.exists('snake-gaze-v1'))this.image.setTexture('snake-gaze-v1',this.gaze).setDisplaySize(270,270);
    else this.image.setTexture('snake-v1',pose).setDisplaySize(270,270);
  }
  lookAt(foodX:number|null){
    const gaze=foodGaze(this.x,foodX);
    if(gaze===this.gaze)return;
    this.gaze=gaze;if(this.currentPose==='idle')this.showFrame('idle');
  }
  private idle(){
    this.resting=true;
    this.showFrame('idle');
    this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{
      this.showFrame('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());
    });
  }
  private scheduleTongue(){
    this.tongueTimer=this.scene.time.delayedCall(Phaser.Math.Between(1800,4200),()=>{
      if(!this.resting){this.scheduleTongue();return;}
      this.tongue.setVisible(true).setScale(1,0);
      this.tongueTween=this.scene.tweens.add({
        targets:this.tongue,scaleY:1,duration:180,hold:160,yoyo:true,repeat:1,repeatDelay:180,
        ease:'Sine.inOut',onComplete:()=>{this.tongue.setVisible(false);this.scheduleTongue();},
      });
    });
  }
  pose(pose:BunnyPose,duration=900){
    this.resting=false;this.tongueTween?.remove();this.tongueTimer?.remove(false);
    this.tongue.setVisible(false).setScale(1,0);this.scheduleTongue();
    this.timer?.remove(false);this.showFrame(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());
  }
}
export function createSnake(scene:Phaser.Scene,x:number,y:number){return new Snake(scene,x,y);}
export function setSnakePose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Snake)actor.pose(pose,duration);}

export function setSnakeGaze(snake:Phaser.GameObjects.GameObject,foodX:number|null){
  if(snake instanceof Snake)snake.lookAt(foodX);
}
