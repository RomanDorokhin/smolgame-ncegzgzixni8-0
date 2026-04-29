import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';
import { triggerMorph } from '../actions.js';

export const flappy = {
  bird: { x: 0, y: 0, vy: 0, r: 14, angle: 0 },
  pipes: [],
  pipesPassed: 0,
  pipesNeeded: 6,
  pipeW: 52,
  gap: 160,
  pipeSpeed: 3,
  pipeTimer: 0,
  pipeInterval: 110,
  gravity: 0.45,
  jumpForce: -8,
  jumped: false,

  init() {
    this.bird.x = G.W() * 0.25;
    this.bird.y = G.H() / 2;
    this.bird.vy = 0;
    this.bird.angle = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.pipeSpeed = 3 + G.cycle * 0.4;
    this.gap = Math.max(110, 160 - G.cycle * 10);
    this.jumped = false;
    this.pipesPassed = 0;
    this.pipesNeeded = 5 + Math.floor(G.cycle * 1.2);
  },

  spawnPipe() {
    const minY = 100;
    const maxY = G.H() - 160;
    const gapY = minY + Math.random() * (maxY - minY);
    this.pipes.push({
      x: G.W() + this.pipeW,
      topH: gapY - this.gap / 2,
      botY: gapY + this.gap / 2,
      passed: false
    });
  },

  update() {
    const jump = G.touchJump || G.keys['ArrowUp'] || G.keys['Space'];
    if (jump && !this.jumped) {
      this.bird.vy = this.jumpForce;
      this.jumped = true;
      spawnParticles(this.bird.x, this.bird.y, COLORS[4], 5);
    }
    if (!jump) this.jumped = false;

    this.bird.vy += this.gravity;
    this.bird.y += this.bird.vy;
    this.bird.angle = Math.max(-0.4, Math.min(0.6, this.bird.vy * 0.06));

    if (this.bird.y - this.bird.r < 0 || this.bird.y + this.bird.r > G.H() - 60) {
      spawnParticles(this.bird.x, this.bird.y, COLORS[4], 20);
      triggerMorph('death');
      return;
    }

    this.pipeTimer++;
    if (this.pipeTimer > this.pipeInterval) {
      this.pipeTimer = 0;
      this.spawnPipe();
    }

    for (const p of this.pipes) {
      p.x -= this.pipeSpeed;
      if (!p.passed && p.x + this.pipeW < this.bird.x) {
        p.passed = true;
        this.pipesPassed++;
        G.score += 20;
        spawnParticles(this.bird.x, this.bird.y, '#fbbf24', 4);
        if (this.pipesPassed >= this.pipesNeeded) {
          spawnParticles(this.bird.x, this.bird.y, '#fff', 28);
          triggerMorph('objective');
          return;
        }
      }
      if (this.bird.x + this.bird.r > p.x && this.bird.x - this.bird.r < p.x + this.pipeW) {
        if (this.bird.y - this.bird.r < p.topH || this.bird.y + this.bird.r > p.botY) {
          spawnParticles(this.bird.x, this.bird.y, COLORS[4], 20);
          triggerMorph('death');
          return;
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 10);
    G.score += 0.03;
  },

  draw() {
    const c = G.ctx;
    const COL = COLORS[4];
    for (const p of this.pipes) {
      c.fillStyle = COL;
      c.shadowColor = COL;
      c.shadowBlur = 8;
      c.fillRect(p.x, 0, this.pipeW, p.topH);
      c.fillRect(p.x, p.botY, this.pipeW, G.H() - p.botY);
      c.shadowBlur = 0;
      c.fillStyle = COL;
      c.globalAlpha = 0.7;
      c.fillRect(p.x - 4, p.topH - 16, this.pipeW + 8, 16);
      c.fillRect(p.x - 4, p.botY, this.pipeW + 8, 16);
      c.globalAlpha = 1;
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.font = '11px Courier New';
    c.textAlign = 'center';
    c.fillText(this.pipesPassed + ' / ' + this.pipesNeeded + ' препятствий', G.W() / 2, 52);
    c.textAlign = 'left';
    c.fillRect(0, G.H() - 60, G.W(), 60);

    c.save();
    c.translate(this.bird.x, this.bird.y);
    c.rotate(this.bird.angle);
    c.fillStyle = COL;
    c.shadowColor = COL;
    c.shadowBlur = 16;
    c.beginPath();
    c.ellipse(0, 0, this.bird.r, this.bird.r * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.ellipse(-4, 2, 8, 5, -0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(6, -3, 4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#000';
    c.beginPath();
    c.arc(7, -3, 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fbbf24';
    c.beginPath();
    c.moveTo(12, -1);
    c.lineTo(18, 2);
    c.lineTo(12, 5);
    c.closePath();
    c.fill();
    c.restore();
  }
};
