import { G, pickMorphStyle, advanceStageAfterMorph } from './gameState.js';
import { COLORS } from './constants.js';
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

export function drawMorphTransition(uRaw) {
  const c = G.ctx;
  const u = easeMorphT(uRaw, G.morphStyle);
  const snapFrom = captureMorphSnapshot(G.morphFrom);
  const snapTo = captureMorphSnapshot(G.morphTo);

  const aFrom = G.morphStyle === 'flash' ? (uRaw < 0.5 ? 0.95 : 0.08) : (1 - u) * 0.92;
  const aTo = G.morphStyle === 'flash' ? (uRaw < 0.5 ? 0.1 : 0.95) : u * 0.92;
  
  // Environment warping effect
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.strokeStyle = COLORS[G.morphTo] + '44';
  c.lineWidth = 1;
  const gridS = 40;
  for (let x = 0; x < G.W(); x += gridS) {
    c.beginPath();
    const off = Math.sin(uRaw * Math.PI + x * 0.01) * 20 * Math.sin(uRaw * Math.PI);
    c.moveTo(x + off, 0);
    c.lineTo(x - off, G.H());
    c.stroke();
  }
  c.restore();

  drawMorphShapeAt(snapFrom, aFrom, uRaw);

  // Hybrid moments
  const ax = snapFrom.px + (snapTo.px - snapFrom.px) * uRaw;
  const ay = snapFrom.py + (snapTo.py - snapFrom.py) * uRaw;

  if (uRaw > 0.2 && uRaw < 0.8) {
    if (G.morphFrom === 0 && G.morphTo === 1) {
      // Jumper -> Snake: trail
      c.save();
      c.strokeStyle = COLORS[1];
      c.lineWidth = 14;
      c.globalAlpha = 0.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(ax - 60 * (1-uRaw), ay);
      c.lineTo(ax, ay);
      c.stroke();
      c.restore();
    } else if (G.morphFrom === 1 && G.morphTo === 2) {
      // Snake -> Arkanoid: head as ball
      c.fillStyle = '#fff';
      c.shadowColor = '#fff';
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(ax, ay, 12, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    } else if (G.morphFrom === 2 && G.morphTo === 3) {
      // Arkanoid -> Shooter: ball splits
      c.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        const o = (i - 1) * 20 * uRaw;
        c.fillRect(ax + o - 2, ay - 10, 4, 15);
      }
    }
  }

  drawMorphShapeAt(snapTo, aTo, uRaw);

  c.save();
  c.strokeStyle = 'rgba(255,255,255,' + (0.15 + uRaw * 0.25) + ')';
  c.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const phase = uRaw * (80 + i * 40) + i;
    c.beginPath();
    c.arc(ax, ay, 30 + phase % 100, 0, Math.PI * 1.5);
    c.stroke();
  }
  c.restore();

  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = '10px Courier New';
  c.textAlign = 'center';
  const tag = G.lastMorphReason === 'death' ? 'ПЕРЕРОЖДЕНИЕ' : 'МЕТАМОРФОЗ';
  c.fillText(tag, G.W() / 2, G.H() / 2 + 120);
  c.textAlign = 'left';

  c.save();
  const cx = G.W() / 2, cy = G.H() / 2;
  const maxR = Math.hypot(cx, cy) * 1.15;
  const vg = c.createRadialGradient(cx, cy, maxR * (0.35 + uRaw * 0.2), cx, cy, maxR);
  const edge = 0.25 + uRaw * 0.35;
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(0.55, `rgba(0,0,0,${edge * 0.35})`);
  vg.addColorStop(1, `rgba(0,0,0,${edge})`);
  c.fillStyle = vg;
  c.fillRect(0, 0, G.W(), G.H());
  c.restore();
}

function triggerMorph(reason) {
  if (G.morphing) return;
  G.morphing = true;
  G.morphFrom = G.gameMode;
  G.runMorphCount++;
  if (reason === 'death') G.runDeathCount++;
  
  G.lastMorphReason = reason;
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
  document.getElementById('gameLabel').textContent = G.MODES[G.gameMode];
}

G.triggerMorph = triggerMorph;

export { initCurrentGame, triggerMorph };
