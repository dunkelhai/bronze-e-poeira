/** Representação visual de uma unidade: sprite, barra de vida, ordem e reforços. */
import Phaser from 'phaser';
import { UNITS } from '../config/balance';
import type { Order, Unit } from '../systems/battle';
import { hitFlash } from '../systems/fx';
import { PAL } from '../style/palette';
import { UNIT_TEX, unitKey } from './textures';
import { LAYOUT, cellX } from './Valley';

const BAR_W = 56;

export class UnitView {
  readonly c: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Image;
  private barBg: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private orderIcon: Phaser.GameObjects.Image;
  private atkIcon: Phaser.GameObjects.Image;
  private defIcon: Phaser.GameObjects.Image;
  private breath: Phaser.Tweens.Tween;
  readonly id: number;
  readonly side: 0 | 1;
  readonly tall: number;
  maxHp: number;

  constructor(
    private scene: Phaser.Scene,
    u: Unit,
  ) {
    this.id = u.id;
    this.side = u.side;
    this.maxHp = u.maxHp;
    const big = u.kind === 'cavaleiro' || u.kind === 'fundibulo';
    this.tall = big ? 104 : 96;
    this.c = scene.add.container(cellX(u.cell), LAYOUT.groundY).setDepth(10 + u.cell);
    this.sprite = scene.add
      .image(0, 0, unitKey(u.kind, u.side))
      .setOrigin(0.5, UNIT_TEX.foot / UNIT_TEX.h)
      .setFlipX(u.side === 1);
    if (u.kind === 'general') this.sprite.setScale(1.08);
    const by = -this.tall - 8;
    this.barBg = scene.add.rectangle(0, by, BAR_W + 4, 10, PAL.tinta).setOrigin(0.5);
    this.bar = scene.add
      .rectangle(-BAR_W / 2, by, BAR_W, 6, u.side === 0 ? PAL.vidaAliada : PAL.vidaRival)
      .setOrigin(0, 0.5);
    this.orderIcon = scene.add.image(BAR_W / 2 + 14, by, 'ord_avancar').setScale(0.8);
    this.orderIcon.setVisible(u.side === 0);
    this.atkIcon = scene.add.image(-BAR_W / 2 - 12, by - 18, 'buff_atk').setVisible(false);
    this.defIcon = scene.add.image(-BAR_W / 2 + 12, by - 18, 'buff_def').setVisible(false);
    this.c.add([this.sprite, this.barBg, this.bar, this.orderIcon, this.atkIcon, this.defIcon]);
    this.breath = scene.tweens.add({
      targets: this.sprite,
      scaleY: this.sprite.scaleY * 1.03,
      duration: 1600 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.setHp(u.hp);
    this.setOrder(u.order);
  }

  setHp(hp: number): void {
    const k = Phaser.Math.Clamp(hp / this.maxHp, 0, 1);
    this.bar.width = BAR_W * k;
  }

  setOrder(o: Order): void {
    this.orderIcon.setTexture(`ord_${o}`);
  }

  setBuffs(atk: boolean, def: boolean): void {
    this.atkIcon.setVisible(atk);
    this.defIcon.setVisible(def);
  }

  flash(): void {
    hitFlash(this.scene, this.sprite);
  }

  setCell(cell: number): void {
    this.c.x = cellX(cell);
    this.c.setDepth(10 + cell);
  }

  /** Marcha até a casa `to` com bob de passos; `onStep` dispara poeira/tambor. */
  march(to: number, msPerCell: number, onStep: (x: number) => void): Promise<void> {
    const fromX = this.c.x;
    const toX = cellX(to);
    const cells = Math.max(1, Math.round(Math.abs(toX - fromX) / LAYOUT.cellW));
    const dur = cells * msPerCell;
    this.c.setDepth(10 + to);
    const bob = this.scene.tweens.add({
      targets: this.sprite,
      y: -4,
      angle: this.side === 0 ? 2 : -2,
      duration: msPerCell / 2,
      yoyo: true,
      repeat: cells - 1,
      ease: 'Sine.easeOut',
      onYoyo: () => onStep(this.c.x),
    });
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.c,
        x: toX,
        duration: dur,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          bob.stop();
          this.sprite.y = 0;
          this.sprite.angle = 0;
          resolve();
        },
      });
    });
  }

  /** Avanço curto até o alvo e volta (golpe corpo a corpo). */
  lunge(dir: number, onHit: () => void): Promise<void> {
    const x0 = this.c.x;
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.c,
        x: x0 + dir * 26,
        duration: 110,
        ease: 'Quad.easeIn',
        onComplete: () => {
          onHit();
          this.scene.tweens.add({
            targets: this.c,
            x: x0,
            duration: 160,
            ease: 'Quad.easeOut',
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  /** Recuo ao levar golpe. */
  recoil(dir: number): void {
    const x0 = cellX(Math.round((this.c.x - LAYOUT.cellX0) / LAYOUT.cellW));
    this.scene.tweens.add({
      targets: this.c,
      x: x0 + dir * 10,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => (this.c.x = x0),
    });
  }

  die(): Promise<void> {
    this.breath.stop();
    this.orderIcon.setVisible(false);
    this.atkIcon.setVisible(false);
    this.defIcon.setVisible(false);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        angle: this.side === 0 ? -80 : 80,
        alpha: 0,
        y: 6,
        duration: 420,
        ease: 'Quad.easeIn',
      });
      this.scene.tweens.add({
        targets: [this.barBg, this.bar],
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.scene.time.delayedCall(240, () => {
            this.c.destroy();
            resolve();
          });
        },
      });
    });
  }

  static label(kind: Unit['kind']): string {
    return UNITS[kind].nome;
  }
}
