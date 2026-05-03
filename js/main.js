console.log("Metamorphosis: main.js loading...");

import { G, resetCarryover, syncGameModeFromStage } from './gameState.js';
import { bindInput } from './input.js';
import { initStars, drawBg, updateParticles, drawParticles, updateTrails, drawTrails } from './fx.js';
import { initCurrentGame, drawMorphTransition, triggerMorph } from './morph.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';
import { boss } from './games/boss.js';
import { playSound } from './audio.js';
import { 
  hideAllOverlays, 
  updateBestLine, 
  saveBestIfNeeded, 
  startLoop, 
  getDeltaTime 
} from './engine.js';

const GAMES = [jumper, snake, arkanoid, shooter, flappy];

G.getModeObject = () => GAMES[G.gameMode];

function initCanvas() {
  if (G.canvas) return true;
  G.canvas = document.getElementById('gameCanvas');
  if (G.canvas) {
    G.ctx = G.canvas.getContext('2d');
    bindInput(G.canvas);
    return true;
  }
  return false;
}

if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

function loadBestScore() {
  const LS_BEST = 'metamorphosis_best_v1';
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
      window.Telegram.WebApp.CloudStorage.getItem(LS_BEST, (err, v) => {
        if (!err && v) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
      });
    }
  } catch (e) { console.warn("CloudStorage unsupported"); }

  try {
    const v = localStorage.getItem(LS_BEST);
    if (v != null) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
  } catch (_) { }
}

function updateCurrent() {
  if (G.paused) return;
  const hint = document.getElementById('mobileHint');
  if (hint && G.running && !G.morphing) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isMobile && !G._hintShown) {
        const texts = [
          'ВЕДИ ПАЛЬЦЕМ ИЛИ ЖМИ СТРЕЛКИ',
          'СВАЙПАЙ В 4 СТОРОНЫ ДЛЯ ПОВОРОТА',
          'ДВИГАЙ ПЛАТФОРМУ ВЛЕВО-ВПРАВО',
          'УДЕРЖИВАЙ И ДВИГАЙ ДЛЯ СТРЕЛЬБЫ',
          'ТАПАЙ ДЛЯ ВЗЛЁТА'
        ];
        hint.textContent = texts[G.gameMode];
        hint.classList.remove('hidden');
        
        // Show D-pad if mobile
        const ctrl = document.getElementById('controls');
        if (ctrl) ctrl.classList.remove('hidden');

        G._hintShown = true;
        G.hintTimer = performance.now();
      }
    if (G.hintTimer && performance.now() - G.hintTimer > 3000) {
      hint.classList.add('hidden');
    }
  }

  let mode = G.gameMode;
  if (G.morphing) {
    mode = G.morphT < 0.5 ? G.morphFrom : G.morphTo;
  }
  if (GAMES[mode] && GAMES[mode].update) GAMES[mode].update();
}

function loop(timestamp) {
  if (!G.running) return;
  G.rafId = requestAnimationFrame(loop);
  if (!G.ctx) {
    G.running = false;
    return;
  }
  G.dt = getDeltaTime(timestamp);
  if (G.dt === 0) return;
  if (G.paused) return;

  updateCurrent();
  updateParticles();
  updateTrails();
  
  if (G.cycle >= 5 && !G.isVictory && !G.morphing) {
    if (!G.bossInited) { boss.init(); G.bossInited = true; }
    boss.update();
  }

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
    if (GAMES[G.morphFrom] && GAMES[G.morphFrom].draw) {
        c.save(); c.globalAlpha = 1 - G.morphT; GAMES[G.morphFrom].draw(); c.restore();
    }
    if (GAMES[G.morphTo] && GAMES[G.morphTo].draw) {
        c.save(); c.globalAlpha = G.morphT; GAMES[G.morphTo].draw(); c.restore();
    }
    drawMorphTransition(G.morphT);
    if (G.morphT >= 1) {
      G.morphing = false;
      G.hintTimer = 0;
      G._hintShown = false;
    }
  } else {
    if (GAMES[G.gameMode] && GAMES[G.gameMode].draw) GAMES[G.gameMode].draw();
  }

  if (G.cycle >= 5 && !G.isVictory) boss.draw();
  drawParticles();

  document.getElementById('score').textContent = Math.floor(G.score);
  saveBestIfNeeded();
  updateBestLine();

  if (G.cycle > 0) {
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.font = '11px Courier New';
    c.textAlign = 'center';
    c.fillText('ЦИКЛ ' + G.cycle, G.W() / 2, G.H() - 8);
    c.textAlign = 'left';
  }
  c.restore();
}

function startGame() {
  try {
    if (!initCanvas()) {
      alert("ERR: Canvas not found");
      return;
    }
    hideAllOverlays();
    G.score = 0;
    G.cycle = 0;
    G.stageIndex = 0;
    G.gameMode = G.stageOrder[0];
    G.runMorphCount = 0;
    G.runDeathCount = 0;
    G.runStartTime = performance.now();
    G.isVictory = false;
    G.bossInited = false;
    G._hintShown = false;
    G.hintTimer = 0;
    G.paused = false;
    resetCarryover();
    
    G.running = true;
    resize();
    initCurrentGame();
    startLoop(loop);
  } catch (err) {
    alert("CRASH: " + err.message);
  }
}

function showVictory() {
  hideAllOverlays();
  G.running = false;
  G.isVictory = true;
  cancelAnimationFrame(G.rafId);
  const overlay = document.getElementById('victoryOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function resize() {
  if (!G.canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  G.canvas.width = w * dpr;
  G.canvas.height = h * dpr;
  G.canvas.style.width = w + 'px';
  G.canvas.style.height = h + 'px';
  G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initStars();
}

loadBestScore();
resize();
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { G.paused = document.hidden; });

function bindStart() {
  const btn = document.getElementById('startBtn');
  if (btn) btn.onclick = startGame;
}
bindStart();
document.addEventListener('DOMContentLoaded', bindStart);

const endlessBtn = document.getElementById('endlessBtn');
if (endlessBtn) endlessBtn.onclick = () => {
  G.isVictory = false;
  G.running = true;
  startLoop(loop);
};

G.showVictory = showVictory;
G.triggerMorph = triggerMorph;
