/**
 * Regras puras da batalha (sem Phaser): eixo de 12 casas, recrutamento, ordens, combate,
 * habilidades do general e condições de fim. Usado pela cena e pela simulação em Node.
 */
import { BAL, MATCHUP, UNITS, type RecruitKind, type UnitKind } from '../config/balance';

export type Side = 0 | 1;
export type Order = 'avancar' | 'segurar' | 'recuar';
export type Ability = 'brado' | 'muralha';

export const ORDERS: Order[] = ['avancar', 'segurar', 'recuar'];
export const ORDER_NAME: Record<Order, string> = {
  avancar: 'Avançar',
  segurar: 'Segurar',
  recuar: 'Recuar',
};

export interface Unit {
  id: number;
  side: Side;
  kind: UnitKind;
  hp: number;
  maxHp: number;
  cell: number;
  order: Order;
  atkBuff: boolean;
  defBuff: boolean;
}

export interface SideState {
  gold: number;
  banner: number;
  bannerMax: number;
  generalAlive: boolean;
  cd: Record<Ability, number>;
  kills: number;
  losses: number;
  recruited: number;
}

export type EndReason = 'estandarte' | 'aniquilacao' | 'tempo' | 'debug';

export interface Result {
  winner: Side;
  reason: EndReason;
}

export interface Battle {
  turn: number;
  units: Unit[];
  sides: [SideState, SideState];
  nextId: number;
  result: Result | null;
}

export type Target = { type: 'unit'; id: number } | { type: 'banner'; side: Side };

export type BattleEvent =
  | { t: 'move'; id: number; from: number; to: number; charge: boolean }
  | {
      t: 'attack';
      id: number;
      target: Target;
      dmg: number;
      hpAfter: number;
      charge: boolean;
      counter: { dmg: number; hpAfter: number } | null;
    }
  | { t: 'death'; id: number; bounty: number }
  | { t: 'morale'; side: Side }
  | { t: 'recruit'; id: number }
  | { t: 'ability'; side: Side; ability: Ability; ids: number[] }
  | { t: 'end'; result: Result };

export const other = (s: Side): Side => (s === 0 ? 1 : 0);
export const forward = (s: Side): number => (s === 0 ? 1 : -1);
export const bannerCell = (s: Side): number => (s === 0 ? 0 : BAL.casas - 1);

function newSide(): SideState {
  return {
    gold: BAL.ouroInicial,
    banner: BAL.estandarteVida,
    bannerMax: BAL.estandarteVida,
    generalAlive: true,
    cd: { brado: 0, muralha: 0 },
    kills: 0,
    losses: 0,
    recruited: 0,
  };
}

function makeUnit(b: Battle, side: Side, kind: UnitKind, cell: number): Unit {
  const st = UNITS[kind];
  const u: Unit = {
    id: b.nextId++,
    side,
    kind,
    hp: st.vida,
    maxHp: st.vida,
    cell,
    order: 'avancar',
    atkBuff: false,
    defBuff: false,
  };
  b.units.push(u);
  return u;
}

export function createBattle(): Battle {
  const b: Battle = { turn: 1, units: [], sides: [newSide(), newSide()], nextId: 1, result: null };
  makeUnit(b, 0, 'general', BAL.generalCasa[0]);
  makeUnit(b, 1, 'general', BAL.generalCasa[1]);
  return b;
}

export function cloneBattle(b: Battle): Battle {
  return {
    turn: b.turn,
    nextId: b.nextId,
    result: b.result ? { ...b.result } : null,
    units: b.units.map((u) => ({ ...u })),
    sides: [
      { ...b.sides[0], cd: { ...b.sides[0].cd } },
      { ...b.sides[1], cd: { ...b.sides[1].cd } },
    ],
  };
}

export const getUnit = (b: Battle, id: number): Unit | undefined =>
  b.units.find((u) => u.id === id);
export const unitAt = (b: Battle, side: Side, cell: number): Unit | undefined =>
  b.units.find((u) => u.side === side && u.cell === cell);
export const sideUnits = (b: Battle, side: Side): Unit[] => b.units.filter((u) => u.side === side);
export const general = (b: Battle, side: Side): Unit | undefined =>
  b.units.find((u) => u.side === side && u.kind === 'general');

/** Unidades do lado, da mais avançada (perto do inimigo) para a mais recuada. */
export function frontOrder(b: Battle, side: Side): Unit[] {
  return sideUnits(b, side).sort((a, c) => (side === 0 ? c.cell - a.cell : a.cell - c.cell));
}

/* ---------------- recrutamento ---------------- */

export function canRecruit(b: Battle, side: Side, kind: RecruitKind): boolean {
  if (b.result) return false;
  if (b.sides[side].gold < UNITS[kind].custo) return false;
  return !unitAt(b, side, bannerCell(side));
}

export function recruit(b: Battle, side: Side, kind: RecruitKind): Unit | null {
  if (!canRecruit(b, side, kind)) return null;
  b.sides[side].gold -= UNITS[kind].custo;
  b.sides[side].recruited++;
  return makeUnit(b, side, kind, bannerCell(side));
}

export function setOrder(b: Battle, id: number, order: Order): void {
  const u = getUnit(b, id);
  if (u) u.order = order;
}

/* ---------------- habilidades ---------------- */

export function canUseAbility(b: Battle, side: Side, ab: Ability): boolean {
  return !b.result && b.sides[side].generalAlive && b.sides[side].cd[ab] === 0;
}

/** Unidades do lado a até `raio` casas do general (inclui o próprio general). */
export function nearGeneral(b: Battle, side: Side, raio: number): Unit[] {
  const g = general(b, side);
  if (!g) return [];
  return sideUnits(b, side).filter((u) => Math.abs(u.cell - g.cell) <= raio);
}

export function useAbility(b: Battle, side: Side, ab: Ability): BattleEvent | null {
  if (!canUseAbility(b, side, ab)) return null;
  const cfg = BAL.habilidades[ab];
  const ids: number[] = [];
  for (const u of nearGeneral(b, side, cfg.raio)) {
    if (ab === 'brado') u.atkBuff = true;
    else u.defBuff = true;
    ids.push(u.id);
  }
  b.sides[side].cd[ab] = cfg.recarga;
  return { t: 'ability', side, ability: ab, ids };
}

/* ---------------- combate ---------------- */

const isRanged = (u: Unit): boolean => UNITS[u.kind].alcance > 1;

export function targetCell(b: Battle, t: Target): number {
  if (t.type === 'banner') return bannerCell(t.side);
  return getUnit(b, t.id)?.cell ?? -99;
}

/** Fator multiplicativo do ataque (buffs, moral, triângulo, investida, penalidade de perto). */
function attackMult(b: Battle, att: Unit, t: Target, dist: number, charge: boolean): number {
  let mult = 1;
  if (att.atkBuff) mult *= BAL.habilidades.brado.bonus;
  if (!b.sides[att.side].generalAlive) mult *= BAL.moralPerdida;
  const targetKind: UnitKind | 'estandarte' =
    t.type === 'banner' ? 'estandarte' : (getUnit(b, t.id)?.kind ?? 'escudeiro');
  mult *= MATCHUP[att.kind]?.[targetKind] ?? 1;
  if (charge) mult *= BAL.investida;
  if (isRanged(att) && dist <= 1) mult *= BAL.pertoPenalidade;
  return mult;
}

function targetDefense(b: Battle, t: Target): number {
  if (t.type === 'banner') return BAL.estandarteDefesa;
  const u = getUnit(b, t.id);
  if (!u) return 0;
  return UNITS[u.kind].defesa + (u.defBuff ? BAL.habilidades.muralha.bonus : 0);
}

/** Dano previsto de `att` em `t`, supondo que ele ataque da casa `fromCell`. */
export function computeDamage(
  b: Battle,
  att: Unit,
  t: Target,
  opts: { charge?: boolean; counter?: boolean; fromCell?: number } = {},
): number {
  const from = opts.fromCell ?? att.cell;
  const dist = Math.abs(targetCell(b, t) - from);
  const mult = attackMult(b, att, t, dist, !!opts.charge);
  const def = targetDefense(b, t);
  let raw = (UNITS[att.kind].ataque * mult * BAL.defesaK) / (BAL.defesaK + def);
  if (opts.counter) raw *= BAL.revide;
  return Math.max(BAL.danoMinimo, Math.round(raw));
}

/** Alvos ao alcance da casa `cell` (unidades inimigas e/ou estandarte inimigo). */
function targetsInRange(b: Battle, att: Unit, cell: number): Target[] {
  const range = UNITS[att.kind].alcance;
  const foe = other(att.side);
  const out: Target[] = [];
  for (const u of sideUnits(b, foe)) {
    if (Math.abs(u.cell - cell) <= range) out.push({ type: 'unit', id: u.id });
  }
  if (Math.abs(bannerCell(foe) - cell) <= range) out.push({ type: 'banner', side: foe });
  return out;
}

/** Escolhe o alvo: corpo a corpo = o mais próximo; à distância = melhor golpe. */
export function chooseTarget(b: Battle, att: Unit, cell: number, charge = false): Target | null {
  const list = targetsInRange(b, att, cell);
  if (list.length === 0) return null;
  const dist = (t: Target): number => Math.abs(targetCell(b, t) - cell);
  if (!isRanged(att)) {
    // o mais próximo; unidade antes do estandarte em empate
    return list.sort((a, c) => dist(a) - dist(c) || (a.type === 'unit' ? -1 : 1))[0];
  }
  if (att.kind === 'fundibulo') {
    const banner = list.find((t) => t.type === 'banner');
    if (banner) return banner;
  }
  let best: Target | null = null;
  let bestScore = -Infinity;
  for (const t of list) {
    const dmg = computeDamage(b, att, t, { charge, fromCell: cell });
    let score = dmg;
    if (t.type === 'unit') {
      const u = getUnit(b, t.id);
      if (u && dmg >= u.hp) score += 1000 + UNITS[u.kind].custo;
      if (u?.kind === 'general') score += 4;
    } else {
      score -= 2; // prefere tropas a um estandarte com o mesmo dano
    }
    score -= dist(t) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function canEnter(b: Battle, u: Unit, cell: number): boolean {
  if (cell < 0 || cell >= BAL.casas) return false;
  const foe = other(u.side);
  if (cell === bannerCell(foe)) return false;
  return !unitAt(b, foe, cell);
}

/**
 * Casa final de um movimento de até `steps` casas livres na direção `dir`.
 * Atravessar uma casa com aliado não gasta movimento (as fileiras abrem passagem).
 */
function moveDest(b: Battle, u: Unit, dir: number, steps: number, stopWhenTarget: boolean): number {
  let cell = u.cell;
  let lastFree = u.cell;
  let left = steps;
  while (left > 0) {
    const next = cell + dir;
    if (!canEnter(b, u, next)) break;
    cell = next;
    const friend = b.units.find((o) => o.side === u.side && o.cell === cell && o.id !== u.id);
    if (!friend) {
      lastFree = cell;
      left--;
      if (stopWhenTarget && targetsInRange(b, u, cell).length > 0) break;
    }
  }
  return lastFree;
}

export interface PlannedAction {
  moveTo: number;
  /** aliado à frente que troca de lugar com esta unidade (troca de fileira) */
  swapWith: number | null;
  target: Target | null;
  charge: boolean;
  dmg: number;
  counter: number;
}

/** O que a unidade fará se agir agora (base da prévia e da resolução). */
export function planAction(b: Battle, u: Unit): PlannedAction {
  const st = UNITS[u.kind];
  const none: PlannedAction = {
    moveTo: u.cell,
    swapWith: null,
    target: null,
    charge: false,
    dmg: 0,
    counter: 0,
  };
  if (u.order === 'recuar') {
    return { ...none, moveTo: moveDest(b, u, -forward(u.side), st.movimento, false) };
  }
  let moveTo = u.cell;
  let swapWith: number | null = null;
  let target = chooseTarget(b, u, u.cell);
  if (target && u.order === 'avancar' && st.alcance > 1 && !st.pesado) {
    // atirador avança uma casa se continuar longe do corpo a corpo e com alvo ao alcance
    const step = u.cell + forward(u.side);
    const foes = sideUnits(b, other(u.side));
    const safe = foes.every((f) => Math.abs(f.cell - step) >= 2);
    if (safe && canEnter(b, u, step) && !unitAt(b, u.side, step)) {
      const t2 = chooseTarget(b, u, step);
      if (t2) {
        moveTo = step;
        target = t2;
      }
    }
  }
  if (!target && u.order === 'avancar') {
    moveTo = moveDest(b, u, forward(u.side), st.movimento, true);
    if (moveTo === u.cell && st.alcance === 1) {
      // troca de fileira: tropa de choque passa à frente de um aliado que não avança
      const ahead = unitAt(b, u.side, u.cell + forward(u.side));
      if (ahead && (UNITS[ahead.kind].alcance > 1 || ahead.order !== 'avancar')) {
        swapWith = ahead.id;
        moveTo = ahead.cell;
      }
    }
    if (moveTo !== u.cell && st.pesado) return { ...none, moveTo };
    const charge = u.kind === 'cavaleiro' && moveTo !== u.cell;
    target = chooseTarget(b, u, moveTo, charge);
  }
  if (!target) return { ...none, moveTo, swapWith };
  const charge = u.kind === 'cavaleiro' && moveTo !== u.cell;
  const dmg = computeDamage(b, u, target, { charge, fromCell: moveTo });
  let counter = 0;
  if (target.type === 'unit') {
    const d = getUnit(b, target.id);
    if (d && UNITS[d.kind].revida && Math.abs(d.cell - moveTo) <= 1 && d.hp > dmg) {
      counter = computeDamage(b, d, { type: 'unit', id: u.id }, { counter: true });
    }
  }
  return { moveTo, swapWith, target, charge, dmg, counter };
}

function checkEnd(b: Battle): Result | null {
  if (b.result) return b.result;
  for (const s of [0, 1] as Side[]) {
    if (b.sides[s].banner <= 0) return (b.result = { winner: other(s), reason: 'estandarte' });
  }
  for (const s of [0, 1] as Side[]) {
    if (!b.sides[s].generalAlive && sideUnits(b, s).length === 0) {
      return (b.result = { winner: other(s), reason: 'aniquilacao' });
    }
  }
  return null;
}

function kill(b: Battle, victim: Unit, killerSide: Side, ev: BattleEvent[]): void {
  b.units = b.units.filter((u) => u.id !== victim.id);
  b.sides[victim.side].losses++;
  b.sides[killerSide].kills++;
  const bounty = Math.floor(UNITS[victim.kind].custo * BAL.saque);
  b.sides[killerSide].gold += bounty;
  ev.push({ t: 'death', id: victim.id, bounty });
  if (victim.kind === 'general') {
    b.sides[victim.side].generalAlive = false;
    ev.push({ t: 'morale', side: victim.side });
  }
}

/** Executa a ação de uma unidade e devolve os eventos. */
export function actUnit(b: Battle, u: Unit): BattleEvent[] {
  const ev: BattleEvent[] = [];
  if (b.result) return ev;
  const plan = planAction(b, u);
  if (plan.moveTo !== u.cell) {
    const from = u.cell;
    const mate = plan.swapWith !== null ? getUnit(b, plan.swapWith) : undefined;
    if (mate) {
      mate.cell = from;
      ev.push({ t: 'move', id: mate.id, from: plan.moveTo, to: from, charge: false });
    }
    ev.push({ t: 'move', id: u.id, from, to: plan.moveTo, charge: plan.charge });
    u.cell = plan.moveTo;
  }
  if (!plan.target) return ev;
  const t = plan.target;
  if (t.type === 'banner') {
    const s = b.sides[t.side];
    s.banner = Math.max(0, s.banner - plan.dmg);
    ev.push({
      t: 'attack',
      id: u.id,
      target: t,
      dmg: plan.dmg,
      hpAfter: s.banner,
      charge: plan.charge,
      counter: null,
    });
  } else {
    const d = getUnit(b, t.id);
    if (!d) return ev;
    d.hp = Math.max(0, d.hp - plan.dmg);
    let counter: { dmg: number; hpAfter: number } | null = null;
    if (d.hp > 0 && plan.counter > 0) {
      u.hp = Math.max(0, u.hp - plan.counter);
      counter = { dmg: plan.counter, hpAfter: u.hp };
    }
    ev.push({
      t: 'attack',
      id: u.id,
      target: t,
      dmg: plan.dmg,
      hpAfter: d.hp,
      charge: plan.charge,
      counter,
    });
    if (d.hp <= 0) kill(b, d, u.side, ev);
    if (u.hp <= 0) kill(b, u, d.side, ev);
  }
  const res = checkEnd(b);
  if (res) ev.push({ t: 'end', result: res });
  return ev;
}

/** Início do planejamento de um lado: a Muralha lançada no turno anterior expira. */
export function startPlanning(b: Battle, side: Side): void {
  for (const u of sideUnits(b, side)) u.defBuff = false;
}

/** Todas as unidades do lado agem, da frente para trás. */
export function resolveSide(b: Battle, side: Side): BattleEvent[] {
  const ev: BattleEvent[] = [];
  for (const u of frontOrder(b, side)) {
    if (b.result) break;
    if (!getUnit(b, u.id)) continue;
    ev.push(...actUnit(b, u));
  }
  for (const u of sideUnits(b, side)) u.atkBuff = false;
  return ev;
}

export const armyHp = (b: Battle, side: Side): number =>
  sideUnits(b, side).reduce((sum, u) => sum + u.hp, 0);

/** Fim da rodada: renda, recargas e limite de turnos. */
export function endRound(b: Battle): BattleEvent[] {
  if (b.result) return [];
  for (const s of b.sides) {
    s.gold += BAL.renda;
    s.cd.brado = Math.max(0, s.cd.brado - 1);
    s.cd.muralha = Math.max(0, s.cd.muralha - 1);
  }
  if (b.turn >= BAL.maxTurnos) {
    // desempate: vida somada das tropas em campo; empate total = Vorsena mantém o vale
    const diff = b.sides[0].banner - b.sides[1].banner || armyHp(b, 0) - armyHp(b, 1);
    const winner: Side = diff > 0 ? 0 : 1;
    b.result = { winner, reason: 'tempo' };
    return [{ t: 'end', result: b.result }];
  }
  b.turn++;
  return [];
}

export function forceResult(b: Battle, winner: Side): void {
  b.result = { winner, reason: 'debug' };
}
