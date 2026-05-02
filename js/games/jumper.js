import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { playSound } from '../audio.js';
import { boss } from './boss.js';

export const jumper = {
  x: 0, y: 0, vx: 0, vy: 0,
  w: 36, h: 36,
  grounded: false,
  camY: 0,
  crystals: [],
  platforms: [],
  crystalsCollected: 0,
  crystalsNeeded: 5,

  init() {
    this.x = G.W() / 2 - 18;
    this.y = G.H() - 100;
    this.vx = 0; this.vy = 0;
    this.camY = this.y - G.H() * 0.7;
    this.crystals = [];
    this.platforms = [];
    this.crystalsCollected = 0;
    this.crystalsNeeded = 5 + G.cycle * 2;

    // Start platform
    this.platforms.push({ x: this.x - 50, y: this.y + 40, w: 140, h: 20 });
    
    // Gen platforms
    let curY = this.y - 100;
    for (let i = 0; i < 40; i++) {
      const pw = 80 + Math.random() * 60;
      this.platforms.push({
        x: Math.random() * (G.W() - pw),
        y: curY,
        w: pw,
        h: 15
      });
      if (Math.random() < 0.4) {
        this.crystals.push({
          x: this.platforms[this.platforms.length - 1].x + pw / 2 - 8,
          y: curY - 30,
          w: 16, h: 16,
          collected: false,
          pulse: Math.random() * 10
        });
      }
      curY -= 120 + Math.random() * 40;
    }
  },

  update() {
    const g = 0.4 * G.dt;
    const speed = 5 * G.dt;
    const jump = -11;

    if (G.keys['ArrowLeft']) this.vx = -speed;
    else if (G.keys['ArrowRight']) this.vx = speed;
    else this.vx *= 0.8;

    this.vy += g;
    this.x += this.vx;
    this.y += this.vy * G.dt;

    if (G.touchJump && this.grounded) {
      this.vy = jump;
      this.grounded = false;
      playSound('jump');
    }
    if (G.keys['ArrowUp'] && this.grounded) {
      this.vy = jump;
      this.grounded = false;
      playSound('jump');
    }

    addTrail(this.x + 18, this.y + 18, COLORS[0]);

    // Bounds
    if (this.x < 0) this.x = 0;
    if (this.x > G.W() - this.w) this.x = G.W() - this.w;

    // Platforms
    this.grounded = false;
    for (const p of this.platforms) {
      if (this.vy > 0 && 
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + this.vy * G.dt + 2) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
      }
    }

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
        if (G.cycle >= 5) boss.damage(5);
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
