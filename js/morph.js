import { G, pickMorphStyle, advanceStageAfterMorph } from './gameState.js';
import { COLORS } from './constants.js';
import { jumper } from './games/jumper.js';
import { snake } from './games/snake.js';
import { arkanoid } from './games/arkanoid.js';
import { shooter } from './games/shooter.js';
import { flappy } from './games/flappy.js';
import { registerMorphTrigger } from './actions.js';

function easeMorphT(raw, style) {
  if (style === 'flash') return raw < 0.42 ? 0 : 1;
  if (style === 'creep') return Math.pow(Math.min(1, Math.max(0, raw)), 0.38);
  const t = Math.min(1, Math.max(0, raw));
  return t * t * (3 - 2 * t);
}

function captureMorphSnapshot(mode) {
  switch (mode) {
    case 0:
      return {
        mode: 0,
        px: jumper.x + jumper.w / 2,
        py: jumper.y + jumper.h / 2,
        w: jumper.w,
        h: jumper.h
      };
    case 1: {
      const h = snake.body[snake.body.length - 1];
      const cs = snake.cellSize;
      return {
        mode: 1,
        px: snake.fieldX + h.x * cs + cs / 2,
        py: snake.fieldY + h.y * cs + cs / 2,
        segs: snake.body.map(b => ({
          x: snake.fieldX + b.x * cs + cs / 2,
          y: snake.fieldY + b.y * cs + cs / 2
        })),
        cs
      };
    }
    case 2:
      return {
        mode: 2,
        px: arkanoid.ball.x,
        py: arkanoid.ball.y,
        r: arkanoid.ball.r,
        paddleY: arkanoid.paddle.y,
        paddleW: arkanoid.paddle.w,
        paddleH: arkanoid.paddle.h,
        paddleX: arkanoid.paddle.x
      };
    case 3:
      return {
        mode: 3,
        px: shooter.ship.x + shooter.ship.w / 2,
        py: shooter.ship.y + shooter.ship.h / 2,
        w: shooter.ship.w,
        h: shooter.ship.h
      };
    case 4:
      return {
        mode: 4,
        px: flappy.bird.x,
        py: flappy.bird.y,
        r: flappy.bird.r,
        ang: flappy.bird.angle
      };
    default:
      return { mode: 0, px: G.W() / 2, py: G.H() / 2, w: 36, h: 36 };
  }
}

function drawMorphShapeAt(snap, alpha, uMorph) {
  if (alpha <= 0.01) return;
  const c = G.ctx;
  const col = COLORS[snap.mode];
  c.save();
  c.globalAlpha = alpha;

  if (snap.mode === 0) {
    const s = 1 + Math.sin(uMorph * Math.PI) * 0.15;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 20;
    c.fillRect(snap.px - (snap.w * s) / 2, snap.py - (snap.h * s) / 2, snap.w * s, snap.h * s);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(snap.px - 10, snap.py - 8, 6, 7);
    c.fillRect(snap.px + 2, snap.py - 8, 6, 7);
  } else if (snap.mode === 1) {
    const segs = snap.segs;
    if (!segs || !segs.length) {
      c.restore();
      return;
    }
    c.strokeStyle = col;
    c.lineWidth = snap.cs * 0.85;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = col;
    c.shadowBlur = 12;
    c.beginPath();
    c.moveTo(segs[0].x, segs[0].y);
    for (let i = 1; i < segs.length; i++) c.lineTo(segs[i].x, segs[i].y);
    c.stroke();
    c.shadowBlur = 0;
    const head = segs[segs.length - 1];
    c.fillStyle = '#fff';
    c.fillRect(head.x - 5, head.y - 5, 4, 4);
    c.fillRect(head.x + 1, head.y - 5, 4, 4);
  } else if (snap.mode === 2) {
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 14;
    c.fillRect(snap.paddleX, snap.paddleY, snap.paddleW, snap.paddleH);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(snap.px, snap.py, snap.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  } else if (snap.mode === 3) {
    const x = snap.px - snap.w / 2;
    const y = snap.py - snap.h / 2;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 18;
    c.beginPath();
    c.moveTo(snap.px, y);
    c.lineTo(x + snap.w, y + snap.h);
    c.lineTo(x + snap.w * 0.62, y + snap.h * 0.72);
    c.lineTo(x + snap.w * 0.38, y + snap.h * 0.72);
    c.lineTo(x, y + snap.h);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
  } else if (snap.mode === 4) {
    c.save();
    c.translate(snap.px, snap.py);
    c.rotate(snap.ang || 0);
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 16;
    c.beginPath();
    c.ellipse(0, 0, snap.r, snap.r * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#fbbf24';
    c.beginPath();
    c.moveTo(12, -1);
    c.lineTo(18, 2);
    c.lineTo(12, 5);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.restore();
}

export function drawMorphTransition(uRaw) {
  const c = G.ctx;
  const u = easeMorphT(uRaw, G.morphStyle);
  const ax = G.morphSnapshotFrom.px + (G.morphSnapshotTo.px - G.morphSnapshotFrom.px) * uRaw;
  const ay = G.morphSnapshotFrom.py + (G.morphSnapshotTo.py - G.morphSnapshotFrom.py) * uRaw;

  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(ax, ay, 0, ax, ay, 120 + uRaw * 80);
  g.addColorStop(0, COLORS[G.morphFrom] + '55');
  g.addColorStop(0.5, COLORS[G.morphTo] + '33');
  g.addColorStop(1, 'transparent');
  c.fillStyle = g;
  c.fillRect(0, 0, G.W(), G.H());
  c.restore();

  const gooW = 40 + (1 - u) * 60 + Math.sin(uRaw * Math.PI * 3) * 12;
  const gooH = 40 + u * 90 + Math.cos(uRaw * Math.PI * 2) * 20;
  c.save();
  c.translate(ax, ay);
  c.rotate(uRaw * Math.PI * 0.6 * (G.morphFrom % 2 === 0 ? 1 : -1));
  c.globalAlpha = G.morphStyle === 'flash' ? 0.35 : 0.22;
  c.fillStyle = COLORS[G.morphTo];
  c.beginPath();
  c.ellipse(0, 0, gooW, gooH * 0.45, uRaw * 0.8, 0, Math.PI * 2);
  c.fill();
  c.restore();

  const aFrom = G.morphStyle === 'flash' ? (uRaw < 0.5 ? 0.95 : 0.08) : (1 - u) * 0.92;
  const aTo = G.morphStyle === 'flash' ? (uRaw < 0.5 ? 0.1 : 0.95) : u * 0.92;
  drawMorphShapeAt(G.morphSnapshotFrom, aFrom, uRaw);
  drawMorphShapeAt(G.morphSnapshotTo, aTo, uRaw);

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
  G.runMorphCount++;
  if (reason === 'death') G.runDeathCount++;
  G.morphFrom = G.gameMode;
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
  switch (G.gameMode) {
    case 0: jumper.init(); break;
    case 1: snake.init(); break;
    case 2: arkanoid.init(); break;
    case 3: shooter.init(); break;
    case 4: flappy.init(); break;
  }
  document.getElementById('gameLabel').textContent = G.MODES[G.gameMode];
}

registerMorphTrigger(triggerMorph);

export { initCurrentGame, triggerMorph };
