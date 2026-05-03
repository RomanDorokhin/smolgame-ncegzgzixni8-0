import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

export const boss = {
  hp: 100,
  maxHp: 100,
  timer: 0,
  nextMorph: 20 * 60, // 20s at 60fps
  phase: 0,
  width: 0, height: 0,
  
  init() {
    this.width = G.W();
    this.height = G.H();
    this.hp = 80 + G.cycle * 15; // Slightly lower HP for reachability
    this.maxHp = this.hp;
    this.timer = 0;
    this.phase = 0;
    this.hazards = []; // Initialize hazards
  },

  update() {
    this.timer++;
    
    // Forced morph every 20s
    if (this.timer >= this.nextMorph) {
      this.timer = 0;
      G.triggerMorph('boss_shift');
    }

    // Boss "Attacks" based on current mode
    const mode = G.gameMode;
    
    if (mode === 0) { // Jumper - Boss drops heavy rain
      if (Math.random() < 0.05) this.spawnBossHazard();
    } else if (mode === 3) { // Shooter - Boss shoots back
      if (Math.random() < 0.03) this.spawnBossProjectile();
    }

    // Update hazards
    if (this.hazards.length > 100) this.hazards.shift(); // Cap hazards to prevent lag

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.vx) h.x += h.vx * G.dt;
      h.y += h.vy * G.dt;

      // Simple collision check with player
      let px = 0, py = 0, pr = 15;
      const m = G.getModeObject();
      if (m) {
        if (m.x !== undefined) px = m.x;
        else if (m.paddleX !== undefined) px = m.paddleX + (m.paddleW || 0) / 2;
        else if (m.body && m.body.length > 0) {
          // Fix: Use head instead of tail
          const head = m.body[m.body.length - 1];
          px = head.x * (m.cellSize || 20) + (m.fieldX || 0);
          py = head.y * (m.cellSize || 20) + (m.fieldY || 0);
        }

        if (m.y !== undefined) py = m.y;
        else if (m.paddleY !== undefined) py = m.paddleY;
      }

      const dist = Math.hypot(px - h.x, py - h.y);
      if (dist < h.r + pr) {
        G.triggerMorph('death');
      }

      if (h.y > G.H() + 50 || h.x < -50 || h.x > G.W() + 50) {
        this.hazards.splice(i, 1);
      }
    }
  },

  damage(amt) {
    this.hp -= amt;
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
    } catch (e) {}
    
    if (this.hp <= 0) {
      this.hp = 0;
      try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (e) {}
      G.showVictory();
    }
  },

  draw() {
    const c = G.ctx;
    const w = this.width;
    const h = this.height;
    
    // Hazards
    c.fillStyle = '#ef4444';
    for (const haz of this.hazards) {
      c.beginPath();
      c.arc(haz.x, haz.y, haz.r, 0, Math.PI * 2);
      c.fill();
    }

    // Boss Silhouette (Shadow Reflection)
    c.save();
    c.globalAlpha = 0.15;
    c.fillStyle = '#fff';
    c.shadowColor = COLORS[G.gameMode];
    c.shadowBlur = 40;
    
    const time = performance.now() * 0.002;
    const ox = Math.sin(time) * 20;
    const oy = Math.cos(time * 0.5) * 10;
    
    c.translate(w / 2 + ox, h / 3 + oy);
    const scale = 8 + Math.sin(time * 0.5) * 0.5;
    c.scale(scale, scale);
    
    // Simplified Boss Shape (Abstract)
    c.beginPath();
    c.arc(0, 0, 20, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Boss Health Bar
    const barW = 200;
    const barH = 4;
    const bx = (w - barW) / 2;
    const by = 40;
    
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(bx, by, barW, barH);
    
    const fillW = (this.hp / this.maxHp) * barW;
    c.fillStyle = '#fff';
    c.fillRect(bx, by, fillW, barH);
  },

  spawnBossHazard() {
    this.hazards.push({
      x: Math.random() * G.W(),
      y: -20,
      vy: 4 + Math.random() * 4,
      r: 8
    });
  },
  
  spawnBossProjectile() {
    this.hazards.push({
      x: G.W() / 2,
      y: 100,
      vx: (Math.random() - 0.5) * 6,
      vy: 4,
      r: 5
    });
  }
};

