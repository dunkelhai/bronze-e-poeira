/** Paleta do guia de estilo (seção 7. bronze-e-poeira). */
export const PAL = {
  ceuAlto: 0x4a3f78,
  ceuPoente: 0xf08a4b,
  ceuHorizonte: 0xffd58a,
  monte: 0x8a5a4a,
  areia: 0xe8c27a,
  areiaSombra: 0xb98a4a,
  bronze: 0xc08a3e,
  terracota: 0xc4643a,
  carmim: 0xb3202e,
  egeu: 0x1f6fb2,
  tinta: 0x2a1a12,
  marfim: 0xf6ead0,
  // tons derivados
  bronzeEscuro: 0x7a4e22,
  carmimEscuro: 0x6e1018,
  egeuEscuro: 0x123f6a,
  pele: 0xd9976a,
  madeira: 0x7a4a2a,
  vidaAliada: 0x6fd06a,
  vidaRival: 0xff5a4a,
  branco: 0xffffff,
  preto: 0x000000,
} as const;

/** Mesmas cores como string, para `Text`. */
export const PALS = {
  ceuHorizonte: '#ffd58a',
  ceuPoente: '#f08a4b',
  areia: '#e8c27a',
  areiaSombra: '#b98a4a',
  bronze: '#c08a3e',
  terracota: '#c4643a',
  carmim: '#b3202e',
  carmimClaro: '#ff6b6b',
  egeu: '#1f6fb2',
  egeuClaro: '#7cc4ff',
  tinta: '#2a1a12',
  marfim: '#f6ead0',
  verde: '#9be07a',
} as const;

export const FONT_TITLE = '"Cinzel Decorative", serif';
export const FONT_UI = 'Rubik, sans-serif';

/** Cor do time: 0 = Calídria (jogador, azul-egeu), 1 = Quelmora (rival, carmim). */
export const TEAM = [
  { base: PAL.egeu, dark: PAL.egeuEscuro, css: PALS.egeuClaro },
  { base: PAL.carmim, dark: PAL.carmimEscuro, css: PALS.carmimClaro },
] as const;
