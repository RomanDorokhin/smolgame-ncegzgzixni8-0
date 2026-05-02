import { MODES, COLORS } from './constants.js';

export const G = {
  canvas: null,
  ctx: null,
  W() { return this.canvas?.width ?? 0; },
  H() { return this.canvas?.height ?? 0; },

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

  keys: {},
  touchJump: false,

  /** Метаморфоз за текущий забег (глубина «жизни»). */
  runMorphCount: 0,
  /** Сколько раз смерть в форме стала перерождением. */
  runDeathCount: 0,
  bestScore: 0,

  carryover: {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
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

  MODES,
  COLORS,
};

export function resetCarryover() {
  G.carryover = {
    jumperCrystals: 0,
    snakeMeals: 0,
    bricksCleared: 0,
    shooterKills: 0,
  };
}

export function syncGameModeFromStage() {
  G.gameMode = G.stageOrder[G.stageIndex];
}

export function advanceStageAfterMorph() {
  G.stageIndex = (G.stageIndex + 1) % 5;
  if (G.stageIndex === 0) {
    G.cycle++;
    // We keep fixed order now: [0, 1, 2, 3, 4]
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
