import Phaser from 'phaser';
export type Environment='meadow'|'garden'|'jungle';
export function preloadEnvironment(scene:Phaser.Scene,kind:Environment){
  scene.load.image(`${kind}-v1`,kind==='jungle'?'/assets/backgrounds/jungle-v1.png':kind==='garden'?'/assets/backgrounds/garden-v3.png':'/assets/backgrounds/meadow-v2.png');
  scene.load.image('cloud-v1','/assets/effects/cloud-v1.png');
}
/** Cover the whole viewport independently of the centered gameplay coordinates. */
export function addEnvironment(scene:Phaser.Scene,kind:Environment,worldHeight:number){
  const key=`${kind}-v1`;
  if(!scene.textures.exists(key))return;
  const background=scene.add.image(250,worldHeight/2,key).setDepth(-100);
  // Restrict clouds to the open sky so they never pass over the tree or foreground.
  const sky=kind==='meadow'
    ? [[.47,0],[.90,0],[.92,.09],[.86,.15],[.78,.17],[.64,.17],[.55,.16],[.43,.16],[.39,.14],[.44,.08]]
    : [[.50,0],[1,0],[1,.09],[.90,.10],[.85,.13],[.72,.17],[.59,.16],[.46,.17],[.40,.14],[.47,.07]];
  const maskArt=scene.make.graphics({x:0,y:0},false);
  const mask=maskArt.createGeometryMask();
  const clouds=kind!=='jungle'&&scene.textures.exists('cloud-v1')?[0,1,2].map(i=>({
    image:scene.add.image(0,0,'cloud-v1').setDepth(-99).setMask(mask),
    x:.4+i*.22,y:.055+(i%2)*.045,width:.18+i*.025,speed:.000006+i*.0000015,
  })):[];
  const positionClouds=()=>{
    const left=background.x-background.displayWidth/2,top=background.y-background.displayHeight/2;
    maskArt.clear().fillStyle(0xffffff).fillPoints(sky.map(([x,y])=>new Phaser.Math.Vector2(left+x*background.displayWidth,top+y*background.displayHeight)),true);
    for(const cloud of clouds){
      cloud.image.setPosition(left+cloud.x*background.displayWidth,top+cloud.y*background.displayHeight);
      cloud.image.setScale(background.displayWidth*cloud.width/cloud.image.width);
      cloud.image.setAlpha(Math.min(1,Math.max(0,(cloud.x-.25)/.13),Math.max(0,(1.08-cloud.x)/.13))*.9);
    }
  };
  const cover=()=>{
    const zoom=Math.min(scene.scale.width/500,scene.scale.height/worldHeight);
    background.setScale(Math.max(scene.scale.width/zoom/background.width,scene.scale.height/zoom/background.height));
    positionClouds();
  };
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const drift=(_time:number,delta:number)=>{
    if(reducedMotion.matches)return;
    for(const cloud of clouds){cloud.x+=Math.min(delta,100)*cloud.speed;if(cloud.x>1.08)cloud.x=.25;}
    positionClouds();
  };
  cover();scene.scale.on('resize',cover);scene.events.on('update',drift);
  scene.events.once('shutdown',()=>{
    scene.scale.off('resize',cover);scene.events.off('update',drift);
    clouds.forEach(cloud=>cloud.image.clearMask());mask.destroy();maskArt.destroy();
  });
  return background;
}
