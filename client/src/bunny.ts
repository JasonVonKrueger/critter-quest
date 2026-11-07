import Phaser from 'phaser';

/** Full-body placeholder, grouped so all poses and tap reactions move together. */
export function createBunny(scene: Phaser.Scene, x: number, y: number) {
  const bunny = scene.add.container(x, y);
  const art = scene.add.graphics();
  const ellipse = (cx: number, cy: number, width: number, height: number, color: number) => {
    art.fillStyle(color); art.fillEllipse(cx, cy, width, height);
  };
  // Tail, plump body, belly, and oversized back paws.
  ellipse(48, 44, 35, 35, 0xe7dce9);
  ellipse(0, 37, 92, 101, 0xfff5ee);
  ellipse(0, 49, 59, 66, 0xffffff);
  ellipse(-29, 79, 43, 29, 0xfff5ee);
  ellipse(29, 79, 43, 29, 0xfff5ee);
  ellipse(-29, 82, 24, 13, 0xf5b5bf);
  ellipse(29, 82, 24, 13, 0xf5b5bf);
  // Ears and a round, expressive face.
  ellipse(-27, -66, 31, 87, 0xfff5ee);
  ellipse(27, -70, 31, 91, 0xfff5ee);
  ellipse(-27, -66, 16, 62, 0xf3aab8);
  ellipse(27, -70, 16, 66, 0xf3aab8);
  ellipse(0, -13, 111, 90, 0xfff5ee);
  ellipse(-22, -16, 24, 30, 0x563835);
  ellipse(22, -16, 24, 30, 0x563835);
  ellipse(-19, -22, 9, 11, 0xffffff);
  ellipse(25, -22, 9, 11, 0xffffff);
  ellipse(-36, 7, 22, 12, 0xf8c0c5);
  ellipse(36, 7, 22, 12, 0xf8c0c5);
  ellipse(0, 3, 13, 9, 0xe98f9e);
  art.lineStyle(2, 0x986b67);
  art.beginPath(); art.moveTo(0, 7); art.lineTo(0, 13); art.lineTo(-7, 17);
  art.moveTo(0, 13); art.lineTo(7, 17); art.strokePath();
  // Front paws sit over the belly.
  ellipse(-32, 37, 26, 40, 0xf4e3e1);
  ellipse(32, 37, 26, 40, 0xf4e3e1);
  bunny.add(art);
  bunny.setSize(145, 230);
  return bunny;
}
