import Phaser from 'phaser';
import { FONT_UI, PAL, PALS } from '../style/palette';
import { settings } from './settings';

export function shake(scene: Phaser.Scene, kind: 'leve' | 'cerco' | 'forte' = 'leve'): void {
  if (settings.reduceMotion) return;
  const cam = scene.cameras.main;
  if (kind === 'forte') cam.shake(180, 0.007);
  else if (kind === 'cerco') cam.shake(120, 0.004);
  else cam.shake(90, 0.003);
}

/** Flash de tela cheia (alpha limitado a 0.3 com "reduzir flash"). */
export function screenFlash(scene: Phaser.Scene, color: number, alpha = 0.25, dur = 160): void {
  const a = settings.reduceMotion ? Math.min(alpha, 0.3) : alpha;
  const r = scene.add.rectangle(640, 360, 1280, 720, color, a).setDepth(900);
  scene.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}

export function hitFlash(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  img.setTintFill(PAL.branco);
  scene.time.delayedCall(80, () => img.clearTint());
}

/** Pop de UI: escala 1.0 → 1.1 → 1.0 em 140 ms. */
export function pop(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  base = 1,
): void {
  scene.tweens.killTweensOf(target);
  scene.tweens.add({
    targets: target,
    scaleX: base * 1.1,
    scaleY: base * 1.1,
    duration: 70,
    ease: 'Quad.easeOut',
    yoyo: true,
    onComplete: () => target.setScale(base),
  });
}

/** Número/texto flutuante: sobe 40 px em 600 ms e some. */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string,
  size = 32,
): void {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT_UI,
      fontStyle: '800',
      fontSize: `${size}px`,
      color,
      stroke: PALS.tinta,
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(800)
    .setScale(0.6);
  scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: t,
    y: y - 40,
    alpha: 0,
    duration: 600,
    delay: 220,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, () => resolve()));
}

export function tweenP(
  scene: Phaser.Scene,
  cfg: Phaser.Types.Tweens.TweenBuilderConfig,
): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...cfg, onComplete: () => resolve() });
  });
}

/** Transição padrão de cena. */
export function goto(scene: Phaser.Scene, key: string, data?: object): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning) return;
  cam.fadeOut(250, 0, 0, 0);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}
