import { G, pickMorphStyle, advanceStageAfterMorph } from './gameState.js';
import { COLORS } from './constants.js';
import { spawnParticles, spawnSoulParticles } from './fx.js';
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

const MORPH_LORE = {
  '0->1': { title: 'РАССЕЧЕНИЕ МОНАДЫ', sub: 'Кристаллы становятся позвонками', transfer: 'КРИСТАЛЛЫ → ДЛИНА' },
  '1->2': { title: 'СВЁРТЫВАНИЕ В ЩИТ', sub: 'Тело змеи — теперь броня', transfer: 'ЕДА → ПЛАТФОРМА' },
  '2->3': { title: 'ОБРАТИМОСТЬ', sub: 'Разбитые блоки становятся импульсом', transfer: 'БЛОКИ → ОРУЖИЕ' },
  '3->4': { title: 'ВОЗВРАЩЕНИЕ ВЕСА', sub: 'Космолёт оставляет оболочку', transfer: 'ОСКОЛКИ → СВЕТ' },
  '4->0': { title: 'СИНГУЛЯРНОСТЬ', sub: 'Конец — это начало, помнящее', transfer: 'ДУША → ТОЧКА' }
};

function getLore(from, to) {
  return MORPH_LORE[`${from}->${to}`] || { title: 'МЕТАМОРФОЗА', sub: 'Форма умирает, форма рождается', transfer: '' };
}

function drawWarpGrid(c, uRaw) {
  c.save();
  c.globalCompositeOperation = 'overlay';
  const col = COLORS[G.morphTo];
  c.strokeStyle = col + '44';
  c.lineWidth = 1;
  const gridS = 50;
  for (let x = 0; x < G.W(); x += gridS) {
    c.beginPath();
    const off = Math.sin(uRaw * Math.PI + x * 0.01) * 40 * Math.sin(uRaw * Math.PI);
    c.moveTo(x + off, 0);
    c.lineTo(x - off, G.H());
    c.stroke();
  }
  for (let y = 0; y < G.H(); y += gridS) {
    c.beginPath();
    const off = Math.cos(uRaw * Math.PI + y * 0.01) * 40 * Math.sin(uRaw * Math.PI);
    c.moveTo(0, y + off);
    c.lineTo(G.W(), y - off);
    c.stroke();
  }
  c.restore();
}

function drawSingularity(c, x, y, uRaw, color) {
  const t = Math.sin(uRaw * Math.PI);
  c.save();
  c.globalCompositeOperation = 'screen';
  c.fillStyle = color + '22';
  c.beginPath();
  c.arc(x, y, 20 + t * 80, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = color + '66';
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const r = 15 + t * 60 + i * 20;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}

function drawMorphTransition(uRaw) {
  const c = G.ctx;
  const u = easeMorphT(uRaw, G.morphStyle);
  const snapFrom = G.morphSnapshotFrom || { mode: 0, px: G.W()/2, py: G.H()/2 };
  const snapTo = G.morphSnapshotTo || { mode: 0, px: G.W()/2, py: G.H()/2 };

  const aFrom = (1 - u) * 0.9;
  const aTo = u * 0.9;
  const ax = snapFrom.px + (snapTo.px - snapFrom.px) * u;
  const ay = snapFrom.py + (snapTo.py - snapFrom.py) * u;

  // Environment warping
  drawWarpGrid(c, uRaw);

  // Singularity glow at center of morph
  if (uRaw > 0.2 && uRaw < 0.8) {
    drawSingularity(c, ax, ay, uRaw, COLORS[G.morphTo]);
  }

  // ==================== METAMORPHOSIS FORMS ====================

  if (G.morphFrom === 0 && G.morphTo === 1) {
    // JUMPER -> SNAKE: Monad Cleaving
    const segments = snapTo.segs || [];
    const segCount = Math.max(5, segments.length || 5);
    c.save();
    c.shadowBlur = 20;
    c.shadowColor = COLORS[1];

    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const delay = (1 - t) * 0.55;
      const localU = Math.max(0, Math.min(1, (u - delay) / 0.45));

      const targetX = segments[i]?.x ?? (snapFrom.px + (i - segCount/2) * 18);
      const targetY = segments[i]?.y ?? snapFrom.py;
      const curX = snapFrom.px + (targetX - snapFrom.px) * localU;
      const curY = snapFrom.py + (targetY - snapFrom.py) * localU;
      const size = (snapFrom.w || 30) * (1 - localU * 0.35);

      c.fillStyle = i === segCount - 1 ? '#fff' : COLORS[1];
      c.globalAlpha = 0.25 + localU * 0.75;
      c.fillRect(curX - size/2, curY - size/2, size, size);

      // Crystal echoes (the "seeds" of vertebrae)
      if (localU > 0.3 && localU < 0.9) {
        c.globalAlpha = (0.9 - localU) * 0.5;
        c.fillStyle = '#e9d5ff';
        c.fillRect(curX - 2, curY - 2, 4, 4);
      }
    }
    c.restore();

    // DNA spiral trace
    if (uRaw > 0.4 && uRaw < 0.9) {
      c.save();
      c.strokeStyle = COLORS[1] + '44';
      c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < segCount; i++) {
        const s = segments[i];
        if (!s) continue;
        const wave = Math.sin(i * 0.6 + uRaw * 4) * 8 * (1 - uRaw);
        if (i === 0) c.moveTo(s.x, s.y + wave);
        else c.lineTo(s.x, s.y + wave);
      }
      c.stroke();
      c.restore();
    }

  } else if (G.morphFrom === 1 && G.morphTo === 2) {
    // SNAKE -> ARKANOID: Coiling into Shield
    const segs = snapFrom.segs || [];
    const paddleW = snapTo.paddleW || 100;
    const paddleH = snapTo.paddleH || 15;
    const paddleX = snapTo.paddleX || G.W()/2;
    const paddleY = snapTo.paddleY || G.H()-80;

    c.save();
    segs.forEach((s, i) => {
      const t = i / (segs.length - 1 || 1);
      const delay = t * 0.3;
      const localU = Math.max(0, Math.min(1, (u - delay) / 0.7));

      if (i === segs.length - 1) {
        // Head becomes the ball
        const ballX = s.x + (snapTo.px - s.x) * localU;
        const ballY = s.y + (snapTo.py - s.y) * localU;
        c.fillStyle = '#fff';
        c.shadowColor = '#fff';
        c.shadowBlur = 12 + localU * 8;
        c.beginPath();
        c.arc(ballX, ballY, 6 + localU * 3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      } else {
        // Body segments melt into paddle
        const targetX = paddleX + t * paddleW;
        const targetY = paddleY + paddleH / 2;
        const curX = s.x + (targetX - s.x) * localU;
        const curY = s.y + (targetY - s.y) * localU;
        const meltSize = (1 - localU) * 14;

        c.globalAlpha = (1 - localU * 0.6) * 0.8;
        c.fillStyle = localU > 0.5 ? COLORS[2] : COLORS[1];
        c.fillRect(curX - meltSize/2, curY - 4, meltSize, 8);
      }
    });

    // Solid paddle emerges
    c.globalAlpha = Math.max(0, (u - 0.5) * 2);
    c.fillStyle = COLORS[2];
    c.shadowColor = COLORS[2];
    c.shadowBlur = 20;
    c.fillRect(paddleX, paddleY, paddleW, paddleH);
    c.shadowBlur = 0;
    c.restore();

  } else if (G.morphFrom === 2 && G.morphTo === 3) {
    // ARKANOID -> SHOOTER: Reversibility
    const paddleW = snapFrom.paddleW || 100;
    const paddleX = snapFrom.paddleX || G.W()/2;
    const paddleY = snapFrom.paddleY || G.H()-80;
    const ballX = snapFrom.px || G.W()/2;
    const ballY = snapFrom.py || G.H()/2;

    c.save();
    const meltU = Math.min(1, u * 1.5);

    // Paddle melts downward into ship body
    c.fillStyle = COLORS[2];
    c.globalAlpha = (1 - meltU) * 0.8;
    c.shadowColor = COLORS[2];
    c.shadowBlur = 15;
    const meltW = paddleW * (1 - meltU * 0.5);
    const meltX = paddleX + meltU * (snapTo.px - paddleX - paddleW/2);
    const meltY = paddleY + meltU * (snapTo.py - paddleY);
    c.fillRect(meltX, meltY, meltW, 14 * (1 - meltU * 0.5));
    c.shadowBlur = 0;

    // Ball absorbs into ship nose
    const orbX = ballX + (snapTo.px - ballX) * meltU;
    const orbY = ballY + (snapTo.py - 20 - ballY) * meltU;
    c.fillStyle = '#fff';
    c.globalAlpha = 1 - meltU * 0.5;
    c.beginPath();
    c.arc(orbX, orbY, 7 * (1 - meltU * 0.4), 0, Math.PI * 2);
    c.fill();

    // Ship emerges from the molten paddle
    if (u > 0.4) {
      const shipU = (u - 0.4) / 0.6;
      c.globalAlpha = shipU;
      c.fillStyle = COLORS[3];
      c.shadowColor = COLORS[3];
      c.shadowBlur = 25;
      const sx = snapTo.px;
      const sy = snapTo.py;
      const s = shipU;
      c.beginPath();
      c.moveTo(sx, sy - 16 * s);
      c.lineTo(sx - 12 * s, sy + 12 * s);
      c.lineTo(sx, sy + 6 * s);
      c.lineTo(sx + 12 * s, sy + 12 * s);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;

      // Thruster ignition
      c.fillStyle = `rgba(255,150,50,${shipU * 0.6})`;
      c.beginPath();
      c.moveTo(sx - 3 * s, sy + 10 * s);
      c.lineTo(sx, sy + (18 + Math.random() * 10) * s);
      c.lineTo(sx + 3 * s, sy + 10 * s);
      c.fill();
    }
    c.restore();

  } else if (G.morphFrom === 3 && G.morphTo === 4) {
    // SHOOTER -> FLAPPY: Return of Weight
    const sx = snapFrom.px || G.W()/2;
    const sy = snapFrom.py || G.H()-100;

    c.save();
    const fracture = Math.min(1, u * 2);
    const dissolve = Math.max(0, (u - 0.3) / 0.7);

    // Ship hull cracks and fades
    c.globalAlpha = (1 - dissolve) * 0.9;
    c.fillStyle = COLORS[3];
    c.shadowColor = COLORS[3];
    c.shadowBlur = 20 * (1 - dissolve);
    const shakeX = (Math.random() - 0.5) * 4 * fracture;
    const shakeY = (Math.random() - 0.5) * 4 * fracture;
    c.beginPath();
    c.moveTo(sx + shakeX, sy + shakeY - 16);
    c.lineTo(sx + shakeX - 12, sy + shakeY + 12);
    c.lineTo(sx + shakeX, sy + shakeY + 6);
    c.lineTo(sx + shakeX + 12, sy + shakeY + 12);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    // Guns detach and fall
    if (u > 0.15) {
      const fallU = (u - 0.15) / 0.85;
      c.globalAlpha = (1 - fallU) * 0.7;
      c.fillStyle = '#888';
      c.fillRect(sx - 18, sy + fallU * 60, 6, 10);
      c.fillRect(sx + 12, sy + fallU * 60, 6, 10);
    }

    // Soul emerges from within
    if (u > 0.35) {
      const soulU = (u - 0.35) / 0.65;
      const soulX = sx + (snapTo.px - sx) * soulU;
      const soulY = sy + (snapTo.py - sy) * soulU;
      c.globalAlpha = soulU;
      c.fillStyle = COLORS[4];
      c.shadowColor = COLORS[4];
      c.shadowBlur = 30 + soulU * 20;
      c.beginPath();
      c.ellipse(soulX, soulY, 12 * soulU, 8 * soulU, 0, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;

      // Wings unfold
      c.fillStyle = `rgba(255,255,255,${soulU * 0.4})`;
      const wingSpan = soulU * 22;
      c.beginPath();
      c.ellipse(soulX - 14, soulY - 2, wingSpan, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(soulX + 14, soulY - 2, wingSpan, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

  } else if (G.morphFrom === 4 && G.morphTo === 0) {
    // FLAPPY -> JUMPER: Singularity
    const soulX = snapFrom.px || G.W()/2;
    const soulY = snapFrom.py || G.H()/2;

    c.save();

    // Soul contracts into white point
    const collapse = Math.min(1, u * 1.2);
    c.globalAlpha = 1 - collapse * 0.5;
    c.fillStyle = COLORS[4];
    c.shadowColor = COLORS[4];
    c.shadowBlur = 40 * (1 - collapse);
    const shrink = 1 - collapse * 0.85;
    c.beginPath();
    c.ellipse(soulX, soulY, 14 * shrink, 10 * shrink, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Wings fold into the body
    if (u < 0.6) {
      const wingU = 1 - u / 0.6;
      c.fillStyle = `rgba(255,255,255,${wingU * 0.35})`;
      c.beginPath();
      c.ellipse(soulX - 14 * wingU, soulY, 20 * wingU, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(soulX + 14 * wingU, soulY, 20 * wingU, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }

    // Big Bang / Big Crunch flash
    if (u > 0.5) {
      const bangU = (u - 0.5) / 0.5;
      c.globalCompositeOperation = 'screen';
      c.fillStyle = `rgba(255,255,255,${bangU * 0.3 * (1 - bangU)})`;
      c.beginPath();
      c.arc(soulX, soulY, bangU * 120, 0, Math.PI * 2);
      c.fill();
      c.globalCompositeOperation = 'source-over';
    }

    // Cube re-materializes from the white point
    if (u > 0.55) {
      const cubeU = (u - 0.55) / 0.45;
      const targetX = snapTo.px;
      const targetY = snapTo.py;
      const curX = soulX + (targetX - soulX) * cubeU;
      const curY = soulY + (targetY - soulY) * cubeU;
      const size = 4 + 26 * cubeU;

      c.globalAlpha = cubeU;
      c.fillStyle = COLORS[0];
      c.shadowColor = COLORS[0];
      c.shadowBlur = 25 * cubeU;
      c.fillRect(curX - size/2, curY - size/2, size, size);
      c.shadowBlur = 0;

      // Eyes open
      if (cubeU > 0.5) {
        c.fillStyle = '#fff';
        const eyeU = (cubeU - 0.5) / 0.5;
        c.fillRect(curX - 7 * eyeU, curY - 7 * eyeU, 4 * eyeU, 4 * eyeU);
        c.fillRect(curX + 3 * eyeU, curY - 7 * eyeU, 4 * eyeU, 4 * eyeU);
      }
    }
    c.restore();

  } else {
    // Fallback: Alpha Blend
    drawMorphShapeAt(snapFrom, aFrom, uRaw);
    drawMorphShapeAt(snapTo, aTo, uRaw);
  }

  // ==================== UNIVERSAL EFFECTS ====================

  // Soul particles during the heart of morph
  if (uRaw > 0.25 && uRaw < 0.75) {
    const intensity = Math.sin((uRaw - 0.25) / 0.5 * Math.PI);
    c.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) {
      const r = Math.random() * 70 * (1 - uRaw * 0.5);
      const ang = Math.random() * Math.PI * 2;
      const px = ax + Math.cos(ang) * r;
      const py = ay + Math.sin(ang) * r;
      const sz = 1 + intensity * 2;
      c.globalAlpha = intensity * (0.4 + Math.random() * 0.6);
      c.fillRect(px, py, sz, sz);
    }
    c.globalAlpha = 1;
  }

  // Orbital memory fragments (past forms ghosting)
  if (uRaw > 0.3 && uRaw < 0.7) {
    c.save();
    c.globalAlpha = Math.sin((uRaw - 0.3) / 0.4 * Math.PI) * 0.15;
    c.strokeStyle = COLORS[G.morphFrom] + '66';
    c.lineWidth = 1;
    const orbitR = 60 + Math.sin(uRaw * 8) * 15;
    c.beginPath();
    c.arc(ax, ay, orbitR, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // ==================== LORE TEXT ====================
  const lore = getLore(G.morphFrom, G.morphTo);

  // Title — dramatic arc
  if (uRaw > 0.15 && uRaw < 0.85) {
    c.save();
    const textFade = Math.sin((uRaw - 0.15) / 0.7 * Math.PI);
    c.globalAlpha = textFade;
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.font = 'bold 18px Courier New';
    c.letterSpacing = '4px';
    c.fillText(lore.title, G.W()/2, G.H()/2 - 80);
    c.font = '12px Courier New';
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillText(lore.sub, G.W()/2, G.H()/2 - 58);
    c.restore();
  }

  // Transfer tag — mechanical, brief
  if (uRaw > 0.3 && uRaw < 0.7) {
    c.save();
    const tagFade = Math.sin((uRaw - 0.3) / 0.4 * Math.PI);
    c.globalAlpha = tagFade * 0.9;
    c.fillStyle = COLORS[G.morphTo];
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText(lore.transfer, G.W()/2, G.H()/2 - 140);
    c.restore();
  }

  // Cycle indicator pulse on final morphs
  if (G.cycle >= 1 && uRaw > 0.4 && uRaw < 0.6) {
    c.save();
    c.globalAlpha = 0.08;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, G.W(), G.H());
    c.restore();
  }

  // Narrative Story Text
  const text = G.storyTexts[G.morphTo];
  if (text) {
    const alpha = Math.sin(uMorph * Math.PI); // Fade in and out
    c.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    c.font = 'bold 18px Courier New';
    c.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      c.fillText(line, G.W() / 2, G.H() / 2 + 100 + i * 25);
    });
  }
}

function triggerMorph(reason) {
  if (G.morphing) return;
  
  // Cooldown check (8 seconds), but ignore for death
  const now = performance.now();
  if (reason !== 'death' && G.lastMorphRealTime && (now - G.lastMorphRealTime < 8000)) {
    return;
  }

  G.morphing = true;
  G.morphFrom = G.gameMode;
  G.runMorphCount++;
  if (reason === 'death') {
    G.runDeathCount++;
    if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
  }

  // Morph Sound
  import('./audio.js').then(m => m.playSound('morph'));

  G.lastMorphReason = reason;
  G.lastMorphRealTime = performance.now();
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
  const labelEl = document.getElementById('gameLabel');
  if (labelEl) labelEl.textContent = G.MODES[G.gameMode];
}

G.triggerMorph = triggerMorph;

export { initCurrentGame, triggerMorph, drawMorphTransition };
