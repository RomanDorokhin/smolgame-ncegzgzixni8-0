import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';
import { triggerMorph } from '../actions.js';

export const snake = {
  body: [],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: [],
  mealsEaten: 0,
  mealsNeeded: 5,
  cellSize: 20,
  gridW: 0, gridH: 0,
  timer: 0,
  speed: 6,
  fieldX: 0, fieldY: 60,
  fieldW: 0, fieldH: 0,

  init() {
    this.cellSize = Math.floor(Math.min(G.W(), G.H() * 0.7) / 20);
    this.gridW = Math.floor(G.W() / this.cellSize);
    this.gridH = Math.floor((G.H() - 140) / this.cellSize);
    this.fieldX = Math.floor((G.W() - this.gridW * this.cellSize) / 2);
    this.fieldY = 60;
    this.fieldW = this.gridW * this.cellSize;
    this.fieldH = this.gridH * this.cellSize;
    this.body = [];
    const cx = Math.floor(this.gridW / 2);
    const cy = Math.floor(this.gridH / 2);
    const bonus = G.carryover.jumperCrystals || 0;
    for (let i = 4 + bonus; i >= 0; i--) this.body.push({ x: cx - i, y: cy });
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = [];
    this.mealsEaten = 0;
    this.mealsNeeded = 4 + Math.floor(G.cycle * 0.5);
    this.timer = 0;
    this.speed = Math.max(1, 6 - Math.floor(G.cycle * 0.8));
    this.spawnFood();
    this.spawnFood();
    this.ensureMealsOnField();
  },

  spawnFood() {
    let tries = 0;
    while (tries++ < 100) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: false, pulse: 0 });
        return;
      }
    }
  },

  countMealsOnFood() {
    return this.food.filter(f => f.isMeal).length;
  },

  ensureMealsOnField() {
    const need = 2 - this.countMealsOnFood();
    for (let k = 0; k < need; k++) this.spawnMeal();
    if (Math.random() < 0.005 && !this.food.find(f => f.isGolden)) {
      this.spawnGoldenFood();
    }
  },

  spawnGoldenFood() {
    let tries = 0;
    while (tries++ < 120) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: true, isGolden: true, pulse: 0 });
        return;
      }
    }
  },

  spawnMeal() {
    let tries = 0;
    while (tries++ < 120) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y) && !this.food.find(f => f.x === x && f.y === y)) {
        this.food.push({ x, y, isMeal: true, pulse: Math.random() * 6 });
        return;
      }
    }
  },

  update() {
    const mod = G.currentMod;
    let up = G.keys['ArrowUp'];
    let down = G.keys['ArrowDown'];
    let left = G.keys['ArrowLeft'];
    let right = G.keys['ArrowRight'];

    if (mod.name === 'ИНВЕРСИЯ') {
      [up, down] = [down, up];
      [left, right] = [right, left];
    }

    if (up && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (down && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (left && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (right && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };

    this.timer++;
    let finalSpeed = this.speed;
    if (mod.name === 'УСКОРЕНИЕ') finalSpeed = Math.max(1, finalSpeed - 2);

    if (this.timer < finalSpeed) return;
    this.timer = 0;
    this.dir = { ...this.nextDir };

    const head = this.body[this.body.length - 1];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    if (nx < 0 || nx >= this.gridW || ny < 0 || ny >= this.gridH) {
      spawnParticles(this.fieldX + head.x * this.cellSize, this.fieldY + head.y * this.cellSize, COLORS[1], 16);
      triggerMorph('death');
      return;
    }
    if (this.body.slice(0, -1).find(b => b.x === nx && b.y === ny)) {
      spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, COLORS[1], 16);
      triggerMorph('death');
      return;
    }

    this.body.push({ x: nx, y: ny });
    let ate = false;

    const fi = this.food.findIndex(f => f.x === nx && f.y === ny);
    if (fi !== -1) {
      const piece = this.food[fi];
      this.food.splice(fi, 1);
      
      this.mealsEaten++; // Every piece counts now
      
      if (piece.isMeal) {
        G.score += 50;
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#a78bfa', 12);
        if (piece.isGolden) {
          G.carryover.snakeMeals = 20; 
          G.score += 1000;
          spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#fbbf24', 40);
          triggerMorph('objective');
          return;
        }
      } else {
        G.score += 15;
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#ef4444', 6);
      }

      if (this.mealsEaten >= this.mealsNeeded) {
        G.carryover.snakeMeals = this.mealsEaten;
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#fff', 35);
        
        // Force trigger morph even if some flags are weird
        const { triggerMorph } = await import('../actions.js');
        triggerMorph('objective');
        return;
      }
      this.spawnFood();
      ate = true;
    }
    if (!ate) this.body.shift();
    this.ensureMealsOnField();
    for (const f of this.food) f.pulse += 0.12;
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
    const COL = COLORS[1];
    const cs = this.cellSize;
    const fx = this.fieldX, fy = this.fieldY;

    c.strokeStyle = COL;
    c.globalAlpha = 0.3;
    c.lineWidth = 1;
    c.strokeRect(fx, fy, this.fieldW, this.fieldH);
    c.globalAlpha = 1;

    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.shadowColor = COL;
    c.shadowBlur = 10;
    c.fillText('ПОГЛОЩЕНИЕ: ' + this.mealsEaten + ' / ' + this.mealsNeeded, G.W() / 2, fy - 15);
    c.shadowBlur = 0;
    c.textAlign = 'left';

    for (const f of this.food) {
      if (f.isMeal) {
        const pulse = Math.sin(f.pulse) * 2;
        c.fillStyle = '#e9d5ff';
        c.shadowColor = '#a78bfa';
        c.shadowBlur = 12 + pulse;
        c.beginPath();
        c.arc(fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2, cs / 2 - 2 + pulse * 0.3, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
        if (f.isGolden) {
          c.fillStyle = '#fff';
          c.font = '12px serif';
          c.textAlign = 'center';
          c.fillText('★', fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2 + 4);
          c.textAlign = 'left';
        }
      } else {
        c.fillStyle = '#ef4444';
        c.shadowColor = '#ef4444';
        c.shadowBlur = 10;
        c.beginPath();
        c.arc(fx + f.x * cs + cs / 2, fy + f.y * cs + cs / 2, cs / 2 - 2, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
      }
    }

    if (skipPlayer) return;

    for (let i = 0; i < this.body.length; i++) {
      const b = this.body[i];
      const t = i / this.body.length;
      c.fillStyle = COL;
      c.globalAlpha = 0.4 + t * 0.6;
      c.shadowColor = COL;
      c.shadowBlur = i === this.body.length - 1 ? 12 : 4;
      const pad = i === this.body.length - 1 ? 1 : 2;
      c.fillRect(fx + b.x * cs + pad, fy + b.y * cs + pad, cs - pad * 2, cs - pad * 2);
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }
    const h = this.body[this.body.length - 1];
    c.fillStyle = '#fff';
    const hx = fx + h.x * cs + 4;
    const hy = fy + h.y * cs + 4;
    c.fillRect(hx, hy, 4, 4);
    c.fillRect(hx + cs - 10, hy, 4, 4);
  }
};
