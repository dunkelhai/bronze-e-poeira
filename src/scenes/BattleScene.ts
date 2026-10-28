/** Cena principal: planejamento do jogador, resolução animada e turno da IA. */
import Phaser from 'phaser';
import { ANIM, BAL, RECRUIT_ORDER, UNITS, type RecruitKind } from '../config/balance';
import { Banners } from '../entities/Banners';
import { Button } from '../entities/Button';
import { UnitView } from '../entities/UnitView';
import { LAYOUT, Valley, cellX } from '../entities/Valley';
import { aiPlan } from '../systems/ai';
import { sfx } from '../systems/audio';
import {
  ORDERS,
  ORDER_NAME,
  canRecruit,
  recruitBlock,
  canUseAbility,
  computeDamage,
  createBattle,
  endRound,
  forceResult,
  forward,
  general,
  getUnit,
  planAction,
  recruit,
  resolveSide,
  sideUnits,
  startPlanning,
  useAbility,
  type Ability,
  type Battle,
  type BattleEvent,
  type Order,
  type Side,
  type Target,
  type Unit,
} from '../systems/battle';
import { floatText, pop, screenFlash, shake, tweenP, wait } from '../systems/fx';
import { mulberry32, type Rng } from '../systems/rng';
import { isDebug, settings } from '../systems/settings';
import { FONT_TITLE, FONT_UI, PAL, PALS, TEAM } from '../style/palette';

type Phase = 'plan' | 'resolve' | 'over';

const SHORT: Record<RecruitKind, string> = {
  escudeiro: 'Escudeiro',
  lanceiro: 'Lança-Longa',
  arqueiro: 'Arqueiro',
  cavaleiro: 'Cavaleiro',
  fundibulo: 'Fundíbulo',
};

const text = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 20,
  color: string = PALS.marfim,
  weight: '600' | '800' = '800',
): Phaser.GameObjects.Text =>
  scene.add
    .text(x, y, s, {
      fontFamily: FONT_UI,
      fontStyle: weight,
      fontSize: `${size}px`,
      color,
      stroke: PALS.tinta,
      strokeThickness: 5,
    })
    .setDepth(520);

export class BattleScene extends Phaser.Scene {
  b!: Battle;
  private rng!: Rng;
  private phase: Phase = 'plan';
  private views = new Map<number, UnitView>();
  private valley!: Valley;
  private banners!: Banners;
  private selectedId: number | null = null;
  private hoverId: number | null = null;
  private startTime = 0;

  // HUD
  private goldText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private moraleText: Phaser.GameObjects.Text[] = [];
  private bannerFill: Phaser.GameObjects.Rectangle[] = [];
  private bannerText: Phaser.GameObjects.Text[] = [];
  private bannerBox: Phaser.GameObjects.Container[] = [];
  private hint!: Phaser.GameObjects.Text;
  private announce!: Phaser.GameObjects.Text;
  private recruitBtns: Button[] = [];
  private costTexts: Phaser.GameObjects.Text[] = [];
  private orderBtns: Button[] = [];
  private abilityBtns: Record<Ability, Button> = {} as Record<Ability, Button>;
  private endBtn!: Button;
  private selName!: Phaser.GameObjects.Text;
  private selStats!: Phaser.GameObjects.Text;
  private selHint!: Phaser.GameObjects.Text;
  private selRing!: Phaser.GameObjects.Image;
  private previewG!: Phaser.GameObjects.Graphics;
  private previewText!: Phaser.GameObjects.Text;
  private tooltip!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;

  // partículas
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private chips!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.b = createBattle();
    this.rng = mulberry32((Date.now() & 0xffffffff) >>> 0);
    this.views.clear();
    // a instância da cena é reaproveitada no restart: zere as listas do HUD
    this.recruitBtns = [];
    this.costTexts = [];
    this.orderBtns = [];
    this.moraleText = [];
    this.bannerFill = [];
    this.bannerText = [];
    this.bannerBox = [];
    this.spaceDown = false;
    this.selectedId = null;
    this.hoverId = null;
    this.phase = 'plan';
    this.startTime = this.time.now;
    this.cameras.main.fadeIn(250);

    this.valley = new Valley(this);
    this.banners = new Banners(this);
    this.add.image(640, 360, 'vignette').setDepth(400).setAlpha(0.8);

    this.selRing = this.add
      .image(0, LAYOUT.groundY + 2, 'selring')
      .setTint(PAL.ceuHorizonte)
      .setDepth(5)
      .setVisible(false);
    this.tweens.add({
      targets: this.selRing,
      scale: 1.1,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.previewG = this.add.graphics().setDepth(300);
    this.previewText = text(this, 0, 0, '', 22, PALS.ceuHorizonte).setOrigin(0.5).setDepth(310);
    this.tooltip = this.add
      .text(0, 0, '', {
        fontFamily: FONT_UI,
        fontStyle: '600',
        fontSize: '17px',
        color: PALS.marfim,
        backgroundColor: 'rgba(42,26,18,0.85)',
        padding: { x: 10, y: 6 },
        lineSpacing: 2,
      })
      .setDepth(700)
      .setVisible(false);

    this.makeParticles();
    this.buildHud();
    for (const u of this.b.units) this.addView(u);
    this.bindKeys();

    this.events.off(Phaser.Scenes.Events.RESUME);
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.refresh());
    this.startPlayerTurn(true);
  }

  update(_t: number, dt: number): void {
    this.valley.update(dt);
    this.banners.update(dt);
    const sel = this.selectedId !== null ? this.views.get(this.selectedId) : undefined;
    if (sel && this.phase === 'plan') {
      this.selRing.setVisible(true).setPosition(sel.c.x, LAYOUT.groundY + 2);
    } else this.selRing.setVisible(false);
    // segurar Espaço acelera a resolução
    const fast = this.phase === 'resolve' && this.spaceDown;
    const ts = fast ? 3 : 1;
    if (this.tweens.timeScale !== ts) {
      this.tweens.timeScale = ts;
      this.time.timeScale = ts;
    }
    if (settings.showFps && this.time.now % 500 < dt) {
      this.fpsText.setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
    }
    this.fpsText.setVisible(settings.showFps);
  }

  /* ---------------- construção ---------------- */

  private makeParticles(): void {
    this.dust = this.add.particles(0, 0, 'puff', {
      emitting: false,
      lifespan: { min: 400, max: 700 },
      speed: { min: 20, max: 90 },
      angle: { min: 190, max: 350 },
      scale: { start: 0.35, end: 1.1 },
      alpha: { start: 0.55, end: 0 },
      gravityY: -20,
      tint: [PAL.areia, PAL.areiaSombra],
    });
    this.dust.setDepth(60);
    this.sparks = this.add.particles(0, 0, 'spark', {
      emitting: false,
      lifespan: { min: 250, max: 450 },
      speed: { min: 120, max: 260 },
      scale: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: PAL.ceuHorizonte,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.sparks.setDepth(70);
    this.chips = this.add.particles(0, 0, 'dot', {
      emitting: false,
      lifespan: 450,
      speed: { min: 100, max: 220 },
      angle: { min: 200, max: 340 },
      gravityY: 500,
      scale: { start: 0.6, end: 0 },
      tint: [PAL.bronze, PAL.areiaSombra],
    });
    this.chips.setDepth(70);
  }

  private buildHud(): void {
    // faixa superior
    const top = this.add.graphics().setDepth(490);
    top.fillStyle(PAL.preto, 0.45);
    top.fillRoundedRect(40, 8, 440, 64, 12);
    top.fillRoundedRect(800, 8, 440, 64, 12);
    top.fillRoundedRect(520, 8, 240, 64, 12);
    const names = ['Calídria', 'Quelmora'];
    for (const side of [0, 1] as const) {
      const x0 = side === 0 ? 56 : 816;
      text(this, x0, 14, names[side], 20, TEAM[side].css);
      const box = this.add.container(x0 + 270, 26).setDepth(510);
      const bg = this.add.rectangle(0, 0, 264, 18, PAL.tinta).setStrokeStyle(2, PAL.bronze);
      const fill = this.add.rectangle(-130, 0, 260, 12, TEAM[side].base).setOrigin(0, 0.5);
      box.add([bg, fill]);
      this.bannerBox.push(box);
      this.bannerFill.push(fill);
      this.bannerText.push(
        text(this, x0 + 270, 26, '', 16, PALS.marfim, '800')
          .setOrigin(0.5)
          .setDepth(515),
      );
      this.moraleText.push(text(this, x0 + 408, 44, '', 16, PALS.marfim, '600').setOrigin(1, 0));
    }
    this.add.image(64, 56, 'coin').setDepth(510);
    this.goldText = text(this, 80, 44, '', 18, PALS.ceuHorizonte);
    this.turnText = text(this, 640, 12, '', 28, PALS.marfim).setOrigin(0.5, 0);
    this.phaseText = text(this, 640, 46, '', 17, PALS.areia, '600').setOrigin(0.5, 0);
    this.announce = this.add
      .text(640, 150, '', {
        fontFamily: FONT_TITLE,
        fontSize: '52px',
        color: PALS.marfim,
        stroke: PALS.tinta,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(600)
      .setAlpha(0);
    this.hint = text(this, 640, 548, '', 17, PALS.marfim, '600').setOrigin(0.5).setDepth(520);
    this.fpsText = text(this, 1232, 82, '', 16).setOrigin(1, 0).setDepth(950);

    // painel inferior
    const bot = this.add.graphics().setDepth(490);
    bot.fillStyle(PAL.preto, 0.45);
    bot.fillRoundedRect(40, 572, 1200, 140, 12);
    bot.fillStyle(PAL.tinta, 0.5);
    bot.fillRoundedRect(682, 582, 262, 120, 10);

    RECRUIT_ORDER.forEach((kind, i) => {
      const x = 108 + i * 128;
      const btn = new Button(this, x, 642, {
        w: 120,
        h: 124,
        label: '',
        hotkey: String(i + 1),
        color: PAL.terracota,
        onClick: () => this.doRecruit(kind),
        onDenied: () => this.explainBlock(kind, true),
      });
      const icon = this.add.image(0, 8, `u_${kind}_0`).setOrigin(0.5, 1).setScale(0.62);
      const name = text(this, 0, 22, SHORT[kind], 16, PALS.marfim).setOrigin(0.5, 0.5);
      const cost = text(this, 0, 44, `${UNITS[kind].custo}`, 18, PALS.ceuHorizonte).setOrigin(
        0.5,
        0.5,
      );
      btn.c.add([icon, name, cost]);
      this.costTexts.push(cost);
      btn.c.on('pointerover', () => {
        const why = this.blockText(kind);
        this.setHint(why ? `${why}  ·  ${SHORT[kind]}: ${UNITS[kind].papel}` : this.unitHint(kind));
      });
      btn.c.on('pointerout', () => this.setHint(''));
      this.recruitBtns.push(btn);
    });

    this.selName = text(this, 813, 584, '', 18, PALS.marfim).setOrigin(0.5, 0);
    this.selStats = text(this, 813, 606, '', 16, PALS.areia, '600').setOrigin(0.5, 0);
    this.selHint = text(this, 813, 626, '', 16, PALS.marfim, '600')
      .setOrigin(0.5, 0)
      .setAlign('center')
      .setLineSpacing(-4)
      .setWordWrapWidth(254);
    ORDERS.forEach((o, i) => {
      const btn = new Button(this, 729 + i * 84, 682, {
        w: 80,
        h: 34,
        label: ORDER_NAME[o],
        size: 16,
        color: PAL.egeuEscuro,
        onClick: () => this.setSelectedOrder(o),
      });
      this.orderBtns.push(btn);
    });

    const abil: Ability[] = ['brado', 'muralha'];
    abil.forEach((ab, i) => {
      const btn = new Button(this, 1043, 612 + i * 62, {
        w: 190,
        h: 54,
        label: '',
        hotkey: i === 0 ? 'Q' : 'W',
        size: 16,
        textDx: 12,
        color: PAL.bronzeEscuro,
        onClick: () => this.doAbility(ab),
      });
      btn.c.on('pointerover', () => this.setHint(BAL.habilidades[ab].desc));
      btn.c.on('pointerout', () => this.setHint(''));
      this.abilityBtns[ab] = btn;
    });

    this.endBtn = new Button(this, 1186, 642, {
      w: 92,
      h: 124,
      label: 'Encerrar\nturno',
      hotkey: 'E',
      size: 16,
      color: PAL.egeu,
      onClick: () => void this.endTurn(),
    });
  }

  private unitHint(kind: RecruitKind): string {
    const s = UNITS[kind];
    return `${s.nome} (${s.custo} de ouro): vida ${s.vida} · ataque ${s.ataque} · defesa ${s.defesa} · mov ${s.movimento} · alcance ${s.alcance}. ${s.papel}`;
  }

  private setHint(s: string): void {
    if (this.hint.text !== s) this.hint.setText(s);
  }

  private addView(u: Unit, popIn = false): UnitView {
    const v = new UnitView(this, u);
    this.views.set(u.id, v);
    v.sprite.setInteractive({ useHandCursor: u.side === 0 });
    v.sprite.on('pointerover', () => {
      this.hoverId = u.id;
      this.refreshPreview();
    });
    v.sprite.on('pointerout', () => {
      if (this.hoverId === u.id) this.hoverId = null;
      this.refreshPreview();
    });
    v.sprite.on('pointerdown', () => {
      if (this.phase !== 'plan' || u.side !== 0) return;
      this.select(u.id);
    });
    if (popIn) {
      v.c.setScale(0.2);
      this.tweens.add({ targets: v.c, scale: 1, duration: 260, ease: 'Back.easeOut' });
      this.dust.explode(8, v.c.x, LAYOUT.groundY - 6);
    }
    return v;
  }

  /* ---------------- entrada ---------------- */

  private spaceDown = false;

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    kb.on('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space') this.spaceDown = false;
    });
    if (isDebug) kb.addCapture(['F1', 'F2', 'F3', 'F4']);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === 'Space') this.spaceDown = true;
    if (this.phase === 'over') return;
    if (isDebug && this.debugKey(e.code)) {
      e.preventDefault();
      return;
    }
    switch (e.code) {
      case 'Escape':
        this.scene.launch('Pause');
        this.scene.pause();
        return;
      case 'KeyR':
        this.scene.restart();
        return;
    }
    if (this.phase !== 'plan') return;
    const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
    const numpad = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5'].indexOf(e.code);
    const idx = Math.max(digit, numpad);
    if (idx >= 0) {
      this.recruitBtns[idx].press();
      return;
    }
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.cycleSelect(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.cycleSelect(1);
        break;
      case 'KeyX':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.cycleOrder();
        break;
      case 'KeyZ':
      case 'Space':
        this.confirmOrder();
        break;
      case 'KeyQ':
        this.abilityBtns.brado.press();
        break;
      case 'KeyW':
        this.abilityBtns.muralha.press();
        break;
      case 'KeyE':
        this.endBtn.press();
        break;
    }
  }

  private debugKey(code: string): boolean {
    switch (code) {
      case 'F1':
        forceResult(this.b, 0);
        void this.finish();
        return true;
      case 'F2':
        forceResult(this.b, 1);
        void this.finish();
        return true;
      case 'F3':
        this.b.sides[0].gold += 500;
        floatText(this, 160, 90, '+500', PALS.ceuHorizonte, 28);
        this.refresh();
        return true;
      case 'F4':
        settings.showFps = !settings.showFps;
        return true;
    }
    return false;
  }

  /* ---------------- ações do jogador ---------------- */

  private ownUnits(): Unit[] {
    return sideUnits(this.b, 0).sort((a, c) => a.cell - c.cell);
  }

  private select(id: number | null): void {
    if (this.selectedId !== id) sfx.ui();
    this.selectedId = id;
    this.refresh();
  }

  private cycleSelect(dir: number): void {
    const list = this.ownUnits();
    if (!list.length) return;
    const i = list.findIndex((u) => u.id === this.selectedId);
    const next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    this.select(list[next].id);
  }

  private cycleOrder(): void {
    const u = this.selectedId !== null ? getUnit(this.b, this.selectedId) : undefined;
    if (!u) return;
    const next = ORDERS[(ORDERS.indexOf(u.order) + 1) % ORDERS.length];
    this.setSelectedOrder(next);
  }

  private setSelectedOrder(o: Order): void {
    if (this.phase !== 'plan') return;
    const u = this.selectedId !== null ? getUnit(this.b, this.selectedId) : undefined;
    if (!u) return;
    u.order = o;
    const v = this.views.get(u.id);
    v?.setOrder(o);
    if (v) pop(this, v.c);
    this.refresh();
  }

  /** Z/Espaço: confirma a ordem atual e passa para a próxima tropa (da frente para trás). */
  private confirmOrder(): void {
    const list = this.ownUnits().reverse();
    if (!list.length) return;
    const i = list.findIndex((u) => u.id === this.selectedId);
    const v = i >= 0 ? this.views.get(list[i].id) : undefined;
    if (v) pop(this, v.c);
    this.select(list[(i + 1) % list.length].id);
  }

  /** Motivo, em palavras, de não poder recrutar (null = pode). */
  private blockText(kind: RecruitKind): string | null {
    if (this.phase !== 'plan') return null;
    const why = recruitBlock(this.b, 0, kind);
    const me = this.b.sides[0];
    switch (why) {
      case 'ouro':
        return `Ouro insuficiente: faltam ${UNITS[kind].custo - me.gold}.`;
      case 'limite':
        return `Limite de ${BAL.recrutasPorTurno} recrutas por turno: encerre o turno.`;
      case 'espaco':
        return 'Acampamento ocupado: mova a tropa da casa 0 (casas 0 a 2 cheias).';
      default:
        return null;
    }
  }

  private explainBlock(kind: RecruitKind, loud: boolean): void {
    const why = this.blockText(kind);
    if (!why) return;
    this.setHint(why);
    if (loud && recruitBlock(this.b, 0, kind) === 'espaco')
      this.showAnnounce('Acampamento ocupado!');
  }

  private doRecruit(kind: RecruitKind): void {
    if (this.phase !== 'plan') return;
    const u = recruit(this.b, 0, kind);
    if (!u) return;
    sfx.recruit();
    this.addView(u, true);
    pop(this, this.goldText);
    this.select(u.id);
  }

  private doAbility(ab: Ability): void {
    if (this.phase !== 'plan') return;
    const e = useAbility(this.b, 0, ab);
    if (e) void this.playEvent(e, null);
    this.refresh();
  }

  /* ---------------- fluxo do turno ---------------- */

  private startPlayerTurn(first = false): void {
    if (this.b.result) return;
    startPlanning(this.b, 0);
    this.phase = 'plan';
    this.syncBuffs();
    if (this.selectedId === null || !getUnit(this.b, this.selectedId)) {
      const front = this.ownUnits().pop();
      this.selectedId = front?.id ?? null;
    }
    this.refresh();
    if (!first) sfx.turn();
    this.showAnnounce(first ? 'Às armas, Calídria!' : `Turno ${this.b.turn}`);
  }

  private async endTurn(): Promise<void> {
    if (this.phase !== 'plan' || this.b.result) return;
    this.phase = 'resolve';
    this.hoverId = null;
    this.refresh();
    this.showAnnounce('Calídria avança!');
    await wait(this, 350);
    await this.playEvents(resolveSide(this.b, 0), 0);
    this.syncBuffs();
    if (this.b.result) return this.finish();

    startPlanning(this.b, 1);
    this.syncBuffs();
    this.refresh();
    this.showAnnounce('Quelmora responde!');
    await wait(this, 350);
    await this.playEvents(aiPlan(this.b, 1, this.rng), 1);
    await this.playEvents(resolveSide(this.b, 1), 1);
    this.syncBuffs();
    if (this.b.result) return this.finish();

    endRound(this.b);
    if (this.b.result) return this.finish();
    this.startPlayerTurn();
  }

  private async finish(): Promise<void> {
    if (this.phase === 'over' || !this.b.result) return;
    this.phase = 'over';
    this.tweens.timeScale = 1;
    this.time.timeScale = 1;
    this.refresh();
    const won = this.b.result.winner === 0;
    if (won) sfx.win();
    else sfx.lose();
    shake(this, 'forte');
    await wait(this, 700);
    this.scene.launch('End', {
      won,
      reason: this.b.result.reason,
      turn: this.b.turn,
      kills: this.b.sides[0].kills,
      losses: this.b.sides[0].losses,
      recruited: this.b.sides[0].recruited,
      banner: [this.b.sides[0].banner, this.b.sides[1].banner],
      seconds: Math.round((this.time.now - this.startTime) / 1000),
    });
  }

  private showAnnounce(s: string): void {
    this.announce.setText(s).setAlpha(0).setScale(0.7);
    this.tweens.killTweensOf(this.announce);
    this.tweens.add({
      targets: this.announce,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: this.announce, alpha: 0, delay: 900, duration: 300 });
  }

  /* ---------------- animação dos eventos ---------------- */

  private async playEvents(list: BattleEvent[], side: Side): Promise<void> {
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const n = list[i + 1];
      // troca de fileira: as duas marchas acontecem juntas
      if (e.t === 'move' && n?.t === 'move' && e.from === n.to && e.to === n.from) {
        await Promise.all([this.playEvent(e, side), this.playEvent(n, side)]);
        i++;
        continue;
      }
      await this.playEvent(e, side);
    }
  }

  private async playEvent(e: BattleEvent, side: Side | null): Promise<void> {
    switch (e.t) {
      case 'move': {
        const v = this.views.get(e.id);
        if (!v) return;
        const u = getUnit(this.b, e.id);
        const kind = u?.kind;
        const ms =
          kind === 'cavaleiro' ? 110 : kind === 'fundibulo' ? ANIM.passo * 1.6 : ANIM.passo;
        if (e.charge) {
          this.dust.explode(14, v.c.x, LAYOUT.groundY - 4);
          sfx.drum();
        }
        await v.march(e.to, ms, (x) => {
          this.dust.explode(3, x, LAYOUT.groundY - 4);
          sfx.drum();
        });
        this.dust.explode(e.charge ? 10 : 3, v.c.x, LAYOUT.groundY - 4);
        await wait(this, 40);
        return;
      }
      case 'attack':
        await this.playAttack(e);
        return;
      case 'death': {
        const v = this.views.get(e.id);
        if (!v) return;
        sfx.death();
        this.dust.explode(10, v.c.x, LAYOUT.groundY - 6);
        if (e.bounty > 0) {
          const killer: Side = v.side === 0 ? 1 : 0;
          floatText(this, v.c.x, LAYOUT.groundY - 140, `+${e.bounty} ouro`, PALS.bronze, 20);
          if (killer === 0) pop(this, this.goldText);
        }
        this.views.delete(e.id);
        if (this.selectedId === e.id) this.selectedId = null;
        await v.die();
        this.refresh();
        return;
      }
      case 'morale': {
        const x = e.side === 0 ? 320 : 960;
        floatText(this, x, 220, 'Estratego caído! Moral abalada', TEAM[e.side].css, 26);
        shake(this, 'forte');
        sfx.lose();
        this.refresh();
        await wait(this, 700);
        return;
      }
      case 'recruit': {
        const u = getUnit(this.b, e.id);
        if (!u) return;
        sfx.recruit();
        this.addView(u, true);
        await wait(this, 320);
        return;
      }
      case 'ability': {
        const g = general(this.b, e.side);
        const gv = g ? this.views.get(g.id) : undefined;
        if (gv) {
          const ring = this.add
            .image(gv.c.x, LAYOUT.groundY - 40, 'ring')
            .setTint(TEAM[e.side].base)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0)
            .setDepth(80);
          this.tweens.add({
            targets: ring,
            scale: 2,
            alpha: 0,
            duration: 450,
            onComplete: () => ring.destroy(),
          });
          this.sparks.explode(12, gv.c.x, LAYOUT.groundY - 60);
          floatText(
            this,
            gv.c.x,
            LAYOUT.groundY - 150,
            BAL.habilidades[e.ability].nome,
            PALS.ceuHorizonte,
            24,
          );
        }
        sfx.ability();
        this.syncBuffs();
        if (side !== null) await wait(this, 600);
        return;
      }
      case 'end':
        return;
    }
  }

  private targetPos(t: Target): { x: number; y: number } | null {
    if (t.type === 'banner') return this.banners.clothCenter(t.side);
    const v = this.views.get(t.id);
    return v ? { x: v.c.x, y: LAYOUT.groundY - 50 } : null;
  }

  private async playAttack(e: Extract<BattleEvent, { t: 'attack' }>): Promise<void> {
    const av = this.views.get(e.id);
    const pos = this.targetPos(e.target);
    if (!av || !pos) return;
    const att = getUnit(this.b, e.id);
    const kind = att?.kind ?? 'escudeiro';
    const dir = forward(av.side);
    const tv = e.target.type === 'unit' ? this.views.get(e.target.id) : undefined;
    const ranged = UNITS[kind].alcance > 1 && Math.abs(pos.x - av.c.x) > LAYOUT.cellW * 1.2;
    const siege = kind === 'fundibulo';
    const impact = () => {
      if (e.target.type === 'banner') {
        const s = e.target.side;
        this.banners.flash(s);
        screenFlash(this, PAL.marfim, 0.25, 160);
        sfx.bannerHit();
        shake(this, siege ? 'cerco' : 'leve');
        this.chips.explode(siege ? 16 : 8, pos.x, pos.y);
        pop(this, this.bannerBox[s]);
        floatText(this, pos.x, pos.y - 30, `-${e.dmg}`, PALS.marfim, 34);
      } else if (tv) {
        tv.flash();
        tv.setHp(e.hpAfter);
        tv.recoil(dir);
        this.sparks.explode(10, tv.c.x - dir * 14, LAYOUT.groundY - 52);
        this.chips.explode(siege ? 16 : 3, tv.c.x, LAYOUT.groundY - 40);
        if (siege) {
          sfx.siege();
          shake(this, 'cerco');
        } else sfx.clash();
        floatText(this, tv.c.x, LAYOUT.groundY - tv.tall - 30, `-${e.dmg}`, PALS.marfim, 32);
      }
      this.refresh();
    };
    if (e.charge)
      floatText(this, av.c.x, LAYOUT.groundY - av.tall - 40, 'Investida!', PALS.ceuHorizonte, 22);
    if (ranged) {
      await av.lunge(-dir * 0.3, () => (siege ? sfx.siege() : sfx.arrow()));
      await this.projectile(
        siege ? 'stone' : 'arrow',
        av.c.x + dir * 20,
        LAYOUT.groundY - 60,
        pos.x,
        pos.y,
        siege,
      );
      impact();
    } else {
      await av.lunge(dir, impact);
    }
    if (e.counter && tv) {
      const c = e.counter;
      await wait(this, 80);
      await tv.lunge(-dir, () => {
        av.flash();
        av.setHp(c.hpAfter);
        av.recoil(-dir);
        sfx.clash();
        this.sparks.explode(8, av.c.x + dir * 14, LAYOUT.groundY - 52);
        floatText(this, av.c.x, LAYOUT.groundY - av.tall - 30, `-${c.dmg}`, PALS.areia, 26);
      });
    }
    await wait(this, ANIM.entreAcoes);
  }

  private projectile(
    key: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    heavy: boolean,
  ): Promise<void> {
    const img = this.add.image(x0, y0, key).setDepth(90);
    const h = heavy ? 160 : 90;
    const dur = heavy ? 520 : 360;
    const state = { t: 0 };
    let px = x0;
    let py = y0;
    return tweenP(this, {
      targets: state,
      t: 1,
      duration: dur,
      ease: 'Linear',
      onUpdate: () => {
        const x = Phaser.Math.Linear(x0, x1, state.t);
        const y = Phaser.Math.Linear(y0, y1, state.t) - Math.sin(Math.PI * state.t) * h;
        img.setPosition(x, y);
        if (!heavy) img.setRotation(Math.atan2(y - py, x - px));
        else img.angle += 12;
        px = x;
        py = y;
      },
    }).then(() => {
      img.destroy();
    });
  }

  /* ---------------- HUD ---------------- */

  private syncBuffs(): void {
    for (const u of this.b.units) this.views.get(u.id)?.setBuffs(u.atkBuff, u.defBuff);
  }

  refresh(): void {
    const b = this.b;
    const me = b.sides[0];
    const planning = this.phase === 'plan';
    this.goldText.setText(`${me.gold}  (+${BAL.renda}/turno)`);
    this.turnText.setText(`Turno ${b.turn}/${BAL.maxTurnos}`);
    this.phaseText.setText(
      this.phase === 'plan'
        ? `Suas ordens · recrutas ${me.recruitsTurn}/${BAL.recrutasPorTurno}`
        : this.phase === 'resolve'
          ? 'Combate!'
          : 'Fim da batalha',
    );
    for (const s of [0, 1] as const) {
      const st = b.sides[s];
      this.bannerFill[s].width = 260 * Math.max(0, st.banner / st.bannerMax);
      this.bannerText[s].setText(`${st.banner}/${st.bannerMax}`);
      this.moraleText[s].setText(st.generalAlive ? 'Moral firme' : 'Moral −25%');
      this.moraleText[s].setColor(st.generalAlive ? PALS.verde : PALS.carmimClaro);
    }
    const SHORT_WHY = { ouro: 'sem ouro', limite: 'limite/turno', espaco: 'sem espaço', fim: '' };
    RECRUIT_ORDER.forEach((k, i) => {
      this.recruitBtns[i].setEnabled(planning && canRecruit(b, 0, k));
      const why = planning ? recruitBlock(b, 0, k) : null;
      const label = why && why !== 'fim' ? SHORT_WHY[why] : `${UNITS[k].custo}`;
      this.costTexts[i]?.setText(label).setColor(why ? PALS.carmimClaro : PALS.ceuHorizonte);
      this.costTexts[i]?.setFontSize(why ? 16 : 18);
    });
    for (const ab of ['brado', 'muralha'] as Ability[]) {
      const cd = me.cd[ab];
      const btn = this.abilityBtns[ab];
      const name = BAL.habilidades[ab].nome;
      const status = !me.generalAlive ? 'general caído' : cd > 0 ? `recarga: ${cd}` : 'pronta';
      btn.setLabel(`${name}\n${status}`);
      btn.setEnabled(planning && canUseAbility(b, 0, ab));
    }
    this.endBtn.setEnabled(planning);

    const sel = this.selectedId !== null ? getUnit(b, this.selectedId) : undefined;
    if (sel) {
      const st = UNITS[sel.kind];
      this.selName.setText(`${st.nome}  ${sel.hp}/${sel.maxHp}`);
      this.selStats.setText(
        `ATQ ${st.ataque}  DEF ${st.defesa}  MOV ${st.movimento}  ALC ${st.alcance}`,
      );
      this.selHint.setText(st.papel);
    } else {
      this.selName.setText('Nenhuma tropa');
      this.selStats.setText('Clique numa tropa ou use ←/→');
      this.selHint.setText('');
    }
    ORDERS.forEach((o, i) => {
      this.orderBtns[i].setEnabled(planning && !!sel);
      this.orderBtns[i].setActive(!!sel && sel.order === o);
    });
    if (!sel && this.phase === 'plan' && b.turn === 1 && !this.hint.text) {
      this.setHint('Recrute com 1–5 e encerre o turno com E.');
    }
    this.refreshPreview();
  }

  /** Prévia: para onde a tropa vai e quanto dano causa; tooltip sobre inimigos. */
  private refreshPreview(): void {
    const g = this.previewG;
    g.clear();
    this.previewText.setVisible(false);
    this.tooltip.setVisible(false);
    if (this.phase !== 'plan') return;
    const b = this.b;
    const hovered = this.hoverId !== null ? getUnit(b, this.hoverId) : undefined;
    const sel = this.selectedId !== null ? getUnit(b, this.selectedId) : undefined;
    const actor = hovered && hovered.side === 0 ? hovered : sel;

    if (actor) {
      const plan = planAction(b, actor);
      const ax = cellX(actor.cell);
      if (plan.moveTo !== actor.cell) {
        const tx = cellX(plan.moveTo);
        g.lineStyle(4, PAL.ceuHorizonte, 0.8);
        g.lineBetween(ax, LAYOUT.groundY + 16, tx, LAYOUT.groundY + 16);
        const d = Math.sign(tx - ax);
        g.fillStyle(PAL.ceuHorizonte, 0.9);
        g.fillTriangle(
          tx,
          LAYOUT.groundY + 16,
          tx - d * 12,
          LAYOUT.groundY + 9,
          tx - d * 12,
          LAYOUT.groundY + 23,
        );
        g.lineStyle(3, PAL.ceuHorizonte, 0.7);
        g.strokeEllipse(tx, LAYOUT.groundY + 2, 64, 16);
      }
      if (plan.target) {
        const pos = this.targetPos(plan.target);
        if (pos) {
          const ty = plan.target.type === 'banner' ? pos.y - 50 : LAYOUT.groundY - 150;
          g.lineStyle(3, PAL.carmim, 0.9);
          g.strokeCircle(pos.x, plan.target.type === 'banner' ? pos.y : LAYOUT.groundY - 50, 30);
          let s = `-${plan.dmg}`;
          if (plan.charge) s += ' investida';
          if (plan.counter) s += `  (revide -${plan.counter})`;
          this.previewText.setText(s).setPosition(pos.x, ty).setVisible(true);
        }
      }
    }

    if (hovered && hovered.side === 1) {
      const st = UNITS[hovered.kind];
      const lines = [
        `${st.nome} de Quelmora  ${hovered.hp}/${hovered.maxHp}`,
        `ATQ ${st.ataque} DEF ${st.defesa} ALC ${st.alcance}`,
      ];
      if (sel) {
        const plan = planAction(b, sel);
        const t: Target = { type: 'unit', id: hovered.id };
        const reach = plan.target?.type === 'unit' && plan.target.id === hovered.id;
        const charge = sel.kind === 'cavaleiro' && plan.moveTo !== sel.cell;
        const dmg = computeDamage(b, sel, t, { charge, fromCell: plan.moveTo });
        lines.push(
          `${UNITS[sel.kind].nome}: -${dmg}${reach ? ' neste turno' : ' (fora de alcance agora)'}`,
        );
        if (UNITS[hovered.kind].revida && UNITS[sel.kind].alcance === 1) {
          lines.push(
            `Revide: -${computeDamage(b, hovered, { type: 'unit', id: sel.id }, { counter: true })}`,
          );
        }
      }
      const v = this.views.get(hovered.id);
      if (v) {
        this.tooltip.setText(lines.join('\n'));
        const x = Phaser.Math.Clamp(v.c.x - this.tooltip.width / 2, 48, 1232 - this.tooltip.width);
        this.tooltip.setPosition(x, LAYOUT.groundY - 250).setVisible(true);
      }
    }
  }
}
