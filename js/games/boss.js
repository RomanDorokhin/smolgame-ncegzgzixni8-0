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
    this.hp = 100 + G.cycle * 20;
    this.maxHp = this.hp;
    this.timer = 0;
    this.phase = 0;
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

    // Boss takes damage from "winning actions" in subgames
    // (This logic is tied back from subgames calling boss.damage())
  },

  damage(amt) {
    this.hp -= amt;
    if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    if (this.hp <= 0) {
      this.hp = 0;
      if (window.Telegram && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      G.showVictory();
    }
  },

  draw() {
    const c = G.ctx;
    const w = this.width;
    const h = this.height;
    
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
    
    // Draw boss as a large version of current form
    import('./' + ['jumper','snake','arkanoid','shooter','flappy'][G.gameMode] + '.js').then(m => {
       // Note: Dynamic import in draw is slow, but we'll use a cached version or simplified shape
    });
    
    // Simplified Boss Shape (Abstract)
    c.beginPath();
    c.arc(0, 0, 20, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Boss Health Bar
    const barW = 300;
    const barH = 6;
    const bx = (w - barW) / 2;
    const by = 40;
    
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.fillRect(bx, by, barW, barH);
    
    const fillW = (this.hp / this.maxHp) * barW;
    c.fillStyle = '#fff';
    c.fillRect(bx, by, fillW, barH);
    
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = '10px Courier New';
    c.textAlign = 'center';
    c.fillText('СТРАЖ ЦИКЛА', w / 2, by - 8);
  },

  hazards: [],
  spawnBossHazard() {
    this.hazards.push({
      x: Math.random() * G.W(),
      y: -20,
      vy: 4 + Math.random() * 4,
      r: 10
    });
  },
  
  spawnBossProjectile() {
    this.hazards.push({
      x: G.W() / 2,
      y: 100,
      vx: (Math.random() - 0.5) * 10,
      vy: 5,
      r: 6
    });
  }
};

