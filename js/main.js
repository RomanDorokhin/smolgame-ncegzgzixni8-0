import { G, resetCarryover, syncGameModeFromStage } from './gameState.js';
import { bindInput } from './input.js';
import { initStars, drawBg, updateParticles, drawParticles } from './fx.js';
import { initCurrentGame, drawMorphTransition } from './morph.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';

const LS_BEST = 'metamorphosis_best_v1';

G.canvas = document.getElementById('gameCanvas');
G.ctx = G.canvas.getContext('2d');

function loadBestScore() {
  try {
    const v = localStorage.getItem(LS_BEST);
    if (v != null) G.bestScore = Math.max(0, parseInt(v, 10) || 0);
  } catch (_) { /* ignore */ }
}

function saveBestIfNeeded() {
  const s = Math.floor(G.score);
  if (s <= G.bestScore) return;
  G.bestScore = s;
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

function resize() {
  G.canvas.width = window.innerWidth;
  G.canvas.height = window.innerHeight;
  if (G.running && !G.morphing && !G.paused) initCurrentGame();
}

function updateCurrent() {
  if (G.paused) return;
  
  let mode = G.gameMode;
  if (G.morphing) {
    // During morphing, we transition control from morphFrom to morphTo
    mode = G.morphT < 0.5 ? G.morphFrom : G.morphTo;
  }

  switch (mode) {
    case 0: jumper.update(); break;
    case 1: snake.update(); break;
    case 2: arkanoid.update(); break;
    case 3: shooter.update(); break;
    case 4: flappy.update(); break;
  }
}

let chaosTimer = 0;
async function updateChaos() {
  if (G.currentMod.name === 'ХАОС' && !G.morphing && G.running) {
    chaosTimer++;
    if (chaosTimer > 60 * 15) { // Every 15s
      chaosTimer = 0;
      const { triggerMorph } = await import('./actions.js');
      triggerMorph('chaos');
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
  switch (mode) {
    case 0: jumper.draw(); break;
    case 1: snake.draw(); break;
    case 2: arkanoid.draw(); break;
    case 3: shooter.draw(); break;
    case 4: flappy.draw(); break;
  }
}

function loop() {
  if (!G.running) return;
  G.rafId = requestAnimationFrame(loop);

  drawBg();
  if (G.morphing) {
    G.morphT = Math.min(1, (performance.now() - G.morphStartReal) / G.morphDuration);
  }
  updateCurrent();
  updateChaos();
  drawCurrent();
  if (G.morphing) {
    drawMorphTransition(G.morphT);
    if (G.morphT >= 1) G.morphing = false;
  }
  updateParticles();
  drawParticles();

  document.getElementById('score').textContent = Math.floor(G.score);
  saveBestIfNeeded();
  updateBestLine();

  const c = G.ctx;
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
    c.fillText('РАЗМЕР: +' + G.carryover.snakeMeals, 20, yPos);
    yPos += 15;
  }
  if (G.carryover.bricksCleared) {
    c.fillText('ЩИТ: АКТИВЕН', 20, yPos);
    yPos += 15;
  }

  // Modifier display
  const mod = G.currentMod;
  if (mod && mod.name !== 'НОРМА') {
    c.fillStyle = '#f87171';
    c.font = 'bold 12px Courier New';
    c.textAlign = 'right';
    c.fillText(mod.name + ': ' + mod.desc, G.W() - 20, G.H() - 30);
    c.textAlign = 'left';
  }
}

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  const pauseEl = document.getElementById('pauseHint');
  if (pauseEl) pauseEl.style.display = 'none';

  cancelAnimationFrame(G.rafId);
  G.running = true;
  G.paused = false;
  G.morphing = false;
  G.score = 0;
  G.cycle = 0;
  G.stageIndex = 0;
  G.runMorphCount = 0;
  G.runDeathCount = 0;
  resetCarryover();
  syncGameModeFromStage();
  loadBestScore();
  initStars();
  initCurrentGame();
  G.rafId = requestAnimationFrame(loop);
}

loadBestScore();
resize();
window.addEventListener('resize', resize);
bindInput(G.canvas);

document.addEventListener('keydown', e => {
  if (e.code === 'Escape' && G.running && !G.morphing) {
    G.paused = !G.paused;
    const pauseEl = document.getElementById('pauseHint');
    if (pauseEl) pauseEl.style.display = G.paused ? 'block' : 'none';
  }
});

document.getElementById('startBtn').addEventListener('click', startGame);
