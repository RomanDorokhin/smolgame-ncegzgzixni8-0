import { G } from './gameState.js';

export function bindInput(canvas) {
  if (!G) return;

  // Key handlers
  window.addEventListener('keydown', e => { G.keys[e.code] = true; });
  window.addEventListener('keyup', e => { G.keys[e.code] = false; });

  // Touch state
  let touchStartX = 0;
  let touchStartY = 0;
  let lastTouchX = 0;

  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    lastTouchX = t.clientX;
    
    // Tap to jump for Jumper (0) or Flappy (4)
    if (G.gameMode === 0 || G.gameMode === 4) {
      G.touchJump = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    
    // Swipe for Snake (1)
    if (G.gameMode === 1) {
      const threshold = 30;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) G.keys['ArrowRight'] = true; else G.keys['ArrowLeft'] = true;
          // Reset vertical keys
          G.keys['ArrowUp'] = false; G.keys['ArrowDown'] = false;
        } else {
          if (dy > 0) G.keys['ArrowDown'] = true; else G.keys['ArrowUp'] = true;
          // Reset horizontal keys
          G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false;
        }
        // Reset start position for continuous swiping
        touchStartX = t.clientX;
        touchStartY = t.clientY;
      }
    }

    // Slide for Arkanoid (2) or Shooter (3)
    if (G.gameMode === 2 || G.gameMode === 3) {
      const moveX = t.clientX - lastTouchX;
      if (moveX > 2) { G.keys['ArrowRight'] = true; G.keys['ArrowLeft'] = false; }
      else if (moveX < -2) { G.keys['ArrowLeft'] = true; G.keys['ArrowRight'] = false; }
      else { G.keys['ArrowLeft'] = false; G.keys['ArrowRight'] = false; }
      lastTouchX = t.clientX;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    G.touchJump = false;
    if (G.gameMode === 2 || G.gameMode === 3) {
      G.keys['ArrowLeft'] = false;
      G.keys['ArrowRight'] = false;
    }
  });

  // D-pad button support (specifically for Snake)
  function setupBtn(id, code) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => {
      e.preventDefault();
      G.keys[code] = true;
      if (code === 'ArrowUp') G.touchJump = true;
    };
    const release = (e) => {
      e.preventDefault();
      G.keys[code] = false;
      if (code === 'ArrowUp') G.touchJump = false;
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
  }
  setupBtn('btnUp', 'ArrowUp');
  setupBtn('btnDown', 'ArrowDown');
  setupBtn('btnLeft', 'ArrowLeft');
  setupBtn('btnRight', 'ArrowRight');
  setupBtn('fireBtn', 'Space');
}
