import Phaser from 'phaser';
export type Environment='meadow'|'garden';
export function preloadEnvironment(scene:Phaser.Scene,kind:Environment){
  scene.load.image(`${kind}-v1`,kind==='garden'?'/assets/backgrounds/garden-v2.png':'/assets/backgrounds/meadow-v1.png');
}
/** Cover the whole viewport independently of the centered gameplay coordinates. */
export function addEnvironment(scene:Phaser.Scene,kind:Environment,worldHeight:number){
  const key=`${kind}-v1`;
  if(!scene.textures.exists(key))return;
  const background=scene.add.image(250,worldHeight/2,key).setDepth(-100);
  const cover=()=>{
    const zoom=Math.min(scene.scale.width/500,scene.scale.height/worldHeight);
    background.setScale(Math.max(scene.scale.width/zoom/background.width,scene.scale.height/zoom/background.height));
  };
  cover();scene.scale.on('resize',cover);
  scene.events.once('shutdown',()=>scene.scale.off('resize',cover));
  return background;
}
