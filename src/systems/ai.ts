/** IA do rival: recruta conforme o ouro e a composição inimiga, dá ordens e usa o general. */
import { BAL, UNITS, type RecruitKind, type UnitKind } from '../config/balance';
import {
  armyHp,
  bannerCell,
  canRecruit,
  canUseAbility,
  frontOrder,
  general,
  nearGeneral,
  other,
  recruit,
  sideUnits,
  useAbility,
  type Battle,
  type BattleEvent,
  type Side,
} from './battle';
import type { Rng } from './rng';

export function countKinds(b: Battle, side: Side): Record<UnitKind, number> {
  const c: Record<UnitKind, number> = {
    escudeiro: 0,
    lanceiro: 0,
    arqueiro: 0,
    cavaleiro: 0,
    fundibulo: 0,
    general: 0,
  };
  for (const u of sideUnits(b, side)) c[u.kind]++;
  return c;
}

/** Menor distância entre uma unidade inimiga e o estandarte do lado. */
export function threatDistance(b: Battle, side: Side): number {
  const foes = sideUnits(b, other(side));
  if (foes.length === 0) return 99;
  return Math.min(...foes.map((u) => Math.abs(u.cell - bannerCell(side))));
}

function weighted(rng: Rng, opts: [RecruitKind, number][]): RecruitKind {
  const total = opts.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of opts) {
    r -= w;
    if (r <= 0) return k;
  }
  return opts[opts.length - 1][0];
}

/** Qual unidade a IA quer agora (ou null para poupar ouro). */
export function chooseRecruit(b: Battle, side: Side, rng: Rng): RecruitKind | null {
  const foe = countKinds(b, other(side));
  const own = countKinds(b, side);
  const gold = b.sides[side].gold;
  const threatened = threatDistance(b, side) <= BAL.ia.ameaca;
  const can = (k: RecruitKind): boolean => gold >= UNITS[k].custo;

  let want: RecruitKind;
  if (threatened) {
    want = foe.cavaleiro > own.lanceiro ? 'lanceiro' : 'escudeiro';
  } else if (foe.fundibulo > own.cavaleiro) {
    // máquina de cerco inimiga: manda cavalaria caçá-la
    want = 'cavaleiro';
  } else if (foe.cavaleiro > 0 && own.lanceiro < foe.cavaleiro + 1) {
    want = 'lanceiro';
  } else if (foe.arqueiro + foe.fundibulo >= 2 && own.cavaleiro < 1) {
    want = 'cavaleiro';
  } else if (foe.lanceiro >= 2 && own.arqueiro < 2) {
    want = 'arqueiro';
  } else if (own.escudeiro < 1) {
    want = 'escudeiro';
  } else if (b.turn >= 5 && own.fundibulo < 1 && (can('fundibulo') || rng() < BAL.ia.poupaCerco)) {
    want = 'fundibulo';
  } else {
    want = weighted(rng, [
      ['escudeiro', 3],
      ['lanceiro', 2],
      ['arqueiro', 2],
      ['cavaleiro', 1.5],
    ]);
  }
  if (can(want)) return want;
  // sem ouro para a escolha: poupa se der no próximo turno; senão manda um escudeiro
  if (want === 'fundibulo' && gold + BAL.renda >= UNITS[want].custo) return null;
  const cheaper = (['cavaleiro', 'arqueiro', 'lanceiro', 'escudeiro'] as const).find(can);
  return cheaper ?? null;
}

/** Planejamento completo do turno do rival. Devolve os eventos (recrutas e habilidades). */
export function aiPlan(b: Battle, side: Side, rng: Rng): BattleEvent[] {
  const ev: BattleEvent[] = [];
  for (let i = 0; i < BAL.recrutasPorTurno; i++) {
    const kind = chooseRecruit(b, side, rng);
    if (!kind || !canRecruit(b, side, kind)) break;
    const u = recruit(b, side, kind);
    if (u) ev.push({ t: 'recruit', id: u.id });
  }
  planOrders(b, side);
  ev.push(...planAbilities(b, side));
  return ev;
}

/**
 * Ordens: todos avançam; o general ferido recua para perto do estandarte; com o estandarte
 * ameaçado, atiradores seguram a posição (cobrindo o quartel) e o general não sai da guarda.
 */
export function planOrders(b: Battle, side: Side): void {
  const mine = frontOrder(b, side);
  const threatened = threatDistance(b, side) <= BAL.ia.ameaca;
  const troops = mine.filter((u) => u.kind !== 'general').length;
  const waiting = troops < BAL.ia.onda;
  const push = aggressive(b, side);
  mine.forEach((u, i) => {
    u.order = 'avancar';
    // forma a onda perto do quartel antes de marchar
    if (waiting && Math.abs(u.cell - bannerCell(side)) >= BAL.ia.ondaCasa) u.order = 'segurar';
    // não marcha sozinho: a ponta espera a fileira se ela ficou 2+ casas para trás
    const next = mine[i + 1];
    if (!push && i === 0 && next && Math.abs(u.cell - next.cell) > 2) u.order = 'segurar';
    if (u.kind === 'general') {
      const far = Math.abs(u.cell - bannerCell(side)) > 2;
      if (u.hp < u.maxHp * BAL.ia.generalRecua && far) u.order = 'recuar';
      else if (threatened && !far && !push) u.order = 'segurar';
    }
    if (threatened && !push && UNITS[u.kind].alcance > 1) u.order = 'segurar';
    // ninguém fica parado na casa de recrutamento (senão o quartel não recruta)
    if (u.cell === bannerCell(side)) u.order = 'avancar';
  });
}

/** Em vantagem (ou atrás no placar dos estandartes no fim), a IA vai para cima do estandarte. */
export function aggressive(b: Battle, side: Side): boolean {
  const mine = armyHp(b, side);
  const foe = armyHp(b, other(side));
  if (mine > foe * BAL.ia.vantagem && sideUnits(b, side).length >= 3) return true;
  return b.turn >= BAL.ia.urgencia && b.sides[side].banner <= b.sides[other(side)].banner;
}

export function planAbilities(b: Battle, side: Side): BattleEvent[] {
  const ev: BattleEvent[] = [];
  const g = general(b, side);
  if (!g) return ev;
  const near = nearGeneral(b, side, BAL.habilidades.brado.raio).filter((u) => u.id !== g.id);
  const foes = sideUnits(b, other(side));
  const closest = foes.length
    ? Math.min(...near.concat(g).flatMap((u) => foes.map((f) => Math.abs(f.cell - u.cell))))
    : 99;
  const threatened = threatDistance(b, side) <= BAL.ia.ameaca;
  if (near.length >= 2 && closest <= 3 && canUseAbility(b, side, 'brado')) {
    const e = useAbility(b, side, 'brado');
    if (e) ev.push(e);
  }
  if (near.length >= 2 && (closest <= 2 || threatened) && canUseAbility(b, side, 'muralha')) {
    const e = useAbility(b, side, 'muralha');
    if (e) ev.push(e);
  }
  return ev;
}
