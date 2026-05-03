import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const snake = {
  body: [],
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  food: [],
  shadowSnake: [],
  shadowDir: { x: 0, y: 1 },
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
    this.huntingJumper = false;
    this.jumperPrey = null;
    this.timer = 0;
    this.speed = Math.max(1, 6 - Math.floor(G.cycle * 0.8));
    this.spawnFood();
    this.spawnFood();
    this.ensureMealsOnField();

    // Shadow Snake (Enemy)
    this.shadowSnake = [];
    if (G.cycle >= 3) {
      const sx = this.gridW - 4;
      const sy = this.gridH - 4;
      for (let i = 0; i < 6; i++) this.shadowSnake.push({ x: sx, y: sy + i });
      this.shadowDir = { x: 0, y: -1 };
    }
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
    if (this.huntingJumper) return; // Don't spawn normal food during hunt
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

  spawnJumperPrey() {
    let tries = 0;
    while (tries++ < 200) {
      const x = Math.floor(Math.random() * this.gridW);
      const y = Math.floor(Math.random() * this.gridH);
      if (!this.body.find(b => b.x === x && b.y === y)) {
        this.jumperPrey = { x, y };
        return;
      }
    }
    // Fallback if no free space
    this.jumperPrey = { x: Math.floor(this.gridW / 2), y: Math.floor(this.gridH / 2) };
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
    let up = G.keys['ArrowUp'] || G.keys['KeyW'];
    let down = G.keys['ArrowDown'] || G.keys['KeyS'];
    let left = G.keys['ArrowLeft'] || G.keys['KeyA'];
    let right = G.keys['ArrowRight'] || G.keys['KeyD'];

    if (up && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (down && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (left && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (right && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };

    this.timer++;
    let finalSpeed = this.speed;
    if (G.currentMod.name === 'УСКОРЕНИЕ') finalSpeed = Math.max(1, finalSpeed - 2);

    if (this.timer < finalSpeed) return;
    this.timer = 0;
    this.dir = { ...this.nextDir };

    const head = this.body[this.body.length - 1];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;

    if (nx < 0 || nx >= this.gridW || ny < 0 || ny >= this.gridH) {
      spawnParticles(this.fieldX + head.x * this.cellSize, this.fieldY + head.y * this.cellSize, COLORS[1], 16);
      G.triggerMorph('death');
      return;
    }
    if (this.body.slice(0, -1).find(b => b.x === nx && b.y === ny)) {
      spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, COLORS[1], 16);
      G.triggerMorph('death');
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
        if (G.cycle >= 5) boss.damage(5);
        playSound('collect');
        if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#a78bfa', 12);
        if (piece.isGolden) {
          G.carryover.snakeMeals = 20; 
          G.score += 1000;
          spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#fbbf24', 40);
          G.triggerMorph('objective');
          return;
        }
      } else {
        G.score += 15;
        playSound('collect');
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#ef4444', 6);
      }

      if (this.mealsEaten >= this.mealsNeeded && !this.huntingJumper) {
        this.huntingJumper = true;
        this.food = []; // Clear all normal food
        this.spawnJumperPrey();
        return;
      }
      this.spawnFood();
      ate = true;
    }
    
    // Check Jumper Prey collision
    if (this.huntingJumper && this.jumperPrey && nx === this.jumperPrey.x && ny === this.jumperPrey.y) {
       this.mealsEaten += 10; // Massive bonus
       G.carryover.snakeMeals = this.mealsEaten;
       spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#a78bfa', 40);
       G.triggerMorph('objective');
       return;
    }

    if (!ate) this.body.shift();
    this.ensureMealsOnField();
    for (const f of this.food) f.pulse += 0.12;

    // Move Shadow Snake
    if (this.shadowSnake.length > 0) {
      if (Math.random() < 0.1) {
        const r = Math.random();
        if (r < 0.25) this.shadowDir = { x: 0, y: -1 };
        else if (r < 0.5) this.shadowDir = { x: 0, y: 1 };
        else if (r < 0.75) this.shadowDir = { x: -1, y: 0 };
        else this.shadowDir = { x: 1, y: 0 };
      }
      
      const sh = this.shadowSnake[this.shadowSnake.length - 1];
      let snx = sh.x + this.shadowDir.x;
      let sny = sh.y + this.shadowDir.y;
      
      // Wrap shadow snake
      if (snx < 0) snx = this.gridW - 1;
      if (snx >= this.gridW) snx = 0;
      if (sny < 0) sny = this.gridH - 1;
      if (sny >= this.gridH) sny = 0;
      
      this.shadowSnake.push({ x: snx, y: sny });
      this.shadowSnake.shift();

      // Check collision: Player Head hits Shadow Snake
      if (this.shadowSnake.find(s => s.x === nx && s.y === ny)) {
        spawnParticles(this.fieldX + nx * this.cellSize, this.fieldY + ny * this.cellSize, '#000', 30);
        playSound('death');
        G.triggerMorph('death');
        return;
      }
    }
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

    // Shadow Snake
    if (this.shadowSnake.length > 0) {
      c.globalAlpha = 0.4;
      c.shadowBlur = 10;
      c.shadowColor = '#fff';
      for (let i = 0; i < this.shadowSnake.length; i++) {
        const s = this.shadowSnake[i];
        c.fillStyle = '#1e1b4b'; // Deep indigo ghost
        c.beginPath();
        c.arc(fx + s.x * cs + cs / 2, fy + s.y * cs + cs / 2, cs / 2, 0, Math.PI * 2);
        c.fill();
      }
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }

    if (this.huntingJumper && this.jumperPrey) {
      const jx = fx + this.jumperPrey.x * cs;
      const jy = fy + this.jumperPrey.y * cs;
      const s = cs * 1.2;
      c.fillStyle = COLORS[0];
      c.shadowColor = COLORS[0];
      c.shadowBlur = 20;
      c.fillRect(jx, jy, s, s);
      c.fillStyle = '#fff';
      c.fillRect(jx + s*0.2, jy + s*0.2, s*0.2, s*0.2);
      c.fillRect(jx + s*0.6, jy + s*0.2, s*0.2, s*0.2);
      c.shadowBlur = 0;
      
      c.fillStyle = '#fff';
      c.font = 'bold 12px Courier New';
      c.textAlign = 'center';
      c.fillText('ПОГЛОТИ ПРЕДКА!', G.W()/2, jy - 20);
      c.textAlign = 'left';
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
  },

  getSnapshot() {
    const h = this.body[this.body.length - 1];
    const cs = this.cellSize;
    return {
      mode: 1,
      px: this.fieldX + h.x * cs + cs / 2,
      py: this.fieldY + h.y * cs + cs / 2,
      segs: this.body.map(b => ({
        x: this.fieldX + b.x * cs + cs / 2,
        y: this.fieldY + b.y * cs + cs / 2
      })),
      cs
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[1];
    const segs = snap.segs;
    if (!segs || !segs.length) return;
    
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = col;
    c.lineWidth = snap.cs * 0.85;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 12;
    c.beginPath();
    
    const isToArkanoid = G.morphFrom === 1 && G.morphTo === 2;
    
    if (isToArkanoid) {
        const head = segs[segs.length - 1];
        const paddleW = 80 + G.carryover.snakeMeals * 6;
        
        c.moveTo(head.x - (head.x - segs[0].x) * (1-uMorph), head.y);
        c.lineTo(head.x + (segs[segs.length-1].x - head.x) * (1-uMorph), head.y);
        
        const targetY = head.y;
        c.beginPath();
        for (let i = 0; i < segs.length; i++) {
            const tx = head.x + (i - segs.length/2) * (paddleW / segs.length) * uMorph;
            const ty = head.y * (1-uMorph) + targetY * uMorph;
            const x = segs[i].x * (1-uMorph) + tx * uMorph;
            const y = segs[i].y * (1-uMorph) + ty * uMorph;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
    } else {
        c.moveTo(segs[0].x, segs[0].y);
        for (let i = 1; i < segs.length; i++) c.lineTo(segs[i].x, segs[i].y);
    }
    
    if (isToArkanoid) {
        c.strokeStyle = uMorph < 0.5 ? col : COLORS[2];
    }
    
    c.stroke();
    c.shadowBlur = 0;
    
    const head = segs[segs.length - 1];
    c.fillStyle = '#fff';
    c.fillRect(head.x - 5, head.y - 5, 4, 4);
    c.fillRect(head.x + 1, head.y - 5, 4, 4);
    
    if (G.evolutionFeatures.includes('wings')) {
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath();
        c.ellipse(head.x - 10, head.y - 10, 15, 5, -0.5, 0, Math.PI*2);
        c.ellipse(head.x + 10, head.y - 10, 15, 5, 0.5, 0, Math.PI*2);
        c.fill();
    }
    c.restore();
  }
};
