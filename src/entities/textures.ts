/**
 * Toda a arte estática é gerada aqui uma única vez (Graphics → generateTexture).
 * Soldados desenhados olhando para a direita; o rival usa `setFlipX(true)`.
 */
import Phaser from 'phaser';
import type { UnitKind } from '../config/balance';
import { PAL, TEAM } from '../style/palette';

const INK = 4;
type G = Phaser.GameObjects.Graphics;

export const UNIT_TEX = {
  w: 96,
  h: 100,
  /** linha dos pés dentro da textura */
  foot: 94,
} as const;

export const unitKey = (kind: UnitKind, side: 0 | 1): string => `u_${kind}_${side}`;

function poly(g: G, pts: number[], fill: number, line = INK): void {
  const p = [];
  for (let i = 0; i < pts.length; i += 2) p.push(new Phaser.Math.Vector2(pts[i], pts[i + 1]));
  g.fillStyle(fill, 1);
  g.fillPoints(p, true);
  if (line > 0) {
    g.lineStyle(line, PAL.tinta, 1);
    g.strokePoints(p, true);
  }
}

function circle(g: G, x: number, y: number, r: number, fill: number, line = INK): void {
  g.fillStyle(fill, 1);
  g.fillCircle(x, y, r);
  if (line > 0) {
    g.lineStyle(line, PAL.tinta, 1);
    g.strokeCircle(x, y, r);
  }
}

function rect(g: G, x: number, y: number, w: number, h: number, fill: number, r = 0, line = INK) {
  g.fillStyle(fill, 1);
  if (r > 0) g.fillRoundedRect(x, y, w, h, r);
  else g.fillRect(x, y, w, h);
  if (line > 0) {
    g.lineStyle(line, PAL.tinta, 1);
    if (r > 0) g.strokeRoundedRect(x, y, w, h, r);
    else g.strokeRect(x, y, w, h);
  }
}

function line(g: G, x1: number, y1: number, x2: number, y2: number, w: number, color: number) {
  g.lineStyle(w + INK, PAL.tinta, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(w, color, 1);
  g.lineBetween(x1, y1, x2, y2);
}

/** Crista em leque sobre o elmo (cx, cy = centro do elmo). */
function crest(g: G, cx: number, cy: number, color: number, dark: number, tall = 1): void {
  const pts: number[] = [];
  const r1 = 12;
  const r2 = 12 + 12 * tall;
  for (let a = 200; a <= 340; a += 10) {
    const rad = Phaser.Math.DegToRad(a);
    pts.push(cx - 2 + Math.cos(rad) * r2, cy - 4 + Math.sin(rad) * r2);
  }
  for (let a = 340; a >= 200; a -= 10) {
    const rad = Phaser.Math.DegToRad(a);
    pts.push(cx - 2 + Math.cos(rad) * r1, cy - 4 + Math.sin(rad) * r1);
  }
  poly(g, pts, color);
  g.lineStyle(2, dark, 1);
  for (let a = 215; a <= 325; a += 22) {
    const rad = Phaser.Math.DegToRad(a);
    g.lineBetween(
      cx - 2 + Math.cos(rad) * (r1 + 2),
      cy - 4 + Math.sin(rad) * (r1 + 2),
      cx - 2 + Math.cos(rad) * (r2 - 3),
      cy - 4 + Math.sin(rad) * (r2 - 3),
    );
  }
}

/** Cabeça com elmo de bronze (e crista opcional). */
function head(
  g: G,
  cx: number,
  cy: number,
  team: (typeof TEAM)[number],
  opts: { crest?: number; cap?: boolean } = {},
): void {
  if (opts.crest) crest(g, cx, cy, team.base, team.dark, opts.crest);
  circle(g, cx, cy, 12, PAL.pele);
  if (opts.cap) {
    // gorro de couro do arqueiro
    poly(
      g,
      [cx - 13, cy - 1, cx - 10, cy - 12, cx + 2, cy - 16, cx + 12, cy - 8, cx + 13, cy - 2],
      team.base,
    );
  } else {
    // elmo: cúpula + protetor de nuca + nasal
    g.fillStyle(PAL.bronze, 1);
    g.beginPath();
    g.arc(cx, cy, 13, Math.PI, 0, false);
    g.closePath();
    g.fillPath();
    g.lineStyle(INK, PAL.tinta, 1);
    g.strokePath();
    rect(g, cx - 14, cy - 2, 9, 14, PAL.bronze, 3);
    rect(g, cx + 6, cy - 3, 4, 10, PAL.bronze, 1, 2);
    g.fillStyle(PAL.marfim, 0.7);
    g.fillEllipse(cx + 3, cy - 8, 8, 4);
  }
  // olho e sobrancelha grossa
  g.fillStyle(PAL.tinta, 1);
  g.fillCircle(cx + 8, cy + 2, 2.2);
  g.lineStyle(3, PAL.tinta, 1);
  g.lineBetween(cx + 4, cy - 2, cx + 12, cy - 1);
}

function legs(g: G, x: number, foot: number): void {
  rect(g, x - 10, foot - 22, 8, 22, PAL.pele, 2);
  rect(g, x + 3, foot - 22, 8, 22, PAL.pele, 2);
  g.lineStyle(2, PAL.madeira, 1);
  for (const lx of [x - 10, x + 3]) {
    g.lineBetween(lx, foot - 12, lx + 8, foot - 8);
    g.lineBetween(lx, foot - 6, lx + 8, foot - 2);
  }
  rect(g, x - 12, foot - 4, 11, 4, PAL.madeira, 1, 2);
  rect(g, x + 2, foot - 4, 12, 4, PAL.madeira, 1, 2);
}

/** Tronco com túnica do time; `armor` = couraça de bronze. */
function body(g: G, x: number, foot: number, team: (typeof TEAM)[number], armor: boolean): void {
  const top = foot - 56;
  poly(g, [x - 15, top, x + 15, top, x + 19, foot - 20, x - 19, foot - 20], team.base);
  // sombra chapada (luz vem da direita)
  g.fillStyle(team.dark, 0.6);
  g.fillTriangle(x - 13, top + 4, x - 17, foot - 22, x - 6, foot - 22);
  if (armor) rect(g, x - 14, top + 2, 28, 20, PAL.bronze, 6);
  rect(g, x - 16, foot - 30, 32, 5, PAL.bronzeEscuro, 1, 2);
  g.lineStyle(2, team.dark, 1);
  for (let i = -12; i <= 12; i += 6) g.lineBetween(x + i, foot - 25, x + i * 1.2, foot - 21);
}

function shield(g: G, x: number, y: number, r: number, team: (typeof TEAM)[number], side: 0 | 1) {
  circle(g, x, y, r, PAL.bronze);
  g.lineStyle(3, PAL.bronzeEscuro, 1);
  g.strokeCircle(x, y, r - 4);
  // emblema: onda (Calídria) ou chama (Quelmora)
  if (side === 0) {
    g.lineStyle(4, team.base, 1);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const px = x - r * 0.55 + (i / 10) * r * 1.1;
      const py = y + Math.sin(i * 0.9) * r * 0.18;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  } else {
    const s = r * 0.45;
    poly(
      g,
      [x, y - s * 1.3, x + s * 0.8, y + s * 0.3, x, y + s, x - s * 0.8, y + s * 0.3],
      team.base,
      2,
    );
  }
  g.fillStyle(PAL.marfim, 0.55);
  g.fillEllipse(x + r * 0.35, y - r * 0.4, r * 0.5, r * 0.25);
}

function spear(g: G, x1: number, y1: number, x2: number, y2: number): void {
  line(g, x1, y1, x2, y2, 4, PAL.madeira);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const tip = (d: number, off: number) => [
    x2 + Math.cos(ang) * d + Math.cos(ang + Math.PI / 2) * off,
    y2 + Math.sin(ang) * d + Math.sin(ang + Math.PI / 2) * off,
  ];
  poly(g, [...tip(14, 0), ...tip(0, 5), ...tip(-4, 0), ...tip(0, -5)], PAL.bronze, 3);
}

function drawInfantry(g: G, kind: UnitKind, side: 0 | 1): void {
  const team = TEAM[side];
  const x = 42;
  const foot = UNIT_TEX.foot;
  g.fillStyle(PAL.tinta, 0.3);
  g.fillEllipse(x + 2, foot, 50, 10);
  if (kind === 'general') {
    // capa atrás
    poly(g, [x - 10, foot - 56, x - 4, foot - 54, x - 22, foot - 14, x - 32, foot - 18], team.dark);
  }
  if (kind === 'arqueiro') {
    // aljava nas costas
    rect(g, x - 22, foot - 60, 9, 26, PAL.madeira, 3);
    line(g, x - 19, foot - 60, x - 22, foot - 70, 2, PAL.marfim);
    line(g, x - 15, foot - 60, x - 14, foot - 71, 2, PAL.marfim);
  }
  if (kind === 'lanceiro') spear(g, x + 18, foot - 4, x + 30, foot - 92);
  if (kind === 'general') {
    line(g, x + 14, foot - 40, x + 34, foot - 76, 5, PAL.marfim);
    rect(g, x + 10, foot - 42, 10, 5, PAL.bronzeEscuro, 1, 2);
  }
  if (kind === 'escudeiro') line(g, x - 6, foot - 40, x - 14, foot - 70, 5, PAL.marfim);
  legs(g, x, foot);
  body(g, x, foot, team, kind === 'escudeiro' || kind === 'general');
  const hx = x + 2;
  const hy = foot - 68;
  if (kind === 'arqueiro') head(g, hx, hy, team, { cap: true });
  else head(g, hx, hy, team, { crest: kind === 'general' ? 1.6 : 1 });
  if (kind === 'general') {
    // segunda crista (crista dupla) mais clara
    g.fillStyle(PAL.marfim, 0.85);
    g.fillEllipse(hx - 6, hy - 27, 18, 5);
  }
  if (kind === 'escudeiro') shield(g, x + 18, foot - 40, 19, team, side);
  if (kind === 'lanceiro') {
    shield(g, x + 6, foot - 40, 13, team, side);
    circle(g, x + 20, foot - 44, 5, PAL.pele, 3);
  }
  if (kind === 'general') {
    shield(g, x - 2, foot - 38, 14, team, side);
    circle(g, x + 15, foot - 42, 5, PAL.pele, 3);
  }
  if (kind === 'arqueiro') {
    // arco à frente com corda
    g.lineStyle(INK + 4, PAL.tinta, 1);
    g.beginPath();
    g.arc(x + 14, foot - 44, 22, -1.25, 1.25, false);
    g.strokePath();
    g.lineStyle(4, PAL.madeira, 1);
    g.beginPath();
    g.arc(x + 14, foot - 44, 22, -1.25, 1.25, false);
    g.strokePath();
    const a = 1.25;
    g.lineStyle(2, PAL.marfim, 1);
    g.lineBetween(
      x + 14 + Math.cos(-a) * 22,
      foot - 44 + Math.sin(-a) * 22,
      x + 14 + Math.cos(a) * 22,
      foot - 44 + Math.sin(a) * 22,
    );
    line(g, x + 8, foot - 44, x + 40, foot - 44, 2, PAL.madeira);
    circle(g, x + 20, foot - 44, 5, PAL.pele, 3);
  }
}

function drawCavalry(g: G, side: 0 | 1): void {
  const team = TEAM[side];
  const foot = UNIT_TEX.foot;
  const cx = 46;
  g.fillStyle(PAL.tinta, 0.3);
  g.fillEllipse(cx, foot, 84, 12);
  // pernas do cavalo
  for (const lx of [cx - 26, cx - 14, cx + 12, cx + 24])
    rect(g, lx - 4, foot - 30, 8, 30, PAL.areiaSombra, 3);
  for (const lx of [cx - 26, cx - 14, cx + 12, cx + 24])
    rect(g, lx - 5, foot - 6, 10, 6, PAL.tinta, 2, 0);
  // cauda
  poly(
    g,
    [cx - 34, foot - 48, cx - 44, foot - 30, cx - 40, foot - 22, cx - 32, foot - 40],
    team.base,
  );
  // tronco
  g.fillStyle(PAL.areiaSombra, 1);
  g.fillEllipse(cx, foot - 42, 76, 32);
  g.lineStyle(INK, PAL.tinta, 1);
  g.strokeEllipse(cx, foot - 42, 76, 32);
  // manta na cor do time
  poly(
    g,
    [cx - 16, foot - 56, cx + 10, foot - 56, cx + 8, foot - 32, cx - 14, foot - 32],
    team.base,
    3,
  );
  // pescoço e cabeça
  poly(
    g,
    [cx + 24, foot - 52, cx + 36, foot - 76, cx + 46, foot - 70, cx + 38, foot - 40],
    PAL.areiaSombra,
  );
  poly(
    g,
    [
      cx + 34,
      foot - 80,
      cx + 56,
      foot - 70,
      cx + 58,
      foot - 62,
      cx + 46,
      foot - 60,
      cx + 34,
      foot - 66,
    ],
    PAL.areiaSombra,
  );
  poly(g, [cx + 36, foot - 80, cx + 38, foot - 90, cx + 42, foot - 79], PAL.areiaSombra, 3);
  g.fillStyle(PAL.tinta, 1);
  g.fillCircle(cx + 46, foot - 72, 2.4);
  // crina
  poly(
    g,
    [cx + 34, foot - 80, cx + 22, foot - 56, cx + 28, foot - 54, cx + 38, foot - 72],
    team.base,
    3,
  );
  // cavaleiro
  const rx = cx - 2;
  const top = foot - 92;
  poly(g, [rx - 12, top + 18, rx + 12, top + 18, rx + 14, top + 44, rx - 14, top + 44], team.base);
  rect(g, rx - 12, top + 20, 24, 14, PAL.bronze, 5);
  rect(g, rx - 6, top + 38, 10, 16, PAL.pele, 3);
  head(g, rx + 2, top + 8, team, { crest: 1 });
  spear(g, rx - 14, top + 44, rx + 46, top + 6);
  circle(g, rx + 12, top + 30, 5, PAL.pele, 3);
}

function drawSiege(g: G, side: 0 | 1): void {
  const team = TEAM[side];
  const foot = UNIT_TEX.foot;
  const cx = 46;
  g.fillStyle(PAL.tinta, 0.3);
  g.fillEllipse(cx, foot, 84, 12);
  // braço e contrapeso (atrás)
  line(g, cx - 30, foot - 26, cx + 20, foot - 86, 6, PAL.madeira);
  rect(g, cx - 40, foot - 36, 20, 18, PAL.bronzeEscuro, 3);
  // caçamba com pedra
  g.fillStyle(PAL.madeira, 1);
  g.fillEllipse(cx + 22, foot - 88, 18, 10);
  g.lineStyle(3, PAL.tinta, 1);
  g.strokeEllipse(cx + 22, foot - 88, 18, 10);
  circle(g, cx + 22, foot - 92, 6, PAL.monte, 3);
  // cavaletes
  poly(
    g,
    [cx - 6, foot - 60, cx + 2, foot - 60, cx + 18, foot - 18, cx - 22, foot - 18],
    PAL.madeira,
  );
  circle(g, cx - 2, foot - 58, 5, PAL.bronze, 3);
  // base
  rect(g, cx - 40, foot - 26, 80, 10, PAL.madeira, 3);
  // pano do time
  poly(
    g,
    [cx - 30, foot - 24, cx - 4, foot - 24, cx - 8, foot - 10, cx - 26, foot - 10],
    team.base,
    3,
  );
  // rodas
  for (const wx of [cx - 26, cx + 26]) {
    circle(g, wx, foot - 12, 12, PAL.madeira);
    g.lineStyle(3, PAL.tinta, 1);
    g.lineBetween(wx - 10, foot - 12, wx + 10, foot - 12);
    g.lineBetween(wx, foot - 22, wx, foot - 2);
    circle(g, wx, foot - 12, 3, PAL.bronze, 2);
  }
}

function genUnits(scene: Phaser.Scene): void {
  const kinds: UnitKind[] = [
    'escudeiro',
    'lanceiro',
    'arqueiro',
    'cavaleiro',
    'fundibulo',
    'general',
  ];
  for (const side of [0, 1] as const) {
    for (const kind of kinds) {
      const g = scene.add.graphics();
      if (kind === 'cavaleiro') drawCavalry(g, side);
      else if (kind === 'fundibulo') drawSiege(g, side);
      else drawInfantry(g, kind, side);
      g.generateTexture(unitKey(kind, side), UNIT_TEX.w, UNIT_TEX.h);
      g.destroy();
    }
  }
}

/** Tenda do quartel (sem estandarte; o pano é animado na cena). */
function genCamp(scene: Phaser.Scene): void {
  for (const side of [0, 1] as const) {
    const team = TEAM[side];
    const g = scene.add.graphics();
    g.fillStyle(PAL.tinta, 0.3);
    g.fillEllipse(70, 116, 130, 14);
    poly(g, [10, 114, 70, 22, 130, 114], PAL.marfim);
    for (const [a, b] of [
      [30, 40],
      [56, 66],
    ]) {
      poly(g, [70, 22, 10 + a * 1.2, 114, 10 + b * 1.2, 114], team.base, 3);
    }
    g.fillStyle(PAL.areiaSombra, 0.5);
    g.fillTriangle(70, 22, 10, 114, 40, 114);
    poly(g, [56, 114, 70, 70, 84, 114], PAL.tinta, 0);
    rect(g, 4, 108, 132, 8, PAL.madeira, 2, 3);
    g.generateTexture(`camp_${side}`, 140, 124);
    g.destroy();
  }
}

/** Partículas e projéteis. */
function genFx(scene: Phaser.Scene): void {
  let g = scene.add.graphics();
  g.fillStyle(PAL.branco, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(PAL.branco, 1);
  g.fillCircle(16, 16, 16);
  g.generateTexture('puff', 32, 32);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(PAL.branco, 1);
  g.fillTriangle(0, 3, 12, 0, 12, 6);
  g.generateTexture('spark', 12, 6);
  g.destroy();

  g = scene.add.graphics();
  line(g, 4, 6, 30, 6, 2, PAL.madeira);
  poly(g, [30, 2, 38, 6, 30, 10], PAL.bronze, 2);
  poly(g, [2, 2, 8, 6, 2, 10], PAL.marfim, 2);
  g.generateTexture('arrow', 40, 12);
  g.destroy();

  g = scene.add.graphics();
  circle(g, 10, 10, 7, PAL.monte, 3);
  g.generateTexture('stone', 20, 20);
  g.destroy();

  g = scene.add.graphics();
  g.lineStyle(6, PAL.branco, 1);
  g.strokeCircle(48, 48, 44);
  g.generateTexture('ring', 96, 96);
  g.destroy();

  // anel de seleção achatado no chão
  g = scene.add.graphics();
  g.lineStyle(4, PAL.branco, 1);
  g.strokeEllipse(40, 12, 72, 18);
  g.generateTexture('selring', 80, 24);
  g.destroy();

  // ícones de ordem (avançar / segurar / recuar) e de reforço
  const icon = (key: string, draw: (gg: G) => void) => {
    const gg = scene.add.graphics();
    draw(gg);
    gg.generateTexture(key, 24, 24);
    gg.destroy();
  };
  icon('ord_avancar', (gg) => poly(gg, [5, 4, 20, 12, 5, 20], PAL.marfim, 3));
  icon('ord_recuar', (gg) => poly(gg, [19, 4, 4, 12, 19, 20], PAL.marfim, 3));
  icon('ord_segurar', (gg) => rect(gg, 5, 5, 14, 14, PAL.marfim, 2, 3));
  icon('buff_atk', (gg) => {
    line(gg, 5, 19, 19, 5, 3, PAL.marfim);
    line(gg, 4, 12, 12, 20, 3, PAL.bronze);
  });
  icon('buff_def', (gg) => {
    poly(gg, [4, 4, 20, 4, 20, 12, 12, 21, 4, 12], PAL.marfim, 3);
    gg.fillStyle(PAL.egeu, 1);
    gg.fillRect(10, 6, 4, 11);
  });
  icon('coin', (gg) => {
    circle(gg, 12, 12, 9, PAL.bronze, 3);
    gg.fillStyle(PAL.ceuHorizonte, 1);
    gg.fillCircle(10, 10, 3);
  });

  // vinheta barata (anéis concêntricos pretos de alpha crescente)
  g = scene.add.graphics();
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    g.lineStyle(60, PAL.preto, 0.03 * t);
    g.strokeEllipse(640, 360, 1280 + 900 * t, 720 + 600 * t);
  }
  g.generateTexture('vignette', 1280, 720);
  g.destroy();
}

export function generateTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('dot')) return;
  genUnits(scene);
  genCamp(scene);
  genFx(scene);
}
