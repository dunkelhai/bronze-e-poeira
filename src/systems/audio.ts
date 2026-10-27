/** Sons sintetizados com Web Audio; o contexto só nasce após o Espaço da tela de título. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function initAudio(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.28;
  master.connect(ctx.destination);
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol = 1,
  slideTo?: number,
  delay = 0,
  cutoff = 0,
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = osc;
  if (cutoff > 0) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur: number, vol = 0.6, cutoff = 1200, type: BiquadFilterType = 'lowpass'): void {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

/** Corneta: dente-de-serra filtrado com leve vibrato de ataque. */
function horn(notes: number[], step: number, dur: number, vol = 0.32): void {
  notes.forEach((f, i) => {
    tone(f, dur, 'sawtooth', vol, undefined, i * step, 1400);
    tone(f * 2, dur * 0.8, 'triangle', vol * 0.25, undefined, i * step, 2400);
  });
}

export const sfx = {
  ui: () => tone(620, 0.06, 'triangle', 0.25),
  denied: () => tone(180, 0.12, 'square', 0.15, 140),
  /** tambor de marcha */
  drum: () => {
    tone(110, 0.16, 'sine', 0.55, 55);
    noise(0.06, 0.25, 600);
  },
  recruit: () => {
    tone(330, 0.08, 'triangle', 0.3);
    tone(495, 0.12, 'triangle', 0.3, undefined, 0.07);
  },
  /** impacto metálico */
  clash: () => {
    noise(0.1, 0.45, 2600, 'highpass');
    tone(1240, 0.18, 'square', 0.08, 900);
    tone(1870, 0.14, 'triangle', 0.1, 1500);
    tone(150, 0.1, 'sine', 0.3, 80);
  },
  arrow: () => noise(0.12, 0.25, 3000, 'bandpass'),
  siege: () => {
    noise(0.35, 0.8, 500);
    tone(70, 0.35, 'sine', 0.6, 35);
  },
  bannerHit: () => {
    tone(90, 0.3, 'sine', 0.55, 50);
    noise(0.2, 0.4, 800);
  },
  death: () => tone(240, 0.3, 'triangle', 0.25, 90),
  ability: () => horn([392, 523], 0.12, 0.28, 0.25),
  turn: () => horn([294], 0, 0.35, 0.18),
  win: () => horn([392, 523, 659, 784, 1046], 0.16, 0.42, 0.3),
  lose: () => horn([392, 330, 262, 196], 0.24, 0.5, 0.26),
};
