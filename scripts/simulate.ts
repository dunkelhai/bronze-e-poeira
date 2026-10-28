/**
 * Simulação de partidas fora do navegador: bots do jogador (lado 0) contra a IA do rival (lado 1).
 * Uso: `npm run sim` (opcional: `npm run sim -- 500` para o nº de partidas por bot).
 */
import { BAL, RECRUIT_ORDER, UNITS, type RecruitKind } from '../src/config/balance';
import { aiPlan, countKinds, planAbilities } from '../src/systems/ai';
import {
  canRecruit,
  canUseAbility,
  createBattle,
  endRound,
  frontOrder,
  nearGeneral,
  other,
  recruit,
  resolveSide,
  startPlanning,
  useAbility,
  type Battle,
  type Side,
} from '../src/systems/battle';
import { mulberry32, type Rng } from '../src/systems/rng';

declare const process: { argv: string[] };

type Bot = (b: Battle, side: Side, rng: Rng, mem: { i: number }) => void;

/** Recruta qualquer coisa que der, todos avançam, habilidades assim que prontas. */
const aleatorio: Bot = (b, side, rng) => {
  for (let i = 0; i < BAL.recrutasPorTurno; i++) {
    const opts = RECRUIT_ORDER.filter((k) => canRecruit(b, side, k));
    if (opts.length) recruit(b, side, opts[Math.floor(rng() * opts.length)]);
  }
  for (const u of frontOrder(b, side)) u.order = 'avancar';
  if (canUseAbility(b, side, 'brado')) useAbility(b, side, 'brado');
  if (canUseAbility(b, side, 'muralha')) useAbility(b, side, 'muralha');
};

/** Ciclo fixo de recrutamento (poupa para o próximo), arqueiros atrás, habilidades com critério. */
const CICLO: RecruitKind[] = [
  'escudeiro',
  'arqueiro',
  'lanceiro',
  'escudeiro',
  'arqueiro',
  'cavaleiro',
  'fundibulo',
];
const simples: Bot = (b, side, _rng, mem) => {
  for (let i = 0; i < BAL.recrutasPorTurno; i++) {
    const k = CICLO[mem.i % CICLO.length];
    if (!canRecruit(b, side, k)) break;
    recruit(b, side, k);
    mem.i++;
  }
  for (const u of frontOrder(b, side)) u.order = 'avancar';
  planAbilities(b, side);
};

/** O mesmo cérebro da IA jogando pelo jogador. */
const espelho: Bot = (b, side, rng) => {
  aiPlan(b, side, rng);
};

/**
 * Bot "pensante": recruta todo turno, contra-recruta a composição do rival, mantém um fundíbulo,
 * tira o general ferido da frente e usa as habilidades quando há aliados perto.
 */
const pensante: Bot = (b, side, rng, mem) => {
  for (let i = 0; i < BAL.recrutasPorTurno; i++) pensaRecruta(b, side, mem);
  for (const u of frontOrder(b, side)) {
    u.order = 'avancar';
    if (u.kind === 'general' && u.hp < u.maxHp * 0.35 && u.cell > 2) u.order = 'recuar';
  }
  const near = nearGeneral(b, side, 2).length - 1;
  if (near >= 1 && canUseAbility(b, side, 'brado')) useAbility(b, side, 'brado');
  if (near >= 1 && canUseAbility(b, side, 'muralha')) useAbility(b, side, 'muralha');
  void rng;
};

function pensaRecruta(b: Battle, side: Side, mem: { i: number }): void {
  const foe = countKinds(b, other(side));
  const own = countKinds(b, side);
  const gold = b.sides[side].gold;
  let want: RecruitKind | null = null;
  if (own.fundibulo < 1 && b.turn >= 4 && gold >= UNITS.fundibulo.custo) want = 'fundibulo';
  else if (foe.cavaleiro > own.lanceiro) want = 'lanceiro';
  else if (foe.arqueiro + foe.fundibulo >= 2 && own.cavaleiro < 2) want = 'cavaleiro';
  else if (foe.lanceiro > own.arqueiro) want = 'arqueiro';
  else want = (['escudeiro', 'arqueiro', 'cavaleiro', 'lanceiro'] as const)[mem.i % 4];
  if (!canRecruit(b, side, want)) {
    want =
      (['cavaleiro', 'arqueiro', 'lanceiro', 'escudeiro'] as const).find((k) =>
        canRecruit(b, side, k),
      ) ?? null;
  }
  if (want && recruit(b, side, want)) mem.i++;
}

/** Só defende: escudeiros e arqueiros segurando perto do estandarte. */
const tartaruga: Bot = (b, side, _rng, mem) => {
  for (let i = 0; i < BAL.recrutasPorTurno; i++) {
    const k: RecruitKind = mem.i % 2 ? 'arqueiro' : 'escudeiro';
    if (!canRecruit(b, side, k)) break;
    recruit(b, side, k);
    mem.i++;
  }
  for (const u of frontOrder(b, side)) u.order = u.cell >= 3 ? 'segurar' : 'avancar';
  planAbilities(b, side);
};

interface Stats {
  wins: number;
  turns: number[];
  reasons: Record<string, number>;
  bannerLeft: number[];
}

function play(bot: Bot, seed: number): { winner: Side; turn: number; reason: string; b: Battle } {
  const rng = mulberry32(seed);
  const b = createBattle();
  const mem = { i: 0 };
  while (!b.result) {
    startPlanning(b, 0);
    bot(b, 0, rng, mem);
    resolveSide(b, 0);
    if (b.result) break;
    startPlanning(b, 1);
    aiPlan(b, 1, rng);
    resolveSide(b, 1);
    if (b.result) break;
    endRound(b);
  }
  const r = b.result!;
  return { winner: r.winner, turn: b.turn, reason: r.reason, b };
}

const N = Number(process.argv[2] ?? 400);
const bots: [string, Bot][] = [
  ['aleatorio', aleatorio],
  ['simples', simples],
  ['pensante', pensante],
  ['espelho (IA x IA)', espelho],
  ['tartaruga', tartaruga],
];
console.log(`Partidas por bot: ${N}`);
for (const [name, bot] of bots) {
  const st: Stats = { wins: 0, turns: [], reasons: {}, bannerLeft: [] };
  for (let i = 0; i < N; i++) {
    const r = play(bot, 1000 + i * 7919);
    if (r.winner === 0) st.wins++;
    st.turns.push(r.turn);
    const key = `${r.winner === 0 ? 'V' : 'D'}:${r.reason}`;
    st.reasons[key] = (st.reasons[key] ?? 0) + 1;
    st.bannerLeft.push(r.b.sides[0].banner);
  }
  const avg = st.turns.reduce((a, c) => a + c, 0) / N;
  const sorted = [...st.turns].sort((a, c) => a - c);
  console.log(
    `${name.padEnd(18)} vitórias ${((st.wins / N) * 100).toFixed(1).padStart(5)}% | turnos méd ${avg.toFixed(1)} (p10 ${sorted[Math.floor(N * 0.1)]}, p90 ${sorted[Math.floor(N * 0.9)]}) |`,
    Object.entries(st.reasons)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join(' '),
  );
}
