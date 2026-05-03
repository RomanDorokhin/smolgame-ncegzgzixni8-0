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
    
    if (mode === 0) { // Jumper
      if (Math.random() < 0.04) this.spawnBossHazard();
    } else if (mode === 1) { // Snake
      if (this.hazards.length < 1 && Math.random() < 0.01) this.spawnSnakeGhost();
    } else if (mode === 2) { // Arkanoid
      if (Math.random() < 0.02) this.spawnBossProjectile();
    } else if (mode === 3) { // Shooter
      if (Math.random() < 0.05) this.spawnBossProjectile();
    } else if (mode === 4) { // Flappy
      if (Math.random() < 0.03) this.spawnBossHazard();
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

  draw(skipPlayer = false) {
    const c = G.ctx;
    const w = this.width;
    const h = this.height;
    
    // Hazards
    for (const haz of this.hazards) {
      c.fillStyle = haz.color || '#ef4444';
      c.beginPath();
      c.arc(haz.x, haz.y, Math.max(0.1, haz.r), 0, Math.PI * 2);
      c.fill();
    }

    // Boss Shadow (Reflecting Player)
    c.save();
    c.globalAlpha = 0.2;
    c.fillStyle = '#fff';
    c.shadowColor = COLORS[G.gameMode];
    c.shadowBlur = 40;
    
    const time = performance.now() * 0.002;
    const ox = Math.sin(time) * 30;
    const oy = Math.cos(time * 0.5) * 20;
    
    c.translate(w / 2 + ox, h / 3 + oy);
    
    // Draw an abstract large version of current mode
    const scale = 4;
    c.scale(scale, scale);
    const modeObj = G.getModeObject();
    if (modeObj && modeObj.draw) {
        // Draw centered and simplified
        c.save();
        c.translate(-20, -20); // Center the phantom
        modeObj.draw(true); // Draw ghost version if supported
        c.restore();
    } else {
        c.beginPath();
        c.arc(0, 0, 30, 0, Math.PI * 2);
        c.fill();
    }
    c.restore();

    // Narrative floating text
    if (this.hp > 0 && this.timer % 300 < 100) {
        const lines = ["ТЫ — ЭТО Я", "ЗАЧЕМ МЕНЯТЬСЯ?", "ОСТАНЬСЯ В ЦИКЛЕ", "СТРАХ — ЭТО ТЫ"];
        c.fillStyle = "rgba(255,255,255,0.4)";
        c.font = "italic 16px Courier New";
        c.textAlign = "center";
        c.fillText(lines[G.cycle % lines.length], w/2, h/3 - 60);
    }

    // Boss Health Bar
    const barW = 240;
    const barH = 2;
    const bx = (w - barW) / 2;
    const by = 50;
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
  },

  spawnSnakeGhost() {
    this.hazards.push({
      x: Math.random() * G.W(),
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: 3,
      r: 12,
      color: '#000'
    });
  }
};

