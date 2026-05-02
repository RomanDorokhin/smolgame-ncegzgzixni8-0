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
    if (this.hp <= 0) {
      this.hp = 0;
      G.showVictory();
    }
  },

  draw() {
    const c = G.ctx;
    const w = this.width;
    
    // Boss Health Bar
    const barW = 300;
    const barH = 10;
    const bx = (w - barW) / 2;
    const by = 60;
    
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(bx, by, barW, barH);
    
    const fillW = (this.hp / this.maxHp) * barW;
    c.fillStyle = '#fff';
    c.shadowColor = '#fff';
    c.shadowBlur = 15;
    c.fillRect(bx, by, fillW, barH);
    c.shadowBlur = 0;
    
    c.fillStyle = '#fff';
    c.font = 'bold 10px Courier New';
    c.textAlign = 'center';
    c.fillText('СТРАЖ ЦИКЛА', w / 2, by - 10);
  },

  spawnBossHazard() {
    // Logic for jumper hazards
  },
  
  spawnBossProjectile() {
    // Logic for shooter backfire
  }
};
