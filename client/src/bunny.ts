import Phaser from 'phaser';
import { foodGaze,type Gaze } from './gaze';
import { createPlaceholderBunny } from './placeholderBunny';
const texture='bunny-v1';
export type BunnyPose='idle'|'blink'|'happy'|'eat';
export function preloadBunny(scene:Phaser.Scene){
  scene.load.atlas('bunny-gaze-v1','/assets/characters/bunny/bunny-gaze-v1.png','/assets/characters/bunny/bunny-gaze-v1.json');
  scene.load.atlas('bunny-sad-gaze-v1','/assets/characters/bunny/bunny-sad-gaze-v1.png','/assets/characters/bunny/bunny-sad-gaze-v1.json');
  scene.load.atlas('bunny-sad-v1','/assets/characters/bunny/bunny-sad-v1.png','/assets/characters/bunny/bunny-sad-v1.json');
  scene.load.atlas(texture,'/assets/characters/bunny/bunny-v1.png','/assets/characters/bunny/bunny-v1.json');
}
class SpriteBunny extends Phaser.GameObjects.Container {
  private hungry=false;
  private gaze:Gaze='forward';
  private currentPose:BunnyPose='idle';
  private sprite:Phaser.GameObjects.Image;
  private blinkTimer?:Phaser.Time.TimerEvent;
  private poseTimer?:Phaser.Time.TimerEvent;
  constructor(scene:Phaser.Scene,x:number,y:number){
    super(scene,x,y);scene.add.existing(this);
    this.sprite=scene.add.image(0,-10,texture,'idle').setDisplaySize(260,260);
    this.add(this.sprite);this.setSize(180,230);
    this.scheduleBlink(Phaser.Math.Between(1200,2600));
    this.once(Phaser.GameObjects.Events.DESTROY,()=>{this.blinkTimer?.remove(false);this.poseTimer?.remove(false);});
  }
  private showFrame(pose:BunnyPose){
    this.currentPose=pose;
    const sad=this.hungry&&(pose==='idle'||pose==='blink')&&this.scene.textures.exists('bunny-sad-v1');
    const gazeKey=this.hungry?'bunny-sad-gaze-v1':'bunny-gaze-v1';
    if(pose==='idle'&&this.gaze!=='forward'&&this.scene.textures.exists(gazeKey))this.sprite.setTexture(gazeKey,this.gaze).setDisplaySize(260,260);
    else this.sprite.setTexture(sad?'bunny-sad-v1':texture,pose).setDisplaySize(260,260);
  }
  lookAt(foodX:number|null){
    const gaze=foodGaze(this.x,foodX);
    if(gaze===this.gaze)return;
    this.gaze=gaze;if(this.currentPose==='idle')this.showFrame('idle');
  }
  setHungry(hungry:boolean){
    if(this.hungry===hungry)return;
    this.hungry=hungry;
    this.blinkTimer?.remove(false);this.poseTimer?.remove(false);
    this.showFrame('idle');this.scheduleBlink(1800);
  }
  private scheduleBlink(delay:number){
    this.blinkTimer=this.scene.time.delayedCall(delay,()=>{
      this.showFrame('blink');
      this.poseTimer=this.scene.time.delayedCall(150,()=>{
        this.showFrame('idle');
        this.scheduleBlink(Phaser.Math.Between(0,4)===0?240:Phaser.Math.Between(2400,5200));
      });
    });
  }
  pose(pose:BunnyPose,duration=900){
    this.blinkTimer?.remove(false);this.poseTimer?.remove(false);
    this.showFrame(pose);
    this.poseTimer=this.scene.time.delayedCall(duration,()=>{this.showFrame('idle');this.scheduleBlink(1800);});
  }
}
export function createBunny(scene:Phaser.Scene,x:number,y:number){
  return scene.textures.exists(texture)?new SpriteBunny(scene,x,y):createPlaceholderBunny(scene,x,y);
}
export function setBunnyPose(bunny:Phaser.GameObjects.GameObject,pose:BunnyPose,duration=900){
  if(bunny instanceof SpriteBunny)bunny.pose(pose,duration);
}

export function setBunnyHungry(bunny:Phaser.GameObjects.GameObject,hungry:boolean){
  if(bunny instanceof SpriteBunny)bunny.setHungry(hungry);
}

export function setBunnyGaze(bunny:Phaser.GameObjects.GameObject,foodX:number|null){
  if(bunny instanceof SpriteBunny)bunny.lookAt(foodX);
}
