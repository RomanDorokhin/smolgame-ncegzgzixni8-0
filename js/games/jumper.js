import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';
import { triggerMorph } from '../actions.js';

export const jumper = {
  x: 0, y: 0, vy: 0,
  w: 36, h: 36,
  onGround: false,
  platforms: [],
  scrollSpeed: 2,
  jumpPressed: false,
  runDistance: 0,
  runThreshold: 2000,
  morphQueued: false,

  init() {
    this.morphQueued = false;
    this.x = G.W() * 0.2;
    this.y = G.H() - 160;
    this.vy = 0;
    this.onGround = false;
    this.jumpPressed = false;
    this.platforms = [];
    this.scrollSpeed = 2 + G.cycle * 0.4;
    this.runDistance = 0;
    this.runThreshold = 1200 + Math.random() * 1800 + G.cycle * 280;
    const groundY = G.H() - 80;
    this.platforms.push({ x: -G.W(), y: groundY, w: G.W() * 3, h: 20, color: '#333' });
    for (let i = 0; i < 8; i++) {
      this.platforms.push(this.newPlatform(G.W() * 0.4 + i * 180));
    }
  },

  newPlatform(x) {
    const groundY = G.H() - 80;
    const y = groundY - 80 - Math.random() * 200;
    const hasGap = Math.random() < 0.3;
    const w = hasGap ? 0 : 80 + Math.random() * 80;
    const roll = Math.random();
    let hasCrystal = false;
    let hasBeacon = false;
    if (!hasGap && w > 40) {
      if (roll < 0.38) hasCrystal = true;
      else if (roll < 0.58) hasBeacon = true;
    }
    return {
      x, y, w, h: 14,
      color: COLORS[0],
      isGap: hasGap,
      hasCrystal,
      crystalX: x + w * 0.5,
      crystalY: y - 24,
      crystalTaken: false,
      hasBeacon,
      beaconX: x + w * 0.5,
      beaconY: y - 36,
      beaconTaken: false
    };
  },

  tryObjectiveMorph() {
    if (this.morphQueued || G.morphing) return;
    this.morphQueued = true;
    triggerMorph('objective');
  },

  update() {
    if (this.morphQueued) return;
    const jumped = G.touchJump || G.keys['ArrowUp'] || G.keys['Space'];

    if (jumped && this.onGround && !this.jumpPressed) {
      this.vy = -14;
      this.jumpPressed = true;
      spawnParticles(this.x + this.w / 2, this.y + this.h, COLORS[0], 6);
    }
    if (!jumped) this.jumpPressed = false;

    const mod = G.currentMod;
    let finalScroll = this.scrollSpeed;
    if (mod.name === 'УСКОРЕНИЕ') finalScroll *= 1.35;
    
    let grav = 0.55;
    if (mod.name === 'ЛЕГКОСТЬ') grav *= 0.65;

    this.vy += grav;
    this.y += this.vy;
    this.onGround = false;

    let moveDir = 0;
    if (G.keys['ArrowRight']) moveDir += 1;
    if (G.keys['ArrowLeft']) moveDir -= 1;
    if (mod.name === 'ИНВЕРСИЯ') moveDir *= -1;

    if (moveDir > 0) this.x = Math.min(G.W() * 0.6, this.x + 4);
    if (moveDir < 0) this.x = Math.max(30, this.x - 4);

    for (const p of this.platforms) {
      p.x -= finalScroll;
      if (p.hasCrystal) p.crystalX -= finalScroll;
      if (p.hasBeacon) p.beaconX -= finalScroll;
    }
    this.runDistance += finalScroll;

    this.platforms = this.platforms.filter(p => p.x + p.w > -100);
    while (this.platforms.length < 10) {
      const last = this.platforms.reduce((a, b) => (a.x > b.x ? a : b));
      this.platforms.push(this.newPlatform(last.x + 120 + Math.random() * 100));
    }

    for (const p of this.platforms) {
      if (this.vy > 0 &&
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + 12) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
      if (p.hasCrystal && !p.crystalTaken) {
        const dx = (this.x + this.w / 2) - p.crystalX;
        const dy = (this.y + this.h / 2) - p.crystalY;
        if (Math.sqrt(dx * dx + dy * dy) < 22) {
          p.crystalTaken = true;
          G.score += 25;
          G.carryover.jumperCrystals++;
          spawnParticles(p.crystalX, p.crystalY, '#a78bfa', 14);
          if (G.carryover.jumperCrystals >= 3) {
            this.tryObjectiveMorph();
          }
          return;
        }
      }
      if (p.hasBeacon && !p.beaconTaken) {
        const dx = (this.x + this.w / 2) - p.beaconX;
        const dy = (this.y + this.h / 2) - p.beaconY;
        if (Math.sqrt(dx * dx + dy * dy) < 26) {
          p.beaconTaken = true;
          G.score += 40;
          spawnParticles(p.beaconX, p.beaconY, '#38bdf8', 16);
          this.tryObjectiveMorph();
          return;
        }
      }
    }

    if (this.runDistance >= this.runThreshold) {
      spawnParticles(this.x + this.w / 2, this.y + this.h / 2, '#a78bfa', 18);
      this.tryObjectiveMorph();
      return;
    }

    if (this.y > G.H() + 100) {
      spawnParticles(this.x + this.w / 2, G.H(), COLORS[0], 20);
      triggerMorph('death');
      return;
    }

    G.score += 0.02;
  },

  draw(skipPlayer = false) {
    const c = ctx();
    const COL = COLORS[0];
    for (const p of this.platforms) {
      if (p.isGap) continue;
      c.shadowColor = COL;
      c.shadowBlur = 6;
      c.fillStyle = p.color === '#333' ? '#1a1a1a' : COL;
      c.globalAlpha = p.color === '#333' ? 0.5 : 0.8;
      c.fillRect(p.x, p.y, p.w, p.h);
      c.globalAlpha = 1;
      c.shadowBlur = 0;
      if (p.hasCrystal && !p.crystalTaken) {
        const cx = p.crystalX, cy = p.crystalY;
        c.fillStyle = '#c4b5fd';
        c.shadowColor = '#8b5cf6';
        c.shadowBlur = 12;
        c.beginPath();
        c.moveTo(cx, cy - 10);
        c.lineTo(cx + 8, cy - 2);
        c.lineTo(cx + 6, cy + 8);
        c.lineTo(cx - 6, cy + 8);
        c.lineTo(cx - 8, cy - 2);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
      }
      if (p.hasBeacon && !p.beaconTaken) {
        const bx = p.beaconX, by = p.beaconY;
        const pulse = Math.sin(Date.now() * 0.004) * 4;
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 2;
        c.shadowColor = '#0ea5e9';
        c.shadowBlur = 14 + pulse;
        c.beginPath();
        c.arc(bx, by, 12 + pulse * 0.2, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = 'rgba(56,189,248,0.35)';
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.font = '9px Courier New';
        c.textAlign = 'center';
        c.fillText('◇', bx, by + 3);
        c.textAlign = 'left';
      }
    }
    
    if (skipPlayer) return;

    const px = this.x, py = this.y;
    c.shadowColor = COL;
    c.shadowBlur = 16;
    c.fillStyle = COL;
    c.fillRect(px, py, this.w, this.h);
    c.shadowBlur = 0;
    c.fillStyle = '#fff';
    c.fillRect(px + 7, py + 9, 7, 9);
    c.fillRect(px + 22, py + 9, 7, 9);
    c.fillStyle = '#000';
    c.fillRect(px + 9, py + 12, 4, 5);
    c.fillRect(px + 24, py + 12, 4, 5);

    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '10px Courier New';
    c.textAlign = 'right';
    const rd = Math.min(100, Math.floor((this.runDistance / this.runThreshold) * 100));
    c.fillText(rd + '% пути', G.W() - 14, 52);
    c.fillText(G.carryover.jumperCrystals + ' / 3 кристаллов', G.W() - 14, 70);
    c.textAlign = 'left';
  }
};

function ctx() {
  return G.ctx;
}
