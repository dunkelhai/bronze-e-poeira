/** Botão de UI com fundo arredondado, tecla de atalho, hover e pop. */
import Phaser from 'phaser';
import { pop } from '../systems/fx';
import { sfx } from '../systems/audio';
import { FONT_UI, PAL, PALS } from '../style/palette';

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  hotkey?: string;
  size?: number;
  /** deslocamento horizontal do rótulo (abre espaço para a tecla) */
  textDx?: number;
  color?: number;
  onClick: () => void;
  /** chamado ao clicar com o botão desabilitado (para explicar o motivo) */
  onDenied?: () => void;
}

export class Button {
  readonly c: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  readonly text: Phaser.GameObjects.Text;
  private key?: Phaser.GameObjects.Text;
  private enabled = true;
  private active = false;
  private hover = false;
  color: number;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    private o: ButtonOpts,
  ) {
    this.color = o.color ?? PAL.terracota;
    this.c = scene.add.container(x, y).setDepth(500);
    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(o.textDx ?? 0, 0, o.label, {
        fontFamily: FONT_UI,
        fontStyle: '800',
        fontSize: `${o.size ?? 20}px`,
        color: PALS.marfim,
        stroke: PALS.tinta,
        strokeThickness: 4,
        align: 'center',
        lineSpacing: -2,
      })
      .setOrigin(0.5);
    this.c.add([this.bg, this.text]);
    if (o.hotkey) {
      this.key = scene.add
        .text(-o.w / 2 + 8, -o.h / 2 + 6, o.hotkey, {
          fontFamily: FONT_UI,
          fontStyle: '800',
          fontSize: '16px',
          color: PALS.tinta,
          backgroundColor: PALS.areia,
          padding: { x: 5, y: 1 },
        })
        .setOrigin(0, 0);
      this.c.add(this.key);
    }
    this.c.setSize(o.w, o.h);
    this.c.setInteractive({ useHandCursor: true });
    this.c.on('pointerover', () => {
      this.hover = true;
      this.draw();
    });
    this.c.on('pointerout', () => {
      this.hover = false;
      this.draw();
    });
    this.c.on('pointerdown', () => this.press());
    this.draw();
  }

  press(): void {
    if (!this.enabled) {
      sfx.denied();
      this.o.onDenied?.();
      return;
    }
    sfx.ui();
    pop(this.scene, this.c);
    this.o.onClick();
  }

  setEnabled(v: boolean): this {
    if (v !== this.enabled) {
      this.enabled = v;
      this.draw();
    }
    return this;
  }

  setActive(v: boolean): this {
    if (v !== this.active) {
      this.active = v;
      this.draw();
    }
    return this;
  }

  setLabel(s: string): this {
    if (this.text.text !== s) this.text.setText(s);
    return this;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  draw(): void {
    const { w, h } = this.o;
    const g = this.bg;
    g.clear();
    const fill = this.enabled ? this.color : PAL.areiaSombra;
    g.fillStyle(PAL.tinta, 0.5);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 12);
    g.fillStyle(fill, this.enabled ? 1 : 0.7);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.fillStyle(PAL.marfim, this.hover && this.enabled ? 0.22 : 0.1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.4, 9);
    g.lineStyle(this.active ? 5 : 4, this.active ? PAL.ceuHorizonte : PAL.tinta, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.text.setAlpha(this.enabled ? 1 : 0.6);
  }
}
