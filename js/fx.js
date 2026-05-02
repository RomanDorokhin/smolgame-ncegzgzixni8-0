import { G } from './gameState.js';
import { COLORS } from './constants.js';

const ctx = () => G.ctx;

export function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    G.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 4,
      color
    });
  }
}

export function spawnSoulParticles(x, y, color, count, lifeMult = 1) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 60;
    G.particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * (0.5 + Math.random() * 0.5),
      vy: Math.sin(angle) * (0.5 + Math.random() * 0.5),
      life: 1,
      decay: (0.008 + Math.random() * 0.012) / lifeMult,
      size: 1 + Math.random() * 2,
      color,
      soul: true
    });
  }
}

export function updateParticles() {
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.soul) {
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy -= 0.02; // souls drift upward
    } else {
      p.vy += 0.1;
    }
    p.life -= p.decay;
  }
}

export function drawParticles() {
  const c = ctx();
  for (const p of G.particles) {
    c.globalAlpha = p.life;
    if (p.soul) {
      c.fillStyle = '#fff';
      c.shadowColor = p.color;
      c.shadowBlur = 8 * p.life;
      const s = p.size * p.life;
      c.fillRect(p.x - s/2, p.y - s/2, s, s);
      c.shadowBlur = 0;
    } else {
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

export function addTrail(x, y, color) {
  if (!G.evolutionFeatures.includes('trails')) return;
  G.trails.push({ x, y, color, life: 1 });
}

export function updateTrails() {
  G.trails = G.trails.filter(t => t.life > 0);
  for (const t of G.trails) {
    t.life -= 0.05 * G.dt;
  }
}

export function drawTrails() {
  const c = ctx();
  for (const t of G.trails) {
    c.globalAlpha = t.life * 0.3;
    c.fillStyle = t.color;
    c.beginPath();
    c.arc(t.x, t.y, 10 * t.life, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

export function initStars() {
  G.bgStars = [];
  for (let i = 0; i < 80; i++) {
    G.bgStars.push({
      x: Math.random() * G.W(),
      y: Math.random() * G.H(),
      r: Math.random() * 1.5,
      a: Math.random(),
      speed: 0.2 + Math.random() * 0.5
    });
  }
}

export function drawBg() {
  const c = ctx();
  const color = COLORS[G.gameMode];
  c.fillStyle = '#05050a';
  c.fillRect(0, 0, G.W(), G.H());
  c.globalAlpha = 0.04;
  c.fillStyle = color;
  c.fillRect(0, 0, G.W(), G.H());
  c.globalAlpha = 1;

  for (const s of G.bgStars) {
    c.globalAlpha = s.a * 0.6;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    c.fill();
    s.y += s.speed;
    if (s.y > G.H()) { s.y = 0; s.x = Math.random() * G.W(); }
  }
  c.globalAlpha = 1;
}
