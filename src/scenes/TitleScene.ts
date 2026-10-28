import Phaser from 'phaser';
import { Banners } from '../entities/Banners';
import { unitKey } from '../entities/textures';
import { LAYOUT, Valley } from '../entities/Valley';
import { initAudio, sfx } from '../systems/audio';
import { goto } from '../systems/fx';
import { isDebug } from '../systems/settings';
import { FONT_TITLE, FONT_UI, PAL, PALS } from '../style/palette';

const CONTROLS: [string, string][] = [
  ['1 – 5', 'recrutar (escudeiro, lança-longa, arqueiro, cavaleiro, fundíbulo)'],
  ['← / →', 'escolher a tropa · mouse: clicar na tropa'],
  ['X / Shift', 'alternar ordem: avançar → segurar → recuar'],
  ['Z / Espaço', 'confirmar a ordem e ir à próxima tropa'],
  ['Q / W', 'Brado do Vale / Muralha de Bronze (general)'],
  ['E', 'encerrar o turno (segure Espaço para acelerar o combate)'],
  ['Esc / R', 'pausa / reiniciar'],
  ['Mouse', 'botões e clique na tropa; mouse sobre inimigo = previsão'],
];

export class TitleScene extends Phaser.Scene {
  private valley!: Valley;
  private banners!: Banners;
  private marchers: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    this.marchers = [];
    this.cameras.main.fadeIn(250);
    this.valley = new Valley(this, false);
    this.banners = new Banners(this);
    this.add.image(640, 360, 'vignette').setDepth(400);

    // fileira marchando ao fundo
    const kinds = ['escudeiro', 'lanceiro', 'general', 'arqueiro', 'cavaleiro'] as const;
    kinds.forEach((k, i) => {
      const m = this.add
        .image(-120 - i * 110, LAYOUT.groundY, unitKey(k, 0))
        .setOrigin(0.5, 0.94)
        .setDepth(10);
      this.tweens.add({ targets: m, y: LAYOUT.groundY - 4, duration: 170, yoyo: true, repeat: -1 });
      this.marchers.push(m);
    });

    const panel = this.add.graphics().setDepth(450);
    panel.fillStyle(PAL.preto, 0.45);
    panel.fillRoundedRect(220, 326, 840, 268, 12);

    const title = this.add
      .text(640, 170, 'BRONZE E POEIRA', {
        fontFamily: FONT_TITLE,
        fontSize: '96px',
        color: PALS.ceuHorizonte,
        stroke: PALS.tinta,
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(460)
      .setShadow(4, 6, '#000000', 0, true, true);
    title.setScale(0.6);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });

    this.add
      .text(640, 262, 'Calídria contra Quelmora pela posse do Vale de Brumacor', {
        fontFamily: FONT_UI,
        fontStyle: '800',
        fontSize: '26px',
        color: PALS.marfim,
        stroke: PALS.tinta,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(460);

    this.add
      .text(
        640,
        300,
        'Derrube o estandarte inimigo, ou o general e todas as tropas. Limite: 30 turnos.',
        {
          fontFamily: FONT_UI,
          fontStyle: '600',
          fontSize: '18px',
          color: PALS.areia,
          stroke: PALS.tinta,
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(460);

    CONTROLS.forEach(([k, d], i) => {
      const y = 340 + i * 31;
      this.add
        .text(392, y, k, {
          fontFamily: FONT_UI,
          fontStyle: '800',
          fontSize: '20px',
          color: PALS.ceuHorizonte,
        })
        .setOrigin(1, 0)
        .setDepth(460);
      this.add
        .text(412, y, d, {
          fontFamily: FONT_UI,
          fontStyle: '600',
          fontSize: '20px',
          color: PALS.marfim,
        })
        .setDepth(460);
    });

    const press = this.add
      .text(640, 634, 'Pressione Espaço para marchar', {
        fontFamily: FONT_UI,
        fontStyle: '800',
        fontSize: '32px',
        color: PALS.marfim,
        stroke: PALS.tinta,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(460);
    this.tweens.add({ targets: press, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(640, 690, `v0.1 · arte e sons gerados por código${isDebug ? ' · DEBUG' : ''}`, {
        fontFamily: FONT_UI,
        fontStyle: '600',
        fontSize: '16px',
        color: PALS.marfim,
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(460);

    const start = () => {
      initAudio();
      sfx.ability();
      goto(this, 'Battle');
    };
    this.input.keyboard!.on('keydown-SPACE', start);
    press.setInteractive({ useHandCursor: true }).on('pointerdown', start);
  }

  update(_t: number, dt: number): void {
    this.valley.update(dt);
    this.banners.update(dt);
    for (const m of this.marchers) {
      m.x += dt * 0.05;
      if (m.x > 1400) m.x = -160;
    }
  }
}
