/** TODAS as constantes de balanceamento do jogo ficam aqui. */

export type UnitKind =
  'escudeiro' | 'lanceiro' | 'arqueiro' | 'cavaleiro' | 'fundibulo' | 'general';
export type RecruitKind = Exclude<UnitKind, 'general'>;

export interface UnitStats {
  nome: string;
  /** descrição curta para o painel */
  papel: string;
  custo: number;
  vida: number;
  ataque: number;
  defesa: number;
  movimento: number;
  alcance: number;
  /** contra-ataca quando golpeado corpo a corpo */
  revida: boolean;
  /** não ataca no mesmo turno em que se moveu */
  pesado: boolean;
}

export const UNITS: Record<UnitKind, UnitStats> = {
  escudeiro: {
    nome: 'Escudeiro de Bronze',
    papel: 'Barato e resistente. Flechas o ferem pela metade.',
    custo: 30,
    vida: 36,
    ataque: 12,
    defesa: 6,
    movimento: 1,
    alcance: 1,
    revida: true,
    pesado: false,
  },
  lanceiro: {
    nome: 'Lança-Longa',
    papel: 'Dano x2 contra cavalaria.',
    custo: 40,
    vida: 28,
    ataque: 15,
    defesa: 3,
    movimento: 1,
    alcance: 1,
    revida: true,
    pesado: false,
  },
  arqueiro: {
    nome: 'Arqueiro de Junco',
    papel: 'Atira a 3 casas. x1,5 contra lanceiros. Fraco de perto.',
    custo: 45,
    vida: 20,
    ataque: 13,
    defesa: 1,
    movimento: 1,
    alcance: 3,
    revida: false,
    pesado: false,
  },
  cavaleiro: {
    nome: 'Cavaleiro da Poeira',
    papel: 'Move 3. Investida +60%. x1,75 contra arqueiros e cerco.',
    custo: 65,
    vida: 30,
    ataque: 18,
    defesa: 3,
    movimento: 3,
    alcance: 1,
    revida: true,
    pesado: false,
  },
  fundibulo: {
    nome: 'Fundíbulo',
    papel: 'Lento, alcance 4. x3 contra o estandarte.',
    custo: 90,
    vida: 22,
    ataque: 20,
    defesa: 1,
    movimento: 1,
    alcance: 4,
    revida: false,
    pesado: true,
  },
  general: {
    nome: 'Estratego',
    papel: 'Único. Se cair, o exército perde moral (-25% de ataque).',
    custo: 0,
    vida: 70,
    ataque: 18,
    defesa: 6,
    movimento: 1,
    alcance: 1,
    revida: true,
    pesado: false,
  },
};

export const RECRUIT_ORDER: RecruitKind[] = [
  'escudeiro',
  'lanceiro',
  'arqueiro',
  'cavaleiro',
  'fundibulo',
];

/** Multiplicadores do triângulo de vantagens: atacante -> alvo -> fator. */
export const MATCHUP: Partial<Record<UnitKind, Partial<Record<UnitKind | 'estandarte', number>>>> =
  {
    lanceiro: { cavaleiro: 2 },
    cavaleiro: { arqueiro: 1.75, fundibulo: 1.75 },
    arqueiro: { lanceiro: 1.5, escudeiro: 0.5 },
    fundibulo: { estandarte: 3, escudeiro: 0.75 },
  };

export const BAL = {
  casas: 12,
  maxTurnos: 30,
  ouroInicial: 120,
  renda: 40,
  /** bônus de ouro por inimigo abatido (fração do custo) */
  saque: 0.25,
  estandarteVida: 160,
  estandarteDefesa: 4,
  /** fórmula: dano = ataque * mult * K / (K + defesa) */
  defesaK: 12,
  danoMinimo: 1,
  /** contra-ataque corpo a corpo = fração do dano normal */
  revide: 0.5,
  /** arqueiro / fundibulo atacando alvo adjacente */
  pertoPenalidade: 0.5,
  investida: 1.6,
  moralPerdida: 0.75,
  /** casa inicial do general de cada lado */
  generalCasa: [1, 10] as const,
  habilidades: {
    brado: {
      nome: 'Brado do Vale',
      desc: '+40% de ataque nos aliados a até 2 casas do general neste turno.',
      raio: 2,
      bonus: 1.4,
      recarga: 4,
    },
    muralha: {
      nome: 'Muralha de Bronze',
      desc: '+5 de defesa nos aliados a até 2 casas do general até o seu próximo turno.',
      raio: 2,
      bonus: 5,
      recarga: 4,
    },
  },
  ia: {
    /** casas a partir das quais a IA considera o estandarte ameaçado */
    ameaca: 4,
    /** chance de a IA guardar ouro para um fundíbulo quando já pode */
    poupaCerco: 0.5,
    /** fração da vida em que o general da IA recua */
    generalRecua: 0.3,
    /** a IA espera juntar esta quantidade de tropas antes de marchar */
    onda: 3,
    /** casa (a partir do próprio estandarte) onde a onda espera */
    ondaCasa: 3,
  },
} as const;

/** Tempos de animação (ms). */
export const ANIM = {
  passo: 170,
  golpe: 260,
  entreAcoes: 90,
  numeroDano: 600,
} as const;
