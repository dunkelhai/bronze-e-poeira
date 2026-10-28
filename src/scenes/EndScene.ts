import Phaser from 'phaser';
import { BAL } from '../config/balance';
import { Button } from '../entities/Button';
import type { EndReason } from '../systems/battle';
import { FONT_TITLE, FONT_UI, PAL, PALS } from '../style/palette';

export interface EndData {
  won: boolean;
  reason: EndReason;
  turn: number;
  kills: number;
  losses: number;
  recruited: number;
  banner: [number, number];
  seconds: number;
}

const REASON: Record<EndReason, [string, string]> = {
  estandarte: ['O estandarte de Quelmora tombou na poeira.', 'O estandarte de Calídria tombou.'],
  aniquilacao: [
    'O estratego e todo o exército de Quelmora caíram, sem ouro para reagir.',
    'Seu estratego e todas as suas tropas caíram.',
  ],
  tempo: [
    `${BAL.maxTurnos} turnos: seu estandarte resistiu mais.`,
    `${BAL.maxTurnos} turnos: o estandarte rival resistiu mais.`,
  ],
  debug: ['Vitória concedida (debug).', 'Derrota forçada (debug).'],
};

export class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  create(d: EndData): void {
    this.add.rectangle(640, 360, 1280, 720, PAL.preto, 0.6).setInteractive();
    const title = this.add
      .text(640, 260, d.won ? 'Vitória!' : 'Derrota', {
        fontFamily: FONT_TITLE,
        fontSize: '72px',
        color: d.won ? PALS.ceuHorizonte : PALS.carmimClaro,
        stroke: PALS.tinta,
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });
    const mm = Math.floor(d.seconds / 60);
    const ss = String(d.seconds % 60).padStart(2, '0');
    const lines = [
      REASON[d.reason][d.won ? 0 : 1],
      `Turnos: ${d.turn}/${BAL.maxTurnos}   ·   Tempo: ${mm}:${ss}`,
      `Tropas recrutadas: ${d.recruited}   ·   Abates: ${d.kills}   ·   Baixas: ${d.losses}`,
      `Estandartes: Calídria ${d.banner[0]}  ·  Quelmora ${d.banner[1]}`,
    ];
    this.add
      .text(640, 410, lines.join('\n'), {
        fontFamily: FONT_UI,
        fontStyle: '600',
        fontSize: '22px',
        color: PALS.marfim,
        align: 'center',
        lineSpacing: 10,
        stroke: PALS.tinta,
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    new Button(this, 504, 560, {
      w: 240,
      h: 56,
      label: 'Tentar de novo',
      hotkey: 'R',
      size: 22,
      onClick: () => this.restart(),
    });
    new Button(this, 776, 560, {
      w: 240,
      h: 56,
      label: 'Menu',
      hotkey: 'M',
      size: 22,
      color: PAL.egeuEscuro,
      onClick: () => this.toTitle(),
    });
    this.add
      .text(640, 630, 'Espaço ou R para jogar de novo', {
        fontFamily: FONT_UI,
        fontStyle: '600',
        fontSize: '18px',
        color: PALS.areia,
      })
      .setOrigin(0.5);
    const kb = this.input.keyboard!;
    kb.on('keydown-SPACE', () => this.restart());
    kb.on('keydown-R', () => this.restart());
    kb.on('keydown-M', () => this.toTitle());
  }

  private restart(): void {
    this.scene.stop();
    this.scene.stop('Battle');
    this.scene.start('Battle');
  }

  private toTitle(): void {
    this.scene.stop('Battle');
    this.scene.start('Title');
  }
}
