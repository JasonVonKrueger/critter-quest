import Phaser from 'phaser';

/** Animate the egg already painted in the nest before revealing the ready owl. */
export function hatchOwl(scene:Phaser.Scene,nest:Phaser.GameObjects.Image,onComplete:()=>void){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const crack=scene.add.graphics().setDepth(nest.depth+1);
  const progress={value:0};
  const points=[[-3,-33],[1,-23],[-5,-15],[4,-7],[-2,1],[5,11],[0,22]];
  const draw=()=>{
    crack.setPosition(nest.x,nest.y).clear();
    crack.lineStyle(1.8,0x634635,1);
    crack.beginPath();
    crack.moveTo(points[0][0],points[0][1]);
    const length=progress.value*(points.length-1);
    for(let i=1;i<points.length;i++){
      const fraction=Phaser.Math.Clamp(length-i+1,0,1);
      const from=points[i-1],to=points[i];
      crack.lineTo(Phaser.Math.Linear(from[0],to[0],fraction),Phaser.Math.Linear(from[1],to[1],fraction));
      if(fraction<1)break;
    }
    crack.strokePath();
  };
  const wobble=reduced?undefined:scene.tweens.add({targets:nest,angle:3,duration:85,yoyo:true,repeat:5});
  const reveal=scene.tweens.add({targets:progress,value:1,duration:reduced?180:650,onUpdate:draw,onComplete:()=>{
    wobble?.stop();nest.setAngle(0);crack.destroy();onComplete();
  }});
  return()=>{reveal.stop();wobble?.stop();nest.setAngle(0);crack.destroy();};
}
