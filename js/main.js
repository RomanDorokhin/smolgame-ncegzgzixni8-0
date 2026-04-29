import { G, shuffleMidStages, syncGameModeFromStage } from './gameState.js';
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
  parts.push('цикл ' + G.cycle);
  parts.push('шагов ' + G.runMorphCount);
  if (G.runDeathCount > 0) parts.push('угасаний ' + G.runDeathCount);
  el.textContent = parts.join(' · ');
}

function resize() {
  G.canvas.width = window.innerWidth;
  G.canvas.height = window.innerHeight;
  if (G.running && !G.morphing && !G.paused) {
    cancelAnimationFrame(G.rafId);
    G.rafId = requestAnimationFrame(loop);
    initCurrentGame();
  } else if (G.running && !G.morphing && G.paused) {
    cancelAnimationFrame(G.rafId);
    G.rafId = requestAnimationFrame(loop);
  }
}

function updateCurrent() {
  if (G.morphing || G.paused) return;
  switch (G.gameMode) {
    case 0: jumper.update(); break;
    case 1: snake.update(); break;
    case 2: arkanoid.update(); break;
    case 3: shooter.update(); break;
    case 4: flappy.update(); break;
  }
}

function drawCurrent() {
  switch (G.gameMode) {
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
  shuffleMidStages();
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
