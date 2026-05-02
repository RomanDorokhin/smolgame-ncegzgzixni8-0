import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const arkanoid = {
  ball: { x: 0, y: 0, vx: 3, vy: -4, r: 8 },
  paddle: { x: 0, y: 0, w: 90, h: 12, speed: 7 },
  bricks: [],
  brickCols: 7,
  brickW: 0, brickH: 22,
  brickPad: 5,
  fieldX: 20, fieldY: 60,
  fieldW: 0,
  bricksJustCleared: false,

  init() {
    this.bricksJustCleared = false;
    this.fieldW = G.W() - 40;
    this.fieldX = 20;
    this.paddle.w = 90 + (G.carryover.snakeMeals || 0) * 8;
    this.paddle.x = G.W() / 2 - this.paddle.w / 2;
    this.paddle.y = G.H() - 100;
    this.brickW = Math.floor((this.fieldW - (this.brickCols + 1) * this.brickPad) / this.brickCols);
    this.bricks = [];
    this.isHuntingShooter = false;
    this.shipCore = null;
    const rows = 3 + G.cycle;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.brickCols; c++) {
        const bx = this.fieldX + this.brickPad + c * (this.brickW + this.brickPad);
        const by = this.fieldY + 20 + r * (this.brickH + this.brickPad);
        this.bricks.push({
          x: bx, y: by, w: this.brickW, h: this.brickH,
          hp: r < 2 ? 1 : 2,
          special: (r === rows - 1 && c === Math.floor(this.brickCols / 2)),
          color: COLORS[2]
        });
      }
    }
    this.ball.x = G.W() / 2;
    this.ball.y = this.paddle.y - 20;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const spd = 5 + G.cycle * 0.5;
    this.ball.vx = Math.cos(angle) * spd;
    this.ball.vy = Math.sin(angle) * spd;
  },

  update() {
    if (this.bricksJustCleared && G.morphing) return;
    if (this.bricksJustCleared && !G.morphing) {
      this.bricksJustCleared = false;
      return;
    }

    const mod = G.currentMod;
    let left = G.keys['ArrowLeft'];
    let right = G.keys['ArrowRight'];
    if (mod.name === 'ИНВЕРСИЯ') [left, right] = [right, left];

    if (left) this.paddle.x = Math.max(this.fieldX, this.paddle.x - this.paddle.speed);
    if (right) this.paddle.x = Math.min(this.fieldX + this.fieldW - this.paddle.w, this.paddle.x + this.paddle.speed);

    let spdMult = 1;
    if (mod.name === 'УСКОРЕНИЕ') spdMult = 1.35;

    this.ball.x += this.ball.vx * spdMult;
    this.ball.y += this.ball.vy * spdMult;

    if (this.ball.x - this.ball.r < this.fieldX) { this.ball.x = this.fieldX + this.ball.r; this.ball.vx *= -1; }
    if (this.ball.x + this.ball.r > this.fieldX + this.fieldW) { this.ball.x = this.fieldX + this.fieldW - this.ball.r; this.ball.vx *= -1; }
    if (this.ball.y - this.ball.r < this.fieldY) { this.ball.y = this.fieldY + this.ball.r; this.ball.vy *= -1; }

    if (this.ball.y > G.H() + 30) {
      spawnParticles(this.ball.x, G.H() - 50, COLORS[2], 16);
      G.triggerMorph('death');
      return;
    }

    const px = this.paddle.x, py = this.paddle.y;
    if (this.ball.y + this.ball.r > py && this.ball.y < py + this.paddle.h &&
        this.ball.x > px && this.ball.x < px + this.paddle.w && this.ball.vy > 0) {
      const rel = (this.ball.x - (px + this.paddle.w / 2)) / (this.paddle.w / 2);
      const angle = rel * (Math.PI / 3) - Math.PI / 2;
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
      this.ball.vx = Math.cos(angle) * spd;
      this.ball.vy = Math.sin(angle) * spd;
      this.ball.y = py - this.ball.r;
      spawnParticles(this.ball.x, py, COLORS[2], 4);
    }

    for (let i = this.bricks.length - 1; i >= 0; i--) {
      const b = this.bricks[i];
      if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w &&
          this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
        const overlapLeft = (this.ball.x + this.ball.r) - b.x;
        const overlapRight = (b.x + b.w) - (this.ball.x - this.ball.r);
        const overlapTop = (this.ball.y + this.ball.r) - b.y;
        const overlapBottom = (b.y + b.h) - (this.ball.y - this.ball.r);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapLeft || minOverlap === overlapRight) this.ball.vx *= -1;
        else this.ball.vy *= -1;

        b.hp--;
        G.score += 10;
        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, COLORS[2], 6);
        if (b.special) {
          G.score += 100;
          this.ball.vx *= 1.2;
          this.ball.vy *= 1.2;
          spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#fff', 20);
        }
        if (b.hp <= 0) {
          this.bricks.splice(i, 1);
          if (this.bricks.length === 0) {
             this.isHuntingShooter = true;
             this.spawnShipCore();
          }
        }
      }
    }

    if (this.isHuntingShooter && this.shipCore) {
       this.shipCore.y += 3;
       const sc = this.shipCore;
       if (sc.y + sc.h > this.paddle.y && sc.x + sc.w > this.paddle.x && sc.x < this.paddle.x + this.paddle.w) {
          G.carryover.bricksCleared = true;
          spawnParticles(sc.x + sc.w/2, sc.y + sc.h/2, COLORS[3], 40);
          G.triggerMorph('objective');
          return;
       }
       if (sc.y > G.H()) this.spawnShipCore(); // Respawn if missed
    }

    G.score += 0.01;
  },

  spawnShipCore() {
    this.shipCore = {
        x: G.W() / 2 - 20,
        y: 100,
        w: 40,
        h: 40
    };
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
    const COL = COLORS[2];
    for (const b of this.bricks) {
      c.fillStyle = b.special ? '#fff' : COL;
      c.globalAlpha = b.hp > 1 ? 1 : 0.6;
      c.shadowColor = b.special ? '#fff' : COL;
      c.shadowBlur = b.special ? 14 : 6;
      c.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      c.globalAlpha = 1;
      c.shadowBlur = 0;
    }
    
    if (skipPlayer) return;

    c.fillStyle = COL;
    c.shadowColor = COL;
    c.shadowBlur = 10;
    c.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.shadowColor = '#fff';
    c.shadowBlur = 14;
    c.beginPath();
    c.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    if (this.isHuntingShooter && this.shipCore) {
        const sc = this.shipCore;
        c.fillStyle = COLORS[3];
        c.shadowColor = COLORS[3];
        c.shadowBlur = 20;
        c.beginPath();
        c.moveTo(sc.x + sc.w/2, sc.y);
        c.lineTo(sc.x + sc.w, sc.y + sc.h);
        c.lineTo(sc.x, sc.y + sc.h);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
        
        c.fillStyle = '#fff';
        c.font = 'bold 12px Courier New';
        c.textAlign = 'center';
        c.fillText('ПОЙМАЙ ЯДРО!', G.W()/2, sc.y - 10);
        c.textAlign = 'left';
    }
    }
  },

  getSnapshot() {
    return {
      mode: 2,
      px: this.ball.x,
      py: this.ball.y,
      r: this.ball.r,
      paddleY: this.paddle.y,
      paddleW: this.paddle.w,
      paddleH: this.paddle.h,
      paddleX: this.paddle.x
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[2];
    
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 14;
    c.fillRect(snap.paddleX, snap.paddleY, snap.paddleW, snap.paddleH);
    
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(snap.px, snap.py, snap.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.restore();
  }
};
