import type Phaser from 'phaser';
/** Resize outside observer delivery, and only when the parent size actually changes. */
export function observeSceneSize(host:HTMLElement,game:Phaser.Game){
  let frame=0;
  const resize=new ResizeObserver(()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const width=Math.floor(host.clientWidth),height=Math.floor(host.clientHeight);
      if(width>0&&height>0&&(game.scale.width!==width||game.scale.height!==height))game.scale.resize(width,height);
    });
  });
  resize.observe(host);
  return()=>{resize.disconnect();cancelAnimationFrame(frame);};
}
