import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const jumper = {
  x: 0, y: 0, vx: 0, vy: 0,
  w: 30, h: 30,
  grounded: false,
  platforms: [],
  crystals: [],
  crystalsNeeded: 5,
  crystalsCollected: 0,
  camY: 0,
  gravity: 0.5,
  jumpStr: -10,
  speed: 5,
  width: 0, height: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.x = this.width / 2;
    this.y = this.height - 120;
    this.vx = 0; this.vy = 0;
    this.grounded = false;
    this.camY = 0;
    this.crystalsCollected = 0;
    const bonus = G.carryover.flappyHeight || 0;
    this.crystalsNeeded = Math.max(3, 5 - Math.floor(bonus / 50));
    this.platforms = [];
    this.crystals = [];
    for (let i = 0; i < 12; i++) this.spawnPlatform(i);
  },

  spawnPlatform(idx) {
    const y = this.height - 80 - idx * 70;
    const w = 80 + Math.random() * 60;
    const x = Math.random() * (this.width - w);
    this.platforms.push({ x, y, w, h: 12 });
    if (idx > 0 && Math.random() < 0.6) {
      this.crystals.push({
        x: x + w / 2 - 8,
        y: y - 20,
        w: 16, h: 16,
        collected: false,
        pulse: Math.random() * 6
      });
    }
  },

  update() {
    const mod = G.currentMod;
    let g = this.gravity;
    if (mod.name === 'ЛЕГКОСТЬ') g *= 0.7;

    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.vx = -this.speed;
    else if (G.keys['ArrowRight'] || G.keys['KeyD']) this.vx = this.speed;
    else this.vx *= 0.8;

    if ((G.keys['ArrowUp'] || G.keys['Space'] || G.touchJump) && this.grounded) {
      this.vy = this.jumpStr;
      this.grounded = false;
    }

    this.vy += g;
    this.x += this.vx;
    this.y += this.vy;

    this.grounded = false;
    for (const p of this.platforms) {
      if (
        this.x + this.w / 2 > p.x &&
        this.x - this.w / 2 < p.x + p.w &&
        this.y + this.h / 2 >= p.y &&
        this.y + this.h / 2 <= p.y + p.h + 10 &&
        this.vy >= 0
      ) {
        this.y = p.y - this.h / 2;
        this.vy = 0;
        this.grounded = true;
      }
    }

    if (this.x < 0) this.x = this.width;
    if (this.x > this.width) this.x = 0;

    // Camera follow upward
    const targetCamY = Math.min(0, this.height - this.y - 200);
    this.camY += (targetCamY - this.camY) * 0.1;

    // Crystal collection
    for (const c of this.crystals) {
      if (c.collected) continue;
      if (
        this.x > c.x && this.x < c.x + c.w &&
        this.y > c.y && this.y < c.y + c.h
      ) {
        c.collected = true;
        this.crystalsCollected++;
        G.score += 100;
        G.carryover.jumperCrystals = this.crystalsCollected;
        spawnParticles(c.x + 8, c.y + 8, COLORS[0], 10);
        if (this.crystalsCollected >= this.crystalsNeeded) {
          G.triggerMorph('objective');
          return;
        }
      }
      c.pulse += 0.1;
    }

    // Death by falling
    if (this.y > this.height + 100) {
      spawnParticles(this.x, this.height, COLORS[0], 16);
      G.triggerMorph('death');
    }

    // Spawn new platforms as we go up
    const topPlatform = this.platforms[this.platforms.length - 1];
    if (topPlatform && topPlatform.y + this.camY > -100) {
      this.spawnPlatform(this.platforms.length);
    }
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[0];
    c.save();
    c.translate(0, this.camY);

    // Platforms
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (const p of this.platforms) {
      c.fillRect(p.x, p.y, p.w, p.h);
    }

    // Crystals
    for (const cr of this.crystals) {
      if (cr.collected) continue;
      const pulse = Math.sin(cr.pulse) * 3;
      c.fillStyle = '#e9d5ff';
      c.shadowColor = col;
      c.shadowBlur = 12 + pulse;
      c.fillRect(cr.x + pulse, cr.y + pulse, cr.w - pulse * 2, cr.h - pulse * 2);
      c.shadowBlur = 0;
    }

    // Player
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 15;
    c.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    c.shadowBlur = 0;

    // Eyes
    c.fillStyle = '#fff';
    c.fillRect(this.x - 8, this.y - 8, 5, 5);
    c.fillRect(this.x + 3, this.y - 8, 5, 5);

    c.restore();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('КРИСТАЛЛЫ: ' + this.crystalsCollected + ' / ' + this.crystalsNeeded, this.width / 2, 80);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 0,
      px: this.x,
      py: this.y + this.camY,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[0];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 30 : 12;
    const size = (snap.w || 30) * (0.8 + uMorph * 0.2);
    c.fillRect(snap.px - size / 2, snap.py - size / 2, size, size);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(snap.px - 8, snap.py - 8, 5, 5);
    c.fillRect(snap.px + 3, snap.py - 8, 5, 5);
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.beginPath();
      c.ellipse(snap.px - 18, snap.py - 5, 12, 5, -0.4, 0, Math.PI * 2);
      c.ellipse(snap.px + 18, snap.py - 5, 12, 5, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
