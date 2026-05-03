import { MODES, COLORS, PALETTES } from './constants.js';

const localG = {
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

  /** Метаморфоз за текущий забег (глубина «жизни»). */
  runMorphCount: 0,
  /** Сколько раз смерть в форме стала перерождением. */
  runDeathCount: 0,
  lastMorphRealTime: 0,
  trails: [],
  dt: 0,
  lastTime: 0,
  bestScore: 0,
  
  runStartTime: 0,
  isVictory: false,
  isEndless: false,

  carryover: {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
    flappyHeight: 0,
    enemies: [],
    bullets: [],
    kills: 0,
    shotTimer: 0,
    vy: 0,
    killsNeeded: 10
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

  /** Визуальные признаки эволюции */
  get evolutionFeatures() {
    const features = [];
    if (this.cycle >= 1) features.push('glow');   // Свечение
    if (this.cycle >= 2) features.push('trails'); // Шлейф
    if (this.cycle >= 3) features.push('wings');  // Крылья (визуально)
    if (this.cycle >= 4) features.push('aura');   // Аура силы
    return features;
  },

  MODES,
  PALETTES,
  
  get COLORS() {
    const pIndex = Math.min(this.cycle, PALETTES.length - 1);
    return PALETTES[pIndex];
  },
  
  getColor(idx) {
    return this.COLORS[idx] || '#fff';
  }
};

if (typeof window !== 'undefined') {
  if (!window._G_SINGLETON) window._G_SINGLETON = localG;
}

export const G = typeof window !== 'undefined' ? window._G_SINGLETON : localG;

export function resetCarryover() {
  G.carryover = {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
    flappyHeight: 0,
    enemies: [],
    bullets: [],
    kills: 0,
    shotTimer: 0,
    vy: 0,
    killsNeeded: 10
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
