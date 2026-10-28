/** Cenário do vale: céu de fim de tarde, montes, ruínas e planície com parallax leve. */
import Phaser from 'phaser';
import { BAL } from '../config/balance';
import { PAL, TEAM } from '../style/palette';

export const LAYOUT = {
  cellX0: 96,
  cellW: 99,
  groundY: 508,
} as const;

export const cellX = (cell: number): number => LAYOUT.cellX0 + cell * LAYOUT.cellW;

const W = 1400; // camadas mais largas que a tela para o deslocamento

function genSky(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  // degradê em faixas (fillGradientStyle não funciona em generateTexture/canvas)
  const stops: [number, number][] = [
    [0, PAL.ceuAlto],
    [300, PAL.ceuPoente],
    [460, PAL.ceuHorizonte],
  ];
  const lerp = (a: number, b: number, t: number) => {
    const ca = Phaser.Display.Color.IntegerToColor(a);
    const cb = Phaser.Display.Color.IntegerToColor(b);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  };
  for (let y = 0; y < 460; y += 4) {
    const i = y < 300 ? 0 : 1;
    const [y0, c0] = stops[i];
    const [y1, c1] = stops[i + 1];
    g.fillStyle(lerp(c0, c1, (y - y0) / (y1 - y0)), 1);
    g.fillRect(0, y, 1280, 4);
  }
  g.fillStyle(PAL.ceuHorizonte, 1);
  g.fillRect(0, 460, 1280, 260);
  // sol baixo com halos
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(PAL.ceuHorizonte, 0.08);
    g.fillCircle(960, 360, 64 + i * 26);
  }
  g.fillStyle(PAL.marfim, 1);
  g.fillCircle(960, 360, 62);
  g.fillStyle(PAL.ceuHorizonte, 1);
  g.fillCircle(966, 366, 56);
  g.generateTexture('sky', 1280, 720);
  g.destroy();

  for (let i = 0; i < 3; i++) {
    const c = scene.add.graphics();
    c.fillStyle(PAL.marfim, 1);
    const w = 220 + i * 50;
    c.fillEllipse(w / 2, 22, w, 22);
    c.fillEllipse(w * 0.35, 16, w * 0.45, 22);
    c.fillEllipse(w * 0.62, 14, w * 0.35, 18);
    c.generateTexture(`cloud${i}`, w, 40);
    c.destroy();
  }
}

function genHills(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(PAL.monte, 0.65);
  const back: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, 260)];
  for (let x = 0; x <= W; x += 20) {
    const y = 120 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017 + 1) * 18;
    back.push(new Phaser.Math.Vector2(x, y));
  }
  back.push(new Phaser.Math.Vector2(W, 260));
  g.fillPoints(back, true);
  g.fillStyle(PAL.monte, 0.95);
  const front: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, 260)];
  for (let x = 0; x <= W; x += 20) {
    const y = 170 + Math.sin(x * 0.009 + 2) * 30 + Math.sin(x * 0.023) * 10;
    front.push(new Phaser.Math.Vector2(x, y));
  }
  front.push(new Phaser.Math.Vector2(W, 260));
  g.fillPoints(front, true);
  g.generateTexture('hills', W, 260);
  g.destroy();
}

function column(
  g: Phaser.GameObjects.Graphics,
  x: number,
  base: number,
  h: number,
  broken: boolean,
) {
  const w = 26;
  const top = base - h;
  g.fillStyle(PAL.terracota, 1);
  if (broken) {
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x, base),
        new Phaser.Math.Vector2(x, top + 14),
        new Phaser.Math.Vector2(x + w, top),
        new Phaser.Math.Vector2(x + w, base),
      ],
      true,
    );
  } else {
    g.fillRect(x, top, w, h);
    g.fillRect(x - 6, top - 10, w + 12, 10);
  }
  g.fillRect(x - 5, base - 8, w + 10, 8);
  g.fillStyle(PAL.tinta, 0.25);
  for (let i = 1; i <= 3; i++) g.fillRect(x + (w / 4) * i - 1, top + (broken ? 18 : 2), 2, h - 22);
  g.fillStyle(PAL.tinta, 0.2);
  g.fillRect(x, top + (broken ? 14 : 0), 6, h - (broken ? 14 : 0));
}

function genRuins(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const base = 200;
  // templo arruinado
  for (let i = 0; i < 5; i++) column(g, 160 + i * 46, base, 120, i === 3);
  g.fillStyle(PAL.terracota, 1);
  g.fillRect(150, base - 140, 150, 14);
  g.fillTriangle(150, base - 140, 225, base - 176, 300, base - 140);
  g.fillStyle(PAL.tinta, 0.2);
  g.fillTriangle(176, base - 144, 225, base - 166, 274, base - 144);
  // colunas soltas e arquitrave tombada
  column(g, 560, base, 150, false);
  column(g, 620, base, 96, true);
  g.fillStyle(PAL.terracota, 1);
  g.fillRect(650, base - 18, 110, 18);
  column(g, 980, base, 130, false);
  column(g, 1040, base, 130, false);
  g.fillRect(970, base - 150, 106, 12);
  column(g, 1210, base, 70, true);
  g.generateTexture('ruins', W, 210);
  g.destroy();
}

function genGround(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, 320)];
  for (let x = 0; x <= W; x += 20) {
    pts.push(new Phaser.Math.Vector2(x, 20 + Math.sin(x * 0.01) * 6 + Math.sin(x * 0.031) * 3));
  }
  pts.push(new Phaser.Math.Vector2(W, 320));
  g.fillStyle(PAL.areia, 1);
  g.fillPoints(pts, true);
  // faixas de sombra
  g.fillStyle(PAL.areiaSombra, 0.5);
  g.fillRect(0, 34, W, 6);
  g.fillStyle(PAL.areiaSombra, 0.35);
  for (let i = 0; i < 70; i++) {
    const x = (i * 97) % W;
    const y = 50 + ((i * 53) % 200);
    g.fillEllipse(x, y, 30 + (i % 4) * 10, 5);
  }
  g.generateTexture('ground', W, 320);
  g.destroy();

  // casa do eixo: lajota de pedra
  const t = scene.add.graphics();
  t.fillStyle(PAL.areiaSombra, 1);
  t.fillEllipse(44, 12, 84, 20);
  t.fillStyle(PAL.areia, 0.6);
  t.fillEllipse(40, 9, 70, 12);
  t.generateTexture('tile', 88, 24);
  t.destroy();
}

export function generateValley(scene: Phaser.Scene): void {
  if (scene.textures.exists('sky')) return;
  genSky(scene);
  genHills(scene);
  genRuins(scene);
  genGround(scene);
}

/** Camadas do cenário + nuvens; `update()` aplica parallax pelo ponteiro. */
export class Valley {
  private layers: { img: Phaser.GameObjects.Image; f: number; x: number }[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private offset = 0;

  constructor(
    private scene: Phaser.Scene,
    withTiles = true,
  ) {
    generateValley(scene);
    scene.add.image(640, 360, 'sky').setDepth(-100);
    for (let i = 0; i < 3; i++) {
      const c = scene.add
        .image(200 + i * 420, 90 + i * 60, `cloud${i}`)
        .setAlpha(0.35)
        .setDepth(-95);
      this.clouds.push(c);
    }
    const add = (key: string, y: number, f: number, alpha = 1) => {
      const img = scene.add
        .image(640, y, key)
        .setOrigin(0.5, 0)
        .setDepth(-90 + f * 100);
      img.setAlpha(alpha);
      this.layers.push({ img, f, x: 640 });
    };
    add('hills', 230, 0.03);
    add('ruins', 262, 0.07, 0.88);
    add('ground', 462, 0);
    if (withTiles) {
      for (let c = 0; c < BAL.casas; c++) {
        const t = scene.add.image(cellX(c), LAYOUT.groundY + 2, 'tile').setDepth(-70);
        if (c === 0 || c === BAL.casas - 1) t.setTint(TEAM[c === 0 ? 0 : 1].base).setAlpha(0.55);
      }
    }
  }

  update(dt: number): void {
    const p = this.scene.input.activePointer;
    const target = Phaser.Math.Clamp(p.x - 640, -640, 640);
    this.offset += (target - this.offset) * Math.min(1, dt * 0.003);
    for (const l of this.layers) l.img.x = l.x - this.offset * l.f;
    for (const [i, c] of this.clouds.entries()) {
      c.x += dt * (0.006 + i * 0.004);
      if (c.x - c.width / 2 > 1280) c.x = -c.width / 2;
    }
  }
}
