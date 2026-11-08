import Phaser from 'phaser';
import type {BunnyPose} from './bunny';
export function preloadSnake(scene:Phaser.Scene){
  scene.load.atlas('snake-v1','/assets/characters/snake/snake-v1.png','/assets/characters/snake/snake-v1.json');
  scene.load.atlas('rabbits-v1','/assets/objects/rabbits/rabbits-v1.png','/assets/objects/rabbits/rabbits-v1.json');
}
class Snake extends Phaser.GameObjects.Container {
  private image:Phaser.GameObjects.Image;
  private timer?:Phaser.Time.TimerEvent;
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.image=scene.add.image(0,0,'snake-v1','idle').setDisplaySize(270,270);this.add(this.image);this.setSize(210,230);
    this.idle();this.once('destroy',()=>this.timer?.remove(false));
  }
  private idle(){
    this.image.setFrame('idle');
    this.timer=this.scene.time.delayedCall(Phaser.Math.Between(2400,5000),()=>{
      this.image.setFrame('blink');this.timer=this.scene.time.delayedCall(150,()=>this.idle());
    });
  }
  pose(pose:BunnyPose,duration=900){
    this.timer?.remove(false);this.image.setFrame(pose);this.timer=this.scene.time.delayedCall(duration,()=>this.idle());
  }
}
export function createSnake(scene:Phaser.Scene,x:number,y:number){return new Snake(scene,x,y);}
export function setSnakePose(actor:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){if(actor instanceof Snake)actor.pose(pose,duration);}
