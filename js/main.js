import { G, shuffleMidStages, syncGameModeFromStage } from './gameState.js';
import { bindInput } from './input.js';
import { initStars, drawBg, updateParticles, drawParticles } from './fx.js';
import { initCurrentGame, drawMorphTransition } from './morph.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';

G.canvas = document.getElementById('gameCanvas');
G.ctx = G.canvas.getContext('2d');

function resize() {
  G.canvas.width = window.innerWidth;
  G.canvas.height = window.innerHeight;
}

function updateCurrent() {
  if (G.morphing) return;
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
  requestAnimationFrame(loop);

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

  if (G.cycle > 0) {
    const c = G.ctx;
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '11px Courier New';
    c.letterSpacing = '2px';
    c.fillText('ЦИКЛ ' + G.cycle, G.W() / 2 - 24, G.H() - 8);
  }
}

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  G.running = true;
  G.morphing = false;
  G.score = 0;
  G.cycle = 0;
  G.stageIndex = 0;
  shuffleMidStages();
  syncGameModeFromStage();
  initStars();
  initCurrentGame();
  requestAnimationFrame(loop);
}

resize();
window.addEventListener('resize', resize);
bindInput(G.canvas);
document.getElementById('startBtn').addEventListener('click', startGame);
