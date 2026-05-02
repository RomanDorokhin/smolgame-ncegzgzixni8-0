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

function drawMorphTransition(uRaw) {
  const c = G.ctx;
  const u = easeMorphT(uRaw, G.morphStyle);
  const snapFrom = G.morphSnapshotFrom || { mode: 0, px: G.W()/2, py: G.H()/2 };
  const snapTo = G.morphSnapshotTo || { mode: 0, px: G.W()/2, py: G.H()/2 };

  const aFrom = (1 - u) * 0.9;
  const aTo = u * 0.9;
  
  // Environment warping
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.strokeStyle = COLORS[G.morphTo] + '33';
  c.lineWidth = 1;
  const gridS = 50;
  for (let x = 0; x < G.W(); x += gridS) {
    c.beginPath();
    const off = Math.sin(uRaw * Math.PI + x * 0.01) * 30 * Math.sin(uRaw * Math.PI);
    c.moveTo(x + off, 0);
    c.lineTo(x - off, G.H());
    c.stroke();
  }
  c.restore();

  const ax = snapFrom.px + (snapTo.px - snapFrom.px) * u;
  const ay = snapFrom.py + (snapTo.py - snapFrom.py) * u;

  // GEOMETRIC METAMORPHOSIS LOGIC
  if (G.morphFrom === 0 && G.morphTo === 1) {
    // JUMPER -> SNAKE (Cube stretches into segments)
    const segments = snapTo.segs || [];
    const segCount = segments.length || 5;
    
    c.save();
    c.shadowBlur = 15;
    c.shadowColor = COLORS[1];
    
    for (let i = 0; i < segCount; i++) {
        const t = i / (segCount - 1);
        // Each segment starts at the Jumper position and "unfurls" to its final snake position
        const delay = (1 - t) * 0.5;
        const localU = Math.max(0, Math.min(1, (u - delay) / 0.5));
        
        const curX = snapFrom.px + (segments[i]?.x - snapFrom.px) * localU;
        const curY = snapFrom.py + (segments[i]?.y - snapFrom.py) * localU;
        
        const size = (snapFrom.w || 30) * (1 - localU * 0.4);
        c.fillStyle = i === segCount - 1 ? '#fff' : COLORS[1];
        c.globalAlpha = 0.3 + localU * 0.7;
        c.fillRect(curX - size/2, curY - size/2, size, size);
    }
    c.restore();
  } else if (G.morphFrom === 1 && G.morphTo === 2) {
    // SNAKE -> ARKANOID (Segments cluster into a paddle)
    const segs = snapFrom.segs || [];
    const paddleW = snapTo.paddleW || 100;
    const paddleH = snapTo.paddleH || 15;
    
    c.save();
    segs.forEach((s, i) => {
        const t = i / (segs.length - 1);
        // Head (last segment) becomes the ball, others form the paddle
        if (i === segs.length - 1) {
            const ballX = s.x + (snapTo.px - s.x) * u;
            const ballY = s.y + (snapTo.py - s.y) * u;
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(ballX, ballY, 8, 0, Math.PI * 2);
            c.fill();
        } else {
            const targetX = (snapTo.paddleX || G.W()/2) + t * paddleW;
            const targetY = (snapTo.paddleY || G.H()-100) + paddleH/2;
            const curX = s.x + (targetX - s.x) * u;
            const curY = s.y + (targetY - s.y) * u;
            
            c.fillStyle = COLORS[2];
            c.globalAlpha = 1 - u * 0.5;
            c.fillRect(curX - 10, curY - 5, 20, 10);
        }
    });
    // Draw the emerging paddle
    c.globalAlpha = u;
    c.fillStyle = COLORS[2];
    c.fillRect(snapTo.paddleX, snapTo.paddleY, paddleW, paddleH);
    c.restore();
  } else {
    // Fallback: Alpha Blend
    drawMorphShapeAt(snapFrom, aFrom, uRaw);
    drawMorphShapeAt(snapTo, aTo, uRaw);
  }

  // Common "soul" particles
  if (uRaw > 0.3 && uRaw < 0.7) {
      c.fillStyle = '#fff';
      for(let i=0; i<10; i++) {
          const r = Math.random() * 50 * (1-uRaw);
          const ang = Math.random() * Math.PI * 2;
          c.fillRect(ax + Math.cos(ang)*r, ay + Math.sin(ang)*r, 2, 2);
      }
  }

  // Transfer feedback text
  if (uRaw > 0.2 && uRaw < 0.8) {
      c.save();
      c.fillStyle = 'white';
      c.globalAlpha = Math.sin((uRaw - 0.2) / 0.6 * Math.PI);
      c.font = 'bold 16px Courier New';
      c.textAlign = 'center';
      let msg = "";
      if (G.morphFrom === 0 && G.morphTo === 1) msg = "КРИСТАЛЛЫ \u2192 ДЛИНА";
      if (G.morphFrom === 1 && G.morphTo === 2) msg = "ЕДА \u2192 ПЛАТФОРМА";
      if (G.morphFrom === 2 && G.morphTo === 3) msg = "БЛОКИ \u2192 ЗАЩИТА";
      if (msg) c.fillText(msg, G.W()/2, G.H()/2 - 120);
      c.restore();
  }
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

export { initCurrentGame, triggerMorph, drawMorphTransition };
