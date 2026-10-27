import Phaser from 'phaser';
import { PALS } from './style/palette';

async function loadFonts(): Promise<void> {
  const wanted = ['900 32px "Cinzel Decorative"', '600 16px Rubik', '800 16px Rubik'];
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000));
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f))).then(() => undefined),
    timeout,
  ]);
  await document.fonts.ready;
}

async function boot(): Promise<void> {
  await loadFonts();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: PALS.tinta,
    antialias: true,
    roundPixels: true,
    fps: { target: 60 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

void boot();
