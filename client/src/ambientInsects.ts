import type Phaser from 'phaser';
import type { Environment } from './environment';
import { advanceInsect,isNightScene } from './ambientMotion';
export function preloadInsects(scene:Phaser.Scene,kind:Environment){
  const name=isNightScene(kind)?'firefly':'ant';
  scene.load.atlas(`${name}-v1`,`/assets/effects/${name}-v1.png`,`/assets/effects/${name}-v1.json`);
}
export function addAmbientInsects(scene:Phaser.Scene,kind:Environment,worldHeight:number){
  const night=isNightScene(kind),name=night?'firefly':'ant',key=`${name}-v1`;
  if(!scene.textures.exists(key))return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const insects=Array.from({length:night?5:3},(_,i)=>{
    const baseY=night?worldHeight*(.35+i*.07):worldHeight*(.84+i*.045);
    const sprite=scene.add.sprite(65+i*(night?85:160),baseY,key,'frame-1')
      .setDisplaySize(night?38:30,night?38:30).setDepth(-80).setAlpha(night?.9:.85);
    return {sprite,x:sprite.x,y:baseY,baseY,direction:i%2===0?1:-1,speed:night?7+i:9+i*2,elapsed:i*240,phase:i*1.7};
  });
  const update=(_time:number,delta:number)=>{
    for(const insect of insects){
      if(!reduced.matches)advanceInsect(insect,delta,night);
      const frame=reduced.matches?1:1+Math.floor(insect.elapsed/(night?110:140))%4;
      insect.sprite.setPosition(insect.x,insect.y).setFlipX(insect.direction<0).setFrame(`frame-${frame}`);
    }
  };
  update(0,0);scene.events.on('update',update);
  scene.events.once('shutdown',()=>{scene.events.off('update',update);});
}
