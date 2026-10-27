/** Quartéis e estandartes tremulando (um único Graphics redesenhado por frame). */
import Phaser from 'phaser';
import { BAL } from '../config/balance';
import { PAL, TEAM } from '../style/palette';
import { LAYOUT, cellX } from './Valley';

export class Banners {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private flashUntil = [0, 0];
  readonly poleX: [number, number];
  readonly topY = LAYOUT.groundY - 210;

  constructor(private scene: Phaser.Scene) {
    this.poleX = [cellX(0) - 34, cellX(BAL.casas - 1) + 34];
    scene.add
      .image(cellX(0) - 26, LAYOUT.groundY + 8, 'camp_0')
      .setOrigin(0.5, 1)
      .setDepth(-60);
    scene.add
      .image(cellX(BAL.casas - 1) + 26, LAYOUT.groundY + 8, 'camp_1')
      .setOrigin(0.5, 1)
      .setDepth(-60)
      .setFlipX(true);
    this.g = scene.add.graphics().setDepth(-55);
  }

  /** centro do pano (para efeitos de dano no estandarte) */
  clothCenter(side: 0 | 1): { x: number; y: number } {
    const dir = side === 0 ? 1 : -1;
    return { x: this.poleX[side] + dir * 40, y: this.topY + 26 };
  }

  flash(side: 0 | 1): void {
    this.flashUntil[side] = this.scene.time.now + 140;
  }

  update(dt: number): void {
    this.t += dt / 1000;
    const g = this.g;
    g.clear();
    for (const side of [0, 1] as const) {
      const px = this.poleX[side];
      const dir = side === 0 ? 1 : -1;
      // mastro
      g.lineStyle(10, PAL.tinta, 1);
      g.lineBetween(px, LAYOUT.groundY, px, this.topY - 8);
      g.lineStyle(6, PAL.madeira, 1);
      g.lineBetween(px, LAYOUT.groundY, px, this.topY - 8);
      g.fillStyle(PAL.bronze, 1);
      g.fillCircle(px, this.topY - 10, 7);
      g.lineStyle(3, PAL.tinta, 1);
      g.strokeCircle(px, this.topY - 10, 7);
      // pano com bordas senoidais
      const len = 84;
      const h = 52;
      const top: Phaser.Math.Vector2[] = [];
      const bottom: Phaser.Math.Vector2[] = [];
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const wave = Math.sin(this.t * 5 + k * 5 + side) * 5 * k;
        const x = px + dir * k * len;
        top.push(new Phaser.Math.Vector2(x, this.topY + wave));
        bottom.push(new Phaser.Math.Vector2(x, this.topY + h + wave - k * 6));
      }
      const pts = top.concat(bottom.reverse());
      const flashing = this.scene.time.now < this.flashUntil[side];
      g.fillStyle(flashing ? PAL.branco : TEAM[side].base, 1);
      g.fillPoints(pts, true);
      g.lineStyle(4, PAL.tinta, 1);
      g.strokePoints(pts, true);
      // faixa e emblema acompanhando a onda
      const mid = 0.5;
      const wave = Math.sin(this.t * 5 + mid * 5 + side) * 5 * mid;
      const ex = px + dir * mid * len;
      const ey = this.topY + h / 2 + wave - 2;
      g.fillStyle(PAL.marfim, 1);
      g.fillCircle(ex, ey, 11);
      g.fillStyle(TEAM[side].dark, 1);
      if (side === 0) {
        g.fillRect(ex - 7, ey - 2, 14, 4);
      } else {
        g.fillTriangle(ex, ey - 8, ex + 6, ey + 5, ex - 6, ey + 5);
      }
      g.lineStyle(2, PAL.bronzeEscuro, 1);
      g.lineBetween(px + dir * 6, this.topY + 6 + wave * 0.1, px + dir * 6, this.topY + h - 4);
    }
  }
}
