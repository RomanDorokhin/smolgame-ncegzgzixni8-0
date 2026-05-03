import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles, addTrail } from '../fx.js';
import { boss } from './boss.js';
import { playSound } from '../audio.js';

export const shooter = {
  x: 0, y: 0, w: 28, h: 28,
  bullets: [],
  enemies: [],
  kills: 0,
  killsNeeded: 8,
  spawnTimer: 0,
  width: 0, height: 0,
  shotTimer: 0,
  vy: 0,

  init() {
    this.width = G.W();
    this.height = G.H();
    this.x = this.width / 2;
    this.y = this.height - 100;
    this.bullets = [];
    this.enemies = [];
    this.kills = 0;
    const bonus = G.carryover.bricksCleared || 0;
    this.killsNeeded = Math.max(4, 8 - Math.floor(bonus / 3));
    this.spawnTimer = 0;
    this.shotTimer = 0;
    this.vy = 0;
  },

  update() {
    const mod = G.currentMod;
    let spd = 5;
    if (mod.name === 'УСКОРЕНИЕ') spd = 6.5;

    // Move
    const speed = 6 * G.dt;
    let isMovingMobile = false;

    if (G.keys['ArrowLeft'] || G.keys['KeyA']) this.x -= speed;
    if (G.keys['ArrowRight'] || G.keys['KeyD']) this.x += speed;

    if (G.touchDir !== 0) {
      this.x += G.touchDir * speed;
      isMovingMobile = true;
    }

    if (this.x < 15) this.x = 15;
    if (this.x > this.width - 15) this.x = this.width - 15;

    if (this.shotTimer > 0) this.shotTimer -= G.dt;
    if (this.shotTimer <= 0 && (G.keys['ArrowUp'] || G.keys['Space'] || isMovingMobile)) {
      this.bullets.push({ x: this.x + this.w / 2, y: this.y, vy: -10 });
      this.shotTimer = 10;
      playSound('shoot');
    }

    addTrail(this.x + this.w / 2, this.y + this.h / 2, COLORS[3]);

    for (const b of this.bullets) {
      b.y += b.vy * G.dt;
    }this.bullets = this.bullets.filter(b => b.y > -20);

    // Spawn enemies
    if (Math.random() < 0.02 + G.cycle * 0.003) {
      const isHunter = G.cycle >= 3 && Math.random() < 0.3;
      this.enemies.push({
        x: Math.random() * (this.width - 30) + 15,
        y: -20,
        vy: 1.5 + Math.random() * 1.5 + G.cycle * 0.2,
        r: isHunter ? 10 : 14,
        hp: 1,
        type: isHunter ? 'hunter' : 'asteroid'
      });
    }

    // Enemies
    for (const e of this.enemies) {
      e.y += e.vy * G.dt;
      
      if (e.type === 'hunter') {
        const dx = this.x - e.x;
        e.x += Math.sign(dx) * 1.5 * G.dt;
      }
      // Hit player
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (Math.sqrt(dx * dx + dy * dy) < e.r + 10) {
        spawnParticles(this.x, this.y, COLORS[3], 20);
        G.triggerMorph('death');
        return;
      }
    }
    this.enemies = this.enemies.filter(e => e.y < this.height + 30);

    // Bullet-enemy collisions
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (Math.sqrt(dx * dx + dy * dy) < e.r + 4) {
          e.hp = 0;
          b.y = -100; // kill bullet
          this.kills++;
          G.carryover.shooterKills = this.kills;
          G.score += 75;
          if (G.cycle >= 5) boss.damage(5);
          spawnParticles(e.x, e.y, COLORS[3], 12);
          if (this.kills >= this.killsNeeded) {
            G.triggerMorph('objective');
            return;
          }
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  },

  draw() {
    const c = G.ctx;
    const col = COLORS[3];

    // Enemies
    for (const e of this.enemies) {
      if (e.type === 'hunter') {
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.moveTo(e.x, e.y + e.r);
        c.lineTo(e.x - e.r, e.y - e.r);
        c.lineTo(e.x + e.r, e.y - e.r);
        c.fill();
      } else {
        c.fillStyle = 'rgba(255,255,255,0.3)';
        c.beginPath();
        c.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Bullets
    c.fillStyle = '#fff';
    for (const b of this.bullets) {
      c.fillRect(b.x - 2, b.y - 5, 4, 10);
    }

    // Player ship
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 20;
    c.beginPath();
    c.moveTo(this.x, this.y - 16);
    c.lineTo(this.x - 12, this.y + 12);
    c.lineTo(this.x, this.y + 6);
    c.lineTo(this.x + 12, this.y + 12);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    // Thruster
    c.fillStyle = 'rgba(255,150,50,0.6)';
    c.beginPath();
    c.moveTo(this.x - 4, this.y + 10);
    c.lineTo(this.x, this.y + 18 + Math.random() * 8);
    c.lineTo(this.x + 4, this.y + 10);
    c.fill();

    // UI
    c.fillStyle = '#fff';
    c.font = 'bold 14px Courier New';
    c.textAlign = 'center';
    c.fillText('УНИЧТОЖЕНО: ' + this.kills + ' / ' + this.killsNeeded, this.width / 2, 40);
    c.textAlign = 'left';
  },

  getSnapshot() {
    return {
      mode: 3,
      px: this.x,
      py: this.y,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[3];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 35 : 15;
    const s = 1 - uMorph * 0.3;
    c.beginPath();
    c.moveTo(snap.px, snap.py - 16 * s);
    c.lineTo(snap.px - 12 * s, snap.py + 12 * s);
    c.lineTo(snap.px, snap.py + 6 * s);
    c.lineTo(snap.px + 12 * s, snap.py + 12 * s);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    if (G.evolutionFeatures.includes('wings')) {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath();
      c.ellipse(snap.px - 18, snap.py - 2, 14, 6, -0.3, 0, Math.PI * 2);
      c.ellipse(snap.px + 18, snap.py - 2, 14, 6, 0.3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
};
