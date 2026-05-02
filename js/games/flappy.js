import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

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
  isHuntingCube: false,
  cubeCage: null,

  init() {
    this.bird.x = G.W() * 0.25;
    this.bird.y = G.H() / 2;
    this.bird.vy = 0;
    this.bird.angle = 0;
    this.pipes = [];
    this.pipeTimer = 0;
    this.pipeSpeed = 3 + G.cycle * 0.4;
    const bonusGap = Math.min(40, (G.carryover.shooterKills || 0) * 4);
    this.gap = Math.max(100, 160 - G.cycle * 10 + bonusGap);
    this.jumped = false;
    this.pipesPassed = 0;
    this.pipesNeeded = 5 + Math.floor(G.cycle * 1.2);
    this.isHuntingCube = false;
    this.cubeCage = null;
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

  spawnCubeCage() {
    this.cubeCage = {
        x: G.W() + 100,
        y: Math.random() * (G.H() - 160) + 80
    };
  },

  update() {
    const jump = G.touchJump || G.keys['ArrowUp'] || G.keys['Space'];
    if (jump && !this.jumped) {
      this.bird.vy = this.jumpForce;
      this.jumped = true;
      spawnParticles(this.bird.x, this.bird.y, COLORS[4], 5);
    }
    if (!jump) this.jumped = false;

    const mod = G.currentMod;
    let grav = this.gravity;
    if (mod.name === 'ЛЕГКОСТЬ') grav *= 0.6;
    
    this.bird.vy += grav;
    this.bird.y += this.bird.vy;
    this.bird.angle = Math.max(-0.4, Math.min(0.6, this.bird.vy * 0.06));

    let finalSpeed = this.pipeSpeed;
    if (mod.name === 'УСКОРЕНИЕ') finalSpeed *= 1.4;

    if (this.bird.y - this.bird.r < 0 || this.bird.y + this.bird.r > G.H() - 60) {
      spawnParticles(this.bird.x, this.bird.y, COLORS[4], 20);
      G.triggerMorph('death');
      return;
    }

    this.pipeTimer++;
    if (this.pipeTimer > this.pipeInterval) {
      this.pipeTimer = 0;
      this.spawnPipe();
    }

    if (this.isHuntingCube && this.cubeCage) {
       this.cubeCage.x -= finalSpeed;
       const cc = this.cubeCage;
       if (Math.hypot(cc.x - this.bird.x, cc.y - this.bird.y) < 35) {
          spawnParticles(cc.x, cc.y, COLORS[0], 40);
          G.triggerMorph('objective');
          return;
       }
       if (cc.x < -100) this.spawnCubeCage();
    }

    for (const p of this.pipes) {
      p.x -= finalSpeed;
      if (!p.passed && p.x + this.pipeW < this.bird.x) {
        p.passed = true;
        this.pipesPassed++;
        G.score += 20;
        spawnParticles(this.bird.x, this.bird.y, '#fbbf24', 4);
        if (this.pipesPassed >= this.pipesNeeded && !this.isHuntingCube) {
           this.isHuntingCube = true;
           this.spawnCubeCage();
        }
      }
      if (this.bird.x + this.bird.r > p.x && this.bird.x - this.bird.r < p.x + this.pipeW) {
        if (this.bird.y - this.bird.r < p.topH || this.bird.y + this.bird.r > p.botY) {
          spawnParticles(this.bird.x, this.bird.y, COLORS[4], 20);
          G.triggerMorph('death');
          return;
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x > -this.pipeW - 10);
    G.score += 0.03;
  },

  draw(skipPlayer = false) {
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

    if (this.isHuntingCube && this.cubeCage) {
        const cc = this.cubeCage;
        c.fillStyle = COLORS[0];
        c.shadowColor = COLORS[0];
        c.shadowBlur = 20;
        c.fillRect(cc.x - 20, cc.y - 20, 40, 40);
        c.shadowBlur = 0;
        c.fillStyle = '#fff';
        c.font = 'bold 12px Courier New';
        c.textAlign = 'center';
        c.fillText('ВЕРНИСЬ В ФОРМУ!', cc.x, cc.y - 30);
        c.textAlign = 'left';
    }

    if (skipPlayer) return;

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
  },

  getSnapshot() {
    return {
      mode: 4,
      px: this.bird.x,
      py: this.bird.y,
      r: this.bird.r,
      ang: this.bird.angle
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[4];
    
    c.save();
    c.globalAlpha = alpha;
    c.translate(snap.px, snap.py);
    c.rotate(snap.ang || 0);
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 16;
    
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
};
