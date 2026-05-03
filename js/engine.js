import { G } from './gameState.js';

let lastTime = 0;

export function hideAllOverlays() {
  ['overlay', 'victoryOverlay', 'pauseHint', 'mobileHint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

export function updateBestLine() {
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

export function saveBestIfNeeded() {
  const LS_BEST = 'metamorphosis_best_v1';
  const s = Math.floor(G.score);
  if (s <= G.bestScore) return;
  G.bestScore = s;
  
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage) {
      window.Telegram.WebApp.CloudStorage.setItem(LS_BEST, String(G.bestScore));
    }
  } catch (e) {}
  try {
    localStorage.setItem(LS_BEST, String(G.bestScore));
  } catch (_) { /* ignore */ }
}

export function resetLoop() {
  lastTime = 0;
}

export function startLoop(loopFn) {
  resetLoop();
  G.rafId = requestAnimationFrame(loopFn);
}

export function getDeltaTime(timestamp) {
  if (lastTime === 0) {
    lastTime = timestamp;
    return 0;
  }
  const dt = Math.min((timestamp - lastTime) / (1000 / 60), 3);
  lastTime = timestamp;
  return dt;
}
