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
  
  // Show Onboarding Hint (Consolidated)
  const hint = document.getElementById('mobileHint');
  if (hint && G.running && !G.morphing) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isJumpMode = (G.gameMode === 0 || G.gameMode === 4);
    
    if (isMobile && isJumpMode && !G._hintShown) {
      const texts = [
        'ТАПНИ ДЛЯ ПРЫЖКА / СВАЙП ВЛЕВО-ВПРАВО',
        'СВАЙПАЙ В 4 СТОРОНЫ ДЛЯ ПОВОРОТА',
        'ДВИГАЙ ПЛАТФОРМУ ВЛЕВО-ВПРАВО',
        'УДЕРЖИВАЙ И ДВИГАЙ ДЛЯ СТРЕЛЬБЫ',
        'ТАПАЙ ДЛЯ ВЗЛЁТА'
      ];
      hint.textContent = texts[G.gameMode];
      hint.classList.remove('hidden');
      G._hintShown = true;
      if (!G.hintTimer) G.hintTimer = performance.now();
    }
    
    if (G.hintTimer && performance.now() - G.hintTimer > 3000) {
      hint.classList.add('hidden');
    }
    
    if (!isJumpMode) G._hintShown = false;
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
  if (document.hidden) {
    G.paused = true;
  } else {
    G.paused = false;
  }
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
