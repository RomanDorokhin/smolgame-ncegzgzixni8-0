import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const flappy = {
  x: 0, y: 0, vy: 0,
  w: 20, h: 20,
  pipes: [],
  pipeTimer: 0,
  distance: 0,
  distanceNeeded: 20,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.x = this.width * 0.25;
    this.y = this.height / 2;
    this.vy = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.distance = 0;
    const bonus = G.carryover.shooterKills || 0;
    this.distanceNeeded = Math.max(10, 20 - Math.floor(bonus / 2));
    G.carryover.flappyHeight = 0;
  },

  update() {
    const mod = G.currentMod;
    let g = 0.4;
    let jump = -6;
    if (mod.name === 'ЛЕГКОСТЬ') { g = 0.28; jump = -5; }
    if (mod.name === 'УСКОРЕНИЕ') { g = 0.55; }

    this.vy += g;
    this.y += this.vy;

    if (G.keys['Space'] || G.keys['ArrowUp'] || G.touchJump) {
      if (this.vy > -2) this.vy = jump;
    }

    // Bounds
    if (this.y < 0 || this.y > this.height) {
      spawnParticles(this.x, this.y < 0 ? 0 : this.height, COLORS[4], 14);
      G.triggerMorph('death');
      return;
    }

    // Pipes
    this.pipeTimer++;
    const spawnRate = mod.name === 'УСКОРЕНИЕ' ? 70 : 100;
    if (this.pipeTimer > spawnRate) {
      this.pipeTimer = 0;
      const gap = 100 - Math.min(40, G.cycle * 6);
      const topH = 60 + Math.random() * (this.height - gap - 140);
      this.pipes.push({
        x: this.width,
        topH: topH,
        gap: gap,
        passed: false
      });
    }

    const scroll = 2.5 + G.cycle * 0.3;
    for (const p of this.pipes) {
      p.x -= scroll;
      if (!p.passed && p.x + 50 < this.x) {
        p.passed = true;
        this.distance++;
        G.score += 50;
        G.carryover.flappyHeight = this.distance * 10;
        if (this.distance >= this.distanceNeeded) {
          G.triggerMorph('objective');
          return;
        }
      }
      // Collision
      if (p.x < this.x + 8 && p.x + 50 > this.x - 8) {
        if (this.y - 8 < p.topH || this.y + 8 > p.topH + p.gap) {
          spawnParticles(this.x, this.y, COLORS[4], 16);
          G.triggerMorph('death');
          return;
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -60);
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[4];

    // Pipes
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (const p of this.pipes) {
      c.fillRect(p.x, 0, 50, p.topH);
      c.fillRect(p.x, p.topH + p.gap, 50, this.height - p.topH - p.gap);
    }

    // Soul / Bird
    c.save();
    c.translate(this.x, this.y);
    const rot = Math.atan2(this.vy, 8) * 0.5;
    c.rotate(rot);

    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 25;
    c.beginPath();
    c.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Eyes
    c.fillStyle = '#fff';
    c.fillRect(4, -4, 3, 3);

    // Wings (ethereal)
    const wingFlap = Math.sin(Date.now() * 0.008) * 6;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(-6, -2 + wingFlap, 14, 5, -0.4, 0, Math.PI * 2);
    c.ellipse(6, -2 - wingFlap, 14, 5, 0.4, 0, Math.PI * 2);
    c.fill();

    if (G.evolutionFeatures.includes('aura')) {
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 28 + Math.sin(Date.now() * 0.003) * 4, 0, Math.PI * 2);
      c.stroke();
    }

    c.restore();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('ПРОЛЁТ: ' + this.distance + ' / ' + this.distanceNeeded, this.width / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 4,
      px: this.x,
      py: this.y,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[4];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 40 : 20;
    const s = (snap.w || 20) * (0.9 + uMorph * 0.1);
    c.beginPath();
    c.ellipse(snap.px, snap.py, s * 0.6, s * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(snap.px + 3, snap.py - 4, 3, 3);
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath();
      c.ellipse(snap.px - 14, snap.py - 2, 18, 6, -0.4, 0, Math.PI * 2);
      c.ellipse(snap.px + 14, snap.py - 2, 18, 6, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
