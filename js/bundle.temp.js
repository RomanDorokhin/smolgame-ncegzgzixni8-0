export const MODES = ['КУБИК', 'ЗМЕЙКА', 'АРКАНОИД', 'ШУТЕР', 'ПТИЦА'];
export const COLORS = ['#a855f7', '#22c55e', '#3b82f6', '#f97316', '#ec4899'];

export const PALETTES = [
  ['#a855f7', '#22c55e', '#3b82f6', '#f97316', '#ec4899'], // Классика (Цикл 0)
  ['#06b6d4', '#f43f5e', '#fbbf24', '#8b5cf6', '#10b981'], // Киберпанк (Цикл 1)
  ['#facc15', '#a78bfa', '#fb7185', '#2dd4bf', '#818cf8'], // Пастельный неон (Цикл 2)
  ['#fb923c', '#4ade80', '#60a5fa', '#f472b6', '#c084fc'], // Рассвет (Цикл 3)
  ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff']  // Сингулярность (Цикл 4+)
];
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
  touchDir: 0,

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
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

export const playSound = (type) => {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'jump') {
    o.type = 'sine';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now);
    o.stop(now + 0.1);
  } else if (type === 'collect') {
    o.type = 'triangle';
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(1000, now + 0.05);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    o.start(now);
    o.stop(now + 0.1);
  } else if (type === 'death') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    g.gain.setValueAtTime(0.2, now);
    g.gain.linearRampToValueAtTime(0, now + 0.3);
    o.start(now);
    o.stop(now + 0.3);
  } else if (type === 'morph') {
    o.type = 'sine';
    o.frequency.setValueAtTime(100, now);
    o.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    o.start(now);
    o.stop(now + 0.5);
  } else if (type === 'shoot') {
    o.type = 'square';
    o.frequency.setValueAtTime(800, now);
    o.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    o.start(now);
    o.stop(now + 0.05);
  }
};
import { G } from './gameState.js';
import { COLORS } from './constants.js';

const ctx = () => G.ctx;

export function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    G.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 4,
      color
    });
  }
}

export function spawnSoulParticles(x, y, color, count, lifeMult = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 60;
    G.particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * (0.5 + Math.random() * 0.5),
      vy: Math.sin(angle) * (0.5 + Math.random() * 0.5),
      life: 1,
      decay: (0.008 + Math.random() * 0.012) / lifeMult,
      size: 1 + Math.random() * 2,
      color,
      soul: true
    });
  }
}

export function updateParticles() {
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.soul) {
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy -= 0.02; // souls drift upward
    } else {
      p.vy += 0.1;
    }
    p.life -= p.decay;
  }
}

export function drawParticles() {
  const c = ctx();
  for (const p of G.particles) {
    c.globalAlpha = p.life;
    if (p.soul) {
      c.fillStyle = '#fff';
      c.shadowColor = p.color;
      c.shadowBlur = 8 * p.life;
      const s = p.size * p.life;
      c.fillRect(p.x - s/2, p.y - s/2, s, s);
      c.shadowBlur = 0;
    } else {
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

export function addTrail(x, y, color) {
  if (!G.evolutionFeatures.includes('trails')) return;
  G.trails.push({ x, y, color, life: 1 });
}

export function updateTrails() {
  G.trails = G.trails.filter(t => t.life > 0);
  for (const t of G.trails) {
    t.life -= 0.05 * G.dt;
  }
}

export function drawTrails() {
  const c = ctx();
  for (const t of G.trails) {
    c.globalAlpha = t.life * 0.3;
    c.fillStyle = t.color;
    c.beginPath();
    c.arc(t.x, t.y, 10 * t.life, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

export function initStars() {
  G.bgStars = [];
  for (let i = 0; i < 80; i++) {
    G.bgStars.push({
      x: Math.random() * G.W(),
      y: Math.random() * G.H(),
      r: Math.random() * 1.5,
      a: Math.random(),
      speed: 0.2 + Math.random() * 0.5
    });
  }
}

export function drawBg() {
  const c = ctx();
  const color = COLORS[G.gameMode];
  c.fillStyle = '#05050a';
  c.fillRect(0, 0, G.W(), G.H());
  c.globalAlpha = 0.04;
  c.fillStyle = color;
  c.fillRect(0, 0, G.W(), G.H());
  c.globalAlpha = 1;

  for (const s of G.bgStars) {
    c.globalAlpha = s.a * 0.6;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    c.fill();
    s.y += s.speed;
    if (s.y > G.H()) { s.y = 0; s.x = Math.random() * G.W(); }
  }
  c.globalAlpha = 1;
}
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { playSound } from '../audio.js';
import { boss } from './boss.js';

export const jumper = {
  x: 0, y: 0, vx: 0, vy: 0,
  w: 36, h: 36,
  grounded: false,
  camY: 0,
  crystals: [],
  platforms: [],
  crystalsCollected: 0,
  crystalsNeeded: 5,

  spawnPlatform(idx) {
    const y = this.y - 120 - idx * 70;
    const pw = 80 + Math.random() * 60;
    const x = Math.random() * (G.W() - pw);
    const hasMine = (G.cycle >= 3 && Math.random() < 0.25);
    this.platforms.push({ x, y, w: pw, h: 15, mine: hasMine });
    if (idx > 0 && Math.random() < 0.4 && !hasMine) {
      this.crystals.push({
        x: x + pw / 2 - 8,
        y: y - 30,
        w: 16, h: 16,
        collected: false,
        pulse: Math.random() * 10
      });
    }
  },

  init() {
    this.x = G.W() / 2 - 18;
    this.y = G.H() - 150; // Spawn slightly higher
    this.vx = 0; this.vy = 0;
    this.camY = this.y - G.H() * 0.5;
    this.crystals = [];
    this.platforms = [];
    this.crystalsCollected = 0;
    this.crystalsNeeded = 5 + G.cycle * 2;

    // Guaranteed safe start platform
    const startPW = 200;
    this.platforms.push({ 
      x: this.x - startPW / 2 + 18, 
      y: this.y + 36, 
      w: startPW, 
      h: 40 
    });
    this.grounded = true;
    
    // Gen platforms higher up
    let curY = this.y - 120;
    for (let i = 0; i < 40; i++) {
      const pw = 80 + Math.random() * 60;
      const hasMine = (G.cycle >= 3 && Math.random() < 0.25);
      this.platforms.push({
        x: Math.random() * (G.W() - pw),
        y: curY,
        w: pw,
        h: 15,
        mine: hasMine
      });
      if (Math.random() < 0.4 && !hasMine) {
        this.crystals.push({
          x: this.platforms[this.platforms.length - 1].x + pw / 2 - 8,
          y: curY - 30,
          w: 16, h: 16,
          collected: false,
          pulse: Math.random() * 10
        });
      }
      curY -= 120 + Math.random() * 40;
    }
  },

  update() {
    const g = 0.4 * G.dt;
    const speed = 5 * G.dt;
    const jump = -11;

    if (G.keys['ArrowLeft']) this.vx = -speed;
    else if (G.keys['ArrowRight']) this.vx = speed;
    else this.vx *= 0.8;

    this.vy += g;
    this.x += this.vx;
    this.y += this.vy * G.dt;

    if (G.touchJump && this.grounded) {
      this.vy = jump;
      this.grounded = false;
      playSound('jump');
    }
    if (G.keys['ArrowUp'] && this.grounded) {
      this.vy = jump;
      this.grounded = false;
      playSound('jump');
    }

    addTrail(this.x + 18, this.y + 18, COLORS[0]);

    // Bounds
    if (this.x < 0) this.x = 0;
    if (this.x > G.W() - this.w) this.x = G.W() - this.w;

    // Platforms
    this.grounded = false;
    for (const p of this.platforms) {
      if (this.vy > 0 && 
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + this.vy * G.dt + 2) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
        
        if (p.mine) {
           spawnParticles(this.x + this.w/2, this.y + this.h, '#ef4444', 20);
           playSound('death');
           G.triggerMorph('death');
           return;
        }
      }
    }

    if (this.x > G.W()) this.x = 0;

    // Camera follow upward
    const targetCamY = Math.min(0, -this.y + G.H() * 0.4);
    this.camY += (targetCamY - this.camY) * 0.1;

    // Crystal collection
    for (const c of this.crystals) {
      if (c.collected) continue;
      if (
        !c.collected &&
        this.x + this.w > c.x &&
        this.x < c.x + c.w &&
        this.y + this.h > c.y &&
        this.y < c.y + c.h
      ) {
        c.collected = true;
        this.crystalsCollected++;
        G.score += 100;
        if (G.cycle >= 5) boss.damage(5);
        G.carryover.jumperCrystals = this.crystalsCollected;
        spawnParticles(c.x + 8, c.y + 8, COLORS[0], 10);
        if (this.crystalsCollected >= this.crystalsNeeded) {
          G.triggerMorph('objective');
          return;
        }
      }
      c.pulse += 0.1;
    }

    // Death by falling
    if (this.y > this.camY + G.H() + 100) {
      spawnParticles(this.x, G.H(), COLORS[0], 16);
      G.triggerMorph('death');
    }

    // Spawn new platforms as we go up
    const topPlatform = this.platforms[this.platforms.length - 1];
    if (topPlatform && topPlatform.y + this.camY > -100) {
      this.spawnPlatform(this.platforms.length);
    }
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[0];
    c.save();
    c.translate(0, this.camY);

    // Platforms
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (const p of this.platforms) {
      c.fillStyle = p.mine ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
      c.fillRect(p.x, p.y, p.w, p.h);
      if (p.mine) {
        c.fillStyle = '#ef4444';
        const pulse = Math.sin(performance.now() * 0.015) * 2;
        c.beginPath();
        c.arc(p.x + p.w / 2, p.y - 4, 6 + pulse, 0, Math.PI * 2);
        c.fill();
        c.shadowColor = '#ef4444';
        c.shadowBlur = 10;
        c.fill();
        c.shadowBlur = 0;
      }
    }

    // Crystals
    for (const cr of this.crystals) {
      if (cr.collected) continue;
      const pulse = Math.sin(cr.pulse) * 3;
      c.fillStyle = '#e9d5ff';
      c.shadowColor = col;
      c.shadowBlur = 12 + pulse;
      c.fillRect(cr.x + pulse, cr.y + pulse, cr.w - pulse * 2, cr.h - pulse * 2);
      c.shadowBlur = 0;
    }

    // Player
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 15;
    // Draw from left corner as per physics logic
    c.fillRect(this.x, this.y, this.w, this.h);
    c.shadowBlur = 0;

    // Eyes
    c.fillStyle = '#fff';
    c.fillRect(this.x - 8, this.y - 8, 5, 5);
    c.fillRect(this.x + 3, this.y - 8, 5, 5);

    c.restore();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('КРИСТАЛЛЫ: ' + this.crystalsCollected + ' / ' + this.crystalsNeeded, G.W() / 2, 80);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 0,
      px: this.x,
      py: this.y + this.camY,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[0];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 12;
    const size = (snap.w || 30) * (0.8 + uMorph * 0.2);
    c.fillRect(snap.px - size / 2, snap.py - size / 2, size, size);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(snap.px - 8, snap.py - 8, 5, 5);
    c.fillRect(snap.px + 3, snap.py - 8, 5, 5);
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath();
      c.ellipse(snap.px - 18, snap.py - 5, 12, 5, -0.4, 0, Math.PI * 2);
      c.ellipse(snap.px + 18, snap.py - 5, 12, 5, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const snake = {
  body: [],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: [],
  shadowSnake: [],
  shadowDir: { x: 0, y: 1 },
  mealsEaten: 0,
  mealsNeeded: 5,
  cellSize: 20,
  gridW: 0, gridH: 0,
  timer: 0,
  speed: 6,
  fieldX: 0, fieldY: 60,
  fieldW: 0, fieldH: 0,

  init() {
    this.cellSize = Math.floor(Math.min(G.W(), G.H() * 0.7) / 20);
    this.gridW = Math.floor(G.W() / this.cellSize);
    this.gridH = Math.floor((G.H() - 140) / this.cellSize);
    this.fieldX = Math.floor((G.W() - this.gridW * this.cellSize) / 2);
    this.fieldY = 60;
    this.fieldW = this.gridW * this.cellSize;
    this.fieldH = this.gridH * this.cellSize;
    this.body = [];
    const cx = Math.floor(this.gridW / 2);
    const cy = Math.floor(this.gridH / 2);
    const bonus = G.carryover.jumperCrystals || 0;
    for (let i = 4 + bonus; i >= 0; i--) this.body.push({ x: cx - i, y: cy });
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = [];
    this.mealsEaten = 0;
    this.mealsNeeded = 4 + Math.floor(G.cycle * 0.5);
    this.huntingJumper = false;
    this.jumperPrey = null;
    this.timer = 0;
    this.speed = Math.max(1, 6 - Math.floor(G.cycle * 0.8));
    this.spawnFood();
    this.spawnFood();
    this.ensureMealsOnField();

    // Shadow Snake (Enemy)
    this.shadowSnake = [];
    if (G.cycle >= 3) {
      const sx = this.gridW - 4;
      const sy = this.gridH - 4;
      for (let i = 0; i < 6; i++) this.shadowSnake.push({ x: sx, y: sy + i });
      this.shadowDir = { x: 0, y: -1 };
    }
  },

  spawnFood() {
    let tries = 0;
    while (tries++ < 100) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: false, pulse: 0 });
        return;
      }
    }
  },

  countMealsOnFood() {
    return this.food.filter(f => f.isMeal).length;
  },

  ensureMealsOnField() {
    if (this.huntingJumper) return; // Don't spawn normal food during hunt
    const need = 2 - this.countMealsOnFood();
    for (let k = 0; k < need; k++) this.spawnMeal();
    if (Math.random() < 0.005 && !this.food.find(f => f.isGolden)) {
      this.spawnGoldenFood();
    }
  },

  spawnGoldenFood() {
    let tries = 0;
    while (tries++ < 120) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: true, isGolden: true, pulse: 0 });
        return;
      }
    }
  },

  spawnJumperPrey() {
    let tries = 0;
    while (tries++ < 200) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y)) {
        this.jumperPrey = { x, y };
        return;
      }
    }
    // Fallback if no free space
    this.jumperPrey = { x: Math.floor(this.gridW / 2), y: Math.floor(this.gridH / 2) };
  },

  spawnMeal() {
    let tries = 0;
    while (tries++ < 120) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: true, pulse: Math.random() * 6 });
        return;
      }
    }
  },

  update() {
    let up = G.keys['ArrowUp'] || G.keys['KeyW'];
    let down = G.keys['ArrowDown'] || G.keys['KeyS'];
    let left = G.keys['ArrowLeft'] || G.keys['KeyA'];
    let right = G.keys['ArrowRight'] || G.keys['KeyD'];

    if (up && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (down && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (left && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (right && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };

    this.timer++;
    let finalSpeed = this.speed;
    if (G.currentMod.name === 'УСКОРЕНИЕ') finalSpeed = Math.max(1, finalSpeed - 2);

    if (this.timer < finalSpeed) return;
    this.timer = 0;
    this.dir = { ...this.nextDir };

    const head = this.body[this.body.length - 1];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    if (nx < 0 || nx >= this.gridW || ny < 0 || ny >= this.gridH) {
      spawnParticles(this.fieldX + head.x * this.cellSize, this.fieldY + head.y * this.cellSize, COLORS[1], 16);
      G.triggerMorph('death');
      return;
    }
    if (this.body.slice(0, -1).find(b => b.x === nx && b.y === ny)) {
      spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, COLORS[1], 16);
      G.triggerMorph('death');
      return;
    }

    this.body.push({ x: nx, y: ny });
    let ate = false;

    const fi = this.food.findIndex(f => f.x === nx && f.y === ny);
    if (fi !== -1) {
      const piece = this.food[fi];
      this.food.splice(fi, 1);
      
      this.mealsEaten++; // Every piece counts now
      
      if (piece.isMeal) {
        G.score += 50;
        if (G.cycle >= 5) boss.damage(5);
        playSound('collect');
        if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#a78bfa', 12);
        if (piece.isGolden) {
          G.carryover.snakeMeals = 20; 
          G.score += 1000;
          spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#fbbf24', 40);
          G.triggerMorph('objective');
          return;
        }
      } else {
        G.score += 15;
        playSound('collect');
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#ef4444', 6);
      }

      if (this.mealsEaten >= this.mealsNeeded && !this.huntingJumper) {
        this.huntingJumper = true;
        this.food = []; // Clear all normal food
        this.spawnJumperPrey();
        return;
      }
      this.spawnFood();
      ate = true;
    }
    
    // Check Jumper Prey collision
    if (this.huntingJumper && this.jumperPrey && nx === this.jumperPrey.x && ny === this.jumperPrey.y) {
       this.mealsEaten += 10; // Massive bonus
       G.carryover.snakeMeals = this.mealsEaten;
       spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#a78bfa', 40);
       G.triggerMorph('objective');
       return;
    }

    if (!ate) this.body.shift();
    this.ensureMealsOnField();
    for (const f of this.food) f.pulse += 0.12;

    // Move Shadow Snake
    if (this.shadowSnake.length > 0) {
      if (Math.random() < 0.1) {
        const r = Math.random();
        if (r < 0.25) this.shadowDir = { x: 0, y: -1 };
        else if (r < 0.5) this.shadowDir = { x: 0, y: 1 };
        else if (r < 0.75) this.shadowDir = { x: -1, y: 0 };
        else this.shadowDir = { x: 1, y: 0 };
      }
      
      const sh = this.shadowSnake[this.shadowSnake.length - 1];
      let snx = sh.x + this.shadowDir.x;
      let sny = sh.y + this.shadowDir.y;
      
      // Wrap shadow snake
      if (snx < 0) snx = this.gridW - 1;
      if (snx >= this.gridW) snx = 0;
      if (sny < 0) sny = this.gridH - 1;
      if (sny >= this.gridH) sny = 0;
      
      this.shadowSnake.push({ x: snx, y: sny });
      this.shadowSnake.shift();

      // Check collision: Player Head hits Shadow Snake
      if (this.shadowSnake.find(s => s.x === nx && s.y === ny)) {
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#000', 30);
        playSound('death');
        G.triggerMorph('death');
        return;
      }
    }
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
    const COL = COLORS[1];
    const cs = this.cellSize;
    const fx = this.fieldX, fy = this.fieldY;

    c.strokeStyle = COL;
    c.globalAlpha = 0.3;
    c.lineWidth = 1;
    c.strokeRect(fx, fy, this.fieldW, this.fieldH);
    c.globalAlpha = 1;

    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.shadowColor = COL;
    c.shadowBlur = 10;
    c.fillText('ПОГЛОЩЕНИЕ: ' + this.mealsEaten + ' / ' + this.mealsNeeded, G.W() / 2, fy - 15);
    c.shadowBlur = 0;
    c.textAlign = 'left';

    for (const f of this.food) {
      if (f.isMeal) {
        const pulse = Math.sin(f.pulse) * 2;
        c.fillStyle = '#e9d5ff';
        c.shadowColor = '#a78bfa';
        c.shadowBlur = 12 + pulse;
        c.beginPath();
        c.arc(fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2, cs / 2 - 2 + pulse * 0.3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
        if (f.isGolden) {
          c.fillStyle = '#fff';
          c.font = '12px serif';
          c.textAlign = 'center';
          c.fillText('★', fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2 + 4);
          c.textAlign = 'left';
        }
      } else {
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444';
        c.shadowBlur = 10;
        c.beginPath();
        c.arc(fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2, cs / 2 - 2, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      }
    }

    // Shadow Snake
    if (this.shadowSnake.length > 0) {
      c.globalAlpha = 0.4;
      c.shadowBlur = 10;
      c.shadowColor = '#fff';
      for (let i = 0; i < this.shadowSnake.length; i++) {
        const s = this.shadowSnake[i];
        c.fillStyle = '#1e1b4b'; // Deep indigo ghost
        c.beginPath();
        c.arc(fx + s.x * cs + cs / 2, fy + s.y * cs + cs / 2, cs / 2, 0, Math.PI * 2);
        c.fill();
      }
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }

    if (this.huntingJumper && this.jumperPrey) {
      const jx = fx + this.jumperPrey.x * cs;
      const jy = fy + this.jumperPrey.y * cs;
      const s = cs * 1.2;
      c.fillStyle = COLORS[0];
      c.shadowColor = COLORS[0];
      c.shadowBlur = 20;
      c.fillRect(jx, jy, s, s);
      c.fillStyle = '#fff';
      c.fillRect(jx + s*0.2, jy + s*0.2, s*0.2, s*0.2);
      c.fillRect(jx + s*0.6, jy + s*0.2, s*0.2, s*0.2);
      c.shadowBlur = 0;
      
      c.fillStyle = '#fff';
      c.font = 'bold 12px Courier New';
      c.textAlign = 'center';
      c.fillText('ПОГЛОТИ ПРЕДКА!', G.W()/2, jy - 20);
      c.textAlign = 'left';
    }

    if (skipPlayer) return;

    for (let i = 0; i < this.body.length; i++) {
      const b = this.body[i];
      const t = i / this.body.length;
      c.fillStyle = COL;
      c.globalAlpha = 0.4 + t * 0.6;
      c.shadowColor = COL;
      c.shadowBlur = i === this.body.length - 1 ? 12 : 4;
      const pad = i === this.body.length - 1 ? 1 : 2;
      c.fillRect(fx + b.x * cs + pad, fy + b.y * cs + pad, cs - pad * 2, cs - pad * 2);
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }
    const h = this.body[this.body.length - 1];
    c.fillStyle = '#fff';
    const hx = fx + h.x * cs + 4;
    const hy = fy + h.y * cs + 4;
    c.fillRect(hx, hy, 4, 4);
    c.fillRect(hx + cs - 10, hy, 4, 4);
  },

  getSnapshot() {
    const h = this.body[this.body.length - 1];
    const cs = this.cellSize;
    return {
      mode: 1,
      px: this.fieldX + h.x * cs + cs / 2,
      py: this.fieldY + h.y * cs + cs / 2,
      segs: this.body.map(b => ({
        x: this.fieldX + b.x * cs + cs / 2,
        y: this.fieldY + b.y * cs + cs / 2
      })),
      cs
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[1];
    const segs = snap.segs;
    if (!segs || !segs.length) return;
    
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = col;
    c.lineWidth = snap.cs * 0.85;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 12;
    c.beginPath();
    
    const isToArkanoid = G.morphFrom === 1 && G.morphTo === 2;
    
    if (isToArkanoid) {
        const head = segs[segs.length - 1];
        const paddleW = 80 + G.carryover.snakeMeals * 6;
        
        c.moveTo(head.x - (head.x - segs[0].x) * (1-uMorph), head.y);
        c.lineTo(head.x + (segs[segs.length-1].x - head.x) * (1-uMorph), head.y);
        
        const targetY = head.y;
        c.beginPath();
        for (let i = 0; i < segs.length; i++) {
            const tx = head.x + (i - segs.length/2) * (paddleW / segs.length) * uMorph;
            const ty = head.y * (1-uMorph) + targetY * uMorph;
            const x = segs[i].x * (1-uMorph) + tx * uMorph;
            const y = segs[i].y * (1-uMorph) + ty * uMorph;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
    } else {
        c.moveTo(segs[0].x, segs[0].y);
        for (let i = 1; i < segs.length; i++) c.lineTo(segs[i].x, segs[i].y);
    }
    
    if (isToArkanoid) {
        c.strokeStyle = uMorph < 0.5 ? col : COLORS[2];
    }
    
    c.stroke();
    c.shadowBlur = 0;
    
    const head = segs[segs.length - 1];
    c.fillStyle = '#fff';
    c.fillRect(head.x - 5, head.y - 5, 4, 4);
    c.fillRect(head.x + 1, head.y - 5, 4, 4);
    
    if (G.evolutionFeatures.includes('wings')) {
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath();
        c.ellipse(head.x - 10, head.y - 10, 15, 5, -0.5, 0, Math.PI*2);
        c.ellipse(head.x + 10, head.y - 10, 15, 5, 0.5, 0, Math.PI*2);
        c.fill();
    }
    c.restore();
  }
};
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const arkanoid = {
  paddleX: 0, paddleY: 0, paddleW: 100, paddleH: 14,
  balls: [],
  ballR: 7,
  bricks: [],
  bricksNeeded: 10,
  bricksCleared: 0,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.paddleY = this.height - 60;
    this.paddleX = this.width / 2 - this.paddleW / 2;
    this.paddleW = 80 + (G.carryover.snakeMeals || 0) * 6;
    const bonus = G.carryover.snakeMeals || 0;
    this.bricksNeeded = Math.max(5, 10 - Math.floor(bonus / 3));
    this.bricksCleared = 0;
    this.balls = [];
    this.spawnBall();
    if (G.cycle >= 3) this.spawnBall(-4); // Second ball for higher cycles
    this.bricks = [];
    const cols = 8;
    const brickW = Math.floor(this.width / cols) - 4;
    const rows = 4 + Math.floor(Math.random() * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.2) continue;
        this.bricks.push({
          x: 10 + c * (brickW + 4),
          y: 70 + r * 22,
          w: brickW,
          h: 16,
          alive: true,
          color: COLORS[2]
        });
      }
    }
  },

  spawnBall(vxOverride = 0) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const spd = 5 + G.cycle * 0.2;
    this.balls.push({
      x: this.width / 2,
      y: this.paddleY - 50,
      vx: vxOverride || (Math.cos(angle) * spd),
      vy: Math.sin(angle) * spd
    });
  },

  update() {
    const speed = 7 * G.dt;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.paddleX -= speed;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) this.paddleX += speed;

    if (this.paddleX < 0) this.paddleX = 0;
    if (this.paddleX > G.W() - this.paddleW) this.paddleX = G.W() - this.paddleW;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * G.dt;
      b.y += b.vy * G.dt;

      addTrail(b.x, b.y, COLORS[2]);

      // Walls
      if (b.x < this.ballR || b.x > G.W() - this.ballR) {
        b.vx *= -1;
        playSound('shoot');
      }
      if (b.y < this.ballR) {
        b.vy *= -1;
        playSound('shoot');
      }

      // Paddle
      if (b.vy > 0 && 
          b.y + this.ballR > this.paddleY &&
          b.x > this.paddleX && b.x < this.paddleX + this.paddleW) {
        b.vy *= -1;
        b.y = this.paddleY - this.ballR;
        const hit = (b.x - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2);
        b.vx += hit * 2;
        playSound('jump');
      }

      // Bricks
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (
          b.x + this.ballR > br.x &&
          b.x - this.ballR < br.x + br.w &&
          b.y + this.ballR > br.y &&
          b.y - this.ballR < br.y + br.h
        ) {
          br.alive = false;
          b.vy *= -1;
          this.bricksCleared++;
          G.carryover.bricksCleared = this.bricksCleared;
          G.score += 50;
          if (G.cycle >= 5) boss.damage(5);
          playSound('collect');
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
          }
          spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 8);
          
          // Small chance for a new ball on brick break in high cycles
          if (G.cycle >= 4 && Math.random() < 0.05) this.spawnBall();

          if (this.bricksCleared >= this.bricksNeeded) {
            G.triggerMorph('objective');
            return;
          }
        }
      }

      // Death check for this ball
      if (b.y > G.H() + 50) {
        this.balls.splice(i, 1);
      }
    }

    if (this.balls.length === 0) {
      G.triggerMorph('death');
    }
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[2];

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      c.fillStyle = b.color;
      c.globalAlpha = 0.9;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.globalAlpha = 1;
    }

    // Paddle
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 15;
    c.fillRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH);
    c.shadowBlur = 0;

    // Balls
    c.fillStyle = '#fff';
    for (const b of this.balls) {
      c.beginPath();
      c.arc(b.x, b.y, this.ballR, 0, Math.PI * 2);
      c.fill();
    }

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('БЛОКИ: ' + this.bricksCleared + ' / ' + this.bricksNeeded, G.W() / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    const b = this.balls[0] || { x: G.W()/2, y: G.H()/2 };
    return {
      mode: 2,
      px: b.x,
      py: b.y,
      paddleX: this.paddleX,
      paddleY: this.paddleY,
      paddleW: this.paddleW,
      paddleH: this.paddleH
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[2];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(snap.px, snap.py, 7 + uMorph * 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 25 : 10;
    c.fillRect(snap.paddleX, snap.paddleY, snap.paddleW, snap.paddleH);
    c.shadowBlur = 0;
    c.restore();
  }
};
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const shooter = {
  x: 0, y: 0, w: 28, h: 28,
  bullets: [],
  enemies: [],
  kills: 0,
  killsNeeded: 8,
  spawnTimer: 0,
  width: 0, height: 0,
  shotTimer: 0,
  vy: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.x = this.width / 2;
    this.y = this.height - 100;
    this.bullets = [];
    this.enemies = [];
    this.kills = 0;
    const bonus = G.carryover.bricksCleared || 0;
    this.killsNeeded = Math.max(4, 8 - Math.floor(bonus / 3));
    this.spawnTimer = 0;
    this.shotTimer = 0;
    this.vy = 0;
  },

  update() {
    const mod = G.currentMod;
    let spd = 5;
    if (mod.name === 'УСКОРЕНИЕ') spd = 6.5;

    // Move
    const speed = 6 * G.dt;
    let isMovingMobile = false;

    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.x -= speed;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) this.x += speed;

    if (G.touchDir !== 0) {
      this.x += G.touchDir * speed;
      isMovingMobile = true;
    }

    if (this.x < 15) this.x = 15;
    if (this.x > this.width - 15) this.x = this.width - 15;

    if (this.shotTimer > 0) this.shotTimer -= G.dt;
    if (this.shotTimer <= 0 && (G.keys['ArrowUp'] || G.keys['Space'] || isMovingMobile)) {
      this.bullets.push({ x: this.x + this.w / 2, y: this.y, vy: -10 });
      this.shotTimer = 10;
      playSound('shoot');
    }

    addTrail(this.x + this.w / 2, this.y + this.h / 2, COLORS[3]);

    for (const b of this.bullets) {
      b.y += b.vy * G.dt;
    }this.bullets = this.bullets.filter(b => b.y > -20);

    // Spawn enemies
    if (Math.random() < 0.02 + G.cycle * 0.003) {
      const isHunter = G.cycle >= 3 && Math.random() < 0.3;
      this.enemies.push({
        x: Math.random() * (this.width - 30) + 15,
        y: -20,
        vy: 1.5 + Math.random() * 1.5 + G.cycle * 0.2,
        r: isHunter ? 10 : 14,
        hp: 1,
        type: isHunter ? 'hunter' : 'asteroid'
      });
    }

    // Enemies
    for (const e of this.enemies) {
      e.y += e.vy * G.dt;
      
      if (e.type === 'hunter') {
        const dx = this.x - e.x;
        e.x += Math.sign(dx) * 1.5 * G.dt;
      }
      // Hit player
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < e.r + 10) {
        spawnParticles(this.x, this.y, COLORS[3], 20);
        G.triggerMorph('death');
        return;
      }
    }
    this.enemies = this.enemies.filter(e => e.y < this.height + 30);

    // Bullet-enemy collisions
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (Math.sqrt(dx * dx + dy * dy) < e.r + 4) {
          e.hp = 0;
          b.y = -100; // kill bullet
          this.kills++;
          G.carryover.shooterKills = this.kills;
          G.score += 75;
          if (G.cycle >= 5) boss.damage(5);
          spawnParticles(e.x, e.y, COLORS[3], 12);
          if (this.kills >= this.killsNeeded) {
            G.triggerMorph('objective');
            return;
          }
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[3];

    // Enemies
    for (const e of this.enemies) {
      if (e.type === 'hunter') {
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.moveTo(e.x, e.y + e.r);
        c.lineTo(e.x - e.r, e.y - e.r);
        c.lineTo(e.x + e.r, e.y - e.r);
        c.fill();
      } else {
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath();
        c.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Bullets
    c.fillStyle = '#fff';
    for (const b of this.bullets) {
      c.fillRect(b.x - 2, b.y - 5, 4, 10);
    }

    // Player ship
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 20;
    c.beginPath();
    c.moveTo(this.x, this.y - 16);
    c.lineTo(this.x - 12, this.y + 12);
    c.lineTo(this.x, this.y + 6);
    c.lineTo(this.x + 12, this.y + 12);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    // Thruster
    c.fillStyle = 'rgba(255,150,50,0.6)';
    c.beginPath();
    c.moveTo(this.x - 4, this.y + 10);
    c.lineTo(this.x, this.y + 18 + Math.random() * 8);
    c.lineTo(this.x + 4, this.y + 10);
    c.fill();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('УНИЧТОЖЕНО: ' + this.kills + ' / ' + this.killsNeeded, G.W() / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 3,
      px: this.x,
      py: this.y,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[3];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 35 : 15;
    const s = 1 - uMorph * 0.3;
    c.beginPath();
    c.moveTo(snap.px, snap.py - 16 * s);
    c.lineTo(snap.px - 12 * s, snap.py + 12 * s);
    c.lineTo(snap.px, snap.py + 6 * s);
    c.lineTo(snap.px + 12 * s, snap.py + 12 * s);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath();
      c.ellipse(snap.px - 18, snap.py - 2, 14, 6, -0.3, 0, Math.PI * 2);
      c.ellipse(snap.px + 18, snap.py - 2, 14, 6, 0.3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const flappy = {
  x: 0, y: 0, vy: 0,
  w: 20, h: 20,
  pipes: [],
  pipeTimer: 0,
  distance: 0,
  distanceNeeded: 20,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.x = this.width * 0.25;
    this.y = this.height / 2;
    this.vy = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.distance = 0;
    // Lowered distance needed
    this.distanceNeeded = 10;
    this.jumpConsumed = false;
    G.carryover.flappyHeight = 0;
  },

  update() {
    const mod = G.currentMod;
    let g = 0.4 * G.dt;
    let jump = -7;
    if (mod.name === 'ЛЕГКОСТЬ') { g = 0.25 * G.dt; jump = -6; }
    
    this.vy += g;
    this.y += this.vy * G.dt;

    if (G.keys['Space'] || G.keys['ArrowUp'] || G.touchJump) {
      if (!this.jumpConsumed) {
        this.vy = jump;
        this.jumpConsumed = true;
        playSound('jump');
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
    } else {
      this.jumpConsumed = false;
    }
    addTrail(this.x, this.y, COLORS[4]);

    // Bounds
    if (this.y < 0 || this.y > this.height) {
      spawnParticles(this.x, this.y < 0 ? 0 : this.height, COLORS[4], 14);
      G.triggerMorph('death');
      return;
    }

    // Pipes
    this.pipeTimer += G.dt;
    const spawnRate = mod.name === 'УСКОРЕНИЕ' ? 60 : 90;
    if (this.pipeTimer > spawnRate) {
      this.pipeTimer = 0;
      const gap = 170 + Math.random() * 30; // Very generous gap
      const topH = 50 + Math.random() * (this.height - gap - 100);
      this.pipes.push({
        x: this.width,
        topH: topH,
        gap: gap,
        passed: false
      });
    }

    const scroll = (3 + G.cycle * 0.1) * G.dt; // Very slow speed growth
    for (const p of this.pipes) {
      p.x -= scroll;
      if (!p.passed && p.x + 50 < this.x) {
        p.passed = true;
        this.distance++;
        G.score += 50;
        if (G.cycle >= 5) boss.damage(5);
        G.carryover.flappyHeight = this.distance * 10;
        if (this.distance >= this.distanceNeeded) {
          G.triggerMorph('objective');
          return;
        }
      }
      // Collision
      if (p.x < this.x + 8 && p.x + 50 > this.x - 8) {
        if (this.y - 8 < p.topH || this.y + 8 > p.topH + p.gap) {
          spawnParticles(this.x, this.y, COLORS[4], 16);
          G.triggerMorph('death');
          return;
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -60);
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[4];

    // Pipes
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (const p of this.pipes) {
      c.fillRect(p.x, 0, 50, p.topH);
      c.fillRect(p.x, p.topH + p.gap, 50, this.height - p.topH - p.gap);
    }

    // Soul / Bird
    c.save();
    c.translate(this.x, this.y);
    const rot = Math.atan2(this.vy, 8) * 0.5;
    c.rotate(rot);

    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 25;
    c.beginPath();
    c.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Eyes
    c.fillStyle = '#fff';
    c.fillRect(4, -4, 3, 3);

    // Wings (ethereal)
    const wingFlap = Math.sin(Date.now() * 0.008) * 6;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(-6, -2 + wingFlap, 14, 5, -0.4, 0, Math.PI * 2);
    c.ellipse(6, -2 - wingFlap, 14, 5, 0.4, 0, Math.PI * 2);
    c.fill();

    if (G.evolutionFeatures.includes('aura')) {
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 28 + Math.sin(Date.now() * 0.003) * 4, 0, Math.PI * 2);
      c.stroke();
    }

    c.restore();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('ПРОЛЁТ: ' + this.distance + ' / ' + this.distanceNeeded, this.width / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 4,
      px: this.x,
      py: this.y,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[4];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 40 : 20;
    const s = (snap.w || 20) * (0.9 + uMorph * 0.1);
    c.beginPath();
    c.ellipse(snap.px, snap.py, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(snap.px + 3, snap.py - 4, 3, 3);
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath();
      c.ellipse(snap.px - 14, snap.py - 2, 18, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(snap.px + 14, snap.py - 2, 18, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const boss = {
  hp: 100,
  maxHp: 100,
  timer: 0,
  nextMorph: 20 * 60, // 20s at 60fps
  phase: 0,
  width: 0, height: 0,
  
  init() {
    this.width = G.W();
    this.height = G.H();
    this.hp = 100 + G.cycle * 20;
    this.maxHp = this.hp;
    this.timer = 0;
    this.phase = 0;
    this.hazards = []; // Initialize hazards
  },

  update() {
    this.timer++;
    
    // Forced morph every 20s
    if (this.timer >= this.nextMorph) {
      this.timer = 0;
      G.triggerMorph('boss_shift');
    }

    // Boss "Attacks" based on current mode
    const mode = G.gameMode;
    
    if (mode === 0) { // Jumper - Boss drops heavy rain
      if (Math.random() < 0.05) this.spawnBossHazard();
    } else if (mode === 3) { // Shooter - Boss shoots back
      if (Math.random() < 0.03) this.spawnBossProjectile();
    }

    // Update hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.vx) h.x += h.vx * G.dt;
      h.y += h.vy * G.dt;

      // Simple collision check with player
      let px = 0, py = 0, pr = 15;
      const m = G.getModeObject();
      if (m) {
        if (m.x !== undefined) px = m.x;
        else if (m.paddleX !== undefined) px = m.paddleX + (m.paddleW || 0) / 2;
        else if (m.body && m.body[0]) px = m.body[0].x * (m.cellSize || 20);

        if (m.y !== undefined) py = m.y;
        else if (m.paddleY !== undefined) py = m.paddleY;
        else if (m.body && m.body[0]) py = m.body[0].y * (m.cellSize || 20);
      }

      const dist = Math.hypot(px - h.x, py - h.y);
      if (dist < h.r + pr) {
        G.triggerMorph('death');
      }

      if (h.y > G.H() + 50 || h.x < -50 || h.x > G.W() + 50) {
        this.hazards.splice(i, 1);
      }
    }
  },

  damage(amt) {
    this.hp -= amt;
    if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    if (this.hp <= 0) {
      this.hp = 0;
      if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      G.showVictory();
    }
  },

  draw() {
    const c = G.ctx;
    const w = this.width;
    const h = this.height;
    
    // Hazards
    c.fillStyle = '#ef4444';
    for (const haz of this.hazards) {
      c.beginPath();
      c.arc(haz.x, haz.y, haz.r, 0, Math.PI * 2);
      c.fill();
    }

    // Boss Silhouette (Shadow Reflection)
    c.save();
    c.globalAlpha = 0.15;
    c.fillStyle = '#fff';
    c.shadowColor = COLORS[G.gameMode];
    c.shadowBlur = 40;
    
    const time = performance.now() * 0.002;
    const ox = Math.sin(time) * 20;
    const oy = Math.cos(time * 0.5) * 10;
    
    c.translate(w / 2 + ox, h / 3 + oy);
    const scale = 8 + Math.sin(time * 0.5) * 0.5;
    c.scale(scale, scale);
    
    // Simplified Boss Shape (Abstract)
    c.beginPath();
    c.arc(0, 0, 20, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Boss Health Bar
    const barW = 200;
    const barH = 4;
    const bx = (w - barW) / 2;
    const by = 40;
    
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(bx, by, barW, barH);
    
    const fillW = (this.hp / this.maxHp) * barW;
    c.fillStyle = '#fff';
    c.fillRect(bx, by, fillW, barH);
  },

  hazards: [],
  spawnBossHazard() {
    this.hazards.push({
      x: Math.random() * G.W(),
      y: -20,
      vy: 4 + Math.random() * 4,
      r: 8
    });
  },
  
  spawnBossProjectile() {
    this.hazards.push({
      x: G.W() / 2,
      y: 100,
      vx: (Math.random() - 0.5) * 6,
      vy: 4,
      r: 5
    });
  }
};

import { G, pickMorphStyle, advanceStageAfterMorph } from './gameState.js';
import { COLORS } from './constants.js';
import { spawnParticles, spawnSoulParticles } from './fx.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';

function easeMorphT(raw, style) {
  if (style === 'flash') return raw < 0.42 ? 0 : 1;
  if (style === 'creep') return Math.pow(Math.min(1, Math.max(0, raw)), 0.38);
  const t = Math.min(1, Math.max(0, raw));
  return t * t * (3 - 2 * t);
}

const GAMES = [jumper, snake, arkanoid, shooter, flappy];

function captureMorphSnapshot(mode) {
  if (GAMES[mode] && GAMES[mode].getSnapshot) {
    return GAMES[mode].getSnapshot();
  }
  return { mode: 0, px: G.W() / 2, py: G.H() / 2, w: 36, h: 36 };
}

function drawMorphShapeAt(snap, alpha, uMorph) {
  if (alpha <= 0.01) return;
  if (GAMES[snap.mode] && GAMES[snap.mode].drawSnapshot) {
    GAMES[snap.mode].drawSnapshot(snap, alpha, uMorph);
  }
}

const MORPH_LORE = {
  '0->1': { title: 'РАССЕЧЕНИЕ МОНАДЫ', sub: 'Кристаллы становятся позвонками', transfer: 'КРИСТАЛЛЫ → ДЛИНА' },
  '1->2': { title: 'СВЁРТЫВАНИЕ В ЩИТ', sub: 'Тело змеи — теперь броня', transfer: 'ЕДА → ПЛАТФОРМА' },
  '2->3': { title: 'ОБРАТИМОСТЬ', sub: 'Разбитые блоки становятся импульсом', transfer: 'БЛОКИ → ОРУЖИЕ' },
  '3->4': { title: 'ВОЗВРАЩЕНИЕ ВЕСА', sub: 'Космолёт оставляет оболочку', transfer: 'ОСКОЛКИ → СВЕТ' },
  '4->0': { title: 'СИНГУЛЯРНОСТЬ', sub: 'Конец — это начало, помнящее', transfer: 'ДУША → ТОЧКА' }
};

function getLore(from, to) {
  return MORPH_LORE[`${from}->${to}`] || { title: 'МЕТАМОРФОЗА', sub: 'Форма умирает, форма рождается', transfer: '' };
}

function drawWarpGrid(c, uRaw) {
  c.save();
  c.globalCompositeOperation = 'overlay';
  const col = COLORS[G.morphTo];
  c.strokeStyle = col + '44';
  c.lineWidth = 1;
  const gridS = 50;
  for (let x = 0; x < G.W(); x += gridS) {
    c.beginPath();
    const off = Math.sin(uRaw * Math.PI + x * 0.01) * 40 * Math.sin(uRaw * Math.PI);
    c.moveTo(x + off, 0);
    c.lineTo(x - off, G.H());
    c.stroke();
  }
  for (let y = 0; y < G.H(); y += gridS) {
    c.beginPath();
    const off = Math.cos(uRaw * Math.PI + y * 0.01) * 40 * Math.sin(uRaw * Math.PI);
    c.moveTo(0, y + off);
    c.lineTo(G.W(), y - off);
    c.stroke();
  }
  c.restore();
}

function drawSingularity(c, x, y, uRaw, color) {
  const t = Math.sin(uRaw * Math.PI);
  c.save();
  c.globalCompositeOperation = 'screen';
  c.fillStyle = color + '22';
  c.beginPath();
  c.arc(x, y, 20 + t * 80, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = color + '66';
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const r = 15 + t * 60 + i * 20;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}

function drawMorphTransition(uRaw) {
  const c = G.ctx;
  const u = easeMorphT(uRaw, G.morphStyle);
  const snapFrom = G.morphSnapshotFrom || { mode: 0, px: G.W()/2, py: G.H()/2 };
  const snapTo = G.morphSnapshotTo || { mode: 0, px: G.W()/2, py: G.H()/2 };

  const aFrom = (1 - u) * 0.9;
  const aTo = u * 0.9;
  const ax = snapFrom.px + (snapTo.px - snapFrom.px) * u;
  const ay = snapFrom.py + (snapTo.py - snapFrom.py) * u;

  // Environment warping
  drawWarpGrid(c, uRaw);

  // Singularity glow at center of morph
  if (uRaw > 0.2 && uRaw < 0.8) {
    drawSingularity(c, ax, ay, uRaw, COLORS[G.morphTo]);
  }

  // ==================== METAMORPHOSIS FORMS ====================

  if (G.morphFrom === 0 && G.morphTo === 1) {
    // JUMPER -> SNAKE: Monad Cleaving
    const segments = snapTo.segs || [];
    const segCount = Math.max(5, segments.length || 5);
    c.save();
    c.shadowBlur = 20;
    c.shadowColor = COLORS[1];

    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const delay = (1 - t) * 0.55;
      const localU = Math.max(0, Math.min(1, (u - delay) / 0.45));

      const targetX = segments[i]?.x ?? (snapFrom.px + (i - segCount/2) * 18);
      const targetY = segments[i]?.y ?? snapFrom.py;
      const curX = snapFrom.px + (targetX - snapFrom.px) * localU;
      const curY = snapFrom.py + (targetY - snapFrom.py) * localU;
      const size = (snapFrom.w || 30) * (1 - localU * 0.35);

      c.fillStyle = i === segCount - 1 ? '#fff' : COLORS[1];
      c.globalAlpha = 0.25 + localU * 0.75;
      c.fillRect(curX - size/2, curY - size/2, size, size);

      // Crystal echoes (the "seeds" of vertebrae)
      if (localU > 0.3 && localU < 0.9) {
        c.globalAlpha = (0.9 - localU) * 0.5;
        c.fillStyle = '#e9d5ff';
        c.fillRect(curX - 2, curY - 2, 4, 4);
      }
    }
    c.restore();

    // DNA spiral trace
    if (uRaw > 0.4 && uRaw < 0.9) {
      c.save();
      c.strokeStyle = COLORS[1] + '44';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < segCount; i++) {
        const s = segments[i];
        if (!s) continue;
        const wave = Math.sin(i * 0.6 + uRaw * 4) * 8 * (1 - uRaw);
        if (i === 0) c.moveTo(s.x, s.y + wave);
        else c.lineTo(s.x, s.y + wave);
      }
      c.stroke();
      c.restore();
    }

  } else if (G.morphFrom === 1 && G.morphTo === 2) {
    // SNAKE -> ARKANOID: Coiling into Shield
    const segs = snapFrom.segs || [];
    const paddleW = snapTo.paddleW || 100;
    const paddleH = snapTo.paddleH || 15;
    const paddleX = snapTo.paddleX || G.W()/2;
    const paddleY = snapTo.paddleY || G.H()-80;

    c.save();
    segs.forEach((s, i) => {
      const t = i / (segs.length - 1 || 1);
      const delay = t * 0.3;
      const localU = Math.max(0, Math.min(1, (u - delay) / 0.7));

      if (i === segs.length - 1) {
        // Head becomes the ball
        const ballX = s.x + (snapTo.px - s.x) * localU;
        const ballY = s.y + (snapTo.py - s.y) * localU;
        c.fillStyle = '#fff';
        c.shadowColor = '#fff';
        c.shadowBlur = 12 + localU * 8;
        c.beginPath();
        c.arc(ballX, ballY, 6 + localU * 3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      } else {
        // Body segments melt into paddle
        const targetX = paddleX + t * paddleW;
        const targetY = paddleY + paddleH / 2;
        const curX = s.x + (targetX - s.x) * localU;
        const curY = s.y + (targetY - s.y) * localU;
        const meltSize = (1 - localU) * 14;

        c.globalAlpha = (1 - localU * 0.6) * 0.8;
        c.fillStyle = localU > 0.5 ? COLORS[2] : COLORS[1];
        c.fillRect(curX - meltSize/2, curY - 4, meltSize, 8);
      }
    });

    // Solid paddle emerges
    c.globalAlpha = Math.max(0, (u - 0.5) * 2);
    c.fillStyle = COLORS[2];
    c.shadowColor = COLORS[2];
    c.shadowBlur = 20;
    c.fillRect(paddleX, paddleY, paddleW, paddleH);
    c.shadowBlur = 0;
    c.restore();

  } else if (G.morphFrom === 2 && G.morphTo === 3) {
    // ARKANOID -> SHOOTER: Reversibility
    const paddleW = snapFrom.paddleW || 100;
    const paddleX = snapFrom.paddleX || G.W()/2;
    const paddleY = snapFrom.paddleY || G.H()-80;
    const ballX = snapFrom.px || G.W()/2;
    const ballY = snapFrom.py || G.H()/2;

    c.save();
    const meltU = Math.min(1, u * 1.5);

    // Paddle melts downward into ship body
    c.fillStyle = COLORS[2];
    c.globalAlpha = (1 - meltU) * 0.8;
    c.shadowColor = COLORS[2];
    c.shadowBlur = 15;
    const meltW = paddleW * (1 - meltU * 0.5);
    const meltX = paddleX + meltU * (snapTo.px - paddleX - paddleW/2);
    const meltY = paddleY + meltU * (snapTo.py - paddleY);
    c.fillRect(meltX, meltY, meltW, 14 * (1 - meltU * 0.5));
    c.shadowBlur = 0;

    // Ball absorbs into ship nose
    const orbX = ballX + (snapTo.px - ballX) * meltU;
    const orbY = ballY + (snapTo.py - 20 - ballY) * meltU;
    c.fillStyle = '#fff';
    c.globalAlpha = 1 - meltU * 0.5;
    c.beginPath();
    c.arc(orbX, orbY, 7 * (1 - meltU * 0.4), 0, Math.PI * 2);
    c.fill();

    // Ship emerges from the molten paddle
    if (u > 0.4) {
      const shipU = (u - 0.4) / 0.6;
      c.globalAlpha = shipU;
      c.fillStyle = COLORS[3];
      c.shadowColor = COLORS[3];
      c.shadowBlur = 25;
      const sx = snapTo.px;
      const sy = snapTo.py;
      const s = shipU;
      c.beginPath();
      c.moveTo(sx, sy - 16 * s);
      c.lineTo(sx - 12 * s, sy + 12 * s);
      c.lineTo(sx, sy + 6 * s);
      c.lineTo(sx + 12 * s, sy + 12 * s);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;

      // Thruster ignition
      c.fillStyle = `rgba(255,150,50,${shipU * 0.6})`;
      c.beginPath();
      c.moveTo(sx - 3 * s, sy + 10 * s);
      c.lineTo(sx, sy + (18 + Math.random() * 10) * s);
      c.lineTo(sx + 3 * s, sy + 10 * s);
      c.fill();
    }
    c.restore();

  } else if (G.morphFrom === 3 && G.morphTo === 4) {
    // SHOOTER -> FLAPPY: Return of Weight
    const sx = snapFrom.px || G.W()/2;
    const sy = snapFrom.py || G.H()-100;

    c.save();
    const fracture = Math.min(1, u * 2);
    const dissolve = Math.max(0, (u - 0.3) / 0.7);

    // Ship hull cracks and fades
    c.globalAlpha = (1 - dissolve) * 0.9;
    c.fillStyle = COLORS[3];
    c.shadowColor = COLORS[3];
    c.shadowBlur = 20 * (1 - dissolve);
    const shakeX = (Math.random() - 0.5) * 4 * fracture;
    const shakeY = (Math.random() - 0.5) * 4 * fracture;
    c.beginPath();
    c.moveTo(sx + shakeX, sy + shakeY - 16);
    c.lineTo(sx + shakeX - 12, sy + shakeY + 12);
    c.lineTo(sx + shakeX, sy + shakeY + 6);
    c.lineTo(sx + shakeX + 12, sy + shakeY + 12);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    // Guns detach and fall
    if (u > 0.15) {
      const fallU = (u - 0.15) / 0.85;
      c.globalAlpha = (1 - fallU) * 0.7;
      c.fillStyle = '#888';
      c.fillRect(sx - 18, sy + fallU * 60, 6, 10);
      c.fillRect(sx + 12, sy + fallU * 60, 6, 10);
    }

    // Soul emerges from within
    if (u > 0.35) {
      const soulU = (u - 0.35) / 0.65;
      const soulX = sx + (snapTo.px - sx) * soulU;
      const soulY = sy + (snapTo.py - sy) * soulU;
      c.globalAlpha = soulU;
      c.fillStyle = COLORS[4];
      c.shadowColor = COLORS[4];
      c.shadowBlur = 30 + soulU * 20;
      c.beginPath();
      c.ellipse(soulX, soulY, 12 * soulU, 8 * soulU, 0, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;

      // Wings unfold
      c.fillStyle = `rgba(255,255,255,${soulU * 0.4})`;
      const wingSpan = soulU * 22;
      c.beginPath();
      c.ellipse(soulX - 14, soulY - 2, wingSpan, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(soulX + 14, soulY - 2, wingSpan, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

  } else if (G.morphFrom === 4 && G.morphTo === 0) {
    // FLAPPY -> JUMPER: Singularity
    const soulX = snapFrom.px || G.W()/2;
    const soulY = snapFrom.py || G.H()/2;

    c.save();

    // Soul contracts into white point
    const collapse = Math.min(1, u * 1.2);
    c.globalAlpha = 1 - collapse * 0.5;
    c.fillStyle = COLORS[4];
    c.shadowColor = COLORS[4];
    c.shadowBlur = 40 * (1 - collapse);
    const shrink = 1 - collapse * 0.85;
    c.beginPath();
    c.ellipse(soulX, soulY, 14 * shrink, 10 * shrink, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Wings fold into the body
    if (u < 0.6) {
      const wingU = 1 - u / 0.6;
      c.fillStyle = `rgba(255,255,255,${wingU * 0.35})`;
      c.beginPath();
      c.ellipse(soulX - 14 * wingU, soulY, 20 * wingU, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(soulX + 14 * wingU, soulY, 20 * wingU, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }

    // Big Bang / Big Crunch flash
    if (u > 0.5) {
      const bangU = (u - 0.5) / 0.5;
      c.globalCompositeOperation = 'screen';
      c.fillStyle = `rgba(255,255,255,${bangU * 0.3 * (1 - bangU)})`;
      c.beginPath();
      c.arc(soulX, soulY, bangU * 120, 0, Math.PI * 2);
      c.fill();
      c.globalCompositeOperation = 'source-over';
    }

    // Cube re-materializes from the white point
    if (u > 0.55) {
      const cubeU = (u - 0.55) / 0.45;
      const targetX = snapTo.px;
      const targetY = snapTo.py;
      const curX = soulX + (targetX - soulX) * cubeU;
      const curY = soulY + (targetY - soulY) * cubeU;
      const size = 4 + 26 * cubeU;

      c.globalAlpha = cubeU;
      c.fillStyle = COLORS[0];
      c.shadowColor = COLORS[0];
      c.shadowBlur = 25 * cubeU;
      c.fillRect(curX - size/2, curY - size/2, size, size);
      c.shadowBlur = 0;

      // Eyes open
      if (cubeU > 0.5) {
        c.fillStyle = '#fff';
        const eyeU = (cubeU - 0.5) / 0.5;
        c.fillRect(curX - 7 * eyeU, curY - 7 * eyeU, 4 * eyeU, 4 * eyeU);
        c.fillRect(curX + 3 * eyeU, curY - 7 * eyeU, 4 * eyeU, 4 * eyeU);
      }
    }
    c.restore();

  } else {
    // Fallback: Alpha Blend
    drawMorphShapeAt(snapFrom, aFrom, uRaw);
    drawMorphShapeAt(snapTo, aTo, uRaw);
  }

  // ==================== UNIVERSAL EFFECTS ====================

  // Soul particles during the heart of morph
  if (uRaw > 0.25 && uRaw < 0.75) {
    const intensity = Math.sin((uRaw - 0.25) / 0.5 * Math.PI);
    c.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) {
      const r = Math.random() * 70 * (1 - uRaw * 0.5);
      const ang = Math.random() * Math.PI * 2;
      const px = ax + Math.cos(ang) * r;
      const py = ay + Math.sin(ang) * r;
      const sz = 1 + intensity * 2;
      c.globalAlpha = intensity * (0.4 + Math.random() * 0.6);
      c.fillRect(px, py, sz, sz);
    }
    c.globalAlpha = 1;
  }

  // Orbital memory fragments (past forms ghosting)
  if (uRaw > 0.3 && uRaw < 0.7) {
    c.save();
    c.globalAlpha = Math.sin((uRaw - 0.3) / 0.4 * Math.PI) * 0.15;
    c.strokeStyle = COLORS[G.morphFrom] + '66';
    c.lineWidth = 1;
    const orbitR = 60 + Math.sin(uRaw * 8) * 15;
    c.beginPath();
    c.arc(ax, ay, orbitR, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // ==================== LORE TEXT ====================
  const lore = getLore(G.morphFrom, G.morphTo);

  // Title — dramatic arc
  if (uRaw > 0.15 && uRaw < 0.85) {
    c.save();
    const textFade = Math.sin((uRaw - 0.15) / 0.7 * Math.PI);
    c.globalAlpha = textFade;
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = 'bold 18px Courier New';
    c.letterSpacing = '4px';
    c.fillText(lore.title, G.W()/2, G.H()/2 - 80);
    c.font = '12px Courier New';
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillText(lore.sub, G.W()/2, G.H()/2 - 58);
    c.restore();
  }

  // Transfer tag — mechanical, brief
  if (uRaw > 0.3 && uRaw < 0.7) {
    c.save();
    const tagFade = Math.sin((uRaw - 0.3) / 0.4 * Math.PI);
    c.globalAlpha = tagFade * 0.9;
    c.fillStyle = COLORS[G.morphTo];
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText(lore.transfer, G.W()/2, G.H()/2 - 140);
    c.restore();
  }

  // Cycle indicator pulse on final morphs
  if (G.cycle >= 1 && uRaw > 0.4 && uRaw < 0.6) {
    c.save();
    c.globalAlpha = 0.08;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, G.W(), G.H());
    c.restore();
  }
}

function triggerMorph(reason) {
  if (G.morphing) return;
  
  // Cooldown check (8 seconds), but ignore for death
  const now = performance.now();
  if (reason !== 'death' && G.lastMorphRealTime && (now - G.lastMorphRealTime < 8000)) {
    return;
  }

  G.morphing = true;
  G.morphFrom = G.gameMode;
  G.runMorphCount++;
  if (reason === 'death') {
    G.runDeathCount++;
    if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  // Morph Sound
  import('./audio.js').then(m => m.playSound('morph'));

  G.lastMorphReason = reason;
  G.lastMorphRealTime = performance.now();
  const pick = pickMorphStyle(reason);
  G.morphStyle = pick.style;
  G.morphDuration = pick.ms;
  G.morphSnapshotFrom = captureMorphSnapshot(G.gameMode);
  advanceStageAfterMorph();
  initCurrentGame();
  G.morphTo = G.gameMode;
  G.morphSnapshotTo = captureMorphSnapshot(G.gameMode);
  G.morphStartReal = performance.now();
  G.morphT = 0;
}

function initCurrentGame() {
  G.particles = [];
  if (GAMES[G.gameMode] && GAMES[G.gameMode].init) {
    GAMES[G.gameMode].init();
  }
  const labelEl = document.getElementById('gameLabel');
  if (labelEl) labelEl.textContent = G.MODES[G.gameMode];
}

G.triggerMorph = triggerMorph;

export { initCurrentGame, triggerMorph, drawMorphTransition };
import { G } from './gameState.js';

export function bindInput(canvas) {
  if (!G || !canvas) {
    console.error("Input binding failed: G or canvas missing");
    return;
  }

  // Key handlers
  window.addEventListener('keydown', e => { 
    let code = e.code;
    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      if (code === 'ArrowLeft') code = 'ArrowRight';
      else if (code === 'ArrowRight') code = 'ArrowLeft';
      else if (code === 'ArrowUp') code = 'ArrowDown';
      else if (code === 'ArrowDown') code = 'ArrowUp';
      else if (code === 'KeyA') code = 'KeyD';
      else if (code === 'KeyD') code = 'KeyA';
      else if (code === 'KeyW') code = 'KeyS';
      else if (code === 'KeyS') code = 'KeyW';
    }
    G.keys[code] = true; 
  });
  window.addEventListener('keyup', e => { 
    let code = e.code;
    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      if (code === 'ArrowLeft') code = 'ArrowRight';
      else if (code === 'ArrowRight') code = 'ArrowLeft';
      else if (code === 'ArrowUp') code = 'ArrowDown';
      else if (code === 'ArrowDown') code = 'ArrowUp';
      else if (code === 'KeyA') code = 'KeyD';
      else if (code === 'KeyD') code = 'KeyA';
      else if (code === 'KeyW') code = 'KeyS';
      else if (code === 'KeyS') code = 'KeyW';
    }
    G.keys[code] = false; 
  });

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchX = 0;

  const handleStart = (e) => {
    if (G.paused || !G.running) return;
    const t = e.touches ? e.touches[0] : e;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastTouchX = t.clientX;
    
    // Tap to jump for Jumper (0) or Flappy (4)
    if (G.gameMode === 0 || G.gameMode === 4) {
      G.touchJump = true;
    }
  };

  const handleEnd = () => {
    G.touchJump = false;
    G.touchDir = 0;
    if (G.gameMode === 2 || G.gameMode === 3) {
      G.keys['ArrowLeft'] = false;
      G.keys['ArrowRight'] = false;
    }
  };

  canvas.addEventListener('touchstart', handleStart, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (G.paused || !G.running) return;
    e.preventDefault();
    const t = e.touches[0];
    let dx = t.clientX - touchStartX;
    let dy = t.clientY - touchStartY;
    let moveX = t.clientX - lastTouchX;

    if (G.currentMod.name === 'ИНВЕРСИЯ') {
      dx = -dx;
      dy = -dy;
      moveX = -moveX;
    }
    
    // Swipe for Snake (1) or Jumper (0)
    if (G.gameMode === 0 || G.gameMode === 1) {
      const threshold = 20;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) { G.keys['ArrowRight'] = true; G.keys['ArrowLeft'] = false; } 
          else { G.keys['ArrowLeft'] = true; G.keys['ArrowRight'] = false; }
          if (G.gameMode === 1) { G.keys['ArrowUp'] = false; G.keys['ArrowDown'] = false; }
        } else if (G.gameMode === 1) {
          if (dy > 0) { G.keys['ArrowDown'] = true; G.keys['ArrowUp'] = false; } 
          else { G.keys['ArrowUp'] = true; G.keys['ArrowDown'] = false; }
          G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false;
        }
        if (G.gameMode === 1) {
          touchStartX = t.clientX;
          touchStartY = t.clientY;
        }
      }
    }

    if (G.gameMode === 2 || G.gameMode === 3) {
      if (moveX > 2) G.touchDir = 1;
      else if (moveX < -2) G.touchDir = -1;
      else G.touchDir = 0;
      lastTouchX = t.clientX;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', handleEnd);
  
  // Desktop fallbacks
  window.addEventListener('mousedown', handleStart);
  window.addEventListener('mouseup', handleEnd);

  // D-pad button support
  function setupBtn(id, code) {
    const el = document.getElementById(id);
    if (!el) return;
    
    let actualCode = code;
    
    el.addEventListener('touchstart', (e) => { 
      e.preventDefault(); 
      if (G.currentMod.name === 'ИНВЕРСИЯ') {
        if (code === 'ArrowLeft') actualCode = 'ArrowRight';
        else if (code === 'ArrowRight') actualCode = 'ArrowLeft';
        else if (code === 'ArrowUp') actualCode = 'ArrowDown';
        else if (code === 'ArrowDown') actualCode = 'ArrowUp';
      } else {
        actualCode = code;
      }
      G.keys[actualCode] = true; 
      if(actualCode==='ArrowUp') G.touchJump=true; 
    }, { passive: false });

    el.addEventListener('touchend', (e) => { 
      e.preventDefault(); 
      G.keys[actualCode] = false; 
      G.touchJump=false; 
    }, { passive: false });

    el.addEventListener('mousedown', () => { 
      if (G.currentMod.name === 'ИНВЕРСИЯ') {
        if (code === 'ArrowLeft') actualCode = 'ArrowRight';
        else if (code === 'ArrowRight') actualCode = 'ArrowLeft';
        else if (code === 'ArrowUp') actualCode = 'ArrowDown';
        else if (code === 'ArrowDown') actualCode = 'ArrowUp';
      } else {
        actualCode = code;
      }
      G.keys[actualCode] = true; 
      if(actualCode==='ArrowUp') G.touchJump=true; 
    });
    el.addEventListener('mouseup', () => { 
      G.keys[actualCode] = false; 
      G.touchJump=false; 
    });
  }
  setupBtn('btnUp', 'ArrowUp');
  setupBtn('btnDown', 'ArrowDown');
  setupBtn('btnLeft', 'ArrowLeft');
  setupBtn('btnRight', 'ArrowRight');
  setupBtn('fireBtn', 'Space');
}
import { G, resetCarryover, syncGameModeFromStage } from './gameState.js';
import { bindInput } from './input.js';
import { initStars, drawBg, updateParticles, drawParticles, updateTrails, drawTrails } from './fx.js';
import { initCurrentGame, drawMorphTransition } from './morph.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';
import { boss } from './games/boss.js';
import { playSound } from './audio.js';

const GAMES = [jumper, snake, arkanoid, shooter, flappy];

// Register helper for boss collision and snapshots
G.getModeObject = () => GAMES[G.gameMode];

const LS_BEST = 'metamorphosis_best_v1';

G.canvas = document.getElementById('gameCanvas');
G.ctx = G.canvas.getContext('2d');

// Telegram Init
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

function loadBestScore() {
  if (window.Telegram && window.Telegram.WebApp.CloudStorage) {
    window.Telegram.WebApp.CloudStorage.getItem(LS_BEST, (err, v) => {
      if (!err && v) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
    });
  }
  // Fallback to local
  try {
    const v = localStorage.getItem(LS_BEST);
    if (v != null) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
  } catch (_) { /* ignore */ }
}

function saveBestIfNeeded() {
  const s = Math.floor(G.score);
  if (s <= G.bestScore) return;
  G.bestScore = s;
  
  if (window.Telegram && window.Telegram.WebApp.CloudStorage) {
    window.Telegram.WebApp.CloudStorage.setItem(LS_BEST, String(G.bestScore));
  }
  try {
    localStorage.setItem(LS_BEST, String(G.bestScore));
  } catch (_) { /* ignore */ }
}

function updateBestLine() {
  const el = document.getElementById('bestLine');
  if (!el) return;
  if (!G.running) {
    el.textContent = '';
    return;
  }
  const parts = [];
  if (G.bestScore > 0) parts.push('рекорд ' + G.bestScore);
  parts.push('шагов ' + G.runMorphCount);
  if (G.runDeathCount > 0) parts.push('угасаний ' + G.runDeathCount);
  el.textContent = parts.join(' · ');
}

function hideAllOverlays() {
  ['overlay', 'victoryOverlay', 'pauseHint', 'mobileHint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}



function updateCurrent() {
  if (G.paused) return;
  
  // Show Onboarding Hint
  const hint = document.getElementById('mobileHint');
  if (hint && G.running && !G.morphing) {
    const texts = [
      'ТАПНИ ДЛЯ ПРЫЖКА / СВАЙП ВЛЕВО-ВПРАВО',
      'СВАЙПАЙ В 4 СТОРОНЫ ДЛЯ ПОВОРОТА',
      'ДВИГАЙ ПЛАТФОРМУ ВЛЕВО-ВПРАВО',
      'УДЕРЖИВАЙ И ДВИГАЙ ДЛЯ СТРЕЛЬБЫ',
      'ТАПАЙ ДЛЯ ВЗЛЁТА'
    ];
    hint.textContent = texts[G.gameMode];
    hint.classList.remove('hidden');
    // Hide after 3s
    if (!G.hintTimer) G.hintTimer = performance.now();
    if (performance.now() - G.hintTimer > 3000) {
      hint.classList.add('hidden');
    }
  }

  let mode = G.gameMode;
  if (G.morphing) {
    // During morphing, we transition control from morphFrom to morphTo
    mode = G.morphT < 0.5 ? G.morphFrom : G.morphTo;
  }

  if (GAMES[mode] && GAMES[mode].update) {
    GAMES[mode].update();
  }
}

let chaosTimer = 0;
function updateChaos() {
  if (G.currentMod.name === 'ХАОС' && !G.morphing && G.running) {
    chaosTimer++;
    if (chaosTimer > 60 * 15) { // Every 15s
      chaosTimer = 0;
      G.triggerMorph('chaos');
    }
  } else {
    chaosTimer = 0;
  }
}

function drawCurrent() {
  if (G.morphing) {
    // During morphing, morph.js handles drawing the character(s).
    // But we might want to draw the environment (platforms, food, etc.)
    // We'll draw BOTH environments with alpha blending
    const alphaFrom = 1 - G.morphT;
    const alphaTo = G.morphT;

    G.ctx.save();
    G.ctx.globalAlpha = alphaFrom;
    drawEnv(G.morphFrom);
    G.ctx.restore();

    G.ctx.save();
    G.ctx.globalAlpha = alphaTo;
    drawEnv(G.morphTo);
    G.ctx.restore();
    return;
  }

  drawEnv(G.gameMode);
}

function drawEnv(mode) {
  if (GAMES[mode] && GAMES[mode].draw) {
    GAMES[mode].draw();
  }
}

let lastTime = 0;
function loop(timestamp) {
  if (!G.running) return;
  G.rafId = requestAnimationFrame(loop);

  if (!lastTime) lastTime = timestamp;
  G.dt = Math.min((timestamp - lastTime) / (1000 / 60), 3);
  lastTime = timestamp;

  if (G.paused) return;

  // 1. UPDATE
  updateCurrent();
  updateChaos();
  updateParticles();
  updateTrails();
  if (G.cycle >= 5 && !G.isVictory) {
    if (!G.bossInited) { boss.init(); G.bossInited = true; }
    boss.update();
  }

  // 2. DRAW
  const c = G.ctx;
  c.save();
  if (G.shake > 0) {
    c.translate((Math.random()-0.5)*G.shake, (Math.random()-0.5)*G.shake);
    G.shake *= 0.9;
    if (G.shake < 0.5) G.shake = 0;
  }

  drawBg();
  drawTrails();
  
  if (G.morphing) {
    G.morphT = Math.min(1, (performance.now() - G.morphStartReal) / G.morphDuration);
    drawCurrent(); // Draw env
    drawMorphTransition(G.morphT);
    if (G.morphT >= 1) {
      G.morphing = false;
      G.hintTimer = 0; // Reset hint timer on morph
    }
  } else {
    drawCurrent();
  }

  if (G.cycle >= 5 && !G.isVictory) boss.draw();
  drawParticles();

  // 3. UI
  document.getElementById('score').textContent = Math.floor(G.score);
  saveBestIfNeeded();
  updateBestLine();

  if (G.cycle > 0) {
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '11px Courier New';
    c.letterSpacing = '2px';
    c.fillText('ЦИКЛ ' + G.cycle, G.W() / 2 - 24, G.H() - 8);
  }

  // Carryover display
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.font = '10px Courier New';
  let yPos = 120;
  if (G.carryover.jumperCrystals > 0) {
    c.fillText('КРИСТАЛЛЫ: +' + G.carryover.jumperCrystals, 20, yPos);
    yPos += 15;
  }
  if (G.carryover.snakeMeals > 0) {
    c.fillText('ЕДА: +' + G.carryover.snakeMeals, 20, yPos);
    yPos += 15;
  }
  if (G.carryover.bricksCleared > 0) {
    c.fillText('БЛОКИ: +' + G.carryover.bricksCleared, 20, yPos);
    yPos += 15;
  }
  if (G.carryover.shooterKills > 0) {
    c.fillText('УБИЙСТВА: +' + G.carryover.shooterKills, 20, yPos);
    yPos += 15;
  }
  if (G.carryover.flappyHeight > 0) {
    c.fillText('ВЫСОТА: +' + G.carryover.flappyHeight, 20, yPos);
    yPos += 15;
  }

  // Target goal
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.font = 'bold 12px Courier New';
  c.textAlign = 'center';
  c.fillText('ЦЕЛЬ: ДОСТИГНИ ЦИКЛА 5', G.W() / 2, 40);
  c.textAlign = 'left';

  // Modifier display
  const mod = G.currentMod;
  if (mod && mod.name !== 'НОРМА') {
    c.fillStyle = '#f87171';
    c.font = 'bold 12px Courier New';
    c.textAlign = 'right';
    c.fillText(mod.name + ': ' + mod.desc, G.W() - 20, G.H() - 30);
    c.textAlign = 'left';
  }

  c.restore();

  // Show/Hide Game controls
  const ctrlEl = document.getElementById('controls');
  if (ctrlEl) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const needsDpad = (G.gameMode === 0 || G.gameMode === 1);
    if (needsDpad && isMobile && !G.morphing && G.running && !G.paused) {
      ctrlEl.classList.remove('hidden');
      // Hide up/down in Snake if we want, but D-pad usually needs all.
      // For Jumper, we only need Left/Right? No, D-pad is fine.
    } else {
      ctrlEl.classList.add('hidden');
    }
  }

  // Show/Hide Shooter fire button
  const fireEl = document.getElementById('fireBtn');
  if (fireEl) {
    if (G.gameMode === 3 && !G.morphing && G.running && !G.paused) {
      fireEl.classList.remove('hidden');
    } else {
      fireEl.classList.add('hidden');
    }
  }

  // Mobile Jump Hint
  const hintEl = document.getElementById('mobileHint');
  if (hintEl) {
    const isJumpMode = (G.gameMode === 0 || G.gameMode === 4);
    if (isJumpMode && G.running && !G.morphing && !G._hintShown) {
      hintEl.classList.remove('hidden');
      G._hintShown = true;
      if (!G.hintTimer) G.hintTimer = performance.now();
    }
    if (isJumpMode && G.hintTimer && performance.now() - G.hintTimer > 3000) {
      hintEl.classList.add('hidden');
    }
    if (!isJumpMode) G._hintShown = false;
  }
}



function showVictory() {
  hideAllOverlays();
  G.running = false;
  G.isVictory = true;
  cancelAnimationFrame(G.rafId);
  
  const overlay = document.getElementById('victoryOverlay');
  const vTime = document.getElementById('vTime');
  const vDeaths = document.getElementById('vDeaths');
  const vMorphs = document.getElementById('vMorphs');
  
  if (overlay) {
    overlay.classList.remove('hidden');
    
    // Format time
    const dur = Math.floor((performance.now() - G.runStartTime) / 1000);
    const m = Math.floor(dur / 60).toString().padStart(2, '0');
    const s = (dur % 60).toString().padStart(2, '0');
    
    vTime.textContent = `${m}:${s}`;
    vDeaths.textContent = G.runDeathCount;
    vMorphs.textContent = G.runMorphCount;
  }
}

function shareScore() {
  if (!window.Telegram || !window.Telegram.WebApp) return;
  const dur = Math.floor((performance.now() - G.runStartTime) / 1000);
  const text = `Я ВЫРВАЛСЯ ИЗ ЦИКЛА МЕТАМОРФОЗЫ! 🧬✨\nВремя: ${Math.floor(dur/60)}м ${dur%60}с\nСмертей: ${G.runDeathCount}\nПопробуй превзойти мой результат! 🔥`;
  const url = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/MetamorphosisGameBot/play') + '&text=' + encodeURIComponent(text);
  window.Telegram.WebApp.openTelegramLink(url);
}

function startEndless() {
  G.isVictory = false;
  G.isEndless = true;
  const overlay = document.getElementById('victoryOverlay');
  if (overlay) overlay.classList.add('hidden');
  G.running = true;
  G.rafId = requestAnimationFrame(loop);
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  G.canvas.width = w * dpr;
  G.canvas.height = h * dpr;
  G.canvas.style.width = w + 'px';
  G.canvas.style.height = h + 'px';
  
  G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  // Re-init stars for new size
  initStars();
}

loadBestScore();
resize();
window.addEventListener('resize', resize);
if (G.canvas) bindInput(G.canvas);

// Block context menu and long-press
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1) e.preventDefault(); // Block multi-touch zoom
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) G.paused = true;
});

const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', startGame);

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) shareBtn.addEventListener('click', shareScore);

const endlessBtn = document.getElementById('endlessBtn');
if (endlessBtn) endlessBtn.addEventListener('click', startEndless);

function startGame() {
  hideAllOverlays();
  G.score = 0;
  G.cycle = 0;
  G.stageIndex = 0;
  G.gameMode = G.stageOrder[0];
  G.runMorphCount = 0;
  G.runDeathCount = 0;
  G.runStartTime = performance.now();
  G.isVictory = false;
  G.isEndless = false;
  G.bossInited = false;
  resetCarryover();
  
  G.running = true;
  initCurrentGame();
  G.rafId = requestAnimationFrame(loop);
}

G.showVictory = showVictory;
