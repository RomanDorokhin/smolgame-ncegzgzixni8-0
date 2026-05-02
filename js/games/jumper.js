import { G } from '../gameState.js';
import { COLORS } from '../constants.js';
import { spawnParticles } from '../fx.js';

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
  crystalsTaken: 0,
  crystalsNeeded: 3,
  isHuntingSnake: false,
  snakeEgg: null,

  init() {
    this.morphQueued = false;
    this.x = G.W() * 0.2;
    this.y = G.H() - 160;
    this.vy = 0;
    this.onGround = false;
    this.jumpPressed = false;
    this.crystalsTaken = 0;
    this.crystalsNeeded = 3;
    this.isHuntingSnake = false;
    this.snakeEgg = null;
    this.platforms = [];
    this.scrollSpeed = 2 + G.cycle * 0.4;
    this.runDistance = 0;
    this.runThreshold = 1200 + Math.random() * 1800 + G.cycle * 280;
    const groundY = G.H() - 80;
    this.platforms.push({ x: -G.W(), y: groundY, w: G.W() * 3, h: 20, color: '#333', isGap: false });
    for (let i = 0; i < 8; i++) {
      const last = this.platforms.length > 0 ? this.platforms[this.platforms.length-1] : null;
      this.platforms.push(this.newPlatform(G.W() * 0.4 + i * 180, i === 0, last));
    }
  },

  newPlatform(x, isFirst = false, last = null) {
    const isGap = !isFirst && Math.random() < 0.25;
    const p = {
      x: last ? last.x + 150 + Math.random() * 100 : x,
      y: last ? Math.max(150, Math.min(G.H() - 150, last.y + (Math.random() - 0.5) * 200)) : G.H() - 160,
      w: isFirst ? 400 : 80 + Math.random() * 80,
      h: 15,
      isGap,
      color: isGap ? '#333' : COLORS[0],
      hasCrystal: !isGap && !isFirst && Math.random() < 0.3,
      crystalX: 0, crystalY: 0, crystalTaken: false,
      hasBeacon: !isGap && !isFirst && Math.random() < 0.05,
      beaconX: 0, beaconY: 0, beaconTaken: false,
      hasSnakeEgg: this.isHuntingSnake && !isGap && Math.random() < 0.1
    };
    if (p.hasCrystal) {
        p.crystalX = p.x + p.w * 0.5;
        p.crystalY = p.y - 24;
    }
    if (p.hasBeacon) {
        p.beaconX = p.x + p.w * 0.5;
        p.beaconY = p.y - 36;
    }
    if (p.hasSnakeEgg) {
        this.platforms.forEach(pl => pl.hasSnakeEgg = false);
    }
    return p;
  },

  tryObjectiveMorph() {
    if (this.morphQueued || G.morphing) return;
    this.morphQueued = true;
    G.triggerMorph('objective');
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
      this.platforms.push(this.newPlatform(0, false, last));
    }

    for (const p of this.platforms) {
      if (this.vy > 0 &&
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + 12) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
      if (p.hasCrystal && !p.crystalTaken && this.x + this.w > p.crystalX - 10 && this.x < p.crystalX + 10 && this.y + this.h > p.crystalY - 10 && this.y < p.crystalY + 10) {
        p.crystalTaken = true;
        this.crystalsTaken++;
        G.score += 100;
        spawnParticles(p.crystalX, p.crystalY, '#c4b5fd', 15);
        if (this.crystalsTaken >= this.crystalsNeeded) {
          this.isHuntingSnake = true;
        }
      }
      
      if (this.isHuntingSnake && p.hasSnakeEgg && this.vy > 0 && this.y + this.h >= p.y && this.y + this.h <= p.y + 15 && this.x + this.w > p.x && this.x < p.x + p.w) {
        G.carryover.jumperCrystals = this.crystalsTaken;
        spawnParticles(this.x + this.w/2, this.y + this.h, COLORS[1], 40);
        G.triggerMorph('objective');
        return;
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
      G.triggerMorph('death');
      return;
    }

    G.score += 0.02;
  },

  draw(skipPlayer = false) {
    const c = G.ctx;
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
      if (p.hasSnakeEgg) {
        const ex = p.x + p.w / 2, ey = p.y - 15;
        const pulse = Math.sin(Date.now() * 0.005) * 5;
        c.fillStyle = COLORS[1];
        c.shadowColor = COLORS[1];
        c.shadowBlur = 15 + pulse;
        c.beginPath();
        c.ellipse(ex, ey, 12 + pulse*0.2, 18 + pulse*0.3, 0, 0, Math.PI*2);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#fff';
        c.font = 'bold 9px Courier New';
        c.textAlign = 'center';
        c.fillText('ЯЙЦО', ex, ey + 4);
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
  },

  getSnapshot() {
    return {
      mode: 0,
      px: this.x + this.w / 2,
      py: this.y + this.h / 2,
      w: this.w,
      h: this.h
    };
  },

  drawSnapshot(snap, alpha, uMorph) {
    const c = G.ctx;
    const col = COLORS[0];
    const s = 1 + Math.sin(uMorph * Math.PI) * 0.15;
    
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = G.evolutionFeatures.includes('glow') ? 40 : 20;
    
    if (G.evolutionFeatures.includes('aura')) {
        c.strokeStyle = 'rgba(255,255,255,0.4)';
        c.lineWidth = 2;
        c.strokeRect(snap.px - (snap.w * s) / 2 - 5, snap.py - (snap.h * s) / 2 - 5, snap.w * s + 10, snap.h * s + 10);
    }
    
    c.fillRect(snap.px - (snap.w * s) / 2, snap.py - (snap.h * s) / 2, snap.w * s, snap.h * s);
    c.shadowBlur = 0;
    
    c.fillStyle = '#fff';
    c.fillRect(snap.px - 10, snap.py - 8, 6, 7);
    c.fillRect(snap.px + 2, snap.py - 8, 6, 7);
    c.restore();
  }
};
