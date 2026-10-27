import Phaser from 'phaser';
import { Button } from '../entities/Button';
import { settings } from '../systems/settings';
import { FONT_TITLE, FONT_UI, PAL, PALS } from '../style/palette';

export class PauseScene extends Phaser.Scene {
  private motionBtn!: Button;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, PAL.preto, 0.6).setInteractive();
    this.add
      .text(640, 220, 'Pausa', {
        fontFamily: FONT_TITLE,
        fontSize: '64px',
        color: PALS.ceuHorizonte,
        stroke: PALS.tinta,
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(640, 300, 'Esc continua · R reinicia · T alterna tremor/flash · M volta ao título', {
        fontFamily: FONT_UI,
        fontStyle: '600',
        fontSize: '20px',
        color: PALS.marfim,
      })
      .setOrigin(0.5);
    new Button(this, 640, 390, {
      w: 320,
      h: 56,
      label: 'Continuar',
      size: 24,
      onClick: () => this.resume(),
    });
    this.motionBtn = new Button(this, 640, 462, {
      w: 420,
      h: 56,
      label: '',
      size: 22,
      color: PAL.bronzeEscuro,
      onClick: () => this.toggleMotion(),
    });
    new Button(this, 520, 548, {
      w: 220,
      h: 56,
      label: 'Reiniciar',
      size: 22,
      onClick: () => this.restart(),
    });
    new Button(this, 760, 548, {
      w: 220,
      h: 56,
      label: 'Título',
      size: 22,
      color: PAL.egeuEscuro,
      onClick: () => this.toTitle(),
    });
    this.updateMotion();
    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.resume());
    kb.on('keydown-R', () => this.restart());
    kb.on('keydown-T', () => this.toggleMotion());
    kb.on('keydown-M', () => this.toTitle());
  }

  private updateMotion(): void {
    this.motionBtn.setLabel(
      `Reduzir tremor/flash: ${settings.reduceMotion ? 'ligado' : 'desligado'}`,
    );
  }

  private toggleMotion(): void {
    settings.reduceMotion = !settings.reduceMotion;
    this.updateMotion();
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume('Battle');
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
