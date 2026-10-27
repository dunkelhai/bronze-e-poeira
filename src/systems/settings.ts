/** Opções da sessão (sem save). */
export const settings = {
  /** "Reduzir tremor/flash": shake ×0 e flashes com alpha máx. 0.3 */
  reduceMotion: false,
  showFps: false,
};

export const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
