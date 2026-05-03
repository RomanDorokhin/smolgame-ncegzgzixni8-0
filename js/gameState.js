import { MODES, COLORS, PALETTES } from './constants.js';

export const G = {
  canvas: null,
  ctx: null,
  W() { return window.innerWidth; },
  H() { return window.innerHeight; },

  score: 0,
  stageOrder: [0, 1, 2, 3, 4],
  stageIndex: 0,
  gameMode: 0,
  cycle: 0,

  morphing: false,
  morphT: 0,
  morphFrom: 0,
  morphTo: 0,
  morphDuration: 1200,
  morphSnapshotFrom: null,
  morphSnapshotTo: null,
  morphStyle: 'flow',
  lastMorphReason: 'objective',
  morphStartReal: 0,

  running: false,
  paused: false,
  rafId: 0,
  particles: [],
  bgStars: [],
  shake: 0,
  keys: {},
  touchJump: false,
  touchDir: 0,

  runMorphCount: 0,
  runDeathCount: 0,
  lastMorphRealTime: 0,
  _hintShown: false,
  hintTimer: 0,
  trails: [],
  dt: 0,
  bestScore: 0,
  
  runStartTime: 0,
  isVictory: false,
  isEndless: false,
  bossInited: false,

  carryover: {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
    flappyHeight: 0
  },

  modifiers: [
    { name: 'НОРМА', desc: 'Обычный темп' },
    { name: 'УСКОРЕНИЕ', desc: 'Скорость +25%' },
    { name: 'ЛЕГКОСТЬ', desc: 'Гравитация -30%' },
    { name: 'ИНВЕРСИЯ', desc: 'Зеркальное управление' },
    { name: 'ХАОС', desc: 'Случайный морфинг' }
  ],
  
  get currentMod() {
    return this.modifiers[Math.min(this.cycle, this.modifiers.length - 1)];
  },

  get evolutionFeatures() {
    const features = [];
    if (this.cycle >= 1) features.push('glow');
    if (this.cycle >= 2) features.push('trails');
    if (this.cycle >= 3) features.push('wings');
    if (this.cycle >= 4) features.push('aura');
    return features;
  },

  MODES,
  PALETTES,
  
  get COLORS() {
    const pIndex = Math.min(this.cycle, PALETTES.length - 1);
    return PALETTES[pIndex];
  }
};

// Global singleton for cross-module access in ESM
if (typeof window !== 'undefined') {
  window.G = G;
}

export function resetCarryover() {
  G.carryover = {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
    flappyHeight: 0
  };
}

export function syncGameModeFromStage() {
  G.gameMode = G.stageOrder[G.stageIndex];
}

export function advanceStageAfterMorph() {
  G.stageIndex = (G.stageIndex + 1) % 5;
  if (G.stageIndex === 0) {
    G.cycle++;
    resetCarryover();
  }
  syncGameModeFromStage();
}

export function pickMorphStyle(reason) {
  const r = Math.random();
  if (reason === 'death') {
    if (r < 0.35) return { style: 'flash', ms: 180 + Math.random() * 120 };
    if (r < 0.7) return { style: 'flow', ms: 900 + Math.random() * 500 };
    return { style: 'creep', ms: 1600 + Math.random() * 700 };
  }
  if (r < 0.25) return { style: 'flash', ms: 220 + Math.random() * 100 };
  if (r < 0.55) return { style: 'flow', ms: 700 + Math.random() * 400 };
  return { style: 'creep', ms: 1400 + Math.random() * 600 };
}
