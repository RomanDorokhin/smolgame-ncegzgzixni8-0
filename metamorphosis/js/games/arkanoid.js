import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const arkanoid = {
  paddleX: 0, paddleY: 0, paddleW: 100, paddleH: 14,
  ballX: 0, ballY: 0, ballVX: 0, ballVY: 0, ballR: 7,
  bricks: [],
  bricksNeeded: 10,
  bricksCleared: 0,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.paddleY = this.height - 60;
    this.paddleX = this.width / 2 - this.paddleW / 2;
    this.paddleW = 80 + (G.carryover.snakeMeals || 0) * 6;
    const bonus = G.carryover.snakeMeals || 0;
    this.bricksNeeded = Math.max(5, 10 - Math.floor(bonus / 3));
    this.bricksCleared = 0;
    this.resetBall();
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

  resetBall() {
    this.ballX = this.width / 2;
    this.ballY = this.height - 120;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const spd = 5 + G.cycle * 0.5;
    this.ballVX = Math.cos(angle) * spd;
    this.ballVY = Math.sin(angle) * spd;
  },

  update() {
    const mod = G.currentMod;
    let spdMult = 1;
    if (mod.name === 'УСКОРЕНИЕ') spdMult = 1.25;

    // Paddle movement
    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.paddleX -= 7;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) this.paddleX += 7;
    this.paddleX = Math.max(0, Math.min(this.width - this.paddleW, this.paddleX));

    // Ball
    this.ballX += this.ballVX * spdMult;
    this.ballY += this.ballVY * spdMult;

    // Walls
    if (this.ballX < this.ballR || this.ballX > this.width - this.ballR) this.ballVX *= -1;
    if (this.ballY < this.ballR) this.ballVY *= -1;

    // Paddle collision
    if (
      this.ballY + this.ballR >= this.paddleY &&
      this.ballY - this.ballR <= this.paddleY + this.paddleH &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + this.paddleW &&
      this.ballVY > 0
    ) {
      const hit = (this.ballX - this.paddleX) / this.paddleW - 0.5;
      this.ballVY = -Math.abs(this.ballVY);
      this.ballVX += hit * 4;
    }

    // Death
    if (this.ballY > this.height + 20) {
      spawnParticles(this.ballX, this.height - 10, COLORS[2], 14);
      G.triggerMorph('death');
      return;
    }

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (
        this.ballX + this.ballR > b.x &&
        this.ballX - this.ballR < b.x + b.w &&
        this.ballY + this.ballR > b.y &&
        this.ballY - this.ballR < b.y + b.h
      ) {
        b.alive = false;
        this.ballVY *= -1;
        this.bricksCleared++;
        G.carryover.bricksCleared = this.bricksCleared;
        G.score += 50;
        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 8);
        if (this.bricksCleared >= this.bricksNeeded) {
          G.triggerMorph('objective');
          return;
        }
      }
    }
  },

  draw() {
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

    // Ball
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
    c.fill();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('БЛОКИ: ' + this.bricksCleared + ' / ' + this.bricksNeeded, this.width / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 2,
      px: this.ballX,
      py: this.ballY,
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
