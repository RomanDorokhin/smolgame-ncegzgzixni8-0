import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const arkanoid = {
  paddleX: 0, paddleY: 0, paddleW: 100, paddleH: 14,
  balls: [],
  ballR: 7,
  bricks: [],
  bricksNeeded: 10,
  bricksCleared: 0,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.paddleY = this.height - 60;
    this.paddleX = this.width / 2 - this.paddleW / 2;
    // Use new shield bonus for wider paddle
    const bonus = G.carryover.shield || 0;
    this.paddleW = 80 + bonus * 15; 
    this.bricksNeeded = Math.max(5, 10 - Math.floor(bonus / 2));
    this.bricksCleared = 0;
    this.balls = [];
    this.spawnBall();
    if (G.cycle >= 3) this.spawnBall(-4); // Second ball for higher cycles
    this.bricks = [];
    const cols = 8;
    const brickW = Math.floor(this.width / cols) - 4;
    const rows = 4 + Math.floor(Math.random() * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.2) continue;
        this.bricks.push({
          x: 10 + c * (brickW + 4),
          y: 70 + r * 22,
          w: brickW,
          h: 16,
          alive: true,
          color: COLORS[2]
        });
      }
    }
  },

  spawnBall(vxOverride = 0) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const spd = 5 + G.cycle * 0.2;
    this.balls.push({
      x: this.width / 2,
      y: this.paddleY - 50,
      vx: vxOverride || (Math.cos(angle) * spd),
      vy: Math.sin(angle) * spd
    });
  },

  update() {
    const speed = 7 * G.dt;
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.paddleX -= speed;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) this.paddleX += speed;

    if (G.touchDir !== 0) {
      this.paddleX += G.touchDir * speed;
    }

    if (this.paddleX < 0) this.paddleX = 0;
    if (this.paddleX > G.W() - this.paddleW) this.paddleX = G.W() - this.paddleW;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * G.dt;
      b.y += b.vy * G.dt;

      addTrail(b.x, b.y, COLORS[2]);

      // Walls
      if (b.x < this.ballR || b.x > G.W() - this.ballR) {
        b.vx *= -1;
        playSound('shoot');
      }
      if (b.y < this.ballR) {
        b.vy *= -1;
        playSound('shoot');
      }

      // Paddle
      if (b.vy > 0 && 
          b.y + this.ballR > this.paddleY &&
          b.x > this.paddleX && b.x < this.paddleX + this.paddleW) {
        b.vy *= -1;
        b.y = this.paddleY - this.ballR;
        const hit = (b.x - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2);
        b.vx += hit * 2;
        playSound('jump');
      }

      // Bricks
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (
          b.x + this.ballR > br.x &&
          b.x - this.ballR < br.x + br.w &&
          b.y + this.ballR > br.y &&
          b.y - this.ballR < br.y + br.h
        ) {
          br.alive = false;
          b.vy *= -1;
          this.bricksCleared++;
          G.carryover.bricksCleared = this.bricksCleared;
          G.score += 50;
          if (G.cycle >= 5) boss.damage(5);
          playSound('collect');
          try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
          } catch (e) {}
          spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 8);
          
          // Small chance for a new ball on brick break in high cycles
          if (G.cycle >= 4 && Math.random() < 0.05) this.spawnBall();

          if (this.bricksCleared >= this.bricksNeeded) {
            G.triggerMorph('objective');
            return;
          }
        }
      }

      // Death check for this ball
      if (b.y > G.H() + 50) {
        this.balls.splice(i, 1);
      }
    }

    if (this.balls.length === 0) {
      G.triggerMorph('death');
    }
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
    const col = COLORS[2];

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      c.fillStyle = b.color;
      c.globalAlpha = 0.9;
      c.fillRect(b.x, b.y, b.w, b.h);
      c.globalAlpha = 1;
    }

    // Paddle
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 15;
    c.fillRect(this.paddleX, this.paddleY, this.paddleW, this.paddleH);
    c.shadowBlur = 0;

    // Balls
    c.fillStyle = '#fff';
    for (const b of this.balls) {
      c.beginPath();
      c.arc(b.x, b.y, this.ballR, 0, Math.PI * 2);
      c.fill();
    }

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('БЛОКИ: ' + this.bricksCleared + ' / ' + this.bricksNeeded, G.W() / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    const b = this.balls[0] || { x: G.W()/2, y: G.H()/2 };
    return {
      mode: 2,
      px: b.x,
      py: b.y,
      paddleX: this.paddleX,
      paddleY: this.paddleY,
      paddleW: this.paddleW,
      paddleH: this.paddleH
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[2];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(snap.px, snap.py, 7 + uMorph * 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 25 : 10;
    c.fillRect(snap.paddleX, snap.paddleY, snap.paddleW, snap.paddleH);
    c.shadowBlur = 0;
    c.restore();
  }
};
