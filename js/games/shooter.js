import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';
import { triggerMorph } from '../actions.js';

export const shooter = {
  ship: { x: 0, y: 0, w: 30, h: 40 },
  bullets: [],
  enemies: [],
  boss: null,
  bossMaxHP: 0,
  shootTimer: 0,
  enemyTimer: 0,
  kills: 0,
  killsNeeded: 8,
  isHuntingBird: false,
  birdPrey: null,

  init() {
    this.ship.x = G.W() / 2 - 15;
    this.ship.y = G.H() - 120;
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.isHuntingBird = false;
    this.birdPrey = null;
    this.shootTimer = 0;
    this.enemyTimer = 0;
    this.kills = 0;
    this.killsNeeded = 6 + G.cycle * 2;
    this.bossMaxHP = 20 + G.cycle * 10;
    this.hasShield = G.carryover.bricksCleared || false;
    this.shieldHP = 3;
  },

  spawnEnemy() {
    const x = 30 + Math.random() * (G.W() - 60);
    this.enemies.push({
      x, y: -30, w: 28, h: 28,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.5 + Math.random() * 1.5 + G.cycle * 0.3,
      hp: 1
    });
  },

  spawnBirdPrey(x, y) {
    this.birdPrey = { x, y };
  },

  update() {
    const mod = G.currentMod;
    let spd = 5;
    if (mod.name === 'УСКОРЕНИЕ') spd = 7;
    
    let left = G.keys['ArrowLeft'];
    let right = G.keys['ArrowRight'];
    let up = G.keys['ArrowUp'];
    let down = G.keys['ArrowDown'];
    
    if (mod.name === 'ИНВЕРСИЯ') {
      [left, right] = [right, left];
      [up, down] = [down, up];
    }

    if (left) this.ship.x = Math.max(0, this.ship.x - spd);
    if (right) this.ship.x = Math.min(G.W() - this.ship.w, this.ship.x + spd);
    if (up) this.ship.y = Math.max(G.H() * 0.3, this.ship.y - spd);
    if (down) this.ship.y = Math.min(G.H() - this.ship.h - 80, this.ship.y + spd);

    this.shootTimer++;
    if (this.shootTimer > Math.max(8 - G.cycle, 4)) {
      this.shootTimer = 0;
      this.bullets.push({ x: this.ship.x + this.ship.w / 2, y: this.ship.y, vy: -10, r: 4 });
    }

    if (!this.boss && !this.isHuntingBird) {
      this.enemyTimer++;
      if (this.enemyTimer > Math.max(40 - G.cycle * 3, 15)) {
        this.enemyTimer = 0;
        this.spawnEnemy();
      }
    }

    for (const b of this.bullets) b.y += b.vy;
    this.bullets = this.bullets.filter(b => b.y > -10);

    for (const e of this.enemies) {
      e.x += e.vx;
      e.y += e.vy;
      if (e.x < 0 || e.x > G.W()) e.vx *= -1;
    }
    this.enemies = this.enemies.filter(e => e.y < G.H() + 40);

    if (this.boss) {
      this.boss.x += this.boss.vx;
      if (this.boss.x < 40 || this.boss.x > G.W() - 80) this.boss.vx *= -1;
      this.boss.y += Math.sin(Date.now() * 0.001) * 0.5;
      this.boss.shootT++;
      if (this.boss.shootT > 30) {
        this.boss.shootT = 0;
        const angle = Math.atan2(this.ship.y - this.boss.y, this.ship.x - this.boss.x);
        this.boss.bullets.push({ x: this.boss.x + 40, y: this.boss.y + 40, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4 });
      }
      for (const bb of this.boss.bullets) { bb.x += bb.vx; bb.y += bb.vy; }
      this.boss.bullets = this.boss.bullets.filter(b => b.x > 0 && b.x < G.W() && b.y < G.H());
      for (const bb of this.boss.bullets) {
        if (Math.abs(bb.x - (this.ship.x + 15)) < 20 && Math.abs(bb.y - (this.ship.y + 20)) < 25) {
          spawnParticles(this.ship.x + 15, this.ship.y + 20, COLORS[3], 20);
          triggerMorph('death');
          return;
        }
      }
    }

    if (this.isHuntingBird && this.birdPrey) {
       const bp = this.birdPrey;
       bp.y += 1;
       if (Math.hypot(bp.x - (this.ship.x + 15), bp.y - (this.ship.y + 20)) < 30) {
          G.carryover.shooterKills = this.kills;
          spawnParticles(bp.x, bp.y, COLORS[4], 40);
          triggerMorph('objective');
          return;
       }
    }

    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (this.boss) {
        if (b.x > this.boss.x && b.x < this.boss.x + 80 && b.y > this.boss.y && b.y < this.boss.y + 60) {
          this.boss.hp--;
          this.boss.flash = 3;
          this.bullets.splice(bi, 1);
          G.score += 5;
          if (this.boss.hp <= 0) {
            spawnParticles(this.boss.x + 40, this.boss.y + 30, COLORS[3], 50);
            this.isHuntingBird = true;
            this.spawnBirdPrey(this.boss.x + 40, this.boss.y + 30);
            this.boss = null;
          }
          continue;
        }
      }
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          e.hp--;
          this.bullets.splice(bi, 1);
          G.score += 10;
          spawnParticles(b.x, b.y, COLORS[3], 6);
          if (e.hp <= 0) {
            this.enemies.splice(ei, 1);
            this.kills++;
            if (this.kills >= this.killsNeeded && !this.boss) {
              this.boss = { x: G.W() / 2 - 40, y: 80, vx: 2, hp: this.bossMaxHP, shootT: 0, bullets: [], flash: 0 };
            }
          }
          break;
        }
      }
    }

    for (const e of this.enemies) {
      if (e.x + e.w > this.ship.x && e.x < this.ship.x + this.ship.w &&
          e.y + e.h > this.ship.y && e.y < this.ship.y + this.ship.h) {
        if (this.hasShield && this.shieldHP > 0) {
          this.shieldHP--;
          if (this.shieldHP <= 0) this.hasShield = false;
          this.enemies.splice(this.enemies.indexOf(e), 1);
          spawnParticles(this.ship.x + 15, this.ship.y + 20, '#3b82f6', 10);
          continue;
        }
        spawnParticles(this.ship.x + 15, this.ship.y + 20, COLORS[3], 20);
        triggerMorph('death');
        return;
      }
    }

    if (this.boss && this.boss.flash > 0) this.boss.flash--;
    G.score += 0.02;
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
    const COL = COLORS[3];
    for (const b of this.bullets) {
      c.fillStyle = '#fff';
      c.shadowColor = COL;
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }
    for (const e of this.enemies) {
      c.fillStyle = '#ef4444';
      c.shadowColor = '#ef4444';
      c.shadowBlur = 8;
      c.beginPath();
      c.moveTo(e.x + e.w / 2, e.y);
      c.lineTo(e.x + e.w, e.y + e.h * 0.6);
      c.lineTo(e.x + e.w * 0.75, e.y + e.h);
      c.lineTo(e.x + e.w * 0.25, e.y + e.h);
      c.lineTo(e.x, e.y + e.h * 0.6);
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
    }
    if (this.boss) {
      const flash = this.boss.flash > 0;
      c.fillStyle = flash ? '#fff' : COL;
      c.shadowColor = COL;
      c.shadowBlur = 20;
      c.fillRect(this.boss.x, this.boss.y, 80, 60);
      c.shadowBlur = 0;
      const bpct = this.boss.hp / this.bossMaxHP;
      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.fillRect(G.W() / 2 - 80, 44, 160, 8);
      c.fillStyle = COL;
      c.fillRect(G.W() / 2 - 80, 44, 160 * bpct, 8);
      for (const bb of this.boss.bullets) {
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.arc(bb.x, bb.y, 5, 0, Math.PI * 2);
        c.fill();
      }
    }
    
    if (this.isHuntingBird && this.birdPrey) {
        c.fillStyle = COLORS[4];
        c.beginPath();
        c.arc(this.birdPrey.x, this.birdPrey.y, 10, 0, Math.PI * 2);
        c.fill();
    }

    if (skipPlayer) {
      if (!this.boss && !this.isHuntingBird) {
        const pct = Math.min(this.kills / this.killsNeeded, 1);
        c.fillStyle = 'rgba(255,255,255,0.1)';
        c.fillRect(G.W() / 2 - 60, 44, 120, 6);
        c.fillStyle = COL;
        c.fillRect(G.W() / 2 - 60, 44, 120 * pct, 6);
      }
      return;
    }

    c.fillStyle = COL;
    c.shadowColor = COL;
    c.shadowBlur = 16;
    c.beginPath();
    c.moveTo(this.ship.x + this.ship.w / 2, this.ship.y);
    c.lineTo(this.ship.x + this.ship.w, this.ship.y + this.ship.h);
    c.lineTo(this.ship.x + this.ship.w * 0.6, this.ship.y + this.ship.h * 0.7);
    c.lineTo(this.ship.x + this.ship.w * 0.4, this.ship.y + this.ship.h * 0.7);
    c.lineTo(this.ship.x, this.ship.y + this.ship.h);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;

    if (this.hasShield) {
      c.strokeStyle = '#3b82f6';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(this.ship.x + 15, this.ship.y + 20, 35, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.2;
      c.fillStyle = '#3b82f6';
      c.fill();
      c.globalAlpha = 1;
    }
    if (!this.boss) {
      const pct = Math.min(this.kills / this.killsNeeded, 1);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.fillRect(G.W() / 2 - 60, 44, 120, 6);
      c.fillStyle = COL;
      c.fillRect(G.W() / 2 - 60, 44, 120 * pct, 6);
    }
  }
};
