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

// Register helper for boss collision and snapshots
G.getModeObject = () => GAMES[G.gameMode];

function initCanvas() {
  if (G.canvas) return true;
  G.canvas = document.getElementById('gameCanvas');
  if (G.canvas) {
    G.ctx = G.canvas.getContext('2d');
    bindInput(G.canvas);
    return true;
  }
  console.error("Canvas element #gameCanvas not found!");
  return false;
}

// Telegram Init
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

function loadBestScore() {
  const LS_BEST = 'metamorphosis_best_v1';
  if (window.Telegram && window.Telegram.WebApp.CloudStorage) {
    window.Telegram.WebApp.CloudStorage.getItem(LS_BEST, (err, v) => {
      if (!err && v) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
    });
  }
  try {
    const v = localStorage.getItem(LS_BEST);
    if (v != null) G.bestScore = Math.max(G.bestScore, parseInt(v, 10) || 0);
  } catch (_) { /* ignore */ }
}

function updateCurrent() {
  if (G.paused) return;
  
  // Show Onboarding Hint
  const hint = document.getElementById('mobileHint');
  if (hint && G.running && !G.morphing) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile && !G._hintShown) {
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
      triggerMorph('chaos');
    }
  } else {
    chaosTimer = 0;
  }
}

function loop(timestamp) {
  if (!G.running) return;
  G.rafId = requestAnimationFrame(loop);

  if (!G.ctx) {
    console.error("Loop stopped: G.ctx is null");
    G.running = false;
    return;
  }
  G.dt = getDeltaTime(timestamp);
  if (G.dt === 0) return; // Wait for second frame to have valid delta

  if (G.paused) return;

  // 1. UPDATE
  updateCurrent();
  updateChaos();
  updateParticles();
  updateTrails();
  
  if (G.cycle >= 5 && !G.isVictory && !G.morphing) {
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
    if (GAMES[G.gameMode] && GAMES[G.gameMode].draw) {
      GAMES[G.gameMode].draw();
    }
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
    c.textAlign = 'center';
    c.fillText('ЦИКЛ ' + G.cycle, G.W() / 2, G.H() - 8);
    c.textAlign = 'left';
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

  c.restore();

  // Controls Visibility
  const ctrlEl = document.getElementById('controls');
  if (ctrlEl) {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const needsDpad = (G.gameMode === 0 || G.gameMode === 1);
    if (needsDpad && isMobile && !G.morphing && G.running && !G.paused) {
      ctrlEl.classList.remove('hidden');
    } else {
      ctrlEl.classList.add('hidden');
    }
  }

  const fireEl = document.getElementById('fireBtn');
  if (fireEl) {
    if (G.gameMode === 3 && !G.morphing && G.running && !G.paused) {
      fireEl.classList.remove('hidden');
    } else {
      fireEl.classList.add('hidden');
    }
  }
}

function startGame() {
  try {
    if (!initCanvas()) {
      alert("Ошибка: Не удалось найти игровое поле (Canvas).");
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
    G.isEndless = false;
    G.bossInited = false;
    G._hintShown = false;
    G.hintTimer = 0;
    G.paused = false;
    resetCarryover();
    
    G.running = true;
    initCurrentGame();
    startLoop(loop);
    console.log("Game started successfully.");
  } catch (err) {
    console.error("Failed to start game:", err);
  }
}

function showVictory() {
  hideAllOverlays();
  G.running = false;
  G.isVictory = true;
  cancelAnimationFrame(G.rafId);
  
  const overlay = document.getElementById('victoryOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    const dur = Math.floor((performance.now() - G.runStartTime) / 1000);
    const m = Math.floor(dur / 60).toString().padStart(2, '0');
    const s = (dur % 60).toString().padStart(2, '0');
    document.getElementById('vTime').textContent = `${m}:${s}`;
    document.getElementById('vDeaths').textContent = G.runDeathCount;
    document.getElementById('vMorphs').textContent = G.runMorphCount;
  }
}

function startEndless() {
  G.isVictory = false;
  G.isEndless = true;
  const overlay = document.getElementById('victoryOverlay');
  if (overlay) overlay.classList.add('hidden');
  G.running = true;
  startLoop(loop);
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

// Initial Setup
loadBestScore();
resize();
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  G.paused = document.hidden;
});

const startBtn = document.getElementById('startBtn');
if (startBtn) startBtn.addEventListener('click', startGame);

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) shareBtn.addEventListener('click', () => {
  if (!window.Telegram || !window.Telegram.WebApp) return;
  const dur = Math.floor((performance.now() - G.runStartTime) / 1000);
  const text = `Я ВЫРВАЛСЯ ИЗ ЦИКЛА МЕТАМОРФОЗЫ! 🧬✨\nВремя: ${Math.floor(dur/60)}м ${dur%60}с\nСмертей: ${G.runDeathCount}\nПопробуй! 🔥`;
  const url = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/MetamorphosisGameBot/play') + '&text=' + encodeURIComponent(text);
  window.Telegram.WebApp.openTelegramLink(url);
});

const endlessBtn = document.getElementById('endlessBtn');
if (endlessBtn) endlessBtn.addEventListener('click', startEndless);

G.showVictory = showVictory;
G.triggerMorph = triggerMorph;
